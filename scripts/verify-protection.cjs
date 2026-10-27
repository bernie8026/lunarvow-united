/* Exercise the encrypted deployment through a real browser, without recording secrets. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,process.env.PORTFOLIO_PASSWORD_FILE||'../lunarvow-private/access-password.txt'),'utf8').trim();
const snapshot=path.resolve(root,process.env.PORTFOLIO_SOURCE_DIR||'../lunarvow-private/before-protection-3c1dd71/docs');
const names=['index','about','experience','education','skills','projects','contact','sitemap'];
const route=name=>new URL(`${name}.html?lang=zh-HK`,base).href;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const results=[];
const errors=[];
let browser;
function filesIn(directory,prefix=''){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?filesIn(path.join(directory,entry.name),prefix+entry.name+'/'):[prefix+entry.name]);
}
async function test(label,operation){await operation();results.push(label);console.log('PASS '+label);}
function cleanError(error){return String(error?.stack||error).split(password).join('[REDACTED]');}
async function closed(page){
  await page.waitForFunction(()=>!!document.querySelector('input[type="password"]')&&!document.querySelector('body[data-page] main#main'),null,{timeout:15000});
  await assert.doesNotReject(()=>page.locator('input[type="password"]').waitFor({state:'visible'}));
}
async function ready(page,name){
  await page.waitForFunction(name=>document.body?.dataset.page===name&&!!document.querySelector('main#main')&&
    !document.querySelector('.boot-screen')&&!document.body.classList.contains('is-booting')&&
    !document.querySelector('main#main').inert&&document.documentElement.dataset.navigationState==='idle',name,{timeout:25000});
}
async function submit(page,secret){
  const input=page.locator('input[type="password"]');
  await input.waitFor({state:'visible'});
  // Enter through the DOM to keep Playwright locator diagnostics free of passwords.
  await input.evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},secret);
  await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
}
async function unlock(page,name='index'){
  await page.goto(route(name),{waitUntil:'domcontentloaded'});
  await closed(page);
  await submit(page,password);
  await ready(page,name);
}
async function newContext(options={}){
  const context=await browser.newContext({viewport:{width:1440,height:900},...options});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  return context;
}
async function assertFit(page){
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(dimensions.scroll<=dimensions.width+2,'viewport must not overflow horizontally');
}
async function storageAudit(page){
  const state=await page.evaluate(async()=>{
    const values=[];
    for(const storage of [localStorage,sessionStorage])for(let i=0;i<storage.length;i++)values.push([storage.key(i),storage.getItem(storage.key(i))]);
    const databases=typeof indexedDB.databases==='function'?await indexedDB.databases():[];
    const cached=[];
    for(const name of await caches.keys()){
      const cache=await caches.open(name);
      for(const request of await cache.keys()){
        const response=await cache.match(request);
        cached.push({url:request.url,type:response.headers.get('content-type')||'',body:await response.clone().text()});
      }
    }
    return {values,databases:databases.map(db=>db.name),cached};
  });
  for(const [key,value]of state.values){
    assert(!value?.includes(password),'persistent storage must not contain the password');
    assert(!/password|decrypted|aes[-_]?key|archive[-_]?files/i.test(key),'persistent storage must not contain a credential or decrypted archive key');
    assert(!/<main\b|"files"\s*:\s*\[/.test(value||''),'storage must not contain plaintext portfolio content');
  }
  assert.deepEqual(state.databases,[],'the encrypted portfolio does not persist a decrypted IndexedDB database');
  for(const entry of state.cached){
    assert(!entry.body.includes(password),'CacheStorage must not contain the password');
    assert(!/<main\b|"files"\s*:\s*\[/.test(entry.body),'CacheStorage must not contain plaintext portfolio content');
    assert(!/\/assets\//.test(new URL(entry.url).pathname),'private assets must not be persisted in CacheStorage');
  }
}
async function lock(page){
  const button=page.locator('.site-lock, [data-portfolio-lock], [data-protected-lock], #portfolio-lock, #protected-lock').first();
  if(await button.count())await button.click();
  else await page.getByRole('button',{name:/鎖定|lock portfolio|lock site|登出|log out/i}).first().click();
  await closed(page);
}
async function main(){
  assert(password.length>=12,'test password file must exist and contain a strong password');
  const envelope=JSON.parse(fs.readFileSync(path.join(root,'docs/protected-site.json'),'utf8'));
  let archive;
  await test('Authenticated archive, complete source coverage and clean public deployment',async()=>{
    assert.equal(envelope.version,1);assert.equal(envelope.kdf,'PBKDF2-SHA-256');assert.equal(envelope.iterations,600000);assert.equal(envelope.compression,'gzip');
    const salt=Buffer.from(envelope.salt,'base64'),iv=Buffer.from(envelope.iv,'base64'),ciphertext=Buffer.from(envelope.ciphertext,'base64');
    assert.equal(salt.length,32);assert.equal(iv.length,12);assert(ciphertext.length>16);
    const key=crypto.pbkdf2Sync(password,salt,envelope.iterations,32,'sha256');
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(ciphertext.subarray(-16));
    archive=JSON.parse(zlib.gunzipSync(Buffer.concat([decipher.update(ciphertext.subarray(0,-16)),decipher.final()])).toString('utf8'));
    assert.equal(archive.version,1);assert(Array.isArray(archive.files));
    const encrypted=new Map(archive.files.map(file=>[file.path,file]));
    assert.equal(encrypted.size,archive.files.length,'archive paths must be unique');
    for(const file of archive.files){assert(!file.path.startsWith('/')&&!file.path.split('/').includes('..'),'archive paths stay inside its deployment');assert(file.type);assert.equal(typeof file.data,'string');}
    for(const name of filesIn(snapshot).filter(name=>name!=='.nojekyll')){
      const entry=encrypted.get(name);assert(entry,'archive must cover each original snapshot path');
      // Session checks may be inserted into HTML and runtime files. Original imagery is immutable.
      if(/\.(png|jpe?g|webp|woff2?|svg)$/i.test(name))assert.equal(sha(Buffer.from(entry.data,'base64')),sha(fs.readFileSync(path.join(snapshot,name))),'original visual assets survive encryption');
    }
    for(const file of filesIn(path.join(root,'docs'))){
      assert(file.endsWith('.html')||['protected-worker.js','protected-unlock.js','protected-session.js','protected-site.json','robots.txt','.nojekyll'].includes(file),'public deployment contains only gate runtime, ciphertext and shell routes');
      assert(!/\.(?:zip|tar|gz|map|bak|password)$/i.test(file),'deployment has no plaintext backup, source map, or password artifact');
      if(!encrypted.has(file)||file==='.nojekyll')continue;
      if(file==='robots.txt'){assert.equal(fs.readFileSync(path.join(root,'docs',file),'utf8'),'User-agent: *\nDisallow: /\n');continue;}
      assert(file.endsWith('.html'),'a private asset must not also be published as a plaintext file');
      const html=fs.readFileSync(path.join(root,'docs',file),'utf8');
      assert(/type=["']password["']/.test(html),'all former HTML routes serve the password gate');
      assert(!/data-page=["'](?:index|about|skills)["']|id=["']main["']/.test(html),'gate HTML does not embed private content');
    }
    const corrupted=Buffer.from(ciphertext);corrupted[0]^=1;
    const broken=crypto.createDecipheriv('aes-256-gcm',key,iv);broken.setAuthTag(corrupted.subarray(-16));
    assert.throws(()=>{broken.update(corrupted.subarray(0,-16));broken.final();},'tampering must fail authentication');
    key.fill(0);
  });
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await newContext();const page=await context.newPage();
  try{
    await test('All direct routes and private assets are closed before unlock',async()=>{
      for(const name of names){
        const response=await context.request.get(route(name));assert.equal(response.status(),200);
        const body=await response.text();assert(/type=["']password["']/.test(body));assert(!/<main\b[^>]*id=["']main["']/.test(body));
      }
      for(const name of ['assets/site.css','assets/content.js','assets/identity.webp','assets/education/sfu-campus.jpg','assets/preload-manifest.json','lunarvow/news.html']){
        const response=await context.request.get(new URL(name,base).href);
        assert(response.status()===404||response.status()===403||(/\.html$/.test(name)&&/type=["']password["']/.test(await response.text())),'network does not expose original assets or legacy HTML');
      }
      await page.goto(route('about'));await closed(page);
      const privateResponse=await page.evaluate(async url=>{const response=await fetch(url);return{status:response.status,type:response.headers.get('content-type')};},new URL('assets/content.js',base).href);
      assert([401,403,404].includes(privateResponse.status),'locked worker does not expose a private script');
    });
    await test('Wrong password remains locked with a useful error',async()=>{
      await submit(page,'incorrect-password-for-integration-test');
      await page.waitForFunction(()=>{const field=document.querySelector('input[type=password]');return field&&!field.disabled&&!!document.querySelector('#gate-status[data-kind=error]')?.textContent.trim();},null,{timeout:15000});
      await closed(page);
    });
    await test('Correct password restores the requested page and first-load animation',async()=>{
      await page.addInitScript(()=>{
        window.__protectedIntro=[];
        const record=node=>{if(node instanceof Element&&node.matches('.boot-screen'))window.__protectedIntro.push({mode:node.dataset.mode,phase:node.dataset.phase});};
        new MutationObserver(changes=>changes.forEach(change=>change.addedNodes.forEach(record))).observe(document,{subtree:true,childList:true});
      });
      await submit(page,password);await ready(page,'about');
      assert(await page.locator('main h1').isVisible());
      const seen=await page.evaluate(()=>window.__protectedIntro||[]);
      // Unlock may replace the gate document; body/session observations cover that path.
      assert(seen.some(item=>item.mode==='intro'),'unlock preserves the first-load animation');
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('bernie-portfolio-arrival-v2')),'complete');
    });
    await test('Every encrypted page renders with styles and decoded local imagery',async()=>{
      for(const name of names){
        await page.goto(route(name),{waitUntil:'domcontentloaded'});await ready(page,name);
        assert(await page.locator('main h1').isVisible(),`${name} heading is visible`);
        assert(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor!=='rgba(0, 0, 0, 0)'),'portfolio styles are loaded');
        const images=await page.locator('main img').evaluateAll(images=>images.filter(image=>image.currentSrc&&!image.currentSrc.startsWith('data:')).every(image=>image.complete&&image.naturalWidth>0));
        assert(images,`${name} imagery decoded before reveal`);await assertFit(page);
      }
    });
    await test('Private worker responses match archive bytes and prevent browser caching',async()=>{
      const selected=archive.files.filter(file=>['assets/site.css','assets/content.js','assets/identity.webp','assets/equipment/nikon-d5300.jpg'].includes(file.path));
      assert.equal(selected.length,4);
      for(const file of selected){
        const result=await page.evaluate(async url=>{const response=await fetch(url);const data=await response.arrayBuffer();return{status:response.status,type:response.headers.get('content-type'),cache:response.headers.get('cache-control'),hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(byte=>byte.toString(16).padStart(2,'0')).join('')};},new URL(file.path,base).href);
        assert.equal(result.status,200);assert.equal(result.hash,sha(Buffer.from(file.data,'base64')));assert(result.type);assert(/no-store/.test(result.cache||''));
      }
      await storageAudit(page);
    });
    await test('Soft navigation and all three language controls survive unlocking',async()=>{
      await page.goto(route('index'));await ready(page,'index');
      const token=await page.evaluate(()=>window.__protectedDocumentToken=Math.random());
      await page.locator('.main-nav > a[href*="about.html"]').click();await ready(page,'about');
      assert.equal(await page.evaluate(()=>window.__protectedDocumentToken),token,'internal links retain the soft-navigation document');
      for(const language of ['en','zh-CN','zh-HK']){
        await page.locator(`[data-language="${language}"]`).click();
        await page.waitForFunction(language=>document.documentElement.lang===language,language);
        assert.equal(await page.locator(`[data-language="${language}"]`).getAttribute('aria-pressed'),'true');
        await assertFit(page);
      }
    });
    await test('Mobile unlock, navigation and long pages fit the screen',async()=>{
      await page.setViewportSize({width:390,height:844});
      for(const name of ['education','skills','contact']){await page.goto(route(name));await ready(page,name);await assertFit(page);}
      await page.setViewportSize({width:1440,height:900});
    });
    await test('Logout closes every open tab and browser back cannot recover content',async()=>{
      const second=await context.newPage();await second.goto(route('education'));await ready(second,'education');
      await page.goto(route('about'));await ready(page,'about');
      // Use separate documents here so Back also exercises retained/BFCache pages.
      await page.goto(route('experience'));await ready(page,'experience');
      await lock(page);await closed(second);
      await page.goBack({waitUntil:'domcontentloaded'});await closed(page);
      assert.equal(await page.locator('body[data-page]').count(),0);
      await storageAudit(page);await second.close();
    });
    await test('A fresh browser session and JavaScript-disabled page remain locked',async()=>{
      for(const options of [{},{javaScriptEnabled:false}]){
        const fresh=await newContext(options);const tab=await fresh.newPage();
        await tab.goto(route('skills'));await closed(tab);
        assert.equal(await tab.locator('body[data-page]').count(),0);
        await fresh.close();
      }
    });
    await test('Worker memory loss gracefully returns to the password gate',async()=>{
      await unlock(page,'skills');
      const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');await cdp.send('ServiceWorker.stopAllWorkers');
      await page.locator('.main-nav > a[href*="about.html"]').click();await closed(page);
      await submit(page,password);await ready(page,'skills');
      await storageAudit(page);await cdp.detach();
    });
    assert.deepEqual([...new Set(errors)],[],'protected portfolio has no uncaught browser errors');
    console.log(JSON.stringify({passed:results.length,encryptedFiles:archive.files.length,base:base.href}));
  }finally{await context.close();await browser.close();}
}
main().catch(async error=>{console.error(cleanError(error));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
