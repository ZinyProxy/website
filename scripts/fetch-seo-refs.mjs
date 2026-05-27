/**
 * Closes capture gaps #5, #7, #8, #9 in one pass:
 *   - Yoast sitemap_index.xml + every sub-sitemap → reference/sitemap/raw/
 *   - Full favicon / apple-touch / android-chrome / manifest set → public/
 *   - robots.txt → public/robots.txt (so it ships to dist/)
 *   - 3rd-party script inventory (GA/GTM/Pixel/YourGPT/etc.) by greping
 *     captured heads + scripts → reference/third-party.json
 *
 * Run: node scripts/fetch-seo-refs.mjs
 * Idempotent — won't re-download files that already exist on disk.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ORIGIN = "https://ziny.io";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ziny-rebuild/1.0";

async function fetchBin(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return { ct: r.headers.get("content-type") || "", buf: Buffer.from(await r.arrayBuffer()) };
}
async function fetchText(url) {
  const { ct, buf } = await fetchBin(url);
  return { ct, text: buf.toString("utf8") };
}
function save(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}
function saveIfNew(file, data) {
  if (existsSync(file)) return false;
  save(file, data);
  return true;
}

// ---- 7. Sitemap_index.xml + every sub-sitemap ------------------------------
console.log("Sitemaps →");
{
  const root = `${ORIGIN}/sitemap_index.xml`;
  try {
    const { text } = await fetchText(root);
    save("reference/sitemap/raw/sitemap_index.xml", text);
    console.log("  ✓ sitemap_index.xml");
    const subs = [...text.matchAll(/<loc>([^<]+\.xml)<\/loc>/gi)].map((m) => m[1]);
    console.log(`  found ${subs.length} sub-sitemaps`);
    for (const url of subs) {
      const name = new URL(url).pathname.split("/").filter(Boolean).pop();
      const out = `reference/sitemap/raw/${name}`;
      if (existsSync(out)) { console.log(`    skip ${name}`); continue; }
      try {
        const { text: body } = await fetchText(url);
        save(out, body);
        console.log(`    ✓ ${name}`);
      } catch (e) { console.warn(`    ! ${name}: ${e.message}`); }
    }
  } catch (e) { console.warn(`  ! root: ${e.message}`); }
}

// ---- 9. robots.txt ---------------------------------------------------------
console.log("\nrobots.txt →");
{
  const out = "public/robots.txt";
  if (existsSync(out)) console.log("  skip (already exists)");
  else {
    try {
      const { text } = await fetchText(`${ORIGIN}/robots.txt`);
      save(out, text);
      // Also keep an unmodified reference copy.
      save("reference/robots.txt", text);
      console.log("  ✓ public/robots.txt");
    } catch (e) { console.warn(`  ! ${e.message}`); }
  }
}

// ---- 8. Favicon / icon / manifest set --------------------------------------
console.log("\nFavicon set →");
const ICONS = [
  "favicon.ico",
  "apple-touch-icon.png",
  "apple-touch-icon-precomposed.png",
  "apple-touch-icon-152x152.png",
  "apple-touch-icon-180x180.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "site.webmanifest",
  "manifest.json",
  "browserconfig.xml",
  "mstile-150x150.png",
];
for (const name of ICONS) {
  const out = `public/${name}`;
  if (existsSync(out)) { console.log(`  skip ${name}`); continue; }
  try {
    const { buf } = await fetchBin(`${ORIGIN}/${name}`);
    save(out, buf);
    console.log(`  ✓ ${name} (${buf.length}B)`);
  } catch (e) {
    // 404s are expected for icons the site doesn't publish — quiet skip.
    if (/^404/.test(e.message)) console.log(`  - ${name} (not published)`);
    else console.warn(`  ! ${name}: ${e.message}`);
  }
}

// ---- 5. Third-party scripts inventory --------------------------------------
console.log("\n3rd-party scripts →");
{
  const PATTERNS = [
    { name: "Google Tag Manager", rx: /GTM-[A-Z0-9]{4,9}/g },
    { name: "Google Analytics 4", rx: /G-[A-Z0-9]{8,12}/g },
    { name: "Google Analytics UA", rx: /UA-\d{4,10}-\d{1,3}/g },
    { name: "Google Ads Conversion", rx: /AW-\d{8,12}/g },
    { name: "Facebook Pixel", rx: /fbq\(['"]init['"],\s*['"](\d{10,20})['"]/g },
    { name: "Facebook (other)", rx: /facebook\.com\/tr\?id=(\d+)/g },
    { name: "Hotjar", rx: /hjid:(\d+)/g },
    { name: "Microsoft Clarity", rx: /clarity\.ms\/tag\/([a-z0-9]+)/gi },
    { name: "YourGPT", rx: /yourgpt(?:chatbot)?[^"']*?(?:widget|chatbot)[^"']*?id["'\s:=]+([a-z0-9-]+)/gi },
    { name: "Tawk.to", rx: /tawk\.to\/chat\/([a-f0-9]+)\/([a-z0-9]+)/gi },
    { name: "Intercom", rx: /intercom[^"']{0,40}app_id["'\s:=]+['"]([a-z0-9]+)['"]/gi },
    { name: "Cookie banner (CookieYes)", rx: /cookieyes\.com[^"']*?\/([a-z0-9-]+)\/script\.js/gi },
    { name: "Cookie banner (Cookiebot)", rx: /cookiebot\.com[^"']*?cbid=([a-f0-9-]+)/gi },
  ];
  const dir = "src/captured";
  const heads = readdirSync(dir).filter((f) => f.endsWith(".head.html"));
  const scripts = readdirSync(dir).filter((f) => f.endsWith(".scripts.json"));
  const findings = {};
  const corpus = [];
  for (const f of heads) corpus.push(readFileSync(join(dir, f), "utf8"));
  for (const f of scripts) {
    const list = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const s of list) {
      if (s.src) corpus.push(s.src);
      if (s.code) corpus.push(s.code);
    }
  }
  const blob = corpus.join("\n");
  for (const { name, rx } of PATTERNS) {
    const ids = new Set();
    for (const m of blob.matchAll(rx)) ids.add(m[1] || m[0]);
    if (ids.size) findings[name] = [...ids];
  }
  // Bonus: list any obvious third-party script src URLs we should know about.
  const externalSrcs = new Set();
  for (const f of scripts) {
    const list = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const s of list) {
      if (s.src && /^https?:\/\//.test(s.src) && !s.src.includes("ziny.io")) {
        externalSrcs.add(new URL(s.src).host);
      }
    }
  }
  findings._externalScriptHosts = [...externalSrcs].sort();
  save("reference/third-party.json", JSON.stringify(findings, null, 2));
  console.log("  ✓ reference/third-party.json");
  for (const [k, v] of Object.entries(findings)) {
    if (k.startsWith("_")) continue;
    console.log(`    ${k}: ${v.join(", ")}`);
  }
  console.log(`    external hosts: ${findings._externalScriptHosts.join(", ")}`);
}

console.log("\nDone.");
