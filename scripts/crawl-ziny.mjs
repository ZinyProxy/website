/**
 * Crawl every public URL of ziny.io and save the visual + structural ground
 * truth locally. Run: `node scripts/crawl-ziny.mjs`. Designed to be safely
 * re-run — already-captured pages with the same URL are overwritten.
 *
 * Per page, into reference/pages/<slug>/:
 *   desktop.png   — full-page screenshot at 1440x900 viewport
 *   mobile.png    — full-page screenshot at 390x844 (iPhone 13-ish)
 *   page.html     — rendered DOM after JS settles (post-Elementor)
 *   meta.json     — title, description, viewport, key counts
 *
 * Usage:
 *   node scripts/crawl-ziny.mjs                    # all URLs in sitemap
 *   node scripts/crawl-ziny.mjs --only home        # just the homepage
 *   node scripts/crawl-ziny.mjs --limit 5          # first N URLs
 *   node scripts/crawl-ziny.mjs --filter residential  # URLs matching substring
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// --- args ---
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const only = arg('--only');
const limit = parseInt(arg('--limit') ?? '0', 10) || 0;
const filter = arg('--filter');

// --- URL list ---
const all = readFileSync('reference/sitemap/all-urls.txt', 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean);
let urls = all;
if (only === 'home') urls = ['https://ziny.io/'];
if (filter) urls = urls.filter((u) => u.includes(filter));
if (limit > 0) urls = urls.slice(0, limit);
console.log(`crawling ${urls.length} URLs of ${all.length} total`);

// --- helpers ---
const slugOf = (u) => {
  const path = new URL(u).pathname.replace(/^\/|\/$/g, '');
  return path === '' ? 'home' : path.replace(/\//g, '__');
};

// --- crawl ---
const browser = await chromium.launch();
const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) ZinyCrawler/1.0' });
const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone) ZinyCrawler/1.0' });

let ok = 0, fail = 0;
for (const [i, url] of urls.entries()) {
  const slug = slugOf(url);
  const dir = join('reference', 'pages', slug);
  mkdirSync(dir, { recursive: true });
  // Idempotent: skip if both screenshots + html already on disk.
  if (existsSync(join(dir, 'desktop.png')) && existsSync(join(dir, 'mobile.png')) && existsSync(join(dir, 'page.html'))) {
    console.log(`[${i + 1}/${urls.length}] ${slug} … skip (already captured)`);
    ok++;
    continue;
  }
  process.stdout.write(`[${i + 1}/${urls.length}] ${slug} … `);

  try {
    const pageD = await ctxDesktop.newPage();
    await pageD.goto(url, { waitUntil: 'load', timeout: 60000 });
    await pageD.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // Allow late animations (globe etc.) one tick to render before snapshot.
    await pageD.waitForTimeout(800);
    await pageD.screenshot({ path: join(dir, 'desktop.png'), fullPage: true });
    const html = await pageD.content();
    writeFileSync(join(dir, 'page.html'), html);
    const meta = await pageD.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content ?? null,
      h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()),
      h2: [...document.querySelectorAll('h2')].map((h) => h.innerText.trim()),
      sections: document.querySelectorAll('section, .elementor-section').length,
      images: document.images.length,
    }));
    writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
    await pageD.close();

    const pageM = await ctxMobile.newPage();
    await pageM.goto(url, { waitUntil: 'load', timeout: 60000 });
    await pageM.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await pageM.waitForTimeout(600);
    await pageM.screenshot({ path: join(dir, 'mobile.png'), fullPage: true });
    await pageM.close();

    console.log('ok');
    ok++;
  } catch (e) {
    console.log(`FAIL: ${e.message}`);
    fail++;
  }
}

await browser.close();
console.log(`\ndone: ${ok} ok, ${fail} failed`);
