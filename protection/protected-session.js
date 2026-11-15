"use strict";
(() => {
  if (window.PORTFOLIO_PROTECTED_SESSION) return;
  window.PORTFOLIO_PROTECTED_SESSION = true;
  const src = document.currentScript.src;
  const base = new URL("./", src);
  const workerPath = new URL("protected-worker.js", base).pathname;
  const replayed = new WeakSet();
  let checking = null, redirecting = false, clickSequence = 0;
  let heartbeatTimer = null, pageActive = true, lifecycleRevision = 0, pendingTarget = null;
  const endedMarker = "portfolio-protected-ended";
  const sessionCopy={
    'zh-HK':{checking:'驗證網站存取權限',locked:'網站已鎖定',ended:'網站已鎖定，請重新解鎖。',reload:'重新載入',lock:'鎖定網站'},
    en:{checking:'Checking access',locked:'Portfolio locked',ended:'Your session ended. Reload to unlock.',reload:'Reload',lock:'Lock site'},
    'zh-CN':{checking:'验证网站访问权限',locked:'网站已锁定',ended:'网站已锁定，请重新解锁。',reload:'重新加载',lock:'锁定网站'},
    ja:{checking:'アクセス権限を確認しています',locked:'サイトがロックされました',ended:'セッションが終了しました。再読み込みしてロックを解除してください。',reload:'再読み込み',lock:'サイトをロック'},
    ko:{checking:'접속 권한 확인 중',locked:'사이트가 잠겼습니다',ended:'세션이 종료되었습니다. 새로고침하여 잠금을 해제해 주세요.',reload:'새로고침',lock:'사이트 잠그기'},
    th:{checking:'กำลังตรวจสอบสิทธิ์การเข้าถึง',locked:'เว็บไซต์ถูกล็อก',ended:'เซสชันสิ้นสุดแล้ว โปรดโหลดใหม่เพื่อปลดล็อก',reload:'โหลดใหม่',lock:'ล็อกเว็บไซต์'},
    ru:{checking:'Проверка доступа',locked:'Сайт заблокирован',ended:'Сеанс завершён. Обновите страницу, чтобы разблокировать сайт.',reload:'Обновить',lock:'Заблокировать сайт'}
  };
  const sessionText=()=>{
    let lang=document.documentElement.lang;
    // The access check runs before the portfolio's deferred language render.
    if(!document.body?.classList.contains('js')){
      const requested=new URL(location.href).searchParams.get('lang');
      if(sessionCopy[requested])lang=requested;
      else {try{const stored=localStorage.getItem('bernie-portfolio-language');if(sessionCopy[stored])lang=stored;}catch{}}
    }
    return sessionCopy[lang]||sessionCopy['zh-HK'];
  };
  document.addEventListener('portfolio:language',()=>{document.documentElement.dataset.sessionCopy=sessionText().checking;});

  // This cover is independent of the site's styles and animation lifecycle.
  // It also hides a restored bfcache document until the worker confirms access.
  const style = document.createElement("style");
  style.textContent = "html.portfolio-session-checking{background:#070d18}html.portfolio-session-checking body{visibility:hidden!important}html.portfolio-session-checking::after{content:'驗證網站存取權限 / Checking access';position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#070d18;color:#8ae7ff;font:500 13px/1.6 system-ui;text-align:center;padding:24px;box-sizing:border-box}html.portfolio-session-recovery::after{display:none}";
  document.head.append(style);
  style.textContent=style.textContent.replace("'驗證網站存取權限 / Checking access'",'attr(data-session-copy)');
  const cover = () => { document.documentElement.dataset.sessionCopy=sessionText().checking;document.documentElement.classList.add("portfolio-session-checking"); };
  const uncover = () => document.documentElement.classList.remove("portfolio-session-checking");

  function controller() {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return null;
    try {
      const url = new URL(worker.scriptURL);
      return url.origin === base.origin && url.pathname === workerPath ? worker : null;
    } catch { return null; }
  }

  function ask(type) {
    return new Promise((resolve, reject) => {
      const worker = controller();
      if (!worker) { reject(new Error("No protected session")); return; }
      const channel = new MessageChannel();
      const timer = setTimeout(() => finish(new Error("Session check timed out")), 8000);
      function finish(error, value) {
        clearTimeout(timer);
        channel.port1.onmessage = null;
        channel.port1.close();
        if (error) reject(error); else resolve(value);
      }
      channel.port1.onmessage = event => {
        if (controller() !== worker) finish(new Error("Protected controller changed"));
        else if (!event.data?.ok) finish(new Error("Session unavailable"));
        else finish(null, event.data);
      };
      try { worker.postMessage({type}, [channel.port2]); } catch (error) { finish(error); }
    });
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  function scheduleHeartbeat() {
    if (heartbeatTimer !== null || redirecting || !pageActive || document.hidden) return;
    // Mitigate ordinary idle eviction while a visitor reads the foreground
    // page. Browsers may still terminate the worker; no state is restored.
    heartbeatTimer = setTimeout(() => {
      heartbeatTimer = null;
      if (pageActive && !document.hidden && !redirecting) verify();
    }, 15000);
  }

  function invalidateCheck(forgetTarget = false) {
    lifecycleRevision++;
    checking = null;
    stopHeartbeat();
    if (forgetTarget) { pendingTarget = null; clickSequence++; }
  }

  function returnToGate(target = pendingTarget, ended = true) {
    stopHeartbeat();
    cover();
    if (redirecting) return;
    redirecting = true;
    let destination = new URL(location.href);
    try {
      const candidate = new URL(target || location.href, location.href);
      if (scoped(candidate)) destination = candidate;
    } catch {}
    // Persist only a short explanation, time and path. The destination's
    // query/hash stay in navigation; no credentials or full URLs are stored.
    try {
      if (ended) sessionStorage.setItem(endedMarker, JSON.stringify({reason:"ended", time:Date.now(), path:destination.pathname}));
      else sessionStorage.removeItem(endedMarker);
    } catch {}
    const navigate = () => {
      if (destination.href === location.href) location.reload();
      else location.replace(destination.pathname + destination.search + destination.hash);
    };
    // No credentials are stored. This timestamp only prevents an automatic
    // reload loop if a host accidentally serves the wrong bootstrap document.
    const key = "portfolio-protected-recovery";
    let recent = false;
    try {
      const last = JSON.parse(sessionStorage.getItem(key) || "null");
      recent = last?.path === destination.pathname && Date.now() - last.time < 10000;
      sessionStorage.setItem(key, JSON.stringify({path:destination.pathname, time:Date.now()}));
    } catch {}
    if (!recent) { navigate(); return; }
    // Keep any old private DOM hidden while offering an explicit recovery.
    const panel = document.createElement("div");
    panel.setAttribute("role", "alertdialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", sessionText().locked);
    panel.style.cssText = "visibility:visible!important;position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:#070d18;color:#d9f5ff;font:16px/1.6 system-ui;text-align:center;padding:24px;box-sizing:border-box";
    const text = document.createElement("p");
    text.textContent = sessionText().ended;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = sessionText().reload;
    button.style.cssText = "font:inherit;color:#070d18;background:#65ddff;border:0;padding:12px 24px;cursor:pointer";
    button.addEventListener("click", () => {
      try { sessionStorage.removeItem(key); } catch {}
      navigate();
    });
    panel.append(text, button);
    document.documentElement.classList.add("portfolio-session-recovery");
    document.documentElement.append(panel);
    button.focus();
  }

  async function verify(hidden = false) {
    if (hidden) cover();
    if (redirecting || !pageActive || document.hidden) return false;
    if (!checking) {
      const revision = lifecycleRevision;
      const current = () => revision === lifecycleRevision && pageActive && !document.hidden && !redirecting;
      const check = ask("STATE").then(state => {
        if (!current()) return false;
        if (state.unlocked !== true) { returnToGate(); return false; }
        try { sessionStorage.removeItem("portfolio-protected-recovery"); } catch {}
        uncover();
        scheduleHeartbeat();
        return true;
      }).catch(() => { if (current()) returnToGate(); return false; }).finally(() => { if (checking === check) checking = null; });
      checking = check;
    }
    return checking;
  }

  function scoped(url) { return url.origin === base.origin && url.pathname.startsWith(base.pathname) && !url.username && !url.password; }

  // The capture listener runs before the existing router. Only a confirmed
  // unlocked worker gets the original click path, including its page motion.
  window.addEventListener("click", event => {
    if (replayed.has(event) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element && event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (!scoped(url) || (url.pathname === location.pathname && url.search === location.search)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const ticket = ++clickSequence;
    pendingTarget = url.href;
    verify().then(ok => {
      if (!ok || ticket !== clickSequence || !link.isConnected) return;
      pendingTarget = null;
      const click = new MouseEvent("click", {bubbles:true, cancelable:true, view:window, button:0, detail:event.detail});
      replayed.add(click);
      link.dispatchEvent(click);
    });
  }, true);

  window.addEventListener("popstate", event => {
    if (replayed.has(event)) return;
    event.stopImmediatePropagation();
    const ticket = ++clickSequence;
    pendingTarget = null;
    verify().then(ok => {
      if (!ok || ticket !== clickSequence) return;
      const pop = new PopStateEvent("popstate", {state:event.state});
      replayed.add(pop);
      window.dispatchEvent(pop);
    });
  }, true);
  window.addEventListener("pagehide", () => { pageActive = false; invalidateCheck(true); cover(); });
  window.addEventListener("pageshow", () => { pageActive = true; invalidateCheck(); verify(true); });
  document.addEventListener("visibilitychange", () => {
    invalidateCheck(document.hidden);
    if (!document.hidden) verify(true);
  });
  navigator.serviceWorker?.addEventListener("controllerchange", () => { invalidateCheck(); verify(true); });
  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.source === controller() && event.data?.type === "LOCKED") returnToGate(null, false);
  });
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      if (response.headers.get("X-Portfolio-Locked") === "1") {
        returnToGate();
        throw new Error("Protected session ended");
      }
      return response;
    });
  };

  function mount(scope) {
    const group = document.querySelector(".footer-links");
    if (!group || group.querySelector(".site-lock")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "site-lock";
    function render() {
      button.textContent = sessionText().lock;
    }
    async function lock() {
      button.disabled = true;
      invalidateCheck(true);
      cover();
      try { await ask("LOCK"); } catch {}
      returnToGate(null, false);
    }
    group.append(button);
    render();
    if (scope) {
      scope.on(button, "click", lock);
      scope.on(document, "portfolio:language", render);
      scope.cleanup(() => button.remove());
    } else {
      button.addEventListener("click", lock);
      document.addEventListener("portfolio:language", render);
    }
  }
  if (window.PORTFOLIO_PAGES?.register) window.PORTFOLIO_PAGES.register("protected-session", src, mount);
  else {
    mount();
    document.addEventListener("portfolio:navigated", () => mount());
  }
  verify(true);
})();
