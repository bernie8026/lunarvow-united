import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare, Log, LogLevel } from 'miniflare';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://bernie8026.github.io';
const password = randomBytes(32).toString('base64url');
const adminToken = randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');
const bindings = {
  SITE_ORIGIN: origin,
  ARCHIVE_ID: 'c77a1599-531a-40f5-bf58-614d0aed2524',
  ARCHIVE_KEY_B64: randomBytes(32).toString('base64'),
  IP_HMAC_KEY_B64: randomBytes(32).toString('base64'),
  AUTH_PASSWORD_SHA256: hash(password),
  ADMIN_TOKEN_SHA256: hash(adminToken),
};
function instance(overrides = {}, persist) {
  return new Miniflare({
    name: 'lunarvow-auth-test',
    modules: true,
    scriptPath: resolve(root, 'test/harness.mjs'),
    // Pinned workerd's newest supported date; production uses 2026-11-01.
    compatibilityDate: '2026-07-30',
    durableObjects: { IP_GUARD: { className: 'TestGuard', useSQLite: true } },
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
async function expire(ip, target = mf) {
  await target.dispatchFetch(`https://auth.test/__test/state?expire=1&ip=${encodeURIComponent(ip)}`);
}
function denied(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.value.code, code);
  assert.equal(result.value.ok, false);
  assert.ok(!('key' in result.value));
  assert.match(result.response.headers.get('cache-control'), /no-store/);
}

test('correct password releases only the configured generation key; wrong password never does', async () => {
  const good = await unlock('192.0.2.2', password);
  assert.equal(good.response.status, 200);
  assert.deepEqual(good.value, { ok: true, archiveId: bindings.ARCHIVE_ID, key: bindings.ARCHIVE_KEY_B64, failures: 0 });
  assert.equal(good.response.headers.get('access-control-allow-origin'), origin);
  assert.match(good.response.headers.get('cache-control'), /no-store/);
  denied(await unlock('192.0.2.3'), 401, 'invalid_password');
});

test('third failure locks five minutes; blocked attempts and success do not reset lifetime count; tenth is permanent', async () => {
  const ip = '192.0.2.10';
  for (let failure = 1; failure <= 10; failure++) {
    const result = await unlock(ip);
    assert.equal(result.value.failures, failure);
    if (failure === 10) { denied(result, 403, 'permanent_lock'); break; }
    if (failure % 3 === 0) {
      denied(result, 429, 'cooldown');
      assert.ok(result.value.retryAfterSeconds >= 299 && result.value.retryAfterSeconds <= 300);
      assert.equal(result.response.headers.get('retry-after'), String(result.value.retryAfterSeconds));
      assert.match(result.response.headers.get('access-control-expose-headers'), /Date, Retry-After/);
      assert.ok(Number.isFinite(Date.parse(result.response.headers.get('date'))));
      assert.ok(result.value.lockedUntil > Date.now() + 298000);
      for (const candidate of [password, 'incorrect']) {
        const blocked = await unlock(ip, candidate);
        denied(blocked, 429, 'cooldown');
        assert.equal(blocked.value.failures, failure);
      }
      await expire(ip);
      const success = await unlock(ip, password);
      assert.equal(success.response.status, 200);
      assert.equal(success.value.failures, failure);
    } else denied(result, 401, 'invalid_password');
  }
  await expire(ip);
  for (const candidate of [password, 'incorrect']) {
    const permanent = await unlock(ip, candidate);
    denied(permanent, 403, 'permanent_lock');
    assert.equal(permanent.value.failures, 10);
  }
  const recovery = await call('/v1/admin/unblock', { ip: '192.0.2.12', body: { ip },
    headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(recovery.response.status, 200);
  assert.equal((await unlock(ip, password)).value.failures, 0);
  const independent = await unlock('192.0.2.11', password);
  assert.equal(independent.response.status, 200);
  assert.equal(independent.value.failures, 0);
});

test('forty concurrent failures are serialized: exactly three counted before cooldown', async () => {
  const results = await Promise.all(Array.from({ length: 40 }, () => unlock('192.0.2.20')));
  assert.equal(results.filter(item => item.response.status === 401).length, 2);
  assert.equal(results.filter(item => item.response.status === 429).length, 38);
  assert.ok(results.every(item => item.value.failures <= 3 && !('key' in item.value)));
  const status = await call('/v1/status', { ip: '192.0.2.20' });
  denied(status, 429, 'cooldown');
  assert.equal(status.value.failures, 3);
  denied(await unlock('192.0.2.20', password), 429, 'cooldown');
});

test('IP identity is normalized, ignores browser IP overrides, and rejects missing or invalid platform IP', async () => {
  await unlock('2001:0DB8:0000:0000:0000:0000:0000:0001');
  let status = await call('/v1/status', { ip: '2001:db8::1' });
  assert.equal(status.value.failures, 1);
  await unlock('::ffff:192.0.2.30');
  status = await call('/v1/status', { ip: '192.0.2.30' });
  assert.equal(status.value.failures, 1);
  await unlock('192.0.2.31', 'incorrect', { headers: { 'X-Forwarded-For': '192.0.2.32', 'X-Real-IP': '192.0.2.32' } });
  assert.equal((await call('/v1/status', { ip: '192.0.2.31' })).value.failures, 1);
  assert.equal((await call('/v1/status', { ip: '192.0.2.32' })).value.failures, 0);
  denied(await unlock('invalid-ip', password), 400, 'invalid_ip');
  denied(await unlock('192.0.2.1, 192.0.2.2', password), 400, 'invalid_ip');
  // Miniflare injects a platform header, so the local harness explicitly removes it.
  const missing = await mf.dispatchFetch('https://auth.test/__test/no-ip', { headers: { Origin: origin } });
  assert.equal(missing.status, 503);
});

test('stale archive, malformed and oversized requests do not count as password failures', async () => {
  const ip = '192.0.2.40';
  denied(await call('/v1/unlock', { ip, body: { password, archiveId: 'stale-archive-generation' } }), 409, 'archive_mismatch');
  denied(await call('/v1/unlock', { ip, body: '{' }), 400, 'invalid_request');
  denied(await call('/v1/unlock', { ip, body: { password: 123, archiveId: bindings.ARCHIVE_ID } }), 400, 'invalid_request');
  denied(await call('/v1/unlock', { ip, body: { password: 'x'.repeat(3000), archiveId: bindings.ARCHIVE_ID } }), 413, 'body_too_large');
  denied(await call('/v1/unlock', { ip, body: 'bad', headers: { 'Content-Type': 'text/plain' } }), 415, 'json_required');
  assert.equal((await call('/v1/status', { ip })).value.failures, 0);
});

test('only exact configured browser origins get CORS access and preflight', async () => {
  denied(await unlock('192.0.2.50', password, { headers: { Origin: 'https://evil.test' } }), 403, 'origin_not_allowed');
  denied(await unlock('192.0.2.50', password, { headers: { Origin: 'https://bernie8026.github.io.evil.test' } }), 403, 'origin_not_allowed');
  const preflight = await call('/v1/unlock', { method: 'OPTIONS' });
  assert.equal(preflight.response.status, 204);
  assert.equal(preflight.response.headers.get('access-control-allow-origin'), origin);
  assert.equal(preflight.response.headers.get('access-control-allow-credentials'), null);
  const noOrigin = await mf.dispatchFetch('https://auth.test/v1/status');
  assert.equal(noOrigin.status, 403);
});

test('manual recovery requires independent admin token; authenticated self and target-IP recovery reset persistent counters', async () => {
  const ip = '192.0.2.60';
  for (let i = 0; i < 3; i++) await unlock(ip);
  denied(await call('/v1/admin/unblock', { ip, body: { ip: 'self' } }), 401, 'unauthorized');
  denied(await call('/v1/admin/unblock', { ip, body: { ip: 'self' }, headers: { Authorization: `Bearer ${password}` } }), 401, 'unauthorized');
  assert.equal((await call('/v1/status', { ip })).value.failures, 3);
  const clear = await call('/v1/admin/unblock', { ip, body: { ip: 'self' }, headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(clear.response.status, 200);
  assert.equal(clear.value.failures, 0);
  assert.ok(!('key' in clear.value));
  assert.equal((await unlock(ip, password)).response.status, 200);
  await unlock('2001:db8::60');
  const targetClear = await call('/v1/admin/unblock', { ip, body: { ip: '2001:0db8:0:0:0:0:0:60' }, headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(targetClear.response.status, 200);
  assert.equal((await call('/v1/status', { ip: '2001:db8::60' })).value.failures, 0);
});

test('lock records survive actual workerd disposal and restart with SQLite persistence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lunarvow-auth-test-'));
  let persistent;
  try {
    persistent = instance({}, directory);
    await persistent.ready;
    for (let i = 0; i < 3; i++) await unlock('192.0.2.70', 'incorrect', { target: persistent });
    await persistent.dispose();
    persistent = instance({}, directory);
    await persistent.ready;
    const status = await call('/v1/status', { ip: '192.0.2.70', target: persistent });
    denied(status, 429, 'cooldown');
    assert.equal(status.value.failures, 3);
    denied(await unlock('192.0.2.70', password, { target: persistent }), 429, 'cooldown');
  } finally {
    await persistent?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('missing or malformed essential secret fails closed without a key', async () => {
  const broken = instance({ ARCHIVE_KEY_B64: '' });
  try {
    await broken.ready;
    denied(await unlock('192.0.2.80', password, { target: broken }), 503, 'service_unavailable');
  } finally { await broken.dispose(); }
});
