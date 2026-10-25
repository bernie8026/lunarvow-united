'use strict';
// Verify real pointer capture, delayed selection and spring cleanup in the encrypted site.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,process.env.PORTFOLIO_PASSWORD_FILE||'../lunarvow-private/access-password.txt'),'utf8').trim();
const output=path.join(root,'.private','glass-qa'),errors=[];
let browser,passed=0;
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function ready(page,name){await page.waitForFunction(name=>document.body?.dataset.page===name&&document.querySelector('main#main')&&!document.querySelector('.boot-screen')&&!document.body.classList.contains('is-booting')&&!document.querySelector('main').inert&&document.documentElement.dataset.navigationState==='idle',name,{timeout:45000});await frames(page);}
async function test(label,fn){await fn();passed++;console.log('PASS '+label);}
async function point(page,language){const r=await page.locator(`[data-language="${language}"]`).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};}
async function start(page,from,to){const a=await point(page,from),b=await point(page,to);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await frames(page);return b;}
async function selected(page,language){await page.waitForFunction(language=>document.documentElement.lang===language,language);assert.equal(await page.locator('.languages button[aria-pressed="true"]').getAttribute('data-language'),language);}
async function closed(page){await page.waitForFunction(()=>document.querySelector('.language-lens')&&!document.querySelector('.language-lens.is-open')&&!document.querySelector('.languages.is-glass-dragging'));assert.equal(await page.locator('[data-glass-preview],[data-glass-covered]').count(),0);
  const geometry=await page.evaluate(()=>{const node=document.querySelector('.language-lens'),lens=node.getBoundingClientRect(),button=document.querySelector('.languages button[aria-pressed="true"]').getBoundingClientRect();return {page:document.body.dataset.page,inline:node.getAttribute('style'),lens:lens.toJSON(),button:button.toJSON(),offset:Math.hypot(lens.x+lens.width/2-button.x-button.width/2,lens.y+lens.height/2-button.y-button.height/2)};});assert(geometry.offset<1,'resting glass returns to the selected option: '+JSON.stringify({geometry,errors}));}
async function shape(page){
  assert.equal(await page.locator('.language-lens').count(),1);assert.equal(await page.locator('.header-tools button').count(),4);
  assert.equal(await page.locator('.languages > .language-lens').count(),1,'glass stays attached to the segmented control');
  assert.equal(await page.locator('.language-lens').getAttribute('aria-hidden'),'true');
  assert(await page.locator('.languages,.languages button,.theme-toggle').evaluateAll(nodes=>nodes.every(n=>parseFloat(getComputedStyle(n).borderTopLeftRadius)>=14)),'all controls have rounded outlines');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'controls introduce no horizontal overflow');
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
    await page.locator('form button[type="submit"]').click();await ready(page,'about');
    await test('All eight pages mount one attached glass selection and rounded theme control',async()=>{
      for(const name of ['experience','education','skills','projects','contact','sitemap','index','about']){
        const selector=['experience','education','skills','projects','about'].includes(name)?`.main-nav a[href*="${name}.html"]`:name==='index'?'.brand':`.footer-links a[href*="${name}.html"]`;
        await page.locator(selector).click();await ready(page,name);await shape(page);await closed(page);
      }
    });
    await test('Vertical Liquid Glass drag enlarges and refracts labels, then settles on release',async()=>{
      const resting=await page.locator('.language-lens').boundingBox();
      const b=await start(page,'zh-HK','en');await selected(page,'zh-HK');
      assert.equal(await page.locator('[data-glass-preview]').getAttribute('data-language'),'en');
      assert(await page.locator('.language-lens').isVisible());
      assert(await page.locator('.language-lens-sheet').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).a>1.2),'glass magnifies the actual labels');
      assert.equal(await page.locator('feDisplacementMap').getAttribute('scale'),'12','glass rim has an optical displacement field');
      assert.notEqual(await page.locator('.language-lens-optics').evaluate(n=>getComputedStyle(n).filter),'none');
      const before=await page.locator('.language-lens').evaluate(n=>getComputedStyle(n).transform);
      await page.mouse.move(b.x,b.y+8);await page.waitForTimeout(40);
      const moving=await page.locator('.language-lens').evaluate(n=>getComputedStyle(n).transform);
      await page.waitForTimeout(220);const settled=await page.locator('.language-lens').evaluate(n=>getComputedStyle(n).transform);
      assert(before!==moving&&moving!==settled,'lens position settles through a spring rather than jumping');
      const expanded=await page.locator('.language-lens').boundingBox();assert(expanded.width>resting.width+8&&expanded.height>resting.height+8,'pressed glass expands beyond the resting selection');
      const rail=await page.locator('.masthead').boundingBox();assert(expanded.x>=rail.x&&expanded.x+expanded.width<=rail.x+rail.width,'glass stays over the rail instead of floating beside it');
      await page.mouse.move(b.x,b.y);await page.waitForTimeout(200);
      await page.screenshot({path:path.join(output,'desktop-drag.png'),clip:{x:0,y:690,width:300,height:270}});
      await page.mouse.up();await selected(page,'en');await closed(page);
    });
    await test('Escape, outside release and resize cancel pending selection',async()=>{
      await start(page,'en','zh-CN');await page.keyboard.press('Escape');await page.mouse.up();await selected(page,'en');await closed(page);
      await start(page,'en','zh-HK');await page.mouse.move(500,400);await page.mouse.up();await selected(page,'en');await closed(page);
      await start(page,'en','zh-CN');await page.setViewportSize({width:1430,height:960});await page.mouse.up();await selected(page,'en');await closed(page);await page.setViewportSize({width:1440,height:960});
    });
    await test('Direct clicks, keyboard selection and theme toggle retain their behaviour',async()=>{
      await page.locator('[data-language="zh-HK"]').click();await selected(page,'zh-HK');
      await page.locator('[data-language="en"]').focus();await page.keyboard.press('Space');await selected(page,'en');await closed(page);
      assert.equal(await page.getByRole('button',{name:'English',exact:true}).count(),1,'optical copy never duplicates the accessible language control');
      const before=await page.evaluate(()=>document.body.dataset.theme);await page.locator('.theme-toggle').click();assert.notEqual(await page.evaluate(()=>document.body.dataset.theme),before);
    });
    await test('Mobile horizontal mouse and touch drags keep the lens within 390/360px screens',async()=>{
      const cdp=await context.newCDPSession(page);
      for(const width of [390,360]){
        await page.setViewportSize({width,height:844});await page.locator('[data-language="zh-HK"]').click();await selected(page,'zh-HK');
        await start(page,'zh-HK','zh-CN');await selected(page,'zh-HK');
        const rect=await page.locator('.language-lens').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1&&rect.y>=0&&rect.y+rect.height<=844);
        if(width===390)await page.screenshot({path:path.join(output,'mobile-drag.png'),clip:{x:0,y:0,width,height:230}});
        await page.mouse.up();await selected(page,'zh-CN');await closed(page);await shape(page);
        const a=await point(page,'zh-CN'),b=await point(page,'en');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await frames(page);await selected(page,'zh-CN');
        assert.equal(await page.locator('[data-glass-preview]').getAttribute('data-language'),'en');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await selected(page,'en');await closed(page);
      }
      await cdp.detach();
    });
    await test('Reduced motion and global pause retain a static useful magnifier',async()=>{
      await page.emulateMedia({reducedMotion:'reduce'});await start(page,'en','zh-HK');
      assert.equal(await page.locator('.language-lens').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await page.mouse.up();await selected(page,'zh-HK');await closed(page);
      await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.ambient-toggle').click();await start(page,'zh-HK','en');
      assert.equal(await page.locator('.language-lens').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await page.mouse.up();await selected(page,'en');await closed(page);await page.locator('.ambient-toggle').click();
    });
    await test('Navigating during drag disposes the old lens and remounts cleanly',async()=>{
      await page.setViewportSize({width:1440,height:960});await start(page,'en','zh-CN');
      await page.evaluate(()=>{window.__retiredGlass=document.querySelector('.language-lens');document.querySelector('.main-nav a[href*="experience.html"]').click();});
      await ready(page,'experience');await page.mouse.up();await shape(page);await closed(page);
      assert(await page.evaluate(()=>!window.__retiredGlass.isConnected&&!window.__retiredGlass.classList.contains('is-open')));
      assert.equal(await page.locator('.liquid-glass-defs').count(),1,'old refraction definitions are disposed with the page');
      await start(page,'en','zh-HK');await page.mouse.up();await selected(page,'zh-HK');await closed(page);
    });
    assert.deepEqual([...new Set(errors)],[]);console.log(JSON.stringify({passed,base:base.href,screenshots:output}));
  }finally{await context.close();await browser.close();}
})().catch(async error=>{console.error(String(error.stack||error).split(password).join('[REDACTED]'));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
