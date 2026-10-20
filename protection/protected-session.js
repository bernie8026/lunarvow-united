"use strict";
(() => {
  if (window.PORTFOLIO_PROTECTED_SESSION) return;
  window.PORTFOLIO_PROTECTED_SESSION = true;
  const src = document.currentScript.src;
  const base = new URL("./", src);
  const workerPath = new URL("protected-worker.js", base).pathname;
  const replayed = new WeakSet();
  let checking = null, redirecting = false, clickSequence = 0;

  // This cover is independent of the site's styles and animation lifecycle.
  // It also hides a restored bfcache document until the worker confirms access.
  const style = document.createElement("style");
  style.textContent = "html.portfolio-session-checking{background:#070d18}html.portfolio-session-checking body{visibility:hidden!important}html.portfolio-session-checking::after{content:'驗證網站存取權限 / Checking access';position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#070d18;color:#8ae7ff;font:500 13px/1.6 system-ui;text-align:center;padding:24px;box-sizing:border-box}html.portfolio-session-recovery::after{display:none}";
  document.head.append(style);
  const cover = () => document.documentElement.classList.add("portfolio-session-checking");
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
        if (!event.data?.ok) finish(new Error("Session unavailable"));
        else finish(null, event.data);
      };
      try { worker.postMessage({type}, [channel.port2]); } catch (error) { finish(error); }
    });
  }

  function returnToGate() {
    cover();
    if (redirecting) return;
    redirecting = true;
    // No credentials are stored. This timestamp only prevents an automatic
    // reload loop if a host accidentally serves the wrong bootstrap document.
    const key = "portfolio-protected-recovery";
    let recent = false;
    try {
      const last = JSON.parse(sessionStorage.getItem(key) || "null");
      recent = last?.path === location.pathname && Date.now() - last.time < 10000;
      sessionStorage.setItem(key, JSON.stringify({path:location.pathname, time:Date.now()}));
    } catch {}
    if (!recent) { location.reload(); return; }
    // Keep any old private DOM hidden while offering an explicit recovery.
    const panel = document.createElement("div");
    panel.setAttribute("role", "alertdialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "網站已鎖定 / Portfolio locked");
    panel.style.cssText = "visibility:visible!important;position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:#070d18;color:#d9f5ff;font:16px/1.6 system-ui;text-align:center;padding:24px;box-sizing:border-box";
    const text = document.createElement("p");
    text.textContent = "網站已鎖定，請重新解鎖。 / Your session ended. Reload to unlock.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "重新載入 / Reload";
    button.style.cssText = "font:inherit;color:#070d18;background:#65ddff;border:0;padding:12px 24px;cursor:pointer";
    button.addEventListener("click", () => {
      try { sessionStorage.removeItem(key); } catch {}
      location.reload();
    });
    panel.append(text, button);
    document.documentElement.classList.add("portfolio-session-recovery");
    document.documentElement.append(panel);
    button.focus();
  }

  async function verify(hidden = false) {
    if (redirecting) return false;
    if (hidden) cover();
    if (!checking) checking = ask("STATE").then(state => {
      if (state.unlocked !== true) { returnToGate(); return false; }
      try { sessionStorage.removeItem("portfolio-protected-recovery"); } catch {}
      uncover();
      return true;
    }).catch(() => { returnToGate(); return false; }).finally(() => { checking = null; });
    return checking;
  }

  function scoped(url) { return url.origin === base.origin && url.pathname.startsWith(base.pathname); }

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
    verify().then(ok => {
      if (!ok || ticket !== clickSequence || !link.isConnected) return;
      const click = new MouseEvent("click", {bubbles:true, cancelable:true, view:window, button:0, detail:event.detail});
      replayed.add(click);
      link.dispatchEvent(click);
    });
  }, true);

  window.addEventListener("popstate", event => {
    if (replayed.has(event)) return;
    event.stopImmediatePropagation();
    const ticket = ++clickSequence;
    verify().then(ok => {
      if (!ok || ticket !== clickSequence) return;
      const pop = new PopStateEvent("popstate", {state:event.state});
      replayed.add(pop);
      window.dispatchEvent(pop);
    });
  }, true);
  window.addEventListener("pagehide", cover);
  window.addEventListener("pageshow", () => { verify(true); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) verify(true); });
  navigator.serviceWorker?.addEventListener("controllerchange", () => { verify(true); });
  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.source === controller() && event.data?.type === "LOCKED") returnToGate();
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
      const lang = document.documentElement.lang;
      button.textContent = lang === "en" ? "Lock site" : lang === "zh-CN" ? "锁定网站" : "鎖定網站";
    }
    async function lock() {
      button.disabled = true;
      cover();
      try { await ask("LOCK"); } catch {}
      returnToGate();
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
