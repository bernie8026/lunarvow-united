"use strict";
(() => {
  if (window.PORTFOLIO_CLARITY_UI) return;
  const src = document.currentScript?.src;
  if (!src) return;
  const base = new URL("../", src);
  window.PORTFOLIO_CLARITY_UI = true;

  // This public helper contains presentation rules only. Names, descriptions,
  // project imagery and link labels come from the already-unlocked document.
  const styleId = "portfolio-clarity-style";
  const css = `
body[data-portfolio-clarity] .portfolio-identity{padding:clamp(30px,4vw,58px) clamp(24px,5vw,80px);background:var(--home-bg,var(--bg,#070d18));color:var(--home-ink,var(--ink,#edf7ff));border-bottom:1px solid var(--home-line,#6dacd840)}
body[data-portfolio-clarity] .portfolio-identity-kicker{margin:0 0 12px;color:var(--home-muted,var(--muted,#9bafc5));font:600 11px/1.7 var(--mono,monospace);letter-spacing:.1em;overflow-wrap:anywhere}
body[data-portfolio-clarity] .portfolio-identity-name{margin:0;font-size:clamp(30px,4.2vw,62px);font-weight:750;line-height:1.08;letter-spacing:-.045em;overflow-wrap:anywhere}
body[data-portfolio-clarity] .portfolio-identity-description{max-width:70ch;margin:20px 0 0;color:var(--home-muted,var(--muted,#9bafc5));font-size:clamp(16px,1.4vw,19px);line-height:1.75;text-wrap:pretty}
body[data-portfolio-clarity] .portfolio-identity-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
body[data-portfolio-clarity] .portfolio-identity-link{display:inline-flex;align-items:center;justify-content:center;min-height:44px;max-width:100%;padding:10px 18px;border:1px solid var(--home-line,#526f8680);border-radius:4px;color:inherit;font-family:inherit;font-size:14px;font-weight:600;line-height:1.5;text-decoration:none;overflow-wrap:anywhere}
body[data-portfolio-clarity] .portfolio-identity-link:first-child{background:var(--signal,#00d5ff);border-color:transparent;color:var(--signal-ink,#071724)}
body[data-portfolio-clarity] .portfolio-identity-link:hover{border-color:currentColor}
body[data-portfolio-clarity] .portfolio-identity-link:focus-visible{outline:3px solid var(--home-signal,#00d5ff);outline-offset:4px}
@media(min-width:1001px){
  html[data-portfolio-clarity]{--portfolio-rail-width:224px;--masthead-height:0px!important}
  body[data-page][data-portfolio-clarity]{padding-left:var(--portfolio-rail-width)}
  body[data-page][data-portfolio-clarity] .masthead{width:var(--portfolio-rail-width);height:100vh;height:100dvh;max-height:100dvh;min-height:0;padding:20px 14px;display:flex;flex-direction:column;gap:0;overflow:hidden;box-sizing:border-box}
  body[data-page][data-portfolio-clarity] .brand{width:100%;flex:0 0 auto;text-align:left;padding:0 8px}
  body[data-page][data-portfolio-clarity] .brand strong{font-size:17px;line-height:1.05;letter-spacing:-.5px}
  body[data-page][data-portfolio-clarity] .brand small{font-size:8px;line-height:1.6;margin-top:6px;overflow-wrap:anywhere}
  body[data-page][data-portfolio-clarity] .main-nav{flex:1 1 auto;min-height:0;max-height:none;width:100%;margin:24px 0 12px;padding:2px;gap:3px;display:flex;flex-direction:column;align-items:stretch;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
  body[data-page][data-portfolio-clarity] .main-nav>a{display:grid;grid-template-columns:26px minmax(0,1fr);align-items:center;gap:10px;flex:0 0 auto;width:100%;height:auto;min-height:44px;padding:10px 8px;text-align:left;box-sizing:border-box}
  body[data-page][data-portfolio-clarity] .main-nav .nav-index{font:600 11px/1.5 var(--mono,monospace);letter-spacing:0}
  body[data-page][data-portfolio-clarity] .main-nav>a>span[data-i18n]{display:block;position:static;inset:auto;z-index:auto;max-width:100%;padding:0;background:transparent;font-size:12px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;letter-spacing:0}
  body[data-page][data-portfolio-clarity] .main-nav>a>span[data-i18n]:not([data-nav-glass-covered]){opacity:1;color:inherit}
  body[data-page][data-portfolio-clarity] .header-tools{flex:0 0 auto;align-items:center;justify-content:flex-start;flex-direction:row;flex-wrap:wrap;width:100%;margin-top:0;gap:10px;padding:4px 2px 0}
  body[data-page][data-portfolio-clarity] .languages{flex:1 1 140px;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:flex-start;gap:2px;width:auto;max-width:100%;padding:4px;border-radius:12px}
  body[data-page][data-portfolio-clarity] .languages button{flex:0 0 auto;min-width:30px;min-height:32px;padding:3px;font-size:10px}
  body[data-page][data-portfolio-clarity] .theme-toggle{flex:0 0 32px}
  body[data-page][data-portfolio-clarity] .reading-progress{left:var(--portfolio-rail-width);width:calc(100% - var(--portfolio-rail-width))}
  body[data-page][data-portfolio-clarity] .skip{left:calc(var(--portfolio-rail-width) + 16px)}
}
/* A hover-capable desktop reserves a slim rail. Expansion overlays the page,
   so reading position and content width stay fixed while the menu opens. */
@media(min-width:1001px) and (hover:hover) and (pointer:fine){
  html[data-portfolio-clarity]{--portfolio-rail-width:84px}
  body[data-page][data-portfolio-clarity] .masthead{width:84px;transition:width .22s ease,box-shadow .22s ease}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)){width:224px;box-shadow:12px 0 32px #07172420}
  body[data-page][data-portfolio-clarity] .brand{min-height:40px;padding-inline:4px;overflow:hidden}
  body[data-page][data-portfolio-clarity] .brand strong{max-width:48px;font-size:11px;line-height:1.25;letter-spacing:-.25px;overflow-wrap:normal}
  body[data-page][data-portfolio-clarity] .brand small{display:none}
  body[data-page][data-portfolio-clarity] .main-nav>a{position:relative;grid-template-columns:26px;gap:0;min-height:44px;padding:10px 8px}
  body[data-page][data-portfolio-clarity] .main-nav .nav-index{margin:0;text-align:center}
  body[data-page][data-portfolio-clarity] .masthead .main-nav>a>span[data-i18n]{position:absolute;width:1px;max-width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;opacity:0;pointer-events:none}
  body[data-page][data-portfolio-clarity] .header-tools{flex-direction:column;flex-wrap:nowrap;align-items:center;gap:8px}
  body[data-page][data-portfolio-clarity] .languages{flex:0 0 auto;flex-direction:column;flex-wrap:nowrap;width:40px;padding:4px;align-items:center}
  body[data-page][data-portfolio-clarity] .languages button[aria-pressed=false]{display:none}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .brand strong{max-width:none;font-size:17px;line-height:1.05;letter-spacing:-.5px}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .brand small{display:block}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .main-nav>a{grid-template-columns:26px minmax(0,1fr);gap:10px}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .main-nav>a>span[data-i18n]{position:static;width:auto;max-width:100%;height:auto;overflow:visible;clip-path:none;white-space:normal;pointer-events:auto}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .main-nav>a>span[data-i18n]:not([data-nav-glass-covered]){opacity:1}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .header-tools{flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .languages{flex:1 1 140px;flex-direction:row;flex-wrap:wrap;justify-content:flex-start;align-items:stretch;width:auto}
  body[data-page][data-portfolio-clarity] .masthead:is(:hover,:has(:focus-visible)) .languages button{display:block}
}
@media(prefers-reduced-motion:reduce){
  body[data-page][data-portfolio-clarity] .masthead{transition:none!important}
}
@media print{
  body[data-page][data-portfolio-clarity]{padding-left:0!important}
  body[data-page][data-portfolio-clarity] .masthead,body[data-page][data-portfolio-clarity] .reading-progress{display:none!important}
  body[data-portfolio-clarity] .portfolio-identity{break-inside:avoid;background:transparent;color:inherit}
}
`;

  const compact = text => String(text || "").replace(/\s+/g, " ").trim();
  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const setAttribute = (node, key, value) => { if (node.getAttribute(key) !== value) node.setAttribute(key, value); };

  function portfolioPage() {
    const url = new URL(location.href);
    const relative = url.pathname.slice(base.pathname.length);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || relative.includes("/") || (relative && !/^[a-z-]+\.html$/.test(relative))) return null;
    const body = document.body, main = document.querySelector("main#main");
    const nav = document.querySelector(".masthead #main-nav.main-nav");
    if (!body?.hasAttribute("data-page") || body.hasAttribute("data-protected-gate") || !main || !nav || !nav.querySelector(".nav-index") || !nav.querySelector("span[data-i18n]")) return null;
    return {body, main, nav};
  }

  function nameFrom(node) {
    if (!node) return "";
    if (node.nodeType === 3) return node.nodeValue;
    if (["SMALL", "SCRIPT", "STYLE", "SVG"].includes(node.tagName)) return "";
    if (node.tagName === "BR") return " ";
    return Array.from(node.childNodes, nameFrom).join("");
  }

  function pageLink(nav, page) {
    for (const link of nav.querySelectorAll("a[data-internal]")) {
      try {
        const url = new URL(link.getAttribute("href"), document.baseURI);
        if (url.origin !== base.origin || url.username || url.password || url.pathname !== new URL(page + ".html", base).pathname) continue;
        const label = compact(link.querySelector("span[data-i18n]")?.textContent);
        if (label) return {label, href:url.pathname + url.search + url.hash};
      } catch {}
    }
    return null;
  }

  function identity({main, nav}) {
    if (!main.classList.contains("home-page")) return;
    const hero = main.querySelector(".home-hero") || main.querySelector("[data-carousel]");
    if (!hero || hero.parentElement !== main) return;
    const footer = document.querySelector(".footer-brand");
    const name = compact(nameFrom(footer)) || compact(document.querySelector(".brand strong")?.textContent);
    const description = compact(document.querySelector('meta[name="description"]')?.getAttribute("content")) || compact(main.querySelector("#explore .lead")?.textContent);
    if (!name || !description) return;

    const selected = main.querySelector("#selected-work");
    // Only move the complete current website case-study section. Earlier
    // showcase versions and carousel internals retain their existing order.
    const work = selected?.parentElement === main && selected.querySelector("#home-lunar-title") && selected.querySelector(".home-browser img") ? selected : null;
    const order = node => Array.prototype.indexOf.call(main.children, node);
    const anchor = work && order(work) < order(hero) ? work : hero;
    let intro = main.querySelector("[data-portfolio-identity]");
    if (!intro) {
      intro = document.createElement("section");
      intro.className = "portfolio-identity";
      intro.setAttribute("data-portfolio-identity", "");
      intro.setAttribute("aria-labelledby", "portfolio-identity-name");
      for (const [part, tag] of [["kicker", "p"], ["name", "p"], ["description", "p"], ["actions", "div"]]) {
        const child = document.createElement(tag);
        child.className = "portfolio-identity-" + part;
        child.setAttribute("data-identity-" + part, "");
        if (part === "name") child.id = "portfolio-identity-name";
        intro.append(child);
      }
    }
    if (intro.parentElement !== main || order(intro) > order(anchor)) main.insertBefore(intro, anchor);
    setText(intro.querySelector("[data-identity-name]"), name);
    const kicker = intro.querySelector("[data-identity-kicker]");
    const descriptor = compact(footer?.querySelector("small")?.textContent);
    setText(kicker, descriptor);
    kicker.hidden = !descriptor;
    setText(intro.querySelector("[data-identity-description]"), description);
    const actions = intro.querySelector("[data-identity-actions]");
    for (const page of ["projects", "about"]) {
      const source = pageLink(nav, page);
      let link = actions.querySelector('[data-identity-page="' + page + '"]');
      if (!source) { link?.remove(); continue; }
      if (!link) {
        link = document.createElement("a");
        link.className = "portfolio-identity-link";
        link.setAttribute("data-identity-page", page);
        link.setAttribute("data-internal", "");
        actions.append(link);
      }
      setAttribute(link, "href", source.href);
      setText(link, source.label);
    }
    actions.hidden = !actions.children.length;
    if (work && order(work) > order(hero)) main.insertBefore(work, hero);
  }

  // Correct the language count, never a slide count, year or unrelated skill.
  // These patterns are applied only to the identified web-project areas.
  function sevenLanguages(text) {
    return text
      .replace(/三語/g, "七語").replace(/三语/g, "七语")
      .replace(/(?<![0-9])(?:三|3)(?=\s*(?:種語言|种语言))/g, "七")
      .replace(/\btrilingual\b/gi, word => word[0] === "T" ? "Seven-language" : "seven-language")
      .replace(/\bthree(?=[\s\-\u2010-\u2015]+languages?\b)/gi, word => word[0] === "T" ? "Seven" : "seven")
      .replace(/\b3(?=[\s-]+languages?\b)/gi, "7")
      .replace(/(?<![0-9])3(?=\s*(?:(?:つの)?言語|[かヶ]国語))/g, "7").replace(/(?<![０-９])３(?=\s*(?:言語|[かヶ]国語))/g, "７").replace(/三(?=言語)/g, "七")
      .replace(/(?<![0-9])3(?=\s*개\s*(?:언어|국어))/g, "7").replace(/세(?=\s+(?:(?:가지|개)\s+)?언어)/g, "일곱")
      .replace(/สาม(?=\s*ภาษา)/g, "เจ็ด").replace(/(?<![0-9])3(?=\s*ภาษา)/g, "7").replace(/(?<![๐-๙])๓(?=\s*ภาษา)/g, "๗")
      .replace(/тр[её]хъязыч/gi, word => word[0] === "Т" ? "Семиязыч" : "семиязыч")
      .replace(/тр[её]х(?=\s+языках)/gi, word => word[0] === "Т" ? "Семи" : "семи")
      .replace(/три\s+языка/gi, word => word[0] === "Т" ? "Семь языков" : "семь языков")
      .replace(/(?<![0-9])3\s+языка(?!х)/g, "7 языков").replace(/(?<![0-9])3(?=\s+языках)/g, "7");
  }

  function projectRoots(main) {
    const roots = [];
    const selected = main.querySelector("#selected-work");
    if (selected?.querySelector("#home-lunar-title")) roots.push(selected);
    else if (selected) roots.push(...selected.querySelectorAll('[data-showcase-project="lunar"], [data-i18n="t021"]'));
    const lunar = main.querySelector("#lunar");
    if (lunar) roots.push(lunar);
    roots.push(...main.querySelectorAll('#dialog-lunar [data-i18n="t161"]'));
    if (main.classList.contains("home-page")) {
      const carousel = main.querySelector("[data-carousel]");
      if (carousel) roots.push(carousel);
    }
    return roots;
  }

  function correctProjectText(node) {
    if (node.nodeType === 3) {
      const corrected = sevenLanguages(node.nodeValue);
      if (corrected !== node.nodeValue) node.nodeValue = corrected;
      return;
    }
    if (["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "NOSCRIPT"].includes(node.tagName)) return;
    for (const child of node.childNodes) correctProjectText(child);
  }

  let styledBody = null;
  function mount(scope) {
    const page = portfolioPage();
    if (!page) return () => {};
    const {body, main} = page;
    let alive = true, queued = false;
    let style = document.getElementById(styleId);
    if (!style) { style = document.createElement("style"); style.id = styleId; style.textContent = css; }
    // Re-append once per page mount, after that page's loaded stylesheets.
    document.head.append(style);
    document.documentElement.setAttribute("data-portfolio-clarity", "");
    body.setAttribute("data-portfolio-clarity", "");
    styledBody = body;

    const observer = typeof MutationObserver === "function" ? new MutationObserver(schedule) : null;
    function refresh() {
      queued = false;
      if (!alive || document.body !== body || !body.isConnected) return;
      observer?.disconnect();
      identity(page);
      for (const root of projectRoots(main)) {
        correctProjectText(root);
        observer?.observe(root, {childList:true, subtree:true, characterData:true});
      }
      const meta = document.querySelector('meta[name="description"]');
      if (meta) observer?.observe(meta, {attributes:true, attributeFilter:["content"]});
    }
    function schedule() {
      if (!alive || queued) return;
      queued = true;
      // Locale handlers finish translating the current DOM before we reuse it.
      queueMicrotask(refresh);
    }
    const on = (type, listener) => document.addEventListener(type, listener);
    on("portfolio:language", schedule);
    on("portfolio:navigated", schedule);
    const dispose = () => {
      alive = false;
      observer?.disconnect();
      document.removeEventListener("portfolio:language", schedule);
      document.removeEventListener("portfolio:navigated", schedule);
      body.removeAttribute("data-portfolio-clarity");
      if (styledBody === body) {
        document.documentElement.removeAttribute("data-portfolio-clarity");
        styledBody = null;
      }
    };
    scope?.cleanup(dispose);
    refresh();
    return dispose;
  }

  if (window.PORTFOLIO_PAGES?.register) {
    window.PORTFOLIO_PAGES.register("portfolio-clarity", src, mount);
  } else {
    let dispose = mount();
    document.addEventListener("portfolio:navigated", () => { dispose(); dispose = mount(); });
  }
})();
