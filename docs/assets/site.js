"use strict";
(() => {
  const body = document.body;
  const dictionary = window.PORTFOLIO_TEXT || {};
  const supported = ["zh-HK", "en", "zh-CN"];
  const preference = {
    get(key) { try { return localStorage.getItem("bernie-portfolio-" + key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem("bernie-portfolio-" + key, value); } catch {} }
  };
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  let language = [queryLanguage, preference.get("language"), "zh-HK"].find(value => supported.includes(value));
  let messageDraft = "";
  let draftValues = null;
  let toastTimer;
  let renderedLanguage;
  const text = (key, fallback = key) => {
    const entry = Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : null;
    return [entry?.[language], entry?.["zh-HK"], fallback, key].find(value => typeof value === "string" && value.length > 0) || "";
  };
  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  body.classList.add("js");

  const masthead = document.querySelector(".masthead");
  function measureMasthead() {
    if (!masthead) return;
    const rect = masthead.getBoundingClientRect();
    const isSideRail = getComputedStyle(masthead).position === "fixed" && rect.width <= 100;
    const height = `${isSideRail ? 0 : Math.ceil(rect.height)}px`;
    if (document.documentElement.style.getPropertyValue("--masthead-height") !== height) document.documentElement.style.setProperty("--masthead-height", height);
  }
  measureMasthead();
  if (masthead && "ResizeObserver" in window) new ResizeObserver(measureMasthead).observe(masthead);
  else addEventListener("resize", measureMasthead);

  const nav = document.getElementById("main-nav");
  const menu = document.querySelector(".menu-toggle");
  if (menu && nav) {
    menu.hidden = false;
    nav.dataset.open = "false";
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") !== "true";
      menu.setAttribute("aria-expanded", String(open));
      nav.dataset.open = String(open);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
        nav.dataset.open = "false";
        menu.setAttribute("aria-expanded", "false");
        menu.focus();
      }
    });
  }
  const themeButton = document.querySelector(".theme-toggle");
  function setTheme(value, persist = true) {
    const theme = value === "light" ? "light" : "dark";
    const changed = body.dataset.theme !== theme;
    body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    themeButton?.setAttribute("aria-pressed", String(theme === "light"));
    if (persist) preference.set("theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f2f8fc" : "#070d18");
    if (changed) document.dispatchEvent(new CustomEvent("portfolio:theme", {detail:{theme}}));
  }
  setTheme(preference.get("theme"), false);
  themeButton?.addEventListener("click", () => setTheme(body.dataset.theme === "light" ? "dark" : "light"));
  addEventListener("storage", event => {
    if (event.key === "bernie-portfolio-theme" || event.key === null) setTheme(preference.get("theme"), false);
  });
  addEventListener("pageshow", () => setTheme(preference.get("theme"), false));

  const zones = Array.from(document.querySelectorAll("[data-filter-zone]")).map(element => {
    const items = Array.from(element.querySelectorAll("[data-filter-item]"));
    const buttons = Array.from(element.querySelectorAll("[data-filter]"));
    const input = element.querySelector("[data-search]");
    const status = element.querySelector("[data-result]");
    const empty = element.querySelector("[data-empty]");
    // Dictionary text is static; keep it searchable without rebuilding it on every keystroke.
    const translations = new Map(items.map(item => [item, Array.from(item.querySelectorAll("[data-i18n]")).map(node => Object.values(dictionary[node.dataset.i18n] || {}).filter(value => typeof value === "string").join(" ")).join(" ")]));
    let category = "all";
    function update() {
      const query = (input?.value || "").trim().toLocaleLowerCase();
      let shown = 0;
      items.forEach(item => {
        const searchText = (item.textContent + " " + translations.get(item) + " " + item.id + " " + (item.dataset.category || "")).toLocaleLowerCase();
        const visible = (category === "all" || item.dataset.category === category) && (!query || searchText.includes(query));
        if (item.hidden === visible) item.hidden = !visible;
        if (visible) shown++;
      });
      buttons.forEach(button => {
        const pressed = String(button.dataset.filter === category);
        if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
      });
      if (status) setText(status, text("results").replace("{shown}", shown).replace("{total}", items.length));
      if (empty && empty.hidden !== (shown > 0)) empty.hidden = shown > 0;
      document.dispatchEvent(new CustomEvent("portfolio:filter", {detail:{items}}));
    }
    buttons.forEach(button => button.addEventListener("click", () => { category = button.dataset.filter; update(); }));
    input?.addEventListener("input", update);
    element.querySelector("[data-reset]")?.addEventListener("click", () => { category = "all"; if (input) input.value = ""; update(); input?.focus(); });
    return { update };
  });

  function updateInternalLinks() {
    document.querySelectorAll("a[data-internal]").forEach(link => {
      const original = link.dataset.baseHref || link.getAttribute("href");
      link.dataset.baseHref = original;
      const [path, fragment] = original.split("#");
      link.setAttribute("href", path.split("?")[0] + "?lang=" + encodeURIComponent(language) + (fragment ? "#" + fragment : ""));
    });
  }
  function renderDraft() {
    if (!draftValues) return;
    const topicSelect = document.querySelector('[name="topic"]');
    const topic = Array.from(topicSelect.options).find(option => option.value === draftValues.topic)?.textContent || draftValues.topic;
    messageDraft = text("draftTitle") + "\n\n" + text("draftName") + ": " + draftValues.name + "\n" + text("draftEmail") + ": " + draftValues.email + "\n" + text("draftTopic") + ": " + topic + "\n\n" + text("draftBody") + ":\n" + draftValues.message;
    document.getElementById("message-preview").textContent = messageDraft;
    document.getElementById("form-status").textContent = text("draftReady");
  }
  function setLanguage(next) {
    language = supported.includes(next) ? next : "zh-HK";
    if (renderedLanguage === language) return;
    renderedLanguage = language;
    document.documentElement.lang = language;
    preference.set("language", language);
    document.querySelectorAll("[data-i18n]").forEach(node => { setText(node, text(node.dataset.i18n, node.textContent)); });
    document.querySelectorAll("[data-alt]").forEach(node => {
      const alt = text(node.dataset.alt, node.alt);
      if (node.alt !== alt) node.alt = alt;
    });
    document.querySelectorAll("[data-language]").forEach(button => { button.setAttribute("aria-pressed", String(button.dataset.language === language)); });
    themeButton?.setAttribute("aria-label", text("theme"));
    nav?.setAttribute("aria-label", text("nav"));
    document.querySelector("[data-search]")?.setAttribute("placeholder", text("searchPlaceholder"));
    updateInternalLinks();
    zones.forEach(zone => zone.update());
    renderDraft();
    document.dispatchEvent(new CustomEvent("portfolio:language"));
    try {
      const url = new URL(location.href);
      url.searchParams.set("lang", language);
      history.replaceState(null, "", url);
    } catch {}
  }
  document.querySelectorAll("[data-language]").forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.language)));
  setLanguage(language);

  document.querySelectorAll("[data-dialog]").forEach(button => {
    const dialog = document.getElementById(button.dataset.dialog);
    if (dialog && typeof dialog.showModal === "function") {
      button.hidden = false;
      button.addEventListener("click", () => dialog.showModal());
      dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    } else {
      button.closest("article")?.querySelector(".project-fallback")?.style.setProperty("display", "block");
    }
  });
  document.querySelectorAll("[data-print]").forEach(button => button.addEventListener("click", () => window.print()));

  function toast(value) {
    const toastElement = document.querySelector(".toast");
    if (!toastElement) return;
    clearTimeout(toastTimer);
    toastElement.textContent = value;
    toastElement.hidden = false;
    toastTimer = setTimeout(() => { toastElement.hidden = true; }, 4000);
  }
  const form = document.getElementById("contact-form");
  if (form) {
    form.querySelector("[data-form-ready]").disabled = false;
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      draftValues = Object.fromEntries(["name", "email", "topic", "message"].map(name => [name, String(fields.get(name) || "").trim()]));
      if (!draftValues.name || draftValues.message.replace(/\s/g, "").length < 10) {
        const field = form.querySelector(draftValues.name ? '[name="message"]' : '[name="name"]');
        field.setCustomValidity(draftValues.name ? (language === "en" ? "Please enter at least 10 non-blank characters." : "請輸入至少 10 個非空白字元。") : (language === "en" ? "Please enter your name." : "請輸入稱呼。"));
        field.reportValidity();
        field.addEventListener("input", () => field.setCustomValidity(""), {once:true});
        return;
      }
      renderDraft();
      document.getElementById("message-result").hidden = false;
      document.getElementById("message-preview").focus();
    });
    document.getElementById("copy-message").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(messageDraft); toast(text("copied")); }
      catch { toast(text("copyFallback")); }
    });
    document.getElementById("download-message").addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([messageDraft], {type:"text/plain;charset=utf-8"}));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Message-to-Bernie.txt";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
})();
