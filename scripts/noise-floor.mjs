/**
 * What's the irreducible pixel-diff noise floor? Screenshot the SAME page
 * TWICE on the SAME site with the SAME freeze logic, then diff. Any nonzero
 * diff here is from font antialiasing / GPU rendering / timing — NOT from
 * differences between mine and live. This sets a ceiling on how low the
 * audit can ever go.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

async function shoot(ctx, url) {
  const page = await ctx.newPage();
  await page.addInitScript(({ css }) => {
    const s = document.createElement("style");
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(() => {
      for (let i = 0; i < 10000; i++) cancelAnimationFrame(i);
      for (let i = 0; i < 5000; i++) { try { clearInterval(i); clearTimeout(i); } catch {} }
    }, 1500);
  }, { css: FREEZE_CSS });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2200);
  const buf = await page.screenshot({ fullPage: true });
  await page.close();
  return PNG.sync.read(buf);
}

function diffPct(a, b) {
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
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
  const px = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.1, includeAA: false });
  return { pct: +(px / (w * h) * 100).toFixed(3), diffPng: diff };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

for (const url of ["https://ziny.io/", "https://web.ziny.io/"]) {
  console.log(`\n${url} — two screenshots, same browser, same freeze:`);
  const a = await shoot(ctx, url);
  const b = await shoot(ctx, url);
  const { pct, diffPng } = diffPct(a, b);
  console.log(`  diff: ${pct}%  (noise floor for this URL)`);
  const tag = url.includes("web.ziny") ? "mine" : "live";
  writeFileSync(`reference/compare/noise-${tag}.png`, PNG.sync.write(diffPng));
}

// Then live vs mine for comparison
console.log("\nlive vs mine (for reference):");
const a = await shoot(ctx, "https://ziny.io/");
const b = await shoot(ctx, "https://web.ziny.io/");
const { pct } = diffPct(a, b);
console.log(`  diff: ${pct}%`);

await browser.close();
