/**
 * Hover each top-nav item on live ziny.io AND web.ziny.io, capture the
 * resulting mega-menu dropdown's HTML and a screenshot.
 *
 * Outputs into reference/compare/dropdowns/:
 *   <site>-<item>.html  — outerHTML of the opened dropdown panel
 *   <site>-<item>.png   — screenshot of the dropdown area
 *   summary.json        — link counts + first 5 link hrefs per dropdown
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "reference/compare/dropdowns";
mkdirSync(OUT, { recursive: true });

const SITES = [
  { label: "live", url: "https://ziny.io/" },
  { label: "mine", url: "https://web.ziny.io/" },
];

// The top-nav items to probe (text match, case-insensitive). The dropdowns
// are usually positioned just below the link, opened on hover.
const ITEMS = ["Products", "Features", "Use Cases"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const summary = {};

for (const { label, url } of SITES) {
  console.log(`\n=== ${label} (${url}) ===`);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  summary[label] = {};

  for (const item of ITEMS) {
    const key = item.toLowerCase().replace(/\s+/g, "-");
    console.log(`  hover "${item}"…`);

    // Trigger: <div class="e-n-menu-title-container"> wrapping the <span> with the item text.
    // Use the FIRST visible one (desktop nav comes before mobile).
    const handle = await page.evaluateHandle((text) => {
      const triggers = [...document.querySelectorAll(".e-n-menu-title-container")].filter((t) => t.offsetParent !== null);
      return triggers.find((t) => t.textContent.trim().toLowerCase() === text.toLowerCase()) ?? null;
    }, item);
    const el = handle.asElement();
    if (!el) {
      console.warn(`    ! "${item}" trigger not found`);
      summary[label][key] = { error: "trigger not found" };
      continue;
    }

    await el.hover();
    await page.waitForTimeout(800);

    // The dropdown panel for Elementor's new nav menu is .e-n-menu-content
    // (sibling of the title containers). Pick the one currently visible with
    // the most links.
    const data = await page.evaluate(() => {
      const panels = [...document.querySelectorAll(".e-n-menu-content, .e-n-menu-content-wrapper, [data-elementor-type='popup']")];
      let best = null;
      let bestScore = 0;
      for (const c of panels) {
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.5) continue;
        if (r.width < 100 || r.height < 50) continue;
        const linkCount = c.querySelectorAll("a").length;
        const score = linkCount * 100 + r.width;
        if (score > bestScore) { best = c; bestScore = score; }
      }
      if (!best) return null;
      const links = [...best.querySelectorAll("a")].map((a) => ({
        text: a.textContent.trim().replace(/\s+/g, " ").slice(0, 60),
        href: a.getAttribute("href"),
      })).filter((l) => l.text);
      const r = best.getBoundingClientRect();
      return {
        outerHTML: best.outerHTML,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        linkCount: links.length,
        links,
      };
    });

    if (!data) {
      console.warn(`    ! no dropdown opened for "${item}"`);
      summary[label][key] = { error: "dropdown didn't open" };
      continue;
    }

    writeFileSync(join(OUT, `${label}-${key}.html`), data.outerHTML);
    // Screenshot the dropdown region (clip to its bounding rect, padded)
    const clip = {
      x: Math.max(0, data.rect.x - 10),
      y: Math.max(0, data.rect.y - 10),
      width: Math.min(1440, data.rect.w + 20),
      height: Math.min(900 - data.rect.y, data.rect.h + 20),
    };
    if (clip.width > 0 && clip.height > 0) {
      await page.screenshot({ path: join(OUT, `${label}-${key}.png`), clip });
    }
    summary[label][key] = { linkCount: data.linkCount, rect: data.rect, firstLinks: data.links.slice(0, 8) };
    console.log(`    ✓ ${data.linkCount} links, ${data.rect.w}×${data.rect.h} at (${data.rect.x},${data.rect.y})`);

    // Move mouse away to close before next hover
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
  }

  await page.close();
}

writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.log("\nDone. Summary:");
console.log(JSON.stringify(summary, null, 2));

await browser.close();
