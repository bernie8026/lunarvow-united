"use strict";
(() => {
  const body = document.body;
  if (body.dataset.page !== "education") return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = matchMedia("(max-width: 700px)");
  const clamp = value => Math.min(1, Math.max(0, value));
  const campus = document.querySelector(".edu-campus-photo > img");
  let campusWindow = null;
  if (campus) {
    campusWindow = document.createElement("div");
    campusWindow.className = "edu-campus-window";
    campus.before(campusWindow);
    campusWindow.append(campus);
  }

  const milestones = document.querySelector(".edu-milestones");
  const milestoneNodes = milestones ? [...milestones.querySelectorAll(":scope > div")] : [];
  const sequence = document.querySelector(".edu-learning-sequence");
  const sequenceNodes = sequence ? [...sequence.children] : [];
  sequenceNodes.forEach(node => {
    const ring = document.createElement("span");
    ring.className = "edu-node-ring";
    ring.setAttribute("aria-hidden", "true");
    node.append(ring);
  });
  const nodes = [...milestoneNodes, ...sequenceNodes];
  const seen = new WeakSet();
  nodes.forEach(node => node.addEventListener("animationend", event => {
    if (event.animationName === "eduNodeRing") node.classList.remove("is-edu-pulse");
  }));

  // Keep the real <details>/<summary> controls, including their keyboard activation.
  const courses = [...document.querySelectorAll(".edu-course-ledger details")].map(detail => {
    const summary = detail.querySelector("summary");
    const content = document.createElement("div");
    content.className = "edu-course-content";
    [...detail.children].filter(child => child !== summary).forEach(child => content.append(child));
    detail.append(content);
    const course = {detail, summary, content, animation:null, expanded:detail.open};
    summary.addEventListener("click", event => {
      if (stopped() || typeof content.animate !== "function" || event.defaultPrevented || event.button > 0) return;
      event.preventDefault();
      const start = detail.open ? content.getBoundingClientRect().height : 0;
      const expanded = course.animation ? !course.expanded : !detail.open;
      course.animation?.cancel();
      course.expanded = expanded;
      detail.open = true;
      const end = course.expanded ? content.scrollHeight : 0;
      content.style.overflow = "hidden";
      course.animation = content.animate([{height:`${start}px`}, {height:`${end}px`}], {
        duration:310, easing:"cubic-bezier(.22,.7,.25,1)", fill:"both"
      });
      course.animation.onfinish = () => settleCourse(course);
    });
    detail.addEventListener("toggle", () => {
      if (!course.animation) course.expanded = detail.open;
      queueDraw();
    });
    return course;
  });
  function settleCourse(course) {
    if (!course.animation) {
      course.expanded = course.detail.open;
      return;
    }
    const animation = course.animation;
    course.animation = null;
    course.detail.open = course.expanded;
    animation?.cancel();
    course.content.style.removeProperty("overflow");
    queueDraw();
  }

  let queued = 0;
  let previousStopped;
  let eventPaused = false;
  function stopped() {
    return reduced.matches || document.hidden || eventPaused || body.classList.contains("motion-paused") || body.classList.contains("is-booting");
  }
  function activate(node, active, canPulse) {
    node.classList.toggle("is-edu-active", active);
    if (active && canPulse && !seen.has(node)) {
      seen.add(node);
      node.classList.add("is-edu-pulse");
    }
  }
  function sectionProgress(element) {
    const rect = element.getBoundingClientRect();
    const scroller = document.scrollingElement || document.documentElement;
    const scroll = Math.max(0, scroller.scrollTop);
    const maxScroll = Math.max(0, scroller.scrollHeight - innerHeight);
    // A section near the footer must finish within the scroll distance available.
    if (maxScroll <= 1 || scroll >= maxScroll - 1) return 1;
    const start = rect.top + scroll - innerHeight * (narrow.matches ? .7 : .83);
    const duration = narrow.matches ? rect.height : innerHeight * .48 + rect.height * .2;
    const end = Math.min(start + duration, maxScroll);
    return clamp((scroll - start) / Math.max(1, end - start));
  }
  function draw() {
    queued = 0;
    const staticState = stopped();
    body.classList.toggle("edu-motion-still", staticState);
    if (staticState !== previousStopped) {
      if (staticState) {
        courses.forEach(settleCourse);
        nodes.forEach(node => node.classList.remove("is-edu-pulse"));
      }
      previousStopped = staticState;
    }
    if (campusWindow) {
      const rect = campusWindow.getBoundingClientRect();
      const position = clamp((innerHeight - rect.top) / (innerHeight + rect.height));
      const distance = Math.min(24, rect.height * .04);
      campusWindow.style.setProperty("--edu-campus-y", staticState ? "0px" : `${((position - .5) * distance * 2).toFixed(2)}px`);
    }
    if (milestones) {
      const progress = staticState ? 1 : sectionProgress(milestones);
      milestones.style.setProperty("--edu-path", progress.toFixed(3));
      milestoneNodes.forEach((node, index) => {
        const threshold = index ? .65 : .03;
        activate(node, progress >= threshold, !staticState);
      });
    }
    if (sequence) {
      const progress = staticState ? 1 : sectionProgress(sequence);
      sequenceNodes.forEach((node, index) => {
        const part = progress * (sequenceNodes.length - 1) - index;
        node.style.setProperty("--edu-segment", clamp(part).toFixed(3));
        activate(node, progress >= Math.max(.025, index / (sequenceNodes.length - 1)), !staticState);
      });
    }
  }
  function queueDraw() {
    if (!queued) queued = requestAnimationFrame(draw);
  }
  function stateChanged() {
    // A hidden tab may not receive another animation frame, so settle immediately.
    if (stopped()) {
      if (queued) cancelAnimationFrame(queued);
      draw();
    } else queueDraw();
  }
  addEventListener("scroll", queueDraw, {passive:true});
  addEventListener("resize", queueDraw, {passive:true});
  if ("ResizeObserver" in window) new ResizeObserver(queueDraw).observe(document.querySelector("main"));
  document.addEventListener("visibilitychange", stateChanged);
  document.addEventListener("portfolio:motion", event => {
    if (typeof event.detail?.paused === "boolean") eventPaused = event.detail.paused;
    stateChanged();
  });
  document.addEventListener("portfolio:language", queueDraw);
  reduced.addEventListener("change", stateChanged);
  new MutationObserver(stateChanged).observe(body, {attributes:true, attributeFilter:["class"]});
  body.classList.add("edu-motion-ready");
  draw();
})();
