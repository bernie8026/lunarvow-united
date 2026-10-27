'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,'../lunarvow-private/access-password.txt'),'utf8').trim();
const names=['photography','equipment','stem'],output=path.join(root,'.private/expansion-qa');let browser,passed=0;const errors=[];
async function ready(page,name){await page.waitForFunction(name=>document.body.dataset.page===name&&!document.body.classList.contains('is-booting')&&!document.querySelector('.boot-screen')&&document.documentElement.dataset.navigationState==='idle',name,{timeout:90000});}
async function route(page,name){await page.locator(`.main-nav > a[href*="${name}.html"]`).click();await ready(page,name);}
async function test(label,fn){await fn();passed++;console.log('PASS '+label);}
async function fit(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');}
(async()=>{
 fs.mkdirSync(output,{recursive:true,mode:0o700});browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  await test('Direct links to every new topic require the existing password',async()=>{
   for(const name of names){await page.goto(new URL(name+'.html?lang=zh-HK',base).href,{waitUntil:'domcontentloaded'});assert.equal(await page.locator('input[type=password]').count(),1);assert.equal(await page.locator('main[data-page],body[data-page]').count(),0);}
  });
  await page.locator('input[type=password]').fill(password);await page.locator('form button[type=submit]').click();await ready(page,'stem');
  await test('Three dedicated pages load through the router and retain all existing project anchors',async()=>{
   const navigations=await page.evaluate(()=>performance.getEntriesByType('navigation').length);
   for(const name of names){await route(page,name);assert.equal(await page.locator('main h1').count(),1);assert.equal(await page.locator('.main-nav > a').count(),8);assert.equal(await page.locator('.main-nav > a[aria-current=page]').count(),1);assert.equal(await page.locator('.project-nav-toggle,.project-subnav').count(),0);await fit(page);}
   assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation').length),navigations,'topic changes retain the document');
   await route(page,'projects');for(const id of ['lunar','aerovate','photography','camera-specs','flash','drone-reference'])assert.equal(await page.locator('#'+id).count(),1);
   await route(page,'equipment');assert.equal(await page.locator('.gear-spec-grid > div').count(),14);assert(await page.locator('main img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)));
  });
  await test('Homepage stories open the dedicated photography and STEM topics',async()=>{
   for(const [index,name,hash] of [[0,'photography',''],[1,'projects','#lunar'],[2,'stem','']]){
    await page.locator('.brand').click();await ready(page,'index');await page.locator(`[data-slide-to="${index}"]`).click();
    await page.locator('.hero-project-link').click();await ready(page,name);assert.equal(new URL(page.url()).hash,hash);
   }
  });
  await test('Topic layouts, images and eight navigation entries fit desktop, tablet and phone',async()=>{
   for(const name of names){
    await route(page,name);
    for(const [width,height] of [[1440,960],[1440,600],[1440,480],[820,1000],[390,844],[360,844]]){
     await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await fit(page);
     if(width>1000){
      const boxes=await page.locator('.main-nav > a,.header-tools').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
      assert(boxes.every(r=>r.top>=0&&r.bottom<=height+1),'rail controls fit the viewport');
      assert(boxes.at(-2).bottom<=boxes.at(-1).top+1,'last topic does not overlap language controls');
     }
     if(width===390||height===960){await page.waitForTimeout(850);await page.screenshot({path:path.join(output,name+'-'+width+'.png'),fullPage:false});}
    }
    await page.setViewportSize({width:1440,height:960});await page.locator('.theme-toggle').click();await page.screenshot({path:path.join(output,name+'-other-theme.png'),fullPage:false});await page.locator('.theme-toggle').click();
   }
  });
  await test('The STEM study selector supports mouse, keyboard, language changes and return visits',async()=>{
   await route(page,'stem');
   for(let i=0;i<4;i++){await page.locator(`[data-stem-stage="${i}"]`).click();assert.equal(await page.locator('[data-stem-stage][aria-pressed=true]').count(),1);assert.equal(await page.locator('[data-stem-scene]').getAttribute('data-stage'),String(i));}
   await page.keyboard.press('Home');assert.equal(await page.locator('[data-stem-scene]').getAttribute('data-stage'),'0');
   await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-stem-scene]').getAttribute('data-stage'),'1');
   await page.locator('[data-language=ru]').click();assert((await page.locator('[data-stem-focus-copy]').textContent()).trim());
   await route(page,'photography');await route(page,'stem');assert.equal(await page.locator('[data-stem-stage][aria-pressed=true]').count(),1);
   await page.locator('[data-language="zh-HK"]').click();
  });
  await test('Topic motion respects pause and reduced motion',async()=>{
   await route(page,'equipment');await page.locator('.ambient-toggle').click();
   assert.equal(await page.locator('.room-plate').evaluate(n=>getComputedStyle(n,'::before').animationPlayState),'paused');
   await page.locator('.ambient-toggle').click();await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('.room-plate').evaluate(n=>getComputedStyle(n,'::before').animationName),'none');
   await route(page,'stem');await page.locator('[data-stem-stage="2"]').click();assert.equal(await page.locator('[data-stem-scene]').getAttribute('data-stage'),'2');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.ambient-toggle').click();
   assert.equal(await page.locator('[data-stem-scene]').getAttribute('data-paused'),'true');
   await route(page,'photography');await route(page,'stem');assert(await page.locator('body').evaluate(n=>n.classList.contains('motion-paused')),'saved pause applies when returning to STEM');
  });
  assert.deepEqual([...new Set(errors)],[]);console.log(JSON.stringify({passed,output}));
 }finally{await context.close();await browser.close();}
})().catch(async error=>{console.error(String(error.stack||error).split(password).join('[REDACTED]'));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
