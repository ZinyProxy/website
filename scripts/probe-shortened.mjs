/**
 * Probe shortened versions of every captured slug to find production 301 redirects
 * we haven't replicated yet. Outputs reference/discovered-redirects.json.
 */
import { readdirSync, writeFileSync } from "node:fs";

async function probe(url) {
  try {
    const r = await fetch(url, { redirect: "manual" });
    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) return new URL(loc, url).pathname;
    return null;
  } catch { return null; }
}

const captured = new Set(
  readdirSync("src/captured").filter((f) => f.endsWith(".body.html")).map((f) => f.replace(/\.body\.html$/, "").replace(/__/g, "/"))
);

const candidates = new Set();
for (const slug of captured) {
  if (slug === "home" || slug.startsWith("__")) continue;
  const parts = slug.split("/");
  const last = parts[parts.length - 1];
  const STRIPS = [
    (s) => s.replace(/-proxy$/, ""),
    (s) => s.replace(/-proxies$/, ""),
    (s) => s.replace(/-guide$/, ""),
    (s) => s.replace(/-tutorial$/, ""),
    (s) => s.replace(/-review$/, ""),
    (s) => s.replace(/-list-\d+$/, ""),
    (s) => s.replace(/-list$/, ""),
    (s) => s.replace(/^how-to-/, ""),
    (s) => s.replace(/^best-/, ""),
    (s) => s.replace(/^what-is-/, ""),
    (s) => s.replace(/^what-are-/, ""),
    (s) => s.replace(/-2025$/, ""),
    (s) => s.replace(/-2026$/, ""),
    (s) => s.replace(/-tracking$/, ""),
    (s) => s.replace(/^the-/, ""),
    (s) => s.replace(/-complete$/, ""),
    (s) => s.replace(/-step-by-step$/, ""),
    (s) => s.replace(/-2025-/, "-"),
    (s) => s.replace(/-2026-/, "-"),
    (s) => s.replace(/^[a-z]+-([a-z]+(?:-[a-z]+)?)-(.*)/, "$1-$2"),
  ];
  for (const fn of STRIPS) {
    const stripped = fn(last);
    if (stripped && stripped !== last && stripped.length > 2 && !stripped.startsWith("-")) {
      candidates.add("/" + parts.slice(0, -1).concat(stripped).join("/"));
    }
  }
}

const candList = [...candidates].filter((c) => !captured.has(c.slice(1)));
console.log(`probing ${candList.length} candidate shortened URLs...`);
const found = [];
const BATCH = 12;
for (let i = 0; i < candList.length; i += BATCH) {
  const slice = candList.slice(i, i + BATCH);
  const results = await Promise.all(slice.map(async (p) => {
    const live = await probe(`https://ziny.io${p}`);
    if (live) {
      const mine = await probe(`https://web.ziny.io${p}`);
      return { from: p, live, mine };
    }
    return null;
  }));
  for (const r of results) {
    if (r && r.live !== r.mine && r.live && !r.live.includes("wp-admin") && !r.live.includes("wp-login")) {
      found.push(r);
      console.log(`  + ${r.from.padEnd(40)} → ${r.live}`);
    }
  }
  process.stdout.write(`\r  scanned ${Math.min(i + BATCH, candList.length)}/${candList.length}`);
}
console.log(`\nfound ${found.length} unmatched redirects`);
writeFileSync("reference/discovered-redirects.json", JSON.stringify(found, null, 2));
