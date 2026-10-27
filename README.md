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

Focusing or typing in the password field warms one in-memory download of the
public ciphertext. Submitting immediately opens the blue loading animation:
known-length downloads report actual byte progress; unknown lengths show bytes
received. Password verification, decompression and opening the page have distinct
indeterminate phases. Failed downloads can be retried, and incorrect passwords
reuse the downloaded ciphertext. Credentials and plaintext are never persisted.
The existing page resource checks and two-second hold after readiness still gate
the first reveal; no simulated percentage or extra unlock delay is added.

The homepage is authored in `public/index.html` and `public/assets/home*`.
The personal profile is in `public/about.html` and `public/assets/about-apple*`;
both pages share `public/assets/apple-shell.css` for page colours and footer type.
All eleven pages use the same navigation in `public/assets/theme.css`: a numbered
left rail above 1000px, and an expandable top menu on narrower screens.
They use large typography, subject-specific motion, seven-language copy and
responsive light/dark layouts. These source files remain local;
the published update is included only in the encrypted archive. Each build
also changes the worker revision so browser update checks can discard an old
in-memory publication and require a fresh unlock.

The rounded navigation uses `public/assets/theme.css` and
`public/assets/navigation-glass.css`. All eleven pages mount
`public/assets/language-glass.js`: moving a mouse over the numbered links,
brand, language choices, theme control or mobile menu reveals a spring-driven
Liquid Glass lens, magnifying the actual labels through a refractive rim.
Hovering only previews; activation still requires a click or keyboard action.
Moving outside, Escape, resizing or leaving the page dismisses the lens.
Touch taps and the existing language drag selection remain available.
Keyboard focus has the same optical feedback. Reduced motion and pause keep
static magnification without the spring movement.

The eight main navigation destinations remain direct links. The Projects entry
has no added arrow or category drawer. Every page has the same always-visible
five-column footer directory, following the grouped sitemap layout of Queen's
College (https://www.qc.edu.hk/). Headings group profile, work and learning,
projects, equipment references and contact links. It uses the existing cool blue
palette, becomes three columns on tablets and two on phones, and follows all
seven languages. Shared source files are `public/assets/footer-content.js` and
`public/assets/footer-directory.css`; links use the existing navigation router.

The homepage opens with a full-bleed, three-story carousel: photography equipment,
Lunar Vow web design and the Aerovate concept. It reuses existing credited images
and translated copy, with an overlaid heading, project link, numbered topics,
previous/next controls, swipe input and a pause button. Autoplay waits for entry
and stops during hover, keyboard focus, offscreen/hidden state, reduced motion
or the global animation pause. Modules live in `public/assets/home-carousel.*`,
`home-carousel.css` and `features-content.js`.
The existing eleven-page portfolio, access password and encrypted publication
workflow remain in place.

All eleven pages and the access gate support Hong Kong Traditional Chinese,
English, Simplified Chinese, Japanese (`ja`), Korean (`ko`), Thai (`th`) and
Russian (`ru`). The four additional full dictionaries are editable in the local
`public/assets/locales/` folder. `prepare-locales.cjs` checks all 460 keys and
placeholders, then builds a single preloaded module before encryption. Each
page reapplies its translations during soft navigation. On phones the seven
language choices share their own row; the existing glass drag stays available.

The experience page is in `public/experience.html` and
`public/assets/experience-neon.*`. Its blue Golden Arches scene uses the animated
McDonald's logo in `public/assets/experience/`, with a decoded poster fallback.
The unchanged logo silhouette comes from [McDonald's Hong Kong](https://www.mcdonalds.com.hk/images/logo.svg),
recoloured cyber blue with a six-second scan, displaced slices and optical echoes.
The video body and poster are preloaded before entry; muted playback pauses
outside the viewport, on the global motion control, or with reduced motion.
Private media supports byte ranges without entering persistent browser storage.
Headings and key labels also use brief blue signal slices and scanning echoes
on entry, every six seconds in view, and on hover or keyboard focus. The original
translated text remains readable and is announced once; pause, reduced motion,
offscreen content and page disposal stop and reset these effects.

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
node scripts/verify-unlock-loading.cjs
node scripts/verify-preloader.cjs
node scripts/verify-home.cjs
node scripts/verify-about-apple.cjs
node scripts/verify-unified-navigation.cjs
node scripts/verify-experience-neon.cjs
node scripts/verify-language-glass.cjs
node scripts/verify-navigation-glass.cjs
node scripts/verify-featured-navigation.cjs
node scripts/verify-footer-directory.cjs
node scripts/verify-expansion.cjs
node scripts/verify-locales.cjs
node scripts/verify-protected-media.cjs
```

The suite checks locked routes and assets, wrong passwords, authenticated archive
integrity, the eleven portfolio pages, images, animations, navigation, languages,
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

## Dedicated creative topics

Pages 06–08 add `photography.html`, `equipment.html` and `stem.html` to the shared
navigation, homepage directory, grouped footer and sitemap. Photography presents
composition and lighting studies as explicitly labelled diagrams; no supplied
photograph is invented. Equipment retains the existing official Nikon/Godox
images, verified specifications and source links. STEM presents Aerovate as a
student concept with Tello EDU as a reference, not an owned prototype. Original
Projects content and anchors remain available. Each page has seven-language copy,
its own visual layout and motion, with reduced-motion and pause support.
The rail compacts at short desktop heights so eight entries fit beside languages.
Only encrypted content and password gates are published.

Quick preview after unlocking: [06 Photography](https://bernie8026.github.io/lunarvow-united/photography.html?lang=zh-HK),
[07 Equipment](https://bernie8026.github.io/lunarvow-united/equipment.html?lang=zh-HK) and
[08 STEM Lab](https://bernie8026.github.io/lunarvow-united/stem.html?lang=zh-HK).
