/* Run with Playwright available to Node and a static server serving public/. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8765/';
const pages = ['index','about','experience','education','skills','projects','contact','sitemap'];
(async () => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(() => sessionStorage.setItem('bernie-portfolio-arrival-v2','complete'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {if(response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);});
  async function visit(url) {
    const response=await page.goto(url);
    await page.locator('.boot-screen').waitFor({state:'detached'});
    return response;
  }
  for (const name of pages) {
    const response = await visit(new URL(`${name}.html?lang=zh-HK`,base).href);
    assert.equal(response.status(),200,name);
    await page.locator('main h1').waitFor();
    assert.equal(await page.locator('main h1').count(),1);
    for (const lang of ['en','zh-CN','zh-HK']) {
      await page.locator(`[data-language="${lang}"]`).click();
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
    }
    await page.locator('.theme-toggle').click();
    assert.equal(await page.locator('body').getAttribute('data-theme'),'light');
    if (name === 'index') assert.equal(await page.locator('.hero .button-primary').evaluate(el=>getComputedStyle(el).color),'rgb(7, 23, 36)','hero action text stays dark on its cyan background');
    await page.locator('.theme-toggle').click();
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),`${name} overflow at ${width}`);
    }
    const missing = await page.evaluate(async () => {
      const paths = [...new Set([...document.querySelectorAll('a[href],link[href],script[src],img[src]')].map(el=>el.getAttribute('href') || el.getAttribute('src')).filter(x=>x && !x.startsWith('#')).map(x=>new URL(x,location.href)).filter(url=>url.origin===location.origin).map(url=>url.href))];
      const results = await Promise.all(paths.map(async url => ({url,status:(await fetch(url)).status})));
      return results.filter(x=>x.status>=400);
    });
    assert.deepEqual(missing,[],`${name} missing resources`);
  }
  await visit(new URL('index.html?lang=zh-HK',base).href);
  await page.locator('.ambient-toggle').click();
  assert(await page.locator('body').evaluate(el=>el.classList.contains('motion-paused')));
  await page.reload();
  await page.locator('.boot-screen').waitFor({state:'detached'});
  assert.equal(await page.locator('.ambient-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('.ambient-toggle').click();
  await page.locator('.chapter-rail a[href="#selected-work"]').click();
  await page.waitForFunction(()=>document.querySelector('.chapter-rail a[href="#selected-work"]').getAttribute('aria-current') === 'true');
  await visit(new URL('projects.html?lang=zh-HK',base).href);
  await page.locator('[data-filter="stem"]').click();
  assert.equal(await page.locator('[data-filter-item]:visible').count(),1);
  await page.locator('[data-filter="all"]').click();
  await page.locator('[data-search]').fill('Nikon');
  assert.equal(await page.locator('[data-filter-item]:visible').count(),1);
  await page.locator('[data-search]').fill('no-such-project');
  assert(await page.locator('[data-empty]').isVisible());
  await page.locator('[data-reset]').click();
  await page.locator('[data-dialog="dialog-lunar"]').click();
  assert(await page.locator('#dialog-lunar').isVisible());
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#dialog-lunar').isVisible()));
  await visit(new URL('contact.html?lang=en',base).href);
  await page.locator('[name="name"]').fill('Portfolio check');
  await page.locator('[name="email"]').fill('test@example.com');
  await page.locator('[name="message"]').fill('Checking that the existing local draft still works.');
  await page.locator('[data-form-ready]').click();
  assert((await page.locator('#message-preview').textContent()).includes('Checking that'));
  const intro = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const arrival = await intro.newPage();
  arrival.on('pageerror', error => errors.push(`intro: ${error.message}`));
  await arrival.goto(base,{waitUntil:'domcontentloaded'});
  await arrival.locator('.boot-screen').waitFor().catch(async error => {
    console.error('Intro diagnostics:', await arrival.evaluate(()=>({url:location.href,session:sessionStorage.getItem('bernie-portfolio-arrival-v2'),body:document.body.className,screens:document.querySelectorAll('.boot-screen').length})),errors);
    throw error;
  });
  assert.equal(await arrival.locator('.boot-screen').getAttribute('data-hold-ms'),'2000');
  await arrival.locator('.boot-screen__skip-animation').click();
  await arrival.locator('.boot-screen').waitFor({state:'detached'});
  assert.equal(await arrival.locator('main').evaluate(el=>el.inert),false);
  await arrival.locator('.ambient-toggle').click();
  await arrival.locator('.motion-replay').click();
  await arrival.locator('.boot-screen').waitFor({state:'detached'});
  assert.equal(await arrival.locator('main').evaluate(el=>el.inert),false,'paused intro returns to readable content');
  await arrival.locator('.ambient-toggle').click();
  await arrival.locator('.motion-replay').click();
  await arrival.locator('.boot-screen').waitFor();
  await arrival.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.boot-screen__title')).opacity) > .9);
  assert(await arrival.locator('.boot-screen__title').isVisible(),'replay runs after resuming animations');
  await arrival.keyboard.press('Escape');
  await arrival.locator('.boot-screen').waitFor({state:'detached'});
  await arrival.locator('.menu-toggle').click();
  assert.equal(await arrival.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
  await arrival.keyboard.press('Escape');
  assert.equal(await arrival.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[],'browser/resource errors');
  await browser.close();
  console.log('PASS: 8 pages, 3 languages, 4 widths, themes, local links/assets, chapter navigation, motion preference, search/filter, dialog, contact draft, intro skip/replay, mobile menu.');
})().catch(error=>{console.error(error);process.exit(1);});
