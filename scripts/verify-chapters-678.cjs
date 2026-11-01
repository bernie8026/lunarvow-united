/* Render and exercise the three exhibition chapters without production auth. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8782/';
const languages = ['zh-HK','en','zh-CN','ja','ko','th','ru'];
const chapters = ['photography','equipment','stem'];
const errors = [], checks = [];
let browser;
async function ready(page, name) {
  await page.waitForFunction(name => document.body?.dataset.page === name &&
    !document.body.classList.contains('is-booting') && !document.querySelector('.boot-screen') &&
    document.documentElement.dataset.navigationState === 'idle', name, {timeout:30000});
}
async function visit(page, name) {
  await page.goto(new URL(name+'.html?lang=zh-HK',base).href, {waitUntil:'domcontentloaded'});
  await ready(page,name);
}
async function frame(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function range(page, selector, value) {
  await page.locator(selector).evaluate((node,value) => {
    node.value = String(value); node.dispatchEvent(new Event('input',{bubbles:true}));
    node.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  await frame(page);
}
async function fit(page,label) {
  const state=await page.evaluate(() => ({viewport:innerWidth,width:document.documentElement.scrollWidth,
    h1:!!document.querySelector('main h1')?.getBoundingClientRect().height,
    broken:[...document.querySelectorAll('main img')].filter(image => !image.complete || !image.naturalWidth).length}));
  if(state.width>state.viewport+2)console.error(JSON.stringify({label,...state,overflow:await page.locator('body *').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&getComputedStyle(n).position!=='fixed';}).slice(0,12).map(n=>({tag:n.tagName,class:n.className?.baseVal||n.className,right:n.getBoundingClientRect().right}))) }));
  assert(state.width <= state.viewport+2,label+': no horizontal overflow');
  assert(state.h1,label+': visible heading'); assert.equal(state.broken,0,label+': imagery decoded');
}
async function appearance(page,selector,pseudo) {
  return page.locator(selector).first().evaluate((node,pseudo)=>{
    const s=getComputedStyle(node,pseudo||null);
    return [s.transform,s.clipPath,s.opacity,s.filter,s.backgroundImage].join('|');
  },pseudo);
}

async function photography(page) {
  await visit(page,'photography');
  await page.locator('[data-photo-exhibit]').waitFor();
  const selected=() => page.locator('[data-photo-select][aria-pressed="true"]').getAttribute('data-photo-select');
  const before=await selected();
  await page.locator('[data-photo-next]').click();
  assert.notEqual(await selected(),before,'next changes selected study');
  await page.locator('[data-photo-prev]').click();
  assert.equal(await selected(),before,'previous returns to the original study');
  await page.locator('[data-photo-select]').last().click();
  assert.equal(await selected(),await page.locator('[data-photo-select]').last().getAttribute('data-photo-select'));
  await range(page,'[data-photo-compare]',18);
  const a=await appearance(page,'[data-photo-grade]');
  await range(page,'[data-photo-compare]',82);
  const b=await appearance(page,'[data-photo-grade]');
  assert.notEqual(a,b,'comparison changes its rendered split');
  await range(page,'[data-photo-compare]',18);
  assert.equal(await appearance(page,'[data-photo-grade]'),a,'comparison reverses to the same split');
  await page.locator('[data-photo-exhibit]').focus();
  const keyboardBefore=await selected(); await page.keyboard.press('ArrowRight');
  assert.notEqual(await selected(),keyboardBefore,'gallery can be selected with the keyboard');
  checks.push('photography selection and reversible comparison');
}

async function equipment(page) {
  await visit(page,'equipment');
  await page.locator('[data-eq-stage]').waitFor();
  const camera=page.locator('[data-eq-select="camera"]'), flash=page.locator('[data-eq-select="flash"]');
  await flash.click(); assert.equal(await flash.getAttribute('aria-pressed'),'true');
  await camera.click(); assert.equal(await camera.getAttribute('aria-pressed'),'true');
  await page.locator('[data-eq-hotspot]').first().click();
  await page.locator('[data-eq-stage]').scrollIntoViewIfNeeded();
  const stage=await page.locator('[data-eq-viewport]').boundingBox();
  await page.mouse.move(stage.x+stage.width*.55,stage.y+stage.height*.55);
  await frame(page);
  await page.waitForFunction(()=>!document.querySelector('[data-eq-lens]').hidden);
  const lens=await page.locator('[data-eq-lens]').evaluate(n=>({background:getComputedStyle(n).backgroundImage,size:getComputedStyle(n).backgroundSize}));
  assert(lens.background.includes('nikon-d5300'),'loupe uses the selected product image');
  assert.notEqual(lens.size,'auto','loupe enlarges product details');
  await range(page,'[data-light-angle]',25);
  await range(page,'[data-light-power]',25);
  const first=await page.locator('[data-light-beam]').getAttribute('points');
  await range(page,'[data-light-angle]',70);
  await range(page,'[data-light-power]',80);
  assert.notEqual(await page.locator('[data-light-beam]').getAttribute('points'),first,'lamp controls change the rendered light beam');
  await page.locator('[data-light-mode="bounce"]').click();
  assert.equal(await page.locator('[data-light-mode="bounce"]').getAttribute('aria-pressed'),'true');
  assert(await page.locator('[data-light-bounce-path]').getAttribute('d'),'bounce mode renders a reflected path');
  await page.locator('[data-light-mode="direct"]').click();
  assert.equal(await page.locator('[data-light-bounce-path]').getAttribute('d'),'','direct mode removes the reflected path');
  const lamp=await page.locator('[data-light-handle]').boundingBox();
  const angleBefore=await page.locator('[data-light-angle]').inputValue();
  await page.mouse.move(lamp.x+lamp.width/2,lamp.y+lamp.height/2);await page.mouse.down();
  await page.mouse.move(lamp.x+lamp.width/2-80,lamp.y+lamp.height/2-30,{steps:8});await page.mouse.up();
  assert.notEqual(await page.locator('[data-light-angle]').inputValue(),angleBefore,'dragging the light changes its angle');
  checks.push('equipment selection, hotspots, magnifier and lighting');
}

async function stem(page) {
  await visit(page,'stem');
  await page.locator('[data-flight-map]').waitFor();
  const count=await page.locator('[data-flight-waypoint]').count();
  await page.locator('[data-flight-add]').click();
  assert.equal(await page.locator('[data-flight-waypoint]').count(),count+1,'adding a point changes the mission');
  await page.locator('[data-flight-play]').click();
  const slider=page.locator('[data-flight-scrub]');
  const initial=Number(await slider.inputValue());
  await page.waitForFunction(initial=>Number(document.querySelector('[data-flight-scrub]').value)>initial+.1,initial,{timeout:5000});
  await page.locator('[data-flight-play]').click();
  const max=Number(await slider.getAttribute('max'))||100;
  await range(page,'[data-flight-scrub]',max*.25);
  const first=await page.locator('[data-flight-drone]').getAttribute('transform');
  await range(page,'[data-flight-scrub]',max*.75);
  const second=await page.locator('[data-flight-drone]').getAttribute('transform');
  assert.notEqual(first,second,'flight scrub moves the actual drone');
  await range(page,'[data-flight-scrub]',max*.25);
  assert.equal(await page.locator('[data-flight-drone]').getAttribute('transform'),first,'flight can rewind to the exact position');
  await page.locator('[data-flight-reset]').click();
  assert.equal(Number(await slider.inputValue()),0,'reset returns mission to start');
  const point=page.locator('[data-flight-waypoint]').first();
  const pointBefore=await point.getAttribute('transform');
  await point.focus();await page.keyboard.press('ArrowRight');
  assert.notEqual(await point.getAttribute('transform'),pointBefore,'keyboard nudge changes waypoint geometry');
  const geometry=await point.getAttribute('transform'),box=await point.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2-30,{steps:8});await page.mouse.up();
  assert.notEqual(await point.getAttribute('transform'),geometry,'dragging changes waypoint geometry');
  const assembly=page.locator('[data-stem-assembly]');
  const positions=await assembly.evaluate(node=>{const top=node.getBoundingClientRect().top+scrollY;return [Math.max(0,top-innerHeight*.82),Math.max(0,top-innerHeight*.35)];});
  async function sample(y){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await frame(page);return assembly.locator('[data-stem-layer]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('transform')));}
  const assembled=await sample(positions[0]),expanded=await sample(positions[1]),rewound=await sample(positions[0]);
  assert.notDeepEqual(expanded,assembled,'scrolling separates the actual assembly layers');
  assert.deepEqual(rewound,assembled,'scrolling back recombines layers at the same positions');
  checks.push('editable mission, playback and exact rewind');
}

async function languagesAndLayouts(page) {
  for(const chapter of chapters) {
    await visit(page,chapter);
    for(const language of languages) {
      await page.locator(`[data-language="${language}"]`).click(); await frame(page);
      await fit(page,chapter+'/'+language);
      const missing=await page.locator('main [data-i18n]').evaluateAll(nodes=>nodes
        .filter(n=>/^(?:photoEx|eqRoom|stemLab)/.test(n.dataset.i18n))
        .filter(n=>!window.PORTFOLIO_TEXT?.[n.dataset.i18n]?.[document.documentElement.lang])
        .map(n=>n.dataset.i18n));
      assert.deepEqual(missing,[],chapter+'/'+language+': new copy is translated');
    }
    await page.locator('[data-language="zh-HK"]').click();
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900}); await frame(page);
      for(const theme of ['dark','light']) {
        if(await page.locator('body').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
        await fit(page,chapter+'/'+width+'/'+theme);
      }
    }
    await page.setViewportSize({width:320,height:844});
    for(const language of ['ru','th']){await page.locator(`[data-language="${language}"]`).click();await frame(page);await fit(page,chapter+'/320/'+language);}
    await page.locator('[data-language="zh-HK"]').click();
    await page.emulateMedia({reducedMotion:'reduce'}); await frame(page);
    await fit(page,chapter+'/reduced');
    if(chapter==='stem') {
      await range(page,'[data-flight-scrub]',60);
      assert.equal(Number(await page.locator('[data-flight-scrub]').inputValue()),60,'manual flight scrub is usable with reduced motion');
    }
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
  checks.push('seven languages, four widths, both themes and reduced motion');
}

async function lifecycle(page) {
  await page.setViewportSize({width:1440,height:900});
  await visit(page,'photography');
  const token=await page.evaluate(()=>window.__exhibitionDocument=Math.random());
  for(const name of ['equipment','stem','photography','stem']) {
    await page.locator(`.main-nav > a[href*="${name}.html"]`).click(); await ready(page,name);
    assert.equal(await page.evaluate(()=>window.__exhibitionDocument),token,'exhibitions retain soft navigation');
    assert.equal(await page.locator('[data-photo-exhibit],[data-eq-stage],[data-flight-map]').count(),1,'one exhibit mounts for the active page');
  }
  checks.push('exhibition soft navigation and clean remount');
}

(async()=>{
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{try{sessionStorage.setItem('bernie-portfolio-arrival-v2','complete');localStorage.setItem('bernie-portfolio-motion','playing');}catch{}});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  try {
    const page=await context.newPage();
    for(const test of [photography,equipment,stem,languagesAndLayouts,lifecycle]) {await test(page);console.log('PASS '+test.name);}
    assert.deepEqual([...new Set(errors)],[],'no uncaught browser errors');
    console.log(JSON.stringify({passed:checks.length,checks}));
  }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
