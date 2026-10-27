'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/';
const password=fs.readFileSync(path.resolve(root,'../lunarvow-private/access-password.txt'),'utf8').trim();
const output=path.join(root,'.private/project-drawer-qa'),errors=[];let browser,passed=0;
async function test(name,fn){if(process.env.PROJECT_DRAWER_FILTER&&!new RegExp(process.env.PROJECT_DRAWER_FILTER,'i').test(name))return;await fn();passed++;console.log('PASS '+name);}
async function ready(page,name){await page.waitForFunction(name=>document.body.dataset.page===name&&!document.body.classList.contains('is-booting')&&!document.querySelector('.boot-screen')&&document.documentElement.dataset.navigationState==='idle',name,{timeout:45000});}
async function open(page){if(!await page.locator('.project-subnav').isVisible())await page.locator('.project-nav-toggle').click();await page.locator('.project-subnav').waitFor({state:'visible'});await page.waitForFunction(()=>innerWidth<=1000||parseFloat(getComputedStyle(document.body).paddingLeft)>=347);await page.waitForTimeout(320);}
async function close(page){if(await page.locator('.project-subnav').isVisible()){await page.keyboard.press('Escape');await page.waitForTimeout(300);}}
async function fit(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');}
(async()=>{
 fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
 const ctx=await browser.newContext({viewport:{width:1440,height:960}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'projects.html?lang=zh-HK',{waitUntil:'domcontentloaded'});
  await page.locator('#site-password').evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));},password);
  await page.locator('#unlock-button').click();await ready(page,'projects');
  await page.locator('.theme-toggle').click();
  await test('Desktop opens a full-height second column and reserves space before the page title',async()=>{
   await page.locator('.main-nav > a[href*="projects.html"]').hover();await page.locator('.project-subnav').waitFor({state:'visible'});await page.waitForTimeout(320);
   const rect=await page.locator('.project-subnav').boundingBox(),title=await page.locator('main h1').boundingBox();
   assert.equal(rect.x,68);assert.equal(rect.y,0);assert.equal(rect.height,960);assert.equal(rect.width,280);assert(title.x>=rect.x+rect.width);
   assert.equal(await page.locator('.project-subnav').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(242, 248, 252)');
   await page.screenshot({path:path.join(output,'desktop-light.png')});await close(page);
   await page.locator('.theme-toggle').click();await open(page);await page.screenshot({path:path.join(output,'desktop-dark.png')});await close(page);
  });
  await test('Pinned disclosure, explicit close and keyboard anchors preserve navigation',async()=>{
   await page.locator('.main-nav > a[href*="projects.html"]').hover();await page.locator('.project-nav-toggle').click();await page.mouse.move(1200,500);await page.waitForTimeout(400);
   assert(await page.locator('.project-subnav').isVisible());await page.locator('.project-subnav-close').click();assert(await page.locator('.project-subnav').isHidden());
   assert(await page.locator('.project-nav-toggle').evaluate(n=>n===document.activeElement));
   await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');await ready(page,'projects');assert.equal(new URL(page.url()).hash,'#camera-specs');
   assert(!await page.locator('body').evaluate(n=>n.classList.contains('has-project-menu-open')));
  });
  await test('All eight pages fit with the second column open at desktop and narrow desktop widths',async()=>{
   for(const width of [1440,1024,1001]){
    await page.setViewportSize({width,height:900});
    for(const name of ['index','about','experience','education','skills','projects','contact','sitemap']){
     await close(page);
     if(name==='index')await page.locator('.brand').click();
     else if(['contact','sitemap'].includes(name))await page.locator(`.footer-links > a[href*="${name}.html"]`).click();
     else await page.locator(`.main-nav > a[href*="${name}.html"]`).click();
     await ready(page,name);await open(page);await fit(page);
     const main=await page.locator('main').boundingBox();assert(main.x>=347,`${name} at ${width}: main starts ${main.x}, padding ${await page.locator('body').evaluate(n=>getComputedStyle(n).paddingLeft)}`);
     assert.equal(await page.locator('.project-subnav-masthead').count(),1);
    }
    console.log('FIT '+width);
   }
  });
  await test('Seven languages and mobile inline hierarchy fit without a floating card',async()=>{
   for(const width of [390,360]){
    await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));
    await page.locator('.menu-toggle').click();await open(page);
    for(const lang of ['zh-HK','en','zh-CN','ja','ko','th','ru']){
     await page.locator(`[data-language="${lang}"]`).click();await open(page);await fit(page);
     assert.equal(await page.locator('.project-subnav').evaluate(n=>getComputedStyle(n).position),'relative');
     assert.equal(await page.locator('body').evaluate(n=>parseFloat(getComputedStyle(n).paddingLeft)),0);
     const rect=await page.locator('.project-subnav').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width);
     for(const href of await page.locator('.project-subnav a').evaluateAll(ns=>ns.map(n=>n.href)))assert.equal(new URL(href).searchParams.get('lang'),lang);
    }
    await page.locator('[data-language="zh-HK"]').click();await open(page);await page.screenshot({path:path.join(output,'mobile-'+width+'.png')});
    await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');
   }
  });
  await test('Reduced motion and global pause avoid drawer movement',async()=>{
   await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
   assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');assert.equal(await page.locator('.project-subnav').evaluate(n=>getComputedStyle(n).animationName),'none');await close(page);
   await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.ambient-toggle').click();await open(page);
   assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await close(page);await page.locator('.ambient-toggle').click();
  });
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,output}));
 }finally{await ctx.close();await browser.close();}
})().catch(e=>{console.error(String(e.stack||e).split(password).join('[REDACTED]'));process.exitCode=1;});
