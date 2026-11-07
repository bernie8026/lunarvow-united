// Local test entrypoint only. Never upload this module to the production Worker.
import auth, { IpAttemptGuard, PasskeyRegistry, normalizeIp } from '../auth-worker.mjs';

export class TestRegistry extends PasskeyRegistry {
  expire(kind) {
    if (kind === 'invitations') this.ctx.storage.sql.exec('UPDATE passkey_invitations SET expires_at=0');
    else this.ctx.storage.sql.exec('UPDATE passkey_flows SET expires_at=0');
  }
}

export class TestGuard extends IpAttemptGuard {
  seedLegacyLock(failures, cooldown) {
    this.ctx.storage.sql.exec('UPDATE attempt_state SET failures = ?, locked_until = ? WHERE id = 1',
      failures, cooldown ? Date.now() + 5 * 60 * 1000 : 0);
  }
  snapshot() {
    return this.ctx.storage.sql.exec('SELECT failures, locked_until FROM attempt_state WHERE id = 1').one();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/__test/expire-passkeys') {
      await env.PASSKEYS.getByName('portfolio-owner-v1').expire(url.searchParams.get('kind'));
      return Response.json({ok:true});
    }
    if (url.pathname === '/__test/no-ip') {
      const headers = new Headers(request.headers);
      headers.delete('CF-Connecting-IP');
      return auth.fetch(new Request('https://auth.test/v1/status', { headers }), env);
    }
    if (url.pathname === '/__test/normalize') {
      try { return Response.json({ ip: normalizeIp(url.searchParams.get('ip')) }); }
      catch { return new Response(null, { status: 400 }); }
    }
    if (url.pathname === '/__test/state') {
      const ip = normalizeIp(url.searchParams.get('ip'));
      const bytes = Uint8Array.from(atob(env.IP_HMAC_KEY_B64), char => char.charCodeAt(0));
      const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`ip-v1:${ip}`)));
      const name = Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('');
      const guard = env.IP_GUARD.getByName(name);
      if (url.searchParams.has('failures')) {
        await guard.seedLegacyLock(Number(url.searchParams.get('failures')), url.searchParams.get('cooldown') === '1');
      }
      return Response.json(await guard.snapshot());
    }
    return auth.fetch(request, env);
  },
};
