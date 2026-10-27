'use strict';
// Exercise actual hover, focus and touch input against the encrypted publication.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,process.env.PORTFOLIO_PASSWORD_FILE||'../lunarvow-private/access-password.txt'),'utf8').trim();
const output=path.join(root,'.private','navigation-glass-qa'),errors=[];
const locales=['zh-HK','en','zh-CN','ja','ko','th','ru'];
let browser,passed=0;
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function test(label,fn){await fn();passed++;console.log('PASS '+label);}
async function ready(page,name){
  await page.waitForFunction(name=>document.body?.dataset.page===name&&document.querySelector('main#main')&&!document.querySelector('.boot-screen')&&!document.body.classList.contains('is-booting')&&!document.querySelector('main').inert&&document.documentElement.dataset.navigationState==='idle',name,{timeout:45000});
  await frames(page);
}
async function centre(locator){const r=await locator.boundingBox();assert(r,'control is rendered');return {x:r.x+r.width/2,y:r.y+r.height/2};}
async function hover(page,locator){const p=await centre(locator);await page.mouse.move(p.x,p.y,{steps:4});await frames(page);return p;}
async function leave(page){
  await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(Math.min(page.viewportSize().width-15,550),400);
  await page.waitForFunction(()=>!document.querySelector('.navigation-lens.is-open,.language-lens.is-open,.languages.is-glass-dragging'));
}
async function selected(page,language){
  await page.waitForFunction(language=>document.documentElement.lang===language,language);
  assert.equal(await page.locator('.languages > button[aria-pressed="true"]').getAttribute('data-language'),language);
}
async function shape(page){
  for(const surface of ['.main-nav','.brand','.theme-toggle','.menu-toggle','.project-nav-toggle']){
    const host=page.locator('.masthead '+surface),lens=host.locator(':scope > .navigation-lens');
    assert.equal(await lens.count(),1,surface+' owns exactly one glass overlay');
  }
  assert.equal(await page.locator('.navigation-lens').count(),5);
  assert.equal(await page.locator('.language-lens').count(),1);
  assert.equal(await page.locator('.liquid-glass-defs').count(),1);
  assert(await page.locator('.navigation-lens,.language-lens').evaluateAll(nodes=>nodes.every(n=>n.inert&&n.getAttribute('aria-hidden')==='true'&&getComputedStyle(n).pointerEvents==='none')),'optical copies cannot take input or appear as duplicate controls');
  assert.equal(await page.locator('.main-nav > a').count(),5);
  assert.equal(await page.getByRole('link',{name:'Bernie Leung Portfolio',exact:true}).count(),1);
  assert.equal(await page.locator('.languages').getByRole('button').count(),7);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'glass does not expand the document width');
}
async function open(page,surface){
  const lens=page.locator(surface+' > .navigation-lens');
  await page.locator(surface+' > .navigation-lens.is-open').waitFor({state:'visible'});
  assert(await lens.locator('.navigation-lens-sheet').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).a>1.1),'hover magnifies the control through its optical copy');
  assert.notEqual(await lens.locator('.navigation-lens-optics').evaluate(n=>getComputedStyle(n).filter),'none','glass has refraction');
  return lens;
}
async function readableCopy(page,surface){
  const labels=await page.locator(surface).evaluate(host=>{
    const lens=host.querySelector(':scope > .navigation-lens'),frame=lens.getBoundingClientRect();
    const control=host.matches('[data-nav-glass-preview]')?host:host.querySelector('[data-nav-glass-preview]');
    return [...control.querySelectorAll('.navigation-glass-source[data-nav-glass-covered]')].map(source=>{
      const label=[...lens.querySelectorAll('.navigation-lens-sheet > span')].find(node=>node.textContent===source.textContent);
      if(!label)return {text:source.textContent,found:false};
      const range=document.createRange();range.selectNodeContents(label);const ink=range.getBoundingClientRect();
      return {text:source.textContent,found:true,inside:ink.left>=frame.left-1&&ink.right<=frame.right+1&&ink.top>=frame.top-1&&ink.bottom<=frame.bottom+1};
    });
  });
  assert(labels.length>0,'active glass has a copied label');
  assert(labels.every(label=>label.found&&label.inside),'the whole active label remains inside the glass rim: '+JSON.stringify(labels));
}
(async()=>{
  fs.mkdirSync(output,{recursive:true,mode:0o700});
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:960},hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
  try{
    await page.goto(new URL('about.html?lang=zh-HK',base).href,{waitUntil:'domcontentloaded'});
    const input=page.locator('input[type="password"]');await input.waitFor();
    await input.evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},password);
    await page.locator('form button[type="submit"]').click();await ready(page,'about');await leave(page);
    await test('All five numbered links magnify on mouse hover without navigating',async()=>{
      await shape(page);const href=page.url(),current=await page.locator('.main-nav > a[aria-current="page"]').getAttribute('href');
      const positions=[];
      for(const link of await page.locator('.main-nav > a').all()){
        await hover(page,link);const lens=await open(page,'.main-nav');await page.waitForTimeout(250);
        await readableCopy(page,'.main-nav');
        const r=await lens.boundingBox(),b=await link.boundingBox();positions.push(r.y);
        assert(Math.abs(r.y+r.height/2-b.y-b.height/2)<8,'glass follows the hovered numbered link');
        assert.equal(page.url(),href,'hover never changes the route');
        assert.equal(await page.locator('.main-nav > a[aria-current="page"]').getAttribute('href'),current,'hover never selects a different page');
      }
      assert(new Set(positions.map(y=>Math.round(y))).size===5,'one lens moves across every numbered link');
      await page.screenshot({path:path.join(output,'desktop-number-hover.png'),clip:{x:0,y:70,width:250,height:350}});await leave(page);
    });
    await test('Brand and theme control get glass on hover, with no accidental activation',async()=>{
      const href=page.url(),theme=await page.locator('body').getAttribute('data-theme');
      for(const surface of ['.brand','.theme-toggle']){
        await hover(page,page.locator(surface));await open(page,surface);assert.equal(page.url(),href);assert.equal(await page.locator('body').getAttribute('data-theme'),theme);
        await page.waitForTimeout(250);
        if(surface==='.brand')await readableCopy(page,surface);
        await page.screenshot({path:path.join(output,surface==='.brand'?'desktop-brand-hover.png':'desktop-theme-hover.png'),clip:surface==='.brand'?{x:0,y:0,width:250,height:130}:{x:0,y:780,width:250,height:180}});
        await leave(page);
      }
      await page.locator('.theme-toggle').click();assert.notEqual(await page.locator('body').getAttribute('data-theme'),theme,'theme still changes on click');
      await page.locator('.theme-toggle').click();assert.equal(await page.locator('body').getAttribute('data-theme'),theme);await leave(page);
    });
    await test('All seven languages preview on hover and change only when clicked',async()=>{
      const href=page.url(),language=await page.locator('html').getAttribute('lang');
      for(const locale of locales){
        await hover(page,page.locator(`.languages > button[data-language="${locale}"]`));
        await page.locator('.language-lens.is-open').waitFor({state:'visible'});
        assert(await page.locator('.language-lens-sheet').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).a>1.2));
        assert.equal(await page.locator('[data-glass-preview]').getAttribute('data-language'),locale);
        assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(page.url(),href);
      }
      await page.locator('[data-language="ja"]').click();await selected(page,'ja');await leave(page);
      await page.locator('[data-language="zh-HK"]').click();await selected(page,'zh-HK');await leave(page);
      assert.equal(await page.locator('[data-glass-preview],[data-glass-covered]').count(),0,'leaving clears the optical preview');
    });
    await test('Keyboard focus receives glass while route and language activation remain explicit',async()=>{
      const href=page.url();await page.keyboard.press('Tab');
      await page.locator('.main-nav > a[href*="experience.html"]').focus();await open(page,'.main-nav');assert.equal(page.url(),href);
      await page.keyboard.press('Enter');await ready(page,'experience');await leave(page);
      await page.keyboard.press('Tab');await page.locator('[data-language="ko"]').focus();await page.locator('.language-lens.is-open').waitFor({state:'visible'});
      await selected(page,'zh-HK');await page.keyboard.press('Space');await selected(page,'ko');await leave(page);
      await page.locator('[data-language="zh-HK"]').click();await selected(page,'zh-HK');await leave(page);
    });
    await test('Every page disposes and remounts the shared navigation glass cleanly',async()=>{
      await page.evaluate(()=>window.__glassDocument=document);
      for(const name of ['education','skills','projects','contact','sitemap','index','about','experience']){
        await hover(page,page.locator('.main-nav > a').first());await open(page,'.main-nav');
        await page.evaluate(()=>window.__retiredNavigationLenses=[...document.querySelectorAll('.navigation-lens,.language-lens')]);
        const selector=['experience','education','skills','projects','about'].includes(name)?`.main-nav > a[href*="${name}.html"]`:name==='index'?'.brand':`.footer-links > a[href*="${name}.html"]`;
        await page.locator(selector).click();await ready(page,name);await leave(page);await shape(page);
        assert(await page.evaluate(()=>window.__glassDocument===document&&window.__retiredNavigationLenses.every(n=>!n.isConnected&&!n.classList.contains('is-open'))),'old optics are removed without replacing the document');
      }
    });
    await test('Reduced motion and pause keep useful static hover glass',async()=>{
      await page.emulateMedia({reducedMotion:'reduce'});
      await hover(page,page.locator('.main-nav > a').nth(2));await open(page,'.main-nav');
      assert.equal(await page.locator('.main-nav > .navigation-lens').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
      await leave(page);await page.emulateMedia({reducedMotion:'no-preference'});
      await page.locator('.ambient-toggle').click();assert(await page.locator('body').evaluate(n=>n.classList.contains('motion-paused')));
      await hover(page,page.locator('.theme-toggle'));await open(page,'.theme-toggle');await leave(page);await page.locator('.ambient-toggle').click();
    });
    await test('Mobile menu supports hover without opening and normal touch taps',async()=>{
      const cdp=await context.newCDPSession(page);
      for(const width of [390,360]){
        await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));await frames(page);await shape(page);
        const menu=page.locator('.menu-toggle');assert.equal(await menu.getAttribute('aria-expanded'),'false');
        await hover(page,menu);await open(page,'.menu-toggle');assert.equal(await menu.getAttribute('aria-expanded'),'false','hover does not expand the menu');
        const m=await centre(menu);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...m,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.waitForFunction(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true');
        const destination=await page.locator('body').getAttribute('data-page')==='education'?'experience':'education';
        const a=page.locator(`.main-nav > a[href*="${destination}.html"]`);await hover(page,a);await open(page,'.main-nav');
        await page.waitForTimeout(250);await readableCopy(page,'.main-nav');
        const r=await page.locator('.main-nav > .navigation-lens').boundingBox();assert(r.x>=-1&&r.x+r.width<=width+1,'mobile glass stays within the screen');
        if(width===390)await page.screenshot({path:path.join(output,'mobile-menu-hover.png'),clip:{x:0,y:0,width,height:300}});
        const p=await centre(a);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await ready(page,destination);await leave(page);assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
        const from=await centre(page.locator('[data-language="zh-HK"]')),to=await centre(page.locator('[data-language="th"]'));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});await frames(page);await selected(page,'zh-HK');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await selected(page,'th');await leave(page);
        await page.locator('[data-language="zh-HK"]').click();await selected(page,'zh-HK');await leave(page);
      }
      await cdp.detach();
    });
    assert.deepEqual([...new Set(errors)],[]);console.log(JSON.stringify({passed,base:base.href,screenshots:output}));
  }finally{await context.close();await browser.close();}
})().catch(async error=>{console.error(String(error.stack||error).split(password).join('[REDACTED]'));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
