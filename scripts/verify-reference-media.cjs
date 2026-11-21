'use strict';
// Synthetic unlocked-page contracts exercise the public presentation helper.
// No production credentials, archive key or decrypted publication is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const prefix = '/lunarvow-united/';
const locales = ['zh-HK', 'en', 'zh-CN', 'ja', 'ko', 'th', 'ru'];
const pages = ['photography', 'equipment', 'stem'];
const onePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };

function oldMain(name, svgRoots = false) {
  if (name === 'photography') return `<section data-fixture-old="photo"><h1>Original synthetic photo chapter</h1><div data-photo-exhibit tabindex="0"><svg viewBox="0 0 800 450"><rect width="800" height="450" fill="#345"/><g data-photo-grade><rect width="400" height="450" fill="#567"/></g></svg><button data-photo-prev>Previous</button><button data-photo-next>Next</button>${[0, 1, 2].map(i => `<button data-photo-select="${i}" aria-pressed="${i === 0}">Study ${i}</button>`).join('')}<input data-photo-compare type="range" min="0" max="100" value="50"></div></section><section data-fixture-old="notes"><h2>Observation fixture</h2><p>Private fixture content remains connected.</p></section>`;
  if (name === 'equipment') return `<section data-fixture-old="equipment"><h1>Original synthetic equipment chapter</h1><div data-eq-stage><div data-eq-viewport><img src="assets/equipment/nikon-d5300.jpg" alt="Synthetic product fixture"><span data-eq-lens hidden></span><button data-eq-hotspot>Detail</button></div><button data-eq-select="camera" aria-pressed="true">Camera</button><button data-eq-select="flash" aria-pressed="false">Flash</button></div></section><section data-fixture-old="light"><h2>Original synthetic light studio</h2><svg viewBox="0 0 800 450"><polygon data-light-beam points="200,200 600,100 600,400"/><path data-light-bounce-path d=""/><g data-light-handle tabindex="0"><rect width="40" height="40"/></g></svg><input data-light-angle type="range" min="0" max="90" value="45"><input data-light-power type="range" min="0" max="100" value="50"><button data-light-mode="direct" aria-pressed="true">Direct</button><button data-light-mode="bounce" aria-pressed="false">Bounce</button></section>`;
  if (name === 'stem') {
    const assembly = `<svg ${svgRoots ? 'data-stem-assembly' : ''} viewBox="0 0 800 450"><g data-stem-layer transform="translate(400 140)"><rect width="100" height="30"/></g><g data-stem-layer transform="translate(400 230)"><rect width="80" height="30"/></g></svg>`;
    const map = `<svg ${svgRoots ? 'data-flight-map' : ''} viewBox="0 0 800 450"><g data-flight-drone transform="translate(100 100)"><circle r="20"/></g><g data-flight-waypoint tabindex="0" transform="translate(100 100)"><circle r="14"/></g></svg>`;
    return `<section data-fixture-old="assembly"><h1>Original synthetic STEM chapter</h1>${svgRoots ? assembly : `<div data-stem-assembly>${assembly}</div>`}</section><section data-fixture-old="flight">${svgRoots ? map : `<div data-flight-map>${map}</div>`}<button data-flight-add>Add</button><button data-flight-play>Play</button><button data-flight-reset>Reset</button><input data-flight-scrub type="range" min="0" max="100" value="0"></section>`;
  }
  return '<section data-fixture-old="unrelated"><h1>Untouched synthetic page</h1><p>Unrelated chapter.</p></section>';
}

function fixture(name, svgRoots = false) {
  const allMarkup = Object.fromEntries([...pages, 'about'].map(page => [page, oldMain(page, svgRoots)]));
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#07101b;color:#edf6ff;font:16px/1.6 system-ui;--ink:#edf6ff;--muted:#a8bdcc;--signal:#54c8ff;--line:#62778a;--bg:#07101b}body[data-theme=light]{background:#f4f7fa;color:#102133;--ink:#102133;--muted:#456;--bg:#f4f7fa}.masthead,.footer{padding:18px 24px}.main-nav{display:flex;flex-wrap:wrap;gap:8px 14px}.main-nav a{color:inherit}main{max-width:1200px;margin:auto;padding:24px}svg{width:100%;max-height:550px}button{min-height:44px}img{max-width:100%}[hidden]{display:none!important}</style><link rel="stylesheet" href="assets/industrial.css"><script src="assets/protected-media.js?v=reference-test" defer></script></head><body data-page="${name}" data-theme="dark"><header class="masthead"><nav id="main-nav" class="main-nav">${[...pages, 'about'].map((page, i) => `<a href="${page}.html" data-internal><span class="nav-index">0${i + 1}</span><span data-i18n="fixtureNav">${page}</span></a>`).join('')}</nav></header><main id="main" tabindex="-1">${allMarkup[name]}</main><footer class="footer">Shared original footer fixture</footer><form id="fixture-auth" hidden><input id="site-password" type="password"></form><script>
window.__fixtureEqOriginal=document.querySelector("[data-eq-stage]")?.outerHTML;window.__fixtureChrome={header:document.querySelector(".masthead").outerHTML,footer:document.querySelector(".footer").outerHTML};window.__fixtureMarkup=${JSON.stringify(allMarkup)};window.__fixtureScopeCleanups=[];window.__fixtureModules=[];window.__sensitiveReads=[];window.__fixtureOldReferences=[...document.querySelector('#main').children];window.PORTFOLIO_TEXT={};
const trap=name=>{window.__sensitiveReads.push(name);throw new Error('Private API read: '+name)};
for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{configurable:true,get(){return trap(name)}});
Object.defineProperty(document,'cookie',{configurable:true,get(){return trap('cookie')}});Object.defineProperty(navigator,'credentials',{configurable:true,get(){return trap('credentials')}});Object.defineProperty(document.querySelector('#site-password'),'value',{configurable:true,get(){return trap('password.value')}});
window.fetch=()=>trap('fetch');window.XMLHttpRequest=function(){return trap('XMLHttpRequest')};
function mount(record){const cleanups=[],scope={memory:{},cleanup(fn){cleanups.push(fn)},on(target,type,fn,options){target.addEventListener(type,fn,options);cleanups.push(()=>target.removeEventListener(type,fn,options))},requestAnimationFrame:requestAnimationFrame.bind(window),cancelAnimationFrame:cancelAnimationFrame.bind(window),setTimeout:setTimeout.bind(window),clearTimeout:clearTimeout.bind(window)};record.mount(scope);window.__fixtureScopeCleanups.push(()=>cleanups.reverse().forEach(fn=>fn()));}
window.PORTFOLIO_PAGES={register(name,src,factory){const record={name,src,mount:factory};window.__fixtureModules.push(record);mount(record)}};
window.__fixtureNavigate=name=>{for(const clean of window.__fixtureScopeCleanups.splice(0))clean();document.body.dataset.page=name;history.pushState({},'',name+'.html');document.querySelector('#main').innerHTML=window.__fixtureMarkup[name];window.__fixtureOldReferences=[...document.querySelector('#main').children];window.__fixtureEqOriginal=document.querySelector('[data-eq-stage]')?.outerHTML;for(const record of window.__fixtureModules)mount(record);document.dispatchEvent(new CustomEvent('portfolio:navigated'));};
window.__fixtureLanguage=lang=>{document.documentElement.lang=lang;document.dispatchEvent(new CustomEvent('portfolio:language',{detail:{language:lang}}));};
</script></body></html>`;
}

const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const mount = (page, name) => page.locator('[data-reference-media="' + name + '"]').waitFor();
async function decoded(page, selector = 'main img') {
  await page.locator('[data-reference-media] img').evaluateAll(nodes => nodes.forEach(node => { node.loading = 'eager'; }));
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].filter(n => n.getClientRects().length).every(n => n.complete && n.naturalWidth > 0), selector);
}
async function layout(page, label) {
  const state = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, headings: [...document.querySelectorAll('main h1')].filter(n => n.getClientRects().length).length, broken: [...document.querySelectorAll('main img')].filter(n => n.getClientRects().length && (!n.complete || !n.naturalWidth)).length, authReads: window.__sensitiveReads }));
  if (state.scroll > state.width + 1) console.error(JSON.stringify({ label, ...state, overflow: await page.locator('body *').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(node).position !== 'fixed'; }).slice(0, 12).map(node => ({ tag: node.tagName, class: node.className?.baseVal || node.className, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width }))) }));
  assert(state.scroll <= state.width + 1, label + ' fits without horizontal overflow');
  assert.equal(state.headings, 1, label + ' has one visible main heading');
  assert.equal(state.broken, 0, label + ' visible images decode');
  assert.deepEqual(state.authReads, [], label + ' reads no private API');
  const captions = await page.locator('[data-reference-media] figure').evaluateAll(figures => figures.flatMap(figure => {
    const media = figure.querySelector(':scope > img,:scope > video'), caption = figure.querySelector(':scope > figcaption');
    if (!media || !caption || !figure.getClientRects().length) return [];
    const m = media.getBoundingClientRect(), c = caption.getBoundingClientRect();
    return c.top < m.bottom - 1 ? [{ className: figure.className, mediaBottom: m.bottom, captionTop: c.top }] : [];
  }));
  assert.deepEqual(captions, [], label + ' media captions do not overlap their photographs or video');
  const workflow = await page.locator('.ref-photo-workflow .ref-grid').evaluateAll(grids => grids.map(grid => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
    children: [...grid.children].map(node => { const rect = node.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }; })
  })));
  for (const grid of workflow) {
    assert.equal(grid.children.length, 2, label + ' workflow contains video and explanation');
    assert.equal(grid.columns, state.width <= 800 ? 1 : 2, label + ' workflow uses one mobile column or two desktop columns');
    const [media, explanation] = grid.children;
    if (state.width <= 800) assert(explanation.top >= media.bottom - 1 && Math.abs(media.left - explanation.left) < 1, label + ' workflow explanation follows video in mobile flow');
    else assert(explanation.left >= media.right - 1 && Math.abs(media.top - explanation.top) < 1, label + ' workflow explanation sits beside video on desktop');
  }
}

async function retained(page, name) {
  const result = await page.evaluate(() => ({ old: window.__fixtureOldReferences.map(node => ({ connected: node.isConnected, hidden: node.hasAttribute('hidden'), marked: node.hasAttribute('data-reference-original'), visible: !!node.getClientRects().length })), header: document.querySelector('.masthead').outerHTML === window.__fixtureChrome.header, footer: document.querySelector('.footer').outerHTML === window.__fixtureChrome.footer, eq: document.querySelector('[data-eq-stage]')?.outerHTML }));
  assert(result.old.every(node => node.connected), name + ' original nodes remain connected');
  assert(result.header && result.footer, name + ' shared chrome is unchanged');
  if (name === 'equipment') {
    assert.equal(result.old[0].hidden, false, 'original equipment viewer remains visible');
    assert.equal(result.old[0].visible, true);
    assert(result.old[1].hidden && result.old[1].marked, 'only original light studio is hidden');
    assert.equal(result.eq, await page.evaluate(() => window.__fixtureEqOriginal), 'original product viewer is not modified');
  } else assert(result.old.every(node => node.hidden && node.marked && !node.visible), name + ' old chapter is hidden without deletion');
}

async function photoInteractions(page) {
  const root = page.locator('[data-reference-media="photography"]');
  const selected = () => root.locator('[data-ref-photo-select][aria-pressed="true"]').getAttribute('data-ref-photo-select');
  assert.equal(await selected(), '0');
  await root.locator('[data-ref-photo-direction="1"]').click(); assert.equal(await selected(), '1');
  await root.locator('[data-ref-photo-direction="-1"]').click(); assert.equal(await selected(), '0');
  await root.locator('[data-ref-photo-select="2"]').click(); assert.equal(await selected(), '2');
  await root.locator('.ref-photo-gallery').focus(); await page.keyboard.press('Home'); assert.equal(await selected(), '0');
  await page.keyboard.press('End'); assert.equal(await selected(), '2');
  await page.keyboard.press('ArrowRight'); assert.equal(await selected(), '0');
  assert.equal(await root.locator('[data-ref-photo-slide]:visible').count(), 1);
  async function split(value) { await root.locator('#ref-photo-compare').evaluate((node, value) => { node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); }, String(value)); return root.locator('.ref-photo-cool').evaluate(node => getComputedStyle(node).clipPath); }
  const first = await split(18), second = await split(82); assert.notEqual(first, second, 'comparison changes rendered clip'); assert.equal(await split(18), first, 'comparison reverses precisely');
  assert.equal(await root.locator('svg').count(), 0, 'new photography uses actual images rather than drawn scene');
  await decoded(page);
}

async function stemInteractions(page) {
  const root = page.locator('[data-reference-media="stem"]');
  for (const index of [1, 3, 0, 2]) {
    await root.locator('[data-stem-part="' + index + '"]').click();
    assert.equal(await root.locator('[data-stem-part][aria-pressed="true"]').count(), 1);
    assert.equal(await root.locator('[data-stem-marker][data-active="true"]').getAttribute('data-stem-marker'), String(index));
  }
  assert.equal(await root.locator('svg').count(), 0, 'new STEM uses actual photographs and footage');
}

async function videoBehavior(page, name) {
  const video = page.locator('[data-reference-media="' + name + '"] video[data-ref-video]').first();
  assert.equal(await video.count(), 1, name + ' contains native reference footage');
  assert.equal(await video.getAttribute('controls'), '', name + ' native controls remain available');
  await video.scrollIntoViewIfNeeded();
  await video.evaluate(node => { node.muted = true; return node.play(); });
  await page.waitForFunction(selector => { const v = document.querySelector(selector); return !v.paused && v.readyState >= 2 && v.videoWidth > 0; }, '[data-reference-media="' + name + '"] video[data-ref-video]');
  const initial = await video.evaluate(node => node.currentTime);
  await page.waitForFunction(({ selector, initial }) => { const v = document.querySelector(selector); return v.currentTime > initial + .15 || v.currentTime < initial - .1; }, { selector: '[data-reference-media="' + name + '"] video[data-ref-video]', initial });
  assert(await video.evaluate(node => node.muted), name + ' moving footage stays muted');
  await video.evaluate(node => node.pause());
  await frame(page); assert(await video.evaluate(node => node.paused), name + ' user pause is retained');
  await video.evaluate(node => node.play());
  await page.locator('main').evaluate(node => { node.inert = true; });
  await page.waitForFunction(selector => { const v = document.querySelector(selector); return v.paused && v.muted; }, '[data-reference-media="' + name + '"] video[data-ref-video]');
  await page.locator('main').evaluate(node => { node.inert = false; });
  await video.evaluate(node => node.play()); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(selector => { const v = document.querySelector(selector); return v.paused && v.muted; }, '[data-reference-media="' + name + '"] video[data-ref-video]');
  await video.evaluate(node => node.play()); assert.equal(await video.evaluate(node => node.paused), false, name + ' deliberate playback works under reduced motion');
  await video.evaluate(node => { node.pause(); node.currentTime = Math.min(1, node.duration / 2); });
  const seek = await video.evaluate(node => node.currentTime); assert(seek > 0, name + ' native seek works');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { window.__fixtureDetachedVideo = document.querySelector('[data-reference-media] video[data-ref-video]'); });
}

async function cleanupAndNavigate(page, next) {
  await page.evaluate(next => { window.__fixtureNavigate(next); }, next);
  if (next === 'about') {
    await frame(page);
    assert.equal(await page.locator('[data-reference-media]').count(), 0, 'unrelated page is unchanged');
    assert.equal(await page.locator('main').innerHTML(), oldMain('about'));
    const stopped = await page.evaluate(() => !window.__fixtureDetachedVideo || (window.__fixtureDetachedVideo.paused && window.__fixtureDetachedVideo.muted));
    assert(stopped, 'disposed video cannot keep audio or playback running');
  } else { await mount(page, next); assert.equal(await page.locator('[data-reference-media]').count(), 1, 'one helper mounts after soft navigation'); }
}

async function restoreOriginals(page) {
  const result = await page.evaluate(() => {
    for (const clean of window.__fixtureScopeCleanups.splice(0)) clean();
    return { count: document.querySelectorAll('[data-reference-media]').length, originals: window.__fixtureOldReferences.map(node => ({ connected: node.isConnected, hidden: node.hasAttribute('hidden'), marked: node.hasAttribute('data-reference-original') })), active: document.querySelector('main').hasAttribute('data-reference-active'), body: document.body.hasAttribute('data-portfolio-media'), videoPaused: !window.__fixtureDetachedVideo || (window.__fixtureDetachedVideo.paused && window.__fixtureDetachedVideo.muted) };
  });
  assert.equal(result.count, 0); assert.equal(result.active, false); assert.equal(result.body, false);
  assert(result.originals.every(node => node.connected && !node.hidden && !node.marked), 'cleanup restores original nodes and attributes');
  assert(result.videoPaused, 'cleanup pauses and mutes detached media');
}

async function screenshot(page, name, mobile) {
  const directory = process.env.REFERENCE_MEDIA_SCREENSHOTS;
  if (!directory) return;
  fs.mkdirSync(directory, { recursive: true });
  await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 });
  await page.evaluate(() => { window.__fixtureLanguage('zh-HK'); document.body.dataset.theme = document.documentElement.dataset.theme = 'dark'; });
  const root = page.locator('[data-reference-media="' + name + '"]');
  await root.scrollIntoViewIfNeeded();
  await page.evaluate(() => { const root = document.querySelector('[data-reference-media]'); scrollTo({ top: root.getBoundingClientRect().top + scrollY, behavior: 'instant' }); });
  await decoded(page); await frame(page);
  const basename = name === 'equipment' ? 'lighting' : name;
  await page.screenshot({ path: path.join(directory, 'reference-' + basename + '-' + (mobile ? 'mobile' : 'desktop') + '.png'), fullPage: false });
  if (name === 'photography' && !mobile) {
    const workflow = root.locator('.ref-photo-workflow');
    await workflow.scrollIntoViewIfNeeded(); await frame(page);
    await workflow.screenshot({ path: path.join(directory, 'reference-photography-workflow.png') });
  }
}

async function run() {
  let browser, server; const errors = [], blocked = [], missing = []; let cases = 0;
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    if (url.pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
    if (!['GET', 'HEAD'].includes(request.method)) { blocked.push(request.method + ' ' + url.pathname); response.writeHead(405).end(); return; }
    const page = url.pathname.slice(prefix.length).replace(/\.html$/, '');
    if (url.pathname.startsWith(prefix) && [...pages, 'about'].includes(page)) { const body = Buffer.from(fixture(page, url.searchParams.has('svg-roots'))); response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store' }); response.end(request.method === 'HEAD' ? undefined : body); return; }
    if (url.pathname === prefix + 'assets/equipment/nikon-d5300.jpg') { response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': onePixel.length }); response.end(onePixel); return; }
    const assetRoot = path.join(root, 'protection/assets');
    const filename = path.resolve(assetRoot, url.pathname.slice((prefix + 'assets/').length));
    if (!url.pathname.startsWith(prefix + 'assets/') || !filename.startsWith(assetRoot + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { missing.push(url.pathname); response.writeHead(404).end('Unknown fixture resource'); return; }
    const size = fs.statSync(filename).size, type = mime[path.extname(filename)] || 'application/octet-stream';
    const range = request.method === 'GET' && /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
    let start = 0, end = size - 1, status = 200;
    if (range) { start = Number(range[1]); end = Math.min(range[2] ? Number(range[2]) : end, end); status = 206; }
    if (start > end || start >= size) { response.writeHead(416, { 'Content-Range': 'bytes */' + size }).end(); return; }
    response.writeHead(status, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': /^(image|video)\//.test(type) ? 'max-age=3600' : 'no-store', ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
    if (request.method === 'HEAD') response.end(); else fs.createReadStream(filename, { start, end }).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === origin) return route.continue(); blocked.push(route.request().method() + ' ' + url.href); return route.abort('blockedbyclient'); });
    const page = await context.newPage(); page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(error.message));
    for (const name of pages) {
      await page.goto(origin + prefix + name + '.html', { waitUntil: 'load' });
      await mount(page, name); await decoded(page); await retained(page, name);
      const languageContent = new Set();
      for (const lang of locales) {
        await page.evaluate(lang => window.__fixtureLanguage(lang), lang); await frame(page);
        const copy = await page.locator('[data-reference-media] [data-ref-copy]').evaluateAll(nodes => nodes.map(node => node.textContent.trim()));
        assert(copy.length > 0 && copy.every(Boolean), name + '/' + lang + ' translated copy is populated');
        languageContent.add(copy.join('|'));
        for (const width of [320, 1440]) {
          await page.setViewportSize({ width, height: width === 320 ? 844 : 1000 });
          for (const theme of ['dark', 'light']) { await page.evaluate(theme => { document.body.dataset.theme = theme; document.documentElement.dataset.theme = theme; }, theme); await frame(page); await layout(page, name + '/' + lang + '/' + width + '/' + theme); cases++; }
        }
      }
      assert.equal(languageContent.size, 7, name + ' has seven distinct translated versions');
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (name === 'photography') await photoInteractions(page);
      if (name === 'stem') await stemInteractions(page);
      await videoBehavior(page, name);
      if (name !== 'equipment') await screenshot(page, name, false);
      await screenshot(page, name, true);
      await restoreOriginals(page);
      await cleanupAndNavigate(page, 'about');
      await cleanupAndNavigate(page, name); await retained(page, name);
      await cleanupAndNavigate(page, name); await retained(page, name);
    }
    // SVG-root and container-root fixtures both exercise complete replacement,
    // without relying on unknown encrypted wrapper class names.
    await page.goto(origin + prefix + 'stem.html?svg-roots', { waitUntil: 'load' }); await mount(page, 'stem'); await retained(page, 'stem');
    await cleanupAndNavigate(page, 'photography'); await photoInteractions(page);
    await cleanupAndNavigate(page, 'equipment'); await retained(page, 'equipment');
    await cleanupAndNavigate(page, 'about');
    assert.deepEqual(errors, []); assert.deepEqual(blocked, []); assert.deepEqual(missing, []);
    console.log(JSON.stringify({ layoutCases: cases, languages: locales, pages, syntheticCurrentContracts: true, actualEncryptedMarkupTested: false, productionLogin: false }));
    await context.close();
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
// Run the late-loading theme and gate checks in the same CI browser job.
if (require.main === module) run().then(() => require('./verify-industrial.cjs').run()).then(() => require('./verify-field-layout.cjs').run()).catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = { oldMain, fixture };
