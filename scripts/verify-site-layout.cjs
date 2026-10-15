/* Regression coverage for completed scroll paths and responsive controls. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8765/';
const pages = ['index','about','experience','education','skills','projects','contact','sitemap'];
const viewports = [
  {width:320,height:568}, {width:390,height:844}, {width:600,height:900},
  {width:768,height:1024}, {width:1001,height:720}, {width:1440,height:900},
  {width:844,height:390}
];
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function scroll(page, destination) {
  await page.evaluate(destination => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0,destination === 'bottom' ? document.scrollingElement.scrollHeight : destination);
  },destination);
  await frames(page);
}
(async () => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  const errors = [];
  let cases = 0;
  try {
    const context = await browser.newContext({reducedMotion:'no-preference'});
    await context.addInitScript(() => {
      sessionStorage.setItem('bernie-portfolio-arrival-v2','complete');
      localStorage.setItem('bernie-portfolio-motion','playing');
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const name of pages) {
        await page.goto(new URL(`${name}.html?lang=zh-HK`,base).href);
        await page.locator('.reading-progress').waitFor({state:'attached'});
        await page.evaluate(() => document.fonts.ready);
        for (const language of ['zh-HK','en','zh-CN']) {
          await page.locator(`[data-language="${language}"]`).click();
          for (const theme of ['dark','light']) {
            if (await page.locator('body').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
            await scroll(page,'bottom');
            const state = await page.evaluate(() => {
              const scroller = document.scrollingElement;
              const header = document.querySelector('.masthead').getBoundingClientRect();
              const controls = [...document.querySelectorAll('.header-tools,.menu-toggle,.main-nav,.footer-links > *,.back-top')].filter(el => el.getClientRects().length);
              return {
                bottom:scroller.scrollHeight-innerHeight-scrollY,
                read:Number(document.querySelector('.reading-progress').style.getPropertyValue('--read')),
                overflow:scroller.scrollWidth>innerWidth+1,
                clippedControls:controls.filter(el => {const r=el.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1;}).map(el=>el.className),
                headerHeight:Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-height')),
                actualHeader:header.height,
                journeys:[...document.querySelectorAll('.experience-entry')].map(el=>el.style.getPropertyValue('--journey')),
                chapter:document.querySelector('.chapter-rail [aria-current]')?.getAttribute('href')
              };
            });
            const label = `${name}/${viewport.width}x${viewport.height}/${language}/${theme}`;
            assert(state.bottom<=1,label+' reaches page bottom');
            assert.equal(state.read,1,label+' reading bar completes');
            assert.equal(state.overflow,false,label+' no page overflow');
            assert.deepEqual(state.clippedControls,[],label+' controls remain visible');
            assert(Math.abs(state.headerHeight-state.actualHeader)<1,label+' header offset is measured');
            if (name==='experience') assert(state.journeys.length && state.journeys.every(value=>value==='100%'),label+' every journey segment completes');
            if (name==='index') assert.equal(state.chapter,'#chapters',label+' final chapter is current');
            cases++;
          }
        }
        await scroll(page,0);
        assert.equal(await page.locator('.reading-progress').evaluate(el=>Number(el.style.getPropertyValue('--read'))),0,name+' reading line reverses at top');
        if (name==='experience') {
          assert(await page.locator('.experience-entry').evaluateAll(entries=>entries.some(el=>el.style.getPropertyValue('--journey')!=='100%')),'journey reverses when scrolling back');
          await page.locator('.experience-entry details').evaluateAll(details=>details.forEach(el=>{el.open=true;}));
          await scroll(page,'bottom');
          assert(await page.locator('.experience-entry').evaluateAll(entries=>entries.every(el=>el.style.getPropertyValue('--journey')==='100%')),'expanded experience still completes');
        }
        if (name==='education') {
          const top = await page.locator('.edu-course-section').evaluate(el=>el.getBoundingClientRect().top+scrollY+250);
          await scroll(page,top);
          const sticky = await page.locator('.edu-course-section > .section-heading').evaluate(el=>({position:getComputedStyle(el).position,top:el.getBoundingClientRect().top,headerBottom:document.querySelector('.masthead').getBoundingClientRect().bottom}));
          if (sticky.position==='sticky') assert(sticky.top>=sticky.headerBottom,'course heading stays below header');
        }
        if (name==='skills' || name==='projects') {
          await scroll(page,'bottom');
          await page.locator('[data-filter]').last().evaluate(el=>el.click());
          await frames(page);
          const ratio = await page.evaluate(() => {
            const max=document.scrollingElement.scrollHeight-innerHeight;
            return {actual:Number(document.querySelector('.reading-progress').style.getPropertyValue('--read')),expected:max<=1||scrollY>=max-1?1:Math.max(0,scrollY/max)};
          });
          assert(Math.abs(ratio.actual-ratio.expected)<.001,'filter height changes refresh reading progress');
        }
      }
    }
    assert.deepEqual(errors,[],'browser errors');
    console.log(`PASS: ${cases} full-site layout/progress cases, reverse scrolling, expanded experience, sticky heading and filtered content resizing.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
