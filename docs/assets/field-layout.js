/* Shared atlas: use the current document's own navigation, content and locale. */
(() => {
  'use strict';
  if (window.__unitedFieldAtlas) return;
  window.__unitedFieldAtlas = true;
  const translations = {
    'zh-HK':['章節地圖','本頁索引'], 'zh-CN':['章节地图','本页索引'],
    en:['Chapter map','On this page'], ja:['チャプターマップ','ページ内目次'],
    ko:['챕터 지도','페이지 목차'], th:['แผนผังบท','สารบัญหน้านี้'], ru:['Карта разделов','На странице']
  };
  const extraLabels = {
    'zh-HK':['首頁','聯絡','網站索引'], 'zh-CN':['首页','联系','网站索引'], en:['Home','Contact','Site index'],
    ja:['ホーム','連絡先','サイト索引'], ko:['홈','연락처','사이트 색인'],
    th:['หน้าแรก','ติดต่อ','ดัชนีเว็บไซต์'], ru:['Главная','Контакты','Указатель сайта']
  };
  const make = (type, cls) => Object.assign(document.createElement(type), { className:cls });
  const compact = s => (s || '').replace(/\s+/g,' ').trim();
  let mounted = null;
  function mount() {
    const doc = document.documentElement, body = document.body, main = document.querySelector('main#main');
    const header = body?.querySelector('.masthead'), nav = header?.querySelector('.main-nav'), original = header?.querySelector('.menu-toggle');
    if (mounted && mounted.main === main && mounted.header === header && mounted.page === body?.dataset.page) { mounted.refresh(); return; }
    mounted?.dispose(); mounted = null;
    if (!body?.dataset.page || body.hasAttribute('data-protected-gate') || !main || !header || !nav || !original) return;
    const controller = new AbortController(), listen = (el,event,fn,extra={}) => el.addEventListener(event,fn,{...extra,signal:controller.signal});
    const menu = make('button','field-menu-button'), route=make('span','field-route'),
      optical=make('span','field-plate'), details=make('details','field-contents'), summary=make('summary','field-index-toggle'), list=make('ol','field-index-list');
    const slug = body.dataset.page, oldHidden=nav.hidden;
    let currentNodes=[], disposed=false, queued=false;
    menu.type='button'; menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-controls',nav.id || (nav.id='main-nav'));
    route.setAttribute('aria-hidden','true'); optical.setAttribute('aria-hidden','true');
    details.hidden=true; details.append(summary,list);
    original.before(route,menu); nav.prepend(optical); nav.after(details);
    body.setAttribute('data-field-layout',''); doc.setAttribute('data-field-shell','');
    function toggle(open, focus=false) {
      if(open) details.open=false;
      nav.hidden=!open; nav.toggleAttribute('data-field-open',open);
      menu.setAttribute('aria-expanded',String(open));
      if(focus) menu.focus({preventScroll:true});
    }
    toggle(false);
    let indexSignature='', headingCounter=0;
    // The old side rail only listed the middle chapters. Include the home,
    // contact and directory destinations, using the existing router's links.
    const extras=[];
    for(const [i,page] of ['index','contact','sitemap'].entries()) {
      if([...nav.querySelectorAll('a[href]')].some(a=>new URL(a.href,document.baseURI).pathname.endsWith('/'+page+'.html'))) continue;
      const a=make('a','field-extra'), n=make('span','nav-index'), label=make('span','field-label');
      n.setAttribute('aria-hidden','true'); n.textContent=page==='index'?'⌂':(page==='contact'?'@':'≡');
      a.setAttribute('data-internal','');a.append(n,label);
      if(page==='index') optical.after(a);else nav.append(a);
      extras.push({i,page,a,label});
    }
    function refresh() {
      if(disposed || !main.isConnected) return;
      const lang = doc.lang, words=translations[lang] || translations[lang.split('-')[0]] || translations.en;
      menu.textContent=words[0]; summary.textContent=words[1];
      const names=extraLabels[lang] || extraLabels.en;
      for(const {i,page,a,label} of extras) {
        const url=new URL(page+'.html',document.baseURI);url.searchParams.set('lang',lang || 'zh-HK');
        a.href=url.pathname+url.search;label.textContent=names[i];
      }
      const links=Array.from(nav.querySelectorAll('a[href]'));
      const current=links.find(a=>new URL(a.href,document.baseURI).pathname.endsWith('/'+slug+'.html')) || nav.querySelector('a[aria-current="page"]');
      if(current) for(const a of links) {
        if(a===current) a.setAttribute('aria-current','page');else if(a.hasAttribute('aria-current')) a.removeAttribute('aria-current');
      }
      route.textContent=compact(current?.querySelector('[data-i18n],.field-label')?.textContent || current?.textContent);
      const items=[];
      for(const el of main.querySelectorAll('h2')) {
        if(el.closest('nav,dialog,[hidden],[aria-hidden="true"],[data-reference-original],details:not([open])') || el.matches('.sr-only,.visually-hidden') || !el.getClientRects().length) continue;
        const label=compact(el.textContent);
        if(!label) continue;
        let target=el;
        if(!el.id) {
          const section=el.closest('section[id]');
          if(section && section.querySelector('h1,h2')===el) target=section;
          else {
            let id; do {id='field-'+slug+'-'+(++headingCounter);} while(document.getElementById(id));
            el.id=id;
          }
        }
        items.push({target,label});
      }
      currentNodes=items;
      const sig=JSON.stringify(items.map(({target,label})=>[target.id,label]));
      if(sig!==indexSignature) {
        indexSignature=sig; const links=document.createDocumentFragment();
        for(const {target,label} of items) {
          const li=document.createElement('li'), a=document.createElement('a');
          a.href='#'+encodeURIComponent(target.id);a.textContent=label;li.append(a);links.append(li);
        }
        list.replaceChildren(links);
      }
      details.hidden=items.length<2;
      if(details.hidden) details.open=false;
    }
    function schedule() {
      if(disposed||queued) return;
      queued=true; requestAnimationFrame(()=>{queued=false;refresh();});
    }
    function closeIndex(focus) {details.open=false;if(focus) summary.focus({preventScroll:true});}
    listen(menu,'click',()=>toggle(menu.getAttribute('aria-expanded')!=='true'));
    listen(nav,'click',e=>{if(e.target.closest('a')) toggle(false,true);});
    listen(details,'toggle',()=>{ if(details.open) toggle(false); });
    listen(list,'click',e=>{
      const a=e.target.closest('a');if(!a || e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
      const item=currentNodes[Array.prototype.indexOf.call(list.children,a.parentElement)];
      if(!item) return;
      closeIndex(false);
      if(!item.target.hasAttribute('tabindex')) item.target.tabIndex=-1;
      item.target.focus({preventScroll:true});
    });
    listen(document,'keydown',e=>{if(e.key==='Escape') {
      if(menu.getAttribute('aria-expanded')==='true') {toggle(false,true);e.preventDefault();}
      else if(details.open) {closeIndex(true);e.preventDefault();}
    }});
    listen(document,'pointerdown',e=>{if(!header.contains(e.target)) {toggle(false);closeIndex(false);}});
    listen(document,'focusin',e=>{if(!header.contains(e.target)) {toggle(false);closeIndex(false);}});
    listen(document,'portfolio:language',schedule);
    const hasTitle=node=>node.nodeType===1 && (node.matches('h2') || !!node.querySelector('h2'));
    const observe=new MutationObserver(records=>{
      for(const r of records) {
        if(r.target.parentElement?.closest('h2') || (r.target.nodeType===1 && r.target.matches('h2')) ||
           (r.type==='attributes' && hasTitle(r.target)) ||
           (r.type==='childList' && [...r.addedNodes,...r.removedNodes].some(hasTitle))) {schedule();break;}
      }
    });
    observe.observe(main,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-hidden','open']});
    const measure=()=>{if(!disposed)doc.style.setProperty('--field-header-height',Math.ceil(header.getBoundingClientRect().height)+'px');};
    const size=new ResizeObserver(measure);size.observe(header);
    listen(window,'resize',schedule,{passive:true});listen(window,'pageshow',schedule);
    refresh();schedule();measure();
    mounted={main,header,page:slug,refresh:schedule,dispose(){
      disposed=true;controller.abort();observe.disconnect();size.disconnect();
      extras.forEach(e=>e.a.remove());nav.hidden=oldHidden;nav.removeAttribute('data-field-open');[route,menu,optical,details].forEach(n=>n.remove());
      body.removeAttribute('data-field-layout');doc.removeAttribute('data-field-shell');doc.style.removeProperty('--field-header-height');
    }};
  }
  document.addEventListener('portfolio:navigated',mount);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
