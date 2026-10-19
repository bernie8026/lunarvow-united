/* Dependency-free lifecycle checks; browser navigation is also verified live. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Node extends EventTarget {
  constructor() { super(); this.dataset = {}; this.children = []; this.style = {}; this.classList = {toggle(){}}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
}
const document = new Node();
document.body = new Node(); document.body.dataset.page = 'about';
document.head = new Node(); document.documentElement = new Node();
document.currentScript = {src:'https://example.test/portfolio/assets/navigation.js'};
document.createElement = () => new Node();
const window = new Node();
Object.assign(window, {setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame:fn => setTimeout(() => fn(Date.now()), 10), cancelAnimationFrame:clearTimeout});
const observers = [];
for (const name of ['ResizeObserver','MutationObserver','IntersectionObserver']) {
  window[name] = class { constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); } disconnect() { this.disconnected = true; } };
}
const history = {state:null, replaceState(value) { this.state = value; }};
const context = vm.createContext({window, document, history, location:{href:'https://example.test/portfolio/about.html?lang=en',protocol:'https:'},
  URL, Event, Element:Node, EventTarget, console, scrollX:0, scrollY:0, matchMedia:() => ({matches:false}), queueMicrotask});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/assets/navigation.js'),'utf8'), context);
(async () => {
  let scope, calls = 0, delayed = 0;
  const target = new EventTarget();
  window.PORTFOLIO_PAGES.register('fixture', 'https://example.test/portfolio/assets/fixture.js', value => { scope = value; });
  const listener = () => calls++;
  scope.on(target, 'change', listener);
  target.dispatchEvent(new Event('change'));
  assert.equal(calls, 1);
  // The real callback identity must survive for modules that remove listeners themselves.
  target.removeEventListener('change', listener);
  target.dispatchEvent(new Event('change'));
  assert.equal(calls, 1);
  scope.on(target, 'change', listener);
  scope.requestAnimationFrame(() => delayed++);
  scope.setTimeout(() => delayed++, 15);
  scope.setInterval(() => delayed++, 15);
  new scope.MutationObserver(() => delayed++);
  new scope.ResizeObserver(() => delayed++);
  new scope.IntersectionObserver(() => delayed++);
  scope.memory.saved = 'contact draft';
  scope.dispose(); scope.dispose();
  target.dispatchEvent(new Event('change'));
  observers.forEach(observer => observer.callback([]));
  scope.requestAnimationFrame(() => delayed++);
  scope.setTimeout(() => delayed++, 0);
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(calls, 1, 'old page listeners are removed');
  assert.equal(delayed, 0, 'old page timers, frames and observer callbacks are inactive');
  assert.ok(observers.every(observer => observer.disconnected));
  let next;
  window.PORTFOLIO_PAGES.register('fixture', 'https://example.test/portfolio/assets/fixture.js', value => { next = value; });
  assert.equal(next.memory.saved, 'contact draft', 'same-page memory survives a remount');
  document.body.dataset.page = 'contact';
  window.PORTFOLIO_PAGES.register('fixture', 'https://example.test/portfolio/assets/fixture.js', value => { next = value; });
  assert.equal(next.memory.saved, undefined, 'memory does not leak across pages');
  console.log('Navigation lifecycle checks passed: listeners, timers, observers and page memory.');
})().catch(error => {console.error(error);process.exitCode = 1;});
