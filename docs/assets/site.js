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
  const text = key => dictionary[key]?.[language] ?? dictionary[key]?.["zh-HK"] ?? key;
  body.classList.add("js");

  const masthead = document.querySelector(".masthead");
  function measureMasthead() {
    if (masthead) document.documentElement.style.setProperty("--masthead-height", `${Math.ceil(masthead.getBoundingClientRect().height)}px`);
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
  function setTheme(theme) {
    body.dataset.theme = theme;
    themeButton?.setAttribute("aria-pressed", String(theme === "light"));
    preference.set("theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f7f8ff" : "#0b1022");
  }
  setTheme(preference.get("theme") === "light" ? "light" : "dark");
  themeButton?.addEventListener("click", () => setTheme(body.dataset.theme === "light" ? "dark" : "light"));

  const zones = Array.from(document.querySelectorAll("[data-filter-zone]")).map(element => {
    const items = Array.from(element.querySelectorAll("[data-filter-item]"));
    const buttons = Array.from(element.querySelectorAll("[data-filter]"));
    const input = element.querySelector("[data-search]");
    const status = element.querySelector("[data-result]");
    const empty = element.querySelector("[data-empty]");
    let category = "all";
    function update() {
      const query = (input?.value || "").trim().toLocaleLowerCase();
      let shown = 0;
      items.forEach(item => {
        const allLanguages = Array.from(item.querySelectorAll("[data-i18n]")).map(node => Object.values(dictionary[node.dataset.i18n] || {}).join(" ")).join(" ");
        const searchText = (item.textContent + " " + allLanguages + " " + item.id + " " + item.dataset.category).toLocaleLowerCase();
        const visible = (category === "all" || item.dataset.category === category) && (!query || searchText.includes(query));
        item.hidden = !visible;
        if (visible) shown++;
      });
      buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
      if (status) status.textContent = text("results").replace("{shown}", shown).replace("{total}", items.length);
      if (empty) empty.hidden = shown > 0;
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
    document.documentElement.lang = language;
    preference.set("language", language);
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = text(node.dataset.i18n); });
    document.querySelectorAll("[data-alt]").forEach(node => { node.alt = text(node.dataset.alt); });
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
