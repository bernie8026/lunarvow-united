'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,'../lunarvow-private/access-password.txt'),'utf8').trim();
const output=path.join(root,'.private/footer-directory-qa');
const errors=[];let browser,passed=0;
async function ready(page,name){await page.waitForFunction(name=>document.body.dataset.page===name&&!document.body.classList.contains('is-booting')&&!document.querySelector('.boot-screen')&&document.documentElement.dataset.navigationState==='idle',name,{timeout:90000});}
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
async function fit(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');}
(async()=>{
 fs.mkdirSync(output,{recursive:true,mode:0o700});browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL('index.html?lang=zh-HK',base).href,{waitUntil:'domcontentloaded'});
  await page.locator('input[type=password]').fill(password);await page.locator('form button[type=submit]').click();await ready(page,'index');
  await test('The same grouped footer and original direct 05 link survive all eleven routes',async()=>{
   for(const name of ['index','about','experience','education','skills','projects','photography','equipment','stem','contact','sitemap']){
    if(name!=='index'){await page.locator(`.footer-directory a[href*="${name}.html"]`).first().click();await ready(page,name);}
    assert.equal(await page.locator('.footer-directory').count(),1);assert.equal(await page.locator('.footer-directory-group').count(),5);
    assert.equal(await page.locator('.footer-directory li a').count(),19);assert.equal(await page.locator('.main-nav > a').count(),8);
    assert.equal(await page.locator('.project-nav-toggle,.project-subnav').count(),0);await fit(page);
   }
   await page.locator('.main-nav > a[href*="projects.html"]').hover();await page.waitForTimeout(350);
   assert.equal(new URL(page.url()).pathname.split('/').pop(),'sitemap.html','hover does not navigate');
   await page.locator('.main-nav > a[href*="projects.html"]').click();await ready(page,'projects');assert.equal(new URL(page.url()).hash,'');
   assert.equal(await page.locator('.masthead').evaluate(n=>Math.round(n.getBoundingClientRect().width)),68);
  });
  await test('All languages translate the directory and preserve destination language',async()=>{
   for(const lang of ['zh-HK','en','zh-CN','ja','ko','th','ru']){
    await page.locator(`[data-language="${lang}"]`).click();
    assert(await page.locator('.footer-directory [data-i18n]').evaluateAll(nodes=>nodes.every(n=>n.textContent===window.PORTFOLIO_TEXT[n.dataset.i18n][document.documentElement.lang])));
    for(const href of await page.locator('.footer-directory a[data-internal]').evaluateAll(nodes=>nodes.map(n=>n.href)))assert.equal(new URL(href).searchParams.get('lang'),lang);
    await fit(page);
   }
   await page.locator('[data-language="zh-HK"]').click();
  });
  await test('Footer deep links reveal real sections through the existing page transitions',async()=>{
   for(const [name,hash] of [['equipment','#camera-specs'],['equipment','#flash'],['stem','#drone-reference'],['experience','#shift'],['about','#about-approach-title']]){
    await page.locator(`.footer-directory a[href*="${name}.html"][href$="${hash}"]`).click();await ready(page,name);
    assert.equal(new URL(page.url()).hash,hash);assert(await page.locator(hash).isVisible());
    const y=await page.locator(hash).evaluate(n=>n.getBoundingClientRect().top);assert(y>=-2&&y<960,'target is in view');
   }
  });
  await test('Desktop, tablet and mobile show readable columns in both themes',async()=>{
   for(const width of [1440,1024,820,390,360]){
    await page.setViewportSize({width,height:960});await page.locator('.footer-directory').scrollIntoViewIfNeeded();
    const columns=await page.locator('.footer-directory').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width>900?5:width>600?3:2);await fit(page);
    assert(await page.locator('.footer-directory a').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)));
    await page.screenshot({path:path.join(output,'footer-'+width+'.png'),fullPage:false});
   }
   await page.setViewportSize({width:1440,height:960});await page.locator('.theme-toggle').click();await page.locator('.footer').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(output,'footer-other-theme.png'),fullPage:false});await fit(page);
   await page.keyboard.press('Tab');await page.locator('.footer-directory a').first().focus();assert.equal(await page.locator('.footer-directory a').first().evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
  });
  assert.deepEqual([...new Set(errors)],[]);console.log(JSON.stringify({passed,output}));
 }finally{await browser.close();}
})().catch(async error=>{console.error(String(error.stack||error).split(password).join('[REDACTED]'));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
