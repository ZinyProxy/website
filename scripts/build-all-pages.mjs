/**
 * Build pixel-faithful pages from the INITIAL server HTML (reference/raw/<slug>.html).
 *
 * Why initial HTML, not the post-JS DOM: the post-JS DOM has Elementor's
 * sticky-header clone + lazyload mutations baked in, which break served
 * statically. The initial HTML is clean WordPress output.
 *
 * Per page: inline all external CSS + inline <style>, strip scripts,
 * UN-LAZY every image (data-src/data-srcset -> src/srcset, drop the base64
 * placeholder + lazyload class), mirror + rewrite ziny.io upload URLs to /ziny/.
 *
 * Outputs src/captured/<slug>.{body.html, styles.css} + populates public/ziny/.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAW_DIR = 'reference/raw';
const OUT_DIR = 'src/captured';
const ASSET_DIR = 'public/ziny';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ASSET_DIR, { recursive: true });

const only = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? new Set(process.argv[i + 1].split(',')) : null; })();
const slugs = readdirSync(RAW_DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.replace(/\.html$/, ''))
  .filter((s) => !only || only.has(s));
console.log(`processing ${slugs.length} pages…`);

// --- ziny.io upload URL -> /ziny/<basename> (clean) -----------------------
const ZINY_UPLOAD = /(?:https?:)?\/\/ziny\.io\/wp-content\/uploads\/(?:[^"'\s)]+\/)?([^\/"'\s)?#]+\.(?:png|jpe?g|webp|svg|gif|avif|woff2?|ttf|otf|eot))/gi;
const rewriteUrls = (s) => s.replace(ZINY_UPLOAD, (_m, file) => `/ziny/${file}`);

// --- collect upload basenames -> a real URL, for mirroring ----------------
function collectAssets(s, map) {
  for (const m of s.matchAll(ZINY_UPLOAD)) {
    const file = m[1];
    if (!map.has(file)) map.set(file, m[0].replace(/^\/\//, 'https://'));
  }
}
const fetchedAssets = new Set();
async function mirror(file, url) {
  if (fetchedAssets.has(file)) return;
  fetchedAssets.add(file);
  const dest = join(ASSET_DIR, file);
  if (existsSync(dest)) return;
  try {
    const safe = url.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));
    const r = await fetch(safe);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  } catch { /* many srcset variants legitimately 404 on the live site */ }
}

// --- un-lazy a single <img> or <source> tag -------------------------------
function unlazy(tag) {
  const dataSrc = tag.match(/\sdata-src="([^"]*)"/i)?.[1];
  const dataSrcset = tag.match(/\sdata-srcset="([^"]*)"/i)?.[1];
  let out = tag;
  if (dataSrc) {
    const first = dataSrc.split(',')[0].trim().split(/\s+/)[0];
    out = /\ssrc="/i.test(out) ? out.replace(/\ssrc="[^"]*"/i, ` src="${first}"`) : out.replace(/<(img|source)/i, `<$1 src="${first}"`);
  }
  if (dataSrcset) {
    out = /\ssrcset="/i.test(out) ? out.replace(/\ssrcset="[^"]*"/i, ` srcset="${dataSrcset}"`) : out.replace(/<(img|source)/i, `<$1 srcset="${dataSrcset}"`);
  }
  return out.replace(/\blazyload\b/g, '').replace(/\sloading="lazy"/gi, '');
}

// --- shared external-CSS cache (most pages share Elementor framework CSS) --
const cssCache = new Map();
async function fetchCss(url) {
  if (cssCache.has(url)) return cssCache.get(url);
  const base = new URL(url);
  let css = '';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) {
      css = await r.text();
      css = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (_, q, ref) =>
        /^(?:data:|https?:|\/\/)/i.test(ref) ? `url(${q}${ref}${q})` : `url(${q}${new URL(ref, base)}${q})`);
    }
  } catch { /* skip */ }
  cssCache.set(url, css);
  return css;
}

let done = 0;
for (const slug of slugs) {
  const html = readFileSync(join(RAW_DIR, `${slug}.html`), 'utf8');

  // CSS: external (cached) + inline blocks
  const cssUrls = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [])
    .map((t) => t.match(/href=["']([^"']+)["']/i)?.[1]).filter((u) => u && /^https?:\/\//i.test(u));
  const ext = [];
  for (const u of cssUrls) ext.push(await fetchCss(u));
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  let styles = rewriteUrls([...ext, inlineCss].join('\n'));

  // Body: strip scripts/preloads, un-lazy imgs+sources, rewrite urls
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  if (!bodyMatch) { console.warn(`! no body in ${slug}`); continue; }
  let body = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/g, '')
    .replace(/<link[^>]+rel=["']preload["'][^>]*>/g, '')
    .replace(/<(img|source)\b[^>]*>/gi, unlazy);
  body = rewriteUrls(body);

  // Mirror referenced assets
  const assets = new Map();
  collectAssets(html, assets); // from raw (catches data-src originals)
  for (const [file, url] of assets) await mirror(file, url);

  writeFileSync(join(OUT_DIR, `${slug}.styles.css`), styles);
  writeFileSync(join(OUT_DIR, `${slug}.body.html`), body);
  if (++done % 20 === 0) console.log(`  ${done}/${slugs.length}…`);
}
console.log(`✓ ${done} pages, ${cssCache.size} CSS cached, ${fetchedAssets.size} assets`);
