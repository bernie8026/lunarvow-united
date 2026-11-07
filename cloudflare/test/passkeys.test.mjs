import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare, Log, LogLevel } from 'miniflare';
import { build } from 'esbuild';
import { isoCBOR } from '@simplewebauthn/server/helpers';

// Valid synthetic authenticators sign real challenges; all verification runs in workerd + SQLite.
const root = fileURLToPath(new URL('../', import.meta.url));
const bundled = (await build({ entryPoints: [resolve(root, 'test/harness.mjs')], bundle: true,
  format: 'esm', platform: 'browser', target: 'es2022', external: ['cloudflare:workers'], write: false })).outputFiles[0].text;
const origin = 'https://bernie8026.github.io';
const rpId = 'bernie8026.github.io';
const hash = value => createHash('sha256').update(value).digest();
const b64 = value => Buffer.from(value).toString('base64url');
const password = randomBytes(32).toString('base64url');
const adminToken = randomBytes(32).toString('base64url');
const bindings = {
  SITE_ORIGIN: origin, ARCHIVE_ID: 'c77a1599-531a-40f5-bf58-614d0aed2524',
  ARCHIVE_KEY_B64: randomBytes(32).toString('base64'), IP_HMAC_KEY_B64: randomBytes(32).toString('base64'),
  ADMIN_TOKEN_SHA256: hash(adminToken).toString('hex'),
};
function instance(persist) {
  return new Miniflare({ name: 'passkey-test', modules: true, script: bundled,
    compatibilityDate: '2026-07-30', log: new Log(LogLevel.NONE), bindings,
    durableObjects: { IP_GUARD: { className: 'TestGuard', useSQLite: true },
      PASSKEYS: { className: 'TestRegistry', useSQLite: true } }, durableObjectsPersist: persist });
}
let mf, nextIp = 1;
const freshIp = () => `198.51.100.${nextIp++}`;
before(async () => { mf = instance(); await mf.ready; });
after(async () => { await mf?.dispose(); });
async function call(path, { ip = freshIp(), body, headers, target = mf, method } = {}) {
  const response = await target.dispatchFetch(`https://auth.test${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { Origin: origin, 'CF-Connecting-IP': ip,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, value: response.status === 204 ? null : await response.json() };
}
const admin = (path, body, target = mf) => call(path, { body, target, headers: { Authorization: `Bearer ${adminToken}` } });
const request = (route, body, ip, target = mf) => call(`/v1/passkeys/${route}`, { body: { archiveId: bindings.ARCHIVE_ID, ...body }, ip, target });
async function invite(target = mf) {
  const result = await admin('/v1/admin/passkeys/invitations', {}, target);
  assert.equal(result.response.status, 200);
  assert.equal(result.value.token.length, 43);
  return result.value.token;
}
function noKey(result, status, code) {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  assert.equal(result.value.ok, false);
  if (code) assert.equal(result.value.code, code);
  assert.ok(!('key' in result.value));
  assert.match(result.response.headers.get('cache-control'), /no-store/);
}
function authenticator(algorithm = 'EC') {
  const pair = algorithm === 'RSA'
    ? generateKeyPairSync('rsa', { modulusLength: 2048 })
    : generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = pair.publicKey.export({ format: 'jwk' });
  const decode = value => new Uint8Array(Buffer.from(value, 'base64url'));
  const cose = algorithm === 'RSA'
    ? new Map([[1, 3], [3, -257], [-1, decode(jwk.n)], [-2, decode(jwk.e)]])
    : new Map([[1, 2], [3, -7], [-1, 1], [-2, decode(jwk.x)], [-3, decode(jwk.y)]]);
  return { id: randomBytes(32).toString('base64url'), privateKey: pair.privateKey, cose, userId: null };
}
function counterBytes(counter) { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(counter); return bytes; }
function clientData(type, challenge, changes = {}) {
  return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false, ...changes }));
}
function registration(device, options, changes = {}) {
  device.userId = options.user.id;
  const id = Buffer.from(device.id, 'base64url'), length = Buffer.alloc(2); length.writeUInt16BE(id.length);
  const authData = Buffer.concat([hash(changes.rpId || rpId), Buffer.from([changes.flags ?? 0x45]),
    counterBytes(changes.counter || 0), Buffer.alloc(16), length, id, Buffer.from(isoCBOR.encode(device.cose))]);
  const attestationObject = isoCBOR.encode(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', new Uint8Array(authData)]]));
  return { id: device.id, rawId: device.id, type: 'public-key', authenticatorAttachment: 'platform',
    response: { clientDataJSON: b64(clientData('webauthn.create', options.challenge, changes.client)),
      attestationObject: b64(attestationObject), transports: ['internal'] }, clientExtensionResults: { credProps: { rk: true } } };
}
function assertion(device, options, changes = {}) {
  const data = clientData('webauthn.get', options.challenge, changes.client);
  const authData = Buffer.concat([hash(changes.rpId || rpId), Buffer.from([changes.flags ?? 0x05]), counterBytes(changes.counter || 0)]);
  const signature = sign('sha256', Buffer.concat([authData, hash(data)]), device.privateKey);
  if (changes.badSignature) signature[signature.length - 1] ^= 1;
  return { id: device.id, rawId: device.id, type: 'public-key', response: {
    clientDataJSON: b64(data), authenticatorData: b64(authData), signature: b64(signature),
    userHandle: changes.userHandle ?? device.userId }, clientExtensionResults: {} };
}
async function enroll(device = authenticator(), { target = mf, flags, counter } = {}) {
  const ip = freshIp(), token = await invite(target);
  const start = await request('register/options', { token }, ip, target);
  assert.equal(start.response.status, 200, JSON.stringify(start.value));
  assert.equal(start.value.options.authenticatorSelection.residentKey, 'required');
  assert.equal(start.value.options.authenticatorSelection.userVerification, 'required');
  assert.ok(!('authenticatorAttachment' in start.value.options.authenticatorSelection));
  assert.deepEqual(start.value.options.pubKeyCredParams.map(row => row.alg), [-7, -257]);
  const response = registration(device, start.value.options, { flags, counter });
  const result = await request('register/verify', { flowId: start.value.flowId, response, name: 'Fixture key' }, ip, target);
  assert.equal(result.response.status, 200, JSON.stringify(result.value));
  assert.deepEqual(result.value, { ok: true, registered: true, credentialId: device.id });
  assert.ok(!('key' in result.value));
  return device;
}
async function authStart(ip = freshIp(), target = mf) {
  const result = await request('auth/options', {}, ip, target);
  assert.equal(result.response.status, 200, JSON.stringify(result.value));
  assert.equal(result.value.options.userVerification, 'required');
  assert.deepEqual(result.value.options.allowCredentials, []);
  return { ...result.value, ip };
}
const verify = (device, flow, changes = {}, target = mf) => request('auth/verify', {
  flowId: flow.flowId, response: assertion(device, flow.options, changes) }, flow.ip, target);
function unlocked(result, failures = 0) {
  assert.equal(result.response.status, 200, JSON.stringify(result.value));
  assert.deepEqual(result.value, { ok: true, archiveId: bindings.ARCHIVE_ID, key: bindings.ARCHIVE_KEY_B64, failures });
}

test('ES256 and RS256 resident passkeys sign valid challenges in actual workerd', async () => {
  for (const algorithm of ['EC', 'RSA']) {
    const device = await enroll(authenticator(algorithm));
    unlocked(await verify(device, await authStart()));
    unlocked(await verify(device, await authStart())); // Synced/platform counter zero remains valid.
  }
});

test('enrollment needs an independent owner invitation; list/revoke need admin bearer', async () => {
  noKey(await request('register/options', { token: password }, freshIp()), 403, 'invalid_invitation');
  noKey(await call('/v1/admin/passkeys/invitations', { body: {} }), 401, 'unauthorized');
  noKey(await call('/v1/admin/passkeys'), 401, 'unauthorized');
  noKey(await call('/v1/admin/passkeys/revoke', { body: { credentialId: randomBytes(32).toString('base64url') } }), 401, 'unauthorized');
  const list = await admin('/v1/admin/passkeys');
  assert.equal(list.response.status, 200);
  assert.ok(list.value.credentials.length >= 2);
  assert.ok(list.value.credentials.every(row => !('publicKey' in row) && !('key' in row)));
});

test('single-use invitations atomically allow only one of two valid concurrent enrollments', async () => {
  const token = await invite(), ip = freshIp(), devices = [authenticator(), authenticator()];
  const flows = await Promise.all(devices.map(() => request('register/options', { token }, ip)));
  const results = await Promise.all(devices.map((device, index) => request('register/verify', {
    flowId: flows[index].value.flowId, response: registration(device, flows[index].value.options) }, ip)));
  assert.equal(results.filter(row => row.value.ok).length, 1);
  assert.ok(results.every(row => !('key' in row.value)));
  noKey(await request('register/options', { token }, ip), 403, 'invalid_invitation');
});

test('new invitations revoke older invitations and expired invitations/challenges fail closed', async () => {
  const old = await invite(), current = await invite(), ip = freshIp();
  noKey(await request('register/options', { token: old }, ip), 403, 'invalid_invitation');
  await mf.dispatchFetch('https://auth.test/__test/expire-passkeys?kind=invitations');
  noKey(await request('register/options', { token: current }, ip), 403, 'invalid_invitation');
  const device = await enroll(), flow = await authStart();
  await mf.dispatchFetch('https://auth.test/__test/expire-passkeys?kind=flows');
  noKey(await verify(device, flow), 401, 'invalid_passkey');
});

test('invalid registration proof consumes its challenge and cannot bypass UV/origin/RP ID', async () => {
  for (const changes of [{ flags: 0x41 }, { rpId: 'example.com' }, { client: { origin: 'https://example.com' } }, { client: { crossOrigin: true } }]) {
    const device = authenticator(), ip = freshIp(), token = await invite();
    const start = await request('register/options', { token }, ip);
    noKey(await request('register/verify', { flowId: start.value.flowId, response: registration(device, start.value.options, changes) }, ip), 401, 'invalid_passkey');
    noKey(await request('register/verify', { flowId: start.value.flowId, response: registration(device, start.value.options) }, ip), 401, 'invalid_passkey');
  }
});

test('assertions reject missing UV, wrong challenge/origin/RP ID/user handle, cross-origin frames, and bad signatures', async () => {
  const device = await enroll();
  const cases = [{ flags: 0x01 }, { rpId: 'example.com' }, { userHandle: b64(randomBytes(32)) },
    { client: { origin: 'https://example.com' } }, { client: { challenge: b64(randomBytes(32)) } },
    { client: { crossOrigin: true } }, { client: { topOrigin: origin } }, { badSignature: true }];
  for (const changes of cases) {
    const flow = await authStart();
    noKey(await verify(device, flow, changes), 401, 'invalid_passkey');
    noKey(await verify(device, flow), 401, 'invalid_passkey');
  }
});

test('a challenge is IP-bound and single use, and client body cannot override trusted IP', async () => {
  const device = await enroll(), flow = await authStart();
  noKey(await request('auth/verify', { flowId: flow.flowId, response: assertion(device, flow.options), ip: flow.ip }, freshIp()), 401, 'invalid_passkey');
  noKey(await verify(device, flow), 401, 'invalid_passkey');
  const fresh = await authStart();
  unlocked(await verify(device, fresh));
  noKey(await verify(device, fresh), 401, 'invalid_passkey');
});

test('signature counters reject repeats; backed-up zero-counter passkeys remain supported', async () => {
  const counted = await enroll(authenticator(), { counter: 4 });
  unlocked(await verify(counted, await authStart(), { counter: 5 }));
  noKey(await verify(counted, await authStart(), { counter: 5 }), 401, 'invalid_passkey');
  noKey(await verify(counted, await authStart(), { counter: 0 }), 401, 'invalid_passkey');
  const synced = await enroll(authenticator(), { flags: 0x5d }); // UP + UV + AT + BE + BS
  unlocked(await verify(synced, await authStart(), { flags: 0x1d }));
  unlocked(await verify(synced, await authStart(), { flags: 0x1d }));
  const list = await admin('/v1/admin/passkeys');
  const row = list.value.credentials.find(item => item.id === synced.id);
  assert.equal(row.deviceType, 'multiDevice');
  assert.equal(row.backedUp, true);
  assert.equal(typeof row.lastUsed, 'number');
});

test('revoked passkeys cannot release a key even with a previously issued challenge', async () => {
  const device = await enroll(), flow = await authStart();
  const revoked = await admin('/v1/admin/passkeys/revoke', { credentialId: device.id });
  assert.equal(revoked.value.revoked, true);
  noKey(await verify(device, flow), 401, 'invalid_passkey');
  const list = await admin('/v1/admin/passkeys');
  assert.equal(typeof list.value.credentials.find(row => row.id === device.id).revokedAt, 'number');
});

test('passkey abuse throttles independently and never increments lifetime password failures', async () => {
  const ip = freshIp();
  for (let index = 0; index < 20; index++) {
    noKey(await request('auth/verify', { flowId: b64(randomBytes(32)), response: {} }, ip), 401, 'invalid_passkey');
  }
  const blocked = await request('auth/options', {}, ip);
  noKey(blocked, 429, 'passkey_rate_limit');
  assert.ok(Number(blocked.response.headers.get('retry-after')) > 0);
  const state = await call('/v1/status', { ip });
  assert.equal(state.value.failures, 0);
  assert.equal(state.value.code, 'ready');
});

test('existing password IP cooldown/permanent lock also deny otherwise valid passkey proofs', async () => {
  const device = await enroll(), ip = freshIp(), flow = await authStart(ip);
  const stateUrl = new URL('https://auth.test/__test/state');
  stateUrl.searchParams.set('ip', ip);
  stateUrl.searchParams.set('failures', '3');
  stateUrl.searchParams.set('cooldown', '1');
  assert.equal((await mf.dispatchFetch(stateUrl.href)).status, 200);
  noKey(await verify(device, flow), 429, 'cooldown');
  noKey(await request('auth/options', {}, ip), 429, 'cooldown');
  stateUrl.searchParams.set('failures', '10');
  stateUrl.searchParams.delete('cooldown');
  assert.equal((await mf.dispatchFetch(stateUrl.href)).status, 200);
  noKey(await verify(device, flow), 403, 'permanent_lock');
});

test('credentials and pending authentication challenges persist through a workerd restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lunarvow-passkeys-'));
  let target = instance(directory);
  try {
    await target.ready;
    const device = await enroll(authenticator(), { target }), flow = await authStart(freshIp(), target);
    await target.dispose(); target = instance(directory); await target.ready;
    unlocked(await verify(device, flow, {}, target));
  } finally { await target.dispose(); await rm(directory, { recursive: true, force: true }); }
});
