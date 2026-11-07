# Passkey-protected portfolio

The existing GitHub Pages address and page routes are retained. The published
`docs/` directory contains a passkey gate, its runtime, and one encrypted site
archive. Original pages, scripts, styles and images are inside that archive.

## Local source and access configuration

`public/` is the editable local source. `source/` contains the older reference
snapshot. Both directories are ignored and removed from the current GitHub tree;
keep local backups before moving to another computer. Historical public commits
remain public and are not protected by this deployment.

The build needs the private archive configuration at
`../lunarvow-private/cloudflare-access.json`. Keep the independent archive key
and owner recovery credential backed up privately. See the
[access service guide](cloudflare/README.md) for enrollment and recovery.
Do not commit keys, invitation tokens, or plaintext backups.

## Build and preview

With Node.js installed, run:

```sh
node scripts/prepare-site.cjs
node scripts/serve-preview.cjs
```

Open `http://127.0.0.1:8766/lunarvow-united/`. HTTPS or localhost, JavaScript,
Web Crypto, service workers and gzip decompression are required. Opening a
published HTML file directly from disk does not unlock it. The local server
previews the gate only; use the isolated browser suite below to exercise login
without the production website origin and device credential.

The build validates the private access configuration before changing public
output. It prepares plaintext only in the ignored `.private/plain-site/`
directory, then replaces `docs/` with the verified encrypted deployment.
GitHub Pages remains **main /docs**.

Selecting **Use a passkey** starts the device verification ceremony and retains
the blue loading animation. Real download progress, device verification,
decryption and opening the requested page are shown as separate phases. The
existing page readiness checks and two-second hold still apply to entry.
Device verification can use Face ID, Touch ID, a device PIN or a compatible
security key, depending on the browser and credential provider.

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
The existing eleven-page portfolio and encrypted publication
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

The encrypted archive uses AES-256-GCM with a fresh IV on every build and a
random 256-bit archive key independent of login. The authentication service
releases the key after a valid assertion from a registered passkey.

## Browser behaviour and limits

After unlock, the site is served at its existing URLs from Service Worker
memory. The site does not persist the archive key or decrypted files in browser
storage. An authorised viewer can still copy files or retain the key received at
unlock. Removing password login does not revoke previously released keys or
protect old public copies. The footer lock and worker eviction can require a new
passkey login.

## Verification and recovery

Run the current authentication checks with the pinned backend dependencies,
Chrome, and Playwright available:

```sh
node --test cloudflare/test/*.test.mjs
node scripts/verify-passkeys.cjs
```

The browser suite creates a local encrypted fixture and virtual authenticator,
then exercises the real WebAuthn verifier and SQLite without connecting to
production. After preparing the local content with `node scripts/prepare-content.cjs`,
run `node scripts/verify-locales.cjs` and `node scripts/verify-unlock-loading.cjs`
for the seven-language UI and unlock progress checks. Older visual and security
scripts using a password form target the
historical password build and are not passkey migration checks.

Recover a current encrypted publication into a **new local directory** with
the matching private archive configuration:

```sh
node scripts/prepare-protected-site.cjs --decrypt docs/protected-site.json --output ../recovered-portfolio
```

Recovery does not publish anything. Keep the recovered files outside this
repository. A passkey or new login configuration cannot recover an archive if
its matching archive key and plaintext backup are both lost.

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
Only encrypted content and passkey gates are published.

Quick preview after unlocking: [06 Photography](https://bernie8026.github.io/lunarvow-united/photography.html?lang=zh-HK),
[07 Equipment](https://bernie8026.github.io/lunarvow-united/equipment.html?lang=zh-HK) and
[08 STEM Lab](https://bernie8026.github.io/lunarvow-united/stem.html?lang=zh-HK).
