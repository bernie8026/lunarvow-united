'use strict';
// Public gate only: synthetic authentication status and a tiny locally recorded
// video exercise native playback without production login or external media.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const prefix = '/lunarvow-united/';
const authOrigin = 'https://fixture-auth.workers.dev';
const locales = ['zh-HK', 'en', 'zh-CN', 'ja', 'ko', 'th', 'ru'];
const viewports = [[360, 800], [390, 844], [768, 1024], [1366, 900], [1366, 540], [320, 740]];
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const emptyEnvelope = JSON.stringify({
  version: 2, cipher: 'AES-256-GCM', compression: 'gzip', archiveId: 'synthetic-gate-layout-only',
  iv: Buffer.alloc(12).toString('base64'), ciphertext: Buffer.alloc(17).toString('base64'),
});

async function assertLayout(page, width, height, locale) {
  const label = `${width}x${height} ${locale}`;
  const result = await page.evaluate(() => {
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const field = document.querySelector('.password-field');
    const style = getComputedStyle(field);
    const video = document.querySelector('#gate-video-background');
    const cinema = document.querySelector('#gate-video-stage');
    return {
      width: innerWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      language: document.documentElement.lang,
      pressed: document.querySelectorAll('[data-gate-language][aria-pressed="true"]').length,
      cinema: rect(cinema), video: rect(video), cinemaStyle: getComputedStyle(cinema).position,
      fit: getComputedStyle(video).objectFit, pointer: getComputedStyle(cinema).pointerEvents,
      decorative: cinema.getAttribute('aria-hidden'), videoTab: video.getAttribute('tabindex'),
      title: rect(document.querySelector('h1')), field: rect(field),
      border: ['Top', 'Right', 'Bottom', 'Left'].map(side => ({ width: parseFloat(style['border' + side + 'Width']), style: style['border' + side + 'Style'], color: style['border' + side + 'Color'] })),
      controls: [...document.querySelectorAll('.gate-languages button,#passkey-button,#show-password,#unlock-button,#gate-video-toggle,#gate-video-sound,#gate-video-source')].filter(node => !node.hidden).map(node => ({
        id: node.id || node.getAttribute('data-gate-language'), text: node.textContent.trim(), ...rect(node),
      })),
      value: document.querySelector('#site-password').value,
      kind: document.querySelector('#gate-status').dataset.kind,
    };
  });
  assert.equal(result.language, locale, label + ' renders requested language');
  assert.equal(result.pressed, 1, label + ' has one selected language');
  assert(result.scroll <= width + 1, label + ' has no horizontal overflow');
  assert(result.title.width > 0 && result.title.left >= -1 && result.title.right <= width + 1, label + ' title fits');
  assert.equal(result.value, '', 'fixture never fills a password');
  assert.notEqual(result.kind, 'error', label + ' synthetic readiness is healthy');
  assert.equal(result.cinemaStyle, 'fixed', label + ' background stays fixed');
  assert(result.cinema.width >= width - 1 && result.cinema.height >= height - 1, label + ' background covers viewport');
  assert.equal(result.fit, 'cover', label + ' video fills background without stretching');
  assert.equal(result.pointer, 'none', label + ' background cannot intercept login controls');
  assert.equal(result.decorative, 'true', label + ' decorative scene is hidden from assistive technology');
  assert.equal(result.videoTab, '-1', label + ' decorative video is not a keyboard stop');
  assert(result.field.height >= 56, label + ' password field remains generous');
  for (const border of result.border) {
    assert(border.width >= 1 && border.style !== 'none' && !['transparent', 'rgba(0, 0, 0, 0)'].includes(border.color), label + ' password field border remains visible');
  }
  for (const control of result.controls) {
    assert(control.width >= 43.5 && control.height >= 43.5, `${label} ${control.id} meets 44px target: ${control.width}x${control.height}`);
    assert(control.left >= -1 && control.right <= width + 1 && control.text, label + ' ' + control.id + ' fits');
  }
  const input = page.locator('#site-password');
  await input.scrollIntoViewIfNeeded(); await input.focus();
  const focus = await input.evaluate(node => {
    const box = node.getBoundingClientRect(), style = getComputedStyle(node.closest('.password-field'));
    return { active: document.activeElement === node, visible: box.top >= -1 && box.bottom <= innerHeight + 1, outline: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle };
  });
  assert(focus.active && focus.visible && focus.outline >= 2 && focus.outlineStyle !== 'none', label + ' password focus remains visible');
}

(async () => {
  const template = fs.readFileSync(path.join(root, 'protection/index.html'), 'utf8');
  assert.match(template, /media-src 'self'/, 'same-origin media is permitted by CSP');
  assert.doesNotMatch(template, /<iframe/, 'background no longer embeds a third-party player');
  assert.doesNotMatch(template, /<script[^>]+assets\/gate-background\.js/, 'isolated bootstrap waits for worker migration');
  const gate = template.replaceAll('__BASE_PATH__', prefix).replaceAll('__AUTH_ORIGIN__', authOrigin);
  const files = new Map([
    [prefix + 'protected-unlock.js', 'protection/protected-unlock.js'],
    [prefix + 'protected-worker.js', 'protection/protected-worker.js'],
    [prefix + 'assets/gate-background.js', 'protection/assets/gate-background.js'],
  ]);
  let mediaFixture;
  const unexpectedLocal = [], blockedRequests = [], statusRequests = [], errors = [], mediaRequests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    if (url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (!['GET', 'HEAD'].includes(request.method)) { unexpectedLocal.push(request.method + ' ' + url.pathname); response.writeHead(405); response.end(); return; }
    let content, type;
    if (url.pathname === prefix || url.pathname === prefix + 'index.html' || url.pathname === prefix + 'lunarvow/index.html') { content = gate; type = 'text/html; charset=utf-8'; }
    else if (files.has(url.pathname)) { content = fs.readFileSync(path.join(root, files.get(url.pathname))); type = 'text/javascript; charset=utf-8'; }
    else if (url.pathname === prefix + 'protected-site.json') { content = emptyEnvelope; type = 'application/json'; }
    else if (url.pathname === prefix + 'assets/anfield-anthem.mp4') {
      content = mediaFixture; type = 'video/webm'; mediaRequests.push({ method: request.method, range: request.headers.range });
    }
    else if (url.pathname === prefix + 'assets/anfield-anthem.jpg') {
      // A generic 1x1 poster is sufficient: this suite verifies layout and
      // playback lifecycle; it does not approve the production film's artwork.
      content = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'); type = 'image/png';
    }
    else { unexpectedLocal.push(request.method + ' ' + url.pathname); response.writeHead(404); response.end('Unknown fixture resource'); return; }
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const range = request.method === 'GET' && /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
    if (type === 'video/webm' && range) {
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
      if (start >= body.length || start > end) { response.writeHead(416, { 'Content-Range': `bytes */${body.length}` }); response.end(); return; }
      response.writeHead(206, { 'Content-Type': type, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
      response.end(body.subarray(start, end + 1)); return;
    }
    response.writeHead(200, { 'Content-Type': type, 'Content-Length': String(body.length), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser, cases = 0;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } : {}) });
    const recorder = await browser.newPage();
    mediaFixture = Buffer.from(await recorder.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
      const context = canvas.getContext('2d'), stream = canvas.captureStream(12), chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      recorder.ondataavailable = event => chunks.push(event.data);
      const done = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start(); context.fillStyle = '#701b29'; context.fillRect(0, 0, 160, 90);
      await new Promise(resolve => setTimeout(resolve, 250));
      context.fillStyle = '#a83145'; context.fillRect(0, 0, 160, 90);
      await new Promise(resolve => setTimeout(resolve, 250));
      recorder.stop(); await done; stream.getTracks().forEach(track => track.stop());
      return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())];
    }));
    await recorder.close();
    assert(mediaFixture.length > 0, 'native decoder fixture was recorded');
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'allow' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) { await route.continue(); return; }
      if (url.origin === authOrigin && url.pathname === '/v1/status' && request.method() === 'GET') {
        statusRequests.push(request.method() + ' ' + url.pathname);
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }, body: JSON.stringify({ ok: true, code: 'ready' }) }); return;
      }
      blockedRequests.push(request.method() + ' ' + url.origin + url.pathname); await route.abort('blockedbyclient');
    });
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + prefix + '?lang=zh-HK', { waitUntil: 'load' });
    await page.waitForFunction(() => !document.querySelector('#site-password').disabled && !document.querySelector('#gate-video-toggle').disabled, null, { timeout: 15000 });
    const video = page.locator('#gate-video-background');
    await page.waitForFunction(() => { const v = document.querySelector('#gate-video-background'); return !v.paused && v.readyState >= 2; });
    assert(await video.evaluate(node => node.muted), 'automatic playback starts muted');
    assert.equal(await page.locator('iframe').count(), 0, 'no external player is mounted');
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      for (const locale of locales) {
        await page.locator(`[data-gate-language="${locale}"]`).click(); await frames(page);
        await assertLayout(page, width, height, locale); cases++;
      }
    }
    assert(mediaRequests.length > 0, 'browser decodes the local native media fixture');
    await page.locator('[data-gate-language="en"]').click();
    async function resume() {
      if (await video.evaluate(node => node.paused)) await page.locator('#gate-video-toggle').click();
      await page.waitForFunction(() => !document.querySelector('#gate-video-background').paused);
    }
    async function mutedPause() {
      await page.waitForFunction(() => { const v = document.querySelector('#gate-video-background'); return v.paused && v.muted; });
      assert.equal(await page.locator('#gate-video-sound').getAttribute('aria-pressed'), 'false');
    }
    await page.locator('#gate-video-sound').click();
    assert.equal(await video.evaluate(node => node.muted), false, 'user gesture enables audio');
    assert.equal(await page.locator('#gate-video-sound').getAttribute('aria-pressed'), 'true');
    await page.locator('#gate-video-sound').click();
    assert.equal(await video.evaluate(node => node.muted), true, 'sound toggle mutes');
    await page.locator('#gate-video-toggle').click();
    await page.waitForFunction(() => document.querySelector('#gate-video-background').paused);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await mutedPause();
    await resume(); await page.locator('#gate-video-sound').click();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await mutedPause();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    assert(await video.evaluate(node => node.muted), 'returning to page never restores sound automatically');
    await resume(); await page.locator('main').evaluate(node => { node.inert = true; }); await mutedPause();
    await page.locator('main').evaluate(node => { node.inert = false; });
    await resume(); await page.locator('#gate-loading').evaluate(node => { node.hidden = false; }); await mutedPause();
    await page.locator('#gate-loading').evaluate(node => { node.hidden = true; });
    await resume(); await page.emulateMedia({ reducedMotion: 'reduce' }); await mutedPause();
    assert.equal(await page.locator('.gate-cinema-glow').evaluate(node => getComputedStyle(node).animationName), 'none');
    await resume(); await page.locator('#gate-video-toggle').click(); await mutedPause();
    assert.equal(await page.locator('#site-password').inputValue(), '');
    assert.equal(await page.locator('#unlock-form').getAttribute('aria-busy'), 'false');
    assert.deepEqual(statusRequests, ['GET /v1/status'], 'only synthetic status is requested');
    assert.deepEqual(unexpectedLocal, []); assert.deepEqual(blockedRequests, []); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ layoutCases: cases, locales, viewports, nativeBackgroundFixture: true, productionLogin: false, productionMp4Decoded: false }));
  } finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
