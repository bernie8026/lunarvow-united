'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { encryptArchive, prepareProtectedSite } = require('../prepare-protected-site.cjs');

const root = path.resolve(__dirname, '../..');
const origin = 'https://bernie8026.github.io';
const basePath = '/lunarvow-united/';
const cli = path.join(root, 'scripts/prepare-protected-site.cjs');

function loadWorker(relative) {
  const context = vm.createContext({
    URL, Response, Headers, TextDecoder, TextEncoder, ArrayBuffer,
    self: {
      registration: { scope: origin + basePath },
      addEventListener() {},
    },
    fetch: async () => new Response('<h1>Locked fixture</h1>', {
      headers: { 'Content-Type': 'text/html' },
    }),
  });
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
  return context;
}

for (const relative of ['protection/protected-worker.js', 'docs/protected-worker.js']) {
  test(`${relative}: UI enhancements are injected only into decrypted HTML after the session guard`, async () => {
    const worker = loadWorker(relative);
    const uiScript = `<script src="${basePath}assets/protected-ui.js?v=clarity-1" defer></script>`;
    const sessionScript = `<script src="${basePath}protected-session.js?v=foreground-1" defer></script>`;
    const locked = await worker.handle({ method: 'GET', mode: 'navigate' }, 'index.html');
    assert.equal(locked.headers.get('X-Portfolio-Locked'), '1');
    assert(!(await locked.text()).includes('protected-ui.js'), 'locked gates must not execute the UI enhancer');

    const entry = (path, type, text) => ({ path, type, data: new TextEncoder().encode(text).buffer });
    worker.fixtureFiles = [
      entry('index.html', 'text/html', '<!doctype html><html><head></head><body><main>Synthetic private home</main></body></html>'),
      entry('lunarvow/index.html', 'text/html', '<!doctype html><head></head><main>Synthetic nested page</main>'),
      entry('assets/example.css', 'text/css', '.synthetic-example{color:blue}'),
    ];
    vm.runInContext('files = receiveFiles(fixtureFiles)', worker);
    for (const path of ['index.html', 'lunarvow/index.html']) {
      const opened = await worker.handle({ method: 'GET' }, path);
      const html = await opened.text();
      assert.equal(opened.status, 200);
      assert.equal(opened.headers.get('Cache-Control'), 'no-store');
      assert.equal(html.split(uiScript).length - 1, 1, 'one versioned UI script per decrypted response');
      assert.equal(html.split(sessionScript).length - 1, 1);
      assert.equal(html.split('assets/protected-media.js?v=references-1').length - 1, 1, 'reference media loads only after unlock');
      assert(!html.includes('gate-video.js') && !html.includes('gate-background.js'), 'the gate video controller is never injected into private pages');
      assert(html.indexOf(sessionScript) < html.indexOf(uiScript), 'session guard executes before UI enhancements');
      assert(html.indexOf(uiScript) < html.indexOf('</head>'));
      const head = await worker.handle({ method: 'HEAD' }, path);
      assert.equal(await head.text(), '');
    }
    const css = await worker.handle({ method: 'GET' }, 'assets/example.css');
    assert.equal(await css.text(), '.synthetic-example{color:blue}', 'non-HTML private files are unchanged');
    const invitation = await worker.handle({ method: 'GET', mode: 'navigate' }, 'unlock.html');
    assert.equal(invitation.headers.get('X-Portfolio-Locked'), '1');
    assert(!(await invitation.text()).includes('protected-ui.js'), 'owner invitation gate stays separate');
  });

  test(`${relative}: public UI/video code and ciphertext cannot be shadowed by decrypted archive entries`, async () => {
    const worker = loadWorker(relative), requests = [];
    const publicBodies = {
      'assets/protected-ui.js': '/* Synthetic public UI code */',
      'assets/gate-video.js': '/* Synthetic public video controller */',
      'assets/gate-background.js': '/* Synthetic public background controller */',
      'assets/protected-media.js': '/* Synthetic reference media runtime */',
      'assets/reference-media.css': '/* Synthetic reference styles */',
      'assets/reference-photography.js': '/* Synthetic photo module */',
      'assets/reference-equipment.js': '/* Synthetic equipment module */',
      'assets/reference-stem.js': '/* Synthetic STEM module */',
      'assets/references/cosplay-sword-portrait.webp': 'synthetic-public-photo',
      'assets/references/drone-hover.mp4': 'synthetic-public-flight-video',
      'assets/anfield-anthem.mp4': 'synthetic-public-video',
      'assets/anfield-anthem.jpg': 'synthetic-public-poster',
      'protected-site.json': '{"ciphertext":"synthetic-public-ciphertext"}',
    };
    worker.fetch = async (request, options) => {
      const url = new URL(request.url || request.href || request);
      const name = url.pathname.slice(basePath.length);
      requests.push({ name, cache: options?.cache });
      assert(Object.hasOwn(publicBodies, name), 'only expected public fixture URLs may be requested');
      return new Response(publicBodies[name]);
    };
    const request = name => new Request(origin + basePath + name + '?v=clarity-1');
    for (const name of Object.keys(publicBodies)) {
      const response = await worker.handle(request(name), name);
      assert.equal(await response.text(), publicBodies[name], 'public bootstrap works while locked');
    }
    for (const name of ['assets/private-example.js', 'assets/gate-video-private.js', 'assets/gate-video.js.map', 'assets/private.mp4', 'assets/anfield-anthem-private.mp4', 'assets/anfield-anthem.mp4.map', 'assets/references/private.jpg', 'assets/reference-private.js']) {
      const privateAsset = await worker.handle(request(name), name);
      assert.equal(privateAsset.status, 401, 'public helpers do not expose neighbouring private assets');
      assert.equal(privateAsset.headers.get('X-Portfolio-Locked'), '1');
    }
    worker.fixtureFiles = ['index.html', ...Object.keys(publicBodies)].map(path => ({
      path, type: path.endsWith('.html') ? 'text/html' : 'text/plain',
      data: new TextEncoder().encode('PRIVATE ARCHIVE ENTRY MUST NOT SHADOW BOOTSTRAP').buffer,
    }));
    vm.runInContext('files = receiveFiles(fixtureFiles)', worker);
    for (const name of Object.keys(publicBodies)) {
      const response = await worker.handle(request(name), name);
      assert.equal(await response.text(), publicBodies[name], 'decrypted entries cannot replace public bootstrap files');
    }
    assert.equal(requests.length, Object.keys(publicBodies).length * 2);
    assert(requests.every(request => request.cache === 'no-store'));
  });

  test(`${relative}: directory links resolve and serve the nested index after unlock`, async () => {
    const worker = loadWorker(relative);
    for (const [route, expected] of [
      ['', 'index.html'],
      ['lunarvow/', 'lunarvow/index.html'],
      ['lunarvow/index.html', 'lunarvow/index.html'],
      ['projects.html', 'projects.html'],
    ]) {
      assert.equal(worker.pathFor(new URL(origin + basePath + route)), expected, route);
    }

    const locked = await worker.handle({ method: 'GET', mode: 'navigate' }, 'lunarvow/index.html');
    assert.equal(locked.headers.get('X-Portfolio-Locked'), '1');
    assert.match(await locked.text(), /Locked fixture/);

    worker.fixtureFiles = [
      { path: 'index.html', type: 'text/html', data: new TextEncoder().encode('<h1>Home fixture</h1>').buffer },
      { path: 'lunarvow/index.html', type: 'text/html', data: new TextEncoder().encode('<h1>Nested fixture</h1>').buffer },
    ];
    vm.runInContext('files = receiveFiles(fixtureFiles)', worker);
    const nestedPath = worker.pathFor(new URL(origin + basePath + 'lunarvow/'));
    const unlocked = await worker.handle({ method: 'GET' }, nestedPath);
    assert.equal(unlocked.status, 200);
    assert.match(await unlocked.text(), /Nested fixture/);
    const missing = await worker.handle({ method: 'GET' }, worker.pathFor(new URL(origin + basePath + 'missing/')));
    assert.equal(missing.status, 404);
  });

  test(`${relative}: invalid, traversal and out-of-scope paths stay rejected`, () => {
    const worker = loadWorker(relative);
    // Plain URL records retain suspicious segments that URL() would normalise
    // before a browser ever dispatches them to a worker.
    for (const relativePath of ['lunarvow//', '../', './', 'lunarvow/../', '%2e%2e%2f', '%252e%252e/', '%ZZ/', 'lunarvow/%5c/', 'lunarvow/%00/', 'lunarvow/%3f/']) {
      assert.equal(worker.pathFor({ origin, pathname: basePath + relativePath }), null, relativePath);
    }
    assert.equal(worker.pathFor({ origin: 'https://example.com', pathname: basePath }), null);
    assert.equal(worker.pathFor({ origin, pathname: '/lunarvow/' }), null);
    assert.equal(worker.pathFor({ origin, pathname: '/lunarvow-united-other/' }), null);
  });
}

test('published worker matches its template except for the encrypted publication revision', () => {
  const template = fs.readFileSync(path.join(root, 'protection/protected-worker.js'), 'utf8');
  const published = fs.readFileSync(path.join(root, 'docs/protected-worker.js'), 'utf8');
  assert.equal(published.replace(/\n\/\/ Publication: [a-f0-9]{64}\n$/, ''), template);
});

test('protected builds require and copy nested public runtimes without exposing source HTML', t => {
  // Publication stages are renamed atomically from .private; keep this
  // synthetic build on the same filesystem even when /tmp is another mount.
  const privateRoot = path.join(root, '.private');
  fs.mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  const folder = fs.mkdtempSync(path.join(privateRoot, 'ui-build-test-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const sourceRoot = path.join(folder, 'private-source'), protectionRoot = path.join(folder, 'public-runtime');
  const outputRoot = path.join(folder, 'output');
  fs.mkdirSync(sourceRoot); fs.mkdirSync(protectionRoot);
  const privateText = '<!doctype html><main>Synthetic private UI build fixture</main>';
  fs.writeFileSync(path.join(sourceRoot, 'index.html'), privateText);
  fs.writeFileSync(path.join(protectionRoot, 'index.html'), '<!doctype html><head><script src="__BASE_PATH__protected-unlock.js" defer></script></head><input type="password">');
  for (const name of ['protected-worker.js', 'protected-session.js', 'protected-unlock.js']) fs.writeFileSync(path.join(protectionRoot, name), '/* Synthetic runtime fixture */');
  const options = {
    sourceRoot, protectionRoot, outputRoot, basePath,
    accessConfig: { archiveId: 'synthetic-ui-build-fixture', archiveKeyB64: crypto.randomBytes(32).toString('base64'), authOrigin: 'https://synthetic-ui.workers.dev' },
  };
  assert.throws(() => prepareProtectedSite(options), /Protection runtime is incomplete/);
  assert.equal(fs.existsSync(outputRoot), false, 'missing runtime fails before public output is written');
  const uiCode = '/* Generic public UI fixture: no private content */';
  fs.mkdirSync(path.join(protectionRoot, 'assets'));
  fs.writeFileSync(path.join(protectionRoot, 'assets/protected-ui.js'), uiCode);
  assert.throws(() => prepareProtectedSite(options), /Protection runtime is incomplete/, 'a missing gate video controller must fail the build');
  const videoCode = '/* Public video controller fixture: no authentication */';
  fs.writeFileSync(path.join(protectionRoot, 'assets/gate-video.js'), videoCode);
  assert.throws(() => prepareProtectedSite(options), /Protection runtime is incomplete/, 'the background and public media must be present');
  fs.writeFileSync(path.join(protectionRoot, 'assets/gate-background.js'), videoCode);
  fs.writeFileSync(path.join(protectionRoot, 'assets/anfield-anthem.mp4'), 'synthetic-video');
  fs.writeFileSync(path.join(protectionRoot, 'assets/anfield-anthem.jpg'), 'synthetic-poster');
  assert.throws(() => prepareProtectedSite(options), /Protection runtime is incomplete/, 'reference chapter runtimes must also be present');
  for (const name of ['industrial.css','transition-loading.css','flight-lab.css','flight-engine.js','flight-lab.js','stem-plate.svg','protected-media.js','reference-media.css','reference-photography.js','reference-equipment.js','reference-stem.js']) fs.writeFileSync(path.join(protectionRoot, 'assets', name), '/* Synthetic reference runtime */');
  prepareProtectedSite(options);
  assert.equal(fs.readFileSync(path.join(outputRoot, 'assets/protected-ui.js'), 'utf8'), uiCode);
  assert.equal(fs.readFileSync(path.join(outputRoot, 'assets/gate-video.js'), 'utf8'), videoCode);
  assert.equal(fs.existsSync(path.join(outputRoot, 'protected-ui.js')), false, 'helper is published only under assets for router compatibility');
  const gate = fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf8');
  assert(gate.includes('type="password"'));
  assert(!gate.includes('protected-ui.js'), 'UI runtime is injected by the unlocked worker, not by the gate');
  const publicFiles = [];
  function collect(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) collect(file);
      else publicFiles.push(file);
    }
  }
  collect(outputRoot);
  for (const file of publicFiles) {
    const text = fs.readFileSync(file, 'utf8');
    assert(!text.includes(privateText), 'published output must not contain plaintext source HTML');
    assert(!text.includes(options.accessConfig.archiveKeyB64), 'public runtime must not contain the synthetic archive key');
  }
  fs.writeFileSync(path.join(protectionRoot, 'assets/unexpected-helper.html'), '<main>Must not become a public helper</main>');
  assert.throws(() => prepareProtectedSite(options), /Reserved protection runtime path: assets\/unexpected-helper\.html/);
  assert.equal(fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf8'), gate, 'a rejected helper preserves the prior publication');
});

function fixture(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lunarvow-recovery-test-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const archive = {
    version: 1,
    files: [
      { path: 'index.html', type: 'text/html; charset=utf-8', data: Buffer.from('<h1>Synthetic private fixture</h1>').toString('base64') },
      { path: 'assets/example.txt', type: 'text/plain', data: Buffer.from('Temporary recovery test only.').toString('base64') },
    ],
  };
  const config = {
    archiveId: 'synthetic-recovery-fixture-v2',
    archiveKeyB64: crypto.randomBytes(32).toString('base64'),
    authOrigin: 'https://synthetic-recovery.workers.dev',
  };
  const bundle = path.join(folder, 'bundle.json');
  const configPath = path.join(folder, 'access.json');
  const passwordPath = path.join(folder, 'missing-password.txt');
  fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
  return { folder, archive, config, bundle, configPath, passwordPath };
}

function recover(f, output, additional = []) {
  return spawnSync(process.execPath, [cli, '--decrypt', f.bundle, '--output', output, ...additional], {
    encoding: 'utf8',
    env: { ...process.env, PORTFOLIO_ACCESS_CONFIG: f.configPath, PORTFOLIO_PASSWORD_FILE: f.passwordPath },
  });
}

test('v2 CLI recovery uses its archive key when no legacy password file exists', t => {
  const f = fixture(t);
  fs.writeFileSync(f.bundle, JSON.stringify(encryptArchive(f.archive, f.config)));
  const output = path.join(f.folder, 'recovered');
  const result = recover(f, output);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).restored_files, 2);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), '<h1>Synthetic private fixture</h1>');
  assert.equal(fs.readFileSync(path.join(output, 'assets/example.txt'), 'utf8'), 'Temporary recovery test only.');
  assert.equal(fs.existsSync(f.passwordPath), false);
});

test('v2 CLI recovery rejects an incorrect archive key without creating plaintext output', t => {
  const f = fixture(t);
  fs.writeFileSync(f.bundle, JSON.stringify(encryptArchive(f.archive, f.config)));
  fs.writeFileSync(f.configPath, JSON.stringify({ ...f.config, archiveKeyB64: crypto.randomBytes(32).toString('base64') }));
  const output = path.join(f.folder, 'rejected');
  const result = recover(f, output);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(output), false);
});

test('legacy v1 CLI recovery still requires and accepts the correct password file', t => {
  const f = fixture(t);
  const password = 'synthetic-test-password';
  const salt = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(zlib.gzipSync(Buffer.from(JSON.stringify(f.archive)))), cipher.final(), cipher.getAuthTag()]);
  key.fill(0);
  fs.writeFileSync(f.bundle, JSON.stringify({ version: 1, kdf: 'PBKDF2-SHA-256', iterations: 600000, compression: 'gzip', salt: salt.toString('base64'), iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64') }));
  // Legacy recovery must not read the v2 configuration.
  fs.unlinkSync(f.configPath);
  const output = path.join(f.folder, 'legacy');
  const missing = recover(f, output);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Password file is missing/);
  assert.equal(fs.existsSync(output), false);

  const specifiedPasswordPath = path.join(f.folder, 'legacy-password.txt');
  fs.writeFileSync(specifiedPasswordPath, 'wrong-synthetic-password', { mode: 0o600 });
  const wrong = recover(f, output, ['--password-file', specifiedPasswordPath]);
  assert.notEqual(wrong.status, 0);
  assert.equal(fs.existsSync(output), false);

  fs.writeFileSync(specifiedPasswordPath, password, { mode: 0o600 });
  const restored = recover(f, output, ['--password-file', specifiedPasswordPath]);
  assert.equal(restored.status, 0, restored.stderr);
  assert.equal(JSON.parse(restored.stdout).restored_files, 2);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), '<h1>Synthetic private fixture</h1>');
});
