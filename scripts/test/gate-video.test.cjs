'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'protection/assets/gate-video.js'), 'utf8');
const videoId = 'zVe7bvDkhbc';
const origin = 'https://fixture.test';
const forbidden = name => { throw new Error('Video controller crossed its boundary: ' + name); };

// Exercise the real controller with an intentionally narrow DOM. Any attempt
// to inspect authentication fields, URL credentials, storage or the network
// fails the test instead of receiving a permissive browser mock.
function gate({ language = 'en', reduced = false, hidden = false, missing = [] } = {}) {
  function element(tag) {
    const attributes = new Map(), listeners = new Map();
    let text = '';
    return {
      tag, childNodes: [], parentElement: null, hidden: false, textWrites: 0,
      get textContent() { return text; },
      set textContent(value) { text = value; this.textWrites++; },
      attributes, listeners,
      getAttribute(name) { return attributes.get(name) ?? null; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      addEventListener(name, callback) { listeners.set(name, callback); },
      replaceChildren(...children) {
        for (const child of this.childNodes) child.parentElement = null;
        this.childNodes = children;
        for (const child of children) child.parentElement = this;
      }
    };
  }
  const stage = element('div'), toggle = element('button'), status = element('p');
  const link = element('a'), label = element('span'), group = element('div');
  const poster = element('div'), main = { inert: false }, loading = { hidden: true };
  for (const [name, node] of [['main', main], ['loading', loading]]) {
    Object.defineProperty(node, 'textContent', { get() { return forbidden(name + ' content'); } });
  }
  stage.replaceChildren(poster);
  stage.closest = selector => { assert.equal(selector, 'main'); return main; };
  toggle.disabled = true;
  toggle.querySelector = selector => {
    assert.equal(selector, '[data-gate-video-copy="toggle"]');
    return label;
  };
  group.setAttribute('role', 'group');
  group.replaceChildren(toggle, link);
  const elements = {
    'gate-video-stage': stage, 'gate-video-toggle': toggle,
    'gate-video-status': status, 'gate-video-source': link, 'gate-loading': loading
  };
  const frames = [], documentEvents = new Map(), windowEvents = new Map();
  const observers = [], documentElement = { lang: language };
  const media = {
    matches: reduced, callback: null,
    addEventListener(name, callback) { assert.equal(name, 'change'); this.callback = callback; }
  };
  const document = {
    documentElement, visibilityState: hidden ? 'hidden' : 'visible',
    getElementById(id) {
      assert(Object.hasOwn(elements, id), 'controller must not request form fields: ' + id);
      return missing.includes(id) ? null : elements[id];
    },
    createElement(tag) {
      assert.equal(tag, 'iframe', 'never create a third-party script in the parent');
      const frame = element(tag); frames.push(frame); return frame;
    },
    addEventListener(name, callback) {
      assert.equal(name, 'visibilitychange'); documentEvents.set(name, callback);
    },
    get cookie() { return forbidden('cookies'); }
  };
  const window = {
    matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; },
    addEventListener(name, callback) {
      assert(['pagehide', 'pageshow'].includes(name), 'no message or auth-event listener');
      windowEvents.set(name, callback);
    }
  };
  const context = {
    URL, document, window,
    location: new Proxy({}, {
      get(_target, key) {
        if (key === 'origin') return origin;
        return forbidden('location.' + String(key));
      }
    }),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.targets = new Map(); observers.push(this); }
      observe(target, options) {
        const expected = target === documentElement ? 'lang' : target === main ? 'inert' : target === loading ? 'hidden' : null;
        assert(expected, 'only public language/visibility elements may be observed');
        assert.deepEqual(JSON.parse(JSON.stringify(options)), { attributes: true, attributeFilter: [expected] });
        this.targets.set(target, expected);
      }
    }
  };
  for (const name of ['localStorage', 'sessionStorage', 'navigator', 'fetch', 'XMLHttpRequest', 'WebSocket', 'postMessage']) {
    Object.defineProperty(context, name, { get() { return forbidden(name); } });
    Object.defineProperty(window, name, { get() { return forbidden('window.' + name); } });
  }
  vm.runInNewContext(source, context, { filename: 'gate-video.js' });
  function notify(target, name) {
    for (const observer of observers) {
      if (observer.targets.get(target) === name) observer.callback([{ target, type: 'attributes', attributeName: name }]);
    }
  }
  return {
    stage, toggle, status, link, label, group, poster, frames, observers, main, loading,
    click: () => toggle.listeners.get('click')?.(),
    language(value) { documentElement.lang = value; notify(documentElement, 'lang'); },
    visibility(value) { document.visibilityState = value; documentEvents.get('visibilitychange')?.(); },
    page(name) { windowEvents.get(name)?.(); },
    reduced(value) { media.matches = value; media.callback?.({ matches: value }); },
    coverMain(value) { main.inert = value; notify(main, 'inert'); },
    coverLoading(value) { loading.hidden = !value; notify(loading, 'hidden'); }
  };
}

test('published media controller exactly matches its source', () => {
  assert.equal(fs.readFileSync(path.join(root, 'docs/assets/gate-video.js'), 'utf8'), source);
});

test('initial gate leaves the video disconnected and authentication untouched', () => {
  const page = gate();
  assert.equal(page.frames.length, 0);
  assert.deepEqual(page.stage.childNodes, [page.poster]);
  assert.equal(page.toggle.disabled, false);
  assert.equal(page.toggle.getAttribute('aria-controls'), 'gate-video-stage');
  assert.equal(page.label.textContent, 'Load anthem video');
  assert.match(page.status.textContent, /only when you load/);
  assert.equal(page.link.href, 'https://www.youtube.com/watch?v=' + videoId);
  assert.equal(page.link.target, '_blank');
  assert.equal(page.link.rel, 'noopener noreferrer');
  assert.equal(page.link.hidden, false, 'fallback is visible even before loading');
});

test('a deliberate click creates only the fixed privacy-enhanced native player', () => {
  const page = gate(); page.click();
  const frame = page.frames[0], url = new URL(frame.src);
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/' + videoId);
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    controls: '1', playsinline: '1', loop: '1', playlist: videoId,
    autoplay: '1', origin
  });
  assert.equal(url.hash, '');
  assert.equal(frame.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
  assert.equal(frame.getAttribute('allow'), 'autoplay; encrypted-media; picture-in-picture; fullscreen');
  assert.equal(frame.getAttribute('allowfullscreen'), '');
  assert.match(frame.title, /video player/);
  assert.equal(frame.getAttribute('aria-hidden'), null);
  assert.deepEqual(page.stage.childNodes, [frame], 'poster is removed rather than overlaid on the player');
  assert.equal(page.poster.parentElement, null);
  assert.equal(page.label.textContent, 'Stop video');
  assert.match(page.status.textContent, /may need to press play/);
  assert.match(page.status.textContent, /if unavailable, watch on YouTube/);
  assert.equal(frame.listeners.size, 0, 'iframe load does not masquerade as a playback-success signal');
  assert.equal(page.link.hidden, false, 'blocked embeds retain an independent fallback');
});

test('Stop removes the browsing context and restores the original poster', () => {
  const page = gate(); page.click();
  const first = page.frames[0];
  page.click();
  assert.equal(first.parentElement, null);
  assert.deepEqual(page.stage.childNodes, [page.poster]);
  assert.equal(page.label.textContent, 'Load anthem video');
  assert.match(page.status.textContent, /^Video stopped/);
  page.click();
  assert.equal(page.frames.length, 2);
  assert.notEqual(page.frames[1], first, 'explicit reload creates a fresh player');
  assert.deepEqual(page.stage.childNodes, [page.frames[1]]);
});

test('hidden pages and pagehide stop the player without automatic restart', () => {
  const page = gate(); page.click();
  page.visibility('hidden');
  assert.deepEqual(page.stage.childNodes, [page.poster]);
  page.click();
  assert.equal(page.frames.length, 1, 'hidden pages cannot create a player');
  page.visibility('visible');
  assert.equal(page.frames.length, 1, 'returning to a tab does not resume playback');
  assert.match(page.status.textContent, /^Video stopped/);
  page.click();
  page.page('pagehide');
  assert.deepEqual(page.stage.childNodes, [page.poster]);
  page.click();
  assert.equal(page.frames.length, 2, 'a departed page cannot create a player');
  page.page('pageshow');
  assert.equal(page.frames.length, 2, 'bfcache restoration does not restart playback');
  page.click();
  assert.equal(page.frames.length, 3);
  const initialHidden = gate({ hidden: true }); initialHidden.click();
  assert.equal(initialHidden.frames.length, 0);
});

test('auth overlay visibility stops media without inspecting credentials or auth content', () => {
  for (const cover of ['coverMain', 'coverLoading']) {
    const page = gate(); page.click();
    const frame = page.frames[0];
    page[cover](true);
    assert.equal(frame.parentElement, null, cover);
    assert.deepEqual(page.stage.childNodes, [page.poster]);
    assert.match(page.status.textContent, /^Video stopped/);
    page.click();
    assert.equal(page.frames.length, 1, 'covered player must not be recreated');
    page[cover](false);
    assert.equal(page.frames.length, 1, 'dismissing overlay must not resume media');
    page.click();
    assert.equal(page.frames.length, 2);
  }
});

test('reduced motion suppresses scripted autoplay and stops an existing player when enabled', () => {
  const page = gate({ reduced: true });
  assert.equal(page.frames.length, 0);
  page.click();
  assert.equal(new URL(page.frames[0].src).searchParams.get('autoplay'), '0');
  page.click(); page.reduced(false); page.click();
  assert.equal(new URL(page.frames[1].src).searchParams.get('autoplay'), '1');
  page.reduced(true);
  assert.deepEqual(page.stage.childNodes, [page.poster]);
  page.reduced(false);
  assert.equal(page.frames.length, 2, 'preference changes never load the video');
});

test('all seven languages update each state without resetting an existing player', () => {
  const labels = {
    'zh-HK': ['載入會歌影片', '停止影片', '影片已停止'],
    en: ['Load anthem video', 'Stop video', 'Video stopped'],
    'zh-CN': ['加载队歌视频', '停止视频', '视频已停止'],
    ja: ['応援歌の動画を読み込む', '動画を停止', '動画を停止しました'],
    ko: ['응원가 영상 불러오기', '영상 정지', '영상이 정지되었습니다'],
    th: ['โหลดวิดีโอเพลงประจำสโมสร', 'หยุดวิดีโอ', 'หยุดวิดีโอแล้ว'],
    ru: ['Загрузить видео с гимном', 'Остановить видео', 'Видео остановлено']
  };
  const page = gate();
  const readyStatuses = new Set(), loadedStatuses = new Set(), stoppedStatuses = new Set();
  for (const [language, [load]] of Object.entries(labels)) {
    page.language(language);
    assert.equal(page.label.textContent, load);
    readyStatuses.add(page.status.textContent);
  }
  page.click(); const frame = page.frames[0], initialUrl = frame.src;
  for (const [language, [, stop]] of Object.entries(labels)) {
    page.language(language);
    assert.equal(page.label.textContent, stop);
    assert.match(page.link.textContent, /YouTube/);
    assert(frame.title.includes('Liverpool FC'));
    assert(page.group.getAttribute('aria-label'));
    assert.equal(frame.src, initialUrl, 'locale changes do not reload or navigate the player');
    loadedStatuses.add(page.status.textContent);
  }
  assert.equal(page.frames.length, 1);
  page.click();
  for (const [language, [load, , stopped]] of Object.entries(labels)) {
    page.language(language);
    assert.equal(page.label.textContent, load);
    assert(page.status.textContent.startsWith(stopped));
    stoppedStatuses.add(page.status.textContent);
  }
  for (const states of [readyStatuses, loadedStatuses, stoppedStatuses]) assert.equal(states.size, 7);
});

test('unknown or prototype locale names fall back to Hong Kong Chinese', () => {
  const page = gate();
  for (const language of ['constructor', '__proto__', 'toString', 'not-a-language', '']) {
    page.language(language);
    assert.equal(page.label.textContent, '載入會歌影片');
  }
});

test('repeated language renders do not rewrite unchanged live-region or control text', () => {
  const page = gate();
  for (const state of ['ready', 'loaded', 'stopped']) {
    if (state !== 'ready') page.click();
    const counts = [page.status, page.label, page.link].map(node => node.textWrites);
    page.language('en'); page.language('en');
    assert.deepEqual([page.status, page.label, page.link].map(node => node.textWrites), counts, state);
  }
  const before = page.status.textWrites;
  page.language('zh-HK');
  assert.equal(page.status.textWrites, before + 1, 'a real language change still updates the live region');
});

test('missing video markup leaves the rest of the gate alone', () => {
  for (const id of ['gate-video-stage', 'gate-video-toggle', 'gate-video-status', 'gate-video-source']) {
    const page = gate({ missing: [id] });
    assert.equal(page.frames.length, 0);
    assert.equal(page.observers.length, 0);
    assert.equal(page.toggle.disabled, true);
    assert.equal(page.toggle.listeners.size, 0);
  }
});
