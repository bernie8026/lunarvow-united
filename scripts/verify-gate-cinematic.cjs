'use strict';
// Exercise the real public gate and worker with synthetic status/media replies.
// This never submits credentials or tests actual external video playback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const prefix = '/lunarvow-united/';
const authOrigin = 'https://fixture-auth.workers.dev';
const videoId = 'OV5_LQArLa0';
const watchUrl = 'https://www.youtube.com/watch?v=' + videoId;
const locales = ['zh-HK', 'en', 'zh-CN', 'ja', 'ko', 'th', 'ru'];
const viewports = [[360, 800], [390, 844], [768, 1024], [1366, 900], [1366, 540], [320, 740]];
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
const emptyEnvelope = JSON.stringify({
  version: 2, cipher: 'AES-256-GCM', compression: 'gzip', archiveId: 'synthetic-gate-layout-only',
  iv: Buffer.alloc(12).toString('base64'), ciphertext: Buffer.alloc(17).toString('base64'),
});
const playerFixture = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic player fixture</title>' +
  '<style>html,body{margin:0;width:100%;height:100%;background:#161216;color:#fff}video{display:block;width:100%;height:100%;min-height:200px}</style>' +
  '<body><video controls preload="none" aria-label="Synthetic native player controls"></video></body></html>';

async function assertLayout(page, width, height, locale) {
  const label = `${width}x${height} ${locale}`;
  const result = await page.evaluate(() => {
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const field = document.querySelector('.password-field');
    const style = getComputedStyle(field);
    return {
      width: innerWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      language: document.documentElement.lang,
      pressed: document.querySelectorAll('[data-gate-language][aria-pressed="true"]').length,
      form: rect(document.querySelector('#unlock-form')), stage: rect(document.querySelector('#gate-video-stage')),
      title: rect(document.querySelector('h1')), field: rect(field),
      border: ['Top', 'Right', 'Bottom', 'Left'].map(side => ({ width: parseFloat(style['border' + side + 'Width']), style: style['border' + side + 'Style'], color: style['border' + side + 'Color'] })),
      controls: [...document.querySelectorAll('.gate-languages button,#passkey-button,#show-password,#unlock-button,#gate-video-toggle,#gate-video-source')].map(node => ({
        id: node.id || node.getAttribute('data-gate-language'), text: node.textContent.trim(), ...rect(node),
      })),
      value: document.querySelector('#site-password').value,
      kind: document.querySelector('#gate-status').dataset.kind,
    };
  });
  assert.equal(result.language, locale, label + ' renders the requested language');
  assert.equal(result.pressed, 1, label + ' has one selected language');
  assert(result.scroll <= width + 1, label + ' has no horizontal overflow');
  assert(result.title.width > 0 && result.title.left >= -1 && result.title.right <= width + 1, label + ' title fits');
  assert.equal(result.value, '', 'the fixture never fills a password');
  assert.notEqual(result.kind, 'error', label + ' synthetic readiness is healthy');
  assert(!overlap(result.form, result.stage), label + ' player and login form never overlap');
  if (width <= 800) assert(result.form.bottom <= result.stage.top + 1, label + ' mobile layout presents the form before video');
  else assert(result.stage.right <= result.form.left + 1, label + ' desktop player sits beside the form');
  assert(result.stage.width >= 200 && result.stage.height >= 200, label + ' stage meets minimum player dimensions');
  assert(result.field.height >= 56, label + ' password field remains generous');
  for (const border of result.border) {
    assert(border.width >= 1 && border.style !== 'none' && border.color !== 'transparent' && border.color !== 'rgba(0, 0, 0, 0)', label + ' password field has a visible border on every side');
  }
  for (const control of result.controls) {
    assert(control.width >= 43.5 && control.height >= 43.5, `${label} ${control.id} meets the 44px target: ${control.width}x${control.height}`);
    assert(control.left >= -1 && control.right <= width + 1 && control.text, label + ' ' + control.id + ' remains legible and within the page');
  }
  const input = page.locator('#site-password');
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  const focus = await input.evaluate(node => {
    const box = node.getBoundingClientRect(), style = getComputedStyle(node.closest('.password-field'));
    return { active: document.activeElement === node, visible: box.top >= -1 && box.bottom <= innerHeight + 1, outline: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle };
  });
  assert(focus.active && focus.visible && focus.outline >= 2 && focus.outlineStyle !== 'none', label + ' password focus remains visible');
  assert.equal(await page.locator('#gate-video-source').getAttribute('href'), watchUrl);
  assert(await page.locator('#gate-video-source').isVisible(), label + ' independent source fallback stays visible');
}

(async () => {
  const template = fs.readFileSync(path.join(root, 'protection/index.html'), 'utf8');
  const bootstrapVersion = template.match(/<script[^>]+protected-unlock\.js\?v=password-(\d+)/);
  assert(bootstrapVersion && Number(bootstrapVersion[1]) >= 5, 'gate uses the refreshed unlock bootstrap');
  assert.doesNotMatch(template, /<script[^>]+assets\/gate-video\.js/, 'the bootstrap loads media after controller migration instead of a direct deferred tag');
  const gate = template.replaceAll('__BASE_PATH__', prefix).replaceAll('__AUTH_ORIGIN__', authOrigin);
  const files = new Map([
    [prefix + 'protected-unlock.js', 'protection/protected-unlock.js'],
    [prefix + 'protected-worker.js', 'protection/protected-worker.js'],
    [prefix + 'assets/gate-video.js', 'protection/assets/gate-video.js'],
  ]);
  const unexpectedLocal = [], blockedRequests = [], externalRequests = [], statusRequests = [], errors = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    if (url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    let content, type;
    if (url.pathname === prefix || url.pathname === prefix + 'index.html') { content = gate; type = 'text/html; charset=utf-8'; }
    else if (files.has(url.pathname)) { content = fs.readFileSync(path.join(root, files.get(url.pathname))); type = 'text/javascript; charset=utf-8'; }
    else if (url.pathname === prefix + 'protected-site.json') { content = emptyEnvelope; type = 'application/json'; }
    else { unexpectedLocal.push(request.method + ' ' + url.pathname); response.writeHead(404); response.end('Unknown fixture resource'); return; }
    if (!['GET', 'HEAD'].includes(request.method)) { unexpectedLocal.push(request.method + ' ' + url.pathname); response.writeHead(405); response.end(); return; }
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
    response.writeHead(200, { 'Content-Type': type, 'Content-Length': String(body.length), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  let cases = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'allow' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) { await route.continue(); return; }
      if (url.origin === authOrigin && url.pathname === '/v1/status' && request.method() === 'GET') {
        statusRequests.push(request.method() + ' ' + url.pathname);
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }, body: JSON.stringify({ ok: true, code: 'ready' }) });
        return;
      }
      if (url.origin === 'https://www.youtube-nocookie.com' && url.pathname === '/embed/' + videoId && request.resourceType() === 'document') {
        const headers = await request.allHeaders();
        externalRequests.push({ url: url.href, referrer: headers.referer });
        await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" }, body: playerFixture });
        return;
      }
      // Never fall through to production, authentication submissions or other
      // third-party assets. Even an unexpected request is locally rejected.
      blockedRequests.push(request.method() + ' ' + url.origin + url.pathname);
      await route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + prefix + '?lang=zh-HK', { waitUntil: 'load' });
    await page.waitForFunction(() => !document.querySelector('#site-password').disabled && !document.querySelector('#gate-video-toggle').disabled, null, { timeout: 15000 });
    assert.equal(await page.locator('body[data-protected-gate]').count(), 1);
    assert.equal(await page.locator('#gate-video-frame').count(), 0);

    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      for (const locale of locales) {
        await page.locator(`[data-gate-language="${locale}"]`).click();
        await frames(page);
        await assertLayout(page, width, height, locale);
        cases++;
      }
    }
    assert.equal(externalRequests.length, 0, 'layout, locale changes and field focus never connect to YouTube');
    assert.deepEqual(statusRequests, ['GET /v1/status'], 'the real gate performs only its synthetic status request');

    await page.locator('[data-gate-language="en"]').click();
    await frames(page);
    async function loadPlayer(autoplay = '1') {
      const previous = externalRequests.length;
      await page.locator('#gate-video-toggle').click();
      await page.frameLocator('#gate-video-frame').locator('video[controls]').waitFor({ state: 'visible' });
      assert.equal(externalRequests.length, previous + 1, 'a deliberate load creates one locally fulfilled player');
      const frame = page.locator('#gate-video-frame');
      const url = new URL(await frame.getAttribute('src'));
      assert.equal(url.origin, 'https://www.youtube-nocookie.com');
      assert.equal(url.pathname, '/embed/' + videoId);
      for (const [key, value] of Object.entries({ controls: '1', playsinline: '1', loop: '1', playlist: videoId, autoplay, origin })) assert.equal(url.searchParams.get(key), value, 'player parameter ' + key);
      assert.equal(url.searchParams.has('enablejsapi'), false, 'no third-party player JavaScript API is enabled');
      assert.equal(await frame.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
      assert.equal(externalRequests.at(-1).referrer, origin + '/', 'the embed sends only its origin as the cross-origin referrer');
      assert.equal(await frame.getAttribute('aria-hidden'), null);
      assert.equal(await frame.getAttribute('tabindex'), null, 'native controls remain keyboard reachable');
      await frame.scrollIntoViewIfNeeded();
      const player = await frame.evaluate(node => {
        const r = node.getBoundingClientRect(), s = getComputedStyle(node);
        const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 12, r.bottom - 12]];
        return { width: r.width, height: r.height, pointer: s.pointerEvents, transform: s.transform,
          covered: !!node.closest('[aria-hidden="true"],[inert]'), unobscured: points.every(([x, y]) => document.elementFromPoint(x, y) === node) };
      });
      assert(player.width >= 200 && player.height >= 200, 'native player is at least 200x200');
      assert.equal(player.pointer, 'auto');
      assert.equal(player.transform, 'none', 'the player is not enlarged or cropped as a background');
      assert.equal(player.covered, false);
      assert.equal(player.unobscured, true, 'player image and native controls have no overlay');
      assert(await page.locator('#gate-video-source').isVisible());
      const status = await page.locator('#gate-video-status').textContent();
      assert(status.includes('may need to press play'), 'status explains that playback is not inferred');
      await frame.dispatchEvent('load');
      assert.equal(await page.locator('#gate-video-status').textContent(), status, 'frame load never announces playback success');
    }
    async function stopped() {
      await page.waitForFunction(() => !document.querySelector('#gate-video-frame'));
      assert.equal(await page.locator('#gate-video-stage .gate-video-poster').count(), 1);
      assert(await page.locator('#gate-video-source').isVisible());
    }
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await loadPlayer();
      await page.locator('#gate-video-toggle').click();
      await stopped();
    }

    // Lifecycle events are exercised on this synthetic document; no sign-in
    // or production overlay is invoked to cover or dismiss the player.
    await loadPlayer();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await stopped();
    const beforeReturn = externalRequests.length;
    await page.locator('#gate-video-toggle').click();
    assert.equal(await page.locator('#gate-video-frame').count(), 0, 'inactive page cannot reload media');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await frames(page);
    assert.equal(externalRequests.length, beforeReturn, 'returning to the page does not restart media');
    await loadPlayer();
    await page.locator('main').evaluate(node => { node.inert = true; });
    await stopped();
    await page.locator('main').evaluate(node => { node.inert = false; });
    await loadPlayer();
    await page.locator('#gate-loading').evaluate(node => { node.hidden = false; });
    await stopped();
    await page.locator('#gate-loading').evaluate(node => { node.hidden = true; });

    await loadPlayer();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stopped();
    assert.equal(await page.locator('.gate-cinema-glow').evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.equal(await page.locator('.gate-loading-orbit').evaluate(node => getComputedStyle(node, '::before').animationName), 'none');
    await loadPlayer('0');
    await page.locator('#gate-video-toggle').click();
    await stopped();

    assert.equal(await page.locator('#site-password').inputValue(), '');
    assert.equal(await page.locator('#unlock-form').getAttribute('aria-busy'), 'false');
    assert.deepEqual(unexpectedLocal, []);
    assert.deepEqual(blockedRequests, []);
    assert.deepEqual(errors, [], 'no JavaScript exception occurs in the gate or fixture frame');
    console.log(JSON.stringify({ layoutCases: cases, locales, viewports, playerViewports: viewports.length, nativeControlsFixture: true, productionLogin: false, externalPlaybackTested: false }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
