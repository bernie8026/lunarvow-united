'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'protection/protected-session.js'), 'utf8');
const origin = 'https://fixture.test';
const base = '/lunarvow-united/';
const endedKey = 'portfolio-protected-ended';

async function session({ idleAfter = 30000 } = {}) {
  let now = 1000000, timerId = 0;
  const timers = new Map(), storage = new Map(), messages = [], navigation = [], replayed = [];
  const handlers = { window: new Map(), document: new Map(), worker: new Map() };
  const on = (group, name, fn) => {
    if (!handlers[group].has(name)) handlers[group].set(name, []);
    handlers[group].get(name).push(fn);
  };
  const emit = (group, name, event = {}) => { for (const fn of handlers[group].get(name) || []) fn(event); };
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const schedule = (fn, delay) => { const id = ++timerId; timers.set(id, { at: now + delay, fn }); return id; };
  async function advance(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
      await flush();
    }
    now = end;
    await flush();
  }
  class Element {
    constructor() { this.handlers = {}; this.children = []; this.dataset = {}; this.style = {}; this.attributes = {}; this.isConnected = true; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    append(...nodes) { this.children.push(...nodes); }
    querySelector() { return this.children.find(node => node.className === 'site-lock') || null; }
    closest() { return this.href ? this : null; }
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
    focus() {}
    dispatchEvent(event) { replayed.push({ href: this.href, event }); return true; }
  }
  const classes = new Set(), footer = new Element();
  const html = new Element();
  html.lang = 'en';
  html.classList = { add: name => classes.add(name), remove: name => classes.delete(name) };
  const document = {
    hidden: false,
    currentScript: { src: origin + base + 'protected-session.js?v=foreground-1' },
    documentElement: html,
    body: { classList: { contains: () => true } },
    head: { append() {} },
    addEventListener: (name, fn) => on('document', name, fn),
    createElement: () => new Element(),
    querySelector: selector => selector === '.footer-links' ? footer : null,
  };
  const location = new URL(origin + base + '?lang=en');
  location.reload = () => navigation.push(location.pathname + location.search + location.hash);
  location.replace = target => navigation.push(target);
  class MessageChannel {
    constructor() {
      this.port1 = { close() {} };
      this.port2 = { postMessage: data => queueMicrotask(() => this.port1.onmessage?.({ data })) };
    }
  }
  function worker() {
    return {
      scriptURL: origin + base + 'protected-worker.js',
      unlocked: true, lastEvent: now, hold: false, pending: [],
      postMessage(message, ports) {
        assert(['STATE', 'LOCK'].includes(message.type), 'session guard never authenticates or replays UNLOCK');
        messages.push(message.type);
        if (now - this.lastEvent >= idleAfter) this.unlocked = false;
        this.lastEvent = now;
        if (message.type === 'LOCK') this.unlocked = false;
        const reply = value => ports[0].postMessage({ ok: true, unlocked: value });
        if (message.type === 'STATE' && this.hold) this.pending.push(reply);
        else reply(this.unlocked);
      },
      release(value = this.unlocked) { for (const reply of this.pending.splice(0)) reply(value); },
    };
  }
  const serviceWorker = { controller: worker(), addEventListener: (name, fn) => on('worker', name, fn) };
  const window = {
    addEventListener: (name, fn) => on('window', name, fn),
    dispatchEvent: event => emit('window', event.type, event),
    fetch: async () => new Response('synthetic response'),
  };
  const context = {
    window, document, navigator: { serviceWorker }, location, URL, Element, MessageChannel,
    MouseEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    PopStateEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    Date: class extends Date { static now() { return now; } },
    setTimeout: schedule, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(source, context, { filename: 'protected-session.js' });
  await flush();
  return {
    document, serviceWorker, storage, messages, navigation, replayed, classes, footer, timers,
    advance, flush, worker, emit,
    async click(href) {
      const link = new Element();
      link.href = new URL(href, location.href).href;
      const event = { target: link, button: 0, preventDefault() { this.prevented = true; }, stopImmediatePropagation() {} };
      emit('window', 'click', event);
      await flush();
      return event;
    },
    async visibility(hidden) { document.hidden = hidden; emit('document', 'visibilitychange'); await flush(); },
    heartbeatCount: () => [...timers.values()].filter(timer => timer.at - now === 15000).length,
  };
}

test('published and source session guards match', () => {
  assert.equal(fs.readFileSync(path.join(root, 'docs/protected-session.js'), 'utf8'), source);
});

test('foreground reading checks STATE every 15 seconds and preserves ordinary navigation beyond idle timeout', async () => {
  const page = await session();
  assert.equal(page.heartbeatCount(), 1);
  await page.advance(60000);
  assert.equal(page.messages.length, 5, 'initial verification and four foreground heartbeats');
  assert.equal(page.serviceWorker.controller.unlocked, true);
  await page.click('projects.html?lang=en');
  assert.equal(page.replayed.length, 1);
  assert.deepEqual(page.navigation, []);
  assert(page.messages.every(type => type === 'STATE'));
  assert.equal(page.storage.size, 0, 'no credentials or content are stored to retain the session');
});

test('hidden/pagehide suspend heartbeats and visible/pageshow verify before restarting a single timer', async () => {
  const page = await session({ idleAfter: Infinity });
  await page.visibility(true);
  const before = page.messages.length;
  await page.advance(60000);
  assert.equal(page.messages.length, before);
  assert.equal(page.timers.size, 0);
  await page.visibility(false);
  assert.equal(page.messages.length, before + 1);
  assert.equal(page.heartbeatCount(), 1);
  page.emit('window', 'pagehide');
  await page.advance(60000);
  assert.equal(page.messages.length, before + 1);
  page.emit('window', 'pageshow');
  await page.flush();
  page.emit('window', 'pageshow');
  await page.flush();
  assert.equal(page.heartbeatCount(), 1, 'repeated lifecycle events do not duplicate timers');
});

test('worker loss during a pending heartbeat keeps the clicked destination locked and does not replay navigation', async () => {
  const page = await session();
  const worker = page.serviceWorker.controller;
  worker.hold = true;
  await page.advance(15000);
  await page.click('projects.html?lang=zh-HK#featured');
  worker.unlocked = false;
  worker.release(false);
  await page.flush();
  assert.deepEqual(page.navigation, [base + 'projects.html?lang=zh-HK#featured']);
  assert.equal(page.replayed.length, 0);
  assert.equal(worker.unlocked, false);
  assert.equal(page.timers.size, 0);
  const marker = JSON.parse(page.storage.get(endedKey));
  assert.deepEqual(Object.keys(marker).sort(), ['path', 'reason', 'time']);
  assert.equal(marker.path, base + 'projects.html');
  assert.equal(marker.reason, 'ended');
  assert(Number.isFinite(marker.time));
  assert(![...page.storage.values()].some(value => value.includes('https:') || value.includes('featured') || value.includes('lang=')));
});

test('returning after hidden worker eviction requires a fresh login without any unlock replay', async () => {
  const page = await session();
  await page.visibility(true);
  await page.advance(60000);
  await page.visibility(false);
  assert.deepEqual(page.navigation, [base + '?lang=en']);
  assert.equal(page.serviceWorker.controller.unlocked, false);
  assert.equal(page.replayed.length, 0);
  assert.equal(page.timers.size, 0);
  assert(page.messages.every(type => type === 'STATE'));
});

test('a timed-out foreground check stops heartbeats and preserves a pending internal destination', async () => {
  const page = await session();
  page.serviceWorker.controller.hold = true;
  await page.advance(15000);
  await page.click('education.html?lang=en');
  await page.advance(8000);
  assert.deepEqual(page.navigation, [base + 'education.html?lang=en']);
  assert.equal(page.replayed.length, 0);
  assert.equal(page.timers.size, 0);
});

test('late checks after hiding or pagehide neither navigate nor uncover the page or restart heartbeats', async () => {
  for (const event of ['hidden', 'pagehide']) {
    for (const unlocked of [false, true]) {
      const page = await session();
      const worker = page.serviceWorker.controller;
      worker.hold = true;
      await page.advance(15000);
      await page.click('projects.html?lang=en');
      if (event === 'hidden') await page.visibility(true);
      else page.emit('window', 'pagehide');
      const wasCovered = page.classes.has('portfolio-session-checking');
      worker.release(unlocked);
      await page.flush();
      assert.deepEqual(page.navigation, []);
      assert.equal(page.replayed.length, 0);
      assert.equal(page.timers.size, 0);
      assert.equal(page.classes.has('portfolio-session-checking'), wasCovered);
    }
  }
});

test('an old controller reply cannot replace a pending new-controller check or authorise navigation', async () => {
  const page = await session();
  const oldWorker = page.serviceWorker.controller;
  oldWorker.hold = true;
  await page.advance(15000);
  const next = page.worker();
  next.hold = true;
  next.unlocked = false;
  page.serviceWorker.controller = next;
  page.emit('worker', 'controllerchange');
  await page.flush();
  oldWorker.release(true);
  await page.flush();
  const count = page.messages.length;
  await page.click('projects.html?lang=en');
  assert.equal(page.messages.length, count, 'old finally did not erase the new check');
  next.release(false);
  await page.flush();
  assert.deepEqual(page.navigation, [base + 'projects.html?lang=en']);
  assert.equal(page.replayed.length, 0);
  assert.equal(page.timers.size, 0);
});

test('explicit lock cancels a pending click and heartbeat and does not label it as session expiry', async () => {
  const page = await session();
  const worker = page.serviceWorker.controller;
  worker.hold = true;
  await page.click('projects.html?lang=en');
  page.storage.set(endedKey, 'stale fixture marker');
  await page.footer.querySelector().handlers.click();
  worker.release(false);
  await page.flush();
  assert.deepEqual(page.navigation, [base + '?lang=en']);
  assert.equal(page.storage.has(endedKey), false);
  assert.equal(page.replayed.length, 0);
  assert.equal(page.timers.size, 0);
  assert.equal(worker.unlocked, false);
  assert(page.messages.includes('LOCK'));
});

test('external, credential-bearing and out-of-scope links never become gate destinations', async () => {
  const page = await session();
  const count = page.messages.length;
  for (const href of ['https://example.com/projects.html', '/lunarvow/', '/lunarvow-united-other/', 'https://name@fixture.test/lunarvow-united/projects.html']) {
    const event = await page.click(href);
    assert(!event.prevented, href);
  }
  assert.equal(page.messages.length, count);
  assert.equal(page.replayed.length, 0);
  page.serviceWorker.controller.unlocked = false;
  await page.advance(15000);
  assert.deepEqual(page.navigation, [base + '?lang=en']);
});
