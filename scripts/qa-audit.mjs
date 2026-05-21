/**
 * QA sweep of the built site (served by `npm run preview` on :4321).
 * For every page: records failed network requests (404 CSS/fonts/icons/images),
 * broken <img> (naturalWidth 0), and console errors. Aggregates globally so we
 * see exactly which assets are missing and which pages are affected.
 *
 * Run: node scripts/qa-audit.mjs   (preview server must be running)
 */
import { chromium } from 'playwright';
import { readdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:4321';
const slugs = readdirSync('src/captured')
  .filter((f) => f.endsWith('.body.html'))
  .map((f) => f.replace(/\.body\.html$/, ''));

const pathOf = (slug) => (slug === 'home' ? '/' : `/${slug.replace(/__/g, '/')}/`);

const failedAssets = new Map();   // url -> {status, pages:Set}
const brokenImgs = new Map();     // url -> Set(pages)
const consoleErrs = new Map();    // page -> [msgs]
const pageBrokenCount = new Map(); // page -> count

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

let i = 0;
for (const slug of slugs) {
  const p = pathOf(slug);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  page.on('response', (r) => {
    if (r.status() >= 400) {
      const u = r.url().replace(BASE, '');
      if (!failedAssets.has(u)) failedAssets.set(u, { status: r.status(), pages: new Set() });
      failedAssets.get(u).pages.add(p);
    }
  });
  try {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(400);
    const broken = await page.evaluate(() =>
      [...document.images]
        .filter((im) => im.currentSrc && im.naturalWidth === 0 && !im.src.startsWith('data:'))
        .map((im) => im.currentSrc),
    );
    for (const b of broken) {
      const u = b.replace(location.origin, '');
      if (!brokenImgs.has(u)) brokenImgs.set(u, new Set());
      brokenImgs.get(u).add(p);
    }
    if (broken.length) pageBrokenCount.set(p, broken.length);
  } catch (e) {
    errs.push(`NAV FAIL: ${e.message.slice(0, 120)}`);
  }
  if (errs.length) consoleErrs.set(p, errs);
  await page.close();
  if (++i % 25 === 0) console.log(`  ${i}/${slugs.length}`);
}
await browser.close();

// --- report ---
const lines = [];
lines.push('=== FAILED ASSET REQUESTS (404/5xx) — deduped, with #pages affected ===');
for (const [u, { status, pages }] of [...failedAssets.entries()].sort((a, b) => b[1].pages.size - a[1].pages.size))
  lines.push(`  [${status}] ${u}  (${pages.size} pages)`);
lines.push('');
lines.push('=== BROKEN <img> (naturalWidth 0) — deduped, with #pages ===');
for (const [u, pages] of [...brokenImgs.entries()].sort((a, b) => b[1].size - a[1].size))
  lines.push(`  ${u}  (${pages.size} pages)`);
lines.push('');
lines.push(`=== PAGES WITH CONSOLE ERRORS: ${consoleErrs.size} ===`);
for (const [p, e] of [...consoleErrs.entries()].slice(0, 30)) lines.push(`  ${p}: ${e[0]}`);
lines.push('');
lines.push(`SUMMARY: ${failedAssets.size} distinct failed assets, ${brokenImgs.size} distinct broken imgs, ${consoleErrs.size}/${slugs.length} pages w/ console errors`);

const report = lines.join('\n');
writeFileSync('reference/qa-report.txt', report);
console.log('\n' + report.slice(0, 4000));
