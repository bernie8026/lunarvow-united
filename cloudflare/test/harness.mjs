// Local test entrypoint only. Never upload this module to the production Worker.
import auth, { IpAttemptGuard, normalizeIp } from '../auth-worker.mjs';

export class TestGuard extends IpAttemptGuard {
  expireCooldown() {
    this.ctx.storage.sql.exec('UPDATE attempt_state SET locked_until = 0 WHERE id = 1');
  }
  snapshot() {
    return this.ctx.storage.sql.exec('SELECT failures, locked_until FROM attempt_state WHERE id = 1').one();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
      if (url.searchParams.get('expire') === '1') await guard.expireCooldown();
      return Response.json(await guard.snapshot());
    }
    return auth.fetch(request, env);
  },
};
