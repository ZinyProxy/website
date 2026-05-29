// Pulls the full WordPress REST snapshot of ziny.io into reference/wp/.
// Run: node scripts/fetch-wp-rest.mjs
//
// Saves bulk arrays (posts.json, pages.json, ...) plus per-slug splits for
// posts/pages so Astro can do `import data from 'reference/wp/posts/<slug>.json'`.

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { WP_ORIGIN } from "./_config.mjs";

const BASE = `${WP_ORIGIN}/wp-json/wp/v2`;
const OUT = resolve("reference/wp");
const PER_PAGE = 100;
const SLEEP_MS = 250;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ziny-rebuild-fetcher/1.0" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ← ${url}`);
  const total = res.headers.get("x-wp-total");
  const pages = res.headers.get("x-wp-totalpages");
  const data = await res.json();
  return { data, total, pages };
}

async function fetchAll(path, { embed = false, perPage = PER_PAGE } = {}) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  const embedParam = embed ? "&_embed=1" : "";
  while (page <= totalPages) {
    const url = `${BASE}/${path}?per_page=${perPage}&page=${page}${embedParam}`;
    const { data, total, pages } = await getJSON(url);
    if (page === 1) {
      totalPages = Number(pages || 1);
      console.log(`  ${path}: ${total ?? data.length} items across ${totalPages} page(s)`);
    }
    if (Array.isArray(data)) all.push(...data);
    else all.push(data);
    page += 1;
    if (page <= totalPages) await sleep(SLEEP_MS);
  }
  return all;
}

async function saveBulk(name, items) {
  const file = resolve(OUT, `${name}.json`);
  await writeFile(file, JSON.stringify(items, null, 2), "utf8");
  console.log(`  → ${file} (${items.length} items)`);
}

async function saveBySlug(folder, items) {
  const dir = resolve(OUT, folder);
  await mkdir(dir, { recursive: true });
  let written = 0;
  for (const item of items) {
    const slug = item.slug || String(item.id);
    await writeFile(resolve(dir, `${slug}.json`), JSON.stringify(item, null, 2), "utf8");
    written += 1;
  }
  console.log(`  → ${dir}/ (${written} files)`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // discovery root (for reference)
  console.log("Fetching discovery root…");
  const { data: discovery } = await getJSON(BASE);
  await writeFile(resolve(OUT, "discovery.json"), JSON.stringify(discovery, null, 2), "utf8");

  // big ones first
  const targets = [
    { path: "posts",                embed: true,  bulk: "posts",                split: "posts" },
    { path: "pages",                embed: true,  bulk: "pages",                split: "pages" },
    { path: "categories",           embed: false, bulk: "categories" },
    { path: "tags",                 embed: false, bulk: "tags" },
    { path: "users",                embed: false, bulk: "users" },
    { path: "media",                embed: false, bulk: "media" },
    { path: "menus",                embed: false, bulk: "menus" },
    { path: "menu-items",           embed: false, bulk: "menu-items" },
    { path: "elementor_snippet",    embed: false, bulk: "elementor_snippet",   split: "elementor_snippet" },
    { path: "partner",              embed: true,  bulk: "partner",             split: "partner" },
    { path: "partners-categories",  embed: false, bulk: "partners-categories" },
    { path: "pricing-plan",         embed: true,  bulk: "pricing-plan",        split: "pricing-plan" },
  ];

  for (const t of targets) {
    console.log(`\nFetching ${t.path}…`);
    try {
      const items = await fetchAll(t.path, { embed: t.embed });
      await saveBulk(t.bulk, items);
      if (t.split) await saveBySlug(t.split, items);
    } catch (err) {
      console.warn(`  ! ${t.path} failed: ${err.message}`);
    }
    await sleep(SLEEP_MS);
  }

  console.log("\nDone. Snapshot in reference/wp/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
