# Password-protected portfolio

The existing GitHub Pages address and page routes are retained. The published
`docs/` directory contains a password gate, its runtime, and one encrypted site
archive. Original pages, scripts, styles and images are inside that archive.

## Local source and password

`public/` is the editable local source. `source/` contains the older reference
snapshot. Both directories are ignored and removed from the current GitHub tree;
keep local backups before moving to another computer. Historical public commits
remain public and are not protected by this deployment.

The default password file is `../lunarvow-private/access-password.txt`, outside
this repository. It must contain one password line. Keep it private and backed up.
Set `PORTFOLIO_PASSWORD_FILE` to use a different private file. Never put a password
or a decryption key in Git, HTML, JavaScript, a URL or a build log.

## Build and preview

With Node.js installed, run:

```sh
node scripts/prepare-site.cjs
node scripts/serve-preview.cjs
```

Open `http://127.0.0.1:8766/lunarvow-united/`. HTTPS or localhost, JavaScript,
Web Crypto, service workers and gzip decompression are required. Opening a
published HTML file directly from disk does not unlock it.

The build validates the password file before changing public output. It prepares
plaintext content only in the ignored `.private/plain-site/` directory, then
replaces `docs/` with the verified encrypted deployment. A missing password or
failed build does not publish plaintext. GitHub Pages remains **main /docs**.
Publish only the protected `docs/` output and the public build/runtime files.

The homepage is authored in `public/index.html` and `public/assets/home*`.
The personal profile is in `public/about.html` and `public/assets/about-apple*`;
both pages share `public/assets/apple-shell.css` for page colours and footer type.
All eight pages use the same navigation in `public/assets/theme.css`: a numbered
left rail above 1000px, and an expandable top menu on narrower screens.
They use large typography, subject-specific motion, three-language copy and
responsive light/dark layouts. These source files remain local;
the published update is included only in the encrypted archive. Each build
also changes the worker revision so browser update checks can discard an old
in-memory publication and require a fresh unlock.

The experience page is in `public/experience.html` and
`public/assets/experience-neon.*`. Its blue city-poster scene uses the supplied
Edgerunners video in `public/assets/experience/`, with a decoded poster fallback.
The video body and poster are preloaded before entry; muted playback pauses
outside the viewport, on the global motion control, or with reduced motion.
Private media supports byte ranges without entering persistent browser storage.

The encrypted archive uses AES-256-GCM with a fresh random salt and IV for each
build. A key is derived with PBKDF2-HMAC-SHA256 and 600,000 iterations. The
password is not included in the archive or public output. Changing the password
file and rebuilding changes the access password for the new deployment.

## Browser behaviour and limits

After a successful unlock, the original site is served at its existing URLs from
service-worker memory. Decrypted files and keys are not saved to CacheStorage,
IndexedDB or browser storage. The footer lock button clears that memory and locks
all open portfolio tabs. Browser worker eviction or a new browser session can
require the password again.

An authorised viewer can inspect and save the content and code after unlocking.
Encryption cannot revoke older public commits, downloads, browser copies or
already unlocked sessions on another device. This static deployment has no
server-side account system or password-attempt rate limiting; use a strong,
unique password.

## Verification and recovery

With Playwright and Chrome available, run against the protected local preview:

```sh
node scripts/verify-protection.cjs
node scripts/verify-preloader.cjs
node scripts/verify-home.cjs
node scripts/verify-about-apple.cjs
node scripts/verify-unified-navigation.cjs
node scripts/verify-experience-neon.cjs
node scripts/verify-protected-media.cjs
```

The suite checks locked routes and assets, wrong passwords, authenticated archive
integrity, the original eight pages, images, animations, navigation, languages,
mobile layout, storage, cross-tab locking and worker restarts. Its original-source
comparison uses the local pre-protection snapshot; set `PORTFOLIO_SOURCE_DIR` to
an equivalent baseline directory if needed. Set `PORTFOLIO_BASE_URL` to test a
different protected deployment.

To recover the encrypted publication into a **new local directory**:

```sh
node scripts/prepare-protected-site.cjs --decrypt docs/protected-site.json --output ../recovered-portfolio
```

The private password file is still required. Recovery does not publish anything;
keep recovered plaintext outside the repository. There is no password reset that
can recover the encrypted archive without its password or a plaintext backup.
