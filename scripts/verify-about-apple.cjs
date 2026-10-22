/* Verify the protected personal page without logging its access password. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const base = new URL(process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8766/lunarvow-united/');
const password = fs.readFileSync(path.resolve(root, process.env.PORTFOLIO_PASSWORD_FILE || '../lunarvow-private/access-password.txt'), 'utf8').trim();
const output = path.join(root, '.private', 'about-qa');
const pages = new Set(['index', 'about', 'experience', 'education', 'skills', 'projects', 'contact', 'sitemap']);
const errors = [], results = [];
let browser;
const route = (name = 'about', language = 'zh-HK') => new URL(`${name}.html?lang=${language}`, base).href;
const redact = error => String(error?.stack || error).split(password).join('[REDACTED]');
async function test(label, operation) { await operation(); results.push(label); console.log('PASS ' + label); }
async function ready(page, name = 'about') {
  await page.waitForFunction(name => document.body?.dataset.page === name && !!document.querySelector('main#main') &&
    !document.querySelector('.boot-screen') && !document.body.classList.contains('is-booting') &&
    !document.querySelector('main#main').inert && document.documentElement.dataset.navigationState === 'idle', name, {timeout:30000});
}
async function unlock(page, language = 'zh-HK') {
  await page.goto(route('about', language), {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => {
    const input = document.querySelector('input[type="password"]');
    return input && !input.disabled && !document.querySelector('body[data-page] main#main');
  }, null, {timeout:15000});
  await page.locator('input[type="password"]').evaluate((node, value) => {
    node.value = value; node.dispatchEvent(new Event('input', {bubbles:true}));
  }, password);
  await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
  await ready(page);
}
async function contextFor(options = {}, theme = 'dark') {
  const context = await browser.newContext({viewport:{width:1440,height:960}, ...options});
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      // The browser's unscoped favicon request belongs to the preview origin.
      if (message.type() === 'error' && message.location().url !== new URL('/favicon.ico', base).href) errors.push(message.text());
    });
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText || 'request failed';
      if (request.url().startsWith(base.href) && !/ERR_ABORTED/.test(failure)) errors.push(failure + ': ' + request.url());
    });
  });
  await context.addInitScript(theme => {
    try { if (!localStorage.getItem('bernie-portfolio-theme')) localStorage.setItem('bernie-portfolio-theme', theme); } catch {}
  }, theme);
  return context;
}
async function frames(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function assertFit(page) {
  const dimensions = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth}));
  assert(dimensions.scroll <= dimensions.width + 2, 'personal page fits the viewport horizontally');
  for (const selector of ['.about-apple-hero h1', '.about-apple-story h2', '.about-apple-approach h2', '.about-apple-next']) {
    const targets = page.locator(selector);
    assert(await targets.count(), 'section content is present: ' + selector);
    for (const target of await targets.all()) {
      const box = await target.boundingBox();
      assert(box && box.width > 0 && box.height > 0, 'section content has a rendered box');
      assert(box.x >= -2 && box.x + box.width <= dimensions.width + 2, 'section content remains inside the viewport: ' + selector);
    }
  }
}
async function assertControls(page) {
  assert.equal(await page.locator('main#main').count(), 1, 'one main landmark is mounted');
  for (const selector of ['.motion-replay', '.ambient-toggle', '.site-lock']) {
    assert.equal(await page.locator('.footer-links ' + selector).count(), 1, 'footer control mounts once: ' + selector);
  }
}
async function assertHeaderTools(page) {
  const controls = await page.locator('.header-tools [data-language], .header-tools .theme-toggle').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return {label:node.getAttribute('aria-label') || node.textContent.trim(),left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};
  }));
  assert.equal(controls.length,4,'header retains three languages and a theme control');
  const viewport = await page.evaluate(() => innerWidth);
  for (const control of controls) {
    assert(control.width > 0 && control.height > 0,'header control is rendered');
    assert(control.left >= -1 && control.right <= viewport + 1,'header control stays within the viewport');
  }
  for (let left=0;left<controls.length;left++) for (let right=left+1;right<controls.length;right++) {
    const a=controls[left],b=controls[right];
    const intersectionWidth=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const intersectionHeight=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    assert(intersectionWidth <= 1 || intersectionHeight <= 1,'language and theme controls do not overlap: '+a.label+' / '+b.label);
  }
}
async function assertLinks(page, language) {
  const links = await page.locator('main.about-apple-page a[data-internal]').evaluateAll(nodes => nodes.map(link => ({href:link.href,label:link.textContent.trim()})));
  const destinations = new Set();
  for (const link of links) {
    const url = new URL(link.href);
    assert.equal(url.origin, base.origin, 'personal CTA stays on the site');
    assert(url.pathname.startsWith(base.pathname), 'personal CTA stays within the publication');
    const name = url.pathname.slice(base.pathname.length).replace(/\.html$/, '') || 'index';
    assert(pages.has(name), 'personal CTA points to an existing page');
    assert.equal(url.searchParams.get('lang'), language, 'personal CTA keeps the selected language');
    assert(link.label, 'personal CTA has a visible label');
    destinations.add(name);
  }
  for (const name of ['contact', 'experience']) assert(destinations.has(name), 'personal page retains the ' + name + ' CTA');
}
async function assertContent(page, language = 'zh-HK') {
  assert.equal(await page.locator('main.about-apple-page').count(), 1);
  assert.equal(await page.locator('main h1').count(), 1, 'personal page has one headline');
  for (const selector of ['.about-apple-hero', '.about-apple-story', '.about-apple-portrait', '.about-apple-facts', '.about-apple-approach', '.about-apple-next']) {
    assert.equal(await page.locator('main ' + selector).count(), 1, 'personal section exists once: ' + selector);
  }
  const imagery = await page.locator('.about-apple-portrait img').evaluateAll(nodes => nodes.map(image => ({ready:image.complete && image.naturalWidth > 0, alt:image.alt})));
  assert(imagery.length > 0 && imagery.every(image => image.ready && image.alt.trim()), 'identity artwork has decoded with an informative alternative');
  const facts = page.locator('dl.about-apple-facts > div');
  assert.equal(await facts.count(), 4, 'all four profile facts remain');
  for (const fact of await facts.all()) {
    assert((await fact.locator('dt').innerText()).trim(), 'profile fact has a label');
    assert((await fact.locator('dd').innerText()).trim(), 'profile fact has a value');
  }
  const principles = page.locator('.about-apple-approach .principles article');
  assert.equal(await principles.count(), 3, 'all three work principles remain');
  for (const principle of await principles.all()) {
    assert((await principle.locator('h3').innerText()).trim(), 'principle has a heading');
    assert((await principle.locator('p').innerText()).trim(), 'principle has its explanation');
  }
  assert.equal(await page.locator('main [data-print]').count(), 1, 'personal profile can still be printed');
  assert.equal(await page.evaluate(() => document.documentElement.lang), language);
  await assertFit(page); await assertControls(page); await assertHeaderTools(page); await assertLinks(page, language);
}
async function visibleContent(page) {
  for (const selector of ['.about-apple-hero h1', '.about-apple-story h2', '.about-apple-portrait img', 'dl.about-apple-facts', '.about-apple-approach h2', '.principles article', '.about-apple-next']) {
    for (const target of await page.locator(selector).all()) {
      await target.scrollIntoViewIfNeeded(); await frames(page);
      assert(await target.evaluate(element => {
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return false;
        for (let node = element; node instanceof Element; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
        return true;
      }), 'motion preference leaves personal content visible: ' + selector);
    }
  }
}
async function languageTo(page, language) {
  await page.locator(`[data-language="${language}"]`).click();
  await page.waitForFunction(language => document.documentElement.lang === language, language);
  assert.equal(await page.locator(`[data-language="${language}"]`).getAttribute('aria-pressed'), 'true');
}
async function capture(page, name) {
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'})); await frames(page);
  await page.screenshot({path:path.join(output,name),fullPage:true,animations:'disabled'});
}
async function mobileMenu(page) {
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
  const toggle = page.locator('.menu-toggle');
  await toggle.waitFor({state:'visible'});
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true');
  await page.locator('.main-nav a[href*="experience.html"]').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'false');
  assert.equal(await page.locator('#main-nav').getAttribute('data-open'), 'false');
}
async function main() {
  assert(password.length >= 12, 'local password file is available');
  fs.mkdirSync(output,{recursive:true,mode:0o700});
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  const context = await contextFor(), page = await context.newPage();
  try {
    await test('Personal page unlocks with complete content on desktop dark', async () => {
      await unlock(page); await assertContent(page); await capture(page,'desktop-dark.png');
    });
    await test('Desktop light theme and all three personal-page translations fit', async () => {
      await page.locator('.theme-toggle').click();
      await page.waitForFunction(() => document.body.dataset.theme === 'light');
      await assertContent(page); await capture(page,'desktop-light.png');
      const headings = [];
      for (const language of ['en','zh-CN','zh-HK']) {
        await languageTo(page,language); await assertContent(page,language);
        headings.push((await page.locator('.about-apple-hero h1').innerText()).trim());
      }
      assert(headings.every(Boolean) && new Set(headings).size >= 2, 'headline changes with the selected language');
    });
    await test('Print action invokes the browser print function exactly once', async () => {
      await page.evaluate(() => { window.__aboutQaPrints = 0; window.print = () => { window.__aboutQaPrints++; }; });
      await page.locator('main [data-print]').click();
      assert.equal(await page.evaluate(() => window.__aboutQaPrints), 1);
    });
    await test('Experience and Home round trips remount the personal page without duplication', async () => {
      const token = await page.evaluate(() => window.__aboutQaDocument = Math.random());
      for (let cycle=0;cycle<2;cycle++) {
        await page.locator('main.about-apple-page a[data-internal][href*="experience.html"]').last().click();
        await ready(page,'experience'); await assertControls(page);
        await page.locator('.main-nav a[data-internal][href*="about.html"]').click();
        await ready(page); await assertContent(page);
        assert.equal(await page.evaluate(() => window.__aboutQaDocument),token,'experience round trip retains soft navigation');
        await page.locator('.brand[data-internal]').click(); await ready(page,'index');
        await page.locator('main a[data-internal][href*="about.html"]').first().click();
        await ready(page); await assertContent(page);
        assert.equal(await page.evaluate(() => window.__aboutQaDocument),token,'home round trip retains soft navigation');
      }
      await page.goBack(); await ready(page,'index'); await assertControls(page);
      await page.goForward(); await ready(page); await assertContent(page);
      assert.equal(await page.evaluate(() => window.__aboutQaDocument),token,'history remount retains the live document');
    });
    await test('Tablet 900 and 768 layouts keep the shared expandable navigation available', async () => {
      for (const width of [900,768]) {
        await page.setViewportSize({width,height:1024});
        for (const language of ['zh-HK','en','zh-CN']) {
          await languageTo(page,language); await assertContent(page,language);
          await mobileMenu(page);
        }
        await languageTo(page,'zh-HK'); await capture(page,`tablet-${width}.png`);
      }
    });
    await test('Personal page mobile 390 and 360, three languages and menu remain usable', async () => {
      for (const width of [390,360]) {
        await page.setViewportSize({width,height:844});
        for (const language of ['zh-HK','en','zh-CN']) {
          await languageTo(page,language); await assertContent(page,language); await mobileMenu(page);
        }
        await languageTo(page,'zh-HK'); await capture(page,`mobile-${width}.png`);
      }
      await page.setViewportSize({width:1440,height:960});
    });
    await test('Pausing animation keeps the personal story, facts and principles visible', async () => {
      await page.locator('.ambient-toggle').click();
      await page.waitForFunction(() => document.body.classList.contains('motion-paused'));
      await visibleContent(page); await assertContent(page);
      await page.locator('.ambient-toggle').click();
      await page.waitForFunction(() => !document.body.classList.contains('motion-paused'));
    });
    await test('Reduced motion renders the full personal page and its English content', async () => {
      const reduced = await contextFor({viewport:{width:390,height:844},reducedMotion:'reduce'},'light');
      const tab = await reduced.newPage();
      try { await unlock(tab,'en'); await assertContent(tab,'en'); await visibleContent(tab); await mobileMenu(tab); }
      finally { await reduced.close(); }
    });
    assert.deepEqual([...new Set(errors)],[],'personal page has no browser, console or scoped network errors');
    console.log(JSON.stringify({passed:results.length,screenshots:output,base:base.href}));
  } finally { await context.close(); await browser.close(); }
}
main().catch(async error => {
  console.error(redact(error)); if(browser) await browser.close().catch(()=>{}); process.exitCode=1;
});
