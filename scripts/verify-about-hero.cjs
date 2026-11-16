'use strict';
// Local contract fixture matching the hero DOM/computed values observed in the
// user's already-open About tab. Copy is synthetic; no archive/login is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const locales = ['zh-HK', 'en', 'zh-CN', 'ja', 'ko', 'th', 'ru'];
const copy = {
  'zh-HK': ['個人資料', '你好，我係', 'ALEX EXAMPLE.', '我喺香港學習科技，同時用網頁、影像同實作記錄新想法。', '傾下合作機會', '了解我嘅故事', '網頁設計', '角色攝影', 'STEM 實作'],
  en: ['ABOUT ME', 'Hello, I’m', 'ALEX EXAMPLE.', 'A student in Hong Kong exploring technology through websites, photography and hands-on projects.', 'Let’s work together', 'Discover my story', 'WEB DESIGN', 'COSPLAY PHOTOGRAPHY', 'STEM PROJECTS'],
  'zh-CN': ['个人资料', '你好，我是', 'ALEX EXAMPLE.', '我在香港学习科技，同时用网页、影像与实践记录新的想法。', '聊聊合作机会', '了解我的故事', '网页设计', '角色摄影', 'STEM 实践'],
  ja: ['プロフィール', 'こんにちは、', 'ALEX EXAMPLE.', '香港で技術を学びながら、ウェブ制作、写真、実践を通して新しいアイデアを記録しています。', '一緒に作りましょう', '私のストーリーを見る', 'ウェブデザイン', 'コスプレ写真', 'STEM プロジェクト'],
  ko: ['소개', '안녕하세요,', 'ALEX EXAMPLE.', '홍콩에서 기술을 배우며 웹사이트, 사진, 직접 만드는 프로젝트로 새로운 생각을 기록합니다.', '함께 작업해요', '내 이야기 알아보기', '웹 디자인', '코스프레 사진', 'STEM 프로젝트'],
  th: ['เกี่ยวกับฉัน', 'สวัสดี ฉันคือ', 'ALEX EXAMPLE.', 'นักเรียนในฮ่องกงที่เรียนรู้เทคโนโลยีผ่านเว็บไซต์ การถ่ายภาพ และโครงการที่ลงมือทำจริง', 'มาสร้างผลงานด้วยกัน', 'อ่านเรื่องราวของฉัน', 'ออกแบบเว็บไซต์', 'ถ่ายภาพคอสเพลย์', 'โครงการ STEM'],
  ru: ['ОБО МНЕ', 'Привет, я', 'ALEX EXAMPLE.', 'Я учусь в Гонконге и исследую технологии через создание сайтов, фотографию и практические проекты.', 'Давайте работать вместе', 'Узнать мою историю', 'ВЕБ-ДИЗАЙН', 'КОСПЛЕЙ-ФОТОГРАФИЯ', 'STEM-ПРОЕКТЫ']
};
const expectedHello = { 'zh-HK':'你好，我係', en:'Hello, I’m', 'zh-CN':'你好，我是', ja:'こんにちは', ko:'안녕하세요', th:'สวัสดี ฉันคือ', ru:'Привет, я' };
const monogram = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="760" height="620"><rect width="760" height="620" fill="#0879bb"/><text x="380" y="350" text-anchor="middle" font-size="180" fill="white">AX</text></svg>').toString('base64');
function fixture() {
  const original = fs.readFileSync(path.join(root, 'scripts/test/fixtures/portfolio-ui.html'), 'utf8');
  const head = original.slice(0, original.indexOf('<main ')).replace('data-page="index"', 'data-page="about"');
  const footer = original.slice(original.indexOf('</main>') + 7, original.indexOf('<script>(()=>{'));
  // These reproduce the observed sizing/asymmetric padding/optical offsets.
  // Other presentation rules are deliberately ordinary fixture styling.
  const css = `<style id="fixture-about-style">
  .about-apple-page{overflow:hidden}.about-apple-hero{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:96px 100px 96px 32px;min-height:780px;background:var(--bg);color:var(--ink)}
  .about-apple-number{position:absolute;top:24px;right:28px;opacity:.15}.about-apple-kicker{position:relative;left:var(--about-ink-offset,0px);font:12px/1.7 monospace;letter-spacing:.14em;margin:0 0 24px}
  .about-apple-hero h1{width:960px;max-width:960px;font-size:76px;line-height:1.06;margin:0 auto 32px;font-weight:750;letter-spacing:-.05em}.about-apple-hero h1>span{display:block;position:relative;left:var(--about-ink-offset,0px)}.about-apple-hero h1>span:first-child{font-size:42.56px}.about-apple-gradient{color:var(--signal)}
  .about-apple-tagline{max-width:760px;font-size:19px;line-height:1.8;margin:0 auto 32px}.about-apple-actions{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin:0 auto 40px}.about-apple-actions>a{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:12px 20px;border:1px solid var(--line);line-height:1.5}.about-apple-button{background:var(--signal);color:var(--signal-ink)}
  .about-apple-disciplines{display:flex;align-items:center;gap:18px;flex-wrap:wrap;font:12px/1.8 monospace;letter-spacing:.08em}.about-apple-disciplines i{width:3px;height:3px;border-radius:50%;background:currentColor}.about-fixture-story{padding:48px}.about-fixture-story h2{font-size:36px}.about-apple-portrait{margin:0;overflow:hidden}.about-apple-portrait img{display:block;width:100%;height:auto}.about-apple-portrait figcaption{text-align:center}
  @media(max-width:1000px){.about-apple-hero{padding-top:64px;min-height:650px}}
  </style>`;
  const main = `<main id="main" class="about-apple-page" tabindex="-1"><section class="about-apple-hero" aria-labelledby="about-apple-title"><span class="about-apple-number" aria-hidden="true">01</span><p class="about-apple-kicker" data-i18n="t033" style="--about-ink-offset:0.77px"></p><h1 id="about-apple-title" data-motion="title"><span data-i18n="aboutHello" style="--about-ink-offset:7.53px"></span><span class="about-apple-gradient" data-i18n="aboutName" style="--about-ink-offset:10.3px"></span></h1><p class="about-apple-tagline"></p><div class="about-apple-actions"><a class="about-apple-button" href="contact.html?lang=zh-HK" data-internal data-i18n="t044"></a><a class="about-apple-link" href="#my-story"><span data-i18n="aboutDiscover"></span><span aria-hidden="true">↓</span></a></div><div class="about-apple-disciplines"><span></span><i aria-hidden="true"></i><span></span><i aria-hidden="true"></i><span></span></div></section><section class="about-fixture-story" id="my-story"><h2>Unchanged story fixture.</h2><p>Content outside the hero remains connected and unchanged.</p><a href="experience.html?lang=zh-HK" data-internal>Experience</a></section><figure class="about-apple-portrait"><img src="${monogram}" alt="Original synthetic AX monogram" width="760" height="620" decoding="async"><figcaption>AX / ORIGINAL IDENTITY.</figcaption></figure></main>`;
  const script = `<script>
  const copy=${JSON.stringify(copy)};
  window.__aboutAuthReads=[];const trap=name=>{window.__aboutAuthReads.push(name);throw Error('Private API read '+name)};
  for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){return trap(name)}});
  Object.defineProperty(document,'cookie',{get(){return trap('cookie')}});Object.defineProperty(navigator,'credentials',{get(){return trap('credentials')}});window.fetch=()=>trap('fetch');window.XMLHttpRequest=function(){trap('XMLHttpRequest')};
  window.__heroOriginalNodes=[...document.querySelector('.about-apple-hero').querySelectorAll('*')];window.__storyOriginal=document.querySelector('#my-story').outerHTML;window.__brandOriginalNodes=[...document.querySelector('.brand').children];window.__portraitOriginalImage=document.querySelector('.about-apple-portrait img');window.__portraitOriginalCaption=document.querySelector('.about-apple-portrait figcaption');
  window.__renderAbout=lang=>{document.documentElement.lang=lang;const c=copy[lang];for(const [selector,index] of [['.about-apple-kicker',0],['[data-i18n=aboutHello]',1],['[data-i18n=aboutName]',2],['.about-apple-tagline',3],['[data-i18n=t044]',4],['[data-i18n=aboutDiscover]',5]])document.querySelector(selector).textContent=c[index];document.querySelectorAll('.about-apple-disciplines>span').forEach((n,i)=>n.textContent=c[i+6]);document.querySelectorAll('[data-language]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.language===lang)));document.querySelectorAll('a[data-internal]').forEach(n=>{const u=new URL(n.href);u.searchParams.set('lang',lang);n.href=u.href});for(const [selector,value] of [['.about-apple-kicker',.77],['[data-i18n=aboutHello]',7.53],['[data-i18n=aboutName]',10.3]])document.querySelector(selector).style.setProperty('--about-ink-offset',value+'px');document.dispatchEvent(new CustomEvent('portfolio:language',{detail:{language:lang}}));};
  document.querySelectorAll('[data-language]').forEach(n=>n.onclick=()=>window.__renderAbout(n.dataset.language));document.querySelector('.theme-toggle').onclick=()=>document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark';document.querySelector('.menu-toggle').onclick=e=>{const on=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(on));document.querySelector('#main-nav').dataset.open=String(on)};window.__renderAbout('zh-HK');
  </script>`;
  return head.replace('</head>', '<link rel="icon" href="'+monogram+'">' + css + '</head>') + main + footer + script + '</body></html>';
}
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const waitWidth = (page, width) => page.waitForFunction(width => Math.abs(document.querySelector('.masthead').getBoundingClientRect().width - width) < .25, width);
async function headlines(page, hello, name, label) {
  assert.equal(await page.locator('[data-i18n="aboutHello"]').textContent(),hello,label+' greeting has no trailing punctuation');
  assert.equal(await page.locator('[data-i18n="aboutName"]').textContent(),name,label+' name has no trailing punctuation');
  assert.equal(await page.locator('#about-apple-title').getAttribute('data-motion'),'title');
  assert.equal(await page.locator('#about-apple-title > span').count(),2);
  assert.equal(await page.locator('#about-apple-title > .about-apple-gradient[data-i18n="aboutName"]').count(),1);
  assert(await page.evaluate(()=>window.__heroOriginalNodes.every(n=>n.isConnected)),label+' translation and motion nodes remain connected');
}
async function liverbird(page, label) {
  const mark=page.locator('.brand > img.portfolio-liverbird[data-portfolio-bird-mark]');
  assert.equal(await mark.count(),1);
  await page.locator('.brand img[data-portfolio-bird-mark],.about-apple-portrait img').evaluateAll(nodes=>Promise.all(nodes.map(node=>node.decode())));
  const state=await page.evaluate(()=>{
    const mark=document.querySelector('.brand > img[data-portfolio-bird-mark]'),brand=mark.closest('.brand'),old=brand.querySelector('.brand-mark'),image=document.querySelector('.about-apple-portrait img'),caption=document.querySelector('.about-apple-portrait figcaption'),r=image.getBoundingClientRect(),m=mark.getBoundingClientRect();
    return{src:mark.src,portrait:image.src,icon:document.querySelector('link[rel~=icon]')?.href,alt:mark.alt,hidden:mark.getAttribute('aria-hidden'),brandMarker:brand.hasAttribute('data-portfolio-bird'),brandName:brand.querySelector('strong').textContent,brandHref:brand.href,oldConnected:window.__brandOriginalNodes.every(n=>n.isConnected),oldHidden:getComputedStyle(old).display==='none',portraitSame:window.__portraitOriginalImage===image,captionSame:window.__portraitOriginalCaption===caption,portraitMarker:!!image.closest('[data-portfolio-bird-portrait]'),caption:caption.textContent,portraitAlt:image.alt,objectFit:getComputedStyle(image).objectFit,natural:[mark.naturalWidth,mark.naturalHeight,image.naturalWidth,image.naturalHeight],portraitBox:{left:r.left,right:r.right,height:r.height},markBox:{left:m.left,right:m.right,height:m.height},width:innerWidth};
  });
  assert(/^data:image\/svg\+xml[;,]/.test(state.src),label+' header uses embedded SVG without a new network asset');
  assert(state.src===state.portrait,label+' header and portrait use the same Liver bird');assert(state.src===state.icon,label+' favicon uses the same Liver bird');
  assert.equal(state.alt,'');assert.equal(state.hidden,'true');assert(state.brandMarker);
  assert.equal(state.brandName,'ALEX EXAMPLE');assert.equal(new URL(state.brandHref).pathname,'/index.html');
  assert((await page.locator('.brand').ariaSnapshot()).includes('ALEX EXAMPLE'),label+' collapsed brand link retains its accessible name');
  assert(state.oldConnected&&state.oldHidden,label+' old mark remains connected and hidden');
  assert(state.portraitSame&&state.captionSame&&state.portraitMarker,label+' original portrait nodes are reused');
  assert.equal(state.caption,'LIVER BIRD / LIVERPOOL FC');assert(state.portraitAlt.trim()&&!state.portraitAlt.includes('AX'));
  if(await page.locator('html').getAttribute('lang')==='zh-HK')assert.equal(state.portraitAlt,'利物浦 Liver bird 標誌');
  assert.equal(state.objectFit,'contain');assert(state.natural.every(value=>value>0),label+' both SVG images decode');
  assert(state.portraitBox.left>=-1&&state.portraitBox.right<=state.width+1,label+' portrait stays inside viewport');
  assert(state.portraitBox.height>=299&&state.portraitBox.height<=561,label+' portrait keeps bounded display height');
  assert(state.markBox.left>=-1&&state.markBox.right<=state.width+1&&state.markBox.height>0,label+' header logo stays visible');
}
async function headlineRerenders(page) {
  const cases=[
    ['zh-HK','你好，我係，','ALEX EXAMPLE。','你好，我係'],
    ['en','Hello, I’m...','ALEX EXAMPLE.','Hello, I’m'],
    ['zh-CN','你好，我是。','ALEX EXAMPLE！','你好，我是'],
    ['ja','こんにちは、','ALEX EXAMPLE。','こんにちは'],
    ['ko','안녕하세요,','ALEX EXAMPLE.','안녕하세요'],
    ['th','สวัสดี ฉันคือ,','ALEX EXAMPLE.','สวัสดี ฉันคือ'],
    ['ru','Привет, я!','ALEX EXAMPLE.','Привет, я']
  ];
  for(const [lang,hello,name,expected] of cases){
    await page.evaluate(lang=>window.__renderAbout(lang),lang);await frame(page);
    // A source controller may re-render the title without a locale event.
    await page.evaluate(({hello,name})=>{document.querySelector('[data-i18n=aboutHello]').textContent=hello;document.querySelector('[data-i18n=aboutName]').textContent=name;},{hello,name});
    await frame(page);await headlines(page,expected,'ALEX EXAMPLE','independent re-render/'+lang);await centered(page,'independent re-render/'+lang);
  }
  return cases.length;
}
async function centered(page, label) {
  const state = await page.evaluate(() => {
    const hero = document.querySelector('.about-apple-hero'), h = hero.getBoundingClientRect(), style = getComputedStyle(hero);
    const axis = (h.left + parseFloat(style.paddingLeft) + h.right - parseFloat(style.paddingRight)) / 2;
    const bounds = node => { const r = node.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, center:(r.left+r.right)/2 }; };
    const text = selector => [...hero.querySelectorAll(selector)].flatMap(node => { const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), boxes = []; let child; while (child = walker.nextNode()) { if (!child.textContent.trim()) continue; const range = document.createRange(); range.selectNodeContents(child); for (const r of range.getClientRects()) if (r.width > 0) boxes.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom,center:(r.left+r.right)/2}); } return boxes; });
    const rows = selector => { const group=hero.querySelector(selector), all=[...group.children].map(bounds).filter(r=>r.width>0), rows=[]; for(const box of all){let row=rows.find(row=>box.top<row.bottom&&box.bottom>row.top);if(!row){row={top:box.top,bottom:box.bottom,left:box.left,right:box.right};rows.push(row)}else{row.top=Math.min(row.top,box.top);row.bottom=Math.max(row.bottom,box.bottom);row.left=Math.min(row.left,box.left);row.right=Math.max(row.right,box.right)}}return rows.map(r=>({...r,center:(r.left+r.right)/2}));};
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,axis,padding:[style.paddingLeft,style.paddingRight],hero:bounds(hero),boxes:['.about-apple-kicker','h1','.about-apple-tagline','.about-apple-actions','.about-apple-disciplines'].map(selector=>({selector,...bounds(hero.querySelector(selector))})),text:text('.about-apple-kicker,h1>span,.about-apple-tagline'),rows:[...rows('.about-apple-actions'),...rows('.about-apple-disciplines')],offsets:[...hero.querySelectorAll('.about-apple-kicker,h1>span')].map(n=>({left:getComputedStyle(n).left,offset:getComputedStyle(n).getPropertyValue('--about-ink-offset').trim()})),connected:window.__heroOriginalNodes.every(n=>n.isConnected),auth:window.__aboutAuthReads,story:document.querySelector('#my-story').outerHTML.replaceAll(location.origin+'/',''),ctas:[...hero.querySelectorAll('a')].map(n=>({href:n.getAttribute('href'),height:n.getBoundingClientRect().height,text:n.textContent.trim()}))};
  });
  assert.equal(state.padding[0],state.padding[1],label+' hero has equal inline padding');
  assert(state.scrollWidth<=state.width+1,label+' page fits viewport');
  assert(state.connected,label+' original hero nodes stay connected');assert.deepEqual(state.auth,[]);
  for(const box of state.boxes){assert(Math.abs(box.center-state.axis)<=1,label+' '+box.selector+' shares hero axis: '+JSON.stringify(box));assert(box.left>=state.hero.left-1&&box.right<=state.hero.right+1,label+' '+box.selector+' stays in hero');}
  for(const line of state.text){assert(line.left>=state.hero.left-1&&line.right<=state.hero.right+1,label+' rendered text is not cropped: '+JSON.stringify(line));assert(Math.abs(line.center-state.axis)<=1.5,label+' text line shares central axis: '+JSON.stringify(line));}
  for(const row of state.rows)assert(Math.abs(row.center-state.axis)<=2,label+' action/tag row is centered: '+JSON.stringify(row));
  for(const offset of state.offsets){assert.equal(offset.left,'0px',label+' optical position resets');assert.equal(parseFloat(offset.offset),0,label+' inline optical variable is overridden');}
  for(const cta of state.ctas){assert(cta.text);assert(cta.height>=44,label+' CTA target retains44px height');}
  const lang=await page.locator('html').getAttribute('lang');assert.equal(new URL(state.ctas[0].href,page.url()).searchParams.get('lang'),lang);assert.equal(state.ctas[1].href,'#my-story');
  assert.equal(state.story,await page.evaluate(()=>window.__storyOriginal.replace(/lang=zh-HK/g,'lang='+document.documentElement.lang)),label+' outsidehero content is unchanged');
}
async function navigationSmoke(page) {
  await page.setViewportSize({width:1440,height:960});await page.mouse.move(1438,958);await page.evaluate(()=>document.activeElement?.blur());await waitWidth(page,84);
  const geometry=()=>page.evaluate(()=>{const r=document.querySelector('.about-apple-hero').getBoundingClientRect();return{left:r.left,width:r.width,padding:getComputedStyle(document.body).paddingLeft,scrollY}});
  const before=await geometry();assert.equal(before.padding,'84px');
  await page.locator('.masthead').hover({position:{x:42,y:40}});await waitWidth(page,224);assert.deepEqual(await geometry(),before);
  // The live brand's existing glass pane sits at z-index 4 and does not copy
  // images. Reproduce that overlap so it cannot wash out the new bird.
  const overlay=await page.locator('.brand').evaluate(brand=>{
    brand.style.position='relative';
    const lens=document.createElement('div');lens.className='navigation-lens';lens.setAttribute('aria-hidden','true');lens.inert=true;
    lens.style.cssText='position:absolute;inset:0;z-index:4;background:rgba(240,250,255,.9)';brand.append(lens);
    const mark=brand.querySelector('[data-portfolio-bird-mark]'),r=mark.getBoundingClientRect(),p=lens.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    return{covered:x>=p.left&&x<=p.right&&y>=p.top&&y<=p.bottom,topIsBird:document.elementFromPoint(x,y)===mark};
  });
  assert(overlay.covered,'fixture glass pane covers the logo position');assert(overlay.topIsBird,'bird remains clear above the existing navigation glass');
  await page.locator('.brand > .navigation-lens').evaluate(node=>node.remove());
  await page.mouse.move(1438,958);await waitWidth(page,84);
  await page.locator('.brand').focus();await page.keyboard.press('Tab');await waitWidth(page,224);
  await page.locator('main').evaluate(n=>n.focus({preventScroll:true}));await waitWidth(page,84);assert.deepEqual(await geometry(),before);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).paddingLeft),'0px');
  await page.locator('.menu-toggle').click();assert.equal(await page.locator('#main-nav').getAttribute('data-open'),'true');assert.equal(await page.locator('#main-nav>a:visible').count(),8);await page.locator('.menu-toggle').click();
}
async function run() {
  let browser;const errors=[],external=[];let cases=0;
  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://fixture.test');if(url.pathname==='/favicon.ico'){response.writeHead(204).end();return;}
    if(url.pathname==='/about.html'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(fixture());return;}
    if(url.pathname==='/assets/protected-ui.js'){response.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(fs.readFileSync(path.join(root,'protection/assets/protected-ui.js')));return;}
    response.writeHead(404).end('Unknown fixture resource');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  try{
    browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL?{channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL}:{})});
    const page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();external.push(route.request().url());return route.abort();});
    await page.goto(base+'/about.html',{waitUntil:'load'});await page.locator('body[data-portfolio-clarity]').waitFor();
    for(const theme of ['dark','light'])for(const [width,height] of [[3840,2160],[1440,960],[1001,540],[390,844],[320,740]]){
      await page.setViewportSize({width,height});await page.mouse.move(width-2,height-2);await page.evaluate(theme=>{document.body.dataset.theme=theme;document.activeElement?.blur()},theme);
      for(const lang of locales){await page.evaluate(lang=>window.__renderAbout(lang),lang);await frame(page);await headlines(page,expectedHello[lang],'ALEX EXAMPLE',theme+'/'+width+'/'+lang);await centered(page,theme+'/'+width+'/'+lang);await liverbird(page,theme+'/'+width+'/'+lang);cases++;}
    }
    const headlineCases=await headlineRerenders(page);
    await navigationSmoke(page);
    await page.emulateMedia({reducedMotion:'reduce'});await frame(page);await centered(page,'reduced-motion/390px');
    if(process.env.ABOUT_HERO_SCREENSHOTS){
      fs.mkdirSync(process.env.ABOUT_HERO_SCREENSHOTS,{recursive:true});
      for(const [width,height,name] of [[1440,960,'desktop'],[390,844,'mobile']]){
        await page.setViewportSize({width,height});await page.evaluate(()=>{window.__renderAbout('zh-HK');document.body.dataset.theme='dark';document.activeElement?.blur();scrollTo(0,0)});await page.mouse.move(width-2,height-2);await frame(page);
        await page.screenshot({path:path.join(process.env.ABOUT_HERO_SCREENSHOTS,'about-centered-'+name+'.png'),fullPage:false});
      }
    }
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log(JSON.stringify({cases,headlineCases,locales,viewports:[3840,1440,1001,390,320],themes:['dark','light'],observedHeroDOMContract:true,syntheticCopyAndBaseCSS:true,actualAuthenticatedPageTested:false,productionLogin:false,navigationSmoke:true,reducedMotion:true}));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack);process.exitCode=1});
module.exports={fixture};
