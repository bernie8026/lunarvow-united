'use strict';
// Owner-run deployment smoke: generates one ephemeral software credential, then revokes it.
// It never submits a password or changes any existing credential or IP attempt record.
const assert = require('node:assert/strict');
const { createHash, generateKeyPairSync, randomBytes, sign } = require('node:crypto');
const path = require('node:path');
const { createRequire } = require('node:module');
const { readAccessConfig } = require('./prepare-protected-site.cjs');
const requireBackend = createRequire(path.resolve(__dirname, '../cloudflare/package.json'));
const { isoCBOR } = requireBackend('@simplewebauthn/server/helpers');
const origin = 'https://bernie8026.github.io', rpID = 'bernie8026.github.io';
const hash = value => createHash('sha256').update(value).digest();
const b64 = value => Buffer.from(value).toString('base64url');

async function main() {
  const access = readAccessConfig();
  assert.equal(new URL(access.authOrigin).protocol, 'https:');
  const id = b64(randomBytes(32));
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const cose = new Map([[1, 2], [3, -7], [-1, 1], [-2, new Uint8Array(Buffer.from(jwk.x, 'base64url'))], [-3, new Uint8Array(Buffer.from(jwk.y, 'base64url'))]]);
  const passed = [];
  let cleanupNeeded = false, originalIds, beforeFailures, userId;
  async function call(route, { body, admin, badOrigin } = {}) {
    const response = await fetch(new URL(route, access.authOrigin), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: badOrigin || origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(admin ? { Authorization: `Bearer ${access.adminToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    return { status: response.status, value: await response.json() };
  }
  const api = (route, body) => call('/v1/passkeys/' + route, { body: { archiveId: access.archiveId, ...body } });
  const list = async () => {
    const result = await call('/v1/admin/passkeys', { admin: true });
    assert.equal(result.status, 200); assert.equal(result.value.ok, true);
    return result.value.credentials;
  };
  const client = (type, challenge) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  const assertion = options => {
    const data = client('webauthn.get', options.challenge);
    const authenticatorData = Buffer.concat([hash(rpID), Buffer.from([0x05]), Buffer.alloc(4)]);
    return { id, rawId: id, type: 'public-key', response: { clientDataJSON: b64(data),
      authenticatorData: b64(authenticatorData), signature: b64(sign('sha256', Buffer.concat([authenticatorData, hash(data)]), privateKey)), userHandle: userId }, clientExtensionResults: {} };
  };
  try {
    const before = await call('/v1/status');
    assert.equal(before.status, 200); assert.equal(before.value.code, 'ready');
    beforeFailures = before.value.failures;
    originalIds = (await list()).map(item => item.id).sort();
    const invitation = await call('/v1/admin/passkeys/invitations', { body: {}, admin: true });
    assert.equal(invitation.status, 200); assert.equal(invitation.value.ok, true);
    const start = await api('register/options', { token: invitation.value.token });
    assert.equal(start.status, 200); assert.equal(start.value.ok, true);
    const options = start.value.options; userId = options.user.id;
    assert.equal(options.rp.id, rpID);
    assert.equal(options.authenticatorSelection.userVerification, 'required');
    assert.equal(options.authenticatorSelection.residentKey, 'required');
    const credentialBytes = Buffer.from(id, 'base64url'), length = Buffer.alloc(2);
    length.writeUInt16BE(credentialBytes.length);
    const authData = Buffer.concat([hash(rpID), Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16), length, credentialBytes, Buffer.from(isoCBOR.encode(cose))]);
    const response = { id, rawId: id, type: 'public-key', response: {
      clientDataJSON: b64(client('webauthn.create', options.challenge)),
      attestationObject: b64(isoCBOR.encode(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', new Uint8Array(authData)]]))),
      transports: ['internal'] }, clientExtensionResults: { credProps: { rk: true } } };
    cleanupNeeded = true; // Revoke our known random ID even if the next response is lost.
    const registered = await api('register/verify', { flowId: start.value.flowId, response, name: 'Deployment test (revoked)' });
    assert.equal(registered.status, 200); assert.equal(registered.value.credentialId, id);
    assert.ok(!('key' in registered.value)); passed.push('owner-only registration');
    const auth = await api('auth/options', {});
    assert.equal(auth.status, 200); assert.equal(auth.value.ok, true);
    const proof = { flowId: auth.value.flowId, response: assertion(auth.value.options) };
    const unlocked = await api('auth/verify', proof);
    assert.equal(unlocked.status, 200); assert.equal(unlocked.value.ok, true);
    assert.equal(unlocked.value.key, access.archiveKeyB64); assert.equal(unlocked.value.failures, beforeFailures);
    passed.push('signed authentication releases configured archive key');
    const replay = await api('auth/verify', proof);
    assert.equal(replay.status, 401); assert.equal(replay.value.code, 'invalid_passkey'); assert.ok(!('key' in replay.value));
    passed.push('single-use challenge replay denied');
    const crossOrigin = await call('/v1/passkeys/auth/options', { body: { archiveId: access.archiveId }, badOrigin: 'https://example.com' });
    assert.equal(crossOrigin.status, 403); assert.equal(crossOrigin.value.code, 'origin_not_allowed'); assert.ok(!('key' in crossOrigin.value));
    passed.push('foreign browser origin denied');
    const pending = await api('auth/options', {}); assert.equal(pending.status, 200);
    const revoked = await call('/v1/admin/passkeys/revoke', { body: { credentialId: id }, admin: true });
    assert.equal(revoked.status, 200); assert.equal(revoked.value.revoked, true);
    const denied = await api('auth/verify', { flowId: pending.value.flowId, response: assertion(pending.value.options) });
    assert.equal(denied.status, 401); assert.equal(denied.value.code, 'invalid_passkey'); assert.ok(!('key' in denied.value));
    passed.push('revoked credential denied');
  } finally {
    if (cleanupNeeded) {
      const revoked = await call('/v1/admin/passkeys/revoke', { body: { credentialId: id }, admin: true });
      assert.equal(revoked.status, 200); assert.equal(revoked.value.revoked, true);
    }
  }
  const current = await list();
  assert.deepEqual(current.filter(item => item.id !== id).map(item => item.id).sort(), originalIds);
  if (cleanupNeeded) assert.equal(typeof current.find(item => item.id === id)?.revokedAt, 'number');
  const after = await call('/v1/status'); assert.equal(after.status, 200); assert.equal(after.value.failures, beforeFailures);
  passed.push('existing credentials and password failure counter preserved');
  console.log(JSON.stringify({ ok: true, passed, testCredentialRevoked: cleanupNeeded }));
}
main().catch(() => { console.error('Live passkey smoke failed. Only the generated deployment-test credential is targeted for cleanup; inspect the deployment and owner registry.'); process.exitCode = 1; });
