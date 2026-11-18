'use strict';
// Isolated synthetic UI regression. No production website or authentication.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const locales=['zh-HK','en','zh-CN','ja','ko','th','ru'];
const expected=['七語','seven-language','七语','7言語','7개 언어','7 ภาษา','семиязычный'];
const frames=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const railWidth=(page,width)=>page.waitForFunction(width=>Math.abs(document.querySelector('.masthead').getBoundingClientRect().width-width)<.25,width);
async function collapseRail(page){
  const viewport=page.viewportSize();
  await page.mouse.move(viewport.width-2,viewport.height-2);
  await page.evaluate(()=>document.activeElement?.blur());
  await railWidth(page,84);await frames(page);
}
const readingGeometry=page=>page.evaluate(()=>{
  const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  return{padding:getComputedStyle(document.body).paddingLeft,scrollX,scrollY,main:rect(document.querySelector('main')),identity:rect(document.querySelector('[data-portfolio-identity]')),progress:rect(document.querySelector('.reading-progress'))};
});
async function onscreenControls(page,width,height,label){
  const controls=await page.locator('.header-tools button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height};}));
  for(const r of controls)assert(r.w>0&&r.h>0&&r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,`${label} controls stay onscreen: ${JSON.stringify(r)}`);
  for(let a=0;a<controls.length;a++)for(let b=a+1;b<controls.length;b++){
    const x=controls[a],y=controls[b];
    assert(Math.min(x.right,y.right)-Math.max(x.left,y.left)<=1||Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)<=1,`${label} header controls must not overlap`);
  }
  return controls.length;
}
async function expandedLabels(page,width,label){
  for(const link of await page.locator('#main-nav > a').all()){
    await link.scrollIntoViewIfNeeded();
    const text=await link.locator('span[data-i18n]').evaluate(n=>{const r=n.getBoundingClientRect(),nav=n.closest('nav').getBoundingClientRect(),s=getComputedStyle(n);return{text:n.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,nav:{top:nav.top,bottom:nav.bottom},opacity:s.opacity,position:s.position};});
    assert.equal(text.position,'static');assert.equal(Number(text.opacity),1);
    assert(text.left>=0&&text.right<=224&&text.top>=text.nav.top-1&&text.bottom<=text.nav.bottom+1,`${label}: ${text.text} fits its scrollable rail`);
    assert((await link.boundingBox()).height>=44,`${label} chapter links retain44px targets`);
  }
}
async function desktopRail(page,width,height,label){
  await collapseRail(page);
  const baseline=await readingGeometry(page);
  assert.equal(baseline.padding,'84px');assert.equal(baseline.progress.x,84);
  const labels=await page.locator('#main-nav > a > span[data-i18n]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{text:n.textContent,width:r.width,height:r.height,opacity:s.opacity,position:s.position,display:s.display,visibility:s.visibility};}));
  assert.equal(labels.length,8);
  for(const text of labels){assert(text.text.trim());assert.equal(text.position,'absolute');assert.equal(Number(text.opacity),0);assert(text.width<=1&&text.height<=1);assert.notEqual(text.display,'none');assert.notEqual(text.visibility,'hidden');}
  assert.equal(await onscreenControls(page,width,height,label+' collapsed'),2,'collapsed rail keeps selected language and theme available');
  assert.equal(await page.locator('.languages button:visible').count(),1);
  assert.equal(await page.locator('.languages button:visible').getAttribute('aria-pressed'),'true');
  const first=page.locator('#main-nav > a').first();
  assert((await first.ariaSnapshot()).includes(labels[0].text.trim()),label+' clipped label remains in link accessible name');
  await page.locator('.masthead').hover({position:{x:42,y:40}});await railWidth(page,224);
  assert.deepEqual(await readingGeometry(page),baseline,label+' pointer expansion overlays without moving content or progress');
  assert.equal(await onscreenControls(page,width,height,label+' expanded'),8);
  await expandedLabels(page,width,label);
  // A mouse click keeps the current button focused, but must not pin the rail.
  await page.locator('.languages button[aria-pressed=true]').click();
  await page.mouse.move(width-2,height-2);await railWidth(page,84);
  assert.deepEqual(await readingGeometry(page),baseline,label+' pointer leave collapses without moving content');
  assert.equal(await page.locator('.masthead').evaluate(n=>n.matches(':has(:focus-visible)')),false);
  // Enter real keyboard modality before moving between navigation links.
  await page.locator('.brand').focus();await page.keyboard.press('Tab');await railWidth(page,224);
  assert.equal(await first.evaluate(n=>n===document.activeElement&&n.matches(':focus-visible')),true,label+' Tab reveals the navigation');
  await page.locator('#main-nav > a').last().focus();await frames(page);
  await page.locator('.masthead').hover({position:{x:42,y:40}});await page.mouse.move(width-2,height-2);await frames(page);
  assert(Math.abs((await page.locator('.masthead').boundingBox()).width-224)<.25,label+' keyboard focus keeps rail expanded after pointer leave');
  assert.deepEqual(await readingGeometry(page),baseline,label+' keyboard expansion does not move reading position');
  await page.locator('main').evaluate(n=>n.focus({preventScroll:true}));await railWidth(page,84);await frames(page);
  assert.deepEqual(await readingGeometry(page),baseline,label+' leaving keyboard focus collapses without moving content');
}
(async()=>{
  const server=http.createServer((request,response)=>{
    const name=new URL(request.url,'http://fixture.test').pathname;
    if(name==='/favicon.ico'){response.writeHead(204);response.end();return;}
    const target=name==='/index.html'?['scripts/test/fixtures/portfolio-ui.html','text/html; charset=utf-8']:name==='/assets/protected-ui.js'?['protection/assets/protected-ui.js','text/javascript; charset=utf-8']:null;
    if(!target){response.writeHead(404);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':target[1],'Cache-Control':'no-store'});
    response.end(fs.readFileSync(path.join(root,target[0])));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-ui-clarity-'));
  let browser;
  try { browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL?{channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL}:{})}); }
  catch(error){server.close();fs.rmSync(output,{recursive:true,force:true});throw error;}
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let cases=0;
  try{
    await page.goto(base+'/index.html',{waitUntil:'load'});
    await page.locator('[data-portfolio-identity]').waitFor();
    for(const theme of ['dark','light']){
    if(await page.locator('body').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    for(const [width,height] of [[1366,900],[1024,540],[1001,540],[390,844],[360,844]]){
      await page.setViewportSize({width,height});
      for(const [i,locale] of locales.entries()){
        if(width>1000)await page.locator('.masthead').hover({position:{x:42,y:40}});
        await page.locator(`[data-language="${locale}"]`).click();
        await frames(page);
        if(width>1000)await collapseRail(page);
        assert.equal(await page.locator('[data-portfolio-identity]').count(),1);
        assert.equal(await page.locator('#portfolio-clarity-style').count(),1);
        assert.match(await page.locator('#selected-work .home-lead').textContent(),new RegExp(expected[i]));
        const content=await page.evaluate(()=>({
          intro:document.querySelector('[data-identity-name]').textContent,
          desc:document.querySelector('[data-identity-description]').textContent,
          meta:document.querySelector('meta[name="description"]').content,
          order:[...document.querySelector('main').children].map(n=>n.hasAttribute('data-portfolio-identity')?'identity':n.id||n.className),
          links:[...document.querySelectorAll('[data-identity-page]')].map(a=>({label:a.textContent,href:a.href})),
          overflow:document.documentElement.scrollWidth>innerWidth+1,
          padding:parseFloat(getComputedStyle(document.body).paddingLeft),
          headerWidth:document.querySelector('.masthead').getBoundingClientRect().width,
          controls:[...document.querySelectorAll('.header-tools button')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height};})
        }));
        assert.equal(content.intro,'ALEX EXAMPLE.');
        assert(content.desc.length>10);
        assert.equal(content.desc,content.meta,'identity follows the current translated metadata');
        assert.equal(content.order[0],'identity');
        assert.equal(content.order[1],'selected-work');
        assert.equal(content.order[2],'home-hero');
        assert.equal(content.overflow,false,`${width}px ${locale} must not overflow`);
        for(const link of content.links){assert.equal(new URL(link.href).searchParams.get('lang'),locale);assert(link.label.length);}
        assert.deepEqual(content.links.map(link => new URL(link.href).pathname.split('/').pop()), ['projects.html', 'photography.html', 'about.html']);
        const photoLink = page.locator('[data-identity-page="photography"]');
        assert.equal(await photoLink.textContent(), await page.locator('#main-nav a[href*="photography.html"] span[data-i18n]').textContent());
        assert((await photoLink.boundingBox()).height >= 44, 'photography keeps a touch-sized target');
        for(const r of content.controls){assert(r.w>0&&r.h>0&&r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,`${width}px ${locale} controls stay onscreen: ${JSON.stringify(r)}`);}
        for(let a=0;a<content.controls.length;a++)for(let b=a+1;b<content.controls.length;b++){
          const x=content.controls[a],y=content.controls[b];
          assert(Math.min(x.right,y.right)-Math.max(x.left,y.left)<=1 || Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)<=1,`${width}px ${locale} header controls must not overlap`);
        }
        if(width>1000){
          assert.equal(content.padding,84);assert.equal(content.headerWidth,84);
          await desktopRail(page,width,height,`${width}px ${locale} ${theme}`);
        }else{
          assert.equal(content.padding,0);
          const toggle=page.locator('.menu-toggle');
          if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
          for(const link of await page.locator('#main-nav > a').all())assert(await link.isVisible());
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          await toggle.click();
        }
        await page.locator('[data-slide-to="1"]').click();await frames(page);
        assert.match(await page.locator('[data-hero-description]').textContent(),new RegExp(expected[i]));
        assert.equal(await page.locator('[data-carousel-status]').textContent(),'2 / 3');
        await page.locator('#reset-copy').click();await frames(page);
        assert.match(await page.locator('#selected-work .home-lead').textContent(),new RegExp(expected[i]));
        await page.locator('#repeat-events').click();await frames(page);
        assert.equal(await page.locator('[data-portfolio-identity]').count(),1);
        cases++;
      }
    }
    const contrast=await page.evaluate(()=>{
      const luminance=colour=>colour.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      const intro=document.querySelector('[data-portfolio-identity]'),background=getComputedStyle(intro).backgroundColor;
      const button=document.querySelector('[data-identity-page="projects"]'),buttonStyle=getComputedStyle(button);
      return [ratio(getComputedStyle(document.querySelector('[data-identity-name]')).color,background),ratio(getComputedStyle(document.querySelector('[data-identity-description]')).color,background),ratio(buttonStyle.color,buttonStyle.backgroundColor)];
    });
    assert(contrast.every(ratio=>ratio>=4.5),`${theme} identity and button text have sufficient contrast: ${contrast}`);
    }
    await page.setViewportSize({width:3840,height:2160});
    await desktopRail(page,3840,2160,'3840px desktop');
    await page.setViewportSize({width:1366,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});await collapseRail(page);
    const reducedBaseline=await readingGeometry(page);
    assert((await page.locator('.masthead').evaluate(n=>getComputedStyle(n).transitionDuration)).split(',').every(value=>parseFloat(value)===0),'reduced motion removes the rail transition');
    await page.locator('.masthead').hover({position:{x:42,y:40}});await frames(page);
    assert.equal((await page.locator('.masthead').boundingBox()).width,224);
    assert.deepEqual(await readingGeometry(page),reducedBaseline,'reduced-motion expansion keeps reading geometry');
    await collapseRail(page);await page.emulateMedia({reducedMotion:'no-preference'});
    const touch=await browser.newPage({viewport:{width:1366,height:900},hasTouch:true,isMobile:false});
    touch.on('pageerror',e=>errors.push(e.message));
    let touchCases=0;
    try{
      await touch.goto(base+'/index.html',{waitUntil:'load'});await touch.locator('[data-portfolio-identity]').waitFor();
      assert(await touch.evaluate(()=>matchMedia('(hover:none)').matches),'touch desktop fixture has no hover capability');
      for(const theme of ['dark','light'])for(const [width,height] of [[1366,900],[1001,540]]){
        await touch.setViewportSize({width,height});
        if(await touch.locator('body').getAttribute('data-theme')!==theme)await touch.locator('.theme-toggle').tap();
        await touch.locator('[data-language="ru"]').tap();await frames(touch);
        const geometry=await readingGeometry(touch);
        assert.equal(geometry.padding,'224px');assert.equal((await touch.locator('.masthead').boundingBox()).width,224,'wide touch navigation stays expanded without hover');
        assert.equal(geometry.progress.x,224);
        assert.equal(await onscreenControls(touch,width,height,'touch '+width+'px '+theme),8);
        await expandedLabels(touch,width,'touch '+width+'px '+theme);
        assert(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        touchCases++;
      }
    }finally{await touch.close();}
    await page.evaluate(()=>document.querySelector('meta[name="description"]').content='Synthetic metadata updated independently of the language event.');
    await frames(page);
    assert.equal(await page.locator('[data-identity-description]').textContent(),'Synthetic metadata updated independently of the language event.');
    await page.setViewportSize({width:1366,height:900});
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).paddingLeft),'0px');
    assert.equal(await page.locator('.masthead').evaluate(n=>getComputedStyle(n).display),'none');
    await page.emulateMedia({media:'screen'});
    for(const [width,height,name] of [[1366,900,'desktop'],[390,844,'mobile']]){
      await page.setViewportSize({width,height});if(width>1000)await page.locator('.masthead').hover({position:{x:42,y:40}});await page.locator('[data-language="zh-HK"]').click();
      await page.evaluate(()=>scrollTo(0,0));await frames(page);
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});
    }
    if(process.env.UI_CLARITY_SCREENSHOTS){
      fs.mkdirSync(process.env.UI_CLARITY_SCREENSHOTS,{recursive:true});
      await page.setViewportSize({width:1366,height:900});
      if(await page.locator('body').getAttribute('data-theme')!=='dark')await page.locator('.theme-toggle').click();
      await page.evaluate(()=>scrollTo(0,0));await collapseRail(page);
      await page.screenshot({path:path.join(process.env.UI_CLARITY_SCREENSHOTS,'nav-collapsed.png'),fullPage:false});
      await page.locator('.masthead').hover({position:{x:42,y:40}});await railWidth(page,224);await frames(page);
      await page.screenshot({path:path.join(process.env.UI_CLARITY_SCREENSHOTS,'nav-expanded.png'),fullPage:false});
    }
    assert.deepEqual(errors,[]);
    const result={cases,touchCases,largeDesktop:'3840x2160',reducedMotion:true,themes:['dark','light'],locales,viewports:[1366,1024,1001,390,360],syntheticFixture:true,privateData:false,productionLogin:false};
    console.log(JSON.stringify(result));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(output,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
