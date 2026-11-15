'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'protection/assets/gate-background.js'), 'utf8');
const forbidden = name => { throw new Error('Background controller crossed its boundary: ' + name); };

// Playback promises and events remain separate, matching native media. No login
// fields, credentials, storage or network APIs are available in this model.
function gate({ language = 'en', reduced = false, hidden = false, missing = [], throws = false } = {}) {
  function element() {
    const attributes = new Map(), listeners = new Map(); let text = '';
    return { attributes, listeners, textWrites: 0,
      get textContent() { return text; }, set textContent(value) { text = value; this.textWrites++; },
      getAttribute: name => attributes.get(name) ?? null, hasAttribute: name => attributes.has(name),
      setAttribute(name, value) { attributes.set(name, String(value)); }, removeAttribute(name) { attributes.delete(name); },
      addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
      dispatch(name) { for (const fn of listeners.get(name) || []) fn({ type: name }); },
    };
  }
  const stage = element(), video = element(), toggle = element(), sound = element(), status = element(), link = element();
  const label = element(), group = element(), main = { inert: false }, loading = { hidden: true };
  for (const [name, node] of [['main', main], ['loading', loading]]) Object.defineProperty(node, 'textContent', { get() { return forbidden(name + ' content'); } });
  toggle.disabled = sound.disabled = true; toggle.parentElement = group; group.setAttribute('role', 'group');
  toggle.querySelector = selector => { assert.equal(selector, '[data-gate-video-copy="toggle"]'); return label; };
  toggle.closest = selector => { assert.equal(selector, 'main'); return main; };
  video.setAttribute('data-src', '/lunarvow-united/assets/anfield-anthem.mp4');
  video.paused = true; video.muted = true; video.error = null; video.pauseCalls = video.loadCalls = 0;
  const plays = [];
  video.play = () => { if (throws) throw new Error('NotAllowedError'); let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); plays.push({ resolve, reject }); return promise; };
  video.pause = () => { video.pauseCalls++; video.paused = true; video.dispatch('pause'); };
  video.load = () => { video.loadCalls++; video.error = null; };
  Object.defineProperty(video, 'src', { get() { return video.getAttribute('src'); }, set(value) { video.setAttribute('src', value); } });
  const elements = { 'gate-video-stage': stage, 'gate-video-background': video, 'gate-video-toggle': toggle, 'gate-video-sound': sound, 'gate-video-status': status, 'gate-video-source': link, 'gate-loading': loading };
  const observers = [], documentEvents = new Map(), windowEvents = new Map(), documentElement = { lang: language };
  const media = { matches: reduced, addEventListener(name, fn) { assert.equal(name, 'change'); this.callback = fn; } };
  const document = { documentElement, visibilityState: hidden ? 'hidden' : 'visible',
    getElementById(id) { assert(Object.hasOwn(elements, id), 'controller cannot request auth fields: ' + id); return missing.includes(id) ? null : elements[id]; },
    addEventListener(name, fn) { assert.equal(name, 'visibilitychange'); documentEvents.set(name, fn); }, createElement() { return forbidden('third-party elements'); },
  };
  const window = { matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; },
    addEventListener(name, fn) { assert(['pagehide', 'pageshow'].includes(name)); windowEvents.set(name, fn); },
  };
  const context = { URL, document, window, MutationObserver: class {
    constructor(fn) { this.callback = fn; this.targets = new Map(); observers.push(this); }
    observe(target, options) { const name = target === documentElement ? 'lang' : target === main ? 'inert' : target === loading ? 'hidden' : null;
      assert(name, 'only public language/visibility attributes may be observed'); assert.deepEqual(JSON.parse(JSON.stringify(options)), { attributes: true, attributeFilter: [name] }); this.targets.set(target, name); }
  } };
  for (const name of ['localStorage', 'sessionStorage', 'navigator', 'location', 'fetch', 'XMLHttpRequest', 'WebSocket', 'postMessage']) {
    Object.defineProperty(context, name, { get() { return forbidden(name); } }); Object.defineProperty(window, name, { get() { return forbidden('window.' + name); } });
  }
  const run = () => vm.runInNewContext(source, context, { filename: 'gate-background.js' }); run();
  function notify(target, name) { for (const observer of observers) if (observer.targets.get(target) === name) observer.callback([{ target, type: 'attributes', attributeName: name }]); }
  return { stage, video, toggle, sound, status, link, label, group, observers, plays, run,
    click() { toggle.dispatch('click'); }, soundClick() { sound.dispatch('click'); }, playing() { video.paused = false; video.dispatch('playing'); }, event(name) { video.dispatch(name); },
    language(value) { documentElement.lang = value; notify(documentElement, 'lang'); }, visibility(value) { document.visibilityState = value; documentEvents.get('visibilitychange')?.(); },
    page(name) { windowEvents.get(name)?.(); }, reduced(value) { media.matches = value; media.callback?.({ matches: value }); },
    coverMain(value) { main.inert = value; notify(main, 'inert'); }, coverLoading(value) { loading.hidden = !value; notify(loading, 'hidden'); },
  };
}

test('published background controller matches source', () => assert.equal(fs.readFileSync(path.join(root, 'docs/assets/gate-background.js'), 'utf8'), source));
test('native autoplay is muted and reports success only after playing', () => {
  const p = gate(); assert.equal(p.plays.length, 1); assert.equal(p.video.muted, true); assert.equal(p.video.defaultMuted, true); assert.equal(p.video.playsInline, true); assert.equal(p.video.loop, true);
  assert.equal(p.video.src, '/lunarvow-united/assets/anfield-anthem.mp4'); assert.equal(p.toggle.disabled, false); assert.equal(p.sound.disabled, false);
  for (const node of [p.toggle, p.sound]) assert.equal(node.getAttribute('aria-controls'), 'gate-video-background');
  assert.match(p.status.textContent, /^Loading/); assert.equal(p.stage.hasAttribute('data-video-visible'), false);
  p.playing(); assert.equal(p.stage.getAttribute('data-video-visible'), 'true'); assert.match(p.status.textContent, /playing muted/);
});
test('sound and pause controls follow actual native states', () => {
  const p = gate(); p.playing(); p.soundClick(); assert.equal(p.video.muted, false); assert.equal(p.sound.getAttribute('aria-pressed'), 'true'); assert.match(p.status.textContent, /sound is on/);
  p.soundClick(); assert.equal(p.video.muted, true); p.click(); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true); assert.equal(p.toggle.getAttribute('aria-pressed'), 'false');
  p.soundClick(); assert.equal(p.plays.length, 2); assert.equal(p.video.muted, false, 'audible restart needs its own click');
});
test('reduced motion avoids loading media and permits deliberate playback', () => {
  const p = gate({ reduced: true }); assert.equal(p.plays.length, 0); assert.equal(p.video.getAttribute('src'), null); p.click(); assert.equal(p.plays.length, 1);
  p.playing(); p.soundClick(); p.reduced(true); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true); p.reduced(false); assert.equal(p.plays.length, 1);
});
test('hidden and departed pages silence media without automatic restart', () => {
  const p = gate(); p.playing(); p.soundClick(); p.visibility('hidden'); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true);
  p.click(); p.soundClick(); assert.equal(p.plays.length, 1); p.visibility('visible'); assert.equal(p.plays.length, 1);
  p.click(); p.playing(); p.soundClick(); p.page('pagehide'); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true);
  p.click(); assert.equal(p.plays.length, 2); p.page('pageshow'); assert.equal(p.plays.length, 2); p.click(); assert.equal(p.plays.length, 3); assert.equal(p.video.muted, true);
  assert.equal(gate({ hidden: true }).plays.length, 0);
});
test('auth overlay visibility stops media without reading its contents', () => {
  for (const cover of ['coverMain', 'coverLoading']) { const p = gate(); p.playing(); p.soundClick(); p[cover](true); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true);
    p.click(); p.soundClick(); assert.equal(p.plays.length, 1); p[cover](false); assert.equal(p.plays.length, 1); p.click(); assert.equal(p.plays.length, 2); assert.equal(p.video.muted, true); }
});
test('late playing events cannot override a user pause', () => {
  const p = gate(); p.click(); p.playing(); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true); assert.equal(p.toggle.getAttribute('aria-pressed'), 'false');
});
test('autoplay rejection keeps retry controls usable', async () => {
  const p = gate(); p.plays[0].reject(new Error('NotAllowedError')); await Promise.resolve(); assert.equal(p.toggle.getAttribute('aria-pressed'), 'false'); assert.equal(p.video.muted, true);
  assert.match(p.status.textContent, /paused/); assert.equal(p.stage.hasAttribute('data-video-visible'), false); p.click(); assert.equal(p.plays.length, 2);
  assert.match(gate({ throws: true }).status.textContent, /paused/);
});
test('stale rejection cannot cancel a newer user request', async () => {
  const p = gate(); p.click(); p.soundClick(); p.playing(); p.plays[0].reject(new Error('AbortError')); await Promise.resolve(); assert.equal(p.toggle.getAttribute('aria-pressed'), 'true'); assert.equal(p.video.muted, false);
});
test('decode failures remove reveal and allow source reload', () => {
  const p = gate(); p.playing(); p.video.error = { code: 3 }; p.event('error'); assert.equal(p.stage.hasAttribute('data-video-visible'), false); assert.equal(p.video.paused, true); assert.equal(p.video.muted, true);
  assert.match(p.status.textContent, /could not play/); p.click(); assert.equal(p.video.loadCalls, 1); assert.equal(p.plays.length, 2); p.playing(); assert.match(p.status.textContent, /playing muted/);
});
test('seven languages update states without reloading media', () => {
  const p = gate(), locales = ['zh-HK', 'en', 'zh-CN', 'ja', 'ko', 'th', 'ru'], states = [new Set(), new Set(), new Set()];
  for (const lang of locales) { p.language(lang); states[0].add(p.label.textContent); } p.playing(); p.soundClick();
  for (const lang of locales) { p.language(lang); states[1].add(p.status.textContent); assert(p.group.getAttribute('aria-label')); } p.click();
  for (const lang of locales) { p.language(lang); states[2].add(p.status.textContent); } states.forEach(labels => assert.equal(labels.size, 7)); assert.equal(p.plays.length, 1); assert.equal(p.video.loadCalls, 0);
  for (const lang of ['constructor', '__proto__', 'toString', 'unknown', '']) { p.language(lang); assert.equal(p.label.textContent, '播放背景影片'); }
});
test('unchanged language renders do not repeat live announcements', () => {
  const p = gate(); for (const transition of [() => {}, () => p.playing(), () => p.click()]) { transition(); const counts = [p.status, p.label, p.sound].map(node => node.textWrites); p.language('en'); p.language('en'); assert.deepEqual([p.status, p.label, p.sound].map(node => node.textWrites), counts); }
});
test('missing markup and repeated execution leave authentication untouched', () => {
  for (const id of ['gate-video-stage', 'gate-video-background', 'gate-video-toggle', 'gate-video-sound', 'gate-video-status', 'gate-video-source']) { const p = gate({ missing: [id] }); assert.equal(p.plays.length, 0); assert.equal(p.observers.length, 0); assert.equal(p.toggle.disabled, true); }
  const p = gate(), count = p.observers.length; p.run(); assert.equal(p.plays.length, 1); assert.equal(p.observers.length, count);
});
