/* Browser regression checks for complete, decoded arrivals and per-page loading. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8766/';
const pageNames = ['index','about','experience','education','skills','projects','contact','sitemap'];
const campus = '/assets/education/sfu-campus.jpg';
const runtimeImage = '/assets/equipment/drone-reference.png';
const sessionKey = 'bernie-portfolio-arrival-v2';
const url = name => new URL(`${name}.html?lang=zh-HK`,base).href;
const deferred = () => {let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
async function within(promise,label,timeout=15000) {
  let timer;
  try {return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out waiting for '+label)),timeout);})]);}
  finally {clearTimeout(timer);}
}
let cases = 0;
const browserErrors = [];

async function makeContext(browser, options={}) {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:options.reduced?'reduce':'no-preference'});
  await context.addInitScript(({complete,paused,decodePath,key}) => {
    // Initial about:blank and transient navigation documents have no storage origin.
    try {if(complete) sessionStorage.setItem(key,'complete');} catch {}
    try {localStorage.setItem('bernie-portfolio-motion',paused?'paused':'playing');} catch {}
    const probe = window.__arrivalTest={events:[],removed:[],decodeCalls:0,releaseDecode:null};
    let screen=null;
    let state='';
    const sample=()=>{
      const current=document.querySelector('.boot-screen');
      if(screen && current!==screen && !screen.isConnected) {
        probe.removed.push({mode:screen.dataset.mode,phase:screen.dataset.phase,holdMs:Number(screen.dataset.holdMs),at:performance.now(),readyAt:Number(screen.dataset.readyAt)||null});
      }
      screen=current;
      if(!screen) return;
      const next=[screen.dataset.mode,screen.dataset.phase,screen.dataset.readyAt,screen.className].join('/');
      if(next!==state) {
        state=next;
        const event={mode:screen.dataset.mode,phase:screen.dataset.phase,holdMs:Number(screen.dataset.holdMs),readyAt:Number(screen.dataset.readyAt)||null,at:performance.now(),inert:!!document.getElementById('main')?.inert};
        probe.events.push(event);
        window.__observeArrivalTest?.(event);
      }
    };
    new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-mode','data-phase','data-ready-at','data-hold-ms']});
    if(decodePath) {
      const original=HTMLImageElement.prototype.decode;
      const gate=new Promise(resolve=>{probe.releaseDecode=resolve;});
      HTMLImageElement.prototype.decode=async function(...args) {
        const result=await original.apply(this,args);
        if(new URL(this.currentSrc||this.src,location.href).pathname.endsWith(decodePath)) {
          probe.decodeCalls++;
          await gate;
        }
        return result;
      };
    }
  },{complete:!!options.complete,paused:!!options.paused,decodePath:options.decodePath,key:sessionKey});
  context.on('page',page=>page.on('pageerror',error=>browserErrors.push(error.message)));
  return context;
}
async function holdResource(page, suffix) {
  const requested=deferred();
  const release=deferred();
  let count=0;
  await page.route(requestUrl=>requestUrl.pathname.endsWith(suffix),async route=>{
    count++;
    requested.resolve();
    await release.promise;
    await route.continue().catch(()=>{});
  });
  return {requested:requested.promise,release:release.resolve,count:()=>count};
}
async function blocked(page,label,checkHistory=true) {
  const state=await page.evaluate(()=>({
    overlay:!!document.querySelector('.boot-screen'),
    phase:document.querySelector('.boot-screen')?.dataset.phase,
    booting:document.body.classList.contains('is-booting'),
    inert:document.getElementById('main')?.inert,
    removed:window.__arrivalTest.removed.length
  }));
  assert(state.overlay && state.booting && state.inert,label+': content remains protected by the loading screen');
  assert.equal(state.phase,'loading',label+': loading has not reported ready');
  if(checkHistory) assert.equal(state.removed,0,label+': no premature reveal');
}
async function reveal(page,timeout=10000) {
  await page.waitForFunction(()=>!document.querySelector('.boot-screen') &&
    !document.body.classList.contains('is-booting') &&
    !document.documentElement.classList.contains('page-loading-pending') &&
    document.getElementById('main') && !document.getElementById('main').inert,
  null,{timeout});
}
const probe = page => page.evaluate(()=>window.__arrivalTest);
async function completeImages(page,label) {
  const missing=await page.locator('main img').evaluateAll(images=>images.filter(image=>!image.complete || image.naturalWidth===0).map(image=>image.getAttribute('src')));
  assert.deepEqual(missing,[],label+': every authored or runtime page image is available before reveal');
}
async function testIntroReadiness(browser) {
  const context=await makeContext(browser,{decodePath:campus});
  const page=await context.newPage();
  const image=await holdResource(page,campus);
  const requestedDocuments=[];
  page.on('request',request=>{if(request.resourceType()==='document') requestedDocuments.push(new URL(request.url()).pathname);});
  try {
    await page.goto(url('education'),{waitUntil:'domcontentloaded'});
    await within(image.requested,'offscreen campus request');
    await blocked(page,'Offscreen campus response is delayed');
    assert.equal(await page.locator('.boot-screen').getAttribute('data-mode'),'intro');
    image.release();
    await page.waitForFunction(()=>window.__arrivalTest.decodeCalls>0);
    await blocked(page,'Image bytes arrived but decode is delayed');
    const releasedAt=await page.evaluate(()=>{const now=performance.now();window.__arrivalTest.releaseDecode();return now;});
    await page.waitForFunction(()=>window.__arrivalTest.events.some(event=>event.phase==='ready'));
    await reveal(page,5000);
    const result=await probe(page);
    const ready=result.events.find(event=>event.phase==='ready');
    const removed=result.removed.find(event=>event.mode==='intro');
    assert(ready.readyAt>=releasedAt-2,'The two-second countdown starts after image decoding completes');
    assert.equal(ready.holdMs,2000,'Normal first arrival holds for two seconds after readiness');
    assert(removed.at-ready.readyAt>=1950,'Intro does not reveal before the two-second ready hold');
    assert(removed.at-ready.readyAt<3500,'The old ten-second intro has been removed');
    assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),sessionKey),'complete');
    await completeImages(page,'Education intro');
    assert.deepEqual(requestedDocuments,[new URL(url('education')).pathname],'Loading an education page does not fetch other HTML pages');
    cases++;
  } finally {image.release();await context.close();}
}
async function testSkipWaitsForAssets(browser) {
  const context=await makeContext(browser,{decodePath:campus});
  const page=await context.newPage();
  const image=await holdResource(page,campus);
  try {
    await page.goto(url('education'),{waitUntil:'domcontentloaded'});
    await within(image.requested,'campus request before Skip');
    await page.keyboard.press('Escape');
    await page.locator('.boot-screen__skip-animation').evaluate(button=>button.click());
    await blocked(page,'Skip and Escape during a pending network response');
    image.release();
    await page.waitForFunction(()=>window.__arrivalTest.decodeCalls>0);
    await page.keyboard.press('Escape');
    await blocked(page,'Escape during image decoding');
    await page.evaluate(()=>window.__arrivalTest.releaseDecode());
    await reveal(page,3000);
    const result=await probe(page);
    const ready=result.events.find(event=>event.phase==='ready');
    assert(result.removed[0].at-ready.readyAt<1500,'Skip removes the animation hold after assets become ready');
    await completeImages(page,'Skipped intro');
    cases++;
  } finally {image.release();await context.close();}
}
async function testRuntimeImages(browser) {
  const context=await makeContext(browser,{complete:true});
  const page=await context.newPage();
  const image=await holdResource(page,runtimeImage);
  try {
    await page.goto(url('index'),{waitUntil:'domcontentloaded'});
    await within(image.requested,'runtime showcase image request');
    await blocked(page,'A hidden, script-generated showcase slide is delayed');
    assert(await page.locator('[data-project-showcase] img').count()>0,'Showcase imagery is generated by the page before its loading gate completes');
    image.release();
    await reveal(page);
    await completeImages(page,'Runtime showcase');
    const result=await probe(page);
    assert(result.events.some(event=>event.mode==='page'),'Returning visitors see a compact page loader');
    assert(result.events.filter(event=>event.mode==='page').every(event=>event.holdMs===0),'Compact arrivals have no two-second intro hold');
    cases++;
  } finally {image.release();await context.close();}
}
async function testInternalNavigation(browser) {
  const context=await makeContext(browser,{complete:true});
  const page=await context.newPage();
  const departing=deferred();
  await page.exposeFunction('__observeArrivalTest',event=>{if(event.mode==='departure') departing.resolve(event);});
  try {
    await page.goto(url('about'),{waitUntil:'domcontentloaded'});
    await reveal(page);
    const destination=await holdResource(page,'/education.html');
    const image=await holdResource(page,campus);
    // Hold the destination response to observe the departing page independently.
    const click=page.locator('.main-nav a[href*="education.html"]').click({noWaitAfter:true});
    await within(destination.requested,'internal destination response');
    const departure=await within(departing.promise,'outgoing loading screen');
    assert(departure.inert,'The leaving page stops accepting input as soon as internal navigation starts');
    destination.release();
    await click;
    await page.waitForURL('**/education.html*',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body.dataset.page==='education');
    await within(image.requested,'internal destination image request');
    await blocked(page,'The new page waits for its own image',false);
    assert.equal(await page.locator('.boot-screen').getAttribute('data-mode'),'page','Internal links enter through the compact arrival');
    image.release();
    await reveal(page);
    await completeImages(page,'Internal arrival');
    assert(await page.locator('main').evaluate(element=>!element.inert),'The destination is interactive after reveal');
    await page.goBack({waitUntil:'domcontentloaded'});
    await reveal(page);
    assert(new URL(page.url()).pathname.endsWith('/about.html'),'Back navigation restores the previous page without leaving its content inert');
    cases++;
  } finally {await context.close();}
}
async function testEveryPage(browser) {
  const context=await makeContext(browser,{complete:true});
  const page=await context.newPage();
  try {
    for(const name of pageNames) {
      await page.goto(url(name),{waitUntil:'domcontentloaded'});
      await reveal(page);
      const result=await probe(page);
      assert(result.events.some(event=>event.mode==='page'),name+': a loading screen runs on every destination, including a direct visit');
      assert(result.events.some(event=>event.phase==='ready'),name+': assets finish before the screen leaves');
      await completeImages(page,name);
      cases++;
    }
    const count=await page.evaluate(()=>window.__arrivalTest.events.length);
    await page.locator('a[href$="#top"]').click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.boot-screen').count(),0,'Same-page anchors do not start a new loading screen');
    assert.equal(await page.evaluate(()=>window.__arrivalTest.events.length),count,'Anchor navigation leaves arrival history unchanged');
    cases++;
  } finally {await context.close();}
}
async function testMotionPreferences(browser) {
  for(const setting of [{reduced:true},{paused:true}]) {
    const context=await makeContext(browser,{...setting,decodePath:campus});
    const page=await context.newPage();
    const image=await holdResource(page,campus);
    const name=setting.reduced?'Reduced motion':'Paused animation';
    try {
      await page.goto(url('education'),{waitUntil:'domcontentloaded'});
      await within(image.requested,name+' campus request');
      await blocked(page,name+' network readiness');
      image.release();
      await page.waitForFunction(()=>window.__arrivalTest.decodeCalls>0);
      await blocked(page,name+' decode readiness');
      await page.evaluate(()=>window.__arrivalTest.releaseDecode());
      await reveal(page,3000);
      const result=await probe(page);
      const ready=result.events.find(event=>event.phase==='ready')||result.removed.find(event=>event.phase==='ready');
      assert(ready,'Accessibility preferences still finish loading before entering');
      assert.equal(ready.holdMs,0,name+' has no artificial animation hold');
      assert(result.removed[0].at-ready.readyAt<1500,name+' reveals promptly after decoding');
      cases++;
    } finally {image.release();await context.close();}
  }
}
async function testFailureRetry(browser) {
  const context=await makeContext(browser,{complete:true});
  const page=await context.newPage();
  let fail=true;
  let attempts=0;
  await page.route(requestUrl=>requestUrl.pathname.endsWith(campus),async route=>{
    attempts++;
    if(fail) await route.fulfill({status:503,contentType:'text/plain',body:'Intentional loading regression failure'});
    else await route.continue();
  });
  try {
    await page.goto(url('education'),{waitUntil:'domcontentloaded'});
    await page.locator('.boot-screen[data-phase="failed"]').waitFor({timeout:20000});
    assert(await page.locator('main').evaluate(element=>element.inert),'A failed image keeps the page protected until the user chooses an action');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.boot-screen').count(),1,'Escape does not silently accept incomplete content after a failure');
    const before=attempts;
    fail=false;
    await page.locator('.boot-screen__retry').click();
    await reveal(page,15000);
    assert(attempts>before,'Retry requests the failed asset again');
    await completeImages(page,'Retried page');
    cases++;
  } finally {await context.close();}
}
async function testNoJavaScript(browser) {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();
  try {
    await page.goto(url('about'));
    assert(await page.locator('main h1').isVisible(),'Without JavaScript, the page heading remains visible');
    assert.equal(await page.locator('main[inert]').count(),0,'Without JavaScript, static content is not left inert');
    assert.equal(await page.locator('.boot-screen').count(),0,'Without JavaScript, no unfinishable loading dialog is shown');
    cases++;
  } finally {await context.close();}
}
(async()=>{
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  try {
    for(const test of [testIntroReadiness,testSkipWaitsForAssets,testRuntimeImages,testInternalNavigation,testEveryPage,testMotionPreferences,testFailureRetry,testNoJavaScript]) {
      await test(browser);
      console.log(`PASS: ${test.name}`);
    }
    assert.deepEqual(browserErrors,[],'No browser runtime errors during arrivals, retries or navigation');
    console.log(`PASS: ${cases} navigation-loading cases, delayed network and decoded images, two-second ready hold, safe Skip/Escape, all 8 pages, runtime slides, back/hash navigation, motion preferences, retry and no JavaScript.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
