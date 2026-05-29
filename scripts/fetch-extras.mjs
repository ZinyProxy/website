/**
 * Fetch the URLs Phase 3 missed: category/blog pagination, RSS feeds, 404 page.
 * Run: node scripts/fetch-extras.mjs
 *
 * Outputs:
 *   reference/raw/<slug>.html              — pagination pages (fed into build-all-pages.mjs)
 *   reference/raw/__404.html               — 404 page (HTML body)
 *   public/feed/index.xml                  — site RSS
 *   public/category/<slug>/feed/index.xml  — per-category RSS
 *   reference/sitemap/all-urls.txt         — appended with new pagination URLs (deduped)
 *
 * Idempotent: skips files that already exist on disk.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { WP_ORIGIN } from "./_config.mjs";

const ORIGIN = WP_ORIGIN;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ziny-rebuild/1.0";

const PAGINATION_URLS = [
  // proxy-blog index has 9 pages total; page/1/ is the index already captured
  ...Array.from({ length: 8 }, (_, i) => `${ORIGIN}/proxy-blog/page/${i + 2}/`),
  ...Array.from({ length: 5 }, (_, i) => `${ORIGIN}/category/guide/page/${i + 2}/`),
  ...Array.from({ length: 3 }, (_, i) => `${ORIGIN}/category/information/page/${i + 2}/`),
  ...Array.from({ length: 2 }, (_, i) => `${ORIGIN}/category/uncategorized/page/${i + 2}/`),
];

const FEED_URLS = [
  `${ORIGIN}/feed/`,
  `${ORIGIN}/category/guide/feed/`,
  `${ORIGIN}/category/information/feed/`,
  `${ORIGIN}/category/uncategorized/feed/`,
  `${ORIGIN}/category/proxy-partners-tutorials/feed/`,
  `${ORIGIN}/category/use-cases/feed/`,
];

const FOUR_OH_FOUR_URL = `${ORIGIN}/__definitely-not-a-real-page-${Date.now()}/`;

const slugOf = (url) => {
  const p = new URL(url).pathname.replace(/^\/|\/$/g, "");
  return p === "" ? "home" : p.replace(/\//g, "__");
};

async function fetchText(url, { allow404 = false } = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok && !(allow404 && r.status === 404)) throw new Error(`${r.status} ${r.statusText}`);
  return { status: r.status, text: await r.text() };
}

function writeIfNew(file, content) {
  if (existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return true;
}

// ---- 1. Pagination raw HTML ------------------------------------------------
console.log("Pagination pages →");
for (const url of PAGINATION_URLS) {
  const slug = slugOf(url);
  const out = `reference/raw/${slug}.html`;
  if (existsSync(out)) { console.log(`  skip ${slug}`); continue; }
  try {
    const { text } = await fetchText(url);
    writeFileSync(out, text);
    console.log(`  ✓ ${slug}`);
  } catch (e) {
    console.warn(`  ! ${slug}: ${e.message}`);
  }
}

// ---- 2. RSS feeds → public/ (ship as static XML) ---------------------------
console.log("\nRSS feeds →");
for (const url of FEED_URLS) {
  const p = new URL(url).pathname; // e.g. /category/guide/feed/
  const out = `public${p}index.xml`; // public/category/guide/feed/index.xml
  if (existsSync(out)) { console.log(`  skip ${p}`); continue; }
  try {
    const { text } = await fetchText(url);
    writeIfNew(out, text);
    console.log(`  ✓ ${p}`);
  } catch (e) {
    console.warn(`  ! ${p}: ${e.message}`);
  }
}

// ---- 3. 404 page → reference/raw/__404.html --------------------------------
console.log("\n404 page →");
{
  const out = "reference/raw/__404.html";
  if (existsSync(out)) {
    console.log("  skip __404");
  } else {
    try {
      const { status, text } = await fetchText(FOUR_OH_FOUR_URL, { allow404: true });
      writeFileSync(out, text);
      console.log(`  ✓ __404 (live returned ${status})`);
    } catch (e) {
      console.warn(`  ! __404: ${e.message}`);
    }
  }
}

// ---- 4. Append pagination URLs to all-urls.txt (deduped) -------------------
const allUrlsFile = "reference/sitemap/all-urls.txt";
const existing = new Set(
  readFileSync(allUrlsFile, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
);
const added = [];
for (const u of PAGINATION_URLS) {
  if (!existing.has(u)) { existing.add(u); added.push(u); }
}
if (added.length) {
  writeFileSync(allUrlsFile, [...existing].sort().join("\n") + "\n");
  console.log(`\n+ ${added.length} URLs appended to ${allUrlsFile}`);
} else {
  console.log("\nall-urls.txt already up to date");
}

console.log("\nDone. Next: re-run scripts/build-all-pages.mjs to integrate the new pages.");
