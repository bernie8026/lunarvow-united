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
  try { browser=await chromium.launch({headless:true}); }
  catch(error){server.close();fs.rmSync(output,{recursive:true,force:true});throw error;}
  const page=await browser.newPage({viewport:{width:1366,height:900}});
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
        await page.locator(`[data-language="${locale}"]`).click();
        await frames(page);
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
          controls:[...document.querySelectorAll('.header-tools button')].map(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height};})
        }));
        assert.equal(content.intro,'ALEX EXAMPLE.');
        assert(content.desc.length>10);
        assert.equal(content.desc,content.meta,'identity follows the current translated metadata');
        assert.equal(content.order[0],'identity');
        assert.equal(content.order[1],'selected-work');
        assert.equal(content.order[2],'home-hero');
        assert.equal(content.overflow,false,`${width}px ${locale} must not overflow`);
        for(const link of content.links){assert.equal(new URL(link.href).searchParams.get('lang'),locale);assert(link.label.length);}
        assert.equal(content.links.length,2);
        for(const r of content.controls){assert(r.w>0&&r.h>0&&r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,`${width}px ${locale} controls stay onscreen: ${JSON.stringify(r)}`);}
        for(let a=0;a<content.controls.length;a++)for(let b=a+1;b<content.controls.length;b++){
          const x=content.controls[a],y=content.controls[b];
          assert(Math.min(x.right,y.right)-Math.max(x.left,y.left)<=1 || Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)<=1,`${width}px ${locale} header controls must not overlap`);
        }
        if(width>1000){
          assert.equal(content.padding,224);assert.equal(content.headerWidth,224);
          for(const link of await page.locator('#main-nav > a').all()){
            await link.scrollIntoViewIfNeeded();
            const label=await link.locator('span[data-i18n]').evaluate(n=>{const r=n.getBoundingClientRect(),nav=n.closest('nav').getBoundingClientRect(),s=getComputedStyle(n);return{text:n.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,nav:{top:nav.top,bottom:nav.bottom},opacity:s.opacity,position:s.position};});
            assert.equal(label.position,'static');assert.equal(Number(label.opacity),1);
            assert(label.left>=0&&label.right<=224&&label.top>=label.nav.top-1&&label.bottom<=label.nav.bottom+1,`${width}px ${locale}: ${label.text} fits its scrollable rail`);
          }
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
    await page.evaluate(()=>document.querySelector('meta[name="description"]').content='Synthetic metadata updated independently of the language event.');
    await frames(page);
    assert.equal(await page.locator('[data-identity-description]').textContent(),'Synthetic metadata updated independently of the language event.');
    await page.setViewportSize({width:1366,height:900});
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).paddingLeft),'0px');
    assert.equal(await page.locator('.masthead').evaluate(n=>getComputedStyle(n).display),'none');
    await page.emulateMedia({media:'screen'});
    for(const [width,height,name] of [[1366,900,'desktop'],[390,844,'mobile']]){
      await page.setViewportSize({width,height});await page.locator('[data-language="zh-HK"]').click();
      await page.evaluate(()=>scrollTo(0,0));await frames(page);
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});
    }
    assert.deepEqual(errors,[]);
    const result={cases,themes:['dark','light'],locales,viewports:[1366,1024,1001,390,360],privateData:false,productionLogin:false};
    console.log(JSON.stringify(result));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(output,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
