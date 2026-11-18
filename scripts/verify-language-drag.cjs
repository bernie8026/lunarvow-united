'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
// Pass a recovered/private assets/language-glass.js; no production login is used.
const implementation = fs.readFileSync(process.argv[2] || path.join(__dirname, '../.private/plain-site/assets/language-glass.js'), 'utf8');
(async()=>{
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,headless:true,args:['--disable-crash-reporter']});
 try {
 const ctx=await browser.newContext({viewport:{width:640,height:520},hasTouch:true,reducedMotion:'reduce'});
 const page=await ctx.newPage();
 await page.route('**/implementation.js', route => route.fulfill({contentType:'text/javascript',body:implementation}));
 const cdp=await ctx.newCDPSession(page);
 const errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 const out=[];
 async function reset(layout){await page.goto(pathToFileURL(path.join(__dirname,'test/fixtures/language-drag.html')).href+'?layout='+layout);await page.waitForSelector('.has-liquid-glass');await page.waitForTimeout(60);}
 async function centre(locale){const b=await page.locator('[data-language="'+locale+'"]').boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};}
 async function drag(device,layout,from,to,expected,mode='commit'){
  await reset(layout);
  const a=await centre(from),b= to ? await centre(to) : {x:470,y:320};
  const touch=async(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{...point,id:1}]:[]});
  if(device==='touch'){
   await touch('touchStart',a);
   for(let i=1;i<=6;i++)await touch('touchMove',{x:a.x+(b.x-a.x)*i/6,y:a.y+(b.y-a.y)*i/6});
  }else{
   await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});
  }
  await page.waitForTimeout(50);
  const preview=await page.locator('[data-glass-preview]').getAttribute('data-language',{timeout:200}).catch(()=>null);
  if(device==='touch')await touch(mode==='cancel'?'touchCancel':'touchEnd');
  else{if(mode==='cancel')await page.keyboard.press('Escape');await page.mouse.up();}
  await page.waitForTimeout(70);const commits=await page.evaluate(()=>window.commits.slice());
  out.push({device,layout,from,to,mode,preview,commits,pass:JSON.stringify(commits)===JSON.stringify(expected)&&(expected.length===0||preview===to)});
 }
 for(const dev of ['mouse','touch']){
  await drag(dev,'grid','zh-HK','ko',['ko']);await drag(dev,'grid','en','ru',['ru']);
  await drag(dev,'two-columns','zh-HK','ko',['ko']);await drag(dev,'two-columns','en','ru',['ru']);
  await drag(dev,'row','zh-HK','th',['th']);await drag(dev,'column','zh-HK','th',['th']);
  await drag(dev,'grid','zh-HK','ko',[],'cancel');await drag(dev,'grid','en',null,[]);
  for(const loc of ['zh-HK','en','zh-CN','ja','ko','th','ru']){
   await reset('grid');const b=page.locator('[data-language="'+loc+'"]');
   if(dev==='touch')await b.tap();else await b.click();
   const commits=await page.evaluate(()=>window.commits.slice());out.push({device:dev,mode:'tap',to:loc,commits,pass:JSON.stringify(commits)===JSON.stringify([loc])});
  }
 }
 console.log(JSON.stringify({total:out.length,passed:out.filter(x=>x.pass).length,failures:out.filter(x=>!x.pass),pageErrors:errs}));process.exitCode=out.some(x=>!x.pass)||errs.length?1:0;
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=2;});
