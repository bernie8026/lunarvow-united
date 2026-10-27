'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,'../lunarvow-private/access-password.txt'),'utf8').trim();
const output=path.join(root,'.private/featured-navigation-qa'),errors=[];
let browser,passed=0;
async function ready(page,name){await page.waitForFunction(name=>document.body.dataset.page===name&&!document.body.classList.contains('is-booting')&&!document.querySelector('.boot-screen')&&document.documentElement.dataset.navigationState==='idle',name,{timeout:45000});}
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
async function fit(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');}
async function slide(page,index){await page.locator(`[data-slide-to="${index}"]`).click();assert.equal(await page.locator('[data-carousel]').getAttribute('data-active-slide'),String(index));assert.equal(await page.locator('.hero-slide.is-active').count(),1);assert.equal(await page.locator('.hero-pagination [aria-pressed="true"]').count(),1);await page.waitForTimeout(900);}
(async()=>{
 fs.mkdirSync(output,{recursive:true,mode:0o700});browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960},hasTouch:true});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL('index.html?lang=zh-HK',base).href,{waitUntil:'domcontentloaded'});
  await page.locator('input[type=password]').evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));},password);
  await page.locator('form button[type=submit]').click();await ready(page,'index');
  await test('Three decoded full-image stories link to the right project sections',async()=>{
   assert.equal(await page.locator('main h1').count(),1);assert.equal(await page.locator('[data-slide]').count(),3);
   assert(await page.locator('[data-slide] img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth)));
   for(const [i,target] of ['photography.html','projects.html#lunar','stem.html'].entries()){
    await slide(page,i);const href=new URL(await page.locator('.hero-project-link').getAttribute('href'));assert.equal(href.pathname.split('/').pop()+href.hash,target);
    await fit(page);await page.screenshot({path:path.join(output,'desktop-'+i+'.png'),clip:{x:68,y:0,width:1372,height:960}});
   }
   await page.locator('[data-carousel-next]').click();assert.equal(await page.locator('[data-carousel]').getAttribute('data-active-slide'),'0');
   await page.locator('[data-carousel-previous]').click();assert.equal(await page.locator('[data-carousel]').getAttribute('data-active-slide'),'2');
   assert((await page.locator('[data-carousel-status]').textContent()).includes('3'));
  });
  await test('Autoplay starts after entry and pauses for hover, focus and explicit pause',async()=>{
   await page.locator('[data-carousel-pause]').click();assert.equal(await page.locator('[data-carousel-pause]').getAttribute('aria-pressed'),'true');
   assert(!await page.locator('[data-carousel]').evaluate(n=>n.classList.contains('is-rotating')));
   await page.locator('[data-carousel-pause]').click();await page.evaluate(()=>document.activeElement.blur());await page.mouse.move(10,400);
   await page.waitForFunction(()=>document.querySelector('[data-carousel]').classList.contains('is-rotating'));
   const start=await page.locator('[data-carousel]').getAttribute('data-active-slide');await page.waitForFunction(start=>document.querySelector('[data-carousel]').dataset.activeSlide!==start,start,{timeout:10000});
   await page.locator('[data-hero-title]').hover();assert(!await page.locator('[data-carousel]').evaluate(n=>n.classList.contains('is-rotating')));
   const hovered=await page.locator('[data-carousel]').getAttribute('data-active-slide');await page.waitForTimeout(7800);assert.equal(await page.locator('[data-carousel]').getAttribute('data-active-slide'),hovered);
   await page.locator('[data-slide-to="0"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-carousel]').getAttribute('data-active-slide'),'1');
   assert.equal(await page.locator('[data-slide-to="1"]').evaluate(n=>n===document.activeElement),true);
  });
  await test('Seven languages update headlines and controls',async()=>{
   for(const lang of ['zh-HK','en','zh-CN','ja','ko','th','ru']){
    await page.locator(`[data-language="${lang}"]`).click();
    await slide(page,1);
    const valid=await page.evaluate(()=>{
     const lang=document.documentElement.lang,t=window.PORTFOLIO_FEATURE_COPY[lang],h=document.querySelector('[data-hero-title]');
     return h.textContent===window.PORTFOLIO_TEXT[h.dataset.i18n][lang]&&document.querySelector('[data-carousel-next]').getAttribute('aria-label')===t.heroNext;
    });assert(valid,'localized hero in '+lang);
    await fit(page);
   }
   await page.locator('[data-language="zh-HK"]').click();
  });
  await test('Mobile stories, all story languages and touch swipe stay within 360/390px',async()=>{
   for(const width of [390,360]){
    await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));
    for(const lang of ['zh-HK','en','ja','ko','th','ru']){
     await page.locator(`[data-language="${lang}"]`).click();
     for(let i=0;i<3;i++){
      await slide(page,i);await fit(page);
      const title=await page.locator('.home-hero-title').boundingBox();assert(title.x>=0&&title.x+title.width<=width+1);
     }
    }
    await page.locator('[data-language="zh-HK"]').click();await slide(page,0);await page.evaluate(()=>document.activeElement.blur());await page.mouse.move(width-2,130);
    await page.screenshot({path:path.join(output,'mobile-'+width+'.png'),fullPage:false});
    const cdp=await context.newCDPSession(page),hero=await page.locator('[data-carousel]').boundingBox();
    const y=Math.max(hero.y+80,210),a={x:width-35,y,id:1},b={x:30,y,id:1};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-carousel]').getAttribute('data-active-slide'),'1');await cdp.detach();
   }
  });
  await test('Reduced motion and global pause stop automatic slides while controls still work',async()=>{
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.activeElement.blur());await page.mouse.move(1,1);
   assert(!await page.locator('[data-carousel]').evaluate(n=>n.classList.contains('is-rotating')));
   await slide(page,2);assert.equal(await page.locator('.hero-slide').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.ambient-toggle').click();assert(await page.locator('body').evaluate(n=>n.classList.contains('motion-paused')));
   assert(!await page.locator('[data-carousel]').evaluate(n=>n.classList.contains('is-rotating')));await slide(page,0);await page.locator('.ambient-toggle').click();
  });
  assert.deepEqual([...new Set(errors)],[]);console.log(JSON.stringify({passed,output}));
 }finally{await context.close();await browser.close();}
})().catch(async error=>{console.error(String(error.stack||error).split(password).join('[REDACTED]'));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
