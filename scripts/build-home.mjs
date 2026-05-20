/**
 * Generate the pixel-faithful homepage from a Playwright capture of ziny.io.
 *
 * Source of truth: reference/pages/home/page.html  (the POST-JS rendered DOM
 * — what users actually see — captured by scripts/crawl-ziny.mjs).
 *
 * Pulls ALL external stylesheets the page links to + every inline <style>
 * block, then concatenates them so the rebuild has Elementor's exact look
 * without running a byte of Elementor's JS. Image URLs rewritten to our
 * self-hosted /ziny/ copies; any missing images are downloaded automatically.
 *
 * Outputs:
 *   src/captured/home.styles.css
 *   src/captured/home.body.html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = 'reference/pages/home/page.html';
const OUT_DIR = 'src/captured';
const ASSET_DIR = 'public/ziny';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ASSET_DIR, { recursive: true });

const html = readFileSync(SRC, 'utf8');

// --- Asset mirroring helpers ----------------------------------------------
const uploadRe = /(?:https?:)?\/\/ziny\.io\/wp-content\/uploads\/[^/]+\/(?:[^/]+\/)*([^?#"' )]+\.(?:png|jpe?g|webp|svg|gif|avif|woff2?|ttf|otf|eot))/gi;
const fetchedAssets = new Set();
async function mirrorAsset(name, fullUrl) {
  if (!name || fetchedAssets.has(name)) return;
  fetchedAssets.add(name);
  const dest = join(ASSET_DIR, name);
  if (existsSync(dest)) return;
  try {
    // URL-encode any non-ASCII characters (e.g. en-dashes in slugs).
    const safeUrl = fullUrl.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));
    const res = await fetch(safeUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    console.warn(`  ! mirror failed ${name}: ${e.message}`);
  }
}

// --- Pull every external stylesheet, rewrite its url() to absolute --------
const linkTags = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [];
const cssUrls = linkTags
  .map((t) => t.match(/href=["']([^"']+)["']/i)?.[1])
  .filter((u) => u && /^https?:\/\//i.test(u));

console.log(`fetching ${cssUrls.length} external stylesheets…`);
const externalCss = [];
for (const url of cssUrls) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let css = await res.text();
    const baseUrl = new URL(url);
    css = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (_, q, ref) => {
      if (/^(?:data:|https?:|\/\/)/i.test(ref)) return `url(${q}${ref}${q})`;
      const abs = new URL(ref, baseUrl).toString();
      return `url(${q}${abs}${q})`;
    });
    externalCss.push(`/* === ${url} === */\n${css}`);
  } catch (e) {
    console.warn(`  ! skipped ${url}: ${e.message}`);
  }
}

// --- Inline <style> blocks ------------------------------------------------
const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join('\n');

// --- Body innerHTML, scripts/preloads stripped ---------------------------
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error('no <body> in capture');
let body = bodyMatch[1];
body = body.replace(/<script[\s\S]*?<\/script>/g, '');
body = body.replace(/<noscript[\s\S]*?<\/noscript>/g, '');
body = body.replace(/<link[^>]+rel=["']preload["'][^>]*>/g, '');

// --- Rewrite wp uploads -> /ziny/<basename>, mirror missing assets --------
const seen = new Map();
const rewriteUploadFull = (full) => {
  const m = full.match(uploadRe);
  if (!m) return full;
  uploadRe.lastIndex = 0;
  return full;
};
async function rewrite(s) {
  const matches = [...s.matchAll(uploadRe)];
  for (const m of matches) {
    const name = m[1];
    seen.set(name, m[0]);
  }
  return s.replace(uploadRe, (_full, name) => `/ziny/${name}`);
}

let bodyRw = await rewrite(body);
bodyRw = bodyRw.replace(/srcset="([^"]+)"/g, (_, ss) =>
  `srcset="${ss.split(',').map((p) => {
    const [u, sz] = p.trim().split(/\s+/);
    const out = u.replace(uploadRe, (_f, n) => `/ziny/${n}`);
    return [out, sz].filter(Boolean).join(' ');
  }).join(', ')}"`,
);

const stylesJoined = [...externalCss, inlineCss].join('\n');
const stylesRw = await rewrite(stylesJoined);

// --- Mirror anything referenced we don't yet have locally -----------------
console.log(`mirroring ${seen.size} unique assets (skipping already-local)…`);
let downloaded = 0;
for (const [name, fullUrl] of seen) {
  const dest = join(ASSET_DIR, name);
  if (existsSync(dest)) continue;
  await mirrorAsset(name, fullUrl);
  downloaded++;
}
console.log(`  downloaded ${downloaded}, total assets: ${seen.size}`);

writeFileSync(`${OUT_DIR}/home.styles.css`, stylesRw);
writeFileSync(`${OUT_DIR}/home.body.html`, bodyRw);
console.log(`✓ css=${(stylesRw.length / 1024).toFixed(1)} KB  body=${(bodyRw.length / 1024).toFixed(1)} KB  (external CSS files inlined: ${externalCss.length})`);
