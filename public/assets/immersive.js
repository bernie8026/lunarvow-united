"use strict";
(() => {
  const body = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const labels = {
    "zh-HK": {chapters:"頁面章節",home:"序章",profile:"個人檔案",work:"作品展示",explore:"繼續探索",pause:"暫停動畫",resume:"播放動畫"},
    en: {chapters:"Page chapters",home:"Prologue",profile:"Profile",work:"Selected work",explore:"Explore",pause:"Pause animations",resume:"Play animations"},
    "zh-CN": {chapters:"页面章节",home:"序章",profile:"个人档案",work:"作品展示",explore:"继续探索",pause:"暂停动画",resume:"播放动画"}
  };
  const t = () => labels[document.documentElement.lang] || labels["zh-HK"];
  let paused = false;
  try { paused = localStorage.getItem("bernie-portfolio-motion") === "paused"; } catch {}
  body.classList.toggle("motion-paused", paused);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ambient-toggle";
  document.querySelector(".footer-links")?.append(toggle);
  const rail = body.dataset.page === "index" ? document.createElement("nav") : null;
  const chapters = [["top", "home"], ["explore", "profile"], ["selected-work", "work"], ["chapters", "explore"]];
  if (rail) {
    rail.className = "chapter-rail";
    rail.innerHTML = chapters.map(([id, key], i) => `<a href="#${id}" ${i === 0 ? 'aria-current="true"' : ''}><span data-chapter-label="${key}"></span></a>`).join("");
    body.append(rail);
    const sections = chapters.map(([id]) => id === "top" ? document.querySelector(".hero") : document.getElementById(id));
    let queued = false;
    function updateChapter() {
      queued = false;
      let active = 0;
      sections.forEach((section, i) => { if (section && section.getBoundingClientRect().top <= innerHeight * .42) active = i; });
      const scroller = document.scrollingElement || document.documentElement;
      const maxScroll = Math.max(0, scroller.scrollHeight - innerHeight);
      if (maxScroll > 1 && scroller.scrollTop >= maxScroll - 1) active = sections.length - 1;
      rail.querySelectorAll("a").forEach((link, i) => { if (i === active) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current"); });
    }
    function queueChapter() { if (!queued) { queued = true; requestAnimationFrame(updateChapter); } }
    addEventListener("scroll", queueChapter, {passive:true});
    addEventListener("resize", queueChapter);
    document.addEventListener("portfolio:language", queueChapter);
    if ("ResizeObserver" in window) new ResizeObserver(queueChapter).observe(body);
    updateChapter();
  }
  function render() {
    toggle.textContent = paused ? t().resume : t().pause;
    toggle.setAttribute("aria-pressed", String(paused));
    rail?.setAttribute("aria-label", t().chapters);
    rail?.querySelectorAll("[data-chapter-label]").forEach(el => { el.textContent = t()[el.dataset.chapterLabel]; el.parentElement.setAttribute("aria-label", el.textContent); });
  }
  function broadcastMotion() {
    body.dispatchEvent(new CustomEvent("portfolio:motion", {bubbles:true, detail:{paused}}));
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    body.classList.toggle("motion-paused", paused);
    try { localStorage.setItem("bernie-portfolio-motion", paused ? "paused" : "playing"); } catch {}
    render();
    broadcastMotion();
  });
  document.addEventListener("portfolio:language", render);
  render();
  broadcastMotion();

  const hero = body.dataset.page === "index" ? document.querySelector(".hero") : null;
  const universe = hero?.querySelector(".hero-universe");
  if (!hero || !universe) return;

  // A few distant streaks give the orbital scene a different rhythm to the page interactions.
  const stars = document.createElement("div");
  stars.className = "shooting-stars";
  stars.setAttribute("aria-hidden", "true");
  stars.innerHTML = "<span></span><span></span><span></span>";
  hero.prepend(stars);
  let visible = hero.getBoundingClientRect().bottom > 0;
  let active = false;
  let frame = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let lastTime = 0;

  function requestFrame() {
    if (active && !frame) frame = requestAnimationFrame(updateDepth);
  }
  function updateDepth(time) {
    frame = 0;
    if (!active) return;
    // Frame-rate independent easing runs only while the pointer is settling or the page scrolls.
    const ease = Math.min(1, (time - (lastTime || time - 16.7)) / 115);
    lastTime = time;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    const rect = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    universe.style.setProperty("--orbit-x", `${(currentX * 21).toFixed(2)}px`);
    universe.style.setProperty("--orbit-y", `${(currentY * 17 + progress * 74).toFixed(2)}px`);
    universe.style.setProperty("--orbit-rx", `${(-currentY * 4).toFixed(2)}deg`);
    universe.style.setProperty("--orbit-ry", `${(currentX * 5).toFixed(2)}deg`);
    universe.style.setProperty("--orbit-scale", (1 - progress * .09).toFixed(4));
    universe.style.setProperty("--orbit-opacity", (1 - progress * .68).toFixed(4));
    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .001) requestFrame();
  }
  function syncActivity() {
    active = visible && !reduced.matches && !paused && !document.hidden && !body.classList.contains("is-booting");
    body.classList.toggle("hero-motion-inactive", !active);
    if (active) { lastTime = 0; requestFrame(); }
    else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      targetX = targetY = currentX = currentY = 0;
    }
  }
  hero.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || !active) return;
    const rect = hero.getBoundingClientRect();
    targetX = (event.clientX - rect.left - rect.width / 2) / rect.width;
    targetY = (event.clientY - rect.top - rect.height / 2) / rect.height;
    requestFrame();
  }, {passive:true});
  hero.addEventListener("pointerleave", () => { targetX = targetY = 0; requestFrame(); });
  addEventListener("scroll", requestFrame, {passive:true});
  addEventListener("resize", requestFrame, {passive:true});
  document.addEventListener("portfolio:motion", syncActivity);
  document.addEventListener("visibilitychange", syncActivity);
  reduced.addEventListener("change", syncActivity);
  new MutationObserver(syncActivity).observe(body, {attributes:true, attributeFilter:["class"]});
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncActivity();
    }).observe(hero);
  }
  syncActivity();
})();
