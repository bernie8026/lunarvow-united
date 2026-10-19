/* Observe rendered page entries, every internal-link surface and live ambient scenes. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/';
const names=['index','about','experience','education','skills','projects','contact','sitemap'];
const url=name=>new URL(`${name}.html?lang=zh-HK`,base).href;
const errors=[];
let cases=0;

async function contextFor(browser,preference='playing') {
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:preference==='reduced'?'reduce':'no-preference'});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.addInitScript(({preference})=>{
    try {
      sessionStorage.setItem('bernie-portfolio-arrival-v2','complete');
      localStorage.setItem('bernie-portfolio-motion',preference==='paused'?'paused':'playing');
    } catch {}
    const nativeFrame=window.requestAnimationFrame.bind(window);
    const originalAnimate=Element.prototype.animate;
    let animationRecords=new WeakMap();
    const probe=window.__motionTest={token:Math.random(),records:[],loaders:[],pointDraws:0,dustDraws:0};
    probe.reset=()=>{probe.records=[];probe.loaders=[];animationRecords=new WeakMap();};
    const recordFor=(animation,kind)=>{
      let record=animationRecords.get(animation);
      if(record) return record;
      const target=animation.effect?.target;
      const timing=animation.effect?.getComputedTiming();
      if(!(target instanceof Element)||!target.closest('main')||!Number.isFinite(timing?.duration)||timing.duration<=0||!Number.isFinite(timing?.iterations)) return null;
      record={page:document.body?.dataset.page,kind,target,duration:timing.duration,tag:target.tagName,classes:target.getAttribute('class')||'',visibleFrames:0,firstTime:null,lastTime:null,styles:new Set(),finished:false,canceled:false};
      animationRecords.set(animation,record);probe.records.push(record);
      animation.finished.then(()=>{record.finished=true;},()=>{record.canceled=true;});
      return record;
    };
    Element.prototype.animate=function(...args){const animation=originalAnimate.apply(this,args);recordFor(animation,'waapi');return animation;};
    const originalClear=CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect=function(...args){
      if(this.canvas.matches('[data-lore-canvas]')) probe.pointDraws++;
      if(this.canvas.matches('[data-lore-orbit]')) probe.dustDraws++;
      return originalClear.apply(this,args);
    };
    probe.summary=()=>({
      token:probe.token,loaders:[...probe.loaders],pointDraws:probe.pointDraws,dustDraws:probe.dustDraws,
      records:probe.records.map(({target,styles,...record})=>({...record,styleCount:styles.size,connected:target.isConnected}))
    });
    const rememberLoader=screen=>{
      const key=[document.body.dataset.page,screen.dataset.mode,screen.dataset.phase].join('/');
      if(probe.loaders.at(-1)?.key!==key) probe.loaders.push({key,page:document.body.dataset.page,mode:screen.dataset.mode,phase:screen.dataset.phase});
    };
    // A cached destination can replace its outgoing screen before the next paint.
    // Record that lifecycle separately; entry effects still require visible RAF samples.
    new MutationObserver(changes=>changes.forEach(change=>change.addedNodes.forEach(node=>{
      if(node instanceof Element&&node.matches('.boot-screen')) rememberLoader(node);
    }))).observe(document,{subtree:true,childList:true});
    function frame(){
      const screen=document.querySelector('.boot-screen');
      if(screen) rememberLoader(screen);
      for(const animation of document.getAnimations()){
        const record=recordFor(animation,'css');
        if(!record||!record.target.isConnected||screen||document.body.classList.contains('is-booting')) continue;
        const target=record.target,rect=target.getBoundingClientRect(),style=getComputedStyle(target);
        if(rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth||style.visibility!=='visible'||Number(style.opacity)<=.02) continue;
        record.visibleFrames++;
        const time=Number(animation.currentTime)||0;
        if(record.firstTime===null) record.firstTime=time;
        record.lastTime=time;
        record.styles.add([style.opacity,style.transform,style.filter,style.clipPath].join('/'));
      }
      nativeFrame(frame);
    }
    nativeFrame(frame);
  },{preference});
  return context;
}
async function ready(page,name) {
  await page.waitForFunction(name=>document.body?.dataset.page===name&&
    !document.querySelector('.boot-screen')&&!document.body.classList.contains('is-booting')&&
    !document.getElementById('main')?.inert&&document.documentElement.dataset.navigationState==='idle',name,{timeout:20000});
}
const visibleEntry=record=>record.visibleFrames>=3&&record.styleCount>=2&&record.lastTime-record.firstTime>=25;
async function assertEntry(page,name,label) {
  await page.waitForFunction(name=>window.__motionTest.summary().records.some(record=>record.page===name&&record.visibleFrames>=3&&record.styleCount>=2&&record.lastTime-record.firstTime>=25),name,{timeout:5000});
  const result=await page.evaluate(()=>window.__motionTest.summary());
  assert(result.records.some(record=>record.page===name&&visibleEntry(record)),label+': a finite entry effect visibly changes after loading finishes');
  assert(result.loaders.some(loader=>loader.page===name&&loader.mode==='page'),label+': destination uses the page loading screen');
  cases++;
  return result;
}
async function visit(page,name) {
  await page.goto(url(name),{waitUntil:'domcontentloaded'});
  await ready(page,name);
}
async function clickNested(page,selector,destination,label) {
  const link=page.locator(selector).first();
  await link.scrollIntoViewIfNeeded();
  const token=await page.evaluate(()=>{window.__motionTest.reset();return window.__motionTest.token;});
  const child=link.locator('span:visible').first();
  if(await child.count()) await child.click();else await link.click();
  await ready(page,destination);
  const result=await assertEntry(page,destination,label);
  assert.equal(result.token,token,label+': keeps the document and browser history router');
  assert(result.loaders.some(loader=>loader.mode==='departure'),label+': shows loading from the clicked content link');
}
async function hardEntries(browser) {
  const context=await contextFor(browser);
  const page=await context.newPage();
  try {
    for(const name of names){await visit(page,name);await assertEntry(page,name,`Hard entry ${name}`);}
  } finally {await context.close();}
}
async function everyLinkSurface(browser) {
  const context=await contextFor(browser);
  const page=await context.newPage();
  try {
    for(const name of names.filter(name=>name!=='index')){
      await visit(page,'index');
      await clickNested(page,`.navigation-grid .navigation-row[href*="${name}.html"]`,name,`Homepage chapter ${name}`);
    }
    await visit(page,'about');
    await clickNested(page,'.brand','index','Brand home destination');
    const surfaces=[
      ['index','.main-nav a[href*="about.html"]','about','Left navigation'],
      ['index','.hero-actions .button-primary','projects','Hero CTA'],
      ['index','.intro-layout a[href*="about.html"]','about','Intro text link'],
      ['index','.profile-facts a[href*="education.html"]','education','Profile feature link'],
      ['index','.showcase-link[data-project="lunar"]','projects','Runtime showcase link'],
      ['index','.footer-links a[href*="contact.html"]','contact','Footer link'],
      ['sitemap','.sitemap-grid a[href*="about.html"]','about','Sitemap entry']
    ];
    for(const [source,selector,destination,label]of surfaces){await visit(page,source);await clickNested(page,selector,destination,label);}
  } finally {await context.close();}
}
async function scrollEntrances(browser) {
  const context=await contextFor(browser);
  const page=await context.newPage();
  await page.setViewportSize({width:1440,height:720});
  try {
    for(const name of ['about','experience','education','projects']){
      await visit(page,name);
      const index=await page.locator('main [data-motion]').evaluateAll(elements=>elements.findIndex(element=>{
        const rect=element.getBoundingClientRect();
        return rect.width>0&&rect.height>0&&rect.top>innerHeight+40&&element.dataset.motionState!=='ready'&&element.dataset.motionState!=='revealing';
      }));
      assert(index>=0,name+': has a deferred content entrance below the first screen');
      await page.evaluate(()=>window.__motionTest.reset());
      await page.locator('main [data-motion]').nth(index).scrollIntoViewIfNeeded();
      await page.waitForFunction(name=>window.__motionTest.summary().records.some(record=>record.page===name&&record.visibleFrames>=3&&record.styleCount>=2),name,{timeout:5000});
      cases++;
    }
  } finally {await context.close();}
}
async function circleAdvances(page,selector,label) {
  const time=await page.locator(selector).first().evaluate(element=>Number(element.getAnimations().find(animation=>animation.effect.getComputedTiming().iterations===Infinity)?.currentTime));
  assert(Number.isFinite(time),label+': circle has a CSS animation');
  await page.waitForFunction(({selector,time})=>{
    const animation=document.querySelector(selector)?.getAnimations().find(animation=>animation.effect.getComputedTiming().iterations===Infinity);
    return animation?.playState==='running'&&Number(animation.currentTime)>time+80;
  },{selector,time},{timeout:4000});
}
async function canvasSnapshot(page) {
  return page.evaluate(()=>{
    const hash=selector=>{
      const canvas=document.querySelector(selector);
      const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let value=2166136261;
      for(let i=0;i<bytes.length;i+=412) value=Math.imul(value^bytes[i]^bytes[i+1]<<8^bytes[i+2]<<16^bytes[i+3]<<24,16777619);
      return value>>>0;
    };
    return {point:hash('[data-lore-canvas]'),dust:hash('[data-lore-orbit]'),frame:Number(document.querySelector('[data-lore-orbit]').dataset.frame),pointDraws:window.__motionTest.pointDraws,dustDraws:window.__motionTest.dustDraws};
  });
}
async function assertSkillsMoving(page,label) {
  await page.locator('.skills-console').scrollIntoViewIfNeeded();
  await circleAdvances(page,'.lore-reticle-motion',label);
  const before=await canvasSnapshot(page);
  await page.waitForFunction(frame=>Number(document.querySelector('[data-lore-orbit]').dataset.frame)>frame+5,before.frame,{timeout:4000});
  const after=await canvasSnapshot(page);
  assert.notEqual(after.point,before.point,label+': the point object changes actual pixels');
  assert.notEqual(after.dust,before.dust,label+': orbital dust changes actual pixels');
  assert(after.pointDraws>before.pointDraws&&after.dustDraws>before.dustDraws,label+': both canvas render loops advance');
  cases++;
}
async function ongoingScenes(browser) {
  const context=await contextFor(browser);
  const page=await context.newPage();
  try {
    await visit(page,'index');
    await circleAdvances(page,'.orbital-ring','Home circle after hard entry');cases++;
    await clickNested(page,'.main-nav a[href*="skills.html"]','skills','Skills soft entry');
    await assertSkillsMoving(page,'Skills after soft entry');
    await clickNested(page,'.main-nav a[href*="about.html"]','about','Exit skills');
    await clickNested(page,'.main-nav a[href*="skills.html"]','skills','Return to skills');
    await assertSkillsMoving(page,'Skills after returning through the router');
    await clickNested(page,'.brand','index','Return home');
    await circleAdvances(page,'.orbital-ring','Home circle after soft return');cases++;
  } finally {await context.close();}
}
async function quietPreferences(browser) {
  for(const preference of ['paused','reduced']){
    const context=await contextFor(browser,preference);
    const page=await context.newPage();
    try {
      for(const name of names){
        await visit(page,name);
        assert(await page.locator('main h1').isVisible(),preference+'/'+name+': content is accessible');
        const result=await page.evaluate(()=>window.__motionTest.summary());
        assert.equal(result.records.filter(record=>record.kind==='waapi'&&record.page===name).length,0,preference+'/'+name+': no scripted content entrances');
        const running=await page.evaluate(()=>document.getAnimations().some(animation=>
          animation.effect?.target instanceof Element&&animation.effect.target.closest('main')&&
          animation.effect.getComputedTiming().iterations===Infinity&&animation.playState==='running'));
        assert.equal(running,false,preference+'/'+name+': content has no ongoing ambient CSS animation');
        if(name==='skills'){
          // Let the initial still-frame draw and ResizeObserver settle before comparing.
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const before=await canvasSnapshot(page);
          await page.waitForTimeout(220);
          const after=await canvasSnapshot(page);
          assert.deepEqual(after,before,preference+': point and dust pixels, frame and draw counts stay stable');
        }
        cases++;
      }
      await page.evaluate(()=>window.__motionTest.reset());
      await page.locator('.brand').click();
      await ready(page,'index');
      assert(await page.locator('main h1').isVisible(),preference+': soft navigation keeps content accessible');
      assert.equal((await page.evaluate(()=>window.__motionTest.summary())).records.filter(record=>record.kind==='waapi'&&record.page==='index').length,0,preference+': soft entry has no scripted motion');
      cases++;
    } finally {await context.close();}
  }
}
(async()=>{
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  try {
    for(const test of [hardEntries,everyLinkSurface,scrollEntrances,ongoingScenes,quietPreferences]){await test(browser);console.log('PASS: '+test.name);}
    assert.deepEqual(errors,[],'No browser errors while entering pages, scrolling or remounting particle scenes');
    console.log(`PASS: ${cases} rendered page-motion cases: all 8 hard/soft destinations, nested chapter links and every link surface, scroll entrances, live CSS circles and point/dust pixels after navigation, paused and reduced preferences.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
