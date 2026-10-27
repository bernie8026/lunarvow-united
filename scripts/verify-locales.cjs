'use strict';
// Exercise the published encrypted flow; never print the access password.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=new URL(process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8766/lunarvow-united/');
const password=fs.readFileSync(path.resolve(root,'../lunarvow-private/access-password.txt'),'utf8').trim();
const languages=['zh-HK','en','zh-CN','ja','ko','th','ru'],added=languages.slice(3);
const pages=['index','about','experience','education','skills','projects','contact','sitemap'];
const output=path.join(root,'.private/localization/qa'),errors=[];let browser,passed=0;
const url=(name,lang)=>new URL(name+'.html?lang='+lang,base).href;
async function test(label,fn){await fn();passed++;console.log('PASS '+label);}
async function ready(page,name){await page.waitForFunction(name=>document.body?.dataset.page===name&&!document.body.classList.contains('is-booting')&&!document.querySelector('.boot-screen')&&document.querySelector('main#main')&&!document.querySelector('main').inert&&document.documentElement.dataset.navigationState==='idle',name,{timeout:45000});}
async function change(page,lang){await page.locator('.languages [data-language="'+lang+'"]').click();await page.waitForFunction(lang=>document.documentElement.lang===lang,lang);}
async function go(page,name){
  if(await page.evaluate(name=>document.body.dataset.page===name,name))return;
  let link;
  if(name==='index')link=page.locator('.brand');
  else if(['contact','sitemap'].includes(name))link=page.locator('.footer-links a[href*="'+name+'.html"]');
  else {if(await page.locator('.menu-toggle').isVisible()&&!await page.locator('.main-nav').isVisible())await page.locator('.menu-toggle').click();link=page.locator('.main-nav > a[href*="'+name+'.html"]');}
  await link.click();await ready(page,name);
}
async function unlock(page,name='index',lang='ja'){
  await page.goto(url(name,lang),{waitUntil:'domcontentloaded'});
  await page.locator('input[type="password"]:enabled').waitFor({timeout:20000});
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();await ready(page,name);
}
async function audit(page,name,lang){
  const result=await page.evaluate(({name,lang})=>{
    const dictionary=window.PORTFOLIO_TEXT,problems=[];
    for(const node of document.querySelectorAll('[data-i18n]'))if(node.tagName!=='TITLE'&&node.textContent!==dictionary[node.dataset.i18n]?.[lang])problems.push('text '+node.dataset.i18n);
    for(const node of document.querySelectorAll('[data-alt]'))if(node.alt!==dictionary[node.dataset.alt]?.[lang])problems.push('alt '+node.dataset.alt);
    for(const node of document.querySelectorAll('[data-aria]'))if(node.getAttribute('aria-label')!==dictionary[node.dataset.aria]?.[lang])problems.push('aria '+node.dataset.aria);
    const controls=[...document.querySelectorAll('.header-tools button')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};});
    const internal=[...document.querySelectorAll('a[data-internal]')].every(a=>new URL(a.href).searchParams.get('lang')===lang);
    return {problems,lang:document.documentElement.lang,selected:document.querySelector('.languages [aria-pressed="true"]')?.dataset.language,count:document.querySelectorAll('.languages [data-language]').length,overflow:document.documentElement.scrollWidth-innerWidth,width:innerWidth,height:innerHeight,controls,internal,canonical:document.querySelector('link[rel="canonical"]')?.href,alternates:[...document.querySelectorAll('link[hreflang]')].map(n=>n.hreflang),title:document.title,meta:document.querySelector('meta[name="description"]')?.content,paused:document.querySelector('.ambient-toggle')?.textContent,lock:document.querySelector('.site-lock')?.textContent};
  },{name,lang});
  assert.deepEqual(result.problems,[],name+'/'+lang+' dictionary rendering');assert.equal(result.lang,lang);assert.equal(result.selected,lang);assert.equal(result.count,7);
  assert(result.internal,name+'/'+lang+' internal destinations retain language');assert(result.canonical.endsWith(name+'.html?lang='+lang));assert.deepEqual(result.alternates.sort(),[...languages,'x-default'].sort());assert(result.title&&result.meta);
  assert(result.overflow<=2,name+'/'+lang+' horizontal overflow '+result.overflow);
  assert.equal(result.controls.length,8);
  for(const r of result.controls)assert(r.w>0&&r.h>0&&r.x>=-1&&r.y>=-1&&r.right<=result.width+1&&r.bottom<=result.height+1,name+'/'+lang+' visible language/theme button');
  for(let i=0;i<result.controls.length;i++)for(let j=i+1;j<result.controls.length;j++){const a=result.controls[i],b=result.controls[j];assert(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,name+'/'+lang+' controls do not overlap');}
  if(added.includes(lang))assert(!/[\u3400-\u9fff]/.test(result.paused+result.lock)||lang==='ja','runtime controls do not fall back to Chinese');
}
(async()=>{
  fs.mkdirSync(output,{recursive:true,mode:0o700});
  await test('Four full dictionaries preserve all 460 keys and placeholders',async()=>{
    const {prepareLocales}=require('./prepare-locales.cjs');assert.deepEqual(prepareLocales(),{languages:7,translatedKeys:460});
    for(const lang of added){const data=JSON.parse(fs.readFileSync(path.join(root,'public/assets/locales',lang+'.json'),'utf8'));assert.equal(Object.keys(data).length,460);assert(Object.values(data).every(v=>typeof v==='string'&&v.trim()));}
  });
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
  try{
    await test('Encrypted gate supports all seven choices and unlocks directly into Japanese',async()=>{
      await page.goto(url('index','ja'),{waitUntil:'domcontentloaded'});await page.locator('input[type="password"]:enabled').waitFor();
      assert.equal(await page.locator('[data-gate-language]').count(),7);
      for(const lang of added){await page.locator('[data-gate-language="'+lang+'"]').click();assert.equal(await page.locator('html').getAttribute('lang'),lang);assert((await page.locator('label[for="site-password"]').innerText()).trim());await page.locator('#show-password').click();assert.equal(await page.locator('#site-password').getAttribute('type'),'text');await page.locator('#show-password').click();}
      await page.locator('[data-gate-language="ja"]').click();await page.locator('input[type="password"]').fill(password);await page.locator('form button[type="submit"]').click();await ready(page,'index');await audit(page,'index','ja');
    });
    await test('All eight pages render every dictionary field in all seven languages without replacing the document',async()=>{
      const token=await page.evaluate(()=>window.__localeDocument=Math.random());
      for(const name of pages){await go(page,name);for(const lang of languages){await change(page,lang);await audit(page,name,lang);}assert.equal(await page.evaluate(()=>window.__localeDocument),token);}
      await go(page,'about');await change(page,'ru');await page.waitForFunction(()=>!document.querySelector('.language-lens.is-open'));await page.screenshot({path:path.join(output,'desktop-russian.png'),animations:'disabled'});
    });
    await test('360px and 390px layouts keep new languages, menus and glass controls usable',async()=>{
      for(const width of [360,390]){await page.setViewportSize({width,height:844});
        for(const name of pages){await go(page,name);for(const lang of added){await change(page,lang);await audit(page,name,lang);}
          if(width===390&&['about','experience','skills'].includes(name)){await change(page,'th');await page.waitForFunction(()=>!document.querySelector('.language-lens.is-open'));await page.screenshot({path:path.join(output,'mobile-thai-'+name+'.png'),animations:'disabled'});}
        }
        await page.locator('.menu-toggle').click();assert(await page.locator('.main-nav').isVisible());await page.keyboard.press('Escape');assert(!await page.locator('.main-nav').isVisible());
      }
      await page.setViewportSize({width:1440,height:480});await audit(page,'sitemap',await page.locator('html').getAttribute('lang'));await page.setViewportSize({width:1440,height:960});
    });
    await test('New languages work with project search and contact draft generation',async()=>{
      await go(page,'projects');
      for(const lang of added){await change(page,lang);await page.locator('[data-search]').fill('__no_such_portfolio_item__');assert(await page.locator('[data-empty]').isVisible());assert((await page.locator('[data-result]').innerText()).includes('0'));await page.locator('[data-search]').fill('');assert(!await page.locator('[data-empty]').isVisible());}
      await go(page,'contact');await page.locator('[name="name"]').fill('Locale test');await page.locator('[name="email"]').fill('test@example.test');await page.locator('[name="message"]').fill('Testing the translated local draft.');
      for(const lang of added){await change(page,lang);await page.locator('[data-form-ready]').click();const expected=await page.evaluate(lang=>window.PORTFOLIO_TEXT.draftTitle[lang],lang);assert((await page.locator('#message-preview').innerText()).startsWith(expected));await audit(page,'contact',lang);}
    });
    await test('Glass drag and keyboard reach the four new language options',async()=>{
      await page.setViewportSize({width:390,height:844});await change(page,'ja');
      const a=await page.locator('[data-language="ja"]').boundingBox(),b=await page.locator('[data-language="ru"]').boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});assert.equal(await page.locator('html').getAttribute('lang'),'ja');await page.mouse.up();await page.waitForFunction(()=>document.documentElement.lang==='ru');
      await page.locator('[data-language="ru"]').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('html').getAttribute('lang'),'th');await page.keyboard.press('Home');assert.equal(await page.locator('html').getAttribute('lang'),'zh-HK');await page.keyboard.press('End');assert.equal(await page.locator('html').getAttribute('lang'),'ru');
    });
    await test('Language survives refresh, soft navigation, history and a fresh protected session',async()=>{
      await go(page,'about');await change(page,'ko');await page.reload();await ready(page,'about');await audit(page,'about','ko');
      await go(page,'experience');await audit(page,'experience','ko');await page.goBack();await ready(page,'about');await audit(page,'about','ko');
      const c=await browser.newContext({viewport:{width:360,height:844},reducedMotion:'reduce'}),tab=await c.newPage();try{await unlock(tab,'education','th');await audit(tab,'education','th');await tab.screenshot({path:path.join(output,'mobile-thai-education.png')});}finally{await c.close();}
    });
    await test('Locking a translated page returns to the same translated password gate',async()=>{
      await change(page,'ru');await page.locator('.site-lock').click();await page.locator('input[type="password"]:enabled').waitFor({timeout:20000});assert.equal(await page.locator('html').getAttribute('lang'),'ru');assert.equal(await page.locator('[data-gate-copy="title"]').innerText(),'Сайт заблокирован');
      const response=await page.request.get(new URL('assets/locales.js',base).href);assert([401,403,404].includes(response.status()),'private translations are closed after locking');
    });
    assert.deepEqual([...new Set(errors)],[],'no browser errors');console.log(JSON.stringify({passed,screenshots:output,base:base.href}));
  }finally{await context.close();await browser.close();}
})().catch(async e=>{console.error(String(e.stack||e).split(password).join('[REDACTED]'));if(browser)await browser.close().catch(()=>{});process.exitCode=1;});
