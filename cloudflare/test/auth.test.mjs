import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare, Log, LogLevel } from 'miniflare';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundled = (await build({entryPoints:[resolve(root,'test/harness.mjs')],bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],write:false})).outputFiles[0].text;
const origin = 'https://bernie8026.github.io';
const password = randomBytes(32).toString('base64url');
const adminToken = randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');
const bindings = {
  SITE_ORIGIN: origin,
  ARCHIVE_ID: 'c77a1599-531a-40f5-bf58-614d0aed2524',
  ARCHIVE_KEY_B64: randomBytes(32).toString('base64'),
  IP_HMAC_KEY_B64: randomBytes(32).toString('base64'),
  ADMIN_TOKEN_SHA256: hash(adminToken),
};
function instance(overrides = {}, persist) {
  return new Miniflare({
    name: 'lunarvow-auth-test',
    modules: true,
    script: bundled,
    // Pinned workerd's newest supported date; production uses 2026-11-01.
    compatibilityDate: '2026-07-30',
    durableObjects: { IP_GUARD: { className: 'TestGuard', useSQLite: true }, PASSKEYS:{className:'TestRegistry',useSQLite:true} },
    durableObjectsPersist: persist,
    bindings: { ...bindings, ...overrides },
    log: new Log(LogLevel.NONE),
  });
}
let mf;
before(async () => { mf = instance(); await mf.ready; });
after(async () => { await mf?.dispose(); });

async function call(path, { ip = '192.0.2.1', body, headers = {}, method, target = mf } = {}) {
  const response = await target.dispatchFetch(`https://auth.test${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { Origin: origin, 'CF-Connecting-IP': ip,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  const value = response.status === 204 ? null : await response.json();
  return { response, value };
}
const unlock = (ip, supplied = 'incorrect', extra = {}) => call('/v1/unlock', {
  ip, body: { password: supplied, archiveId: bindings.ARCHIVE_ID }, ...extra,
});
async function seedLegacyLock(ip, failures, cooldown = false, target = mf) {
  const url = new URL('https://auth.test/__test/state');
  url.searchParams.set('ip', ip);
  url.searchParams.set('failures', String(failures));
  if (cooldown) url.searchParams.set('cooldown', '1');
  assert.equal((await target.dispatchFetch(url.href)).status, 200);
}
function denied(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.value.code, code);
  assert.equal(result.value.ok, false);
  assert.ok(!('key' in result.value));
  assert.match(result.response.headers.get('cache-control'), /no-store/);
}

test('legacy password endpoint never releases a key, even if the old secret is still configured', async () => {
  const oldBinding = instance({ AUTH_PASSWORD_SHA256: hash(password) });
  try {
    await oldBinding.ready;
    for (const target of [mf, oldBinding]) {
      for (const candidate of [password, 'incorrect']) {
        const retired = await unlock('192.0.2.2', candidate, { target });
        denied(retired, 410, 'passkey_required');
        assert.equal(retired.response.headers.get('access-control-allow-origin'), origin);
      }
      const status = await call('/v1/status', { ip: '192.0.2.2', target });
      assert.deepEqual(status.value, { ok: true, archiveId: bindings.ARCHIVE_ID, code: 'ready', failures: 0 });
      assert.equal(status.response.status, 200);
    }
  } finally { await oldBinding.dispose(); }
});

test('legacy cooldown and permanent records retain their status and expire or unblock as intended', async () => {
  const ip = '192.0.2.10';
  await seedLegacyLock(ip, 3, true);
  const status = await call('/v1/status', { ip });
  denied(status, 429, 'cooldown');
  assert.equal(status.value.failures, 3);
  assert.ok(status.value.retryAfterSeconds >= 299 && status.value.retryAfterSeconds <= 300);
  assert.equal(status.response.headers.get('retry-after'), String(status.value.retryAfterSeconds));
  assert.match(status.response.headers.get('access-control-expose-headers'), /Date, Retry-After/);
  await seedLegacyLock(ip, 3);
  assert.equal((await call('/v1/status', { ip })).value.code, 'ready');
  await seedLegacyLock(ip, 10);
  denied(await call('/v1/status', { ip }), 403, 'permanent_lock');
  assert.equal((await call('/v1/status', { ip: '192.0.2.11' })).value.failures, 0);
});

test('IP identity is normalized, ignores browser IP overrides, and rejects missing or invalid platform IP', async () => {
  await seedLegacyLock('2001:0DB8:0000:0000:0000:0000:0000:0001', 1);
  let status = await call('/v1/status', { ip: '2001:db8::1' });
  assert.equal(status.value.failures, 1);
  await seedLegacyLock('::ffff:192.0.2.30', 1);
  status = await call('/v1/status', { ip: '192.0.2.30' });
  assert.equal(status.value.failures, 1);
  status = await call('/v1/status', { ip: '192.0.2.30', headers: {
    'X-Forwarded-For': '192.0.2.32', 'X-Real-IP': '192.0.2.32',
  } });
  assert.equal(status.value.failures, 1);
  denied(await call('/v1/status', { ip: 'invalid-ip' }), 400, 'invalid_ip');
  denied(await call('/v1/status', { ip: '192.0.2.1, 192.0.2.2' }), 400, 'invalid_ip');
  // Miniflare injects a platform header, so the local harness explicitly removes it.
  const missing = await mf.dispatchFetch('https://auth.test/__test/no-ip', { headers: { Origin: origin } });
  assert.equal(missing.status, 503);
});

test('stale archive, malformed and oversized passkey requests fail without a key', async () => {
  const path = '/v1/passkeys/auth/options', ip = '192.0.2.40';
  denied(await call(path, { ip, body: { archiveId: 'stale-archive-generation' } }), 409, 'archive_mismatch');
  denied(await call(path, { ip, body: '{' }), 400, 'invalid_request');
  denied(await call(path, { ip, body: { archiveId: bindings.ARCHIVE_ID, other: 'x'.repeat(17000) } }), 413, 'body_too_large');
  denied(await call(path, { ip, body: 'bad', headers: { 'Content-Type': 'text/plain' } }), 415, 'json_required');
  assert.equal((await call('/v1/status', { ip })).value.failures, 0);
});

test('only exact configured browser origins get CORS access and the retired route has no preflight', async () => {
  const path = '/v1/passkeys/auth/options';
  denied(await call(path, { headers: { Origin: 'https://evil.test' }, body: {} }), 403, 'origin_not_allowed');
  denied(await call(path, { headers: { Origin: 'https://bernie8026.github.io.evil.test' }, body: {} }), 403, 'origin_not_allowed');
  const preflight = await call(path, { method: 'OPTIONS' });
  assert.equal(preflight.response.status, 204);
  assert.equal(preflight.response.headers.get('access-control-allow-origin'), origin);
  assert.equal(preflight.response.headers.get('access-control-allow-credentials'), null);
  denied(await call('/v1/unlock', { method: 'OPTIONS' }), 403, 'origin_not_allowed');
  const noOrigin = await mf.dispatchFetch('https://auth.test/v1/status');
  assert.equal(noOrigin.status, 403);
});

test('manual recovery requires independent admin token and can reset persisted legacy locks', async () => {
  const ip = '192.0.2.60';
  await seedLegacyLock(ip, 10);
  denied(await call('/v1/admin/unblock', { ip, body: { ip: 'self' } }), 401, 'unauthorized');
  denied(await call('/v1/admin/unblock', { ip, body: { ip: 'self' }, headers: { Authorization: `Bearer ${password}` } }), 401, 'unauthorized');
  denied(await call('/v1/status', { ip }), 403, 'permanent_lock');
  const clear = await call('/v1/admin/unblock', { ip, body: { ip: 'self' }, headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(clear.response.status, 200);
  assert.equal(clear.value.failures, 0);
  assert.ok(!('key' in clear.value));
  assert.equal((await call('/v1/status', { ip })).value.code, 'ready');
  await seedLegacyLock('2001:db8::60', 3, true);
  const targetClear = await call('/v1/admin/unblock', { ip, body: { ip: '2001:0db8:0:0:0:0:0:60' }, headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(targetClear.response.status, 200);
  assert.equal((await call('/v1/status', { ip: '2001:db8::60' })).value.failures, 0);
});

test('legacy lock records survive actual workerd disposal and restart with SQLite persistence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lunarvow-auth-test-'));
  let persistent;
  try {
    persistent = instance({}, directory);
    await persistent.ready;
    await seedLegacyLock('192.0.2.70', 3, true, persistent);
    await persistent.dispose();
    persistent = instance({}, directory);
    await persistent.ready;
    const status = await call('/v1/status', { ip: '192.0.2.70', target: persistent });
    denied(status, 429, 'cooldown');
    assert.equal(status.value.failures, 3);
  } finally {
    await persistent?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('missing or malformed essential secret fails closed without a key', async () => {
  const broken = instance({ ARCHIVE_KEY_B64: '' });
  try {
    await broken.ready;
    denied(await call('/v1/status', { target: broken }), 503, 'service_unavailable');
  } finally { await broken.dispose(); }
});
