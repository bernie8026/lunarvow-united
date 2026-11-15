"use strict";
(() => {
  if (window.PORTFOLIO_REFERENCE_MEDIA) return;
  const script = document.currentScript?.src;
  if (!script) return;
  const base = new URL("../", script);
  const factories = new Map(), waiting = new Set(), requested = new Map();
  const sources = {"photo-gaze": {"file": "cosplay-sword-portrait.webp", "title": "Cosplayer with sword", "author": "taymtaym", "source": "https://commons.wikimedia.org/wiki/File:Cosplayer_with_sword.jpg", "license": "CC BY 2.0", "license_url": "https://creativecommons.org/licenses/by/2.0/", "changes": "Resized and converted from JPEG to WebP; original watermark retained."}, "photo-prop": {"file": "cosplay-keqing-prop.webp", "title": "Cosplay of Keqing with sword (ICIC, 2022)", "author": "Leiem", "source": "https://commons.wikimedia.org/wiki/File:Cosplay_of_Keqing_with_sword_(ICIC,_2022).jpg", "license": "CC BY-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/", "changes": "Resized and converted from JPEG to WebP. Image adaptation remains CC BY-SA 4.0."}, "photo-costume": {"file": "cosplay-raiden-costume.webp", "title": "Comikaze 2015 - Raiden (22467977698)", "author": "RyC - Behind The Lens", "source": "https://commons.wikimedia.org/wiki/File:Comikaze_2015_-_Raiden_(22467977698).jpg", "license": "CC BY 2.0", "license_url": "https://creativecommons.org/licenses/by/2.0/", "changes": "Resized and converted from JPEG to WebP."}, "studio-photo": {"file": "studio-lighting.webp", "title": "Behind the Scene Production of a Video Content", "author": "MART PRODUCTION", "source": "https://www.pexels.com/photo/behind-the-scene-production-of-a-video-content-7335420/", "license": "Pexels License", "license_url": "https://www.pexels.com/license/", "changes": "Resized and converted from JPEG to WebP."}, "studio-video": {"file": "studio-lighting-demo.mp4", "title": "Professional Portrait Photoshoot Behind the Scenes", "author": "Airam Dato-on", "source": "https://www.pexels.com/video/professional-portrait-photoshoot-behind-the-scenes-31512161/", "license": "Pexels License", "license_url": "https://www.pexels.com/license/", "changes": "Resized to 960x540, encoded H.264, audio omitted, entire 8.51 second footage retained. Poster extracted at 3 seconds."}, "tello": {"file": "tello-reference.jpg", "title": "Ryze Tello", "author": "SimonWaldherr", "source": "https://commons.wikimedia.org/wiki/File:Ryze_Tello.jpg", "license": "CC BY-SA 4.0", "changes": "Resized to 1280px via Wikimedia thumbnail; otherwise unaltered.", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/"}, "classroom": {"file": "tello-classroom.jpg", "title": "Ryze Tello and Tello EDUs (1-19-2026)", "author": "ZLEA", "source": "https://commons.wikimedia.org/wiki/File:Ryze_Tello_and_Tello_EDUs_(1-19-2026).jpg", "license": "CC BY-SA 4.0", "changes": "Resized to 1280px via Wikimedia thumbnail; otherwise unaltered.", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/"}, "components": {"file": "drone-components.jpg", "title": "S5go topview", "author": "SKsiddhartthan", "source": "https://commons.wikimedia.org/wiki/File:S5go_topview.jpg", "license": "CC BY-SA 4.0", "changes": "Resized to 1280px via Wikimedia thumbnail; otherwise unaltered.", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/"}, "programming": {"file": "drone-programming.jpg", "title": "Autonomous Quadcopter Project 01", "author": "Mais Jamal, Youshaa Murhij, Zain Alabiden Ali", "source": "https://commons.wikimedia.org/wiki/File:Autonomous_Quadcopter_Project_01.jpg", "license": "CC BY-SA 4.0", "changes": "Resized to 1280px via Wikimedia thumbnail; otherwise unaltered.", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/"}, "hover": {"file": "drone-hover.mp4", "title": "Quadcopter 20200202", "author": "Project Kei (Keita.Honda)", "source": "https://commons.wikimedia.org/wiki/File:Quadcopter_20200202.webm", "license": "CC BY-SA 4.0", "changes": "Converted WebM to H.264 MP4 at 960x540; original 10.243s retained; audio removed; no frame synthesis.", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/"}, "hover-poster": {"file": "drone-hover-poster.jpg", "title": "Quadcopter 20200202 — poster frame", "author": "Project Kei (Keita.Honda)", "source": "https://commons.wikimedia.org/wiki/File:Quadcopter_20200202.webm", "license": "CC BY-SA 4.0", "changes": "Still frame extracted at 3s; resized 1280x720.", "license_url": "https://creativecommons.org/licenses/by-sa/4.0/"}};
  const labels = {
    "zh-HK": ["素材來源與授權", "網上參考素材；作者、來源及修改說明列於下方。", "原圖／原片", "授權", "影片暫時未能播放，可由來源連結查看。"],
    en: ["Media sources & licences", "External reference media. Authors, sources and adaptations are listed below.", "Original media", "Licence", "Video is unavailable. Open the source link to view it."],
    "zh-CN": ["素材来源与授权", "网络参考素材；作者、来源及修改说明列于下方。", "原图／原视频", "授权", "视频暂时无法播放，可通过来源链接查看。"],
    ja: ["素材の出典とライセンス", "外部の参考素材です。作者、出典、変更内容は以下に記載しています。", "元の素材", "ライセンス", "動画を再生できません。出典のリンクからご覧ください。"],
    ko: ["미디어 출처 및 라이선스", "외부 참고 자료입니다. 제작자, 출처 및 변경 사항은 아래에 표시됩니다.", "원본 자료", "라이선스", "영상을 재생할 수 없습니다. 출처 링크에서 확인하세요."],
    th: ["แหล่งที่มาและสัญญาอนุญาต", "สื่ออ้างอิงภายนอก รายชื่อผู้สร้าง แหล่งที่มา และการปรับแก้อยู่ด้านล่าง", "สื่อต้นฉบับ", "สัญญาอนุญาต", "เล่นวิดีโอไม่ได้ โปรดเปิดลิงก์แหล่งที่มา"],
    ru: ["Источники и лицензии", "Внешние справочные материалы. Авторы, источники и изменения указаны ниже.", "Оригинал", "Лицензия", "Видео недоступно. Откройте ссылку на источник."]
  };
  const language = () => Object.hasOwn(labels, document.documentElement.lang) ? document.documentElement.lang : "en";
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function link(title, href) {
    const node = el("a", "", title);
    node.href = href; node.target = "_blank"; node.rel = "noopener noreferrer";
    return node;
  }
  let cssPromise;
  function stylesheet() {
    if (cssPromise) return cssPromise;
    cssPromise = new Promise((resolve, reject) => {
      const node = document.createElement("link");
      node.rel = "stylesheet";
      node.href = new URL("assets/reference-media.css?v=references-1", base).href;
      node.setAttribute("data-reference-styles", "");
      node.onload = () => resolve(node);
      node.onerror = () => { node.remove(); cssPromise = null; reject(new Error("Reference styles unavailable")); };
      document.head.append(node);
    });
    return cssPromise;
  }
  function load(page) {
    if (factories.has(page)) return Promise.resolve();
    if (requested.has(page)) return requested.get(page);
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement("script");
      node.src = new URL("assets/reference-" + page + ".js?v=references-1", base).href;
      node.async = true;
      node.onload = () => factories.has(page) ? resolve() : reject(new Error("Reference module unavailable"));
      node.onerror = () => { node.remove(); requested.delete(page); reject(new Error("Reference module unavailable")); };
      document.head.append(node);
    });
    requested.set(page, promise);
    return promise;
  }
  const api = {
    register(page, factory) {
      if (!["photography", "equipment", "stem"].includes(page) || typeof factory !== "function") return;
      factories.set(page, factory);
      for (const install of waiting) install();
    }
  };
  window.PORTFOLIO_REFERENCE_MEDIA = api;

  function lightingArea(main) {
    const handle = main.querySelector("[data-light-handle]");
    if (!handle) return null;
    const section = handle.closest("section");
    if (section && section !== main && section.querySelector("[data-light-angle]") && !section.querySelector("[data-eq-stage]")) return section;
    for (let node = handle.parentElement; node && node !== main; node = node.parentElement) {
      if (node.querySelector("[data-light-angle]") && node.querySelector("[data-light-power]") && !node.querySelector("[data-eq-stage]")) return node;
    }
    return null;
  }
  function mount(scope) {
    const body = document.body, main = document.querySelector("main#main");
    const page = body?.getAttribute("data-page");
    if (!main || body.hasAttribute("data-protected-gate") || !["photography", "equipment", "stem"].includes(page)) return () => {};
    if (location.origin !== base.origin || location.pathname !== new URL(page + ".html", base).pathname) return () => {};
    const region = page === "equipment" ? lightingArea(main) : main;
    if (!region) return () => {};
    let alive = true, installed = false, stylesReady = false, root = null;
    const cleanups = [], localizers = [], originals = [];
    function cleanup(fn) { cleanups.push(fn); }
    function on(target, event, handler, options) {
      target.addEventListener(event, handler, options);
      cleanup(() => target.removeEventListener(event, handler, options));
    }
    function bindCopy(target, dictionary) {
      const apply = () => {
        const words = dictionary[language()] || dictionary.en || dictionary["zh-HK"];
        for (const [selector, attribute] of [["[data-ref-copy]", null], ["[data-ref-alt]", "alt"], ["[data-ref-label]", "aria-label"]]) {
          for (const node of target.querySelectorAll(selector)) {
            const key = node.getAttribute(attribute === "alt" ? "data-ref-alt" : attribute ? "data-ref-label" : "data-ref-copy");
            const text = words?.[key] ?? dictionary.en?.[key];
            if (text === undefined) continue;
            if (attribute) { if (node.getAttribute(attribute) !== text) node.setAttribute(attribute, text); }
            else if (node.textContent !== text) node.textContent = text;
          }
        }
      };
      localizers.push(apply); apply();
    }
    function credits(ids) {
      const details = el("details", "ref-credits");
      const summary = el("summary"); summary.setAttribute("data-ref-copy", "credits");
      const intro = el("p"); intro.setAttribute("data-ref-copy", "notice");
      details.append(summary, intro);
      const list = el("ul");
      for (const id of [...new Set(ids)]) {
        const source = sources[id]; if (!source) continue;
        const item = el("li");
        item.append(el("strong", "", source.author + " — " + source.title), document.createTextNode(" "), link(source.title + " ↗", source.source));
        const rights = el("span", "ref-credit-rights"); rights.append(link(source.license, source.license_url), document.createTextNode(" · " + source.changes));
        item.append(rights); list.append(item);
      }
      details.append(list);
      const dictionary = {};
      for (const [locale, copy] of Object.entries(labels)) dictionary[locale] = { credits:copy[0], notice:copy[1] };
      bindCopy(details, dictionary);
      return details;
    }
    const context = {
      main, page,
      asset: filename => new URL("assets/references/" + filename, base).href,
      on, cleanup, bindCopy, credits
    };
    function hide(node) {
      originals.push({node, hidden:node.hasAttribute("hidden"), value:node.getAttribute("hidden")});
      for (const media of node.querySelectorAll("video,audio")) { media.pause(); media.muted = true; }
      node.hidden = true; node.setAttribute("data-reference-original", "");
    }
    function install() {
      if (!alive || installed || !stylesReady || !factories.has(page) || document.body !== body || !main.isConnected) return;
      let candidate;
      try { candidate = factories.get(page)(context); } catch { return; }
      if (!(candidate instanceof HTMLElement)) return;
      root = candidate;
      root.classList.add("ref-chapter");
      root.setAttribute("data-reference-media", page);
      // Keep the original nodes connected for the existing page controller's
      // references. They are restored on disposal, never re-authenticated.
      if (page === "equipment") { hide(region); region.before(root); }
      else {
        for (const node of Array.from(main.children)) hide(node);
        main.append(root); main.setAttribute("data-reference-active", page);
      }
      body.setAttribute("data-portfolio-media", page);
      installed = true;
      manageVideos(root);
    }
    function manageVideos(target) {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      const states = new Map();
      const paused = () => document.visibilityState === "hidden" || body.classList.contains("motion-paused") || !!main.inert;
      function stop(video, state) {
        video.muted = true;
        if (!video.paused) { state.systemPause = true; video.pause(); }
      }
      function refresh(video, state) {
        if (!alive || !state.visible || paused()) { stop(video, state); return; }
        if (video.hasAttribute("data-ref-autoplay") && !reduced?.matches && !state.userPaused && video.paused) {
          video.muted = true;
          video.play()?.catch?.(() => {});
        }
      }
      const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          const state = states.get(entry.target); if (!state) continue;
          state.visible = entry.isIntersecting && entry.intersectionRatio > .1;
          refresh(entry.target, state);
        }
      }, {threshold:[0,.1,.5]}) : null;
      for (const video of target.querySelectorAll("video[data-ref-video]")) {
        video.defaultMuted = video.muted = true; video.playsInline = true;
        const state = {visible:!observer, userPaused:false, systemPause:false}; states.set(video, state);
        on(video, "pause", () => { if (state.systemPause) state.systemPause = false; else state.userPaused = true; });
        on(video, "play", () => { state.userPaused = false; if (paused()) stop(video, state); });
        on(video, "error", () => {
          if (video.nextElementSibling?.hasAttribute("data-ref-media-error")) return;
          const notice = el("p", "ref-caption"); notice.setAttribute("data-ref-media-error", "");
          video.after(notice);
          const words = {}; for (const [locale, copy] of Object.entries(labels)) words[locale] = {error:copy[4]};
          notice.setAttribute("data-ref-copy", "error");
          const apply = () => { notice.textContent = labels[language()][4]; };
          localizers.push(apply); apply();
        });
        observer?.observe(video); refresh(video, state);
      }
      const refreshAll = () => { for (const [video, state] of states) refresh(video, state); };
      const stopAll = () => { for (const [video, state] of states) stop(video, state); };
      on(document, "visibilitychange", refreshAll); on(window, "pagehide", stopAll);
      const motion = new MutationObserver(refreshAll);
      motion.observe(body, {attributes:true, attributeFilter:["class"]});
      motion.observe(main, {attributes:true, attributeFilter:["inert"]});
      const changed = event => { if (event.matches) stopAll(); else refreshAll(); };
      reduced?.addEventListener?.("change", changed);
      cleanup(() => { stopAll(); observer?.disconnect(); motion.disconnect(); reduced?.removeEventListener?.("change", changed); });
    }
    function localize() { for (const apply of localizers) apply(); }
    on(document, "portfolio:language", localize);
    const localeObserver = new MutationObserver(localize);
    localeObserver.observe(document.documentElement, {attributes:true, attributeFilter:["lang"]});
    cleanup(() => localeObserver.disconnect());
    waiting.add(install);
    Promise.all([stylesheet(), load(page)]).then(([style]) => { document.head.append(style); stylesReady = true; install(); }).catch(() => {});
    const dispose = () => {
      if (!alive) return;
      alive = false; waiting.delete(install);
      for (const fn of cleanups.reverse()) { try { fn(); } catch {} }
      root?.remove();
      for (const {node, hidden, value} of originals) {
        if (hidden) node.setAttribute("hidden", value || ""); else node.removeAttribute("hidden");
        node.removeAttribute("data-reference-original");
      }
      if (main.getAttribute("data-reference-active") === page) main.removeAttribute("data-reference-active");
      if (body.getAttribute("data-portfolio-media") === page) body.removeAttribute("data-portfolio-media");
    };
    scope?.cleanup(dispose);
    return dispose;
  }
  if (window.PORTFOLIO_PAGES?.register) window.PORTFOLIO_PAGES.register("portfolio-reference-media", script, mount);
  else {
    let dispose = mount();
    document.addEventListener("portfolio:navigated", () => { dispose(); dispose = mount(); });
  }
})();
