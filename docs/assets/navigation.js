"use strict";
(() => {
  // A page fetched by an already-open tab may reference a newer router URL.
  // Keep one router per document; the next full load picks up the new version.
  if (window.PORTFOLIO_PAGES) return;
  const root = new URL("../", document.currentScript.src);
  const pages = ["index", "about", "experience", "education", "skills", "projects", "contact", "sitemap"];
  const modules = new Map(), mounted = [], memories = new Map(), pageStates = new Map();
  const documents = new Map(), scriptLoads = new Map(), styleLoads = new Map(), scrollPositions = new Map();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let preparing = false, sequence = 0, currentURL = new URL(location.href), activeTransition;
  let routeAnimation = null, latestRequest = null, currentEntry = null;
  const native = {
    frame: window.requestAnimationFrame.bind(window), cancelFrame: window.cancelAnimationFrame.bind(window),
    timeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
    interval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window)
  };

  // Each page owns its subscriptions, observers and animation loops. Disposing a
  // page never leaves a hidden particle scene or an old form handler running.
  function createScope(record) {
    let alive = true;
    const cleanup = [], frames = new Set(), timers = new Set(), intervals = new Set();
    const key = document.body.dataset.page + ":" + record.name;
    if (!memories.has(key)) memories.set(key, {});
    const scope = {
      src: record.src, memory: memories.get(key), get disposed() { return !alive; },
      cleanup(fn) { cleanup.push(fn); },
      on(target, type, listener, options) {
        if (!target) return;
        target.addEventListener(type, listener, options);
        cleanup.push(() => target.removeEventListener(type, listener, options));
      },
      requestAnimationFrame(fn) {
        if (!alive) return 0;
        const id = native.frame(time => { frames.delete(id); if (alive) fn(time); });
        frames.add(id); return id;
      },
      cancelAnimationFrame(id) { frames.delete(id); native.cancelFrame(id); },
      setTimeout(fn, delay, ...args) {
        if (!alive) return 0;
        const id = native.timeout(() => { timers.delete(id); if (alive) fn(...args); }, delay);
        timers.add(id); return id;
      },
      clearTimeout(id) { timers.delete(id); native.clearTimeout(id); },
      setInterval(fn, delay, ...args) {
        if (!alive) return 0;
        const id = native.interval(() => { if (alive) fn(...args); }, delay);
        intervals.add(id); return id;
      },
      clearInterval(id) { intervals.delete(id); native.clearInterval(id); },
      dispose() {
        if (!alive) return;
        alive = false;
        cleanup.reverse().forEach(fn => { try { fn(); } catch (error) { console.error(error); } });
        frames.forEach(native.cancelFrame); timers.forEach(native.clearTimeout); intervals.forEach(native.clearInterval);
        frames.clear(); timers.clear(); intervals.clear(); cleanup.length = 0;
      }
    };
    scope.addEventListener = (...args) => scope.on(window, ...args);
    for (const name of ["ResizeObserver", "IntersectionObserver", "MutationObserver"]) {
      const Observer = window[name];
      scope[name] = Observer && function(callback, options) {
        const observer = new Observer((...args) => { if (alive) callback(...args); }, options);
        cleanup.push(() => observer.disconnect());
        return observer;
      };
    }
    return scope;
  }
  function mount(record) {
    const scope = createScope(record);
    mounted.push(scope);
    record.mount(scope);
  }
  window.PORTFOLIO_PAGES = {
    register(name, src, factory) {
      const record = {name, src, mount:factory};
      modules.set(new URL(src, root).href, record);
      if (!preparing) mount(record);
    }
  };

  function pageName(url) {
    if (url.origin !== root.origin) return null;
    const path = url.pathname;
    const name = path === root.pathname ? "index" : path.startsWith(root.pathname) ? path.slice(root.pathname.length).replace(/\.html$/, "") : "";
    return pages.includes(name) ? name : null;
  }
  const keyFor = url => pageName(url);
  const notice = document.createElement("div");
  notice.className = "route-notice";
  notice.hidden = true;
  notice.setAttribute("role", "status");
  const noticeText = document.createElement("span"), retry = document.createElement("button");
  retry.type = "button";
  notice.append(noticeText, retry);
  const progress = document.createElement("div");
  progress.className = "route-progress";
  progress.setAttribute("aria-hidden", "true");
  const announcement = document.createElement("div");
  announcement.className = "sr-only route-announcement";
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  function attachChrome() { document.body.append(progress, notice, announcement); }
  attachChrome();

  function stateId() { return "route-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  const scrollKey = (entry, url) => entry + "|" + url.href;
  function rememberScroll() {
    currentEntry ||= history.state?.portfolioRoute || stateId();
    const scroll = [scrollX, scrollY];
    scrollPositions.set(scrollKey(currentEntry, currentURL), scroll);
    // During popstate, history already points to the destination. Keep the old
    // entry's last position in memory without overwriting the destination state.
    if (location.href !== currentURL.href || (history.state?.portfolioRoute && history.state.portfolioRoute !== currentEntry)) return;
    try { history.replaceState({...history.state, portfolioRoute:currentEntry, scroll}, "", location.href); } catch {}
  }
  function rememberPage() {
    const main = document.querySelector("main");
    if (!main) return;
    const fields = [...main.querySelectorAll("input,select,textarea")].map(el => ({value:el.value, checked:el.checked}));
    const details = [...main.querySelectorAll("details")].map(el => el.open);
    const choices = [...main.querySelectorAll("[data-filter-zone]")].map(zone => zone.querySelector('[data-filter][aria-pressed="true"]')?.dataset.filter);
    const skill = main.querySelector('.skill-index-entry[aria-selected="true"]')?.id;
    const showcases = [...main.querySelectorAll(".showcase-tabs")].map(list => [...list.children].findIndex(el => el.getAttribute("aria-selected") === "true"));
    pageStates.set(keyFor(currentURL), {fields, details, choices, skill, showcases});
  }
  function restorePage(url) {
    const saved = pageStates.get(keyFor(url));
    if (!saved) return;
    const main = document.querySelector("main");
    main.querySelectorAll("input,select,textarea").forEach((el, i) => {
      if (!saved.fields[i]) return;
      el.value = saved.fields[i].value;
      if (typeof saved.fields[i].checked === "boolean") el.checked = saved.fields[i].checked;
      el.dispatchEvent(new Event("input", {bubbles:true}));
    });
    main.querySelectorAll("details").forEach((el, i) => { el.open = Boolean(saved.details[i]); });
    main.querySelectorAll("[data-filter-zone]").forEach((zone, i) => {
      [...zone.querySelectorAll("[data-filter]")].find(button => button.dataset.filter === saved.choices[i])?.click();
    });
    const skill = saved.skill && document.getElementById(saved.skill);
    if (skill && !skill.hidden) skill.click();
    main.querySelectorAll(".showcase-tabs").forEach((list, i) => list.children[saved.showcases[i]]?.click());
  }
  function parsePage(source, url) {
    const parsed = new DOMParser().parseFromString(source, "text/html");
    if (!parsed.querySelector("main") || parsed.body.dataset.page !== pageName(url)) throw new Error("Unexpected page response");
    return parsed;
  }
  function getPage(url) {
    const key = keyFor(url);
    if (!documents.has(key)) {
      const endpoint = new URL(key + ".html", root);
      const promise = fetch(endpoint, {credentials:"same-origin", headers:{Accept:"text/html"}}).then(response => {
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Page unavailable");
        return response.text();
      }).then(source => { parsePage(source, url); return source; }).catch(error => { documents.delete(key); throw error; });
      documents.set(key, promise);
    }
    return documents.get(key);
  }
  function assetURL(value) {
    const url = new URL(value, root);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname + "assets/")) throw new Error("Unexpected page asset");
    return url.href;
  }
  const loadedScripts = new Set([...document.querySelectorAll("script[src]")].map(el => el.src));
  function loadScript(src) {
    if (loadedScripts.has(src)) return Promise.resolve();
    if (!scriptLoads.has(src)) scriptLoads.set(src, new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src; script.async = false;
      script.onload = () => { loadedScripts.add(src); resolve(); };
      script.onerror = () => { script.remove(); scriptLoads.delete(src); reject(new Error("Script unavailable")); };
      document.head.append(script);
    }));
    return scriptLoads.get(src);
  }
  function loadStyle(href) {
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href === href);
    if (existing?.sheet) return Promise.resolve(existing);
    if (!styleLoads.has(href)) styleLoads.set(href, new Promise((resolve, reject) => {
      const link = existing || document.createElement("link");
      link.rel = "stylesheet"; link.href = href; link.media = "not all";
      link.onload = () => resolve(link);
      link.onerror = () => { link.remove(); styleLoads.delete(href); reject(new Error("Styles unavailable")); };
      if (!existing) document.head.append(link);
    }));
    return styleLoads.get(href);
  }
  function applyHead(parsed, styles) {
    const keep = new Set(styles);
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => { link.media = keep.has(link) ? "all" : "not all"; });
    styles.forEach(link => document.head.append(link));
    const title = document.querySelector("title");
    title.textContent = parsed.title;
    title.dataset.i18n = parsed.querySelector("title")?.dataset.i18n || "";
    for (const selector of ['meta[name="description"]', 'meta[property^="og:"]', 'meta[name^="twitter:"]', 'link[rel="canonical"]', 'link[rel="alternate"]']) {
      document.head.querySelectorAll(selector).forEach(node => node.remove());
      parsed.head.querySelectorAll(selector).forEach(node => document.head.append(document.importNode(node, true)));
    }
  }
  function positionPage(url, savedScroll) {
    const scroller = document.documentElement;
    const before = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";
    if (Array.isArray(savedScroll)) window.scrollTo({left:savedScroll[0], top:savedScroll[1], behavior:"instant"});
    else if (url.hash) {
      let id; try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = ""; }
      const target = document.getElementById(id);
      if (target?.hidden) target.closest("[data-filter-zone]")?.querySelector("[data-reset]")?.click();
      if (target) target.scrollIntoView({behavior:"instant", block:"start"});
      else window.scrollTo({top:0, behavior:"instant"});
    } else window.scrollTo({top:0, behavior:"instant"});
    scroller.style.scrollBehavior = before;
  }
  function motionEnabled() { return !reduced.matches && !document.body.classList.contains("motion-paused"); }
  function busy(value) {
    document.documentElement.dataset.navigationState = value ? "loading" : "idle";
    progress.classList.toggle("is-active", value);
    document.querySelector("main")?.setAttribute("aria-busy", String(value));
  }
  function showError() {
    const en = document.documentElement.lang === "en";
    noticeText.textContent = en ? "This page could not load. Your current page is still here." : "暫時未能開啟頁面，你而家嘅內容仍然保留。";
    retry.textContent = en ? "Try again" : "再試一次";
    notice.hidden = false;
  }
  async function navigate(destination, options = {}) {
    const url = new URL(destination, currentURL);
    if (!pageName(url)) return;
    const ticket = ++sequence;
    latestRequest = {url, options};
    activeTransition?.skipTransition();
    routeAnimation?.cancel();
    notice.hidden = true;
    busy(true);
    const from = new URL(currentURL), back = options.history === "pop";
    try {
      const parsed = parsePage(await getPage(url), url);
      const styleURLs = [...parsed.querySelectorAll('link[rel="stylesheet"]')].map(link => assetURL(link.getAttribute("href")));
      const scripts = [...parsed.querySelectorAll('script[src]')].map(script => assetURL(script.getAttribute("src")));
      const styles = await Promise.all(styleURLs.map(loadStyle));
      if (ticket !== sequence) return;
      preparing = true;
      for (const src of scripts) { await loadScript(src); if (ticket !== sequence) return; }
      // Decode the first visible illustration before the snapshot to avoid a blank frame.
      const eager = parsed.querySelector('main img:not([loading="lazy"])');
      if (eager) {
        const image = new Image(); image.src = assetURL(eager.getAttribute("src"));
        await Promise.race([image.decode().catch(() => {}), new Promise(resolve => native.timeout(resolve, 1000))]);
      }
      if (ticket !== sequence) return;
      rememberPage();
      rememberScroll();
      const animate = motionEnabled();
      document.documentElement.dataset.routeDirection = back || pages.indexOf(pageName(url)) < pages.indexOf(pageName(from)) ? "back" : "forward";
      document.documentElement.dataset.routeScene = pageName(url) === "skills" ? "focus" : pageName(url) === "projects" ? "reveal" : "slide";
      const commit = () => {
        if (ticket !== sequence) return;
        mounted.splice(0).reverse().forEach(scope => scope.dispose());
        document.getAnimations().forEach(animation => { if (animation.effect?.target instanceof Element) animation.cancel(); });
        if (!back) history.pushState({portfolioRoute:stateId(), scroll:[0,0]}, "", url);
        currentURL = new URL(location.href);
        currentEntry = history.state?.portfolioRoute || stateId();
        const theme = document.body.dataset.theme;
        parsed.body.querySelectorAll("script").forEach(script => script.remove());
        document.body.replaceChildren(...[...parsed.body.childNodes].map(node => document.importNode(node, true)));
        document.body.className = parsed.body.className;
        for (const key of Object.keys(document.body.dataset)) delete document.body.dataset[key];
        document.body.dataset.page = parsed.body.dataset.page;
        document.body.dataset.theme = theme;
        document.body.dataset.navigation = "soft";
        applyHead(parsed, styles);
        attachChrome();
        for (const src of scripts) { const record = modules.get(src); if (record) mount(record); }
        restorePage(url);
        positionPage(url, options.scroll);
        const target = document.querySelector("main h1") || document.querySelector("main");
        target?.setAttribute("tabindex", "-1");
        target?.focus({preventScroll:true});
        announcement.textContent = document.title;
        document.dispatchEvent(new CustomEvent("portfolio:navigated", {detail:{from:from.href, to:currentURL.href}}));
      };
      if (animate && typeof document.startViewTransition === "function") {
        activeTransition = document.startViewTransition(commit);
        await activeTransition.updateCallbackDone;
        await activeTransition.finished.catch(() => {});
      } else {
        if (animate) {
          routeAnimation = document.querySelector("main")?.animate([{opacity:1, transform:"none"}, {opacity:0, transform:"translateY(-12px)"}], {duration:140, fill:"forwards", easing:"ease-out"});
          await routeAnimation?.finished.catch(() => {});
        }
        if (ticket !== sequence) return;
        commit();
        if (animate) {
          routeAnimation = document.querySelector("main")?.animate([{opacity:0, transform:"translateY(24px)"}, {opacity:1, transform:"none"}], {duration:520, easing:"cubic-bezier(.16,1,.3,1)"});
          await routeAnimation?.finished.catch(() => {});
        }
      }
    } catch (error) {
      if (ticket !== sequence) return;
      console.error("Portfolio navigation:", error);
      if (back) { currentEntry = stateId(); history.replaceState({...history.state, portfolioRoute:currentEntry}, "", from); currentURL = from; }
      showError();
    } finally {
      if (ticket === sequence) { preparing = false; busy(false); routeAnimation = null; activeTransition = null; }
    }
  }
  retry.addEventListener("click", () => { if (latestRequest) navigate(latestRequest.url, {...latestRequest.options, history:"push"}); });
  if (!/^https?:$/.test(location.protocol)) return; // The downloadable HTML pages still open directly offline.
  history.scrollRestoration = "manual";
  rememberScroll();
  document.documentElement.dataset.navigationState = "idle";
  document.addEventListener("click", event => {
    const link = event.target instanceof Element && event.target.closest("a[data-internal]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href, currentURL);
    if (!pageName(url)) return;
    if (pageName(url) === pageName(currentURL) && url.search === currentURL.search) {
      if (!url.hash || url.hash === currentURL.hash) {
        event.preventDefault();
        if (document.documentElement.dataset.navigationState === "loading") navigate(url);
        else if (!url.hash) positionPage(url);
      } else rememberScroll();
      return;
    }
    event.preventDefault();
    navigate(url);
  });
  // Intent-based prefetch keeps menu changes quick without downloading every page.
  function prefetch(event) {
    const link = event.target instanceof Element && event.target.closest("a[data-internal]");
    if (!link || navigator.connection?.saveData) return;
    const url = new URL(link.href, currentURL);
    if (pageName(url) && pageName(url) !== pageName(currentURL)) getPage(url).catch(() => {});
  }
  document.addEventListener("pointerover", prefetch, {passive:true});
  document.addEventListener("focusin", prefetch);
  window.addEventListener("popstate", event => {
    const url = new URL(location.href);
    if (!pageName(url)) return;
    rememberScroll();
    const scroll = scrollPositions.get(scrollKey(event.state?.portfolioRoute, url)) || event.state?.scroll;
    if (pageName(url) === pageName(currentURL) && url.search === currentURL.search && document.documentElement.dataset.navigationState !== "loading") {
      currentURL = url; currentEntry = event.state?.portfolioRoute || stateId();
      positionPage(url, scroll); return;
    }
    navigate(url, {history:"pop", scroll});
  });
  window.addEventListener("hashchange", () => {
    if (currentURL.href === location.href) return;
    currentURL = new URL(location.href); currentEntry = stateId(); rememberScroll();
  });
  document.addEventListener("portfolio:language", () => { queueMicrotask(() => { currentURL = new URL(location.href); }); });
  window.addEventListener("pagehide", rememberScroll);
})();
