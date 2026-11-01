# Portfolio access service

The existing GitHub Pages URL serves the unlock gate and an AES-256-GCM encrypted archive. The archive uses a random 256-bit data key, independent of the login password. Only this Cloudflare Worker releases that key, after verifying the password or a registered Passkey and checking persistent IP state. The browser rejects the former password-derived archive format.

Each normalized client IP maps to a separate SQLite Durable Object through a server-secret HMAC. Records contain only cumulative failure count and cooldown time. The Worker uses Cloudflare's `CF-Connecting-IP`, ignores browser-supplied IP overrides, restricts browser origins to the portfolio, and does not log request bodies, passwords, keys, or raw IPs.

Wrong attempts 3, 6, and 9 start a five-minute cooldown. Attempt 10 permanently blocks the IP. Blocked requests do not add attempts. Successful authentication does not reset the cumulative count. Decisions and writes run synchronously in one SQLite transaction, including a second lock check after asynchronous password verification.

Deployment metadata is recorded in `deployment.json`. It is descriptive API metadata, not a Wrangler configuration. Build the maintained WebAuthn dependency with `node scripts/build-access-worker.cjs` and upload only its `.private/passkey-worker.mjs` bundle using the connected Cloudflare API. Create each SQLite class with its recorded migration only on first upload; subsequent uploads preserve both namespaces and all secret bindings. Enable the production workers.dev subdomain and disable preview URLs. Never upload the test harness.

Secrets belong in Cloudflare Worker secret bindings. The private local backup is `../lunarvow-private/cloudflare-access.json`, outside this repository, with file mode 0600. It holds the archive key, its generation identifier, IP HMAC key, and an independent owner recovery credential. The login password remains in the existing separate private password file; only its SHA-256 verifier is uploaded. This verifier is suitable for the existing randomly generated high-entropy password. Choosing a human-memorable password requires revisiting the password hashing scheme.

## Owner recovery

From the repository, run `node scripts/unblock-site-ip.cjs self` to reset the public IP used by that command, or `node scripts/unblock-site-ip.cjs <IP>` to reset a known visitor IP. The script silently reads the independent owner credential from the private file and sends it in an HTTPS Authorization header. Never put that credential into a URL or commit the private file. Reload the gate afterwards.

If the private owner credential is lost, use the Cloudflare account to replace its `ADMIN_TOKEN_SHA256` secret and store the new recovery credential privately. Rotating the IP HMAC key changes all IP identities and therefore resets effective counters; preserve it during routine deployments. Rotating archive keys requires coordinated Worker and encrypted-site publication. Ordinary website builds retain the key generation and use a fresh AES-GCM IV.

## Validation

Run `node --test cloudflare/test/*.test.mjs` after installing the pinned dependencies in this directory. The suite uses Miniflare/workerd and actual SQLite storage. Its auxiliary test subclass can expire a cooldown for fast tests; it is never uploaded with the production module. Existing password-browser checks use an explicitly intercepted authentication fixture locally; the Passkey browser suite uses the real verifier with a virtual authenticator. A live smoke check must additionally exercise the deployed API and GitHub Pages unlock. `node scripts/verify-passkeys-live.cjs` registers a temporary signed test credential and revokes it in cleanup without changing existing credentials or password failure counts.

IP limits affect users sharing the same public IP. A visitor with a different public IP has a separate counter. These controls govern new unlocks; they cannot revoke content or keys already received by an authorized browser, or retract old archives and plaintext previously published in repository history.

## Passkeys

Passkey registration requires an owner-issued, one-use invitation. Run `node scripts/manage-passkeys.cjs invite --open` from the repository to open the real HTTPS enrollment page. A private copy is saved as `../lunarvow-private/register-passkey.html` outside this repository. Invitations expire after 30 minutes; creating a new one invalidates previous unused invitations. The URL fragment is removed immediately by the gate, and the token is held only in memory. The dedicated `unlock.html` gate supports enrollment even while other tabs are already unlocked.

The owner confirms registration using their device or password manager. Afterwards the public “Use a passkey” button requests an explicit WebAuthn ceremony. No automatic biometric prompt is started on page load. Browser-native device selection provides iCloud Keychain, compatible security keys, or nearby-phone QR options. Required user verification may use Face ID, Touch ID, or device PIN. The server stores credential public keys and metadata, never biometric templates or a private key. The RP ID is `bernie8026.github.io`, and the expected browser origin is exactly `https://bernie8026.github.io`; a future domain change needs a planned passkey migration.

`PasskeyRegistry` is a separate SQLite Durable Object for the one owner account. Its five-minute challenges are single use, bound to the initiating IP pseudonym, origin, archive generation and ceremony type. Registration atomically consumes the invitation. Authentication verifies the signed challenge, origin, RP ID and user verification using the pinned `@simplewebauthn/server` package. Synced zero-counter credentials are supported. Existing IP locks are checked before and after signature verification. Cancelled or invalid passkey attempts do not add lifetime password failures; a separate 20-request/minute/IP ceremony budget limits abuse.

Run `node scripts/manage-passkeys.cjs list` to see public credential identifiers and `node scripts/manage-passkeys.cjs revoke <credentialId>` to revoke a credential. Owner administration uses the existing independent owner credential. Revocation stops future unlocks; it cannot retract data already delivered to an unlocked browser.

`scripts/verify-passkeys.cjs` exercises Chrome's virtual authenticator with the real Worker verifier and SQLite on isolated local HTTPS test origins. It validates registration and authentication signatures without contacting production. It cannot validate a physical Apple biometric prompt, iCloud syncing, or nearby-device QR UI; the owner completes that final device confirmation.
