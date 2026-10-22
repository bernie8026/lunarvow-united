/* Offline regression checks for complete per-page loading and cancellation. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const code = fs.readFileSync(path.join(publicRoot, 'assets/preloader.js'), 'utf8');
const base = 'https://example.test/lunarvow-united/';
const pages = ['index', 'about', 'experience', 'education', 'skills', 'projects', 'contact', 'sitemap'];
const copy = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate, label) {
  for (let index = 0; index < 50; index++) {
    if (predicate()) return;
    await tick();
  }
  throw new Error(`Timed out waiting for ${label}`);
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1].toLowerCase(), match[3]]));
}
function verifyManifest() {
  const manifestPath = path.join(publicRoot, 'assets/preload-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, 3, 'Run scripts/prepare-site.cjs before this test');
  assert.deepEqual(manifest.resources, [{url:'assets/identity.webp?v=cyber-blue-1',type:'image'}], 'Existing open tabs can replay with the shared intro artwork');
  assert.deepEqual(Object.keys(manifest.pages).sort(), [...pages].sort());
  const motion = fs.readFileSync(path.join(publicRoot, 'assets/motion.js'), 'utf8');
  const introImage = motion.match(/new URL\("([^"]*identity\.webp[^"]*)",root\)/)?.[1];
  assert.ok(introImage, 'Intro artwork URL is defined');
  const showcase = fs.readFileSync(path.join(publicRoot, 'assets/showcase.js'), 'utf8');
  const showcaseImages = [...showcase.matchAll(/\bimage\s*:\s*["']([^"']+)["']/g)].map(match => 'assets/' + match[1]);
  assert.ok(showcaseImages.length >= 3, 'Runtime showcase imagery is discoverable');
  for (const page of pages) {
    const html = fs.readFileSync(path.join(publicRoot, `${page}.html`), 'utf8');
    assert.equal(attributes(html.match(/<body\b[^>]*>/i)[0])['data-page'], page);
    const expected = new Map([[introImage, 'image']]);
    const pageImages = new Set();
    for (const tag of html.match(/<(?:script|link|img)\b[^>]*>/gi) || []) {
      const attrs = attributes(tag);
      let url;
      let type;
      if (/^<script\b/i.test(tag)) { url = attrs.src; type = 'file'; }
      if (/^<link\b/i.test(tag) && ['stylesheet', 'icon'].includes(attrs.rel)) { url = attrs.href; type = 'file'; }
      if (/^<img\b/i.test(tag)) {
        url = attrs.src; type = 'image';
        if (url) pageImages.add(url.split('?')[0]);
      }
      if (url?.startsWith('assets/')) expected.set(url, type);
    }
    if (/\bdata-project-showcase\b/.test(html)) for (const image of showcaseImages) expected.set(image, 'image');
    const actual = manifest.pages[page];
    assert.ok(Array.isArray(actual) && actual.length, `${page}: resources exist`);
    assert.equal(new Set(actual.map(resource => resource.url)).size, actual.length, `${page}: no duplicates`);
    assert.deepEqual(actual.map(resource => [resource.url, resource.type]).sort(), [...expected].sort(), `${page}: includes authored resources, lazy imagery and runtime showcase imagery with matching cache versions`);
    for (const image of pageImages) assert.ok(actual.some(resource => resource.type === 'image' && resource.url.split('?')[0] === image), `${page}: includes ${image} before reveal`);
    for (const resource of actual) {
      const url = new URL(resource.url, base);
      const filename = resource.url.split('?')[0];
      assert.equal(url.origin, new URL(base).origin);
      assert.ok(url.pathname.startsWith(new URL(base).pathname));
      assert.ok(fs.existsSync(path.join(publicRoot, filename)), `${page}: ${filename} exists`);
      assert.ok(!filename.endsWith('.html') && !filename.includes('social-preview'), `${page}: no unrelated HTML or share artwork`);
      assert.ok(resource.type === 'image' || /\.(?:css|js|svg)$/.test(filename), `${page}: only scripts/styles, page imagery and favicon`);
    }
  }
  const {readPasswordFile, decryptArchive} = require('./prepare-protected-site.cjs');
  const password = readPasswordFile();
  try {
    const envelope = JSON.parse(fs.readFileSync(path.join(root, 'docs/protected-site.json'), 'utf8'));
    const archive = decryptArchive(envelope, password);
    const published = archive.files.find(file => file.path === 'assets/preload-manifest.json');
    assert.ok(published, 'Encrypted publication contains the preload manifest');
    assert.deepEqual(JSON.parse(Buffer.from(published.data, 'base64').toString('utf8')), manifest, 'Encrypted published manifest matches public');
  } finally { password.fill(0); }
  return pages.length;
}
function harness(options = {}) {
  const state = { fetches: [], bodies: [], images: [], decodes: [], reports: [], clearedImages: 0 };
  const counts = { fetch: new Map(), image: new Map(), decode: new Map() };
  const timers = new Set();
  const bodies = new Map();
  const decodes = new Map();
  const keyFor = url => new URL(url).pathname.replace('/lunarvow-united/', '');
  const count = (map, key) => { const n = (map.get(key) || 0) + 1; map.set(key, n); return n; };
  const deferred = (map, key, signal) => new Promise((resolve, reject) => {
    const abort = () => { map.delete(key); reject(new Error('Aborted')); };
    const finish = () => { signal?.removeEventListener('abort', abort); map.delete(key); resolve(new ArrayBuffer(0)); };
    map.set(key, finish);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
  const manifest = options.manifest || { version: 3, pages: { education: [{ url: 'assets/page.js', type: 'file' }, { url: 'assets/eager.png', type: 'image' }], index: [{ url: 'assets/index-only.js', type: 'file' }] } };
  async function fetch(url, init = {}) {
    const key = keyFor(url);
    state.fetches.push(key);
    const attempt = count(counts.fetch, key);
    if (key === 'assets/preload-manifest.json') {
      return { ok: true, json: async () => manifest };
    }
    const bad = options.failFileOnce?.includes(key) && attempt === 1;
    return {
      ok: !bad, status: bad ? 503 : 200,
      arrayBuffer: () => {
        state.bodies.push(key);
        return options.holdBodies?.includes(key) ? deferred(bodies, key, init.signal) : Promise.resolve(new ArrayBuffer(4));
      }
    };
  }
  class FakeImage {
    set src(value) {
      this._src = value;
      if (!value) { state.clearedImages++; return; }
      const key = keyFor(value);
      this.key = key;
      state.images.push(key);
      const attempt = count(counts.image, key);
      if (options.holdImages?.includes(key)) return;
      queueMicrotask(() => {
        if (this._src !== value) return;
        if (options.failImageOnce?.includes(key) && attempt === 1) this.onerror?.();
        else this.onload?.();
      });
    }
    get src() { return this._src; }
    decode() {
      const key = this.key;
      state.decodes.push(key);
      const attempt = count(counts.decode, key);
      if (options.failDecodeOnce?.includes(key) && attempt === 1) return Promise.reject(new Error('Cannot decode'));
      return options.holdDecodes?.includes(key) ? deferred(decodes, key) : Promise.resolve();
    }
  }
  const context = vm.createContext({
    URL, AbortController, Image: FakeImage, fetch,
    document: { currentScript: { src: `${base}assets/preloader.js?v=test` }, baseURI: base + (options.page || 'education') + '.html', images: options.domImages, body: { dataset: options.noPage ? {} : { page: options.page || 'education' } } },
    window: {},
    setTimeout(callback, duration) { const timer = setTimeout(callback, duration); timers.add(timer); return timer; },
    clearTimeout(timer) { timers.delete(timer); clearTimeout(timer); }
  });
  vm.runInContext(code, context, { filename: 'public/assets/preloader.js' });
  const task = context.window.BHR_PRELOADER.create(report => state.reports.push(copy(report)));
  return {
    task, state, counts, bodies, decodes,
    dispose() { task.cancel(); for (const timer of timers) clearTimeout(timer); timers.clear(); }
  };
}
async function withHarness(options, test) {
  const env = harness(options);
  try { await test(env); }
  finally { env.dispose(); }
}
async function verifyRuntime() {
  let cases = 0;
  await withHarness({}, async env => {
    assert.equal(await env.task.run(), true);
    assert.deepEqual(env.state.fetches.sort(), ['assets/page.js', 'assets/preload-manifest.json']);
    assert.deepEqual(env.state.bodies, ['assets/page.js'], 'Reads complete file bodies');
    assert.deepEqual(env.state.images, ['assets/eager.png']);
    assert.deepEqual(env.state.decodes, ['assets/eager.png'], 'Decodes selected image');
    assert.deepEqual(env.state.reports.at(-1), { total: 2, loaded: 2, failed: [], errors: [], running: false });
    cases++;
  });
  await withHarness({ noPage: true }, async env => {
    assert.equal(await env.task.run(), true);
    assert.ok(env.state.fetches.includes('assets/index-only.js'), 'Missing page ID defaults to home');
    assert.equal(env.state.images.length, 0);
    cases++;
  });
  const domImages = [
    `${base}assets/eager.png`, `${base}assets/runtime.png`,
    'https://other.test/remote.png', 'https://example.test/outside.png',
    'data:image/png;base64,AA=='
  ].map(src => ({ src, currentSrc: src, loading: 'lazy', getAttribute(name) { return name === 'src' ? src : null; } }));
  await withHarness({ domImages, holdDecodes: ['assets/runtime.png'] }, async env => {
    let settled = false;
    const pending = env.task.run().then(result => { settled = true; return result; });
    await until(() => env.decodes.has('assets/runtime.png'), 'runtime page image decode');
    assert.equal(settled, false, 'Runtime-injected image decoding blocks readiness');
    assert.equal(domImages[0].loading, 'eager', 'An authored lazy image is promoted for complete-page loading');
    assert.equal(domImages[1].loading, 'eager', 'A runtime lazy image is promoted for complete-page loading');
    assert.deepEqual([...env.state.images].sort(), ['assets/eager.png', 'assets/runtime.png'], 'Resolved DOM URLs deduplicate against the manifest and exclude outside resources');
    assert.equal(env.counts.image.get('assets/eager.png'), 1, 'The same relative manifest and absolute DOM URL load once');
    env.decodes.get('assets/runtime.png')();
    assert.equal(await pending, true);
    assert.deepEqual(env.state.reports.at(-1), { total: 3, loaded: 3, failed: [], errors: [], running: false });
    cases++;
  });
  await withHarness({ holdBodies: ['assets/page.js'], holdDecodes: ['assets/eager.png'] }, async env => {
    let settled = false;
    const pending = env.task.run().then(result => { settled = true; return result; });
    await until(() => env.bodies.size === 1 && env.decodes.size === 1, 'body and image decode barriers');
    assert.equal(settled, false, 'Headers and image load alone do not finish preload');
    assert.equal(env.state.reports.at(-1).loaded, 0);
    env.bodies.get('assets/page.js')();
    await until(() => env.state.reports.at(-1).loaded === 1, 'body completion');
    assert.equal(settled, false, 'Still waits for decoded image');
    env.decodes.get('assets/eager.png')();
    assert.equal(await pending, true);
    cases++;
  });
  const retryManifest = { version: 3, pages: { education: [
    { url: 'assets/keep.js', type: 'file' }, { url: 'assets/retry.js', type: 'file' },
    { url: 'assets/keep.png', type: 'image' }, { url: 'assets/retry.png', type: 'image' }
  ] } };
  await withHarness({ manifest: retryManifest, failFileOnce: ['assets/retry.js'], failDecodeOnce: ['assets/retry.png'] }, async env => {
    assert.equal(await env.task.run(), false);
    const failed = env.state.reports.at(-1);
    assert.equal(failed.loaded, 2);
    assert.deepEqual([...failed.failed].sort(), ['assets/retry.js', 'assets/retry.png']);
    assert.deepEqual(failed.errors.find(error => error.url.endsWith('.js')), { url: 'assets/retry.js', code: 'http', status: 503 });
    assert.equal(failed.errors.find(error => error.url.endsWith('.png')).code, 'image');
    assert.equal(await env.task.run(), true);
    assert.equal(env.counts.fetch.get('assets/preload-manifest.json'), 1, 'Retry reuses validated manifest');
    assert.equal(env.counts.fetch.get('assets/keep.js'), 1, 'Retry preserves completed file');
    assert.equal(env.counts.fetch.get('assets/retry.js'), 2);
    assert.equal(env.counts.image.get('assets/keep.png'), 1, 'Retry preserves decoded image');
    assert.equal(env.counts.image.get('assets/retry.png'), 2);
    assert.deepEqual(env.state.reports.at(-1), { total: 4, loaded: 4, failed: [], errors: [], running: false });
    cases++;
  });
  await withHarness({ failImageOnce: ['assets/eager.png'] }, async env => {
    assert.equal(await env.task.run(), false, 'Image load errors fail the run');
    assert.equal(env.state.reports.at(-1).errors[0].code, 'image');
    assert.equal(await env.task.run(), true);
    assert.equal(env.counts.fetch.get('assets/page.js'), 1);
    cases++;
  });
  const waitingFiles = Array.from({ length: 8 }, (_, index) => ({ url: `assets/wait-${index}.js`, type: 'file' }));
  await withHarness({ manifest: { version: 3, pages: { education: waitingFiles } }, holdBodies: waitingFiles.map(resource => resource.url) }, async env => {
    const pending = env.task.run();
    await until(() => env.bodies.size === 6, 'six active workers');
    assert.equal(await env.task.run(), false, 'Concurrent run is ignored');
    const reportCount = env.state.reports.length;
    env.task.cancel();
    assert.equal(await pending, false);
    await tick();
    assert.equal(env.state.reports.length, reportCount, 'Cancellation emits no subsequent progress');
    assert.equal(env.state.bodies.length, 6, 'Cancellation does not start queued resources');
    assert.equal(env.bodies.size, 0, 'Cancellation aborts active bodies');
    assert.equal(await env.task.run(), false, 'Canceled tasks remain stopped');
    cases++;
  });
  await withHarness({ manifest: { version: 3, pages: { education: [{ url: 'assets/wait.png', type: 'image' }] } }, holdImages: ['assets/wait.png'] }, async env => {
    const pending = env.task.run();
    await until(() => env.state.images.length === 1, 'active image');
    const reportCount = env.state.reports.length;
    env.task.cancel();
    assert.equal(await pending, false);
    assert.equal(env.state.clearedImages, 1, 'Cancellation clears pending image source');
    assert.equal(env.state.reports.length, reportCount);
    cases++;
  });
  const invalid = [
    {}, { resources: [{ url: 'assets/old.js', type: 'file' }] },
    { version: 3, pages: { education: [] } },
    { version: 3, pages: { education: [null] } },
    { version: 3, pages: { education: [{ url: 'assets/a.js', type: 'script' }] } },
    { version: 3, pages: { education: [{ url: 'https://other.test/a.js', type: 'file' }] } },
    { version: 3, pages: { education: [{ url: '../outside.js', type: 'file' }] } }
  ];
  for (const manifest of invalid) await withHarness({ manifest }, async env => {
    assert.equal(await env.task.run(), false, 'Malformed manifest is rejected');
    const report = env.state.reports.at(-1);
    assert.equal(report.running, false);
    assert.equal(report.loaded, 0);
    assert.deepEqual(report.failed, ['assets/preload-manifest.json']);
    assert.equal(report.errors[0].code, 'manifest');
    assert.equal(env.state.fetches.length, 1, 'Invalid manifest starts no resource requests');
    cases++;
  });
  return cases;
}
(async () => {
  const manifestPages = verifyManifest();
  const runtimeCases = await verifyRuntime();
  console.log(JSON.stringify({ result: 'passed', manifestPages, runtimeCases, networkRequests: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; });
