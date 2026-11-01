import { DurableObject } from 'cloudflare:workers';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const RP_ID = 'bernie8026.github.io';
const ORIGIN = 'https://bernie8026.github.io';
const CHALLENGE_TTL = 5 * 60 * 1000;
const INVITATION_TTL = 30 * 60 * 1000;
const ALGORITHMS = [-7, -257];
const ID = /^[A-Za-z0-9_-]{16,1400}$/;
const bytesToBase64 = bytes => btoa(String.fromCharCode(...bytes));
const base64ToBytes = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));
const randomToken = () => bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
  .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const failure = code => ({ ok: false, code });
function topLevelCeremony(response) {
  try {
    const value = response?.response?.clientDataJSON;
    if (typeof value !== 'string' || value.length > 10000 || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
    const raw = value.replaceAll('-', '+').replaceAll('_', '/');
    const data = JSON.parse(new TextDecoder().decode(base64ToBytes(raw)));
    return data.crossOrigin !== true && data.topOrigin === undefined;
  } catch { return false; }
}

/** One owner account is the coordination atom for passkeys, challenges and invitations. */
export class PasskeyRegistry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS passkey_owner (id INTEGER PRIMARY KEY CHECK(id=1), user_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS passkey_invitations (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS passkey_flows (
          id TEXT PRIMARY KEY, kind TEXT NOT NULL, challenge TEXT NOT NULL,
          ip TEXT NOT NULL, origin TEXT NOT NULL, archive_id TEXT NOT NULL,
          token_hash TEXT, expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS passkey_credentials (
          id TEXT PRIMARY KEY, public_key TEXT NOT NULL, counter INTEGER NOT NULL,
          transports TEXT NOT NULL, device_type TEXT NOT NULL, backed_up INTEGER NOT NULL,
          name TEXT NOT NULL, created_at INTEGER NOT NULL, last_used INTEGER,
          revoked_at INTEGER
        );
      `);
      ctx.storage.sql.exec('INSERT OR IGNORE INTO passkey_owner (id,user_id) VALUES (1,?)', randomToken());
    });
  }

  #userId() { return this.ctx.storage.sql.exec('SELECT user_id FROM passkey_owner WHERE id=1').one().user_id; }
  #prune() {
    const now = Date.now();
    this.ctx.storage.sql.exec('DELETE FROM passkey_flows WHERE expires_at <= ?', now);
    this.ctx.storage.sql.exec('DELETE FROM passkey_invitations WHERE expires_at <= ?', now);
  }
  #active() { return this.ctx.storage.sql.exec('SELECT * FROM passkey_credentials WHERE revoked_at IS NULL').toArray(); }
  #invite(hash) {
    return this.ctx.storage.sql.exec('SELECT expires_at FROM passkey_invitations WHERE token_hash=? AND expires_at>?', hash, Date.now()).toArray()[0];
  }
  #flow(kind, challenge, ip, origin, archiveId, tokenHash = null) {
    this.#prune();
    if (this.ctx.storage.sql.exec('SELECT count(*) AS n FROM passkey_flows').one().n >= 1000) return null;
    const id = randomToken();
    this.ctx.storage.sql.exec('INSERT INTO passkey_flows (id,kind,challenge,ip,origin,archive_id,token_hash,expires_at) VALUES (?,?,?,?,?,?,?,?)',
      id, kind, challenge, ip, origin, archiveId, tokenHash, Date.now() + CHALLENGE_TTL);
    return id;
  }
  #consume(id, kind, ip, origin, archiveId) {
    if (typeof id !== 'string' || !ID.test(id)) return null;
    return this.ctx.storage.transactionSync(() => {
      const flow = this.ctx.storage.sql.exec('SELECT * FROM passkey_flows WHERE id=?', id).toArray()[0];
      // Every verification attempt consumes its challenge, including invalid proofs.
      this.ctx.storage.sql.exec('DELETE FROM passkey_flows WHERE id=?', id);
      if (!flow || flow.kind !== kind || flow.ip !== ip || flow.origin !== origin ||
          flow.archive_id !== archiveId || flow.expires_at <= Date.now()) return null;
      return flow;
    });
  }

  /** The Worker hashes a fresh random token before storing it. Issuing a new invite revokes old invites. */
  invitation(tokenHash) {
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) return failure('invalid_request');
    return this.ctx.storage.transactionSync(() => {
      this.#prune();
      this.ctx.storage.sql.exec('DELETE FROM passkey_invitations');
      const expiresAt = Date.now() + INVITATION_TTL;
      this.ctx.storage.sql.exec('INSERT INTO passkey_invitations (token_hash,expires_at) VALUES (?,?)', tokenHash, expiresAt);
      return { ok: true, expiresAt };
    });
  }

  async registrationOptions(tokenHash, ip, origin, archiveId) {
    if (origin !== ORIGIN || !this.#invite(tokenHash)) return failure('invalid_invitation');
    const active = this.#active();
    if (active.length >= 20) return failure('credential_limit');
    const userID = base64ToBytes(this.#userId().replaceAll('-', '+').replaceAll('_', '/') + '=');
    const options = await generateRegistrationOptions({
      rpName: 'Bernie Leung Portfolio', rpID: RP_ID,
      userID, userName: 'Bernie Leung', userDisplayName: 'Bernie Leung',
      attestationType: 'none', timeout: 120000,
      supportedAlgorithmIDs: ALGORITHMS,
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      excludeCredentials: active.map(row => ({ id: row.id, transports: JSON.parse(row.transports) })),
    });
    // Options generation is asynchronous. Recheck invitation and capacity before writing the flow.
    return this.ctx.storage.transactionSync(() => {
      if (!this.#invite(tokenHash)) return failure('invalid_invitation');
      const flowId = this.#flow('register', options.challenge, ip, origin, archiveId, tokenHash);
      return flowId ? { ok: true, flowId, options } : failure('passkey_busy');
    });
  }

  async register({ flowId, response, name }, ip, origin, archiveId) {
    const flow = this.#consume(flowId, 'register', ip, origin, archiveId);
    if (!flow || !this.#invite(flow.token_hash) || !topLevelCeremony(response)) return failure('invalid_passkey');
    let result;
    try {
      result = await verifyRegistrationResponse({
        response, expectedChallenge: flow.challenge, expectedOrigin: ORIGIN, expectedRPID: RP_ID,
        requireUserPresence: true, requireUserVerification: true, supportedAlgorithmIDs: ALGORITHMS,
      });
    } catch { return failure('invalid_passkey'); }
    if (!result.verified || !result.registrationInfo?.userVerified) return failure('invalid_passkey');
    const info = result.registrationInfo, credential = info.credential;
    const displayName = typeof name === 'string' ? name.trim() : 'Passkey';
    if (!displayName || displayName.length > 80 || /[\u0000-\u001f\u007f]/.test(displayName)) return failure('invalid_request');
    return this.ctx.storage.transactionSync(() => {
      // A second valid response using the same invitation cannot enroll another credential.
      if (!this.#invite(flow.token_hash)) return failure('invalid_invitation');
      if (this.#active().length >= 20) return failure('credential_limit');
      if (this.ctx.storage.sql.exec('SELECT id FROM passkey_credentials WHERE id=?', credential.id).toArray().length) return failure('credential_exists');
      this.ctx.storage.sql.exec('INSERT INTO passkey_credentials (id,public_key,counter,transports,device_type,backed_up,name,created_at) VALUES (?,?,?,?,?,?,?,?)',
        credential.id, bytesToBase64(credential.publicKey), credential.counter,
        JSON.stringify(credential.transports || []), info.credentialDeviceType, Number(info.credentialBackedUp), displayName, Date.now());
      this.ctx.storage.sql.exec('DELETE FROM passkey_invitations WHERE token_hash=?', flow.token_hash);
      this.ctx.storage.sql.exec('DELETE FROM passkey_flows WHERE token_hash=?', flow.token_hash);
      return { ok: true, registered: true, credentialId: credential.id };
    });
  }

  async authenticationOptions(ip, origin, archiveId) {
    if (origin !== ORIGIN) return failure('invalid_passkey');
    if (!this.#active().length) return failure('no_passkeys');
    const options = await generateAuthenticationOptions({
      rpID: RP_ID, timeout: 120000, userVerification: 'required',
      // Discoverable credentials allow iCloud Keychain and hybrid QR without enumerating key IDs.
      allowCredentials: [],
    });
    const flowId = this.#flow('authenticate', options.challenge, ip, origin, archiveId);
    return flowId ? { ok: true, flowId, options } : failure('passkey_busy');
  }

  async authenticate({ flowId, response }, ip, origin, archiveId) {
    const flow = this.#consume(flowId, 'authenticate', ip, origin, archiveId);
    if (!flow || !topLevelCeremony(response) || typeof response?.id !== 'string' || !ID.test(response.id) ||
        response?.response?.userHandle !== this.#userId()) return failure('invalid_passkey');
    const credential = this.ctx.storage.sql.exec('SELECT * FROM passkey_credentials WHERE id=? AND revoked_at IS NULL', response.id).toArray()[0];
    if (!credential) return failure('invalid_passkey');
    let result;
    try {
      result = await verifyAuthenticationResponse({
        response, expectedChallenge: flow.challenge, expectedOrigin: ORIGIN, expectedRPID: RP_ID,
        requireUserVerification: true,
        credential: { id: credential.id, publicKey: base64ToBytes(credential.public_key),
          counter: credential.counter, transports: JSON.parse(credential.transports) },
      });
    } catch { return failure('invalid_passkey'); }
    if (!result.verified || !result.authenticationInfo?.userVerified) return failure('invalid_passkey');
    const info = result.authenticationInfo;
    return this.ctx.storage.transactionSync(() => {
      const current = this.ctx.storage.sql.exec('SELECT counter FROM passkey_credentials WHERE id=? AND revoked_at IS NULL', credential.id).toArray()[0];
      // A concurrent revocation or a newer signature counter supersedes this verification.
      if (!current || ((info.newCounter > 0 || current.counter > 0) && info.newCounter <= current.counter)) return failure('invalid_passkey');
      this.ctx.storage.sql.exec('UPDATE passkey_credentials SET counter=?,device_type=?,backed_up=?,last_used=? WHERE id=? AND revoked_at IS NULL',
        info.newCounter, info.credentialDeviceType, Number(info.credentialBackedUp), Date.now(), credential.id);
      return { ok: true, credentialId: credential.id };
    });
  }

  active(credentialId) {
    return this.ctx.storage.sql.exec('SELECT id FROM passkey_credentials WHERE id=? AND revoked_at IS NULL', credentialId).toArray().length === 1;
  }
  list() {
    return this.ctx.storage.sql.exec('SELECT id,name,device_type,backed_up,created_at,last_used,revoked_at FROM passkey_credentials ORDER BY created_at').toArray()
      .map(row => ({ id: row.id, name: row.name, deviceType: row.device_type, backedUp: Boolean(row.backed_up),
        createdAt: row.created_at, lastUsed: row.last_used, revokedAt: row.revoked_at }));
  }
  revoke(credentialId) {
    if (typeof credentialId !== 'string' || !ID.test(credentialId)) return failure('invalid_request');
    this.ctx.storage.sql.exec('UPDATE passkey_credentials SET revoked_at=? WHERE id=? AND revoked_at IS NULL', Date.now(), credentialId);
    return { ok: true, revoked: true };
  }
}
