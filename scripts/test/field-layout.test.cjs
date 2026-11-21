'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const scope = new URL('https://example.test/lunarvow-united/');
const core = ['assets/field-layout.css', 'assets/field-layout.js'];
const assets = [...core, ...['home', 'media', 'chapters'].map(n => 'assets/field-' + n + '.css')];

test('the field layout loads from the protected site root on direct and nested routes without opening the archive', async () => {
  const worker = vm.createContext({
    ArrayBuffer, URL, TextDecoder, TextEncoder, Request, Response, Headers,
    self: { registration: { scope: scope.href }, addEventListener() {} },
    fetch: async req => {
      const relative = new URL(req.url || req.href).pathname.slice(scope.pathname.length);
      if (relative === 'index.html') return new Response('<main>Locked fixture</main>');
      assert(assets.includes(relative), 'no other file may reach the public origin: ' + relative);
      return new Response(fs.readFileSync(path.join(root, 'docs', relative)));
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'docs/protected-worker.js'), 'utf8'), worker);
  const request = file => worker.handle(new Request(new URL(file, scope)), file);
  for (const file of assets) {
    assert.deepEqual(Buffer.from(await (await request(file)).arrayBuffer()), fs.readFileSync(path.join(root, 'protection', file)));
  }
  assert.equal((await request('assets/field-private.js')).status, 401);
  const routes = ['index.html', 'stem.html', 'projects.html', 'lunarvow/guide.html'];
  worker.entries = routes.map(file => ({ path:file, type:'text/html', data:new TextEncoder().encode('<head><title>Fixture</title></head><body><main>Chapter</main></body>').buffer }));
  vm.runInContext('files = receiveFiles(entries)', worker);
  for (const file of routes) {
    const response = await request(file);
    assert.equal(response.status, 200);
    const head = (await response.text()).split('</head>')[0];
    for (const asset of assets) {
      const attr = asset.endsWith('.js') ? 'src' : 'href';
      const urls = [...head.matchAll(new RegExp('\\b' + attr + '="([^"]+)"', 'g'))].map(m => new URL(m[1], new URL(file, scope)).href.split('?')[0]);
      const expected = core.includes(asset) || asset === 'assets/field-' + (file === 'index.html' ? 'home' : file === 'stem.html' ? 'media' : 'chapters') + '.css';
      assert.equal(urls.filter(url => url === new URL(asset, scope).href).length, Number(expected), file + ' loads only its relevant layout');
    }
  }
});
