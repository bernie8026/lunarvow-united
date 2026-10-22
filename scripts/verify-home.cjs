/* Render the encrypted homepage without recording its access password. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const base = new URL(process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8766/lunarvow-united/');
const password = fs.readFileSync(path.resolve(root, process.env.PORTFOLIO_PASSWORD_FILE || '../lunarvow-private/access-password.txt'), 'utf8').trim();
const output = path.join(root, '.private', 'home-qa');
const pages = new Set(['index', 'about', 'experience', 'education', 'skills', 'projects', 'contact', 'sitemap']);
const errors = [];
const results = [];
let browser;
const route = (name = 'index', language = 'zh-HK') => new URL(`${name}.html?lang=${language}`, base).href;
const redact = error => String(error?.stack || error).split(password).join('[REDACTED]');

async function test(name, operation) {
  await operation();
  results.push(name);
  console.log('PASS ' + name);
}
async function ready(page, name = 'index') {
  await page.waitForFunction(name => document.body?.dataset.page === name &&
    !!document.querySelector('main#main') && !document.querySelector('.boot-screen') &&
    !document.body.classList.contains('is-booting') && !document.querySelector('main#main').inert &&
    document.documentElement.dataset.navigationState === 'idle', name, {timeout:30000});
}
async function unlock(page, language = 'zh-HK') {
  await page.goto(route('index', language), {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => {
    const field = document.querySelector('input[type="password"]');
    return field && !field.disabled && !document.querySelector('body[data-page] main#main');
  }, null, {timeout:15000});
  // Setting the value directly keeps credentials out of locator diagnostics.
  await page.locator('input[type="password"]').evaluate((node, value) => {
    node.value = value;
    node.dispatchEvent(new Event('input', {bubbles:true}));
  }, password);
  await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
  await ready(page);
}
async function contextFor(options = {}, theme = 'dark', language = 'zh-HK') {
  const context = await browser.newContext({viewport:{width:1440,height:960}, ...options});
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      // Chrome asks the preview origin for its default favicon before the
      // scoped password gate has loaded a document with its authored icon.
      const source = message.location().url;
      if (message.type() === 'error' && source !== new URL('/favicon.ico', base).href) errors.push(message.text());
    });
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText || 'request failed';
      if (request.url().startsWith(base.href) && !/ERR_ABORTED/.test(failure)) errors.push(failure + ': ' + request.url());
    });
  });
  await context.addInitScript(({theme, language}) => {
    try {
      if (!localStorage.getItem('bernie-portfolio-theme')) localStorage.setItem('bernie-portfolio-theme', theme);
      if (!localStorage.getItem('bernie-portfolio-language')) localStorage.setItem('bernie-portfolio-language', language);
    } catch {}
  }, {theme, language});
  return context;
}
async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function assertFit(page) {
  const dimensions = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth}));
  assert(dimensions.scroll <= dimensions.width + 2, 'homepage must not overflow the viewport horizontally');
  const title = await page.locator('.home-hero-title').boundingBox();
  assert(title && title.width > 0 && title.height > 0, 'homepage title has a rendered box');
  assert(title.x >= -2 && title.x + title.width <= dimensions.width + 2, 'homepage title stays inside the viewport');
}
async function assertImages(page) {
  const images = await page.locator('main.home-page img').evaluateAll(nodes => nodes.map(image => ({
    source:image.getAttribute('src'), complete:image.complete, width:image.naturalWidth,
    type:image.currentSrc.startsWith('data:') ? 'embedded' : 'file'
  })));
  assert(images.length >= 3, 'homepage contains the website, photography and drone illustrations');
  for (const image of images) assert(image.source && image.complete && image.width > 0, 'every homepage image is decoded before reveal');
  assert(await page.locator('#selected-work .home-browser img').count(), 'selected website preview is present');
}
async function assertLinks(page, language) {
  const links = await page.locator('main.home-page a[data-internal]').evaluateAll(nodes => nodes.map(link => ({
    href:link.href, label:link.textContent.trim()
  })));
  assert(links.length >= 7, 'homepage offers the portfolio sections');
  const destinations = new Set();
  for (const link of links) {
    const url = new URL(link.href);
    assert.equal(url.origin, base.origin, 'portfolio CTA stays on its site');
    assert(url.pathname.startsWith(base.pathname), 'portfolio CTA stays within its publication');
    const name = url.pathname.slice(base.pathname.length).replace(/\.html$/, '') || 'index';
    assert(pages.has(name), 'portfolio CTA points to a real portfolio page');
    assert.equal(url.searchParams.get('lang'), language, 'portfolio CTA retains the selected language');
    assert(link.label.length, 'portfolio CTA has an accessible visible label');
    destinations.add(name);
  }
  for (const name of ['about', 'education', 'projects', 'contact']) assert(destinations.has(name), `homepage offers ${name}`);
}
async function assertControls(page) {
  for (const selector of ['.motion-replay', '.ambient-toggle', '.site-lock']) {
    assert.equal(await page.locator(`.footer-links ${selector}`).count(), 1, 'footer control mounts exactly once: ' + selector);
  }
  assert.equal(await page.locator('main#main').count(), 1, 'page has one main landmark');
}
async function assertStructure(page) {
  assert.equal(await page.locator('main.home-page').count(), 1);
  assert.equal(await page.locator('main h1.home-hero-title').count(), 1);
  for (const selector of ['.home-hero', '.home-art', '#selected-work', '.home-feature-grid', '#explore', '#chapters', '.home-contact']) {
    assert.equal(await page.locator('main.home-page ' + selector).count(), 1, 'homepage section exists once: ' + selector);
  }
  assert(await page.locator('#chapters .navigation-row').count() >= 7, 'directory retains all seven destinations');
  await assertFit(page);
  await assertImages(page);
  await assertControls(page);
}
async function assertVisibleContent(page) {
  for (const selector of ['.home-hero-title', '#selected-work h2', '.home-feature-grid h2', '#explore h2', '#chapters h2', '.home-contact h2']) {
    const targets = page.locator(selector);
    assert(await targets.count(), 'section heading exists: ' + selector);
    for (const target of await targets.all()) {
      await target.scrollIntoViewIfNeeded();
      await frames(page);
      const visible = await target.evaluate(element => {
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return false;
        for (let node = element; node && node instanceof Element; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
        return true;
      });
      assert(visible, 'motion preferences keep content visible: ' + selector);
    }
  }
  await page.evaluate(() => scrollTo({top:0, behavior:'instant'}));
  await frames(page);
}
async function switchLanguage(page, language) {
  await page.locator(`[data-language="${language}"]`).click();
  await page.waitForFunction(language => document.documentElement.lang === language, language);
  assert.equal(await page.locator(`[data-language="${language}"]`).getAttribute('aria-pressed'), 'true');
  await assertLinks(page, language);
}
async function capture(page, name) {
  await page.evaluate(() => scrollTo({top:0, behavior:'instant'}));
  await frames(page);
  await page.screenshot({path:path.join(output, name), fullPage:true, animations:'disabled'});
}
async function main() {
  assert(password.length >= 12, 'an access password must be available locally');
  fs.mkdirSync(output, {recursive:true, mode:0o700});
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless:true});
  const context = await contextFor();
  const page = await context.newPage();
  try {
    await test('Desktop dark homepage unlocks, renders imagery and keeps working CTAs', async () => {
      await unlock(page);
      assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
      await assertStructure(page);
      await assertLinks(page, 'zh-HK');
      await capture(page, 'desktop-dark.png');
    });
    await test('Desktop light appearance and all three languages fit', async () => {
      await page.locator('.theme-toggle').click();
      await page.waitForFunction(() => document.body.dataset.theme === 'light');
      await assertStructure(page);
      await capture(page, 'desktop-light.png');
      for (const language of ['en', 'zh-CN', 'zh-HK']) {
        await switchLanguage(page, language);
        await assertFit(page);
      }
    });
    await test('Repeated Home / About navigation and browser Back reuse one live document', async () => {
      const token = await page.evaluate(() => window.__homeQaDocument = Math.random());
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.locator('main.home-page a[data-internal][href*="about.html"]').first().click();
        await ready(page, 'about');
        assert.equal(await page.evaluate(() => window.__homeQaDocument), token, 'About uses soft navigation');
        await assertControls(page);
        await page.locator('.brand[data-internal]').click();
        await ready(page);
        assert.equal(await page.evaluate(() => window.__homeQaDocument), token, 'Home uses soft navigation');
        await assertStructure(page);
      }
      await page.goBack();
      await ready(page, 'about');
      assert.equal(await page.evaluate(() => window.__homeQaDocument), token, 'browser Back uses the same document');
      await assertControls(page);
      await page.goForward();
      await ready(page);
      await assertStructure(page);
    });
    await test('Mobile 390 and 360 layouts, translations and images fit', async () => {
      for (const width of [390, 360]) {
        await page.setViewportSize({width, height:844});
        for (const language of ['zh-HK', 'en', 'zh-CN']) {
          await switchLanguage(page, language);
          await assertStructure(page);
        }
        await switchLanguage(page, 'zh-HK');
        await capture(page, `mobile-${width}.png`);
      }
      await page.setViewportSize({width:1440,height:960});
    });
    await test('Paused animation keeps every homepage section readable', async () => {
      await page.locator('.ambient-toggle').click();
      await page.waitForFunction(() => document.body.classList.contains('motion-paused'));
      await assertVisibleContent(page);
      await assertStructure(page);
      await page.locator('.ambient-toggle').click();
      await page.waitForFunction(() => !document.body.classList.contains('motion-paused'));
    });
    await test('Reduced motion unlocks and leaves all content visible', async () => {
      const reducedContext = await contextFor({viewport:{width:390,height:844}, reducedMotion:'reduce'}, 'light', 'en');
      const reducedPage = await reducedContext.newPage();
      try {
        await unlock(reducedPage, 'en');
        await assertStructure(reducedPage);
        await assertLinks(reducedPage, 'en');
        await assertVisibleContent(reducedPage);
      } finally { await reducedContext.close(); }
    });
    assert.deepEqual([...new Set(errors)], [], 'homepage has no uncaught browser errors');
    console.log(JSON.stringify({passed:results.length, screenshots:output, base:base.href}));
  } finally { await context.close(); await browser.close(); }
}
main().catch(async error => {
  console.error(redact(error));
  if (browser) await browser.close().catch(() => {});
  process.exitCode = 1;
});
