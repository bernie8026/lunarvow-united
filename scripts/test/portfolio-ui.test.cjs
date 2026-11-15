'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'protection/assets/protected-ui.js'), 'utf8');
const origin = 'https://fixture.test';
const base = '/lunarvow-united/';
const script = origin + base + 'assets/protected-ui.js?v=clarity-1';

// A small DOM fixture exercises actual mutations, subscriptions and disposal
// without installing a browser or publishing any private portfolio content.
function environment({ pathname = '', gated = false, unknown = false, router = true } = {}) {
  const observers = new Set();
  let mutationDeliveries = 0;
  const notify = (target, type, attributeName) => {
    for (const observer of observers) {
      const matches = observer.targets.some(({ node, options }) => {
        if (node !== target && (!options.subtree || !node.contains(target))) return false;
        return options[type] && (type !== 'attributes' || !options.attributeFilter || options.attributeFilter.includes(attributeName));
      });
      if (!matches) continue;
      observer.records.push({ target, type, attributeName });
      if (observer.queued) continue;
      observer.queued = true;
      queueMicrotask(() => {
        observer.queued = false;
        if (observer.records.length) {
          assert(++mutationDeliveries < 100, 'UI mutations must settle without an observer loop');
          observer.callback(observer.records.splice(0));
        }
      });
    }
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = []; this.records = []; this.queued = false; observers.add(this); }
    observe(node, options) { this.targets.push({ node, options }); }
    disconnect() { this.targets = []; this.records = []; }
  }
  class EventTarget {
    constructor() { this.handlers = new Map(); }
    addEventListener(type, listener) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set());
      this.handlers.get(type).add(listener);
    }
    removeEventListener(type, listener) { this.handlers.get(type)?.delete(listener); }
    dispatchEvent(event) { for (const listener of [...this.handlers.get(event.type) || []]) listener(event); }
  }
  class Text {
    constructor(value) { this.nodeType = 3; this.parentElement = null; this.value = String(value); }
    get nodeValue() { return this.value; }
    set nodeValue(value) { this.value = value; notify(this, 'characterData'); }
    get textContent() { return this.nodeValue; }
    get isConnected() { return this.parentElement?.isConnected || false; }
  }
  function compoundMatches(node, selector) {
    if (node.nodeType !== 1) return false;
    const tag = selector.match(/^[a-zA-Z][\w-]*/)?.[0];
    if (tag && node.tagName !== tag.toUpperCase()) return false;
    for (const [, id] of selector.matchAll(/#([\w-]+)/g)) if (node.id !== id) return false;
    for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(name)) return false;
    for (const [, key, value] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (!node.hasAttribute(key) || (value !== undefined && node.getAttribute(key) !== value)) return false;
    }
    return true;
  }
  function matches(node, selector) {
    const parts = selector.trim().split(/\s+/);
    if (!compoundMatches(node, parts.pop())) return false;
    let ancestor = node.parentElement;
    while (parts.length) {
      const part = parts.pop();
      while (ancestor && !compoundMatches(ancestor, part)) ancestor = ancestor.parentElement;
      if (!ancestor) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  }
  class Element extends EventTarget {
    constructor(tag) {
      super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attributes = new Map(); this.childNodes = []; this.parentElement = null;
      this.classList = { contains: name => this.className.split(/\s+/).includes(name) };
    }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get isConnected() { return this.tagName === '#DOCUMENT' || !!this.parentElement?.isConnected; }
    get className() { return this.getAttribute('class') || ''; }
    set className(value) { this.setAttribute('class', value); }
    get id() { return this.getAttribute('id') || ''; }
    set id(value) { this.setAttribute('id', value); }
    get textContent() { return this.childNodes.map(node => node.textContent).join(''); }
    set textContent(value) {
      for (const child of this.childNodes) child.parentElement = null;
      this.childNodes = [];
      if (String(value)) { const text = new Text(value); text.parentElement = this; this.childNodes.push(text); }
      notify(this, 'childList');
    }
    getAttribute(key) { return this.attributes.has(key) ? this.attributes.get(key) : null; }
    hasAttribute(key) { return this.attributes.has(key); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); notify(this, 'attributes', key); }
    removeAttribute(key) { this.attributes.delete(key); notify(this, 'attributes', key); }
    contains(node) { for (let current = node; current; current = current.parentElement) if (current === this) return true; return false; }
    append(...nodes) { for (const node of nodes) this.insertBefore(node, null); }
    insertBefore(node, before) {
      if (typeof node === 'string') node = new Text(node);
      if (node.parentElement) node.parentElement.removeChild(node);
      const index = before === null ? this.childNodes.length : this.childNodes.indexOf(before);
      assert(index >= 0, 'insertion target must be a direct child');
      node.parentElement = this; this.childNodes.splice(index, 0, node); notify(this, 'childList');
      return node;
    }
    removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentElement = null; notify(this, 'childList'); return node; }
    remove() { this.parentElement?.removeChild(this); }
    querySelectorAll(selector) {
      const selectors = selector.split(',');
      const results = [];
      const visit = parent => {
        for (const child of parent.children) {
          if (selectors.some(part => matches(child, part))) results.push(child);
          visit(child);
        }
      };
      visit(this);
      return results;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  function element(tag, attributes = {}, ...children) {
    const node = new Element(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    node.append(...children);
    return node;
  }
  function page(home = true) {
    const nav = element('nav', { id: 'main-nav', class: 'main-nav' });
    for (const [index, name] of ['about', 'experience', 'education', 'skills', 'projects', 'photography', 'equipment', 'stem'].entries()) {
      nav.append(element('a', { href: name + '.html?lang=en', 'data-internal': '' },
        element('span', { class: 'nav-index' }, String(index + 1).padStart(2, '0')),
        element('span', { 'data-i18n': 'nav-' + name }, name.toUpperCase())));
    }
    const footer = element('div', { class: 'footer-brand' }, 'SAMPLE ', element('em', {}, 'OWNER.'), element('small', {}, 'Current descriptor'));
    const main = element('main', { id: 'main', class: home ? 'home-page' : '' });
    const hero = element('section', { class: 'home-hero', 'data-carousel': '' },
      element('h1', { 'data-hero-title': '' }, 'Current story'),
      element('p', { 'data-hero-description': '' }, 'A trilingual web project'),
      element('button', { 'data-slide-to': '0' }, '1 / 3'),
      element('button', { 'data-slide-to': '1' }, '2 / 3'),
      element('button', { 'data-slide-to': '2' }, '3 / 3'),
      element('p', { 'data-carousel-status': '' }, '1 / 3'));
    const credit = element('figcaption', {}, 'Reference illustration, not a screenshot');
    const lead = element('p', { class: 'home-lead' }, 'A three-language website');
    const selected = element('section', { id: 'selected-work' }, element('h2', { id: 'home-lunar-title' }, 'Current project'), lead,
      element('div', { class: 'home-browser' }, element('img', { src: 'assets/reference.svg', alt: 'Reference image' }), credit));
    const outside = element('p', { id: 'unrelated' }, 'Three languages, 3 projects, 13 languages');
    if (home) main.append(hero, selected, outside);
    else main.append(element('article', { id: 'lunar' }, element('p', { 'data-i18n': 't151' }, 'A trilingual project')), outside);
    const body = element('body', { 'data-page': home ? 'index' : 'projects' },
      element('header', { class: 'masthead' }, element('a', { class: 'brand' }, element('strong', {}, 'Fallback owner')), nav), main, footer);
    return { body, main, nav, footer, hero, selected, lead, credit, outside };
  }
  const document = new Element('#document');
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.querySelector('#' + id);
  document.currentScript = { src: script };
  const location = new URL(origin + base + pathname + '?lang=en');
  document.baseURI = location.href;
  document.documentElement = element('html', { lang: 'en' });
  document.head = element('head');
  const meta = element('meta', { name: 'description', content: 'Current private description from the page.' });
  document.head.append(meta);
  const current = page();
  document.body = current.body;
  if (gated) current.body.setAttribute('data-protected-gate', '');
  if (unknown) current.nav.remove();
  document.documentElement.append(document.head, document.body);
  document.append(document.documentElement);
  const mounted = [], registrations = [];
  function scope() {
    const cleanups = [];
    const result = { cleanup: fn => cleanups.push(fn), dispose: () => cleanups.splice(0).reverse().forEach(fn => fn()) };
    mounted.push(result);
    return result;
  }
  const window = new EventTarget();
  if (router) window.PORTFOLIO_PAGES = { register(name, src, mount) { registrations.push({ name, src, mount }); mount(scope()); } };
  const forbidden = () => { throw new Error('UI helper must not access credentials, storage or network'); };
  const context = { window, document, location, URL, MutationObserver: Observer, queueMicrotask, fetch: forbidden };
  for (const target of [context, window]) {
    for (const name of ['localStorage', 'sessionStorage', 'navigator']) Object.defineProperty(target, name, { get: forbidden });
  }
  const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
  const run = () => vm.runInNewContext(source, context, { filename: 'protected-ui.js' });
  const event = type => document.dispatchEvent({ type });
  run();
  return {
    ...current, document, meta, location, observers, registrations, mounted, element, page, event, flush, run,
    mutationDeliveries: () => mutationDeliveries,
    replacePage(home) {
      mounted.at(-1)?.dispose();
      const next = page(home);
      document.body.remove();
      document.body = next.body;
      document.documentElement.append(next.body);
      registrations[0]?.mount(scope());
      event('portfolio:navigated');
      return next;
    },
  };
}

test('source and published UI helper stay identical', () => {
  assert.equal(fs.readFileSync(path.join(root, 'docs/assets/protected-ui.js'), 'utf8'), source);
});

test('identity reuses current private DOM, prioritises whole project, and preserves the carousel', async () => {
  const ui = environment();
  await ui.flush();
  const intro = ui.main.querySelector('[data-portfolio-identity]');
  assert(intro);
  assert.equal(intro.querySelector('[data-identity-name]').textContent, 'SAMPLE OWNER.');
  assert.equal(intro.querySelector('[data-identity-kicker]').textContent, 'Current descriptor');
  assert.equal(intro.querySelector('[data-identity-description]').textContent, ui.meta.getAttribute('content'));
  assert.deepEqual(ui.main.children.slice(0, 3), [intro, ui.selected, ui.hero]);
  assert.equal(ui.main.querySelectorAll('h1').length, 1);
  assert.equal(ui.selected.querySelector('figcaption'), ui.credit);
  assert.equal(ui.credit.textContent, 'Reference illustration, not a screenshot');
  assert.deepEqual(ui.hero.querySelectorAll('[data-slide-to]').map(node => node.getAttribute('data-slide-to')), ['0', '1', '2']);
  assert.equal(ui.hero.querySelector('[data-carousel-status]').textContent, '1 / 3');
  const links = intro.querySelectorAll('a[data-internal]');
  assert.deepEqual(links.map(link => link.textContent), ['PROJECTS', 'ABOUT']);
  assert.deepEqual(links.map(link => link.getAttribute('href')), [base + 'projects.html?lang=en', base + 'about.html?lang=en']);
  assert.equal(ui.registrations[0].src, script, 'router identity retains the exact versioned script URL');
});

test('all seven language corrections are scoped and reapply after a renderer changes text', async () => {
  const ui = environment();
  const variants = [
    ['zh-HK', '三語網頁', '七語網頁'],
    ['en', 'A trilingual website with three-language navigation', 'A seven-language website with seven-language navigation'],
    ['zh-CN', '三语网页与3种语言', '七语网页与七种语言'],
    ['ja', '3言語・3か国語・3ヶ国語', '7言語・7か国語・7ヶ国語'],
    ['ko', '3개 언어 / 세 개 언어', '7개 언어 / 일곱 개 언어'],
    ['th', 'สามภาษา / 3 ภาษา', 'เจ็ดภาษา / 7 ภาษา'],
    ['ru', 'трёхъязычный сайт на трёх языках / 3 языка', 'семиязычный сайт на семи языках / 7 языков'],
  ];
  for (const [lang, before, after] of variants) {
    ui.document.documentElement.setAttribute('lang', lang);
    ui.lead.textContent = before;
    ui.hero.querySelector('[data-hero-description]').textContent = before;
    ui.outside.textContent = before;
    await ui.flush();
    assert.equal(ui.lead.textContent, after, lang + ' case-study copy');
    assert.equal(ui.hero.querySelector('[data-hero-description]').textContent, after, lang + ' carousel copy');
    assert.equal(ui.outside.textContent, before, lang + ' unrelated copy stays untouched');
    assert.equal(ui.hero.querySelector('[data-carousel-status]').textContent, '1 / 3');
  }
  const largerNumbers = '13 languages / 13言語 / １３言語 / 13개 언어 / 13 ภาษา / ๑๓ ภาษา / 13 языка / 13种语言';
  ui.lead.textContent = largerNumbers;
  await ui.flush();
  assert.equal(ui.lead.textContent, largerNumbers);
  const deliveries = ui.mutationDeliveries();
  await ui.flush();
  assert.equal(ui.mutationDeliveries(), deliveries, 'observer becomes idle after correction');
});

test('locale and page events update identity and links once without duplicating UI', async () => {
  const ui = environment();
  const projects = ui.nav.querySelectorAll('a[data-internal]').find(link => link.getAttribute('href').startsWith('projects'));
  projects.setAttribute('href', 'projects.html?lang=ja#lunar');
  projects.querySelector('span[data-i18n]').textContent = '現在の作品';
  ui.meta.setAttribute('content', '現在の紹介文');
  ui.event('portfolio:language');
  ui.event('portfolio:navigated');
  ui.event('portfolio:language');
  ui.run();
  await ui.flush();
  assert.equal(ui.main.querySelectorAll('[data-portfolio-identity]').length, 1);
  assert.equal(ui.document.head.querySelectorAll('#portfolio-clarity-style').length, 1);
  assert.equal(ui.registrations.length, 1);
  assert.equal(ui.main.querySelector('[data-identity-description]').textContent, '現在の紹介文');
  const link = ui.main.querySelector('[data-identity-page="projects"]');
  assert.equal(link.textContent, '現在の作品');
  assert.equal(link.getAttribute('href'), base + 'projects.html?lang=ja#lunar');
  assert.equal(ui.location.search, '?lang=en', 'link copying does not depend on a possibly stale address-bar locale');
});

test('locked, embedded and unrecognised pages receive no presentation changes', async () => {
  for (const options of [{ gated: true }, { unknown: true }, { pathname: 'lunarvow/index.html' }]) {
    const ui = environment(options);
    await ui.flush();
    assert.equal(ui.body.hasAttribute('data-portfolio-clarity'), false);
    assert.equal(ui.document.documentElement.hasAttribute('data-portfolio-clarity'), false);
    assert.equal(ui.main.querySelector('[data-portfolio-identity]'), null);
    assert.equal(ui.document.getElementById('portfolio-clarity-style'), null);
    assert.equal(ui.observers.size, 0);
  }
});

test('identity links reject external, credentialed and out-of-scope destinations', async () => {
  for (const href of ['https://elsewhere.test/projects.html', 'javascript:alert(1)', origin + '/projects.html', 'https://example:invalid@fixture.test' + base + 'projects.html']) {
    const ui = environment();
    const projects = ui.nav.querySelectorAll('a[data-internal]').find(link => link.getAttribute('href').startsWith('projects'));
    projects.setAttribute('href', href);
    ui.meta.setAttribute('content', '<img src=x onerror=alert(1)>');
    ui.event('portfolio:language');
    await ui.flush();
    assert.equal(ui.main.querySelector('[data-identity-page="projects"]'), null, href);
    assert(ui.main.querySelector('[data-identity-page="about"]'));
    assert.equal(ui.main.querySelector('[data-identity-description]').textContent, '<img src=x onerror=alert(1)>');
    assert.equal(ui.main.querySelector('[data-identity-description]').children.length, 0, 'private text is never interpreted as markup');
  }
});

test('page disposal cancels queued mutations and remounts one helper per current page', async () => {
  const ui = environment();
  ui.lead.textContent = 'A trilingual old page';
  const projects = ui.replacePage(false);
  await ui.flush();
  assert.equal(ui.lead.textContent, 'A trilingual old page', 'disposed page is not changed by a queued callback');
  assert.equal(projects.main.querySelector('[data-portfolio-identity]'), null);
  assert.equal(projects.main.querySelector('#lunar').textContent, 'A seven-language project');
  const home = ui.replacePage(true);
  await ui.flush();
  assert.equal(home.main.querySelectorAll('[data-portfolio-identity]').length, 1);
  assert.equal(ui.document.head.querySelectorAll('#portfolio-clarity-style').length, 1);
  assert.equal([...ui.observers].filter(observer => observer.targets.length).length, 1);
  assert.equal(ui.document.handlers.get('portfolio:language').size, 1);
});

test('older project layouts are not moved and an absent router still remains idempotent', async () => {
  const ui = environment({ router: false });
  await ui.flush();
  ui.selected.querySelector('#home-lunar-title').remove();
  ui.main.insertBefore(ui.hero, ui.selected);
  ui.event('portfolio:navigated');
  await ui.flush();
  assert(ui.main.children.indexOf(ui.hero) < ui.main.children.indexOf(ui.selected));
  assert.equal(ui.main.querySelectorAll('[data-portfolio-identity]').length, 1);
  assert.equal(ui.document.head.querySelectorAll('#portfolio-clarity-style').length, 1);
  assert.equal([...ui.observers].filter(observer => observer.targets.length).length, 1);
});

test('fallback navigation to an unknown document clears the old root layout marker', async () => {
  const ui = environment({ router: false });
  ui.document.body.remove();
  ui.document.body = ui.element('body', {}, ui.element('main', {}, 'Unrelated archive'));
  ui.document.documentElement.append(ui.document.body);
  ui.event('portfolio:navigated');
  await ui.flush();
  assert.equal(ui.document.documentElement.hasAttribute('data-portfolio-clarity'), false);
  assert.equal(ui.document.body.hasAttribute('data-portfolio-clarity'), false);
  assert.equal([...ui.observers].filter(observer => observer.targets.length).length, 0);
});
