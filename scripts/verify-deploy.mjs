/**
 * Hits web.ziny.io with ~40 checks across redirects, SEO, pagination,
 * feeds, sitemap, robots, 404, favicons, and abs-ziny scrub. Reports
 * PASS/FAIL for each so we know exactly what's working and what isn't
 * after a deploy.
 *
 * Run: node scripts/verify-deploy.mjs
 */
const BASE = "https://web.ziny.io";
const UA = "Mozilla/5.0 ziny-verify/1.0";

const results = []; // {check, ok, detail}
const log = (check, ok, detail = "") => {
  results.push({ check, ok, detail });
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} ${check}${detail ? "  — " + detail : ""}`);
};

async function head(url) {
  return await fetch(url, { redirect: "manual", headers: { "User-Agent": UA }, method: "GET" });
}
async function body(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  return { status: r.status, text: await r.text(), headers: r.headers };
}

// ---- 1. Deploy landed: abs-ziny scrubbed from homepage --------------------
console.log("\n[1] Deploy landed (abs-ziny scrubbed)");
{
  const { status, text } = await body(`${BASE}/`);
  if (status !== 200) {
    log("homepage 200", false, `got ${status}`);
  } else {
    log("homepage 200", true);
    // Only count <a href>, NOT <link rel=...> tags. The captured <head> intentionally
    // keeps WP/Yoast's abs-ziny pointers (canonical, oEmbed, WP REST, RSS, favicons)
    // until cutover — those are correct, not leaks.
    const aTagAbsZiny = (text.match(/<a\b[^>]*\bhref\s*=\s*["']https?:\/\/(?:www\.)?ziny\.io[^"']*["']/gi) || []);
    log("no abs-ziny <a href> in homepage", aTagAbsZiny.length === 0, aTagAbsZiny.length ? `still has ${aTagAbsZiny.length}: ${aTagAbsZiny[0]}` : "0 found");
    const logoToRoot = text.includes('href="/"');
    log("logo links rewritten to relative /", logoToRoot);
  }
}

// ---- 2. 301 redirects --------------------------------------------------------
console.log("\n[2] 12 RedirectMatch 301 rules");
const REDIRECTS = [
  ["/pricing", "/pricing-for-testing-purposes/"],
  ["/pricing/", "/pricing-for-testing-purposes/"],
  ["/social-media-proxy/", "/social-media-managment/"],
  ["/social-media-proxy", "/social-media-managment/"],
  ["/market-monitoring", "/market-research/"],
  ["/ecommerce-proxis", "/ecommerce-proxies/"],
  ["/tinder-proxies", "/tinder-proxy/"],
  ["/youyube-proxies", "/youtube-proxies/"],
  ["/residential-proxies", "/residential-proxy/"],
  ["/roblox-proxy", "/unblock-roblox/"],
  ["/what-is-browserscan/", "/browserscan-guide/"],
  ["/pirate-bay-proxy-alternatives-2026/", "/best-pirate-bay-proxy/"],
  ["/blog/what-are-residential-proxies", "/what-is-a-residential-proxy/"],
  ["/use-cases/ecommerce-scraping", "/ecommerce-proxies/"],
  ["/author/daniel-cole/page/2/", "/author/daniel-cole/"],
  ["/author/daniel-cole/page/5/", "/author/daniel-cole/"],
];
for (const [from, to] of REDIRECTS) {
  const r = await head(`${BASE}${from}`);
  const loc = r.headers.get("location") || "";
  const locPath = loc ? new URL(loc, BASE).pathname : "";
  const ok = r.status === 301 && locPath === to;
  log(`${from} → 301 → ${to}`, ok, ok ? "" : `got ${r.status} → ${locPath || "(no location)"}`);
}

// ---- 3. SEO survives on 5 representative pages -------------------------------
console.log("\n[3] SEO present in served HTML (5 page types)");
// Page-type-specific SEO checks. category and legal pages legitimately have
// no <meta description> on LIVE either — Yoast doesn't generate one for those.
// Don't flag desc-missing where live also lacks it.
const SEO_PAGES = [
  ["/",                                          "home",      { desc: true }],
  ["/best-residential-proxies-for-scraping/",    "blog post", { desc: true }],
  ["/residential-proxy/",                        "marketing", { desc: true }],
  ["/category/guide/",                           "category",  { desc: false }],
  ["/privacy-policy/",                           "legal",     { desc: false }],
];
for (const [path, label, expect] of SEO_PAGES) {
  const { status, text } = await body(`${BASE}${path}`);
  if (status !== 200) { log(`${label} (${path}) loads`, false, `got ${status}`); continue; }
  const head = text.slice(0, text.indexOf("</head>"));
  const checks = {
    title: /<title>[^<]+<\/title>/.test(head),
    ...(expect.desc !== false && { desc: /<meta[^>]+name=["']description["']/i.test(head) }),
    canonical: /<link[^>]+rel=["']canonical["']/i.test(head),
    og: (head.match(/property=["']og:/g) || []).length >= 4,
    twitter: (head.match(/name=["']twitter:/g) || []).length >= 1,
    jsonld: /<script[^>]+application\/ld\+json/i.test(head),
  };
  const pass = Object.values(checks).every(Boolean);
  const detail = pass ? "all SEO fields present" : "missing: " + Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(",");
  log(`${label} (${path}) — Yoast SEO`, pass, detail);
}

// ---- 4. Pagination URLs ------------------------------------------------------
console.log("\n[4] Pagination URLs (sampled)");
const PAGINATION = [
  "/proxy-blog/page/2/",
  "/proxy-blog/page/9/",
  "/proxy-blog/page/10/",  // should 404 — past last page
  "/category/guide/page/3/",
  "/category/information/page/4/",
];
for (const path of PAGINATION) {
  const expect404 = path.endsWith("/page/10/");
  const r = await body(`${BASE}${path}`);
  const ok = expect404 ? r.status === 404 : r.status === 200;
  log(`${path}`, ok, `got ${r.status}${expect404 ? " (expected 404)" : ""}`);
}

// ---- 5. RSS feeds -----------------------------------------------------------
console.log("\n[5] RSS feeds");
const FEEDS = [
  "/feed/",
  "/category/guide/feed/",
  "/category/use-cases/feed/",
];
for (const path of FEEDS) {
  const { status, text } = await body(`${BASE}${path}`);
  const ok = status === 200 && /<rss\b/i.test(text) && /<item\b/.test(text);
  const itemCount = (text.match(/<item\b/g) || []).length;
  log(`${path}`, ok, `${status}, ${itemCount} items`);
}

// ---- 6. 404 page ------------------------------------------------------------
console.log("\n[6] Custom 404 page");
{
  const dead = `${BASE}/__definitely-does-not-exist-${Date.now()}/`;
  const { status, text } = await body(dead);
  log("nonexistent URL returns 404", status === 404, `got ${status}`);
  const has404Markup = /Page not found|404/i.test(text) && text.length > 5000;
  log("custom 404 page served (Yoast-titled, full markup)", has404Markup, `body=${text.length}B`);
}

// ---- 7. Sitemaps + robots + favicons ----------------------------------------
console.log("\n[7] Sitemaps / robots / favicons");
for (const path of ["/sitemap_index.xml", "/sitemap-index.xml", "/post-sitemap.xml", "/page-sitemap.xml", "/robots.txt", "/favicon.ico", "/favicon.svg"]) {
  const r = await body(`${BASE}${path}`);
  log(path, r.status === 200, `got ${r.status}, ${r.text.length}B`);
}
// Check robots.txt sitemap reference is correct
{
  const { text } = await body(`${BASE}/robots.txt`);
  const hasSitemapLine = /Sitemap:\s*https:\/\/[^\s]+sitemap[_-]index\.xml/.test(text);
  log("robots.txt references sitemap correctly", hasSitemapLine);
}

// ---- 8. Author page + 1 missing-then-redirected URL works end-to-end -------
console.log("\n[8] Author page + one redirect target lands correctly");
{
  const { status: s1 } = await body(`${BASE}/author/daniel-cole/`);
  log("/author/daniel-cole/ resolves 200", s1 === 200);

  // Follow the /pricing 301 and confirm the destination loads
  const r = await fetch(`${BASE}/pricing`, { headers: { "User-Agent": UA } });
  const finalUrl = r.url;
  log("/pricing → following redirect lands on /pricing-for-testing-purposes/", r.status === 200 && finalUrl.endsWith("/pricing-for-testing-purposes/"), `final ${finalUrl}, status ${r.status}`);
}

// ---- Summary ---------------------------------------------------------------
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== ${passed} passed, ${failed} failed (of ${results.length}) ===`);
if (failed > 0) {
  console.log("\nFailures:");
  results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.check}  — ${r.detail}`));
  process.exit(1);
}
