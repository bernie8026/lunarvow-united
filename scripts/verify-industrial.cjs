'use strict';
// Visual cascade and layout using the public chapter helpers and a locked shell.
// All requests are fulfilled locally; the login script is deliberately inert.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { fixture } = require('./verify-reference-media.cjs');

const root = path.resolve(__dirname, '..');
const site = 'https://fixture.test/lunarvow-united/';
const docs = path.join(root, 'docs');
const theme = '<link rel="stylesheet" href="assets/industrial.css">';
const themed = html => html.replace('</head>', theme + '</head>');
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const checkWidth = (page, label) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
  .then(fits => assert(fits, label + ': no horizontal document overflow'));
const fits = async (locator, label) => {
  const result = await locator.evaluate(node => {
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1
      && node.scrollWidth <= node.clientWidth + 2;
  });
  assert(result, label + ' fits horizontally');
};

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const pages = {
      'stem.html': fixture('stem'),
      'index.html': themed(fs.readFileSync(path.join(root, 'scripts/test/fixtures/portfolio-ui.html'), 'utf8')),
      'unlock.html': fs.readFileSync(path.join(docs, 'unlock.html'), 'utf8'),
    };
    // Hold the real reference CSS so that the industrial sheet is already
    // applied when the real chapter code re-appends its own stylesheet.
    let releaseMedia;
    const pendingMedia = new Promise(resolve => { releaseMedia = resolve; });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!url.href.startsWith(site)) return route.abort();
      const file = url.pathname.slice(new URL(site).pathname.length);
      if (Object.hasOwn(pages, file)) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: pages[file] });
      if (file === 'protected-unlock.js') return route.fulfill({ contentType: 'text/javascript', body: '' });
      if (file === 'assets/reference-media.css') await pendingMedia;
      if (file.startsWith('assets/') && fs.existsSync(path.join(docs, file))) return route.fulfill({ path: path.join(docs, file) });
      return route.fulfill({ status: 404 });
    });
    await page.goto(site + 'stem.html', { waitUntil: 'commit' });
    await page.waitForFunction(() => Array.from(document.styleSheets).some(sheet => sheet.href?.endsWith('/industrial.css')));
    releaseMedia();
    const heading = page.locator('.ref-stem-hero-title');
    await heading.waitFor();
    await page.evaluate(() => window.__fixtureLanguage('ru'));
    const palettes = new Set();
    for (const variant of ['dark', 'light']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = document.body.dataset.theme = value; }, variant);
      for (const width of [1366, 360]) {
        await page.setViewportSize({ width, height: 900 });
        await frames(page);
        const state = await heading.evaluate(node => {
          const hero = node.closest('.ref-hero');
          return { weight: Number(getComputedStyle(node).fontWeight), surface: getComputedStyle(node.closest('.ref-chapter')).backgroundColor,
            illustration: getComputedStyle(hero.querySelector('.ref-stem-hero-grid > div'), '::after').backgroundImage,
            columns: getComputedStyle(hero.querySelector('.ref-stem-hero-grid')).gridTemplateColumns.split(' ').length };
        });
        assert(state.weight >= 700, 'industrial title retains its hierarchy after chapter CSS is loaded');
        assert.match(state.illustration, /stem-plate\.svg/, 'STEM artwork survives the late reference rules');
        assert.equal(state.columns, width > 900 ? 2 : 1, 'STEM switches from two columns to one');
        assert.notEqual(state.surface, 'rgba(0, 0, 0, 0)');
        palettes.add(state.surface);
        await fits(heading, 'translated STEM heading');
        await checkWidth(page, 'STEM');
      }
    }
    assert.equal(palettes.size, 2, 'dark and light reading surfaces stay distinct');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(site + 'index.html');
    await page.locator('[data-portfolio-identity]').waitFor();
    await page.locator('[data-language="ru"]').click();
    await page.locator('.menu-toggle').click();
    const nav = page.locator('#main-nav');
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    for (const link of await nav.locator('a').all()) {
      assert(await link.isVisible());
      await fits(link, 'mobile navigation link');
    }
    await checkWidth(page, 'mobile translated navigation');
    await page.goto(site + 'unlock.html');
    const gate = page.locator('body[data-protected-gate]');
    await fits(gate.locator('.gate-form'), 'password form');
    await fits(gate.locator('.gate-intro h1'), 'gate title');
    assert.equal(await gate.locator('#site-password').getAttribute('type'), 'password');
    assert.equal(await gate.locator('.gate-intro-rule').evaluate(n => getComputedStyle(n).animationName), 'none', 'reduced motion disables gate calibration');
    const key = gate.locator('[data-gate-language="en"]');
    await page.keyboard.press('Tab');
    await key.focus();
    assert(await key.evaluate(n => n.matches(':focus-visible') && parseFloat(getComputedStyle(n).outlineWidth) >= 1), 'keyboard focus is visible');
    await checkWidth(page, 'mobile gate');
    assert.deepEqual(errors, []);
    console.log('Industrial STEM cascade, both palettes, responsive navigation and locked gate verified on public fixtures.');
  } finally { await browser.close(); }
}

if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
