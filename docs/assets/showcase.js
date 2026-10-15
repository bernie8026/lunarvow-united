"use strict";
(() => {
  const mounts = document.querySelectorAll("[data-project-showcase]");
  if (!mounts.length) return;

  const dictionary = window.PORTFOLIO_TEXT || {};
  const projects = [
    {id:"lunar", title:"Lunar Vow Archive", lines:["Lunar Vow", "Archive"], short:"Lunar Vow", image:"lunar-project.webp", category:"t150", summary:"t151", skills:"t152", alt:"t149", credit:"t155"},
    {id:"aerovate", title:"Aerovate", lines:["Aerovate"], short:"Aerovate", image:"equipment/drone-reference.png", category:"t163", summary:"t164", skills:"t165", alt:"t162", credit:"t167"},
    {id:"photography", title:"Cosplay Photography", lines:["Cosplay", "Photography"], short:"Photography", image:"equipment/nikon-d5300.jpg", category:"t175", summary:"t176", skills:"t177", alt:"t174", credit:"t179"}
  ];
  const labels = {
    "zh-HK": {choose:"選擇作品", previous:"上一個作品", next:"下一個作品", hint:"選擇作品，探索創作方向", details:"閱讀作品詳情", position:"第 {current} 個作品，共 {total} 個", title:"將興趣變成作品"},
    "en": {choose:"Select a project", previous:"Previous project", next:"Next project", hint:"Select a project. Explore the story.", details:"Explore this project", position:"Project {current} of {total}", title:"From interests to projects"},
    "zh-CN": {choose:"选择作品", previous:"上一个作品", next:"下一个作品", hint:"选择作品，探索创作方向", details:"阅读作品详情", position:"第 {current} 个作品，共 {total} 个", title:"将兴趣变成作品"}
  };
  const language = () => labels[document.documentElement.lang] ? document.documentElement.lang : "zh-HK";
  const text = key => dictionary[key]?.[language()] ?? dictionary[key]?.["zh-HK"] ?? "";
  const assetBase = new URL("./", document.currentScript.src);
  const asset = filename => new URL(filename, assetBase).href;
  const number = index => String(index + 1).padStart(2, "0");

  mounts.forEach((mount, instance) => {
    if (mount.dataset.showcaseReady === "true") return;
    mount.dataset.showcaseReady = "true";
    const prefix = `showcase-${instance + 1}`;
    const section = document.createElement("section");
    section.className = "showcase-section";
    section.setAttribute("aria-labelledby", `${prefix}-heading`);
    section.innerHTML = `
      <div class="showcase-heading">
        <div><p class="showcase-eyebrow">SELECTED WORK / 03</p><h2 id="${prefix}-heading" data-i18n="t019"></h2></div>
        <p class="showcase-hint"></p>
      </div>
      <div class="showcase-stage" data-active-project="lunar">
        <div class="showcase-orbit" aria-hidden="true"><i></i><i></i></div>
        <div class="showcase-panels">
          ${projects.map((project, index) => `
            <div class="showcase-panel${index === 0 ? " is-active" : ""}" id="${prefix}-panel-${index}" role="tabpanel" aria-labelledby="${prefix}-tab-${index}" tabindex="0"${index ? ' aria-hidden="true" inert' : ""}>
              <div class="showcase-art"><img src="${asset(project.image)}" alt="" data-alt="${project.alt}" width="1080" height="608" loading="lazy" decoding="async" draggable="false"></div>
              <span class="showcase-watermark" aria-hidden="true">${number(index)}</span>
              <div class="showcase-copy">
                <p class="showcase-category"><span class="showcase-diamond" aria-hidden="true"></span><span data-i18n="${project.category}"></span></p>
                <h3 class="showcase-title${index === 2 ? " showcase-title--long" : ""}">${project.lines.map(line => `<span>${line}</span>`).join("")}</h3>
                <p class="showcase-summary" data-i18n="${project.summary}"></p>
                <p class="showcase-skills" data-i18n="${project.skills}"></p>
                <a class="showcase-link" data-internal data-project="${project.id}" href="projects.html#${project.id}"><span class="showcase-link-label"></span><span aria-hidden="true">↗</span></a>
                <small class="showcase-credit" data-i18n="${project.credit}"></small>
              </div>
            </div>`).join("")}
        </div>
        <div class="showcase-controls">
          <div class="showcase-position" aria-hidden="true"><strong>01</strong><span>/</span><span>03</span><i></i><span class="showcase-position-word">PROJECT</span></div>
          <div class="showcase-selector">
            <button class="showcase-arrow showcase-previous" type="button"><span aria-hidden="true">←</span></button>
            <div class="showcase-tabs" role="tablist">
              ${projects.map((project, index) => `
                <button class="showcase-tab" type="button" role="tab" id="${prefix}-tab-${index}" aria-controls="${prefix}-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">
                  <span class="showcase-tab-picture"><img src="${asset(project.image)}" alt="" width="216" height="122" loading="lazy" draggable="false"><span aria-hidden="true">${number(index)}</span></span>
                  <span class="showcase-tab-name">${project.short}</span>
                </button>`).join("")}
            </div>
            <button class="showcase-arrow showcase-next" type="button"><span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
      <p class="showcase-status sr-only" role="status" aria-live="polite" aria-atomic="true"></p>`;
    mount.append(section);

    const stage = section.querySelector(".showcase-stage");
    const panels = Array.from(section.querySelectorAll(".showcase-panel"));
    const tabs = Array.from(section.querySelectorAll(".showcase-tab"));
    const tablist = section.querySelector(".showcase-tabs");
    const previous = section.querySelector(".showcase-previous");
    const next = section.querySelector(".showcase-next");
    const status = section.querySelector(".showcase-status");
    let active = 0;
    let gesture = null;
    let suppressClick = false;

    function positionText() {
      return labels[language()].position.replace("{current}", active + 1).replace("{total}", projects.length);
    }
    function select(index, focus = false, announce = true) {
      const selected = (index + projects.length) % projects.length;
      if (selected === active) {
        if (focus) tabs[selected].focus();
        return;
      }
      // Move focus out of an outgoing panel before making it inert.
      const focusInPanel = panels[active].contains(document.activeElement);
      active = selected;
      tabs.forEach((tab, index) => {
        const chosen = index === active;
        tab.setAttribute("aria-selected", String(chosen));
        tab.tabIndex = chosen ? 0 : -1;
      });
      if (focus || focusInPanel) tabs[active].focus({preventScroll:true});
      panels.forEach((panel, index) => {
        const chosen = index === active;
        panel.classList.toggle("is-active", chosen);
        panel.inert = !chosen;
        if (chosen) panel.removeAttribute("aria-hidden");
        else panel.setAttribute("aria-hidden", "true");
        panel.tabIndex = chosen ? 0 : -1;
      });
      stage.dataset.activeProject = projects[active].id;
      section.querySelector(".showcase-position strong").textContent = number(active);
      if (announce) status.textContent = `${projects[active].title} · ${positionText()}`;
      section.dispatchEvent(new CustomEvent("portfolio:showcase", {bubbles:true, detail:{id:projects[active].id, index:active}}));
    }

    function translate() {
      const ui = labels[language()];
      section.querySelector(".showcase-hint").textContent = ui.hint;
      section.querySelector("h2").textContent = text("t019") || ui.title;
      previous.setAttribute("aria-label", ui.previous);
      next.setAttribute("aria-label", ui.next);
      tablist.setAttribute("aria-label", ui.choose);
      section.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = text(node.dataset.i18n); });
      section.querySelectorAll("[data-alt]").forEach(node => { node.alt = text(node.dataset.alt); });
      section.querySelectorAll(".showcase-link").forEach(link => {
        link.querySelector(".showcase-link-label").textContent = ui.details;
        link.setAttribute("href", `projects.html?lang=${encodeURIComponent(language())}#${link.dataset.project}`);
      });
      tabs.forEach((tab, index) => { tab.setAttribute("aria-label", `${projects[index].title} · ${number(index)}`); });
      if (status.textContent) status.textContent = `${projects[active].title} · ${positionText()}`;
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(index));
      tab.addEventListener("keydown", event => {
        let index;
        if (event.key === "ArrowLeft") index = active - 1;
        else if (event.key === "ArrowRight") index = active + 1;
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = projects.length - 1;
        else return;
        event.preventDefault();
        select(index, true);
      });
    });
    previous.addEventListener("click", () => select(active - 1));
    next.addEventListener("click", () => select(active + 1));

    // Only horizontal, single-pointer touch gestures change the slide. Vertical
    // scrolling and pinch zoom remain native browser gestures.
    stage.addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch" || !event.isPrimary || event.target.closest("button, a")) return;
      gesture = {id:event.pointerId, x:event.clientX, y:event.clientY};
      suppressClick = false;
    }, {passive:true});
    stage.addEventListener("pointerup", event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      suppressClick = true;
      select(active + (dx < 0 ? 1 : -1));
      setTimeout(() => { suppressClick = false; }, 300);
    }, {passive:true});
    stage.addEventListener("pointercancel", () => { gesture = null; }, {passive:true});
    stage.addEventListener("click", event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    section.querySelectorAll(".showcase-link").forEach(link => {
      link.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = document.getElementById(link.dataset.project);
        if (!target || document.body.dataset.page !== "projects") return;
        const zone = target.closest("[data-filter-zone]");
        // Clear active filters before navigating to a hidden project entry.
        if (target.hidden) zone?.querySelector("[data-reset]")?.click();
        target.tabIndex = -1;
        requestAnimationFrame(() => target.focus({preventScroll:true}));
      });
    });
    document.addEventListener("portfolio:language", translate);
    translate();
  });
})();
