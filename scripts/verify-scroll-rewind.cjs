/* Verify actual rendered scroll reversal; no production auth or private files. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8782/';
const errors = [], checks = [];
const pages = ['index', 'about', 'experience', 'education', 'skills', 'projects', 'photography', 'equipment', 'stem', 'contact', 'sitemap'];
const url = name => new URL(name + '.html?lang=zh-HK', base).href;
let browser;

async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function contextFor(options = {}) {
  const context = await browser.newContext({viewport:{width:1440,height:900}, reducedMotion:'no-preference', ...options});
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.addInitScript(() => {
    // The init hook also runs in browser-created opaque documents.
    try {
      sessionStorage.setItem('bernie-portfolio-arrival-v2', 'complete');
      localStorage.setItem('bernie-portfolio-motion', 'playing');
    } catch {}
  });
  return context;
}
async function ready(page, name) {
  await page.waitForFunction(name => document.body?.dataset.page === name &&
    !document.querySelector('.boot-screen') && !document.body.classList.contains('is-booting') &&
    !document.querySelector('main')?.inert && document.documentElement.dataset.navigationState === 'idle', name, {timeout:30000});
  await frames(page);
}
async function visit(page, name) {
  await page.goto(url(name), {waitUntil:'domcontentloaded'});
  await ready(page, name);
}
async function sample(page, selector, y) {
  await page.locator(selector).first().evaluate(element => {
    window.__rewindDirectionObserver?.disconnect();
    window.__rewindDirections=[];
    window.__rewindDirectionObserver=new MutationObserver(records => {
      for (const record of records) window.__rewindDirections.push(record.oldValue, element.dataset.motionDirection);
    });
    window.__rewindDirectionObserver.observe(element,{attributes:true,attributeOldValue:true,attributeFilter:['data-motion-direction']});
  });
  await page.evaluate(y => scrollTo({top:y, behavior:'instant'}), y);
  await frames(page);
  await page.waitForTimeout(35);
  return page.locator(selector).first().evaluate(element => {
    const style = getComputedStyle(element);
    return {progress:Number(element.dataset.motionProgress), state:element.dataset.motionState,
      direction:element.dataset.motionDirection, directions:window.__rewindDirections, y:scrollY,
      style:[style.opacity, style.transform, style.filter, style.clipPath].join('|')};
  });
}
async function findRange(page, selector) {
  // First-screen scenes retain a short arrival; let it settle before measuring
  // reversibility so elapsed intro time cannot masquerade as scroll progress.
  const startsVisible = await page.locator(selector).first().evaluate(element => {
    const box=element.getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0;
  });
  if (startsVisible) await page.waitForTimeout(1400);
  const geometry = await page.locator(selector).first().evaluate(element => {
    const box = element.getBoundingClientRect();
    return {top:box.top + scrollY, height:innerHeight,
      max:Math.max(0, document.documentElement.scrollHeight - innerHeight)};
  });
  const low = Math.max(0, geometry.top - geometry.height * 1.2);
  const high = Math.min(geometry.max, geometry.top - geometry.height * .05);
  assert(high > low + 30, selector + ': has meaningful available scroll distance');
  const samples = [];
  for (let i=0; i<=14; i++) samples.push(await sample(page, selector, low + (high-low)*i/14));
  assert(samples.every(item => Number.isFinite(item.progress)), selector + ': exposes finite rendered progress');
  const first = samples.find(item => item.progress > .05 && item.progress < .78);
  const second = samples.find(item => first && item.progress > first.progress + .18 && item.progress < .99);
  assert(first && second, selector + ': visibly traverses intermediate values while scrolling: ' + JSON.stringify({geometry,samples:samples.map(item=>[item.y,item.progress])}));
  return [first.y, second.y];
}
async function assertRewind(page, name, selector) {
  const [a,b] = await findRange(page, selector);
  const forwardA = await sample(page, selector, a);
  const forwardB = await sample(page, selector, b);
  assert(forwardB.progress > forwardA.progress + .15, name + ': downward scrolling advances the scene');
  assert.notEqual(forwardA.style, forwardB.style, name + ': computed appearance changes with scroll');
  const backwardA = await sample(page, selector, a);
  assert(Math.abs(backwardA.progress - forwardA.progress) < .025, name + ': scrolling back restores the same progress');
  assert.equal(backwardA.style, forwardA.style, name + ': scrolling back restores actual rendered styles');
  assert(backwardA.direction === 'reverse' || backwardA.directions.includes('reverse'), name + ': records reverse direction while scrolling');
  await page.waitForTimeout(170);
  const parked = await sample(page, selector, a);
  assert(Math.abs(parked.progress - backwardA.progress) < .005, name + ': stationary scroll does not finish a timed entrance');
  assert.equal(parked.style, backwardA.style, name + ': parked scene keeps its rendered position');
  await sample(page, selector, b);
  const revisit = await sample(page, selector, a);
  assert.equal(revisit.style, forwardA.style, name + ': repeated revisit is reusable');
  checks.push(name + ' computed-style rewind and replay');
  return [a,b];
}
async function desktopRewind() {
  const context = await contextFor(), page = await context.newPage();
  try {
    const targets = [
      ['index', '[data-home-reveal="screen"]'],
      ['about', '[data-about-scene="understand"]'],
      ['experience', '[data-work-scene="record"]'],
      ['education', '.edu-course-section h2'],
      ['projects', '.project-copy h2'],
      ['sitemap', '.sitemap-entry:last-child h3']
    ];
    for (const [name, selector] of targets) {
      await visit(page, name);
      await assertRewind(page, name, selector);
    }
    // The complete contact form already fits above the fold. It must remain
    // readable across its short scroll range, rather than hiding inputs merely
    // to manufacture a rewind before the document's top boundary.
    await visit(page, 'contact');
    await page.waitForTimeout(1400);
    const contactTop = await sample(page, '.contact-panel', 0);
    const contactBottom = await sample(page, '.contact-panel', 100000);
    assert(contactTop.progress >= .999 && contactBottom.progress >= .999, 'short contact form stays fully revealed');
    checks.push('short contact page keeps the complete form readable');
    await visit(page, 'education');
    await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight, behavior:'instant'}));
    await frames(page);
    const end = await page.evaluate(() => ({
      active:[...document.querySelectorAll('.edu-learning-sequence > *')].every(node => node.classList.contains('is-edu-active')),
      segments:[...document.querySelectorAll('.edu-learning-sequence > *')].slice(0,-1).map(node => Number(node.style.getPropertyValue('--edu-segment'))),
      headings:[...document.querySelectorAll('main [data-motion]')].map(node => Number(node.dataset.motionProgress))
    }));
    assert(end.active && end.segments.every(value => value >= .999), 'education learning sequence fully completes at page bottom');
    assert(end.headings.length && end.headings.every(value => value >= .999), 'all scroll scenes can complete within real page height');
    checks.push('education bottom completion');
  } finally { await context.close(); }
}
async function focusAndPreferences() {
  const context = await contextFor(), page = await context.newPage();
  try {
    await visit(page, 'index');
    const selector = '#chapters .navigation-row';
    const [a] = await findRange(page, selector);
    await sample(page, selector, a);
    await page.locator(selector).first().evaluate(node => node.focus({preventScroll:true}));
    await frames(page);
    const focus = await page.locator(selector).first().evaluate(node => ({
      progress:Number(node.dataset.motionProgress), clip:getComputedStyle(node).clipPath, focused:document.activeElement === node
    }));
    assert(focus.focused && focus.progress >= .999, 'keyboard focus fully reveals the focused link');
    assert.equal(focus.clip, 'none', 'keyboard focus removes clipping so the outline can extend outside the link');
    await page.locator(selector).first().evaluate(node => node.blur());
    checks.push('keyboard focus reveals clipped content');

    const target = '[data-home-reveal="screen"]';
    const [position] = await findRange(page, target);
    const playing = await sample(page, target, position);
    await page.evaluate(() => {
      document.body.classList.add('motion-paused');
      document.dispatchEvent(new CustomEvent('portfolio:motion', {detail:{paused:true}}));
    });
    await frames(page);
    const paused = await sample(page, target, position);
    assert(paused.progress >= .999, 'paused preference shows complete readable content');
    await page.evaluate(() => {
      document.body.classList.remove('motion-paused');
      document.dispatchEvent(new CustomEvent('portfolio:motion', {detail:{paused:false}}));
    });
    await frames(page);
    const resumed = await sample(page, target, position);
    assert(Math.abs(resumed.progress - playing.progress) < .025, 'resume returns to current scroll position');
    await page.emulateMedia({reducedMotion:'reduce'});
    await frames(page);
    const reduced = await sample(page, target, position);
    assert(reduced.progress >= .999, 'reduced motion displays complete content');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await frames(page);
    const restored = await sample(page, target, position);
    assert(Math.abs(restored.progress - playing.progress) < .025, 'changing reduced-motion preference back restores scroll control');
    checks.push('pause, reduce and resume stay readable and reversible');
  } finally { await context.close(); }
}
async function routeLifecycle() {
  const context = await contextFor(), page = await context.newPage();
  try {
    await visit(page, 'about');
    const token = await page.evaluate(() => {
      window.__rewindDocument = Math.random();
      window.__rewindOldTargets = [...document.querySelectorAll('main [data-motion-progress]')];
      window.__rewindOldAnimations = document.getAnimations().filter(animation =>
        window.__rewindOldTargets.includes(animation.effect?.target) && !(animation instanceof CSSAnimation));
      return window.__rewindDocument;
    });
    for (const name of ['education','about','education','about']) {
      await page.locator(`.main-nav > a[href*="${name}.html"]`).first().click();
      await ready(page, name);
      const lifecycle = await page.evaluate(() => ({
        token:window.__rewindDocument,
        detached:window.__rewindOldTargets.every(target => !target.isConnected),
        canceled:window.__rewindOldAnimations.every(animation => animation.playState === 'idle'),
        duplicates:[...document.querySelectorAll('main [data-motion-progress]')].filter(target =>
          target.getAnimations().filter(animation => !(animation instanceof CSSAnimation) && Number.isFinite(animation.effect?.getComputedTiming().iterations)).length > 1).length
      }));
      assert.equal(lifecycle.token, token, 'soft route keeps the same document');
      assert(lifecycle.detached && lifecycle.canceled, 'old page scroll effects are canceled on disposal');
      assert.equal(lifecycle.duplicates, 0, 'remount does not duplicate per-element scroll animations');
    }
    checks.push('soft navigation cancels old effects and remounts once');
  } finally { await context.close(); }
}
async function mobileAndStatic() {
  for (const reducedMotion of ['no-preference','reduce']) {
    const context = await contextFor({viewport:{width:390,height:844}, reducedMotion}), page = await context.newPage();
    try {
      for (const name of pages) {
        await visit(page, name);
        const state = await page.evaluate(() => ({
          fits:document.documentElement.scrollWidth <= innerWidth+2,
          progress:[...document.querySelectorAll('main [data-motion-progress]')].map(node => Number(node.dataset.motionProgress)),
          h1:getComputedStyle(document.querySelector('main h1')).visibility !== 'hidden'
        }));
        assert(state.fits && state.h1, reducedMotion + '/' + name + ': mobile content remains visible and fits');
        if (reducedMotion === 'reduce') assert(state.progress.length && state.progress.every(value => value >= .999), name + ': reduced mode settles all scenes');
      }
      if (reducedMotion === 'no-preference') {
        await visit(page, 'index');
        await assertRewind(page, 'mobile homepage', '[data-home-reveal="screen"]');
      }
    } finally { await context.close(); }
  }
  checks.push('all eleven pages fit mobile with reduced motion readable');
}
(async () => {
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless:true});
  try {
    for (const test of [desktopRewind, focusAndPreferences, routeLifecycle, mobileAndStatic]) {
      await test(); console.log('PASS ' + test.name);
    }
    assert.deepEqual(errors, [], 'no browser script errors');
    console.log(JSON.stringify({passed:checks.length, checks}));
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
