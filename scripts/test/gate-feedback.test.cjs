'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'protection/protected-unlock.js'), 'utf8');
const failed = 'The website could not be loaded. Check your connection and refresh.';
const ready = 'Use a passkey or enter your access password to unlock.';
const response = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

// Run the complete published gate with synthetic DOM/network boundaries. No
// production credentials, authentication requests or browser storage are used.
async function gate({ language = 'en', statusReply, archiveReply, authenticate, credentialError, passkeys = true, sessionMarker, withLoader = false } = {}) {
  const sessionValues = new Map(), intervals = new Set();
  if (sessionMarker !== undefined) sessionValues.set('portfolio-protected-ended', typeof sessionMarker === 'string' ? sessionMarker : JSON.stringify(sessionMarker));
  function element(extra = {}) {
    return {
      disabled: true, value: '', type: '', textContent: '', dataset: {}, attributes: {}, handlers: {},
      addEventListener(name, fn) { this.handlers[name] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      style: { setProperty() {} },
      focus() {}, ...extra,
    };
  }
  const elements = Object.fromEntries(['unlock-form', 'site-password', 'unlock-button', 'show-password', 'gate-status', 'passkey-button', 'passkey-register-button', 'passkey-setup', 'passkey-note'].map(id => [id, element()]));
  const steps = withLoader ? Array.from({length:5}, () => element()) : [];
  if (withLoader) for (const suffix of ['', '-title', '-status', '-amount', '-progress', '-steps']) elements['gate-loading' + suffix] = element();
  elements['site-password'].type = 'password';
  const copies = ['intro', 'footer'].map(gateCopy => element({ dataset: { gateCopy } }));
  const languageButtons = ['zh-HK', 'en', 'zh-CN', 'ja', 'ko', 'th', 'ru'].map(gateLanguage => element({ dataset: { gateLanguage } }));
  const location = new URL('https://fixture.test/lunarvow-united/?lang=' + language);
  location.replace = () => { throw new Error('Unexpected navigation'); };
  const controller = {
    scriptURL: 'https://fixture.test/lunarvow-united/protected-worker.js',
    postMessage(message, ports) {
      assert.equal(message.type, 'STATE', 'failed authentication never unlocks the worker');
      ports[0].postMessage({ ok: true, unlocked: false });
    },
  };
  class MessageChannel {
    constructor() {
      this.port1 = { close() {} };
      this.port2 = { postMessage: data => queueMicrotask(() => this.port1.onmessage?.({ data })) };
    }
  }
  const envelope = { version: 2, cipher: 'AES-256-GCM', compression: 'gzip', archiveId: 'synthetic-fixture', iv: Buffer.alloc(12).toString('base64'), ciphertext: Buffer.alloc(32).toString('base64') };
  const context = {
    document: {
      currentScript: { src: 'https://fixture.test/lunarvow-united/protected-unlock.js' },
      documentElement: {},
      getElementById: id => elements[id] || null,
      querySelector: () => ({ content: 'https://fixture-auth.workers.dev' }),
      querySelectorAll: selector => selector === '[data-loader-step]' ? steps : selector === '[data-gate-copy]' ? copies : selector === '[data-gate-language]' ? languageButtons : [],
    },
    navigator: {
      serviceWorker: { controller, register: async () => ({}), ready: Promise.resolve() },
      credentials: {
        get: async () => { throw credentialError || new Error('Unexpected credential prompt'); },
        create: async () => { throw new Error('Unexpected registration'); },
      },
    },
    window: { DecompressionStream, ...(passkeys ? { PublicKeyCredential: class {} } : {}) },
    location, history: { replaceState() {} }, isSecureContext: true,
    localStorage: { getItem: () => null, setItem() {} }, crypto: webcrypto,
    sessionStorage: { getItem: key => sessionValues.get(key) || null, removeItem: key => sessionValues.delete(key) },
    fetch: async url => {
      const target = new URL(url);
      if (target.hostname === 'fixture.test') return archiveReply ? archiveReply() : response(200, envelope);
      if (target.pathname === '/v1/status') return statusReply ? statusReply() : response(200, { ok: true, code: 'ready' });
      return authenticate ? authenticate(target) : response(401, { ok: false, code: 'invalid_password' });
    },
    requestAnimationFrame: fn => setImmediate(fn), MessageChannel, URL, URLSearchParams,
    AbortController, Uint8Array, ArrayBuffer, TextDecoder, TextEncoder, Response, Blob,
    DOMException, atob, btoa, setTimeout, clearTimeout,
    setInterval: (fn, delay) => { const id = setInterval(fn, delay); intervals.add(id); return id; },
    clearInterval: id => { intervals.delete(id); clearInterval(id); },
  };
  vm.runInNewContext(source, context, { filename: 'protected-unlock.js' });
  const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(setImmediate); };
  await flush();
  return {
    elements, copies, languageButtons, context, flush, sessionValues, steps,
    dispose: () => { for (const id of intervals) clearInterval(id); intervals.clear(); },
    status: () => elements['gate-status'].textContent,
    passkey: () => elements['passkey-button'].handlers.click(),
    async password() {
      elements['site-password'].value = 'synthetic-test-password';
      await elements['unlock-form'].handlers.submit({ preventDefault() {} });
    },
  };
}

test('published and template gate runtimes stay synchronised', () => {
  assert.equal(fs.readFileSync(path.join(root, 'docs/protected-unlock.js'), 'utf8'), source);
});

test('the access display follows actual transfer bytes and never invents an authentication percentage', async () => {
  const payload = Buffer.from(JSON.stringify({version:2, cipher:'AES-256-GCM', compression:'gzip', archiveId:'test-steps',
    iv:Buffer.alloc(12).toString('base64'), ciphertext:Buffer.alloc(32).toString('base64')}));
  for (const known of [false,true]) {
    let stream, reply, requested;
    const requestedAccess=new Promise(resolve=>{requested=resolve;});
    const until=async pred=>{
      const end=Date.now()+2000;
      while(!pred() && Date.now()<end) await new Promise(resolve=>setTimeout(resolve,5));
      assert(pred(),'timed out waiting for a real download update');
    };
    const access = new Promise(resolve => {reply=resolve;});
    const page = await gate({withLoader:true, language:'zh-HK', authenticate:()=>{requested();return access;}, archiveReply:()=>new Response(
      new ReadableStream({start(c){stream=c;c.enqueue(payload.subarray(0,21));}}),
      {headers:known?{'Content-Length':String(payload.length)}:{}}
    )});
    try {
      const attempt=page.password();
      const e=page.elements, bar=e['gate-loading-progress'], amount=e['gate-loading-amount'];
      await until(()=>amount.textContent===(known?Math.floor(2100/payload.length)+'%':'21 B'));
      assert.equal(e['gate-loading'].hidden,false);
      assert.equal(e['gate-loading-title'].textContent,'載入作品集');
      assert.equal(page.steps[0].attributes['aria-current'],'step');
      assert.equal(amount.textContent,known?Math.floor(2100/payload.length)+'%':'21 B');
      assert.equal(bar.attributes['aria-valuenow'],known?String(Math.floor(2100/payload.length)):undefined);
      stream.enqueue(payload.subarray(21));stream.close();await requestedAccess;
      assert.equal(page.steps[0].dataset.state,'done');assert.equal(page.steps[1].attributes['aria-current'],'step');
      assert.equal(e['gate-loading-status'].textContent,'正在核實存取權限…');
      assert.equal(bar.attributes['aria-valuenow'],undefined);
      assert.equal(amount.textContent,'');
      reply(response(401,{ok:false,code:'invalid_password'}));await attempt;
      assert.equal(e['gate-loading'].hidden,true);
    } finally { page.dispose(); }
  }
});

test('initial status failures are visible instead of claiming the service is ready', async () => {
  for (const statusReply of [
    async () => { throw new TypeError('offline'); },
    async () => response(503, { ok: false, code: 'service_unavailable' }),
    async () => new Response('not JSON', { status: 502 }),
  ]) {
    const page = await gate({ statusReply });
    assert.equal(page.status(), failed);
    assert.equal(page.elements['gate-status'].dataset.kind, 'error');
    assert.equal(page.elements['site-password'].disabled, false, 'another attempt remains possible');
  }
});

test('initial status finishes before visitors can start an unlock', async () => {
  let resolveStatus;
  const pending = new Promise(resolve => { resolveStatus = resolve; });
  const page = await gate({ statusReply: () => pending });
  assert.equal(page.elements['unlock-button'].disabled, true);
  assert.equal(page.elements['passkey-button'].disabled, true);
  resolveStatus(response(200, { ok: true, code: 'ready' }));
  await page.flush();
  assert.equal(page.status(), ready);
  assert.equal(page.elements['unlock-button'].disabled, false);
});

test('connection timeouts and server failures do not blame or cancel a passkey', async () => {
  for (const authenticate of [
    async () => { throw new TypeError('offline'); },
    async () => { throw new DOMException('request timed out', 'AbortError'); },
    async () => response(503, { ok: false, code: 'service_unavailable' }),
    async () => new Response('not JSON', { status: 502 }),
    async () => response(200, null),
  ]) {
    const page = await gate({ authenticate });
    await page.passkey();
    assert.equal(page.status(), failed);
    assert.equal(page.elements['passkey-button'].disabled, false);
  }
  const download = await gate({ archiveReply: async () => { throw new DOMException('download timed out', 'AbortError'); } });
  await download.passkey();
  assert.equal(download.status(), failed, 'an encrypted download timeout is not a cancelled device prompt');
  assert.equal(download.elements['passkey-button'].disabled, false);
});

test('credential cancellation, rejection and password errors keep distinct feedback', async () => {
  const cancelled = await gate({ authenticate: async () => response(200, { ok: true, options: { challenge: 'AQ' } }), credentialError: new DOMException('cancelled', 'NotAllowedError') });
  await cancelled.passkey();
  assert.equal(cancelled.status(), 'The passkey request was cancelled or timed out. Try again or use the password.');
  const denied = await gate({ authenticate: async () => response(401, { ok: false, code: 'invalid_passkey' }) });
  await denied.passkey();
  assert.equal(denied.status(), 'The passkey could not be verified. Try again or use the password.');
  const password = await gate();
  await password.password();
  assert.equal(password.status(), 'The password is incorrect.');
  assert.equal(password.elements['site-password'].value, '');
});

test('password visibility and accessibility state agree after submission', async () => {
  const page = await gate();
  page.elements['show-password'].handlers.click();
  assert.equal(page.elements['site-password'].type, 'text');
  assert.equal(page.elements['show-password'].attributes['aria-pressed'], 'true');
  await page.password();
  assert.equal(page.elements['site-password'].type, 'password');
  assert.equal(page.elements['show-password'].attributes['aria-pressed'], 'false');
  assert.equal(page.elements['show-password'].textContent, 'Show');
});

test('every language describes both access methods and password works without WebAuthn', async () => {
  const passkeyWords = { 'zh-HK': '通行密鑰', en: 'passkey', 'zh-CN': '通行密钥', ja: 'パスキー', ko: '패스키', th: 'พาสคีย์', ru: 'ключ' };
  for (const [language, word] of Object.entries(passkeyWords)) {
    const page = await gate({ language });
    assert.equal(page.context.document.documentElement.lang, language);
    for (const text of [page.status(), ...page.copies.map(item => item.textContent)]) assert(text.includes(word), language + ' mentions passkey access');
  }
  for (const language of ['unsupported', 'constructor', 'toString', '__proto__']) {
    const page = await gate({ language });
    assert.equal(page.context.document.documentElement.lang, 'zh-HK');
    assert(page.status().includes('通行密鑰'), 'invalid language links keep a usable default gate');
  }
  const unsupported = await gate({ passkeys: false });
  assert.equal(unsupported.elements['passkey-button'].disabled, true);
  assert.equal(unsupported.elements['site-password'].disabled, false);
  assert.equal(unsupported.elements['unlock-button'].disabled, false);
});

test('a fresh same-page session marker gives a translated notice and is consumed immediately', async () => {
  const words = { 'zh-HK': '登入已結束', en: 'Your session ended', 'zh-CN': '登录已结束', ja: 'セッションが終了', ko: '세션이 종료', th: 'เซสชันสิ้นสุด', ru: 'Сеанс завершён' };
  for (const [language, word] of Object.entries(words)) {
    const page = await gate({ language, sessionMarker: { reason: 'ended', time: Date.now(), path: '/lunarvow-united/' } });
    assert(page.status().includes(word), language);
    assert.equal(page.sessionValues.size, 0);
    assert.equal(page.elements['gate-status'].dataset.kind, '');
    assert.equal(page.elements['unlock-button'].disabled, false);
  }
});

test('invalid, stale, future or wrong-page session markers cannot replace the ready status', async () => {
  const marker = { reason: 'ended', time: Date.now(), path: '/lunarvow-united/' };
  for (const sessionMarker of [
    '{broken', null, { ...marker, reason: '<script>test</script>' },
    { ...marker, time: Date.now() - 300001 }, { ...marker, time: Date.now() + 60000 },
    { ...marker, time: '0' }, { ...marker, path: '/lunarvow-united/projects.html' },
    { ...marker, path: 'https://fixture.test/lunarvow-united/' },
  ]) {
    const page = await gate({ sessionMarker });
    assert.equal(page.status(), ready);
    assert.equal(page.sessionValues.size, 0);
  }
});

test('network, authentication and IP lockout feedback take priority over the session-ended notice', async t => {
  const sessionMarker = { reason: 'ended', time: Date.now(), path: '/lunarvow-united/' };
  const offline = await gate({ sessionMarker, statusReply: async () => response(503, { ok: false, code: 'service_unavailable' }) });
  assert.equal(offline.status(), failed);
  const password = await gate({ sessionMarker });
  await password.password();
  assert.equal(password.status(), 'The password is incorrect.');
  for (const code of ['cooldown', 'permanent_lock']) {
    const page = await gate({ sessionMarker, statusReply: async () => response(code === 'cooldown' ? 429 : 403, { ok: false, code, retryAfterSeconds: 300 }) });
    t.after(page.dispose);
    assert(!page.status().includes('Your session ended'));
    assert.equal(page.elements['gate-status'].dataset.kind, 'error');
    assert.equal(page.elements['unlock-button'].disabled, true);
    assert.equal(page.elements['passkey-button'].disabled, true);
  }
});
