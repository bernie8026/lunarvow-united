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
const { encryptArchive } = require('../prepare-protected-site.cjs');

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
