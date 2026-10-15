/* Regression: the final learning path must complete at the reachable page bottom. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8765/';
(async () => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  try {
    const context = await browser.newContext({reducedMotion:'no-preference'});
    await context.addInitScript(() => {
      sessionStorage.setItem('bernie-portfolio-arrival-v2','complete');
      localStorage.setItem('bernie-portfolio-motion','playing');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const widths = [
      {width:1689,height:900}, {width:1920,height:1080},
      {width:1440,height:600}, {width:768,height:1024},
      {width:390,height:844}, {width:320,height:568}, {width:844,height:390}
    ];
    const settledScroll = async destination => {
      await page.evaluate(destination => {
        document.documentElement.style.scrollBehavior = 'auto';
        scrollTo(0,destination === 'bottom' ? document.scrollingElement.scrollHeight : destination);
      },destination);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    let cases = 0;
    for (const viewport of widths) {
      await page.setViewportSize(viewport);
      await page.goto(new URL('education.html?lang=zh-HK',base).href);
      await page.locator('.edu-motion-ready').waitFor();
      for (const language of ['zh-HK','en','zh-CN']) {
        await page.locator(`[data-language="${language}"]`).click();
        for (const theme of ['dark','light']) {
          if (await page.locator('body').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
          for (const open of [false,true]) {
            await page.locator('.edu-course-ledger details').evaluateAll((details,open) => details.forEach(detail => {detail.open=open;}),open);
            await settledScroll('bottom');
            const path = await page.locator('.edu-learning-sequence').evaluate(sequence => ({
              bottom:document.scrollingElement.scrollHeight-innerHeight-scrollY,
              active:sequence.querySelectorAll('.is-edu-active').length,
              segments:[...sequence.children].slice(0,-1).map(node => Number(node.style.getPropertyValue('--edu-segment'))),
              still:document.body.classList.contains('edu-motion-still'),
              overflow:document.documentElement.scrollWidth>innerWidth+1
            }));
            const label = `${viewport.width}x${viewport.height}/${language}/${theme}/courses=${open}`;
            assert(path.bottom <= 1,label+' reaches bottom');
            assert.equal(path.still,false,label+' motion is enabled');
            assert.equal(path.active,4,label+' all nodes active');
            assert.deepEqual(path.segments,[1,1,1],label+' whole path filled');
            assert.equal(path.overflow,false,label+' no overflow');
            cases++;
          }
        }
      }
      const entry = await page.locator('.edu-learning-sequence').evaluate(element => Math.max(0,element.getBoundingClientRect().top+scrollY-innerHeight*.9));
      await settledScroll(entry);
      assert(await page.locator('.edu-learning-sequence > li').first().evaluate(node => Number(node.style.getPropertyValue('--edu-segment'))<1),'scrolling back restores partial progress');
      await settledScroll('bottom');
      assert.equal(await page.locator('.edu-learning-sequence .is-edu-active').count(),4);
    }
    assert.deepEqual(errors,[],'browser errors');
    console.log(`PASS: ${cases} bottom-of-page cases, all four nodes and three connectors complete; reverse scrolling, languages, themes and course states.`);
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exit(1);});
