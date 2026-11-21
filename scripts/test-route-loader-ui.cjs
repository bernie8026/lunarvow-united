'use strict';
// Minimal public structure for the three runtime presentations. Exercise the
// shipped styles in a fresh tab without invoking or manipulating authentication.
const assert = require('node:assert/strict');
const path = require('node:path');
const styles = path.resolve(__dirname, '../docs/assets');

async function verifyRouteLoaderUI(existingPage) {
  const page = await existingPage.context().newPage();
  try {
    await page.setViewportSize({width:320,height:620});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setContent(`<!doctype html><html lang="zh-HK"><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>*{box-sizing:border-box}body{margin:0}.boot-screen{position:fixed;inset:0;display:flex;flex-direction:column;overflow:auto}
      .boot-screen__cinema{flex:1}.boot-screen__console{position:relative}.boot-screen__bar>span{display:block;width:100%;height:100%;transform-origin:left}
      .boot-screen__moon{height:3rem;width:3rem}.boot-screen:not([data-mode="intro"]) .boot-screen__cinema{display:none}</style>
      <body data-page="stem"><div class="boot-screen boot-screen--cinematic" data-mode="intro" data-phase="loading" role="dialog" aria-label="Fixture">
      <div class="boot-screen__masthead">Portfolio</div><div class="boot-screen__cinema"><div class="boot-screen__visual"><div class="boot-screen__moon"></div></div>
      <h2 class="boot-screen__title">Project</h2></div><div class="boot-screen__console">
      <div class="boot-screen__readout"><span class="boot-screen__phase">正在載入</span><span class="boot-screen__percentage">038%</span></div>
      <div class="boot-screen__bar" role="progressbar" aria-valuenow="38"><span style="transform:scaleX(.38)"></span></div>
      <small class="boot-screen__status" role="status">準備內容</small><div class="boot-screen__actions"><button class="boot-screen__retry" hidden>再試</button>
      <button class="boot-screen__skip-animation">略過動畫</button></div></div></div></body></html>`);
    for (const file of ['industrial.css','transition-loading.css']) await page.addStyleTag({path:path.join(styles,file)});
    const screen=page.locator('.boot-screen'), consoleEl=screen.locator('.boot-screen__console');
    const meter=screen.getByRole('progressbar'), skip=screen.getByRole('button',{name:'略過動畫'});
    assert(await meter.isVisible() && await skip.isVisible(),'intro exposes measured work and the existing skip button');
    await skip.focus();
    assert(await skip.evaluate(n=>document.activeElement===n && n.getBoundingClientRect().height >= 44),'skip stays keyboard accessible');
    assert(await screen.locator('.boot-screen__moon').evaluate(n=>getComputedStyle(n).backgroundImage.includes('conic-gradient') && getComputedStyle(n).animationName==='none'),'static aperture on reduced motion');
    await screen.evaluate(n=>{n.dataset.mode='page';n.querySelector('.boot-screen__skip-animation').hidden=true});
    assert(await meter.isVisible() && !await skip.isVisible(),'page exposes the actual bar without inventing a skip action');
    assert.equal(await meter.getAttribute('aria-valuenow'),'38');
    assert(await meter.evaluate(n=>Math.abs(n.firstElementChild.getBoundingClientRect().width/n.getBoundingClientRect().width-.38)<.005),'ruler preserves the actual completion ratio');
    const fixed=await consoleEl.evaluate(n=>getComputedStyle(n,'::after').clipPath);
    await screen.evaluate(n=>{n.dataset.mode='departure'});
    assert(!await meter.count(),'the router handoff does not announce a fabricated percentage');
    assert(await screen.getByRole('status').isVisible(),'the existing handoff announcement remains available');
    const shuttle=await consoleEl.evaluate(n=>({clip:getComputedStyle(n,'::after').clipPath,animation:getComputedStyle(n,'::after').animationName}));
    assert.notEqual(shuttle.clip,fixed,'departure uses a transfer shuttle instead of the page instrument indicator');
    assert.equal(shuttle.animation,'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await consoleEl.evaluate(n=>getComputedStyle(n,'::after').animationName),'portfolio-transfer-shuttle');
    await page.locator('body').evaluate(n=>n.classList.add('motion-paused'));
    assert.equal(await consoleEl.evaluate(n=>getComputedStyle(n,'::after').animationName),'none','site motion preference stops the transfer');
    await screen.evaluate(n=>{n.dataset.mode='page';n.dataset.phase='failed';for(const b of n.querySelectorAll('button'))b.hidden=false});
    assert(await screen.getByRole('button',{name:'再試'}).isVisible() && await skip.isVisible(),'existing recovery actions are accessible');
    assert(await screen.evaluate(n=>n.scrollWidth<=innerWidth+1),'recovery and status fit a narrow screen');
  } finally { await page.close(); }
}
module.exports = verifyRouteLoaderUI;
module.exports.verifyRouteLoaderUI = verifyRouteLoaderUI;
