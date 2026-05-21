/**
 * Fetch the INITIAL server HTML for every ziny.io URL (no browser, no JS).
 * This is the clean source for the 1:1 rebuild — the post-JS DOM has
 * Elementor's sticky-header clone + lazyload mutations baked in, which break
 * when served statically. Saves to reference/raw/<slug>.html.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'reference/raw';
mkdirSync(OUT, { recursive: true });

const urls = readFileSync('reference/sitemap/all-urls.txt', 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean);

const slugOf = (u) => {
  const p = new URL(u).pathname.replace(/^\/|\/$/g, '');
  return p === '' ? 'home' : p.replace(/\//g, '__');
};

let ok = 0, fail = 0;
// Fetch in small parallel batches to be quick but polite.
const BATCH = 8;
for (let i = 0; i < urls.length; i += BATCH) {
  const slice = urls.slice(i, i + BATCH);
  await Promise.all(slice.map(async (u) => {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(join(OUT, `${slugOf(u)}.html`), await res.text());
      ok++;
    } catch (e) {
      console.warn(`! ${u}: ${e.message}`);
      fail++;
    }
  }));
  process.stdout.write(`\r  ${ok + fail}/${urls.length}`);
}
console.log(`\n✓ fetched ${ok}, failed ${fail}`);
