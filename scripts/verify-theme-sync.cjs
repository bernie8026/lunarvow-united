/* Shared page styling and live theme updates must survive tabs, reloads and paused canvas scenes. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8766/';
const pages = ['index','about','experience','education','skills','projects','contact','sitemap'];
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
(async () => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  const errors = [];
  let cases = 0;
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    await context.addInitScript(() => sessionStorage.setItem('bernie-portfolio-arrival-v2','complete'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {if(response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);});
    for (const name of pages) {
      await page.goto(new URL(`${name}.html?lang=zh-HK`,base).href);
      for (const width of [320,390,1000,1001,1440]) {
        await page.setViewportSize({width,height:900});
        for (const theme of ['dark','light']) {
          if (await page.locator('body').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
          await frames(page);
          const state = await page.evaluate(() => {
            const body = document.body, rail = document.querySelector('.masthead'), rect = rail.getBoundingClientRect();
            const bg = getComputedStyle(body).backgroundColor;
            return {bg, ink:getComputedStyle(body).color, accent:getComputedStyle(body).getPropertyValue('--signal').trim(),
              nav:getComputedStyle(rail).backgroundColor, width:rect.width, headerOffset:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-height')),
              overflow:document.documentElement.scrollWidth>innerWidth+1, pressed:document.querySelector('.theme-toggle').getAttribute('aria-pressed'),
              themeColor:document.querySelector('meta[name="theme-color"]').content,
              footer:getComputedStyle(document.querySelector('.footer')).backgroundColor};
          });
          const label = `${name}/${width}/${theme}`;
          assert.equal(state.bg,theme==='dark'?'rgb(7, 13, 24)':'rgb(242, 248, 252)',label+' body palette');
          assert.equal(state.ink,theme==='dark'?'rgb(237, 247, 255)':'rgb(16, 34, 56)',label+' text palette');
          assert.equal(state.accent,'#00d5ff',label+' shared signal');
          assert.equal(state.nav,'rgb(247, 251, 255)',label+' shared navigation');
          assert.equal(state.footer,'rgb(242, 248, 252)',label+' shared footer');
          assert.equal(state.pressed,String(theme==='light'),label+' toggle state');
          assert.equal(state.themeColor,theme==='light'?'#f2f8fc':'#070d18',label+' browser theme');
          assert.equal(state.overflow,false,label+' no overflow');
          if(width>1000) {assert.equal(state.width,68,label+' side rail');assert.equal(state.headerOffset,0,label+' rail is not top inset');}
          else {
            assert(state.headerOffset>=60 && state.headerOffset<120,label+' compact header offset');
            await page.locator('.menu-toggle').click();
            assert(await page.locator('#main-nav').isVisible(),label+' mobile menu opens');
            await page.keyboard.press('Escape');
            assert(!await page.locator('#main-nav').isVisible(),label+' mobile menu closes');
          }
          cases++;
        }
      }
    }
    await page.setViewportSize({width:1440,height:900});
    await page.goto(new URL('about.html',base).href);
    const other = await context.newPage();
    await other.goto(new URL('skills.html',base).href);
    const colorStats = () => {
      const canvas = document.querySelector('[data-lore-canvas]'), ctx=canvas.getContext('2d');
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let sum=0,count=0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]>30) {sum+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;count++;}
      return {mean:sum/count,count,scene:canvas.dataset.theme,mode:canvas.dataset.colorMode,orbitMode:document.querySelector('[data-lore-orbit]').dataset.colorMode};
    };
    for (const theme of ['dark','light']) {
      if (await page.locator('body').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
      await other.waitForFunction(theme=>document.body.dataset.theme===theme,theme);
      await frames(other);
      const stats = await other.evaluate(colorStats);
      assert(stats.count>2000,theme+' paused scene has visible points');
      assert(stats.mean > (theme==='dark'?150:0) && stats.mean < (theme==='dark'?256:90),theme+' canvas repaints contrasting points');
      assert.equal(stats.mode,theme);assert.equal(stats.orbitMode,theme);assert.equal(stats.scene,'responsive-web');
    }
    await other.reload();
    assert.equal(await other.locator('body').getAttribute('data-theme'),'light','reload keeps theme');
    await page.goto(new URL('education.html',base).href);
    assert.equal(await page.locator('body').getAttribute('data-theme'),'light','page navigation keeps theme');
    // Test the explicit pause control separately from the OS reduced-motion setting.
    await other.emulateMedia({reducedMotion:'no-preference'});
    await other.locator('.ambient-toggle').click();
    assert(await other.locator('body').evaluate(el=>el.classList.contains('motion-paused')));
    await page.locator('.theme-toggle').click();
    await other.waitForFunction(()=>document.body.dataset.theme==='dark');
    assert((await other.evaluate(colorStats)).mean>150,'user-paused canvas repaints on storage update');
    const pausedPixels=await other.locator('[data-lore-canvas]').evaluate(el=>el.toDataURL());
    await other.waitForTimeout(150);
    assert.equal(await other.locator('[data-lore-canvas]').evaluate(el=>el.toDataURL()),pausedPixels,'theme repaint preserves paused state');
    await page.locator('.theme-toggle').click();
    await other.waitForFunction(()=>document.body.dataset.theme==='light');
    await page.evaluate(()=>localStorage.removeItem('bernie-portfolio-theme'));
    await other.waitForFunction(()=>document.body.dataset.theme==='dark');
    assert.equal(await other.locator('.theme-toggle').getAttribute('aria-pressed'),'false','theme reset syncs control');
    assert.deepEqual(errors,[],'browser errors');
    console.log(`PASS: ${cases} shared palette/responsive cases; cross-tab updates, navigation/reload persistence, reduced-motion and user-paused canvas repaint.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
