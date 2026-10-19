"use strict";
window.PORTFOLIO_PAGES.register("motion", document.currentScript.src, scope => {
  const {requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, setInterval, clearInterval, IntersectionObserver} = scope;
  const body = document.body;
  const root = new URL("../", scope.src);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const sessionKey = "bernie-portfolio-arrival-v2";
  const labels = {
    "zh-HK": {subtitle:"個人作品集",poem:"由好奇心出發，將想法變成作品。",loading:"正在展開個人檔案",ready:"檔案已就緒",preparing:"正在準備網站素材…",resources:"資源載入",waiting:"素材已就緒，{seconds} 秒後進入 · 可以跳過等待",failed:"部分素材未能載入，可以重試或直接進入",enter:"繼續進入（部分素材未載入）",skip:"跳過動畫 / Skip",retry:"重試載入",replay:"重播入站動畫",access:"正在開啟頁面",title:"Bernie Leung — 入站動畫"},
    en: {subtitle:"PERSONAL PORTFOLIO",poem:"Starting with curiosity. Turning ideas into things you can use.",loading:"Opening the personal archive",ready:"Archive ready",preparing:"Preparing website assets…",resources:"Resources loaded",waiting:"Everything is ready · Entering in {seconds}s · Skip the wait",failed:"Some assets could not load. Retry or enter the site.",enter:"Continue with missing assets",skip:"Skip animation",retry:"Retry loading",replay:"Replay intro",access:"Opening page",title:"Bernie Leung — Arrival animation"},
    "zh-CN": {subtitle:"个人作品集",poem:"从好奇心出发，将想法变成作品。",loading:"正在展开个人档案",ready:"档案已就绪",preparing:"正在准备网站素材…",resources:"资源加载",waiting:"素材已就绪，{seconds} 秒后进入 · 可以跳过等待",failed:"部分素材无法加载，可以重试或直接进入",enter:"继续进入（部分素材未加载）",skip:"跳过动画 / Skip",retry:"重新加载",replay:"重播入站动画",access:"正在打开页面",title:"Bernie Leung — 入站动画"}
  };
  const text = () => labels[document.documentElement.lang] || labels["zh-HK"];
  let activeArrival = null;
  let motionAllowed = false;
  const states = new WeakMap();
  const elements = new Set();
  // Animate only selected moments. Reading, filtering and navigation remain immediate.
  const selector = "[data-motion], body[data-page=index] .hero-copy h1";
  const scenes = {
    "title": {frames:[{opacity:.35,transform:"translateY(18px)"},{opacity:1,transform:"none"}],duration:650},
    "image-wipe": {frames:[{clipPath:"inset(0 12% 0 0)",opacity:.6},{clipPath:"inset(0 0 0 0)",opacity:1}],duration:950},
    "photo-focus": {frames:[{opacity:.65,transform:"scale(.97)"},{opacity:1,transform:"scale(1)"}],duration:850}
  };
  function reveal(element) {
    const state = states.get(element);
    if (!state || !motionAllowed || state.revealed || element.hidden) return;
    state.revealed = true;
    observer?.unobserve(element);
    element.dataset.motionState = "ready";
    if (reduced.matches || body.classList.contains("motion-paused") || document.hidden || typeof element.animate !== "function") return;
    const scene = scenes[element.dataset.motion] || scenes.title;
    try {
      element.dataset.motionState = "revealing";
      const animation = element.animate(scene.frames,{duration:scene.duration,easing:"cubic-bezier(.2,.7,.3,1)"});
      state.animation = animation;
      animation.finished.catch(() => {}).then(() => {
        if (state.animation !== animation) return;
        state.animation = null;
        element.dataset.motionState = "ready";
      });
    } catch {element.dataset.motionState="ready";}
  }
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {if(entry.isIntersecting) reveal(entry.target);});
  },{threshold:.12}) : null;
  document.querySelectorAll(selector).forEach(element => {
    states.set(element,{revealed:false,animation:null});
    elements.add(element);
    observer?.observe(element);
  });
  function startPageMotion() {
    motionAllowed = true;
    elements.forEach(element => {
      const rect=element.getBoundingClientRect();
      if(!observer || reduced.matches || (rect.bottom>0 && rect.top<innerHeight)) reveal(element);
    });
  }
  scope.on(document, "focusin",event => {
    let element=event.target;
    while(element && element!==body){
      const state=states.get(element);
      if(state){state.animation?.cancel();state.animation=null;state.revealed=true;element.dataset.motionState="ready";}
      element=element.parentElement;
    }
  });
  scope.on(reduced, "change",() => {
    if(!reduced.matches)return;
    elements.forEach(element => {const state=states.get(element);state.animation?.cancel();state.animation=null;state.revealed=true;element.dataset.motionState="ready";});
    activeArrival?.skip();
  });
  function syncSceneMotion() {
    if (!reduced.matches && !document.hidden && !body.classList.contains("motion-paused")) return;
    elements.forEach(element => {const state=states.get(element);state.animation?.cancel();state.animation=null;element.dataset.motionState="ready";});
    if (body.classList.contains("motion-paused")) activeArrival?.skip();
  }
  scope.on(document, "portfolio:motion", syncSceneMotion);
  scope.on(document, "visibilitychange", syncSceneMotion);
  scope.on(window, "pageshow",event => {
    if(event.persisted){activeArrival?.cancel();showArrival("page");}
  });

  function showArrival(mode="intro") {
    if(activeArrival)return;
    const screen=document.createElement("div");
    screen.className="boot-screen boot-screen--cinematic";
    screen.dataset.mode=mode;
    screen.setAttribute("role","dialog");screen.setAttribute("aria-modal","true");screen.setAttribute("tabindex","-1");
    screen.innerHTML=`<div class="boot-screen__masthead" aria-hidden="true"><span><b>BL</b><span>BERNIE LEUNG</span></span><span>PERSONAL ARCHIVE / 2026</span></div>
      <div class="boot-screen__cinema"><div class="boot-screen__ambient" aria-hidden="true"></div><div class="boot-screen__particles" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*29+7)%100}%;--y:${(i*17+13)%100}%;--delay:${-i*.7}s;--duration:${7+i%5}s"></i>`).join("")}</div>
      <div class="boot-screen__copy"><span class="boot-screen__eyebrow">CREATIVE SYSTEM / BL–001</span><h2 class="boot-screen__title">BERNIE LEUNG.</h2><p class="boot-screen__subtitle"></p><p class="boot-screen__poem"></p><span class="boot-screen__signature" aria-hidden="true">LEARN · BUILD · CREATE<span>HONG KONG / PERSONAL ARCHIVE</span></span></div>
      <div class="boot-screen__visual" aria-hidden="true"><div class="boot-screen__moon"></div><div class="boot-screen__orbit boot-screen__orbit--outer"></div><div class="boot-screen__orbit boot-screen__orbit--inner"></div><svg class="boot-screen__ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="94"/><circle class="boot-screen__ring-progress" cx="100" cy="100" r="94" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg><img class="boot-screen__art" src="${new URL("assets/identity.webp?v=cyber-blue-1",root).href}" width="1520" height="1240" alt=""><span class="boot-screen__visual-code">AI & ICT / WEB / PHOTOGRAPHY</span></div></div>
      <div class="boot-screen__console"><div class="boot-screen__readout"><span class="boot-screen__phase"></span><span class="boot-screen__percentage" aria-hidden="true">000%</span></div><div class="boot-screen__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><small class="boot-screen__status" role="status" aria-live="polite"></small><div class="boot-screen__actions"><button class="boot-screen__retry" type="button" hidden></button><button class="boot-screen__skip-animation" type="button"></button></div></div>`;
    const background=Array.from(body.children).filter(element => element.tagName!=="SCRIPT");
    const previousInert=background.map(element=>element.inert);
    const previousFocus=document.activeElement;
    background.forEach(element=>{element.inert=true;});
    body.append(screen);body.classList.add("is-booting");
    window.BHR_ENTRY?.release();
    document.documentElement.classList.remove("page-loading-pending");
    const holdMs=mode==="intro"&&!reduced.matches&&!body.classList.contains("motion-paused")?2000:0;
    screen.dataset.holdMs=String(holdMs);
    let holdSkipped=false,readyAt=null;
    let progress={total:0,loaded:0,failed:[],running:true};
    let preloadReady=false,pageReady=false,pageFailed=false,leaving=false,finished=false,running=false;
    let exitTimer,task,tick;
    let resolveDone;
    const done=new Promise(resolve=>{resolveDone=resolve;});
    const skip=screen.querySelector(".boot-screen__skip-animation");
    const retry=screen.querySelector(".boot-screen__retry");
    const status=screen.querySelector(".boot-screen__status");
    const isFailed=()=>!running&&(pageFailed||progress.failed.length>0);
    const setText=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
    function render() {
      if(finished||scope.disposed)return;
      const label=text();
      const ready=preloadReady&&pageReady;
      if(ready&&readyAt===null){readyAt=performance.now();screen.dataset.readyAt=String(readyAt);}
      const effectiveHold=holdSkipped?0:holdMs;
      screen.dataset.holdMs=String(effectiveHold);
      const percent=ready?100:progress.total?Math.min(99,Math.floor(progress.loaded/progress.total*100)):0;
      const remaining=readyAt===null?0:Math.max(0,Math.ceil((effectiveHold-(performance.now()-readyAt))/1000));
      screen.dataset.phase=ready?"ready":isFailed()?"failed":"loading";
      screen.setAttribute("aria-label",mode==="intro"?label.title:label.access);
      setText(screen.querySelector(".boot-screen__subtitle"),label.subtitle);
      setText(screen.querySelector(".boot-screen__poem"),label.poem);
      setText(screen.querySelector(".boot-screen__phase"),ready?label.ready:label.loading);
      setText(screen.querySelector(".boot-screen__percentage"),String(percent).padStart(3,"0")+"%");
      const bar=screen.querySelector(".boot-screen__bar");bar.setAttribute("aria-label",label.resources);bar.setAttribute("aria-valuenow",String(percent));bar.firstElementChild.style.transform=`scaleX(${percent/100})`;
      screen.querySelector(".boot-screen__ring-progress").setAttribute("stroke-dashoffset",String(100-percent));
      setText(status,ready?(remaining?label.waiting.replace("{seconds}",remaining):label.ready):isFailed()?label.failed:progress.total?`${label.resources}: ${progress.loaded} / ${progress.total}`:label.preparing);
      setText(skip,isFailed()?label.enter:label.skip);skip.disabled=leaving;
      // Only a failed load offers an explicit partial-content fallback.
      skip.hidden=mode!=="intro"&&!isFailed();
      setText(retry,label.retry);retry.hidden=!isFailed();
    }
    function finish(enter=true) {
      if(finished)return;
      finished=true;clearInterval(tick);clearTimeout(exitTimer);task?.cancel();
      document.removeEventListener("keydown",onKey);document.removeEventListener("portfolio:language",render);
      if(enter&&mode!=="departure")try{sessionStorage.setItem(sessionKey,"complete");}catch{}
      screen.remove();body.classList.remove("is-booting");background.forEach((element,index)=>{element.inert=previousInert[index];});
      activeArrival=null;resolveDone();
      if(scope.disposed)return;
      startPageMotion();
      if(previousFocus instanceof HTMLElement && previousFocus!==body && previousFocus.isConnected)previousFocus.focus({preventScroll:true});
      else document.getElementById("main")?.focus({preventScroll:true});
    }
    function leave() {
      if(finished||leaving||mode==="departure")return;
      if(!preloadReady||!pageReady||readyAt===null||performance.now()-readyAt<(holdSkipped?0:holdMs))return;
      leaving=true;render();
      if(reduced.matches||body.classList.contains("motion-paused")){finish();return;}
      screen.classList.add("is-unveiling");
      if(mode==="intro")screen.style.animationDuration="320ms";
      exitTimer=setTimeout(finish,mode==="intro"?320:240);
    }
    function skipAnimation() {
      holdSkipped=true;render();leave();
    }
    function onKey(event) {
      if(event.key==="Escape"){
        event.preventDefault();
        if(mode==="departure")finish(false);else skipAnimation();
      }
      if(event.key==="Tab"){
        const controls=[retry,skip].filter(button=>!button.hidden&&!button.disabled);
        if(!controls.length){event.preventDefault();screen.focus();return;}
        const index=controls.indexOf(document.activeElement);
        const next=event.shiftKey?(index<=0?controls.length-1:index-1):(index+1)%controls.length;
        event.preventDefault();controls[next].focus();
      }
    }
    activeArrival={skip:skipAnimation,cancel:()=>finish(false),done};
    skip.addEventListener("click",()=>{if(isFailed())finish();else skipAnimation();});
    scope.on(document, "keydown",onKey);scope.on(document, "portfolio:language",render);
    screen.focus({preventScroll:true});render();
    if(mode==="departure"){
      // The router owns preparation, timeout and error recovery. Keep the
      // current page covered until it commits or reports a failed request.
      return;
    }
    const domReady=()=>document.readyState==="loading"?new Promise(resolve=>scope.on(document, "DOMContentLoaded",resolve,{once:true})):Promise.resolve();
    async function settlePage() {
      await domReady();
      const images=Array.from(document.images);
      images.forEach(image=>{
        image.loading="eager";
        if(image.complete&&!image.naturalWidth&&image.getAttribute("src"))image.src=image.src;
      });
      if(document.readyState!=="complete")await new Promise(resolve=>scope.on(window, "load",resolve,{once:true}));
      await document.fonts?.ready;
      // Decode the actual DOM images too; cached Image objects alone do not
      // guarantee that an offscreen element is ready for its first paint.
      await Promise.all(images.map(image=>image.decode()));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    }
    async function run() {
      if(finished||running)return;
      running=true;pageReady=false;pageFailed=false;preloadReady=false;readyAt=null;delete screen.dataset.readyAt;
      progress={...progress,failed:[],running:true};render();
      await domReady();
      if(finished||scope.disposed)return;
      let pageTimer;
      const pageWork=Promise.race([
        settlePage(),
        new Promise((_,reject)=>{pageTimer=setTimeout(()=>reject(new Error("Page readiness timeout")),60000);})
      ]).then(()=>{pageReady=true;},()=>{pageFailed=true;}).finally(()=>clearTimeout(pageTimer));
      let assetWork;
      if(location.protocol==="file:"){
        // Saved ZIPs cannot fetch a manifest. Browser load and DOM decode still gate entry.
        assetWork=Promise.resolve().then(()=>{preloadReady=true;});
      }else{
        if(!task)task=window.BHR_PRELOADER?.create(value=>{progress=value;render();});
        assetWork=task?task.run().then(ready=>{preloadReady=ready;}):Promise.resolve().then(()=>{progress={total:0,loaded:0,failed:["loader"],running:false};});
      }
      await Promise.all([pageWork,assetWork]);
      if(finished||scope.disposed)return;
      running=false;progress.running=false;render();leave();
    }
    retry.addEventListener("click",()=>run().catch(fail));
    function fail(){if(finished)return;running=false;progress.running=false;progress.failed=["loader"];render();}
    tick=setInterval(()=>{render();leave();},50);
    run().catch(fail);
  }
  const replay=document.querySelector(".motion-replay");
  if(replay){replay.hidden=false;replay.textContent=text().replay;replay.addEventListener("click",()=>showArrival("intro"));}
  scope.on(document, "portfolio:language",()=>{if(replay)replay.textContent=text().replay;});
  let firstArrival=true;
  try{firstArrival=sessionStorage.getItem(sessionKey)!=="complete";}catch{}
  if(firstArrival)showArrival("intro");else showArrival("page");
  const loading={show:showArrival,get finished(){return activeArrival?.done||Promise.resolve();}};
  window.BHR_LOADING=loading;
  scope.on(document,"portfolio:navigation-start",()=>showArrival("departure"));
  scope.on(document,"portfolio:navigation-error",()=>activeArrival?.cancel());
  scope.cleanup(()=>{activeArrival?.cancel();if(window.BHR_LOADING===loading)delete window.BHR_LOADING;});
});
