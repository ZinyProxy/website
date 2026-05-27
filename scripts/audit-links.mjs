/**
 * Audit every <a href> across all 167 captured page bodies + heads.
 * Tells us which links would leak back to https://ziny.io/ after cutover,
 * which local pages are linked-to but missing, and what external hosts
 * we depend on.
 *
 * Run: node scripts/audit-links.mjs
 * Saves: reference/link-audit.json (full data) and prints summary.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CAPTURED = "src/captured";
const DIST = "dist";

// Pull all <a href="..."> from a body, also picking up data-elementor-open-lightbox links.
function extractHrefs(html) {
  const out = [];
  const rx = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = rx.exec(html)) !== null) out.push(m[1]);
  return out;
}

// Normalize a href: trim whitespace, decode entities lightly.
function normalize(h) {
  return h.trim().replace(/&amp;/g, "&");
}

// Bucket the href by kind.
function classify(href) {
  const h = href.trim();
  if (!h) return "empty";
  if (h.startsWith("#")) return "anchor";
  if (h.startsWith("mailto:")) return "mailto";
  if (h.startsWith("tel:")) return "tel";
  if (h.startsWith("javascript:")) return "javascript";
  if (h.startsWith("//")) return "protocol-relative";
  if (/^https?:\/\/(www\.)?ziny\.io(\/|$|\?|#)/i.test(h)) return "abs-ziny";
  if (/^https?:\/\//i.test(h)) return "external";
  if (h.startsWith("/")) return "local-relative";
  return "other"; // relative without leading slash, ./, ../, etc
}

// For a local URL (relative or abs-ziny), figure out the path it points to.
function toPath(href) {
  let p = href;
  if (/^https?:\/\//i.test(p)) p = new URL(p).pathname + (new URL(p).search || "");
  // strip query+fragment for the existence check; queries/fragments don't change which file is served
  p = p.split("?")[0].split("#")[0];
  return p;
}

// Does dist/ serve this path? Checks dist/<path>/index.html or dist/<path> directly.
function existsInDist(p) {
  if (!p || p === "/") return existsSync(join(DIST, "index.html"));
  const clean = p.replace(/^\/+|\/+$/g, "");
  if (!clean) return existsSync(join(DIST, "index.html"));
  // 1. dist/<clean>/index.html (standard Astro output)
  if (existsSync(join(DIST, clean, "index.html"))) return true;
  // 2. dist/<clean> (file with extension like .xml, .ico, .txt, .html)
  if (existsSync(join(DIST, clean))) return true;
  return false;
}

// Pull slugs from captured set
const captured = readdirSync(CAPTURED).filter((f) => f.endsWith(".body.html")).map((f) => f.replace(/\.body\.html$/, ""));
console.log(`auditing links across ${captured.length} captured pages…`);

const byKind = { empty: 0, anchor: 0, mailto: 0, tel: 0, javascript: 0, "protocol-relative": 0, "abs-ziny": 0, external: 0, "local-relative": 0, other: 0 };
const allHrefs = new Map(); // href -> { count, sources: Set<slug>, kind }
const totalCount = { all: 0, unique: 0 };

for (const slug of captured) {
  const body = readFileSync(join(CAPTURED, `${slug}.body.html`), "utf8");
  for (const raw of extractHrefs(body)) {
    const h = normalize(raw);
    totalCount.all++;
    if (!allHrefs.has(h)) {
      const kind = classify(h);
      allHrefs.set(h, { count: 0, sources: new Set(), kind });
      byKind[kind] = (byKind[kind] || 0) + 1;
      totalCount.unique++;
    }
    const entry = allHrefs.get(h);
    entry.count++;
    entry.sources.add(slug);
  }
}

// For each abs-ziny + local-relative href: check existence in dist
const localProblems = []; // {href, count, sources, existsInDist}
const absZinyToRewrite = []; // abs-ziny links that have a local target — would leak on cutover
for (const [href, info] of allHrefs.entries()) {
  if (info.kind === "abs-ziny" || info.kind === "local-relative") {
    const path = toPath(href);
    const exists = existsInDist(path);
    info.existsInDist = exists;
    info.path = path;
    if (!exists) localProblems.push({ href, path, count: info.count, sources: [...info.sources].slice(0, 5), kind: info.kind });
    if (info.kind === "abs-ziny" && exists) absZinyToRewrite.push({ href, path, count: info.count });
  }
}

// External hosts
const extHosts = new Map();
for (const [href, info] of allHrefs.entries()) {
  if (info.kind === "external") {
    const host = (() => { try { return new URL(href).host; } catch { return "?"; } })();
    extHosts.set(host, (extHosts.get(host) || 0) + info.count);
  }
}

// ---- Print summary ----
console.log("\n=== Link kind summary (unique hrefs) ===");
for (const [k, v] of Object.entries(byKind)) console.log(`  ${k.padEnd(18)} ${v}`);
console.log(`\n  TOTAL anchors: ${totalCount.all}, unique hrefs: ${totalCount.unique}`);

console.log(`\n=== Missing local targets (${localProblems.length} unique hrefs) ===`);
const top = localProblems.sort((a, b) => b.count - a.count).slice(0, 25);
for (const p of top) console.log(`  ${p.count.toString().padStart(4)}× ${p.kind.padEnd(15)} ${p.href}  (e.g. on ${p.sources[0]})`);
if (localProblems.length > 25) console.log(`  … +${localProblems.length - 25} more`);

console.log(`\n=== abs-ziny links that have a local target → leak risk on cutover (${absZinyToRewrite.length} unique) ===`);
const leak = absZinyToRewrite.sort((a, b) => b.count - a.count).slice(0, 25);
for (const p of leak) console.log(`  ${p.count.toString().padStart(4)}× ${p.href}`);
if (absZinyToRewrite.length > 25) console.log(`  … +${absZinyToRewrite.length - 25} more`);

console.log(`\n=== External hosts (top 20) ===`);
[...extHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  .forEach(([h, c]) => console.log(`  ${c.toString().padStart(5)}× ${h}`));

// ---- Save full data ----
const data = {
  totals: { ...totalCount, byKind },
  missingLocal: localProblems.sort((a, b) => b.count - a.count).map((p) => ({ ...p, sources: undefined })),
  absZinyToRewrite: absZinyToRewrite.sort((a, b) => b.count - a.count),
  externalHosts: [...extHosts.entries()].sort((a, b) => b[1] - a[1]).map(([host, count]) => ({ host, count })),
};
writeFileSync("reference/link-audit.json", JSON.stringify(data, null, 2));
console.log("\n✓ full data → reference/link-audit.json");
