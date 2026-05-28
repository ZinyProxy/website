/**
 * Deep audit — combines per-page pixel diff (desktop + mobile) with HTTP
 * checks for SEO completeness, link integrity, and abs-ziny scrubbing,
 * across every URL on web.ziny.io vs ziny.io.
 *
 * Run:  node scripts/deep-audit.mjs            # all URLs
 *       node scripts/deep-audit.mjs --limit 10  # first 10 only
 *       node scripts/deep-audit.mjs --no-shots  # skip screenshots (HTTP only, fast)
 *
 * Outputs:
 *   reference/full-audit/diffs/<slug>-{desktop,mobile}.png  (only if >1% diff)
 *   reference/full-audit/report.json   (full per-page data)
 *   reference/full-audit/SUMMARY.md    (top diffs + http failures, human-readable)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const OUT = "reference/full-audit";
const DIFFS = join(OUT, "diffs");
mkdirSync(DIFFS, { recursive: true });

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const limit = parseInt(arg("--limit") ?? "0", 10) || 0;
const skipShots = argv.includes("--no-shots");

const allUrls = readFileSync("reference/sitemap/all-urls.txt", "utf8")
  .split("\n").map((s) => s.trim()).filter(Boolean);
const targets = (limit ? allUrls.slice(0, limit) : allUrls).map((u) => {
  const path = new URL(u).pathname;
  const slug = path.replace(/^\/+|\/+$/g, "").replace(/\//g, "__") || "home";
  return { path, slug, live: u, mine: `https://web.ziny.io${path}` };
});
console.log(`auditing ${targets.length} URLs${skipShots ? " (HTTP-only)" : " (full visual + HTTP)"}`);

// ---------- HTTP audit (fast, parallel) -------------------------------------
async function httpAudit(t) {
  const r = { slug: t.slug, path: t.path };
  try {
    const res = await fetch(t.mine, { headers: { "User-Agent": "Mozilla/5.0 ziny-audit/1.0" } });
    r.status = res.status;
    r.bytes = parseInt(res.headers.get("content-length") || "0") || 0;
    const text = await res.text();
    r.bytesActual = text.length;
    const head = text.slice(0, text.indexOf("</head>"));
    r.seo = {
      title: (head.match(/<title>([^<]+)<\/title>/) || [])[1] || "",
      hasDesc: /<meta[^>]+name=["']description["']/i.test(head),
      hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(head),
      ogCount: (head.match(/property=["']og:/g) || []).length,
      twitterCount: (head.match(/name=["']twitter:/g) || []).length,
      hasJsonLd: /application\/ld\+json/i.test(head),
    };
    // Link integrity inside <body>
    const bodyHtml = text.slice(text.indexOf("</head>"));
    r.absZinyA = (bodyHtml.match(/<a\b[^>]*\bhref\s*=\s*["']https?:\/\/(?:www\.)?ziny\.io[^"']*["']/gi) || []).length;
  } catch (e) {
    r.error = e.message;
  }
  return r;
}

console.log("\nHTTP audit…");
const httpResults = [];
const HTTP_BATCH = 8;
for (let i = 0; i < targets.length; i += HTTP_BATCH) {
  const slice = targets.slice(i, i + HTTP_BATCH);
  const batch = await Promise.all(slice.map(httpAudit));
  httpResults.push(...batch);
  process.stdout.write(`\r  ${httpResults.length}/${targets.length}`);
}
console.log(`\n  HTTP audit done. ${httpResults.filter(r => r.status === 200).length} of ${httpResults.length} returned 200.`);

// ---------- Visual diff (slow, serial per viewport) -------------------------
let visualResults = [];
if (!skipShots) {
  const browser = await chromium.launch();
  const ctxDesk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxMob  = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });

  // Inject CSS that disables all animation + transition the moment a page
  // load starts, so the D3 globe / Swiper carousels / dashboard-tab cycle /
  // any CSS keyframes never tick. Critical for a meaningful pixel diff —
  // without this, two screenshots of the same dynamic page never match.
  const FREEZE_CSS = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }
    html { caret-color: transparent !important; }
  `;

  async function shoot(ctx, url) {
    const page = await ctx.newPage();
    try {
      // Inject freeze CSS before any document scripts run.
      await page.addInitScript(({ css }) => {
        // 1. Stop CSS animations + transitions
        const s = document.createElement("style");
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
        // 2. Cancel all rAF loops + active timers AFTER the page has had
        //    a moment to set them up. Run on a delay so frameworks finish
        //    binding, then nuke their loops.
        setTimeout(() => {
          // Cancel rAF: walk down from a high id (no API to enumerate).
          for (let i = 0; i < 10000; i++) cancelAnimationFrame(i);
          // Cancel intervals + timeouts up to a sensible bound.
          for (let i = 0; i < 5000; i++) { try { clearInterval(i); clearTimeout(i); } catch {} }
          // Stop Swiper autoplay if present
          if (window.Swiper) {
            document.querySelectorAll(".swiper").forEach((el) => {
              const s = el.swiper;
              if (s && s.autoplay && typeof s.autoplay.stop === "function") s.autoplay.stop();
            });
          }
        }, 1500);
      }, { css: FREEZE_CSS });

      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});

      // Trigger lazy-load by scrolling, then return to top.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, 0);
      });
      // Wait past the 1.5s timer that cancels rAF, plus settle time.
      await page.waitForTimeout(2200);

      const buf = await page.screenshot({ fullPage: true });
      return PNG.sync.read(buf);
    } catch (e) {
      return null;
    } finally {
      await page.close().catch(() => {});
    }
  }

  function diffPng(a, b) {
    if (!a || !b) return { error: "screenshot failed" };
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    // Crop both to same dimensions
    const crop = (p) => {
      const out = new PNG({ width: w, height: h });
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * p.width + x) * 4, j = (y * w + x) * 4;
        out.data[j] = p.data[i]; out.data[j+1] = p.data[i+1]; out.data[j+2] = p.data[i+2]; out.data[j+3] = p.data[i+3];
      }
      return out;
    };
    const A = crop(a), B = crop(b);
    const diff = new PNG({ width: w, height: h });
    const diffPixels = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.1, includeAA: false });
    return {
      w, h, diffPixels,
      diffPct: +(diffPixels / (w * h) * 100).toFixed(2),
      diffPng: diff,
    };
  }

  console.log(`\nVisual diff (${targets.length} URLs × 2 viewports)…`);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    process.stdout.write(`\r  ${i + 1}/${targets.length}  ${t.slug.padEnd(50).slice(0, 50)}`);
    const result = { slug: t.slug, path: t.path };
    for (const [view, ctx] of [["desktop", ctxDesk], ["mobile", ctxMob]]) {
      const liveImg = await shoot(ctx, t.live);
      const mineImg = await shoot(ctx, t.mine);
      const d = diffPng(liveImg, mineImg);
      result[view] = { diffPct: d.diffPct, w: d.w, h: d.h, error: d.error };
      // Save diff only if substantial — avoid 6+ GB of noise
      if (d.diffPct && d.diffPct > 1 && d.diffPng) {
        writeFileSync(join(DIFFS, `${t.slug}-${view}.png`), PNG.sync.write(d.diffPng));
        result[view].diffFile = `diffs/${t.slug}-${view}.png`;
      }
    }
    visualResults.push(result);
  }
  console.log("\n  visual diff done.");
  await browser.close();
}

// ---------- Redirects --------------------------------------------------------
const REDIRECTS = [
  ["/pricing", "/pricing-for-testing-purposes/"],
  ["/pricing/", "/pricing-for-testing-purposes/"],
  ["/social-media-proxy/", "/social-media-managment/"],
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
];
console.log("\nRedirect probes…");
const redirectResults = [];
for (const [from, to] of REDIRECTS) {
  const r = await fetch(`https://web.ziny.io${from}`, { redirect: "manual" });
  const loc = r.headers.get("location") || "";
  const locPath = loc ? new URL(loc, "https://web.ziny.io").pathname : "";
  redirectResults.push({ from, to, status: r.status, gotLocation: locPath, ok: r.status === 301 && locPath === to });
}
console.log(`  ${redirectResults.filter(r => r.ok).length}/${redirectResults.length} redirects OK`);

// ---------- Compile + write report ------------------------------------------
const report = { totals: { urls: targets.length }, http: httpResults, visual: visualResults, redirects: redirectResults };
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

// Markdown summary
const httpFail = httpResults.filter((r) => r.status !== 200 || r.absZinyA > 0 || !r.seo?.title);
const visualWorst = [...visualResults].sort((a, b) => (b.desktop?.diffPct || 0) - (a.desktop?.diffPct || 0)).slice(0, 20);
const md = [
  `# Deep audit report — ${new Date().toISOString()}`,
  ``,
  `URLs: ${targets.length}`,
  `HTTP 200: ${httpResults.filter(r => r.status === 200).length} / ${httpResults.length}`,
  `Redirects OK: ${redirectResults.filter(r => r.ok).length} / ${redirectResults.length}`,
  ``,
  `## HTTP failures or anomalies`,
  ...(httpFail.length === 0 ? ["_None._"] : httpFail.map((r) => `- ${r.path} → status=${r.status} absZinyA=${r.absZinyA} title="${r.seo?.title?.slice(0, 60) || "?"}"`)),
  ``,
  `## Visual diff — top 20 most divergent (desktop)`,
  ...(visualWorst.length === 0 ? ["_(skipped)_"] : visualWorst.map((r) => `- ${r.path} → desktop ${r.desktop?.diffPct ?? "?"}% / mobile ${r.mobile?.diffPct ?? "?"}%`)),
  ``,
  `## Failing redirects`,
  ...(redirectResults.filter(r => !r.ok).length === 0 ? ["_None._"] : redirectResults.filter(r => !r.ok).map((r) => `- ${r.from} → got status=${r.status} loc=${r.gotLocation} (expected → ${r.to})`)),
].join("\n");
writeFileSync(join(OUT, "SUMMARY.md"), md);
console.log(`\n✓ report → ${OUT}/SUMMARY.md  +  ${OUT}/report.json`);
console.log(`  diffs > 1% saved to ${OUT}/diffs/ (count: ${visualResults.filter(r => (r.desktop?.diffFile || r.mobile?.diffFile)).length})`);
