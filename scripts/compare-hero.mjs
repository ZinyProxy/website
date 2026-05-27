/**
 * Grab side-by-side screenshots of the hero section from live ziny.io
 * and our staging web.ziny.io for visual diagnosis.
 *
 * Saves to: reference/compare/{live,mine}-hero.png + -full.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("reference/compare", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

async function grab(label, url) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  // Trigger lazy-loaded images: scroll to bottom slowly, wait, scroll back to top.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500); // let animations settle
  // Hero only (above the fold)
  await page.screenshot({ path: `reference/compare/${label}-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  // Full page so section gradients lower down are visible
  await page.screenshot({ path: `reference/compare/${label}-fullpage.png`, fullPage: true });
  await page.close();
  console.log(`✓ ${label} ${url}`);
}

await grab("live", "https://ziny.io/");
await grab("mine", "https://web.ziny.io/");

await browser.close();
console.log("Saved to reference/compare/");
