/**
 * Re-fetch the raw HTML for pages where source-diff > 1.5%. Those are pages
 * whose WP content drifted since the initial crawl. Pulls fresh raw HTML so
 * the next build-all-pages run picks up the latest content.
 *
 * Driven by reference/source-diff/report.json — anything with diffPct > 1.5
 * is re-fetched (skipping known-noise threshold).
 *
 * Run: node scripts/refetch-drifted.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { WP_ORIGIN } from "./_config.mjs";

const THRESHOLD = 1.5;
const report = JSON.parse(readFileSync("reference/source-diff/report.json", "utf8"));
const drifted = report.filter((r) => (r.diffPct || 0) > THRESHOLD);
console.log(`re-fetching ${drifted.length} drifted pages (source-diff > ${THRESHOLD}%)…`);

let ok = 0, fail = 0, skipped = 0;
for (const r of drifted) {
  const url = `${WP_ORIGIN}${r.path}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ziny-rebuild/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const before = (() => { try { return require("node:fs").statSync(`reference/raw/${r.slug}.html`).size; } catch { return 0; } })();
    writeFileSync(`reference/raw/${r.slug}.html`, text);
    console.log(`  ✓ ${r.slug.padEnd(50)} ${r.diffPct.toString().padStart(5)}%  ${before}B → ${text.length}B`);
    ok++;
  } catch (e) {
    console.warn(`  ! ${r.slug}: ${e.message}`);
    fail++;
  }
}
console.log(`\ndone: ${ok} re-fetched, ${fail} failed`);
console.log("next: run scripts/build-all-pages.mjs + scripts/extract-heads.mjs + npm run build");
