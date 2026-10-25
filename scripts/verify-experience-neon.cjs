/* Exercise the encrypted work page and its media lifecycle without logging the password. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const base = new URL(process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8766/lunarvow-united/');
const password = fs.readFileSync(path.resolve(root, process.env.PORTFOLIO_PASSWORD_FILE || '../lunarvow-private/access-password.txt'), 'utf8').trim();
const output = path.join(root, '.private', 'experience-qa');
const errors = [], results = [];
let browser;
const route = (name='experience', language='zh-HK') => new URL(`${name}.html?lang=${language}`,base).href;
const redact = error => String(error?.stack || error).split(password).join('[REDACTED]');
async function test(label, operation) { await operation(); results.push(label); console.log('PASS '+label); }
async function frames(page) { await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); }
async function ready(page,name='experience') {
  await page.waitForFunction(name=>document.body?.dataset.page===name && !!document.querySelector('main#main') && !document.querySelector('.boot-screen') && !document.body.classList.contains('is-booting') && !document.querySelector('main#main').inert && document.documentElement.dataset.navigationState==='idle',name,{timeout:30000});
}
async function unlock(page,language='zh-HK') {
  await page.goto(route('experience',language),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const input=document.querySelector('input[type="password"]');return input && !input.disabled && !document.querySelector('body[data-page] main#main');},null,{timeout:15000});
  await page.locator('input[type="password"]').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},password);
  await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
  await ready(page);
}
async function contextFor(options={},theme='dark') {
  const context=await browser.newContext({viewport:{width:1440,height:960},...options});
  context.on('page',page=>{
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error' && message.location().url!==new URL('/favicon.ico',base).href)errors.push(message.text());});
    page.on('requestfailed',request=>{const failure=request.failure()?.errorText||'request failed';if(request.url().startsWith(base.href)&&!/ERR_ABORTED/.test(failure))errors.push(failure+': '+request.url());});
  });
  await context.addInitScript(theme=>{try{if(!localStorage.getItem('bernie-portfolio-theme'))localStorage.setItem('bernie-portfolio-theme',theme);}catch{}},theme);
  await context.addInitScript(()=>{
    window.__workQaSignalEvents=[];
    new MutationObserver(records=>records.forEach(record=>{
      const node=record.target;
      if(node instanceof Element&&node.matches('.work-signal-text.is-signal-burst')&&!String(record.oldValue||'').split(/\s+/).includes('is-signal-burst'))window.__workQaSignalEvents.push({node,time:performance.now(),connected:node.isConnected});
    })).observe(document,{subtree:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
  });
  return context;
}
async function top(page) { await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await frames(page); }
async function controls(page) {
  for(const selector of ['main#main','.masthead','#main-nav','.header-tools','.footer'])assert.equal(await page.locator(selector).count(),1,'one mounted landmark: '+selector);
  for(const selector of ['.motion-replay','.ambient-toggle','.site-lock'])assert.equal(await page.locator('.footer-links '+selector).count(),1,'one footer control: '+selector);
  assert.equal(await page.locator('.main-nav a[aria-current="page"]').count(),1);
  assert((await page.locator('.main-nav a[aria-current="page"]').getAttribute('href')).includes('experience.html'),'work chapter is current');
  const geometry=await page.locator('.header-tools button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
  const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  assert.equal(geometry.length,4,'languages and theme remain available');
  geometry.forEach(r=>assert(r.width>0&&r.height>0&&r.left>=-1&&r.right<=viewport.width+1&&r.top>=-1&&r.bottom<=viewport.height+1,'header control is visible in the viewport'));
  for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++){const a=geometry[i],b=geometry[j];assert(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'header controls do not overlap');}
}
async function content(page,language='zh-HK') {
  assert.equal(await page.locator('main.experience-neon-page').count(),1);
  assert.equal(await page.locator('main h1').count(),1,'one work headline');
  assert.equal(await page.locator('.work-hero').count(),1);
  assert.equal(await page.locator('.work-film').count(),1,'one video scene');
  assert.equal(await page.locator('.work-record').count(),2,'both work and personal-practice records remain');
  assert(await page.locator('main img').evaluateAll(nodes=>nodes.length>0&&nodes.every(image=>image.complete&&image.naturalWidth>0)),'hero poster and work imagery have decoded');
  assert.equal(await page.evaluate(()=>document.documentElement.lang),language);
  const translations=await page.locator('main [data-i18n]').evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.i18n,text:node.textContent.trim(),expected:window.PORTFOLIO_TEXT?.[node.dataset.i18n]?.[document.documentElement.lang]})));
  for(let number=55;number<=74;number++){
    const key='t'+String(number).padStart(3,'0'),node=translations.find(item=>item.key===key);
    assert(node&&node.text&&node.text===node.expected,'original work content is retained and translated: '+key);
  }
  await frames(page);
  const echoes=await page.locator('.work-signal-text').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent.trim(),echo:node.dataset.workEcho})));
  assert(echoes.length>=8,'the main titles and handoff labels have signal treatment');
  assert(echoes.every(node=>node.text&&node.echo===node.text),'decorative signal echoes stay in sync with unchanged readable text');
  for(const heading of await page.locator('main :is(h1,h2,h3).work-signal-text').all()){
    const name=(await heading.textContent()).trim();assert.equal(await page.getByRole('heading',{name,exact:true}).count(),1,'decorative text does not duplicate the accessible heading name');
  }
  const width=await page.evaluate(()=>innerWidth);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'work page has no horizontal overflow');
  for(const selector of ['.work-hero h1','.work-record h2','.work-record h3','main details','main a[data-internal]'])for(const target of await page.locator(selector).all()){
    const box=await target.boundingBox();assert(box&&box.width>0&&box.height>0,'work content is rendered: '+selector);assert(box.x>=-2&&box.x+box.width<=width+2,'work content fits inside the viewport: '+selector);
  }
  const destinations=new Set();
  for(const link of await page.locator('main a[data-internal]').all()){
    const url=new URL(await link.getAttribute('href'),page.url());assert.equal(url.origin,base.origin);assert(url.pathname.startsWith(base.pathname));assert.equal(url.searchParams.get('lang'),language,'work CTA retains locale');assert((await link.innerText()).trim(),'work CTA is named');destinations.add(path.basename(url.pathname));
  }
  for(const destination of ['projects.html','education.html'])assert(destinations.has(destination),'work page keeps its '+destination+' destination');
  await top(page);await controls(page);
}
async function languageTo(page,language){await page.locator(`[data-language="${language}"]`).click();await page.waitForFunction(language=>document.documentElement.lang===language,language);}
async function capture(page,name){await top(page);await page.screenshot({path:path.join(output,name),fullPage:true,animations:'disabled'});}
async function videoPlaying(page){
  await top(page);
  await page.waitForFunction(()=>{const v=document.querySelector('.work-film');return v&&v.readyState>=2&&!v.paused&&v.videoWidth>0&&v.duration>0;},null,{timeout:15000});
  const before=await page.locator('.work-film').evaluate(v=>({time:v.currentTime,started:performance.now()}));
  await page.waitForFunction(before=>{const v=document.querySelector('.work-film');return v&&!v.paused&&performance.now()-before.started>200&&Math.abs(v.currentTime-before.time)>.08;},before,{timeout:8000});
}
async function videoStill(page){
  await top(page);await page.waitForFunction(()=>document.querySelector('.work-film')?.paused,null,{timeout:5000});
  const snapshot=await page.locator('.work-film').evaluate(v=>({time:v.currentTime,started:performance.now()}));
  await page.waitForFunction(start=>performance.now()-start>250,snapshot.started);
  assert.equal(await page.locator('.work-film').evaluate(v=>v.currentTime),snapshot.time,'paused video does not advance');
}
async function visibleContent(page){
  for(const selector of ['.work-hero h1','.work-record h2','.work-record h3','.work-record p','main details summary'])for(const target of await page.locator(selector).all()){
    if(await target.evaluate(node=>!!node.closest('details:not([open])')&&!node.matches('summary')))continue;
    await target.scrollIntoViewIfNeeded();await frames(page);
    assert(await target.evaluate(node=>{const r=node.getBoundingClientRect();if(!r.width||!r.height)return false;for(let e=node;e instanceof Element;e=e.parentElement){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}return true;}),'motion preferences preserve readable work content');
  }
}
async function signalSamples(target,count=36){
  return target.evaluate(async(node,count)=>{
    const samples=[];
    for(let frame=0;frame<count;frame++){
      const style=getComputedStyle(node),before=getComputedStyle(node,'::before'),after=getComputedStyle(node,'::after');
      samples.push({text:node.textContent,echo:node.dataset.workEcho,burst:node.classList.contains('is-signal-burst'),transform:style.transform,translate:style.translate,shadow:style.textShadow,before:[before.transform,before.clipPath,before.textShadow,before.opacity,before.translate],after:[after.transform,after.clipPath,after.textShadow,after.opacity,after.translate]});
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    return samples;
  },count);
}
async function textStill(page){
  await top(page);const heading=page.locator('#work-heading');await heading.hover();await frames(page);
  assert.equal(await page.locator('.work-signal-text.is-signal-burst').count(),0,'motion preference prevents new signal bursts');
  const samples=await signalSamples(heading,20);
  assert.equal(new Set(samples.map(sample=>JSON.stringify([sample.transform,sample.translate,sample.shadow,sample.before,sample.after]))).size,1,'motion preference leaves all signal text styles still');
  assert(await page.locator('.work-signal-text').evaluateAll(nodes=>nodes.every(node=>node.getAnimations().every(animation=>animation.playState!=='running'))),'no text animation keeps running after motion is disabled');
}
async function main(){
  assert(password.length>=12,'private password file is available');fs.mkdirSync(output,{recursive:true,mode:0o700});
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await contextFor(),page=await context.newPage();
  try{
    await test('Encrypted work page retains both records and every original fact on desktop dark',async()=>{await unlock(page);await content(page);await capture(page,'desktop-dark.png');});
    await test('Signal text enters, repeats, replays on hover and moves only decorative slices',async()=>{
      await top(page);await page.waitForFunction(()=>window.__workQaSignalEvents.some(event=>event.node===document.querySelector('#work-heading')),null,{timeout:3500});
      const heading=page.locator('#work-heading'),original=await heading.textContent();
      const entryCount=await page.evaluate(()=>window.__workQaSignalEvents.filter(event=>event.node===document.querySelector('#work-heading')).length);
      await page.waitForFunction(before=>window.__workQaSignalEvents.filter(event=>event.node===document.querySelector('#work-heading')).length>before,entryCount,{timeout:7500});
      await page.waitForFunction(()=>!document.querySelector('#work-heading').classList.contains('is-signal-burst'),null,{timeout:3500});
      await page.mouse.move(75,5);const count=await page.evaluate(()=>window.__workQaSignalEvents.filter(event=>event.node===document.querySelector('#work-heading')).length);
      await heading.hover();await page.waitForFunction(before=>window.__workQaSignalEvents.filter(event=>event.node===document.querySelector('#work-heading')).length>before,count,{timeout:3500});
      const samples=await signalSamples(heading);
      assert(samples.every(sample=>sample.text===original&&sample.echo===original.trim()),'glitch never scrambles the readable source or translation');
      assert(new Set(samples.map(sample=>JSON.stringify([sample.transform,sample.translate,sample.shadow,sample.before,sample.after]))).size>1,'signal effect changes computed transforms, slices or shadows across frames');
      assert(samples.some(sample=>[sample.before,sample.after].some(pseudo=>Number(pseudo[3])>0)),'decorative signal slices are visibly rendered during a burst');
      assert.equal(await page.getByRole('heading',{name:original.trim(),exact:true}).count(),1,'active glitch leaves the heading accessible once');
      await capture(page,'desktop-signal.png');
      const label=page.locator('.work-track strong').first(),labelText=await label.textContent();await label.scrollIntoViewIfNeeded();await frames(page);await label.hover();
      await page.waitForFunction(()=>document.querySelector('.work-track strong')?.classList.contains('is-signal-burst'),null,{timeout:3500});
      const scan=await signalSamples(label);
      assert(scan.every(sample=>sample.text===labelText&&sample.echo===labelText.trim()),'scan labels preserve their original text');
      assert(new Set(scan.map(sample=>JSON.stringify([sample.translate,sample.shadow,sample.before,sample.after]))).size>1,'handoff labels receive a visible animated signal treatment too');
    });
    await test('McDonald’s signal loop decodes, advances, loops and supports authenticated byte ranges',async()=>{
      await videoPlaying(page);
      const video=await page.locator('.work-film').evaluate(v=>({muted:v.muted,loop:v.loop,playsInline:v.playsInline,source:v.currentSrc,duration:v.duration,width:v.videoWidth}));
      assert(video.muted&&video.loop&&video.playsInline,'hero is a silent inline loop');assert(video.width>=1000&&Math.abs(video.duration-6.006)<.1,'six-second logo video has decoded');
      assert(new URL(video.source).pathname.endsWith('/mcdonalds-signal.webm'),'the hero uses the McDonald’s animation');
      assert((await page.locator('.work-art img').getAttribute('src')).includes('mcdonalds-poster.webp'),'static fallback uses the matching logo');
      const range=await page.evaluate(async url=>{const r=await fetch(url,{headers:{Range:'bytes=8-23'}});return {status:r.status,length:(await r.arrayBuffer()).byteLength,type:r.headers.get('content-type'),range:r.headers.get('content-range'),cache:r.headers.get('cache-control')};},video.source);
      assert.equal(range.status,206);assert.equal(range.length,16);assert(range.type.startsWith('video/webm'));assert(/^bytes 8-23\//.test(range.range));assert.equal(range.cache,'no-store');
      await page.locator('.work-film').evaluate(v=>{v.currentTime=v.duration-.12;});await page.waitForFunction(()=>{const v=document.querySelector('.work-film');return !v.paused&&v.currentTime<1.5;},null,{timeout:8000});
    });
    await test('Light theme and three translations preserve a readable work layout',async()=>{
      await page.locator('.theme-toggle').click();await page.waitForFunction(()=>document.body.dataset.theme==='light');await content(page);await capture(page,'desktop-light.png');
      for(const language of ['en','zh-CN','zh-HK']){await languageTo(page,language);await content(page,language);}
      const details=page.locator('main details').first();await details.locator('summary').focus();await page.keyboard.press('Enter');assert(await details.evaluate(node=>node.open),'work explanation expands with the keyboard');assert((await details.locator('p').innerText()).trim(),'expanded explanation remains readable');await details.locator('summary').press('Enter');
    });
    await test('Mobile 390 and 360 layouts keep all three languages and expandable navigation usable',async()=>{
      for(const width of [390,360]){await page.setViewportSize({width,height:844});for(const language of ['zh-HK','en','zh-CN']){await languageTo(page,language);await content(page,language);const toggle=page.locator('.menu-toggle');assert(await toggle.isVisible());await toggle.click();await page.waitForFunction(()=>document.querySelector('.menu-toggle')?.getAttribute('aria-expanded')==='true');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.menu-toggle')?.getAttribute('aria-expanded')==='false');}await languageTo(page,'zh-HK');await capture(page,`mobile-${width}.png`);}
      await page.setViewportSize({width:1440,height:960});
    });
    await test('Animation pause stops the video and preserves all work content, then resumes',async()=>{
      await page.locator('.work-track').scrollIntoViewIfNeeded();await frames(page);
      await page.waitForFunction(()=>{const heading=document.querySelector('#work-heading');return heading.getBoundingClientRect().bottom<0&&!heading.classList.contains('is-signal-burst');},null,{timeout:3500});
      const handoff=await page.locator('.work-track li').evaluateAll(nodes=>nodes.findIndex(node=>node.classList.contains('is-handoff')));
      await page.waitForFunction(before=>[...document.querySelectorAll('.work-track li')].findIndex(node=>node.classList.contains('is-handoff'))!==before,handoff,{timeout:6500});
      await videoPlaying(page);await page.locator('.ambient-toggle').click();await page.waitForFunction(()=>document.body.classList.contains('motion-paused'));await videoStill(page);
      assert(await page.locator('.work-wave i,.work-sweep').evaluateAll(nodes=>nodes.length>0&&nodes.every(node=>getComputedStyle(node).animationPlayState==='paused')),'pause also stops the waveform and shift rhythm');
      await textStill(page);await visibleContent(page);await page.locator('.ambient-toggle').click();await page.waitForFunction(()=>!document.body.classList.contains('motion-paused'));await videoPlaying(page);
    });
    await test('About, Experience, Education and browser history remount without old playing media',async()=>{
      await top(page);const token=await page.evaluate(()=>{window.__workQaDocument=Math.random();window.__workQaRetired=[];window.__workQaRetiredText=[];window.__workQaRetiredBursts=[];return window.__workQaDocument;});
      for(let cycle=0;cycle<2;cycle++){
        await page.evaluate(()=>{
          window.__workQaRetired.push(document.querySelector('.work-film'));
          document.querySelectorAll('.work-signal-text').forEach(node=>{window.__workQaRetiredText.push(node);new MutationObserver(records=>{if(!node.isConnected&&node.classList.contains('is-signal-burst')&&records.some(record=>!String(record.oldValue||'').split(/\s+/).includes('is-signal-burst')))window.__workQaRetiredBursts.push(node);}).observe(node,{attributes:true,attributeFilter:['class'],attributeOldValue:true});});
        });await page.locator('.main-nav a[href*="about.html"]').click();await ready(page,'about');
        assert.equal(await page.locator('.work-film').count(),0,'other page contains no work media');assert(await page.evaluate(()=>window.__workQaRetired.every(v=>v.paused&&!v.isConnected)),'disposed work media is paused');
        assert.equal(await page.locator('.work-signal-text').count(),0,'signal styling does not spill into the next page');
        assert(await page.evaluate(()=>window.__workQaRetiredText.every(node=>!node.isConnected&&!node.classList.contains('is-signal-burst')&&node.getAnimations().every(animation=>animation.playState!=='running'))),'retired signal targets have no active burst or animation');
        await page.locator('.main-nav a[href*="experience.html"]').click();await ready(page);await content(page);await videoPlaying(page);
        await page.evaluate(()=>window.__workQaRetired.push(document.querySelector('.work-film')));await page.locator('main a[data-internal][href*="education.html"]').last().click();await ready(page,'education');assert.equal(await page.locator('.work-film').count(),0);assert(await page.evaluate(()=>window.__workQaRetired.every(v=>v.paused&&!v.isConnected)));
        await page.goBack();await ready(page);await content(page);await videoPlaying(page);assert.equal(await page.evaluate(()=>window.__workQaDocument),token,'soft navigation and history retain one live document');
      }
      const retiredStart=await page.evaluate(()=>performance.now());await page.waitForFunction(start=>performance.now()-start>6400,retiredStart,{timeout:8000});
      assert.equal(await page.evaluate(()=>window.__workQaRetiredBursts.length),0,'retired timers never restart signal text on a detached page');
    });
    await test('Reduced motion shows a static hero and the complete English work page',async()=>{
      const reduced=await contextFor({viewport:{width:390,height:844},reducedMotion:'reduce'},'light');const tab=await reduced.newPage();try{await unlock(tab,'en');await content(tab,'en');await videoStill(tab);await textStill(tab);await visibleContent(tab);}finally{await reduced.close();}
    });
    assert.deepEqual([...new Set(errors)],[],'work page has no browser, console or scoped network errors');
    console.log(JSON.stringify({passed:results.length,screenshots:output,base:base.href}));
  }finally{await context.close();await browser.close();}
}
main().catch(async error=>{console.error(redact(error));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
