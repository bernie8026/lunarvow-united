"use strict";
(() => {
  const body = document.body;
  const root = new URL("../", document.currentScript.src);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const sessionKey = "bernie-portfolio-arrival-v2";
  const labels = {
    "zh-HK": {subtitle:"個人作品集",poem:"由好奇心出發，將想法變成作品。",loading:"正在展開個人檔案",ready:"檔案已就緒",preparing:"正在準備網站素材…",resources:"資源載入",waiting:"入站動畫播放中，餘下 {seconds} 秒 · 可以隨時跳過",failed:"部分素材未能載入，可以重試或直接進入",skip:"跳過動畫 / Skip",retry:"重試載入",replay:"重播入站動畫",access:"正在開啟頁面",title:"Bernie Leung — 入站動畫"},
    en: {subtitle:"PERSONAL PORTFOLIO",poem:"Starting with curiosity. Turning ideas into things you can use.",loading:"Opening the personal archive",ready:"Archive ready",preparing:"Preparing website assets…",resources:"Resources loaded",waiting:"Arrival animation · {seconds}s remaining · Skip at any time",failed:"Some assets could not load. Retry or enter the site.",skip:"Skip animation",retry:"Retry loading",replay:"Replay intro",access:"Opening page",title:"Bernie Leung — Arrival animation"},
    "zh-CN": {subtitle:"个人作品集",poem:"从好奇心出发，将想法变成作品。",loading:"正在展开个人档案",ready:"档案已就绪",preparing:"正在准备网站素材…",resources:"资源加载",waiting:"入站动画播放中，剩余 {seconds} 秒 · 可以随时跳过",failed:"部分素材无法加载，可以重试或直接进入",skip:"跳过动画 / Skip",retry:"重新加载",replay:"重播入站动画",access:"正在打开页面",title:"Bernie Leung — 入站动画"}
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
  document.addEventListener("focusin",event => {
    let element=event.target;
    while(element && element!==body){
      const state=states.get(element);
      if(state){state.animation?.cancel();state.animation=null;state.revealed=true;element.dataset.motionState="ready";}
      element=element.parentElement;
    }
  });
  reduced.addEventListener?.("change",() => {
    if(!reduced.matches)return;
    elements.forEach(element => {const state=states.get(element);state.animation?.cancel();state.animation=null;state.revealed=true;element.dataset.motionState="ready";});
    activeArrival?.skip();
  });
  function syncSceneMotion() {
    if (!reduced.matches && !document.hidden && !body.classList.contains("motion-paused")) return;
    elements.forEach(element => {const state=states.get(element);state.animation?.cancel();state.animation=null;element.dataset.motionState="ready";});
    if (body.classList.contains("motion-paused")) activeArrival?.skip();
  }
  document.addEventListener("portfolio:motion", syncSceneMotion);
  document.addEventListener("visibilitychange", syncSceneMotion);
  window.addEventListener("pageshow",event => {
    if(event.persisted){activeArrival?.skip();startPageMotion();}
  });

  function showArrival() {
    if(activeArrival)return;
    const screen=document.createElement("div");
    screen.className="boot-screen boot-screen--cinematic";
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
    const started=performance.now();
    const minimumMs=reduced.matches||body.classList.contains("motion-paused")?0:10000;
    screen.dataset.minimumMs=String(minimumMs);
    let progress={total:0,loaded:0,failed:[],running:true};
    let preloadReady=false,pageReady=false,leaving=false,finished=false;
    let exitTimer;
    let task;
    let tick;
    const skip=screen.querySelector(".boot-screen__skip-animation");
    const retry=screen.querySelector(".boot-screen__retry");
    const status=screen.querySelector(".boot-screen__status");
    function render() {
      if(finished)return;
      const label=text();
      const ready=preloadReady&&pageReady;
      const percent=ready?100:progress.total?Math.min(99,Math.floor(progress.loaded/progress.total*100)):0;
      const remaining=Math.max(0,Math.ceil((minimumMs-(performance.now()-started))/1000));
      screen.dataset.phase=ready?"ready":progress.failed.length&&!progress.running?"failed":"loading";
      screen.setAttribute("aria-label",label.title);
      screen.querySelector(".boot-screen__subtitle").textContent=label.subtitle;
      screen.querySelector(".boot-screen__poem").textContent=label.poem;
      screen.querySelector(".boot-screen__phase").textContent=ready?label.ready:label.loading;
      screen.querySelector(".boot-screen__percentage").textContent=String(percent).padStart(3,"0")+"%";
      const bar=screen.querySelector(".boot-screen__bar");bar.setAttribute("aria-label",label.resources);bar.setAttribute("aria-valuenow",String(percent));bar.firstElementChild.style.transform=`scaleX(${percent/100})`;
      screen.querySelector(".boot-screen__ring-progress").setAttribute("stroke-dashoffset",String(100-percent));
      status.textContent=ready?(remaining?label.waiting.replace("{seconds}",remaining):label.ready):progress.failed.length&&!progress.running?label.failed:progress.total?`${label.resources}: ${progress.loaded} / ${progress.total}`:label.preparing;
      skip.textContent=label.skip;skip.disabled=leaving;
      retry.textContent=label.retry;retry.hidden=progress.running||!progress.failed.length;
    }
    function finish() {
      if(finished)return;
      finished=true;clearInterval(tick);clearTimeout(exitTimer);task?.cancel();
      document.removeEventListener("keydown",onKey);document.removeEventListener("portfolio:language",render);
      try{sessionStorage.setItem(sessionKey,"complete");}catch{}
      screen.remove();body.classList.remove("is-booting");background.forEach((element,index)=>{element.inert=previousInert[index];});
      activeArrival=null;startPageMotion();
      if(previousFocus instanceof HTMLElement && previousFocus!==body && previousFocus.isConnected)previousFocus.focus({preventScroll:true});
      else document.getElementById("main")?.focus({preventScroll:true});
    }
    function leave(force=false) {
      if(finished||leaving)return;
      if(!force && (!preloadReady||!pageReady||performance.now()-started<minimumMs))return;
      leaving=true;render();
      if(reduced.matches||body.classList.contains("motion-paused")){finish();return;}
      screen.classList.add("is-unveiling");
      exitTimer=setTimeout(finish,1200);
    }
    function onKey(event) {
      if(event.key==="Escape"){event.preventDefault();leave(true);}
      if(event.key==="Tab"){
        const controls=[retry,skip].filter(button=>!button.hidden&&!button.disabled);
        if(!controls.length){event.preventDefault();screen.focus();return;}
        const index=controls.indexOf(document.activeElement);
        const next=event.shiftKey?(index<=0?controls.length-1:index-1):(index+1)%controls.length;
        event.preventDefault();controls[next].focus();
      }
    }
    activeArrival={skip:()=>leave(true)};
    skip.addEventListener("click",()=>leave(true));
    document.addEventListener("keydown",onKey);document.addEventListener("portfolio:language",render);
    screen.focus({preventScroll:true});render();
    async function runOffline() {
      const paths=["identity.webp"];
      progress={total:paths.length,loaded:0,failed:[],running:true};render();
      await Promise.all(paths.map(path=>new Promise(resolve=>{
        const image=new Image();let settled=false;
        const timer=setTimeout(()=>end(false),15000);
        function end(ok){if(settled)return;settled=true;clearTimeout(timer);ok?progress.loaded++:progress.failed.push(path);render();resolve();}
        image.onload=()=>image.decode().then(()=>end(true),()=>end(false));image.onerror=()=>end(false);image.src=new URL("assets/"+path,root).href;
      })));
      progress.running=false;preloadReady=!progress.failed.length;render();leave();
    }
    async function run() {
      if(finished)return;
      if(location.protocol==="file:"){await runOffline();return;}
      if(!task){task=window.BHR_PRELOADER?.create(value=>{progress=value;render();});}
      if(!task){progress={total:0,loaded:0,failed:["loader"],running:false};render();return;}
      preloadReady=await task.run();render();leave();
    }
    retry.addEventListener("click",run);
    (async()=>{
      if(document.readyState!=="complete")await new Promise(resolve=>window.addEventListener("load",resolve,{once:true}));
      try{await document.fonts?.ready;}catch{}
      if(finished)return;pageReady=true;render();leave();
    })();
    tick=setInterval(()=>{render();leave();},250);
    run().catch(()=>{progress.running=false;progress.failed=["loader"];render();});
  }
  const replay=document.querySelector(".motion-replay");
  if(replay){replay.hidden=false;replay.textContent=text().replay;replay.addEventListener("click",showArrival);}
  document.addEventListener("portfolio:language",()=>{if(replay)replay.textContent=text().replay;});
  let firstArrival=true;
  try{firstArrival=sessionStorage.getItem(sessionKey)!=="complete";}catch{}
  if(firstArrival)showArrival();else requestAnimationFrame(startPageMotion);
})();
