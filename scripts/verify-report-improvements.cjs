/*
 * Run against a static server serving public/ (or the deployed Pages site):
 *   NODE_PATH=/path/to/node_modules BASE_URL=http://127.0.0.1:8765/ node scripts/verify-report-improvements.cjs
 * Set STATIC_ONLY=1 to inspect the local source without launching a browser.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = ['index', 'about', 'experience', 'education', 'skills', 'projects', 'contact', 'sitemap'];
const languages = ['zh-HK', 'en', 'zh-CN'];
const locales = {'zh-HK': 'zh_HK', en: 'en_HK', 'zh-CN': 'zh_CN'};
const production = 'https://bernie8026.github.io/lunarvow-united/';
const sourceRoot = path.resolve(__dirname, '../public');
const base = new URL(process.env.BASE_URL || process.env.PORTFOLIO_BASE_URL || 'http://127.0.0.1:8765/');
if (!base.pathname.endsWith('/')) base.pathname += '/';

const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
  const named = {'&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>'};
  if (named[entity]) return named[entity];
  const hex = entity.slice(0, 3).toLowerCase() === '&#x';
  return String.fromCodePoint(parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10));
});
function attributes(markup) {
  return Object.fromEntries([...markup.matchAll(/([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(match => [match[1], decode(match[3])]));
}
function tags(markup, tag) {
  return [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
}
function only(values, description) {
  assert.equal(values.length, 1, `${description}: expected exactly one value`);
  assert(values[0], `${description}: must not be empty`);
  return values[0];
}
function pngSize(buffer) {
  assert(buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'share preview must be a PNG');
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR', 'share preview must have a PNG header');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
const staticDescriptions = new Map();
function checkStatic() {
  for (const name of pages) {
    const source = fs.readFileSync(path.join(sourceRoot, `${name}.html`), 'utf8');
    const head = source.split('</head>')[0];
    const meta = tags(head, 'meta');
    const links = tags(head, 'link');
    const getMeta = key => only(meta.filter(item => (item.property || item.name) === key).map(item => item.content), `${name} ${key}`);
    const description = getMeta('description');
    assert(description.length > 20, `${name}: meaningful static description`);
    staticDescriptions.set(name, description);
    assert.equal(getMeta('og:type'), 'website');
    assert.equal(getMeta('og:locale'), locales['zh-HK']);
    assert.equal(getMeta('og:description'), description);
    assert.equal(getMeta('twitter:description'), description);
    assert.equal(getMeta('og:title'), getMeta('twitter:title'));
    assert(getMeta('og:title').includes('Bernie Leung'));
    assert(getMeta('og:site_name').includes('Bernie Leung'));
    const image = `${production}assets/social-preview.png`;
    assert.equal(getMeta('og:image'), image, `${name}: absolute production share image`);
    assert.equal(getMeta('twitter:image'), image);
    assert.equal(getMeta('og:image:type'), 'image/png');
    assert.equal(getMeta('og:image:width'), '1200');
    assert.equal(getMeta('og:image:height'), '630');
    assert(getMeta('og:image:alt').length > 10);
    assert(getMeta('twitter:image:alt').length > 10);
    assert.equal(getMeta('twitter:card'), 'summary_large_image');
    const canonical = `${production}${name}.html?lang=zh-HK`;
    assert.equal(only(links.filter(item => item.rel === 'canonical').map(item => item.href), `${name} canonical`), canonical);
    assert.equal(getMeta('og:url'), canonical);
    const alternates = links.filter(item => item.rel === 'alternate' && item.hreflang);
    assert.equal(alternates.length, 4, `${name}: three languages plus x-default`);
    for (const language of [...languages, 'x-default']) {
      assert.equal(only(alternates.filter(item => item.hreflang === language).map(item => item.href), `${name} ${language} alternate`), `${production}${name}.html?lang=${language === 'x-default' ? 'zh-HK' : language}`);
    }
    assert(links.some(item => item.rel === 'icon' && item.href), `${name}: preserve favicon`);
    assert(getMeta('theme-color'), `${name}: preserve theme colour`);
  }
  assert.equal(new Set(staticDescriptions.values()).size, pages.length, 'each page must have its own description');
  const sitemap = fs.readFileSync(path.join(sourceRoot, 'sitemap.xml'), 'utf8');
  assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  assert(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  const entries = [...sitemap.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)].map(match => match[1]);
  assert.equal(entries.length, pages.length * languages.length, '24 sitemap language URLs');
  const found = new Set();
  for (const entry of entries) {
    const location = only([...entry.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(match => decode(match[1])), 'sitemap loc');
    assert(!found.has(location), `duplicate sitemap URL: ${location}`);
    found.add(location);
    const url = new URL(location);
    const name = path.posix.basename(url.pathname, '.html');
    assert(pages.includes(name) && languages.includes(url.searchParams.get('lang')), `unexpected sitemap URL: ${location}`);
    const alternates = tags(entry, 'xhtml:link');
    assert.equal(alternates.length, 4);
    for (const language of [...languages, 'x-default']) {
      assert.equal(only(alternates.filter(item => item.rel === 'alternate' && item.hreflang === language).map(item => item.href), `sitemap ${name} ${language}`), `${production}${name}.html?lang=${language === 'x-default' ? 'zh-HK' : language}`);
    }
    assert(alternates.some(item => item.href === location), 'sitemap alternatives include the entry itself');
  }
  for (const name of pages) for (const language of languages) assert(found.has(`${production}${name}.html?lang=${language}`));
  const robots = fs.readFileSync(path.join(sourceRoot, 'robots.txt'), 'utf8');
  assert(/^User-agent:\s*\*\s*$/m.test(robots));
  assert(/^Allow:\s*\/\s*$/m.test(robots));
  assert(robots.includes(`Sitemap: ${production}sitemap.xml`));
  assert.deepEqual(pngSize(fs.readFileSync(path.join(sourceRoot, 'assets/social-preview.png'))), [1200, 630]);
}

async function checkBrowser() {
  const {chromium} = require('playwright');
  const browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true});
  const errors = [];
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    await context.addInitScript(() => sessionStorage.setItem('bernie-portfolio-arrival-v2', 'complete'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => {
      if (request.url().startsWith(base.href)) console.error('Local request failed:', request.url(), request.failure());
    });
    page.on('response', response => {
      if (response.url().startsWith(base.href) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    for (const name of pages) {
      const response = await page.goto(new URL(`${name}.html?lang=en&v=report-test#top`, base).href);
      assert.equal(response.status(), 200, name);
      await page.locator('main h1').waitFor();
      const descriptions = new Set();
      for (const language of ['en', 'zh-CN', 'zh-HK']) {
        await page.locator(`[data-language="${language}"]`).click();
        const metadata = await page.evaluate(() => {
          const get = key => document.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content;
          return {
            language: document.documentElement.lang,
            title: document.title,
            description: get('description'),
            ogTitle: get('og:title'), twitterTitle: get('twitter:title'),
            ogDescription: get('og:description'), twitterDescription: get('twitter:description'),
            locale: get('og:locale'), localeAlternates: [...document.querySelectorAll('meta[property="og:locale:alternate"]')].map(item => item.content),
            canonical: document.querySelector('link[rel="canonical"]')?.href, ogURL: get('og:url'),
            image: get('og:image'), twitterImage: get('twitter:image'),
            currentLinks: [...document.querySelectorAll('a[aria-current="page"]')].map(link => link.href),
            invalidImages: [...document.images].filter(image => !/^\d+$/.test(image.getAttribute('width') || '') || !/^\d+$/.test(image.getAttribute('height') || '') || Number(image.getAttribute('width')) <= 0 || Number(image.getAttribute('height')) <= 0).map(image => image.getAttribute('src'))
          };
        });
        assert.equal(metadata.language, language, `${name}: content language`);
        assert.equal(metadata.ogTitle, metadata.title, `${name} ${language}: OG matches visible page title; errors: ${errors.join('; ')}`);
        assert.equal(metadata.twitterTitle, metadata.title);
        assert(metadata.description && metadata.description.length > 20 && !metadata.description.includes('undefined'));
        assert.equal(metadata.ogDescription, metadata.description);
        assert.equal(metadata.twitterDescription, metadata.description);
        if (language === 'zh-HK') assert.equal(metadata.description, staticDescriptions.get(name));
        descriptions.add(metadata.description);
        assert.equal(metadata.locale, locales[language]);
        assert.deepEqual(metadata.localeAlternates.sort(), languages.filter(item => item !== language).map(item => locales[item]).sort());
        assert.equal(metadata.canonical, `${production}${name}.html?lang=${language}`);
        assert.equal(metadata.ogURL, metadata.canonical);
        assert.equal(metadata.image, `${production}assets/social-preview.png`);
        assert.equal(metadata.twitterImage, metadata.image);
        assert(metadata.currentLinks.length > 0, `${name} ${language}: current-page navigation semantics`);
        for (const href of metadata.currentLinks) {
          const current = new URL(href);
          const normalized = current.pathname.endsWith('/') ? `${current.pathname}index.html` : current.pathname;
          assert.equal(normalized, new URL(`${name}.html`, base).pathname, `${name} ${language}: aria-current points to this page`);
        }
        assert.deepEqual(metadata.invalidImages, [], `${name}: image dimensions reserve layout space`);
      }
      assert.equal(descriptions.size, languages.length, `${name}: all descriptions are localised`);
    }
    const preview = await context.request.get(new URL('assets/social-preview.png', base).href);
    assert.equal(preview.status(), 200, 'published share-preview resource');
    assert.deepEqual(pngSize(await preview.body()), [1200, 630]);

    // Missing or invalid translations must retain readable copy or use the default-language value.
    await page.goto(new URL('about.html?lang=zh-HK', base).href);
    await page.evaluate(() => {
      Object.assign(window.PORTFOLIO_TEXT, {
        __report_partial__: {'zh-HK': '繁體兜底文字'},
        __report_invalid__: {'zh-HK': 42, en: null}
      });
      const cases = [
        ['partial', '__report_partial__', 'Original partial copy'],
        ['invalid', '__report_invalid__', 'Original readable copy'],
        ['missing', '__report_missing__', 'Original missing-key copy'],
        ['prototype', 'toString', 'Original prototype-key copy']
      ];
      for (const [id, key, copy] of cases) {
        const paragraph = document.createElement('p');
        paragraph.id = `report-${id}`;
        paragraph.dataset.i18n = key;
        paragraph.textContent = copy;
        document.querySelector('main').append(paragraph);
      }
      for (const [id, key, alt] of [['partial-alt', '__report_partial__', 'Original partial alt'], ['missing-alt', '__report_missing__', 'Original readable alt']]) {
        const image = document.createElement('img');
        image.id = `report-${id}`;
        image.dataset.alt = key;
        image.alt = alt;
        image.width = image.height = 1;
        image.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';
        document.querySelector('main').append(image);
      }
    });
    await page.locator('[data-language="en"]').click();
    assert.equal(await page.locator('#report-partial').textContent(), '繁體兜底文字');
    assert.equal(await page.locator('#report-invalid').textContent(), 'Original readable copy');
    assert.equal(await page.locator('#report-missing').textContent(), 'Original missing-key copy');
    assert.equal(await page.locator('#report-prototype').textContent(), 'Original prototype-key copy');
    assert.equal(await page.locator('#report-partial-alt').getAttribute('alt'), '繁體兜底文字');
    assert.equal(await page.locator('#report-missing-alt').getAttribute('alt'), 'Original readable alt');

    // Re-selecting the active language must preserve current filtered content and emit no render events.
    await page.goto(new URL('projects.html?lang=en', base).href);
    await page.locator('[data-search]').fill('Nikon');
    const stable = await page.evaluate(async () => {
      const main = document.querySelector('main');
      const items = [...main.querySelectorAll('[data-filter-item]')];
      const before = items.map(item => ({item, hidden: item.hidden}));
      const events = {language: 0, filter: 0};
      const languageEvent = () => events.language++;
      const filterEvent = () => events.filter++;
      document.addEventListener('portfolio:language', languageEvent);
      document.addEventListener('portfolio:filter', filterEvent);
      let mutations = 0;
      const observer = new MutationObserver(records => {mutations += records.length;});
      observer.observe(main, {subtree: true, childList: true, characterData: true});
      for (let index = 0; index < 3; index++) document.querySelector('[data-language="en"]').click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      observer.disconnect();
      document.removeEventListener('portfolio:language', languageEvent);
      document.removeEventListener('portfolio:filter', filterEvent);
      return {events, mutations, sameItems: before.every(({item, hidden}, index) => item === main.querySelectorAll('[data-filter-item]')[index] && item.hidden === hidden), query: main.querySelector('[data-search]').value};
    });
    assert.deepEqual(stable.events, {language: 0, filter: 0});
    assert.equal(stable.mutations, 0, 'active-language re-selection leaves the content DOM intact');
    assert(stable.sameItems, 'active-language re-selection preserves filter item nodes and visibility');
    assert.equal(stable.query, 'Nikon');

    // Exercise malformed events while animation handlers are enabled; reduced motion would skip those code paths.
    const motion = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'no-preference'});
    await motion.addInitScript(() => {
      sessionStorage.setItem('bernie-portfolio-arrival-v2', 'complete');
      localStorage.setItem('bernie-portfolio-motion', 'playing');
    });
    const animated = await motion.newPage();
    animated.on('pageerror', error => errors.push(`event robustness: ${error.message}`));
    await animated.goto(new URL('skills.html?lang=en', base).href);
    await animated.waitForFunction(() => !document.hidden && !document.body.classList.contains('is-booting') && !document.body.classList.contains('motion-paused'));
    await animated.evaluate(async () => {
      const zone = document.querySelector('[data-filter-zone="skills"]');
      const button = zone.querySelector('[data-filter]');
      const textTarget = document.createTextNode('event target probe');
      button.append(textTarget);
      textTarget.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      textTarget.remove();
      const foreign = document.createElement('div');
      foreign.getBoundingClientRect = () => {throw new Error('A foreign filter item must not be measured');};
      for (const detail of [undefined, null, {}, {items: null}, {items: 'invalid'}, {items: {}}, {items: [null, {}, 'invalid', document.createTextNode('invalid'), foreign, zone.querySelector('[data-filter-item]')]}]) {
        document.dispatchEvent(new CustomEvent('portfolio:filter', {detail}));
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await animated.locator('[data-filter="all"]').click();
    assert.equal(await animated.locator('[data-filter-item]:visible').count(), await animated.locator('[data-filter-item]').count(), 'filter remains usable after malformed events');
    assert.deepEqual(errors, [], 'no page errors or missing local resources');
  } finally {
    await browser.close();
  }
}
(async () => {
  checkStatic();
  if (process.env.STATIC_ONLY !== '1') await checkBrowser();
  console.log(`PASS: report SEO, sitemap and share-image checks${process.env.STATIC_ONLY === '1' ? ' (static only)' : '; 8 pages × 3 languages; current-page navigation; image dimensions; translation fallback; unchanged-language stability; malformed-event robustness'}.`);
})().catch(error => {console.error(error); process.exitCode = 1;});
