import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then(c => c.newPage());
await page.goto("https://ziny.io/", { waitUntil: "load", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);

const data = await page.evaluate(() => {
  const targets = ["Products", "Features", "Use Cases"];
  const out = {};
  for (const t of targets) {
    // Find ANY element whose direct text equals (or starts with) the target.
    const els = [...document.querySelectorAll("*")].filter((el) => {
      const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
      return text.toLowerCase() === t.toLowerCase() && el.offsetParent !== null;
    });
    out[t] = els.slice(0, 5).map((el) => ({
      tag: el.tagName.toLowerCase(),
      classes: el.className.slice(0, 100),
      role: el.getAttribute("role") || el.closest("[role]")?.getAttribute("role"),
      id: el.id,
      parentTag: el.parentElement?.tagName?.toLowerCase(),
      parentClasses: el.parentElement?.className?.slice(0, 100),
    }));
  }
  return out;
});

for (const [item, hits] of Object.entries(data)) {
  console.log(`\n"${item}" → ${hits.length} matches`);
  for (const h of hits) console.log(`  <${h.tag} class="${h.classes}" id="${h.id}" role="${h.role}"> inside <${h.parentTag} class="${h.parentClasses}">`);
}

await browser.close();
