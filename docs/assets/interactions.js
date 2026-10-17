"use strict";
(() => {
  const body = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const active = new Set();
  const allowed = () => !reduced.matches && !document.hidden && !body.classList.contains("motion-paused") && !body.classList.contains("is-booting");
  function play(element, frames, options) {
    if (!allowed() || !element?.animate) return;
    active.forEach(animation => {if (animation.effect?.target === element) animation.cancel();});
    const animation = element.animate(frames, options);
    active.add(animation);
    animation.finished.catch(() => {}).then(() => active.delete(animation));
    return animation;
  }

  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  body.append(progress);
  const journeys = Array.from(document.querySelectorAll(".experience-entry"));
  const clamp = value => Math.max(0, Math.min(1, value));
  let queued = false;
  function updateScroll() {
    queued = false;
    progress.hidden = !allowed();
    if (!allowed()) return;
    const scroller = document.scrollingElement || document.documentElement;
    const scroll = Math.max(0, scroller.scrollTop);
    const max = Math.max(0, scroller.scrollHeight - innerHeight);
    const atEnd = max <= 1 || scroll >= max - 1;
    progress.style.setProperty("--read", String(atEnd ? 1 : clamp(scroll / max)));
    journeys.forEach(entry => {
      const rect = entry.getBoundingClientRect();
      const start = rect.top + scroll - innerHeight * .65;
      // The final entry must complete within the page's available scroll distance.
      const end = Math.min(start + rect.height, max);
      const amount = atEnd ? 1 : clamp((scroll - start) / Math.max(1, end - start));
      entry.style.setProperty("--journey", `${amount * 100}%`);
      entry.classList.toggle("journey-current", amount > 0 && amount < 1);
    });
  }
  function queueScroll() {if (!queued) {queued = true; requestAnimationFrame(updateScroll);}}
  addEventListener("scroll", queueScroll, {passive:true});
  addEventListener("resize", queueScroll);
  document.addEventListener("portfolio:language", queueScroll);
  document.addEventListener("toggle", queueScroll, true);
  if ("ResizeObserver" in window) new ResizeObserver(queueScroll).observe(body);

  // Move existing skill rows to their new positions when the visitor filters.
  const skillZone = document.querySelector('[data-filter-zone="skills"]');
  let previous = new Map();
  function snapshotSkills() {
    previous = new Map(Array.from(skillZone?.querySelectorAll("[data-filter-item]") || []).filter(item => !item.hidden).map(item => [item, item.getBoundingClientRect().top + scrollY]));
  }
  skillZone?.addEventListener("click", event => {if (event.target instanceof Element && event.target.closest("[data-filter]")) snapshotSkills();}, true);
  document.addEventListener("portfolio:filter", event => {
    const items = event.detail?.items;
    if (!skillZone || !allowed() || !Array.isArray(items)) return;
    items.filter(item => item instanceof Element && skillZone.contains(item) && !item.hidden).forEach(item => {
      const top = item.getBoundingClientRect().top + scrollY;
      const before = previous.get(item);
      if (before !== undefined && Math.abs(before - top) > 1) play(item, [{transform:`translateY(${before - top}px)`}, {transform:"none"}], {duration:430,easing:"cubic-bezier(.2,.7,.3,1)"});
      else if (before === undefined) play(item, [{opacity:.3}, {opacity:1}], {duration:400,easing:"ease-out"});
    });
    previous.clear();
    queueScroll();
  });

  // Product photographs respond inside their existing editorial layout.
  const products = Array.from(document.querySelectorAll(".project-entry > .gear-product-image"));
  products.forEach(figure => {
    figure.classList.add("interactive-product");
    figure.addEventListener("pointermove", event => {
      if (!allowed() || !fine.matches || event.pointerType !== "mouse") return;
      const rect = figure.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      figure.style.setProperty("--product-x", `${x * 5}deg`);
      figure.style.setProperty("--product-y", `${-y * 4}deg`);
      figure.classList.add("is-engaged");
    }, {passive:true});
    figure.addEventListener("pointerleave", () => figure.classList.remove("is-engaged"));
  });

  const flashFigure = document.querySelector(".gear-flash-image");
  let flashButton;
  if (flashFigure) {
    const image = flashFigure.querySelector("img");
    const photo = document.createElement("span");
    photo.className = "flash-picture";
    image.before(photo);
    photo.append(image);
    const light = document.createElement("span");
    light.className = "flash-light";
    light.setAttribute("aria-hidden", "true");
    photo.append(light);
    flashButton = document.createElement("button");
    flashButton.type = "button";
    flashButton.className = "flash-demo";
    flashFigure.querySelector("figcaption").append(flashButton);
    flashButton.addEventListener("click", () => {
      if (!allowed()) return;
      active.forEach(animation => {if (animation.effect?.target === light) animation.cancel();});
      play(light, [{opacity:0}, {opacity:.7,offset:.13}, {opacity:0}], {duration:560,easing:"ease-out"});
    });
  }
  function translate() {
    if (flashButton) flashButton.textContent = {"zh-HK":"⚡ 試閃動畫",en:"⚡ Test flash","zh-CN":"⚡ 试闪动画"}[document.documentElement.lang] || "⚡ Test flash";
  }
  document.addEventListener("portfolio:language", translate);
  translate();

  const draft = document.getElementById("message-result");
  if (draft) new MutationObserver(() => {
    if (!draft.hidden) play(draft, [{clipPath:"inset(0 0 100% 0)"}, {clipPath:"inset(0 0 0 0)"}], {duration:550,easing:"cubic-bezier(.2,.7,.3,1)"});
  }).observe(draft, {attributes:true,attributeFilter:["hidden"]});

  function sync() {
    if (!allowed()) {
      active.forEach(animation => animation.cancel());
      active.clear();
      products.forEach(figure => figure.classList.remove("is-engaged"));
      journeys.forEach(entry => {entry.style.setProperty("--journey", "100%");entry.classList.remove("journey-current");});
    }
    if (flashButton) flashButton.disabled = !allowed();
    queueScroll();
  }
  document.addEventListener("portfolio:motion", sync);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  new MutationObserver(sync).observe(body, {attributes:true,attributeFilter:["class"]});
  sync();
})();
