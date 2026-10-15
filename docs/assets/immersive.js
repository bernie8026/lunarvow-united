"use strict";
(() => {
  const body = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const labels = {
    "zh-HK": {chapters:"頁面章節",home:"序章",profile:"個人檔案",work:"作品展示",explore:"繼續探索",pause:"暫停背景動畫",resume:"播放背景動畫"},
    en: {chapters:"Page chapters",home:"Prologue",profile:"Profile",work:"Selected work",explore:"Explore",pause:"Pause ambient motion",resume:"Play ambient motion"},
    "zh-CN": {chapters:"页面章节",home:"序章",profile:"个人档案",work:"作品展示",explore:"继续探索",pause:"暂停背景动画",resume:"播放背景动画"}
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
      rail.querySelectorAll("a").forEach((link, i) => { if (i === active) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current"); });
    }
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(updateChapter); } }, {passive:true});
    addEventListener("resize", updateChapter);
    updateChapter();
  }
  function render() {
    toggle.textContent = paused ? t().resume : t().pause;
    toggle.setAttribute("aria-pressed", String(paused));
    rail?.setAttribute("aria-label", t().chapters);
    rail?.querySelectorAll("[data-chapter-label]").forEach(el => { el.textContent = t()[el.dataset.chapterLabel]; el.parentElement.setAttribute("aria-label", el.textContent); });
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    body.classList.toggle("motion-paused", paused);
    try { localStorage.setItem("bernie-portfolio-motion", paused ? "paused" : "playing"); } catch {}
    render();
  });
  document.addEventListener("portfolio:language", render);
  render();
  const hero = document.querySelector(".hero");
  const universe = document.querySelector(".hero-universe");
  if (hero && universe) {
    hero.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse" || reduced.matches || paused || body.classList.contains("is-booting")) return;
      const rect = hero.getBoundingClientRect();
      universe.style.setProperty("--orbit-x", `${(event.clientX - rect.left - rect.width / 2) / rect.width * 14}px`);
      universe.style.setProperty("--orbit-y", `${(event.clientY - rect.top - rect.height / 2) / rect.height * 12}px`);
    }, {passive:true});
    hero.addEventListener("pointerleave", () => { universe.style.setProperty("--orbit-x", "0px"); universe.style.setProperty("--orbit-y", "0px"); });
  }
})();
