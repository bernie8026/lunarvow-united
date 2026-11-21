'use strict';
// Exercise the same HTML additions that the published worker serves after
// unlock. All archive entries and network replies here are local test fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const { fixture, oldMain } = require('./verify-reference-media.cjs');
const docs = path.resolve(__dirname, '../docs');
const site = new URL('https://workshop.test/lunarvow-united/');

async function runtimePages() {
  const worker = vm.createContext({
    ArrayBuffer, URL, TextEncoder, TextDecoder, Response, Request, Headers,
    self:{ registration:{scope:site.href}, addEventListener(){} },
    fetch(){throw new Error('Fixture archive must not contact an origin');},
  });
  vm.runInContext(fs.readFileSync(path.join(docs,'protected-worker.js'),'utf8'),worker);
  worker.fixtures = ['index','stem','about'].map(name => {
    // The reference fixture normally preloads its two helpers. Remove those
    // fixture-only additions so the runtime is responsible for dependencies.
    const html = fixture(name).replace('<link rel="stylesheet" href="assets/industrial.css">','')
      .replace(/<script src="assets\/protected-media\.js[^"]*" defer><\/script>/,'');
    return {path:name+'.html',type:'text/html; charset=utf-8',data:new TextEncoder().encode(html).buffer};
  });
  vm.runInContext('files = receiveFiles(fixtures)', worker);
  const pages = Object.create(null);
  for (const file of ['stem.html','about.html']) {
    const response = await worker.handle(new Request(new URL(file,site)),file);
    assert.equal(response.status,200);
    pages[file]=await response.text();
  }
  return pages;
}

async function run() {
  const pages=await runtimePages(), errors=[], offsite=[], missing=[];
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL} : {})});
  try {
    const context=await browser.newContext({viewport:{width:1366,height:920},reducedMotion:'reduce'});
    const page=await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if (url.origin!==site.origin || !url.pathname.startsWith(site.pathname)) {offsite.push(url.href);return route.abort();}
      const file=url.pathname.slice(site.pathname.length);
      if(Object.hasOwn(pages,file))return route.fulfill({contentType:'text/html; charset=utf-8',body:pages[file]});
      // Session/auth itself is exercised by the separate protection suite.
      if(file==='protected-session.js') return route.fulfill({contentType:'text/javascript',body:''});
      if(file==='favicon.ico')return route.fulfill({status:204});
      const target=path.resolve(docs,file);
      if(file.startsWith('assets/') && target.startsWith(docs+path.sep) && fs.existsSync(target)) return route.fulfill({path:target});
      missing.push(file);return route.fulfill({status:404});
    });
    const lab=page.locator('[data-flight-lab]'), action=(name,n)=> {
      const found=lab.locator('[data-flight-action="'+name+'"]');return n===undefined ? found : found.nth(n);
    };
    const op=lab.locator('[data-flight-op]'), amount=lab.locator('[data-flight-value]');
    const craft=lab.locator('[data-flight-craft]'), props=craft.locator('.flight-lab-prop');
    const bladePoses=()=>props.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).transform));
    const bladesAtRest=()=>props.evaluateAll(nodes=>nodes.every(n=>n.getAnimations().every(a=>a.playState!=='running')));
    const state=s=>page.waitForFunction(s=>document.querySelector('[data-flight-lab]')?.dataset.flightState===s,s);
    const pose=()=>lab.evaluate(n=>['x','y','heading'].map(k=>{
      const text=n.querySelector('[data-flight-'+k+']').textContent;
      const part=text.match(/[-+]?\d+(?:\.\d+)?/);return part ? Number(part[0]) : null;
    }));
    async function setRow(i,type,value) {
      await op.nth(i).selectOption(type);
      const control=amount.nth(i);
      if(await control.evaluate(n=>n.tagName)==='SELECT') await control.selectOption(String(value));
      else {await control.fill(String(value));await control.press('Tab');}
    }
    await page.goto(new URL('about.html',site).href);
    assert.equal(await lab.count(),0,'unrelated direct route does not acquire an editor');
    assert(!(await page.locator('script[src*="flight-lab.js"]').count()),'unrelated routes do not download simulator code');
    await page.goto(new URL('stem.html',site).href);
    await lab.waitFor();assert.equal(await lab.count(),1);
    assert.deepEqual(await props.evaluateAll(nodes=>nodes.map(n=>n.dataset.spin).sort()),['ccw','ccw','cw','cw'],
      'the aircraft has four propellers, with two counter-rotating pairs');
    await action('example').click();
    assert((await op.count())>=3,'example is an editable program');
    while(await op.count()>2) await action('remove',(await op.count())-1).click();
    await setRow(0,'right',90);await setRow(1,'forward',3);
    const beforeAdd=await op.count();
    await action('add').click();assert.equal(await op.count(),beforeAdd+1);
    await action('remove',beforeAdd).click();
    await action('up',1).click();
    assert.deepEqual(await op.evaluateAll(nodes=>nodes.map(n=>n.value)),['forward','right']);
    await action('step').click();assert.deepEqual(await pose(),[0,3,0],'reordered forward command now points north');
    await action('step').click();await state('complete');assert.deepEqual(await pose(),[0,3,90]);
    await action('reset').click();assert.deepEqual(await pose(),[0,0,0],'reset rewinds without deleting the program');
    await action('down',0).click();
    assert.deepEqual(await op.evaluateAll(nodes=>nodes.map(n=>n.value)),['right','forward']);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await action('run').click();
    // A yaw command visibly rotates the aircraft in place before translation.
    await page.waitForFunction(()=>{
      const n=document.querySelector('[data-flight-craft]');
      const m=n.ownerSVGElement.getScreenCTM().inverse().multiply(n.getScreenCTM());
      return Math.abs(m.e-160)<.01 && Math.abs(m.f-160)<.01 && m.b>.01 && m.b<.99;
    });
    await state('complete');
    assert.deepEqual(await pose(),[3,0,90],'turn before moving changes the destination');
    assert(await bladesAtRest(),'propellers stop after the last command');

    await action('reset').click();await setRow(0,'forward',10);await setRow(1,'forward',1);
    await state('invalid');
    assert(await action('run').isDisabled(),'off-grid sequence cannot run');
    assert((await lab.locator('[data-flight-status]').textContent()).trim(),'invalid program explains the problem');
    await setRow(1,'back',1);await state('ready');
    // Observe actual motion between waypoints, rather than only inspecting a
    // "playing" flag or endpoint. Compare the painted local blade transforms.
    const idle=await bladePoses();
    await action('run').click();
    await page.waitForFunction(initial=>{
      const n=document.querySelector('[data-flight-craft]');
      const m=n.ownerSVGElement.getScreenCTM().inverse().multiply(n.getScreenCTM());
      const props=[...n.querySelectorAll('.flight-lab-prop')];
      return Math.abs(m.e-160)<.01 && m.f<159 && m.f>21 &&
        props.every((p,i)=>getComputedStyle(p).transform!==initial[i]);
    },idle);
    await action('run').click();await state('paused');
    // A CSS pause can report playState='paused' before its pending hold time
    // has reached the compositor. Compare the first committed paused frame.
    await props.evaluateAll(async nodes => {
      await Promise.all(nodes.flatMap(n => n.getAnimations()).map(a => a.ready));
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    assert(await bladesAtRest(),'pausing freezes the rotors');
    const stopPose=await pose(), stopGraphic=await craft.getAttribute('transform');
    const stoppedBlades=await bladePoses();
    await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,300)));
    assert.deepEqual(await pose(),stopPose,'a paused program holds its position');
    assert.equal(await craft.getAttribute('transform'),stopGraphic,'animated aircraft holds its exact position');
    assert.deepEqual(await bladePoses(),stoppedBlades,'each propeller holds its last angle');
    const nameBefore=await action('step').textContent();
    await page.evaluate(()=>window.__fixtureLanguage('en'));
    await page.waitForFunction(text=>document.querySelector('[data-flight-action="step"]').textContent!==text,nameBefore);
    assert.deepEqual(await op.evaluateAll(nodes=>nodes.map(n=>n.value)),['forward','back'],'switching language preserves edited program');
    assert.equal(await craft.getAttribute('transform'),stopGraphic,'switching language preserves the paused in-flight pose');
    await action('run').click();await state('complete');
    assert.deepEqual(await pose(),[0,9,0],'resuming finishes the forward leg and reverses without rotating');
    await action('reset').click();
    await page.setViewportSize({width:320,height:780});
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const lang of ['en','ru']) {
      await page.evaluate(lang=>window.__fixtureLanguage(lang),lang);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const fits=await lab.evaluate(root=>{
        const controls=[...root.querySelectorAll('input,select,button')].filter(n=>n.getClientRects().length);
        return document.documentElement.scrollWidth<=innerWidth+1 && controls.every(n=>{
          const r=n.getBoundingClientRect();return r.left>=-1 && r.right<=innerWidth+1 && r.width>0;
        });
      });
      assert(fits,'mobile workshop controls stay in view: '+lang);
    }
    await action('step').click();assert.deepEqual(await pose(),[0,10,0]);
    await action('run').click();await state('playing');
    assert(await bladesAtRest(),'reduced motion disables rotor spin during playback');
    await state('complete');assert.deepEqual(await pose(),[0,9,0],'reduced motion still executes the command');
    // Leave during playback and return twice. No old editor or loop is reused.
    await action('example').click();await action('run').click();
    for(let n=0;n<2;n++) {
      await page.evaluate(()=>window.__fixtureNavigate('about'));
      assert.equal(await lab.count(),0);
      assert.equal(await page.locator('main').innerHTML(),oldMain('about'));
      await page.evaluate(()=>window.__fixtureNavigate('stem'));
      await lab.waitFor();assert.equal(await lab.count(),1);assert.deepEqual(await pose(),[0,0,0]);
    }
    assert.deepEqual(await page.evaluate(()=>window.__sensitiveReads),[]);
    assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);assert.deepEqual(missing,[]);
    await require('./test-route-loader-ui.cjs')(page);
    console.log('Flight workshop: protected routing, editable commands, bounded playback, languages, mobile and soft-navigation cleanup passed.');
  } finally {await browser.close();}
}
if(require.main===module) run().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={run};
