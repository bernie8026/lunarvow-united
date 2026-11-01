'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {readAccessConfig}=require('./prepare-protected-site.cjs');
const {installAuthRoute,redactProtectionError}=require('./protection-test-auth.cjs');
const root=path.resolve(__dirname,'..'),docs=path.join(root,'docs');
const password=fs.readFileSync(path.resolve(root,'../lunarvow-private/access-password.txt'),'utf8').trim();
const access=readAccessConfig();
let browser,server,base,downloads=0,failNext=false,knownLength=true,passed=0,archiveTransform=null;
const errors=[];
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
async function context(options={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844},...options});
 const auth=await installAuthRoute(ctx,{config:access,password});
 const phases=[];await ctx.exposeBinding('__reportUnlockPhase',(_,phase)=>{phases.push(phase);});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__unlockTrace=[];
  new MutationObserver(()=>{
   const gate=document.querySelector('#gate-loading');
   if(gate&&!gate.hidden){const phase=gate.dataset.phase,percent=document.querySelector('#gate-loading-progress').getAttribute('aria-valuenow');const last=window.__unlockTrace.at(-1);if(!last||last.phase!==phase){window.__reportUnlockPhase(phase);}if(!last||last.phase!==phase||last.percent!==percent)window.__unlockTrace.push({phase,percent,at:performance.now()});}
  }).observe(document,{subtree:true,attributes:true,childList:true});
 });
 await page.goto(base+'experience.html?lang=zh-HK',{waitUntil:'domcontentloaded'});
 await page.locator('#site-password:enabled').waitFor();return {ctx,page,phases,auth};
}
async function enter(page,value){await page.locator('#site-password').evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function ready(page){await page.waitForFunction(()=>document.body.dataset.page==='experience'&&!document.body.classList.contains('is-booting')&&!document.querySelector('.boot-screen')&&document.documentElement.dataset.navigationState==='idle',null,{timeout:20000});}
async function gateError(page){await page.locator('#gate-status[data-kind=error]').waitFor();assert(await page.locator('#gate-loading').isHidden());assert(await page.locator('#site-password').isEnabled());}
(async()=>{
 server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,relative=pathname.slice('/lunarvow-united/'.length)||'index.html';
  if(!pathname.startsWith('/lunarvow-united/')||relative.includes('..')||relative.includes('\\')){res.writeHead(404).end();return;}
  const file=path.join(docs,relative);if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  if(relative==='protected-site.json'){
   downloads++;if(failNext){failNext=false;res.writeHead(503).end();return;}
   const original=fs.readFileSync(file);
   const data=archiveTransform?Buffer.from(JSON.stringify(archiveTransform(JSON.parse(original.toString('utf8'))))):original;
   const chunk=Math.ceil(data.length/20);let offset=0;
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store',...(knownLength?{'Content-Length':data.length}:{})});
   const timer=setInterval(()=>{if(offset>=data.length){clearInterval(timer);res.end();return;}res.write(data.subarray(offset,offset+chunk));offset+=chunk;},90);
   res.on('close',()=>clearInterval(timer));return;
  }
  const type=relative.endsWith('.js')?'text/javascript':relative.endsWith('.html')?'text/html':'text/plain';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/lunarvow-united/`;
 browser=await chromium.launch({channel:'chrome',headless:true});
 await test('Slow ciphertext download shows immediate animation and real monotonic byte progress',async()=>{
  const {ctx,page,phases}=await context(),count=downloads;
  await enter(page,password);await page.locator('#unlock-button').click();
  await page.locator('#gate-loading').waitFor({state:'visible'});
  await page.waitForFunction(()=>{const n=Number(document.querySelector('#gate-loading-progress').getAttribute('aria-valuenow'));return n>0&&n<100;});
  assert.equal(await page.locator('#gate-loading').getAttribute('data-phase'),'downloading');
  assert(await page.locator('main').evaluate(n=>n.inert));
  assert(await page.locator('#gate-loading').evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Tab');assert(!await page.locator('#site-password').evaluate(n=>n===document.activeElement));
  await page.screenshot({path:path.join(root,'.private/unlock-loading-mobile.png')});
  const trace=await page.evaluate(()=>window.__unlockTrace);
  assert(trace.filter(x=>x.phase==='downloading').every((x,i,a)=>!i||Number(x.percent)>=Number(a[i-1].percent)));
  await page.locator('.boot-screen[data-phase=ready]').waitFor();
  const observed=[...new Set(phases)];
  assert.deepEqual(observed,['downloading','authenticating','decrypting','unpacking','opening']);
  assert.equal(downloads-count,1,'typing and submitting reuse one download');
  assert.equal(await page.locator('.boot-screen').getAttribute('data-hold-ms'),'2000');
  assert(await page.locator('main#main').evaluate(n=>n.inert));
  assert(await page.locator('main img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth)));
  await ready(page);assert.equal(await page.locator('main h1').textContent(),'工作經驗');await ctx.close();
 });
 await test('A warm download is reused for wrong-password retry without persisting credentials',async()=>{
  const {ctx,page,auth}=await context(),count=downloads;
  await page.locator('#site-password').focus();await page.waitForTimeout(2200);
  await enter(page,'incorrect-password-for-loading-test');await page.locator('#unlock-button').click();await gateError(page);
  assert.equal(downloads-count,1);
  assert.equal(auth.unlocks,1,'wrong password is verified through the auth API fixture');
  await enter(page,password);await page.locator('#unlock-button').click();await ready(page);assert.equal(downloads-count,1);
  assert.equal(auth.unlocks,2,'the retry obtains a key through a new auth request');
  const stored=await page.evaluate(async()=>({values:[...Object.values(localStorage),...Object.values(sessionStorage)],caches:await caches.keys(),dbs:await indexedDB.databases()}));
  assert(!stored.values.some(v=>String(v).includes(password)||String(v).includes(access.archiveKeyB64)));assert.deepEqual(stored.caches,[]);assert.deepEqual(stored.dbs,[]);await ctx.close();
 });
 await test('Download failure exits the modal and a new attempt can recover',async()=>{
  const {ctx,page}=await context();await enter(page,password);await page.waitForTimeout(2200);
  // Start a fresh document so its in-memory warm archive cannot mask the failed request.
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#site-password:enabled').waitFor();
  failNext=true;const count=downloads;
  // Submit directly, so this failure belongs to the attempt rather than a prior warm-up.
  await page.locator('#site-password').evaluate((n,v)=>{n.value=v;},password);
  await page.locator('#unlock-button').click();await gateError(page);assert.equal(downloads-count,1);
  await page.locator('#unlock-button').click();await ready(page);assert.equal(downloads-count,2);await ctx.close();
 });
 await test('Unknown response lengths use bytes, with translated phases and reduced-motion support',async()=>{
  knownLength=false;const {ctx,page}=await context({reducedMotion:'reduce'});
  for(const lang of ['zh-HK','en','zh-CN','ja','ko','th','ru']){
   await page.locator(`[data-gate-language="${lang}"]`).click();
   assert.equal(await page.locator('html').getAttribute('lang'),lang);
  }
  await enter(page,password);await page.locator('#unlock-button').click();
  await page.waitForFunction(()=>document.querySelector('#gate-loading').dataset.phase==='downloading'&&document.querySelector('#gate-loading-amount').textContent.includes('MB'));
  assert.equal(await page.locator('#gate-loading-progress').getAttribute('aria-valuenow'),null);
  assert((await page.locator('#gate-loading-status').textContent()).startsWith('Загрузка'));
  assert.equal(await page.locator('.gate-loading-orbit').evaluate(n=>getComputedStyle(n,'::before').animationName),'none');
  await ready(page);assert.equal(await page.locator('html').getAttribute('lang'),'ru');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await ctx.close();
 });
 await test('Auth service errors never fall back to local password decryption',async()=>{
  knownLength=true;const {ctx,page,auth}=await context();
  auth.nextUnlock={status:503,body:{ok:false,code:'service_unavailable'}};
  await enter(page,password);await page.locator('#unlock-button').click();await gateError(page);
  assert.equal(await page.locator('body[data-page]').count(),0,'a correct password alone must not unlock without the API');
  assert.equal(auth.unlocks,1);
  await enter(page,password);await page.locator('#unlock-button').click();await ready(page);assert.equal(auth.unlocks,2);await ctx.close();
 });
 await test('A temporary server lock disables retries and expires without automatic password submissions',async()=>{
  const {ctx,page,auth}=await context();
  auth.nextUnlock=()=>({status:429,headers:{'Retry-After':'2'},body:{ok:false,code:'cooldown',failures:3,retryAfterSeconds:2,lockedUntil:Date.now()+2000}});
  await enter(page,password);await page.locator('#unlock-button').click();
  await page.locator('#gate-status[data-kind=error]').waitFor();
  assert(await page.locator('#gate-loading').isHidden());
  assert(await page.locator('#site-password').isDisabled());assert(await page.locator('#unlock-button').isDisabled());
  assert.equal(await page.locator('body[data-page]').count(),0);
  await page.locator('#unlock-button:enabled').waitFor({timeout:6000});
  assert.equal(auth.unlocks,1,'expiry updates the UI and never resubmits a password');
  await enter(page,password);await page.locator('#unlock-button').click();await ready(page);await ctx.close();
 });
 await test('A permanent server lock keeps the gate closed and does not retry',async()=>{
  const {ctx,page,auth}=await context();
  auth.nextUnlock={status:403,body:{ok:false,code:'permanent_lock',failures:10}};
  await enter(page,password);await page.locator('#unlock-button').click();
  await page.locator('#gate-status[data-kind=error]').waitFor();
  assert(await page.locator('#gate-loading').isHidden());
  assert(await page.locator('#site-password').isDisabled());assert(await page.locator('#unlock-button').isDisabled());
  assert.equal(await page.locator('body[data-page]').count(),0);
  assert.equal(auth.unlocks,1);await ctx.close();
 });
 await test('Mismatched and malformed success responses cannot release the website',async()=>{
  for(const response of [
   {ok:true,archiveId:'different-publication',key:access.archiveKeyB64,failures:0},
   {ok:true,archiveId:access.archiveId,key:'invalid-key',failures:0}
  ]){
   const {ctx,page,auth}=await context();auth.nextUnlock={status:200,body:response};
   await enter(page,password);await page.locator('#unlock-button').click();await gateError(page);
   assert.equal(await page.locator('body[data-page]').count(),0);assert.equal(auth.unlocks,1);await ctx.close();
  }
 });
 await test('A legacy public envelope is rejected without a local password fallback',async()=>{
  archiveTransform=envelope=>({...envelope,version:1,kdf:'PBKDF2-SHA-256',iterations:600000,salt:Buffer.alloc(32).toString('base64')});
  const {ctx,page}=await context();
  try{
   await enter(page,password);await page.locator('#unlock-button').click();await gateError(page);
   assert.equal(await page.locator('body[data-page]').count(),0);
  }finally{archiveTransform=null;await ctx.close();}
 });
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,authentication:'isolated browser fixture; no live auth requests or backend policy claims'}));
})().catch(e=>{console.error(redactProtectionError(e,{config:access,password}));process.exitCode=1;}).finally(async()=>{await browser?.close();server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());});
