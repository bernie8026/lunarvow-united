/* Exercise the shared navigation against the encrypted publication. Never log its password. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const base = new URL(process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8766/lunarvow-united/');
const password = fs.readFileSync(path.resolve(root, process.env.PORTFOLIO_PASSWORD_FILE || '../lunarvow-private/access-password.txt'), 'utf8').trim();
const output = path.join(root, '.private', 'navigation-qa');
const routes = ['index','about','experience','education','skills','projects','photography','equipment','stem','contact','sitemap'];
const destinations = routes.slice(1,9), languages = ['zh-HK','en','zh-CN'];
const errors = [], results = [];
const pendingRequests = new Map();
let browser;
const route = (name='index',language='zh-HK') => new URL(`${name}.html?lang=${language}`,base).href;
const redact = error => String(error?.stack || error).split(password).join('[REDACTED]');
async function test(label,operation) { await operation(); results.push(label); console.log('PASS '+label); }
async function ready(page,name) {
  try {
    await page.waitForFunction(name => document.body?.dataset.page === name && !!document.querySelector('main#main') &&
      !document.querySelector('.boot-screen') && !document.body.classList.contains('is-booting') &&
      !document.querySelector('main#main').inert && document.documentElement.dataset.navigationState === 'idle',name,{timeout:30000});
  } catch (error) {
    const diagnostic = await page.evaluate(async () => {
      const boot=document.querySelector('.boot-screen'),main=document.querySelector('main#main');
      const controller=navigator.serviceWorker?.controller;
      let workerState=null;
      if(controller) workerState=await new Promise(resolve=>{
        const channel=new MessageChannel();
        const timer=setTimeout(()=>{channel.port1.close();resolve({error:'state-timeout'});},2000);
        channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve({ok:event.data?.ok,unlocked:event.data?.unlocked});};
        controller.postMessage({type:'STATE'},[channel.port2]);
      });
      return {
        path:location.pathname,language:document.documentElement.lang,viewport:{width:innerWidth,height:innerHeight},
        readyState:document.readyState,bodyPage:document.body?.dataset.page,bodyClasses:document.body?.className,
        rootClasses:document.documentElement.className,navigationState:document.documentElement.dataset.navigationState,
        main:!!main,inert:main?.inert,gate:!!document.querySelector('input[type="password"]'),
        gateStatus:document.querySelector('#gate-status')?.textContent.trim().slice(0,180),
        loader:boot?{mode:boot.dataset.mode,phase:boot.dataset.phase,progress:boot.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),status:boot.querySelector('.boot-screen__status')?.textContent}:null,
        controlled:!!controller,workerState,
        images:[...document.images].filter(image=>!image.complete||!image.naturalWidth).map(image=>new URL(image.currentSrc||image.src).pathname),
        media:[...document.querySelectorAll('video,audio')].map(media=>({path:media.currentSrc?new URL(media.currentSrc).pathname:null,readyState:media.readyState,networkState:media.networkState,paused:media.paused,error:media.error?.code})),
        recentResources:performance.getEntriesByType('resource').slice(-12).map(entry=>({path:new URL(entry.name).pathname,type:entry.initiatorType,duration:Math.round(entry.duration),status:entry.responseStatus}))
      };
    }).catch(captureError=>({captureError:captureError.message}));
    diagnostic.expectedPage=name;
    diagnostic.pendingRequests=[...pendingRequests].map(([request,started])=>({path:new URL(request.url()).pathname,type:request.resourceType(),elapsed:Date.now()-started}));
    diagnostic.errors=[...new Set(errors)];
    const stem='failure-'+Date.now()+'-'+name;
    fs.writeFileSync(path.join(output,stem+'.json'),JSON.stringify(diagnostic,null,2));
    await page.screenshot({path:path.join(output,stem+'.png'),timeout:5000,animations:'disabled'}).catch(()=>{});
    error.message+='\nNavigation readiness diagnostics: '+JSON.stringify(diagnostic);
    throw error;
  }
}
async function frames(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function unlock(page) {
  await page.goto(route(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => { const input=document.querySelector('input[type="password"]');return input && !input.disabled && !document.querySelector('body[data-page] main#main'); },null,{timeout:15000});
  await page.locator('input[type="password"]').evaluate((node,value) => { node.value=value;node.dispatchEvent(new Event('input',{bubbles:true})); },password);
  await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
  await ready(page,'index');
}
async function load(page,name,language='zh-HK') { await page.goto(route(name,language),{waitUntil:'domcontentloaded'});await ready(page,name);await frames(page); }
async function languageTo(page,language) {
  await page.locator(`[data-language="${language}"]`).click();
  await page.waitForFunction(language => document.documentElement.lang === language,language);
}
async function themeTo(page,theme) {
  if (await page.evaluate(() => document.body.dataset.theme) !== theme) await page.locator('.theme-toggle').click();
  await page.waitForFunction(theme => document.body.dataset.theme === theme,theme);await frames(page);
}
async function mountedOnce(page) {
  for (const selector of ['.masthead','#main-nav','.header-tools','.menu-toggle','main#main','.footer']) assert.equal(await page.locator(selector).count(),1,'one shared element: '+selector);
  for (const selector of ['.motion-replay','.ambient-toggle','.site-lock']) assert.equal(await page.locator('.footer-links '+selector).count(),1,'one footer control: '+selector);
}
async function linksAndState(page,name,language) {
  assert.equal(await page.evaluate(() => document.documentElement.lang),language);
  const links = await page.locator('.main-nav > a').evaluateAll(nodes => nodes.map(node => ({href:node.href,index:node.querySelector('.nav-index')?.textContent.trim(),label:node.lastElementChild?.textContent.trim(),current:node.getAttribute('aria-current'),key:node.lastElementChild?.dataset.i18n,expected:window.PORTFOLIO_TEXT?.[node.lastElementChild?.dataset.i18n]?.[document.documentElement.lang]})));
  assert.equal(links.length,8,'eight direct numbered chapter links are available');
  for (let index=0;index<links.length;index++) {
    const link=links[index],url=new URL(link.href);
    assert.equal(url.origin,base.origin);assert.equal(url.pathname,new URL(destinations[index]+'.html',base).pathname);
    assert.equal(url.searchParams.get('lang'),language,'chapter navigation retains locale');
    assert.equal(link.index,String(index+1).padStart(2,'0'));
    assert(link.label && link.label === link.expected,'chapter label uses the active translation');
    assert.equal(link.current,destinations[index]===name ? 'page' : null,'only the matching chapter is current');
    const accessible = await page.locator('.main-nav > a').nth(index).getAttribute('aria-label') || `${link.index} ${link.label}`;
    assert(accessible.includes(link.label),'chapter remains named for assistive technology');
  }
  assert.equal(await page.locator('.main-nav > a[aria-current="page"]').count(),destinations.includes(name)?1:0);
  assert.equal(await page.locator(`[data-language="${language}"]`).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.languages button[aria-pressed="true"]').count(),1);
  assert.equal(await page.locator('.brand').getAttribute('aria-current'),name==='index'?'page':null);
}
async function rectsAndControls(page,mobile=false) {
  const geometry = await page.evaluate(mobile => {
    const rect = node => { const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
    return {width:innerWidth,height:innerHeight,header:rect(document.querySelector('.masthead')),nav:rect(document.querySelector('.main-nav')),brand:rect(document.querySelector('.brand')),tools:rect(document.querySelector('.header-tools')),main:rect(document.querySelector('main#main')),padding:parseFloat(getComputedStyle(document.body).paddingLeft),position:getComputedStyle(document.querySelector('.masthead')).position,
      controls:[...document.querySelectorAll('.header-tools button'+(mobile?', .menu-toggle':''))].map(node=>({name:node.getAttribute('aria-label')||node.textContent.trim(),...rect(node)}))};
  },mobile);
  assert.equal(geometry.controls.length,mobile?9:8,'seven language choices, theme and mobile menu controls are available');
  for (const item of geometry.controls) {
    assert(item.width>0 && item.height>0,'navigation control is rendered: '+item.name);
    assert(item.x>=-1 && item.right<=geometry.width+1 && item.y>=-1 && item.bottom<=geometry.height+1,'navigation control is inside the viewport: '+item.name);
  }
  for (let i=0;i<geometry.controls.length;i++) for (let j=i+1;j<geometry.controls.length;j++) {
    const a=geometry.controls[i],b=geometry.controls[j];
    assert(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1 || Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,'navigation controls do not overlap: '+a.name+' / '+b.name);
  }
  return geometry;
}
async function rail(page,name,language='zh-HK') {
  await mountedOnce(page);await linksAndState(page,name,language);await page.mouse.move(150,5);await page.locator('main#main').focus();await frames(page);
  await page.locator('.theme-toggle').evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  const geometry=await rectsAndControls(page);
  assert.equal(geometry.position,'fixed','desktop uses a fixed left rail');assert.equal(geometry.header.x,0);assert.equal(geometry.header.y,0);
  assert.equal(geometry.header.width,68);assert.equal(geometry.header.height,geometry.height);assert.equal(geometry.padding,68);
  assert(geometry.main.x>=68-1,'main content clears the left rail');
  assert(geometry.brand.bottom<=geometry.nav.y,'logo and numbered links do not overlap');
  assert(geometry.nav.bottom<=geometry.tools.y,'numbered links and bottom controls do not overlap');
  assert.equal(await page.locator('.menu-toggle').isVisible(),false,'desktop menu button is hidden');
  const styles=await page.evaluate(() => {
    const selectors=['.masthead','.brand','.brand strong','.brand small','.main-nav','.main-nav .nav-index','.header-tools','.languages','.languages button','.theme-toggle'];
    const properties=['display','position','width','height','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','flexDirection','gap','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','borderRadius','backgroundColor','color','boxShadow'];
    return selectors.map(selector => {const node=document.querySelector(selector),style=getComputedStyle(node);return [selector,Object.fromEntries(properties.map(property=>[property,style[property]]))];});
  });
  // Index colour follows each page's current link, while the shared type/geometry remains identical.
  styles.find(([selector])=>selector==='.main-nav .nav-index')[1].color='current-page-dependent';
  // The footer tools use a flex auto margin. Compare their actual rectangle above,
  // rather than the browser's transient serialization of the resolved auto value.
  styles.find(([selector])=>selector==='.header-tools')[1].marginTop='auto';
  return {header:geometry.header,nav:geometry.nav,brand:geometry.brand,tools:geometry.tools,styles};
}
async function tooltips(page) {
  for (const link of await page.locator('.main-nav > a').all()) {
    const label=link.locator('span').last();
    await link.hover();await page.waitForFunction(node=>Number(getComputedStyle(node).opacity)>0.99,await label.elementHandle());
    assert(await label.evaluate(node=>node.getBoundingClientRect().left>=68 && node.getBoundingClientRect().width>0),'hover exposes the chapter name beside the rail');
    await page.mouse.move(150,5);await page.keyboard.press('Tab');await link.focus();
    await page.waitForFunction(node=>node.parentElement.matches(':focus-visible') && Number(getComputedStyle(node).opacity)>0.99,await label.elementHandle());
    assert((await label.textContent()).trim(),'keyboard focus exposes a named chapter');
  }
  await page.locator('main#main').focus();await page.mouse.move(150,5);
}
async function mobileMenu(page,name,language) {
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await frames(page);
  await mountedOnce(page);await linksAndState(page,name,language);
  const toggle=page.locator('.menu-toggle');assert(await toggle.isVisible(),'tablet/mobile has an expandable menu');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#main-nav').getAttribute('data-open'),'false');
  const geometry=await rectsAndControls(page,true);assert.equal(geometry.position,'sticky');assert.equal(geometry.padding,0);assert(geometry.header.width<=geometry.width+1);
  const brand=geometry.brand;for (const control of geometry.controls) assert(Math.min(brand.right,control.right)-Math.max(brand.x,control.x)<=1 || Math.min(brand.bottom,control.bottom)-Math.max(brand.y,control.y)<=1,'brand does not overlap navigation controls');
  await toggle.click();await page.waitForFunction(()=>document.querySelector('.menu-toggle')?.getAttribute('aria-expanded')==='true');
  const openLinks=await page.locator('.main-nav > a').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,text:node.lastElementChild.textContent.trim(),opacity:getComputedStyle(node.lastElementChild).opacity};}));
  for (const link of openLinks) assert(link.left>=-1 && link.right<=geometry.width+1 && link.bottom>link.top && Number(link.opacity)>0,'expanded chapter is readable inside the viewport: '+link.text);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.menu-toggle')?.getAttribute('aria-expanded')==='false');
  assert.equal(await page.locator('#main-nav').getAttribute('data-open'),'false');assert(await toggle.evaluate(node=>node===document.activeElement),'Escape returns keyboard focus to the menu');
}
async function capture(page,name) { await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await frames(page);await page.screenshot({path:path.join(output,name),fullPage:true,animations:'disabled'}); }
async function main() {
  assert(password.length>=12,'local password file is available');fs.mkdirSync(output,{recursive:true,mode:0o700});
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  context.on('page',page=>{
    page.on('request',request=>pendingRequests.set(request,Date.now()));
    page.on('requestfinished',request=>pendingRequests.delete(request));
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error' && message.location().url!==new URL('/favicon.ico',base).href) errors.push(message.text());});
    page.on('requestfailed',request=>{pendingRequests.delete(request);const failure=request.failure()?.errorText||'request failed';if(request.url().startsWith(base.href)&&!/ERR_ABORTED/.test(failure))errors.push(failure+': '+request.url());});
  });
  await context.addInitScript(()=>{try{if(!localStorage.getItem('bernie-portfolio-theme'))localStorage.setItem('bernie-portfolio-theme','dark');}catch{}});
  const page=await context.newPage();
  try {
    await unlock(page);
    if(!process.env.PORTFOLIO_NAV_CHAIN_ONLY) {
    for (const height of [960,600]) for (const theme of ['dark','light']) await test(`All eleven ${theme} pages share the same 1440×${height} left rail`,async()=>{
      await page.setViewportSize({width:1440,height});await themeTo(page,theme);let baseline;
      for (const name of routes) {
        await load(page,name);const actual=await rail(page,name);
        if(!baseline)baseline=actual;else assert.deepEqual(actual,baseline,'shared rail styles and geometry are identical on '+name);
        if(height===960 && theme==='light' && ['index','about','experience'].includes(name))await capture(page,name+'-1440.png');
      }
      await tooltips(page);
    });
    await test('All eleven routes keep usable menus at 900, 768, 390 and 360 pixels in three languages',async()=>{
      await themeTo(page,'light');
      for(const width of [900,768,390,360]) {
        await page.setViewportSize({width,height:844});
        for(const name of routes) {await load(page,name);for(const language of languages){await languageTo(page,language);await mobileMenu(page,name,language);}}
        console.log(`CHECK ${width}px menus: all eleven routes and three languages complete`);
        if(width===390){await load(page,'about');await capture(page,'about-390.png');}
      }
    });
    }
    await test('Full chapter/footer route chain and browser history preserve one live document',async()=>{
      await page.setViewportSize({width:1440,height:960});await load(page,'index','en');await themeTo(page,'dark');
      const token=await page.evaluate(()=>window.__navigationQaDocument=Math.random());let baseline=await rail(page,'index','en');
      for(const name of [...routes.slice(1),'index']) {
        const selector=destinations.includes(name)?`.main-nav > a[href*="${name}.html"]`:name==='index'?'.brand':`.footer-links a[data-internal][href*="${name}.html"]`;
        await page.locator(selector).click();await ready(page,name);await frames(page);
        assert.equal(await page.evaluate(()=>window.__navigationQaDocument),token,'route change uses soft navigation');
        assert.deepEqual(await rail(page,name,'en'),baseline,'soft navigation preserves the shared rail on '+name);
      }
      await page.goBack();await ready(page,'sitemap');await mountedOnce(page);await linksAndState(page,'sitemap','en');
      await page.goForward();await ready(page,'index');await mountedOnce(page);await linksAndState(page,'index','en');
      assert.equal(await page.evaluate(()=>window.__navigationQaDocument),token,'history uses the same live document');
    });
    assert.deepEqual([...new Set(errors)],[],'navigation has no browser, console or scoped network errors');
    console.log(JSON.stringify({passed:results.length,screenshots:output,base:base.href}));
  } finally {await context.close();await browser.close();}
}
main().catch(async error=>{console.error(redact(error));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
