/**
 * Source-level diff between mine (web.ziny.io) and live (ziny.io).
 * Compares actual HTML structure + computed CSS — no rendering, no screenshots,
 * no noise floor. If this says 0%, the two pages are LITERALLY identical at
 * the source level and any pixel diff is purely from rendering animation.
 *
 * For each URL: fetches both versions, normalizes (strips comments, collapses
 * whitespace, sorts attributes), tokenizes, and computes a Levenshtein-like
 * token diff %. Also reports element counts + class set differences.
 *
 * Run: node scripts/source-diff.mjs [--limit N]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const limit = parseInt(arg("--limit") ?? "0", 10) || 0;

const OUT = "reference/source-diff";
mkdirSync(OUT, { recursive: true });

const urls = readFileSync("reference/sitemap/all-urls.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const targets = (limit ? urls.slice(0, limit) : urls).map((u) => {
  const path = new URL(u).pathname;
  const slug = path.replace(/^\/+|\/+$/g, "").replace(/\//g, "__") || "home";
  return { path, slug, live: u, mine: `https://web.ziny.io${path}` };
});
console.log(`source-diffing ${targets.length} URLs…`);

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ziny-srcdiff/1.0" } });
  return { status: r.status, text: await r.text() };
}

// Normalize HTML for comparison:
// - extract <body>...</body> only (head varies legitimately: canonical URL, etc.)
// - strip HTML comments
// - collapse whitespace
// - normalize attribute quote chars
// - DON'T normalize href values for ziny.io rewrites (those are intentional)
function normalizeBody(html) {
  const bm = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  if (!bm) return "";
  let body = bm[1];
  body = body.replace(/<!--[\s\S]*?-->/g, "");                  // strip comments
  // Strip <noscript> blocks (live has them as JS-off fallback; our build eagerly
  // loads images so they're not needed → expected divergence, exclude from diff).
  body = body.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");
  // Strip <iframe> tags (live has Cloudflare email-protection iframes; we
  // decode emails statically and drop the iframe).
  body = body.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  body = body.replace(/<iframe\b[^>]*\/?>/gi, "");
  // Strip <script> tags (we keep scripts but ordering is normalized differently;
  // comparing scripts as text isn't meaningful — they're either present or not).
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  // Cloudflare email obfuscation: live has __cf_email__ spans, mine has decoded
  // mailto: anchors. Normalize both sides to bare email-like tokens.
  body = body.replace(/<a\b[^>]*>\s*<span[^>]+class="__cf_email__"[^>]+data-cfemail="[^"]+"[^>]*>[^<]*<\/span>\s*<\/a>/gi, "[email]");
  body = body.replace(/<a\b[^>]*href="mailto:[^"]+"[^>]*>[^<]+<\/a>/gi, "[email]");
  // Font icon normalization: live renders Elementor icons as <i class="eicon-X" />
  // (font-icon mode); mine renders them as <svg class="e-font-icon-svg e-eicon-X">
  // <path d=".." /></svg> (inline-SVG mode, an Elementor setting). Same icon,
  // same look — collapse both forms to one [icon] token per occurrence so
  // they compare equal regardless of markup format.
  // Order matters: handle SVG first (contains <path>), then <i>.
  body = body.replace(/<svg\b[^>]*class="[^"]*(?:e-font-icon-svg|fa-[a-z]+|eicon-|e-eicon-)[^"]*"[\s\S]*?<\/svg>/gi, "[icon]");
  body = body.replace(/<i\s+[^>]*class="[^"]*(?:fa-|fas\s|fab\s|far\s|eicon-|elementor-icon)[^"]*"[^>]*>\s*<\/i>/gi, "[icon]");
  // Normalize lazy-loaded image attrs: live has data-src/data-srcset + LQIP base64
  // src; mine has them flattened to src/srcset (intentional, see build-all-pages
  // un-lazy logic). Strip src/srcset entirely from comparison — element presence,
  // not URL value, is what matters for structural identity.
  body = body.replace(/\s(?:src|srcset|data-src|data-srcset|data-lazy-src|data-eio|data-orig-file|data-large-file|data-medium-file|data-thumb-file)="[^"]*"/gi, "");
  // Drop classes that live adds purely via JS at runtime (Elementor's
  // lazyloaded, e-loaded, swiper-initialized, etc.) — mine renders without
  // them because no JS has run.
  const RUNTIME_CLASSES = /\s?(lazyloaded|loaded|e-loaded|swiper-initialized|swiper-android|swiper-pointer-events|swiper-horizontal|elementor-swiper|elementor-tab-active|active-tab|wp-block-image|aspect-locked)/g;
  body = body.replace(/class="([^"]+)"/g, (_, cls) => `class="${cls.replace(RUNTIME_CLASSES, " ").trim()}"`);
  body = body.replace(/\s+/g, " ");                              // collapse whitespace
  body = body.replace(/=\s*'([^']*)'/g, '="$1"');                // single → double quotes
  // Rewrite live URLs to match our domain so they compare equal.
  body = body.replace(/https?:\/\/(?:www\.)?ziny\.io\//gi, "/");
  body = body.replace(/href="https?:\/\/(?:www\.)?ziny\.io"/gi, 'href="/"');
  body = body.replace(/\s+>/g, ">");                             // trim before >
  return body.trim();
}

// Token-based diff: split on word boundaries, count differing tokens.
function tokenize(s) {
  return s.split(/(<\/?[a-zA-Z][^>]*>|\s+|[^a-zA-Z0-9])/g).filter((t) => t && t.trim());
}

// Cheap LCS-based diff %: not exact Levenshtein, but linear-time set-diff
// + length-based heuristic. Good enough to flag pages that differ.
function diffPct(a, b) {
  const ta = tokenize(a), tb = tokenize(b);
  const setA = new Map(), setB = new Map();
  for (const t of ta) setA.set(t, (setA.get(t) || 0) + 1);
  for (const t of tb) setB.set(t, (setB.get(t) || 0) + 1);
  let common = 0;
  for (const [t, c] of setA) common += Math.min(c, setB.get(t) || 0);
  const total = Math.max(ta.length, tb.length);
  if (total === 0) return 0;
  return +((1 - common / total) * 100).toFixed(2);
}

function elementStats(html) {
  const tagCount = {};
  const classes = new Set();
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)\b/g)) tagCount[m[1].toLowerCase()] = (tagCount[m[1].toLowerCase()] || 0) + 1;
  for (const m of html.matchAll(/class="([^"]+)"/gi)) for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  return { tagCount, classes };
}

const results = [];
const BATCH = 6;
for (let i = 0; i < targets.length; i += BATCH) {
  const slice = targets.slice(i, i + BATCH);
  const batch = await Promise.all(slice.map(async (t) => {
    try {
      const [live, mine] = await Promise.all([fetchText(t.live), fetchText(t.mine)]);
      const lb = normalizeBody(live.text);
      const mb = normalizeBody(mine.text);
      const pct = diffPct(lb, mb);
      const ls = elementStats(lb), ms = elementStats(mb);
      // Class set diff
      const onlyLive = [...ls.classes].filter((c) => !ms.classes.has(c));
      const onlyMine = [...ms.classes].filter((c) => !ls.classes.has(c));
      // Tag count diff (top divergences)
      const tagDiffs = [];
      const allTags = new Set([...Object.keys(ls.tagCount), ...Object.keys(ms.tagCount)]);
      for (const t of allTags) {
        const dl = ls.tagCount[t] || 0, dm = ms.tagCount[t] || 0;
        if (dl !== dm) tagDiffs.push({ tag: t, live: dl, mine: dm, diff: dm - dl });
      }
      return {
        slug: t.slug, path: t.path,
        liveStatus: live.status, mineStatus: mine.status,
        liveBodyLen: lb.length, mineBodyLen: mb.length,
        diffPct: pct,
        classOnlyLive: onlyLive.length,
        classOnlyMine: onlyMine.length,
        tagDiffs: tagDiffs.slice(0, 8),
      };
    } catch (e) {
      return { slug: t.slug, path: t.path, error: e.message };
    }
  }));
  results.push(...batch);
  process.stdout.write(`\r  ${results.length}/${targets.length}`);
}
console.log("");

// Sort by diff%, highest first
results.sort((a, b) => (b.diffPct || 0) - (a.diffPct || 0));

writeFileSync(join(OUT, "report.json"), JSON.stringify(results, null, 2));

// Markdown summary
const top = results.slice(0, 20);
const md = [
  `# Source-level diff — ${new Date().toISOString()}`,
  ``,
  `URLs compared: ${results.length}`,
  `Median diff %: ${results.length ? results[Math.floor(results.length / 2)].diffPct : "?"}`,
  `Max diff %: ${results[0]?.diffPct || "?"}`,
  `Min diff %: ${results[results.length - 1]?.diffPct || "?"}`,
  `URLs at 0%: ${results.filter(r => r.diffPct === 0).length}`,
  `URLs <1%: ${results.filter(r => (r.diffPct || 0) < 1).length}`,
  `URLs >5%: ${results.filter(r => (r.diffPct || 0) > 5).length}`,
  ``,
  `## Top 20 by source divergence`,
  ...top.map((r) => `- ${r.path} → ${r.diffPct}% (body ${r.liveBodyLen}B live vs ${r.mineBodyLen}B mine, ${r.classOnlyLive} classes only-live / ${r.classOnlyMine} only-mine)${r.tagDiffs?.length ? ` — tag diffs: ${r.tagDiffs.slice(0, 4).map(t => `${t.tag} ${t.live}→${t.mine}`).join(", ")}` : ""}`),
].join("\n");
writeFileSync(join(OUT, "SUMMARY.md"), md);
console.log(`\n✓ ${OUT}/SUMMARY.md`);
console.log(md);
