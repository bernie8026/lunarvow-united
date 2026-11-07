/* Real Chrome WebAuthn + workerd + SQLite integration. No Cloudflare calls.
 * The temporary HTTPS test origins use an unprivileged port. Only the compiled
 * Worker's exact allowed-origin literal is adapted to that port in memory;
 * its RP ID, verification logic, bindings, and signature checks stay intact.
 * A Chrome virtual authenticator verifies browser integration. It cannot prove
 * physical Face ID, Touch ID, iCloud synchronization, or nearby-device QR UI.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const https=require('node:https');
const {execFileSync}=require('node:child_process');
const {createHash,randomBytes}=require('node:crypto');
const {chromium}=require('playwright');
const {prepareProtectedSite}=require('./prepare-protected-site.cjs');
const root=path.resolve(__dirname,'..');
const {build}=require(path.join(root,'cloudflare/node_modules/esbuild'));
const {Miniflare,Log,LogLevel}=require(path.join(root,'cloudflare/node_modules/miniflare'));
const access={archiveId:'passkey-browser-fixture-v2',archiveKeyB64:randomBytes(32).toString('base64'),authOrigin:'https://united-passkey-fixture.workers.dev'};
const productionSite='https://bernie8026.github.io';
const apiHost=new URL(access.authOrigin).hostname;
const retiredPassword=randomBytes(32).toString('base64url');
const adminToken=randomBytes(32).toString('base64url');
const ipKey=randomBytes(32).toString('base64');
const clientIp='192.0.2.201';
const secrets=[access.archiveKeyB64,retiredPassword,adminToken,ipKey].filter(Boolean);
const sha=value=>createHash('sha256').update(value).digest('hex');
const events=[],errors=[],passed=[];
let server,mf,browser,temporary,siteOrigin,apiOrigin,base,outputRoot;
let context,page,cdp,authenticatorId;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
async function test(label,operation){await operation();passed.push(label);console.log('PASS '+label);}
async function gate(tab=page){
 await tab.locator('body[data-protected-gate]').waitFor();
 assert.equal(await tab.locator('input[type=password]').count(),0);
}
async function ready(tab=page){
 await tab.getByRole('heading',{name:'Private fixture content',exact:true}).waitFor();
}
async function unlocked(tab=page){return tab.locator('body[data-page]').count();}
async function lock(tab=page){
 await tab.locator('.site-lock,[data-portfolio-lock],[data-protected-lock],#portfolio-lock,#protected-lock').first().click();
 await gate(tab);
 // The worker schedules its cross-tab navigation 75ms after acknowledging LOCK.
 // Do not click through the first gate while that navigation can still replace it.
 await tab.waitForTimeout(200);
 await tab.waitForLoadState('domcontentloaded');
 await tab.locator('#passkey-button:enabled').waitFor();
}
async function call(route,{body,method,admin=false}={}){
 const response=await mf.dispatchFetch(apiOrigin+route,{
  method:method||(body===undefined?'GET':'POST'),
  headers:{Origin:siteOrigin,'CF-Connecting-IP':clientIp,...(body===undefined?{}:{'Content-Type':'application/json'}),...(admin?{Authorization:'Bearer '+adminToken}:{})},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 return {status:response.status,value:await response.json()};
}
async function ipStatus(){return (await call('/v1/status')).value;}
async function invitation(){
 const reply=await call('/v1/admin/passkeys/invitations',{admin:true,body:{}});
 assert.equal(reply.status,200,'test owner can create a one-use invitation');
 assert(reply.value.ok&&typeof reply.value.token==='string');
 secrets.push(reply.value.token);return reply.value.token;
}
async function listCredentials(){
 const result=await call('/v1/admin/passkeys',{admin:true});assert.equal(result.status,200);return result.value.credentials;
}
async function waitError(tab=page){
 await tab.locator('#gate-status[data-kind=error]').waitFor();
 await tab.locator('#gate-loading').waitFor({state:'hidden'});
 assert.equal(await unlocked(tab),0);
}
async function storageAudit(tab=page){
 const state=await tab.evaluate(async()=>({
  values:[...Object.values(localStorage),...Object.values(sessionStorage)],
  caches:await caches.keys(),databases:await indexedDB.databases()
 }));
 assert(!secrets.some(secret=>state.values.some(value=>value.includes(secret))),'credentials and archive keys never enter browser storage');
 assert(!state.values.some(value=>/"privateKey"|"authenticatorData"|"attestationObject"/.test(value)),'WebAuthn responses are not persisted');
 assert.deepEqual(state.caches,[]);assert.deepEqual(state.databases,[]);
}
async function createContext(options={}){
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},...options});
 ctx.on('page',tab=>{
  tab.on('pageerror',()=>errors.push('uncaught_browser_error'));
  tab.on('response',response=>{
   const url=new URL(response.url());
   if(url.origin===apiOrigin)events.push({path:url.pathname,status:response.status()});
  });
 });
 return ctx;
}
async function start(){
 temporary=await fsp.mkdtemp(path.join(fs.realpathSync(os.tmpdir()),'lunarvow-passkeys-'));
 const sourceRoot=path.join(temporary,'source');
 outputRoot=path.join(temporary,'encrypted');
 fs.mkdirSync(sourceRoot);
 fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html lang="en"><head><title>Local fixture</title></head><body data-page="index"><main><h1>Private fixture content</h1></main><footer class="footer-links"></footer></body></html>');
 prepareProtectedSite({sourceRoot,outputRoot,accessConfig:access,basePath:'/lunarvow-united/'});
 const keyFile=path.join(temporary,'tls-key.pem'),certFile=path.join(temporary,'tls-cert.pem');
 execFileSync('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=bernie8026.github.io'],{stdio:'ignore'});
 fs.chmodSync(keyFile,0o600);
 server=https.createServer({key:fs.readFileSync(keyFile),cert:fs.readFileSync(certFile)},async(req,res)=>{
  try{
   const host=(req.headers.host||'').split(':')[0];
   if(host===apiHost){
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413).end();return;}chunks.push(chunk);}
    const headers=new Headers();
    for(const [name,value]of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
    headers.set('CF-Connecting-IP',clientIp);
    const method=req.method||'GET';
    const response=await mf.dispatchFetch(apiOrigin+req.url,{method,headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   if(host!=='bernie8026.github.io'){res.writeHead(404).end();return;}
   const pathname=decodeURIComponent(new URL(req.url,siteOrigin).pathname);
   if(!pathname.startsWith('/lunarvow-united/')||pathname.includes('\\')||pathname.split('/').includes('..')){res.writeHead(404).end();return;}
   const relative=pathname.slice('/lunarvow-united/'.length)||'index.html';
   const filename=path.resolve(outputRoot,relative);
   if(!filename.startsWith(outputRoot+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404).end();return;}
   let body=fs.readFileSync(filename);
   if(relative.endsWith('.html'))body=Buffer.from(body.toString('utf8').split(access.authOrigin).join(apiOrigin));
   res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':body.length});
   res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(503,{'Content-Type':'application/json'}).end('{"ok":false,"code":"test_service_error"}');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=server.address().port;
 siteOrigin=productionSite+':'+port;apiOrigin=access.authOrigin+':'+port;base=siteOrigin+'/lunarvow-united/';
 const built=await build({entryPoints:[path.join(root,'cloudflare/auth-worker.mjs')],bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],write:false,logLevel:'silent'});
 let worker=built.outputFiles[0].text;
 assert(worker.includes(productionSite),'compiled Worker has the exact expected-origin guard');
 worker=worker.split(productionSite).join(siteOrigin);
 mf=new Miniflare({name:'lunarvow-passkey-browser',modules:true,script:worker,compatibilityDate:'2026-07-30',
  durableObjects:{IP_GUARD:{className:'IpAttemptGuard',useSQLite:true},PASSKEYS:{className:'PasskeyRegistry',useSQLite:true}},
  bindings:{SITE_ORIGIN:siteOrigin,ARCHIVE_ID:access.archiveId,ARCHIVE_KEY_B64:access.archiveKeyB64,IP_HMAC_KEY_B64:ipKey,ADMIN_TOKEN_SHA256:sha(adminToken)},log:new Log(LogLevel.NONE)});
 await mf.ready;
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true,args:[
  '--no-proxy-server','--ignore-certificate-errors',
  '--host-resolver-rules=MAP bernie8026.github.io 127.0.0.1,MAP '+apiHost+' 127.0.0.1,MAP * ~NOTFOUND'
 ]});
 context=await createContext();page=await context.newPage();
 cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable',{enableUI:false});
 ({authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',ctap2Version:'ctap2_1',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true,defaultBackupEligibility:true,defaultBackupState:true}}));
 await page.goto(base+'index.html?lang=zh-HK',{waitUntil:'domcontentloaded'});await gate();
 await page.locator('#passkey-button:enabled').waitFor();
}
async function main(){
 await start();
 await test('Passkey is the only login control and waits for a click',async()=>{
  assert(await page.locator('#passkey-button').isVisible());
  assert(!events.some(event=>event.path.includes('/passkeys/auth/')),'no authentication prompt or challenge is requested before a click');
  const retired=await call('/v1/unlock',{body:{archiveId:access.archiveId,password:retiredPassword}});
  assert.equal(retired.status,410);assert.equal(retired.value.code,'passkey_required');assert(!('key' in retired.value));
 });
 await test('An empty registry cannot unlock the site',async()=>{
  await page.locator('#passkey-button').click();
  await waitError();
  assert(await page.locator('#passkey-button').isEnabled());
  assert(!events.some(event=>event.path==='/v1/passkeys/auth/verify'));
 });
 await test('Owner invitation creates a discoverable credential with real browser attestation',async()=>{
  const authStarts=events.filter(event=>event.path==='/v1/passkeys/auth/options').length;
  const token=await invitation();await page.goto(base+'unlock.html?lang=zh-HK#passkey-setup='+encodeURIComponent(token));await gate();
  await page.locator('#passkey-register-button:enabled').waitFor();
  assert.equal(new URL(page.url()).hash,'','one-use invitation leaves the URL immediately');
  const before=events.filter(event=>event.path==='/v1/passkeys/register/options').length;
  const verified=page.waitForResponse(response=>new URL(response.url()).pathname==='/v1/passkeys/register/verify'&&response.status()===200);
  await page.locator('#passkey-register-button').click();
  await verified;
  await page.locator('#gate-loading').waitFor({state:'hidden'});
  assert.equal(await unlocked(),0,'enrollment does not launch a second prompt or disclose content');
  assert.equal(events.filter(event=>event.path==='/v1/passkeys/register/options').length-before,1);
  assert.equal(events.filter(event=>event.path==='/v1/passkeys/auth/options').length,authStarts,'registration never starts an unsolicited authentication prompt');
  const registered=await listCredentials();assert.equal(registered.length,1);
  const virtual=await cdp.send('WebAuthn.getCredentials',{authenticatorId});
  assert.equal(virtual.credentials.length,1);assert.equal(virtual.credentials[0].rpId,'bernie8026.github.io');assert(virtual.credentials[0].isResidentCredential);
  if(virtual.credentials[0].privateKey)secrets.push(virtual.credentials[0].privateKey);
  assert(!page.url().includes(token));await storageAudit();
 });
 await test('Discoverable Passkey assertion unlocks actual encrypted content and prevents duplicate clicks',async()=>{
  const before=events.filter(event=>event.path==='/v1/passkeys/auth/options').length;
  await page.locator('#passkey-button').click();
  await page.locator('#passkey-button').evaluate(button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  await ready();assert.equal(events.filter(event=>event.path==='/v1/passkeys/auth/options').length-before,1);
  assert(events.some(event=>event.path==='/v1/passkeys/auth/verify'&&event.status===200));
  assert(await page.locator('main h1').isVisible());await storageAudit();
  const token=await invitation(), invitePage=await context.newPage();
  await invitePage.goto(base+'unlock.html#passkey-setup='+encodeURIComponent(token));await gate(invitePage);
  await invitePage.locator('#passkey-register-button:enabled').waitFor();
  assert.equal(await unlocked(invitePage),0,'the dedicated owner gate still opens during an existing session');
  await invitePage.close();await lock();
 });
 await test('All seven languages include Passkey controls and fit the mobile gate',async()=>{
  for(const locale of ['zh-HK','en','zh-CN','ja','ko','th','ru']){
   await page.locator(`[data-gate-language="${locale}"]`).click();
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   const text=await page.locator('#passkey-button').textContent();assert(text.trim()&&!text.includes('undefined'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  }
  await page.locator('[data-gate-language="zh-HK"]').click();
 });
 await test('Cancellation returns to the gate without counting an incorrect password',async()=>{
  const before=(await ipStatus()).failures;
  await page.evaluate(()=>{
   const original=navigator.credentials.get.bind(navigator.credentials);
   navigator.credentials.get=function(options){navigator.credentials.get=original;return Promise.reject(new DOMException('Test cancellation','NotAllowedError'));};
  });
  await page.locator('#passkey-button').click();
  await page.locator('#gate-loading').waitFor({state:'hidden'});
  await page.locator('#passkey-button:enabled').waitFor();assert.equal(await unlocked(),0);
  assert.equal((await ipStatus()).failures,before);assert.equal(await page.locator('input[type=password]').count(),0);
 });
 await test('An assertion without user verification is denied without releasing the site',async()=>{
  const before=(await ipStatus()).failures;
  await cdp.send('WebAuthn.setResponseOverrideBits',{authenticatorId,isBadUV:true});
  try{await page.locator('#passkey-button').click();await waitError();assert.equal((await ipStatus()).failures,before);}
  finally{await cdp.send('WebAuthn.setResponseOverrideBits',{authenticatorId});}
 });
 await test('A valid Passkey can be retried after cancellation or rejected user verification',async()=>{
  await page.locator('#passkey-button').click();await ready();await storageAudit();await lock();
 });
 await test('Revoked credentials stop authenticating immediately',async()=>{
  const registered=await listCredentials();assert.equal(registered.length,1);
  const revoked=await call('/v1/admin/passkeys/revoke',{admin:true,body:{credentialId:registered[0].id}});assert.equal(revoked.status,200);
  await page.locator('#passkey-button').click();await waitError();assert.equal((await ipStatus()).failures,0);
 });
 await test('Unsupported browsers remain locked and do not offer a password fallback',async()=>{
  const unsupported=await createContext();
  try{
   await unsupported.addInitScript(()=>{Object.defineProperty(window,'PublicKeyCredential',{configurable:true,value:undefined});});
   const tab=await unsupported.newPage();await tab.goto(base+'index.html?lang=en');await gate(tab);
   const button=tab.locator('#passkey-button');assert(!await button.isVisible()||await button.isDisabled());
   assert.equal(await unlocked(tab),0);await storageAudit(tab);
  }finally{await unsupported.close();}
 });
 await test('Owner can issue a recovery invitation after revocation without a password binding',async()=>{
  const token=await invitation();
  await page.goto(base+'unlock.html#passkey-setup='+encodeURIComponent(token));await gate();
  await page.locator('#passkey-register-button:enabled').waitFor();
  assert.equal(await unlocked(),0);
 });
 assert.deepEqual(errors,[],'no uncaught browser errors');
 console.log(JSON.stringify({passed:passed.length,authentication:'real Chrome virtual authenticator + SimpleWebAuthn verifier + workerd SQLite',productionCalls:0,physicalAppleDevice:'not exercised'}));
}
main().catch(async error=>{
 let text=String(error?.stack||error);for(const secret of secrets)text=text.split(secret).join('[REDACTED]');
 // DOM screenshots, network traces and credential request/response bodies are never recorded.
 if(page&&!page.isClosed()){
  const gate=await page.evaluate(()=>({privatePage:!!document.body.dataset.page,statusKind:document.querySelector('#gate-status')?.dataset.kind,loadingPhase:document.querySelector('#gate-loading')?.dataset.phase,loadingHidden:document.querySelector('#gate-loading')?.hidden,passkeyDisabled:document.querySelector('#passkey-button')?.disabled})).catch(()=>null);
  console.error(JSON.stringify({lastRequests:events.slice(-10),gate}));
 }
 console.error(text);process.exitCode=1;
}).finally(async()=>{
 await browser?.close();await mf?.dispose();server?.closeAllConnections();
 if(server)await new Promise(resolve=>server.close(resolve));if(temporary)await fsp.rm(temporary,{recursive:true,force:true});
});
