import { DurableObject } from 'cloudflare:workers';
import { PasskeyRegistry } from './passkey-registry.mjs';
export { PasskeyRegistry };

const encoder = new TextEncoder();
const MAX_BODY_BYTES = 2048;
const COOLDOWN_MS = 5 * 60 * 1000;
const PERMANENT_THRESHOLD = 10;

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** Normalize alternate spellings to one identity; IPv4-mapped IPv6 shares IPv4's identity. */
export function normalizeIp(input) {
  if (typeof input !== 'string') throw new HttpError(503, 'client_ip_unavailable');
  const value = input.trim();
  if (/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)) {
    if (value.split('.').every(part => Number(part) <= 255)) return value;
  }
  if (!value.includes(':') || /[^0-9a-fA-F:.]/.test(value)) {
    throw new HttpError(400, 'invalid_ip');
  }
  let host;
  try {
    host = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  } catch {
    throw new HttpError(400, 'invalid_ip');
  }
  const halves = host.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const words = halves.length === 2
    ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
    : left;
  if (words.length !== 8) throw new HttpError(400, 'invalid_ip');
  const numbers = words.map(word => Number.parseInt(word, 16));
  if (numbers.slice(0, 5).every(word => word === 0) && numbers[5] === 0xffff) {
    return [numbers[6] >> 8, numbers[6] & 255, numbers[7] >> 8, numbers[7] & 255].join('.');
  }
  return host;
}

function hexBytes(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || '')) throw new HttpError(503, 'service_unavailable');
  return Uint8Array.from(value.match(/../g), pair => Number.parseInt(pair, 16));
}

function base64Key(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new HttpError(503, 'service_unavailable');
  }
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
  if (bytes.length !== 32) throw new HttpError(503, 'service_unavailable');
  return bytes;
}

function configuration(env) {
  if (!env.IP_GUARD || typeof env.IP_GUARD.getByName !== 'function' ||
      typeof env.ARCHIVE_ID !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(env.ARCHIVE_ID)) {
    throw new HttpError(503, 'service_unavailable');
  }
  // All secrets are required so a deployment cannot silently disable recovery or protection.
  hexBytes(env.AUTH_PASSWORD_SHA256);
  hexBytes(env.ADMIN_TOKEN_SHA256);
  base64Key(env.ARCHIVE_KEY_B64);
  base64Key(env.IP_HMAC_KEY_B64);
  if (env.SITE_ORIGIN !== 'https://bernie8026.github.io') {
    throw new HttpError(503, 'service_unavailable');
  }
  const allowedOrigins = [env.SITE_ORIGIN];
  if (env.DEV_ORIGIN) {
    let origin;
    try { origin = new URL(env.DEV_ORIGIN); } catch { throw new HttpError(503, 'service_unavailable'); }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) ||
        !['http:', 'https:'].includes(origin.protocol) || origin.origin !== env.DEV_ORIGIN) {
      throw new HttpError(503, 'service_unavailable');
    }
    allowedOrigins.push(env.DEV_ORIGIN);
  }
  return allowedOrigins;
}

async function matchesDigest(value, expectedHex) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return crypto.subtle.timingSafeEqual(digest, hexBytes(expectedHex));
}

async function ipPseudonym(env, ip) {
  const key = await crypto.subtle.importKey('raw', base64Key(env.IP_HMAC_KEY_B64),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`ip-v1:${ip}`)));
  const pseudonym = Array.from(mac, byte => byte.toString(16).padStart(2, '0')).join('');
  return pseudonym;
}
async function objectForIp(env, ip) { return env.IP_GUARD.getByName(await ipPseudonym(env, ip)); }
async function digestHex(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
function registry(env) {
  if (!env.PASSKEYS || typeof env.PASSKEYS.getByName !== 'function') throw new HttpError(503, 'service_unavailable');
  return env.PASSKEYS.getByName('portfolio-owner-v1');
}
function passkeyResult(result, origin) {
  if (result.ok) return json(result, 200, origin);
  const status = result.code === 'invalid_invitation' ? 403 : result.code === 'invalid_passkey' ? 401 : result.code === 'passkey_busy' ? 503 : 400;
  return json(result, status, origin);
}

async function boundedJson(request, maximumBytes = MAX_BODY_BYTES) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
    throw new HttpError(415, 'json_required');
  }
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBytes)) {
    throw new HttpError(413, 'body_too_large');
  }
  if (!request.body) throw new HttpError(400, 'invalid_request');
  const reader = request.body.getReader();
  const parts = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new HttpError(413, 'body_too_large');
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new HttpError(400, 'invalid_request'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'invalid_request');
  }
  return parsed;
}

function json(body, status, origin, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Date': new Date().toUTCString(),
    'Vary': 'Origin',
    ...extraHeaders,
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Expose-Headers'] = 'Date, Retry-After';
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function stateResponse(state, origin) {
  const status = state.code === 'permanent_lock' ? 403 : state.code === 'cooldown' ? 429 : 401;
  return json({ ok: false, ...state }, status, origin,
    state.code === 'cooldown' ? { 'Retry-After': String(state.retryAfterSeconds) } : {});
}

/** One SQLite-backed object per HMAC-normalized IP. No IP or passwords are stored. */
export class IpAttemptGuard extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS attempt_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        failures INTEGER NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 10),
        locked_until INTEGER NOT NULL DEFAULT 0
      )`);
      this.ctx.storage.sql.exec('INSERT OR IGNORE INTO attempt_state (id) VALUES (1)');
      this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS ceremony_rate (id INTEGER PRIMARY KEY CHECK(id=1), window_start INTEGER NOT NULL, requests INTEGER NOT NULL)');
    });
  }

  #read() {
    return this.ctx.storage.sql.exec('SELECT failures, locked_until FROM attempt_state WHERE id = 1').one();
  }

  #blocked(row, now) {
    if (row.failures >= PERMANENT_THRESHOLD) return { code: 'permanent_lock', failures: row.failures };
    if (row.locked_until > now) return {
      code: 'cooldown', failures: row.failures, lockedUntil: row.locked_until,
      retryAfterSeconds: Math.ceil((row.locked_until - now) / 1000),
    };
    return null;
  }

  status() {
    const row = this.#read();
    return this.#blocked(row, Date.now()) || { code: 'ready', failures: row.failures };
  }

  attempt(verified) {
    if (typeof verified !== 'boolean') throw new Error('Invalid internal verification result');
    // No await between read, decision and persisted update. Concurrent RPCs cannot interleave here.
    return this.ctx.storage.transactionSync(() => {
      const now = Date.now();
      const row = this.#read();
      const blocked = this.#blocked(row, now);
      if (blocked) return blocked;
      if (verified) return { code: 'allowed', failures: row.failures };
      const failures = row.failures + 1;
      const lockedUntil = failures < PERMANENT_THRESHOLD && failures % 3 === 0 ? now + COOLDOWN_MS : 0;
      this.ctx.storage.sql.exec('UPDATE attempt_state SET failures = ?, locked_until = ? WHERE id = 1',
        failures, lockedUntil);
      return this.#blocked({ failures, locked_until: lockedUntil }, now) || { code: 'invalid_password', failures };
    });
  }

  ceremonyBudget() {
    return this.ctx.storage.transactionSync(() => {
      const now = Date.now();
      const row = this.ctx.storage.sql.exec('SELECT window_start, requests FROM ceremony_rate WHERE id=1').toArray()[0];
      if (!row || now - row.window_start >= 60000) {
        this.ctx.storage.sql.exec('INSERT OR REPLACE INTO ceremony_rate (id,window_start,requests) VALUES (1,?,1)', now);
        return { ok: true };
      }
      if (row.requests >= 20) return { ok: false, code: 'passkey_rate_limit', retryAfterSeconds: Math.max(1, Math.ceil((row.window_start + 60000 - now) / 1000)) };
      this.ctx.storage.sql.exec('UPDATE ceremony_rate SET requests=requests+1 WHERE id=1');
      return { ok: true };
    });
  }

  unblock() {
    this.ctx.storage.sql.exec('UPDATE attempt_state SET failures = 0, locked_until = 0 WHERE id = 1');
    return { code: 'ready', failures: 0 };
  }
}

export default {
  async fetch(request, env) {
    let allowedOrigin;
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'https:') throw new HttpError(400, 'https_required');
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ ok: true, service: 'lunarvow-auth', version: 1 }, 200);
      }
      const origins = configuration(env);
      const origin = request.headers.get('Origin');
      if (origin && origins.includes(origin)) allowedOrigin = origin;
      const isAdmin = ['/v1/admin/unblock', '/v1/admin/passkeys/invitations', '/v1/admin/passkeys', '/v1/admin/passkeys/revoke'].includes(url.pathname);
      const isPasskey = url.pathname.startsWith('/v1/passkeys/');
      if (origin && !allowedOrigin || !isAdmin && !allowedOrigin) {
        throw new HttpError(403, 'origin_not_allowed');
      }
      if (request.method === 'OPTIONS') {
        if (!allowedOrigin || !['/v1/unlock', '/v1/status', '/v1/admin/unblock', '/v1/passkeys/auth/options', '/v1/passkeys/auth/verify', '/v1/passkeys/register/options', '/v1/passkeys/register/verify', '/v1/admin/passkeys/invitations', '/v1/admin/passkeys', '/v1/admin/passkeys/revoke'].includes(url.pathname)) {
          throw new HttpError(403, 'origin_not_allowed');
        }
        return json(null, 204, allowedOrigin, {
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': isAdmin ? 'Content-Type, Authorization' : 'Content-Type',
          'Access-Control-Max-Age': '600',
        });
      }
      if (isAdmin) {
        if (request.method !== (url.pathname === '/v1/admin/passkeys' ? 'GET' : 'POST')) throw new HttpError(405, 'method_not_allowed');
        const auth = request.headers.get('Authorization') || '';
        const token = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(auth)?.[1] || '';
        if (!await matchesDigest(token, env.ADMIN_TOKEN_SHA256)) {
          throw new HttpError(401, 'unauthorized');
        }
        if (url.pathname === '/v1/admin/passkeys') return json({ ok: true, credentials: await registry(env).list() }, 200, allowedOrigin);
        const body = await boundedJson(request);
        if (url.pathname === '/v1/admin/passkeys/invitations') {
          const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
          const result = await registry(env).invitation(await digestHex(token));
          return result.ok ? json({ ...result, token }, 200, allowedOrigin) : passkeyResult(result, allowedOrigin);
        }
        if (url.pathname === '/v1/admin/passkeys/revoke') return passkeyResult(await registry(env).revoke(body.credentialId), allowedOrigin);
        const ip = normalizeIp(body.ip === 'self' ? request.headers.get('CF-Connecting-IP') : body.ip);
        const object = await objectForIp(env, ip);
        return json({ ok: true, ...await object.unblock() }, 200, allowedOrigin);
      }
      if (url.pathname === '/v1/status' && request.method === 'GET') {
        const object = await objectForIp(env, normalizeIp(request.headers.get('CF-Connecting-IP')));
        const state = await object.status();
        return state.code === 'ready'
          ? json({ ok: true, archiveId: env.ARCHIVE_ID, ...state }, 200, allowedOrigin)
          : stateResponse(state, allowedOrigin);
      }
      if (isPasskey) {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
        if (!['/v1/passkeys/auth/options', '/v1/passkeys/auth/verify', '/v1/passkeys/register/options', '/v1/passkeys/register/verify'].includes(url.pathname)) throw new HttpError(404, 'not_found');
        const body = await boundedJson(request, 16384);
        if (body.archiveId !== env.ARCHIVE_ID) throw new HttpError(409, 'archive_mismatch');
        const pseudonym = await ipPseudonym(env, normalizeIp(request.headers.get('CF-Connecting-IP')));
        const guard = env.IP_GUARD.getByName(pseudonym), state = await guard.status();
        if (state.code !== 'ready') return stateResponse(state, allowedOrigin);
        const budget = await guard.ceremonyBudget();
        if (!budget.ok) return json(budget, 429, allowedOrigin, { 'Retry-After': String(budget.retryAfterSeconds) });
        const keys = registry(env);
        if (url.pathname === '/v1/passkeys/register/options') {
          if (typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) throw new HttpError(403, 'invalid_invitation');
          return passkeyResult(await keys.registrationOptions(await digestHex(body.token), pseudonym, allowedOrigin, env.ARCHIVE_ID), allowedOrigin);
        }
        if (url.pathname === '/v1/passkeys/register/verify') return passkeyResult(await keys.register(body, pseudonym, allowedOrigin, env.ARCHIVE_ID), allowedOrigin);
        if (url.pathname === '/v1/passkeys/auth/options') return passkeyResult(await keys.authenticationOptions(pseudonym, allowedOrigin, env.ARCHIVE_ID), allowedOrigin);
        const verified = await keys.authenticate(body, pseudonym, allowedOrigin, env.ARCHIVE_ID);
        if (!verified.ok) return passkeyResult(verified, allowedOrigin);
        const decision = await guard.attempt(true);
        if (decision.code !== 'allowed') return stateResponse(decision, allowedOrigin);
        if (!await keys.active(verified.credentialId)) throw new HttpError(401, 'invalid_passkey');
        return json({ ok: true, archiveId: env.ARCHIVE_ID, key: env.ARCHIVE_KEY_B64, failures: decision.failures }, 200, allowedOrigin);
      }
      if (url.pathname !== '/v1/unlock') throw new HttpError(404, 'not_found');
      if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
      const body = await boundedJson(request);
      // Stale client builds and malformed requests never consume a password attempt.
      if (body.archiveId !== env.ARCHIVE_ID) throw new HttpError(409, 'archive_mismatch');
      if (typeof body.password !== 'string' || encoder.encode(body.password).byteLength > 512) {
        throw new HttpError(400, 'invalid_request');
      }
      const object = await objectForIp(env, normalizeIp(request.headers.get('CF-Connecting-IP')));
      const before = await object.status();
      if (before.code !== 'ready') return stateResponse(before, allowedOrigin);
      const verified = await matchesDigest(body.password, env.AUTH_PASSWORD_SHA256);
      // attempt() re-checks persisted lock state after asynchronous verification.
      const decision = await object.attempt(verified);
      if (decision.code !== 'allowed') return stateResponse(decision, allowedOrigin);
      return json({ ok: true, archiveId: env.ARCHIVE_ID, key: env.ARCHIVE_KEY_B64,
        failures: decision.failures }, 200, allowedOrigin);
    } catch (error) {
      if (error instanceof HttpError) return json({ ok: false, code: error.code }, error.status, allowedOrigin);
      // Fixed log fields only: errors may otherwise contain request/secret data from dependencies.
      console.error(JSON.stringify({ event: 'auth_backend_error' }));
      return json({ ok: false, code: 'service_unavailable' }, 503, allowedOrigin);
    }
  },
};
