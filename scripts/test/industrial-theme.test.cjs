'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const base = new URL('https://example.org/lunarvow-united/');
const stylesheet = 'assets/industrial.css';
const styleURL = new URL(stylesheet, base);

// Resolve the artwork the same way a browser resolves a stylesheet-relative URL.
function assets() {
  const css = read('protection/' + stylesheet);
  const paths = new Set([stylesheet]);
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]+?)\1\s*\)/gi)) {
    if (!/\.svg(?:[?#]|$)/i.test(match[2])) continue;
    const url = new URL(match[2], styleURL);
    assert.equal(url.origin, base.origin, 'industrial artwork is self hosted');
    assert(url.pathname.startsWith(base.pathname + 'assets/'), url.pathname);
    paths.add(url.pathname.slice(base.pathname.length));
  }
  assert(paths.size > 1, 'site stylesheet references its industrial artwork');
  return [...paths];
}

test('deployed industrial stylesheet, artwork and every locked shell match their build sources', () => {
  for (const file of assets()) {
    assert.ok(fs.readFileSync(path.join(root, 'docs', file)).equals(fs.readFileSync(path.join(root, 'protection', file))), file);
  }
  const gate = read('protection/index.html');
  assert.match(gate, /<style id="industrial-gate">/);
  const { auth_origin } = JSON.parse(read('cloudflare/deployment.json'));
  const expected = gate.replaceAll('__BASE_PATH__', base.pathname).replaceAll('__AUTH_ORIGIN__', auth_origin);
  function checkShells(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) checkShells(file);
      else if (entry.name.endsWith('.html')) assert.ok(read(file) === expected, file + ' must match the built gate');
    }
  }
  for (const route of ['stem.html', 'unlock.html', 'lunarvow/index.html']) assert.ok(fs.existsSync(path.join(root, 'docs', route)), route);
  checkShells('docs');
});

test('STEM and nested pages receive one shared stylesheet after unlock; theme assets do not expose nearby private files', async () => {
  const publicPaths = assets();
  const loaded = [];
  const worker = vm.createContext({
    URL, Response, Headers, TextDecoder, TextEncoder, ArrayBuffer,
    self: { registration: { scope: base.href }, addEventListener() {} },
    fetch: async request => {
      const file = new URL(request.url || request.href).pathname.slice(base.pathname.length);
      loaded.push(file);
      if (file === 'index.html') return new Response('<p>Locked fixture</p>');
      assert.ok(publicPaths.includes(file), 'unexpected public fetch: ' + file);
      return new Response('public theme asset');
    },
  });
  vm.runInContext(read('docs/protected-worker.js'), worker);
  async function responseFor(file) {
    const url = new URL(file, base);
    return worker.handle(new Request(url), worker.pathFor(url));
  }
  const routes = ['index.html', 'stem.html?lang=zh-HK', 'lunarvow/guide.html'];
  for (const route of routes) {
    const locked = await worker.handle({ method: 'GET', mode: 'navigate' }, worker.pathFor(new URL(route, base)));
    assert.equal(locked.headers.get('X-Portfolio-Locked'), '1');
    assert.match(await locked.text(), /Locked fixture/);
  }
  for (const file of publicPaths) assert.equal(await (await responseFor(file)).text(), 'public theme asset');
  const privateAsset = await responseFor('assets/industrial-private.svg');
  assert.equal(privateAsset.status, 401);
  assert.equal(privateAsset.headers.get('X-Portfolio-Locked'), '1');
  assert(!loaded.includes('assets/industrial-private.svg'));

  worker.fixtureFiles = routes.map(route => ({
    path: worker.pathFor(new URL(route, base)), type: 'text/html',
    data: new TextEncoder().encode('<html><head><title>Fixture</title></head><body><main>Test content</main></body></html>').buffer,
  }));
  vm.runInContext('files = receiveFiles(fixtureFiles)', worker);
  for (const route of routes) {
    const page = await responseFor(route);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('Cache-Control'), 'no-store');
    const html = await page.text();
    assert.match(html, /<main>Test content<\/main>/);
    const links = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '').match(/<link\b[^>]*>/gi) || [];
    const industrial = links.filter(tag => {
      if (!/\brel\s*=\s*["']stylesheet["']/i.test(tag)) return false;
      const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (!href) return false;
      const url = new URL(href, new URL(route, base));
      return url.origin === base.origin && url.pathname === styleURL.pathname;
    });
    assert.equal(industrial.length, 1, route + ' resolves its stylesheet under the project root');
  }
});
