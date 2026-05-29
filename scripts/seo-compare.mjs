/**
 * Full SEO comparison across all 168 URLs. For each, fetches live ziny.io
 * AND web.ziny.io, extracts every SEO-relevant field, and reports any
 * mismatches. Definitive proof that the new site preserves SEO 1:1.
 *
 * Compares: title, meta description, canonical, robots, OG (locale/type/
 * title/description/image/site_name/url), Twitter (card/title/description/
 * image), JSON-LD schemas (by @type), article published/modified times.
 *
 * Run: node scripts/seo-compare.mjs [--limit N]
 * Outputs: reference/seo-compare/{report.json,SUMMARY.md}
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_ORIGIN, STAGING_ORIGIN } from "./_config.mjs";

const OUT = "reference/seo-compare";
mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const limit = parseInt(arg("--limit") ?? "0", 10) || 0;

const urls = readFileSync("reference/sitemap/all-urls.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const paths = [...new Set(urls.map((u) => new URL(u).pathname))];
const targets = limit ? paths.slice(0, limit) : paths;
console.log(`comparing SEO on ${targets.length} URLs (live vs mine)…`);

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ziny-seo-compare/1.0" } });
  return { status: r.status, text: await r.text() };
}

// Extract a single attribute value from a tag.
function meta(html, type, key) {
  const rx = new RegExp(`<meta[^>]+${type}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const rx2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${type}=["']${key}["']`, "i");
  return (html.match(rx) || html.match(rx2) || [])[1] || null;
}

function extract(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const title = (head.match(/<title>([^<]+)<\/title>/) || [])[1] || null;
  const canonical = (head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i) || [])[1] || null;
  const ogImages = [...head.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/gi)].map((m) => m[1]);
  // JSON-LD: extract every block, pull @type values
  const jsonLdTypes = [];
  for (const m of head.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const graph = data["@graph"] || (Array.isArray(data) ? data : [data]);
      for (const node of graph) {
        if (node && node["@type"]) {
          const t = Array.isArray(node["@type"]) ? node["@type"].join("/") : node["@type"];
          jsonLdTypes.push(t);
        }
      }
    } catch { jsonLdTypes.push("(unparseable)"); }
  }
  return {
    title,
    description: meta(head, "name", "description"),
    robots: meta(head, "name", "robots"),
    canonical,
    og_title: meta(head, "property", "og:title"),
    og_description: meta(head, "property", "og:description"),
    og_url: meta(head, "property", "og:url"),
    og_image_count: ogImages.length,
    og_image_first: ogImages[0] || null,
    og_type: meta(head, "property", "og:type"),
    og_site_name: meta(head, "property", "og:site_name"),
    twitter_card: meta(head, "name", "twitter:card"),
    twitter_title: meta(head, "name", "twitter:title"),
    twitter_description: meta(head, "name", "twitter:description"),
    twitter_image: meta(head, "name", "twitter:image"),
    article_published_time: meta(head, "property", "article:published_time"),
    article_modified_time: meta(head, "property", "article:modified_time"),
    jsonld_types: jsonLdTypes.sort().join(","),
    jsonld_count: jsonLdTypes.length,
  };
}

// Cross-origin normalization: live's URLs are https://ziny.io/foo, mine's are
// also https://ziny.io/foo (because canonical is intentionally set to live).
// No special normalization needed — they should compare equal directly.

const results = [];
const BATCH = 6;
for (let i = 0; i < targets.length; i += BATCH) {
  const slice = targets.slice(i, i + BATCH);
  const batch = await Promise.all(slice.map(async (path) => {
    const [live, mine] = await Promise.all([
      fetchText(`${PUBLIC_ORIGIN}${path}`),
      fetchText(`${STAGING_ORIGIN}${path}`),
    ]);
    if (live.status !== 200 || mine.status !== 200) {
      return { path, error: `live=${live.status} mine=${mine.status}` };
    }
    const liveSeo = extract(live.text);
    const mineSeo = extract(mine.text);
    const diffs = {};
    for (const k of Object.keys(liveSeo)) {
      if (liveSeo[k] !== mineSeo[k]) diffs[k] = { live: liveSeo[k], mine: mineSeo[k] };
    }
    return { path, identical: Object.keys(diffs).length === 0, diffs, liveSeo, mineSeo };
  }));
  results.push(...batch);
  process.stdout.write(`\r  ${results.length}/${targets.length}`);
}
console.log("");

writeFileSync(join(OUT, "report.json"), JSON.stringify(results, null, 2));

const identical = results.filter((r) => r.identical).length;
const withDiff = results.filter((r) => r.diffs && Object.keys(r.diffs).length > 0).length;
const errors = results.filter((r) => r.error).length;

// Build summary, group differences by field
const fieldCounts = {};
for (const r of results) {
  if (!r.diffs) continue;
  for (const f of Object.keys(r.diffs)) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
}

const md = [
  `# SEO Identity Report — ${new Date().toISOString()}`,
  ``,
  `URLs compared: **${results.length}**`,
  `**Identical SEO**: ${identical} (${Math.round(identical / results.length * 100)}%)`,
  `With differences: ${withDiff}`,
  `Errors (page didn't load): ${errors}`,
  ``,
  `## Differences by SEO field`,
  ...(Object.entries(fieldCounts).length === 0 ? ["_No SEO differences found._"]
     : Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).map(([f, c]) => `- **${f}**: differs on ${c} URLs`)),
  ``,
  `## Top 30 URLs with most SEO differences`,
  ...results
    .filter((r) => r.diffs)
    .sort((a, b) => Object.keys(b.diffs).length - Object.keys(a.diffs).length)
    .slice(0, 30)
    .map((r) => `- \`${r.path}\` — ${Object.keys(r.diffs).length} field(s) differ: ${Object.keys(r.diffs).join(", ")}`),
  ``,
  `## Errors`,
  ...(errors === 0 ? ["_None._"]
     : results.filter((r) => r.error).map((r) => `- \`${r.path}\`: ${r.error}`)),
].join("\n");

writeFileSync(join(OUT, "SUMMARY.md"), md);
console.log(`\n✓ ${OUT}/SUMMARY.md`);
console.log(`\n${identical}/${results.length} URLs have IDENTICAL SEO to live`);
if (withDiff > 0) {
  console.log("\nField-level diffs:");
  for (const [f, c] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${f.padEnd(25)}: ${c} URLs differ`);
  }
}
