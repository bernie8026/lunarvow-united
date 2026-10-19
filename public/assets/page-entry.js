"use strict";
(() => {
  if (window.BHR_ENTRY) return;
  const root = document.documentElement;
  root.classList.add("page-loading-pending");
  let timer;
  let fallback = null;
  let previousFocus = null;

  function release() {
    clearTimeout(timer);
    root.classList.remove("page-loading-pending");
    fallback?.remove();
    fallback = null;
    document.removeEventListener("keydown", trapFocus, true);
  }

  function trapFocus(event) {
    if (!fallback || event.key !== "Tab") return;
    const buttons = Array.from(fallback.querySelectorAll("button"));
    const current = buttons.indexOf(document.activeElement);
    const next = event.shiftKey
      ? (current <= 0 ? buttons.length - 1 : current - 1)
      : (current + 1) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }

  function showFallback() {
    if (!root.classList.contains("page-loading-pending") || fallback) return;
    previousFocus = document.activeElement;
    fallback = document.createElement("section");
    fallback.id = "page-loading-fallback";
    fallback.setAttribute("role", "alertdialog");
    fallback.setAttribute("aria-modal", "true");
    fallback.setAttribute("aria-labelledby", "page-loading-fallback-title");
    fallback.setAttribute("aria-describedby", "page-loading-fallback-detail");
    fallback.setAttribute("tabindex", "-1");
    fallback.style.cssText = "visibility:visible!important;display:grid!important;position:fixed!important;inset:0!important;z-index:100002!important;box-sizing:border-box!important;min-width:0!important;overflow:auto!important;place-items:center!important;padding:28px!important;background:#070d18!important;color:#edf7ff!important;font:400 15px/1.8 -apple-system,BlinkMacSystemFont,Arial,sans-serif!important;text-align:left!important;";
    fallback.innerHTML = '<div style="width:100%;max-width:480px;box-sizing:border-box"><p aria-hidden="true" style="margin:0 0 28px;color:#00d5ff;font-size:23px;font-weight:600;letter-spacing:-1px">BL</p><h2 id="page-loading-fallback-title" style="margin:0 0 16px;color:#edf7ff;font-size:22px;line-height:1.5;font-weight:500">載入較慢 / <span lang="en">Still loading</span></h2><p id="page-loading-fallback-detail" style="margin:0 0 24px;color:#aac2d7;font-size:14px;line-height:1.8">網站仍在準備內容。你可以重新載入，或者繼續開啟目前已載入嘅內容。<br><span lang="en">The site is still preparing. Reload, or continue with the content available so far.</span></p><div style="display:flex;flex-wrap:wrap;gap:12px"><button type="button" data-entry-reload style="box-sizing:border-box;min-height:44px;max-width:100%;padding:11px 16px;border:1px solid #00d5ff;background:#00d5ff;color:#071724;font:600 13px/1.6 -apple-system,BlinkMacSystemFont,Arial,sans-serif;cursor:pointer">重新載入 / Reload</button><button type="button" data-entry-continue style="box-sizing:border-box;min-height:44px;max-width:100%;padding:11px 16px;border:1px solid #80d7ff77;background:#070d18;color:#edf7ff;font:500 13px/1.6 -apple-system,BlinkMacSystemFont,Arial,sans-serif;cursor:pointer">繼續 / Continue</button></div></div>';
    root.append(fallback);
    fallback.querySelector("[data-entry-reload]").addEventListener("click", () => location.reload());
    fallback.querySelector("[data-entry-continue]").addEventListener("click", () => {
      release();
      if (previousFocus instanceof HTMLElement && previousFocus !== document.body && previousFocus.isConnected) previousFocus.focus({preventScroll: true});
      else document.getElementById("main")?.focus({preventScroll: true});
    });
    document.addEventListener("keydown", trapFocus, true);
    fallback.querySelector("button").focus({preventScroll: true});
  }

  window.BHR_ENTRY = {release};
  timer = setTimeout(showFallback, 30000);
})();
