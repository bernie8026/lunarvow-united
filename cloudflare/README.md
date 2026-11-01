# Portfolio access service

The existing GitHub Pages URL serves the password gate and an AES-256-GCM encrypted archive. The archive uses a random 256-bit data key, independent of the login password. Only this Cloudflare Worker releases that key, after checking the password and persistent IP state. The browser rejects the former password-derived archive format.

Each normalized client IP maps to a separate SQLite Durable Object through a server-secret HMAC. Records contain only cumulative failure count and cooldown time. The Worker uses Cloudflare's `CF-Connecting-IP`, ignores browser-supplied IP overrides, restricts browser origins to the portfolio, and does not log request bodies, passwords, keys, or raw IPs.

Wrong attempts 3, 6, and 9 start a five-minute cooldown. Attempt 10 permanently blocks the IP. Blocked requests do not add attempts. Successful authentication does not reset the cumulative count. Decisions and writes run synchronously in one SQLite transaction, including a second lock check after asynchronous password verification.

Deployment metadata is recorded in `deployment.json`. It is descriptive API metadata, not a Wrangler configuration. Deploy using the connected Cloudflare API. Create the SQLite class with the recorded migration only on its first upload; subsequent uploads preserve its namespace and secrets. Enable the production workers.dev subdomain and disable preview URLs.

Secrets belong in Cloudflare Worker secret bindings. The private local backup is `../lunarvow-private/cloudflare-access.json`, outside this repository, with file mode 0600. It holds the archive key, its generation identifier, IP HMAC key, and an independent owner recovery credential. The login password remains in the existing separate private password file; only its SHA-256 verifier is uploaded. This verifier is suitable for the existing randomly generated high-entropy password. Choosing a human-memorable password requires revisiting the password hashing scheme.

## Owner recovery

From the repository, run `node scripts/unblock-site-ip.cjs self` to reset the public IP used by that command, or `node scripts/unblock-site-ip.cjs <IP>` to reset a known visitor IP. The script silently reads the independent owner credential from the private file and sends it in an HTTPS Authorization header. Never put that credential into a URL or commit the private file. Reload the gate afterwards.

If the private owner credential is lost, use the Cloudflare account to replace its `ADMIN_TOKEN_SHA256` secret and store the new recovery credential privately. Rotating the IP HMAC key changes all IP identities and therefore resets effective counters; preserve it during routine deployments. Rotating archive keys requires coordinated Worker and encrypted-site publication. Ordinary website builds retain the key generation and use a fresh AES-GCM IV.

## Validation

Run `node --test cloudflare/test/auth.test.mjs` after installing the pinned dependencies in this directory. The suite uses Miniflare/workerd and actual SQLite storage. Its auxiliary test subclass can expire a cooldown for fast tests; it is never uploaded with the production module. Browser verification scripts use an explicitly intercepted authentication fixture locally. A live smoke check must additionally exercise the deployed API and GitHub Pages unlock.

IP limits affect users sharing the same public IP. A visitor with a different public IP has a separate counter. These controls govern new unlocks; they cannot revoke content or keys already received by an authorized browser, or retract old archives and plaintext previously published in repository history.
