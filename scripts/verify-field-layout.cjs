'use strict';
// Public presentation fixtures only. The original stylesheet order, translated
// navigation, late gallery mount and keyboard actions are exercised in Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { fixture } = require('./verify-reference-media.cjs');
const root = path.resolve(__dirname, '..');
const site = new URL('https://fixture.test/lunarvow-united/');
const published = path.join(root, 'docs');
const home = fs.readFileSync(path.join(root, 'scripts/test/fixtures/portfolio-ui.html'), 'utf8');
const header = home.match(/<header class="masthead">[\s\S]*?<\/header>/)[0];
const oldShell = home.match(/<style>[\s\S]*?<\/style>/)[0];
const field = '<link rel="stylesheet" href="assets/field-layout.css"><script defer src="assets/field-layout.js"></script>';
const sheet = '<link rel="stylesheet" href="assets/industrial.css">';
const themed = (html, group, extra = '') => html.replace('</head>', extra + field + '<link rel="stylesheet" href="assets/field-' + group + '.css"></head>');
const mediaFixture = name => themed(fixture(name).replace('<style>', oldShell + '<style>')
  .replace(/<header class="masthead">[\s\S]*?<\/header>/, header.replace('href="' + name + '.html?', 'aria-current="page" href="' + name + '.html?')),
  'media', '<script defer src="assets/protected-ui.js"></script>');
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const width = async (page, size) => { await page.setViewportSize({ width: size, height: 900 }); await frames(page); };
const rect = async locator => { const r = await locator.boundingBox(); assert(r, 'visible ' + locator); return r; };
const beside = (a, b) => a.x + a.width <= b.x + 2 && a.y < b.y + b.height && b.y < a.y + a.height;
const above = (a, b) => a.y + a.height <= b.y + 2;
const noOverflow = async (page, label) => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' fits horizontally');

async function menu(page, current) {
  const trigger = page.locator('.field-menu-button'), panelId = await trigger.getAttribute('aria-controls');
  assert(panelId, 'menu trigger identifies the actual destination panel');
  const panel = page.locator('[id="' + panelId + '"]');
  await trigger.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.field-menu-button')?.getAttribute('aria-expanded') === 'true');
  const links = panel.locator('a:visible');
  assert(await links.count() >= 4, 'opening the selector exposes real chapter destinations');
  if (current) assert((await panel.locator('a[aria-current="page"]').getAttribute('href')).startsWith(current + '.html'), 'current chapter is identifiable');
  await links.first().focus(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.field-menu-button')?.getAttribute('aria-expanded') === 'false');
  assert(await trigger.evaluate(n => document.activeElement === n), 'Escape returns focus to the trigger');
}

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? { channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } : {}) });
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
    page.setDefaultTimeout(10000);
    const pages = { 'index.html':themed(home,'home',sheet), 'stem.html':mediaFixture('stem'), 'unlock.html':fs.readFileSync(path.join(published, 'unlock.html'),'utf8') };
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let release; const delayed = new Promise(resolve => { release = resolve; });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== site.origin || !url.pathname.startsWith(site.pathname)) return route.abort();
      const file = url.pathname.slice(site.pathname.length);
      if (Object.hasOwn(pages,file)) return route.fulfill({contentType:'text/html; charset=utf-8',body:pages[file]});
      if (file === 'protected-unlock.js') return route.fulfill({contentType:'text/javascript',body:''});
      if (file === 'assets/reference-media.css') await delayed;
      const target = path.resolve(published,file);
      if (file.startsWith('assets/') && target.startsWith(published + path.sep) && fs.existsSync(target)) return route.fulfill({path:target});
      return route.fulfill({status:404});
    });

    await page.goto(site.href + 'index.html');
    await page.locator('body[data-field-layout] .portfolio-identity').waitFor();
    for (const size of [1440, 390]) {
      await width(page,size);
      await menu(page);
      const mast = await rect(page.locator('.masthead'));
      assert(mast.width > size * .90 && mast.height < 900 * .5, 'navigation is a horizontal header, not the old vertical sidebar');
      const profile = await rect(page.locator('main .portfolio-identity')), featured = await rect(page.locator('#selected-work'));
      assert(size > 900 ? beside(profile,featured) : above(profile,featured), 'home profile and featured chapter reflow at ' + size);
      await noOverflow(page, 'home at ' + size);
    }
    await page.locator('.masthead [data-language="ru"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'ru', 'the existing language action is still connected');
    await menu(page); await noOverflow(page,'translated mobile navigation');

    await page.goto(site.href + 'stem.html', {waitUntil:'commit'});
    await page.locator('body[data-field-layout] .field-menu-button').waitFor();
    release();
    const chapter = page.locator('[data-reference-media="stem"]');
    await chapter.waitFor();
    const sectionMenu = page.locator('details.field-contents');
    await sectionMenu.locator('summary').click();
    await page.waitForFunction(() => {
      const refs = [...document.querySelectorAll('.field-contents a[href*="#"]')];
      return refs.length >= 2 && refs.every(a => {
        const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
        return target?.getClientRects().length && !target.closest('[hidden]');
      }) && refs.some(a => document.getElementById(decodeURIComponent(a.hash.slice(1))).closest('[data-reference-media="stem"]'));
    });
    const firstLabel = await sectionMenu.locator('a').first().textContent();
    await page.evaluate(() => window.__fixtureLanguage('ru'));
    await page.waitForFunction(old => {
      const link = document.querySelector('.field-contents a');
      const target = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
      return link?.textContent !== old && target && link.textContent === (target.matches('h2') ? target : target.querySelector('h2'))?.textContent?.trim();
    }, firstLabel);
    const last = sectionMenu.locator('a[href*="#"]').last();
    const hash = new URL(await last.getAttribute('href'),site).hash;
    await last.click();
    await page.waitForFunction(id => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return r && r.bottom > 0 && r.top < innerHeight;
    }, decodeURIComponent(hash.slice(1)));
    await menu(page,'stem');

    for (const size of [1440,390]) {
      await width(page,size);
      const stage = await rect(chapter.locator('.ref-stem-product'));
      const lead = await rect(chapter.locator('.ref-stem-hero-grid .ref-lead'));
      assert(size > 960 ? beside(stage,lead) : above(stage,lead), 'flight viewer and its reading pane recompose at ' + size);
      await noOverflow(page, 'flight chapter');
    }
    await chapter.locator('[data-air-select="drawing"]').click();
    assert(await chapter.locator('[data-air-view="drawing"]').isVisible(), 'drawing control changes the visible stage');
    await chapter.locator('[data-air-select="photo"]').click();
    assert(!(await chapter.locator('[data-air-view="drawing"]').isVisible()), 'photograph can be restored');
    // An in-document navigation replaces late-mounted content. Its section map
    // must follow the active chapter rather than retaining stale flight targets.
    for (const [name, left, right] of [
      ['photography','.ref-photo-slide:visible','.ref-photo-thumbs'],
      ['equipment','.field-studio-stage','.field-studio-sheet'],
    ]) {
      await page.evaluate(value => window.__fixtureNavigate(value), name);
      const active = page.locator('[data-reference-media="' + name + '"]');
      await active.waitFor();
      await page.waitForFunction(value => [...document.querySelectorAll('.field-contents a')].some(a => {
        const t = document.getElementById(decodeURIComponent(a.hash.slice(1)));
        return t?.closest('[data-reference-media]')?.getAttribute('data-reference-media') === value;
      }),name);
      for (const size of [1440,390]) {
        await width(page,size);
        const a = await rect(active.locator(left).first()), b = await rect(active.locator(right).first());
        assert(size > 960 ? beside(a,b) : above(a,b), name + ' viewer and index recompose at ' + size);
        await noOverflow(page, name);
      }
    }
    await page.goto(site.href + 'unlock.html');
    for (const size of [1440,390]) {
      await width(page,size);
      const vista = await rect(page.locator('.gate-deck .gate-vista')), form = await rect(page.locator('.gate-deck #unlock-form'));
      assert(size > 860 ? beside(vista,form) : above(vista,form), 'entrance and authentication desk recompose at ' + size);
      await noOverflow(page,'locked entry');
    }
    assert.deepEqual(errors,[]);
    console.log('Field layout: real desktop/mobile geometry, keyboard chapter navigation, language controls, late section anchors, drawing stage and locked entry verified.');
  } finally { await browser.close(); }
}
if (require.main === module) run().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { run };
