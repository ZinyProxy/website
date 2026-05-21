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
import { createHash } from 'node:crypto';

const RAW_DIR = 'reference/raw';
const OUT_DIR = 'src/captured';
const ASSET_DIR = 'public/ziny';
const FONT_DIR = 'public/ziny-fonts';
const CSS_DIR = 'public/ziny-css';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ASSET_DIR, { recursive: true });
mkdirSync(FONT_DIR, { recursive: true });
mkdirSync(CSS_DIR, { recursive: true });

const only = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? new Set(process.argv[i + 1].split(',')) : null; })();
const slugs = readdirSync(RAW_DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.replace(/\.html$/, ''))
  .filter((s) => !only || only.has(s));
console.log(`processing ${slugs.length} pages…`);

// --- ziny.io upload URL -> /ziny/<basename> (absolute OR root-relative) ----
const ZINY_UPLOAD = /(?:(?:https?:)?\/\/ziny\.io)?\/wp-content\/uploads\/(?:[^"'\s)]+\/)?([^\/"'\s)?#]+\.(?:png|jpe?g|webp|svg|gif|avif|woff2?|ttf|otf|eot))/gi;
const rewriteUrls = (s) => s.replace(ZINY_UPLOAD, (_m, file) => `/ziny/${file}`);
const toAbs = (u) => u.replace(/^\/\//, 'https://').replace(/^\/wp-content/, 'https://ziny.io/wp-content');

// --- collect upload basenames -> a real URL, for mirroring ----------------
function collectAssets(s, map) {
  for (const m of s.matchAll(ZINY_UPLOAD)) {
    if (!map.has(m[1])) map.set(m[1], toAbs(m[0]));
  }
}
const fetchedAssets = new Set();
async function mirror(file, url, dir = ASSET_DIR) {
  const key = `${dir}/${file}`;
  if (fetchedAssets.has(key)) return;
  fetchedAssets.add(key);
  const dest = join(dir, file);
  if (existsSync(dest)) return;
  try {
    const safe = url.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));
    const r = await fetch(safe);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  } catch { /* many srcset variants legitimately 404 on the live site */ }
}

// --- Fonts/icons ----------------------------------------------------------
// 1. Google Fonts: ziny.io localizes them under root-relative /fonts.gstatic.com/
//    which 404s for us -> point to the real Google CDN (serves CORS).
// 2. Plugin/theme webfonts (Font Awesome, eicons, …) load cross-origin from
//    ziny.io with NO CORS header -> browser blocks them. Self-host same-origin.
const ZINY_FONT = /(?:(?:https?:)?\/\/ziny\.io)?\/wp-(?:content|includes)\/[^"'\s)]+?\/([^\/"'\s)?#]+\.(?:woff2?|ttf|eot|otf|svg))(\?[^"'\s)#]*)?(#[^"'\s)]*)?/gi;
function collectFonts(s, map) {
  for (const m of s.matchAll(ZINY_FONT)) {
    if (!map.has(m[1])) map.set(m[1], toAbs(m[0].split('?')[0].split('#')[0]));
  }
}
function localizeFonts(css) {
  return css
    .replace(/(['"(])\/?\/?fonts\.gstatic\.com\//g, '$1https://fonts.gstatic.com/')
    .replace(ZINY_FONT, (_m, file, _q, frag = '') => `/ziny-fonts/${file}${frag || ''}`);
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

// Each external stylesheet is written ONCE to public/ziny-css/ and linked from
// every page — so the shared ~150KB Elementor CSS is downloaded once and
// browser-cached across all 147 pages (was inlined into every page = 393MB dist).
const sharedCss = new Map(); // url -> /ziny-css/<name>
async function ensureSharedCss(url) {
  if (sharedCss.has(url)) return sharedCss.get(url);
  let css = await fetchCss(url);
  if (!css) { sharedCss.set(url, null); return null; }
  const f = new Map();
  collectFonts(css, f);
  for (const [file, furl] of f) await mirror(file, furl, FONT_DIR);
  css = localizeFonts(rewriteUrls(css));
  const name = url.replace(/^https?:\/\//, '').replace(/\?.*$/, '').replace(/[^a-zA-Z0-9.]+/g, '_');
  writeFileSync(join(CSS_DIR, name), css);
  const href = `/ziny-css/${name}`;
  sharedCss.set(url, href);
  return href;
}

// --- Pre-pass: find inline <style> blocks repeated across many pages and
//     dedupe them into one cached file (header/footer templates, fonts, kit). --
const allRaw = readdirSync(RAW_DIR).filter((f) => f.endsWith('.html'));
const blkCount = new Map(); const blkContent = new Map(); const blkOrder = [];
const md5 = (s) => createHash('md5').update(s).digest('hex');
for (const f of allRaw) {
  const h = readFileSync(join(RAW_DIR, f), 'utf8');
  for (const m of h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const hash = md5(m[1]);
    if (!blkCount.has(hash)) { blkCount.set(hash, 0); blkContent.set(hash, m[1]); blkOrder.push(hash); }
    blkCount.set(hash, blkCount.get(hash) + 1);
  }
}
const SHARE_T = Math.ceil(allRaw.length * 0.5);
const sharedHashes = new Set(blkOrder.filter((h) => blkCount.get(h) >= SHARE_T));
const sharedInlineHref = '/ziny-css/_inline-shared.css';
{
  const sharedInline = blkOrder.filter((h) => sharedHashes.has(h)).map((h) => blkContent.get(h)).join('\n');
  const f = new Map(); collectFonts(sharedInline, f);
  for (const [file, url] of f) await mirror(file, url, FONT_DIR);
  writeFileSync(join(CSS_DIR, '_inline-shared.css'), localizeFonts(rewriteUrls(sharedInline)));
  console.log(`shared inline: ${sharedHashes.size} blocks deduped`);
}

let done = 0;
for (const slug of slugs) {
  const html = readFileSync(join(RAW_DIR, `${slug}.html`), 'utf8');

  // External CSS -> shared cached <link>s (written once). Page-specific inline
  // <style> blocks stay inlined (small, unique per page).
  const cssUrls = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [])
    .map((t) => t.match(/href=["']([^"']+)["']/i)?.[1]).filter((u) => u && /^https?:\/\//i.test(u));
  const links = [];
  for (const u of cssUrls) { const href = await ensureSharedCss(u); if (href) links.push(href); }
  links.push(sharedInlineHref); // common inline blocks, cached once

  // Only the page-UNIQUE inline blocks stay inline; shared ones are linked above.
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1]).filter((c) => !sharedHashes.has(md5(c))).join('\n');
  const fonts = new Map();
  collectFonts(inlineCss, fonts);
  for (const [file, url] of fonts) await mirror(file, url, FONT_DIR);
  let styles = localizeFonts(rewriteUrls(inlineCss));

  // Extract ALL scripts (head + body) IN ORDER so we can re-emit them as real,
  // executing <script> tags. This keeps Elementor's own JS (jQuery, frontend,
  // nested menu/tabs, swiper, sticky, the D3 globe, dashboard motion) running
  // EXACTLY like the live site. External src stays absolute (loads from ziny.io);
  // inline config (elementorFrontendConfig, sgd_plugin_data, …) is preserved.
  const scripts = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const srcM = attrs.match(/\ssrc=["']([^"']+)["']/i);
    const typeM = attrs.match(/\stype=["']([^"']+)["']/i);
    const type = typeM?.[1];
    // Skip JSON-LD / non-JS data blocks (kept in <head> SEO later, not executed here).
    if (type && !/javascript|module/i.test(type)) continue;
    if (srcM) {
      let src = srcM[1].replace(/^\/\//, 'https://');
      // Skip: WP emoji, GTM placeholder, and Cloudflare email-decode (the
      // /cdn-cgi/ path 404s on our origin; we decode emails at build time below).
      if (/wp-emoji-release|gtag\/js|googletagmanager|cdn-cgi|email-decode/i.test(src)) continue;
      scripts.push({ src });
    } else {
      let code = m[2].trim();
      if (!code || /wpemoji|gtag\(/i.test(code)) continue;
      // The D3 globe fetches its data via d3.json() — cross-origin to ziny.io
      // is CORS-blocked. Point it at our same-origin mirrored copies.
      code = code
        .replace(/https?:\\?\/\\?\/ziny\.io\/wp-content\/plugins\/spinning-globe\/data\/world-110m\.json/gi, '/ziny-globe/world-110m.json')
        .replace(/https?:\\?\/\\?\/ziny\.io\/wp-content\/plugins\/spinning-globe\/data\/marker-data\.json/gi, '/ziny-globe/marker-data.json')
        .replace(/https?:\\?\/\\?\/ziny\.io\/wp-content\/plugins\/spinning-globe\/assets\/img\/map\.png/gi, '/ziny-globe/map.png');
      scripts.push({ code });
    }
  }

  // Body: strip scripts/preloads, un-lazy imgs+sources, rewrite urls
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/);
  if (!bodyMatch) { console.warn(`! no body in ${slug}`); continue; }

  // CRITICAL: keep the <body> class attr. Elementor scopes its global colors,
  // typography AND the dark page background to `.elementor-kit-N` (+ page-id-*).
  // Without these classes the page renders white with fallback fonts.
  const bodyClass = bodyMatch[1].match(/class="([^"]*)"/i)?.[1] ?? '';

  let body = bodyMatch[2]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/g, '')
    .replace(/<link[^>]+rel=["']preload["'][^>]*>/g, '')
    .replace(/<(img|source)\b[^>]*>/gi, unlazy);
  body = rewriteUrls(body);

  // Internal links -> root-relative so they stay on the new site (not live ziny.io).
  // Leaves dashboard.ziny.io and other subdomains/externals untouched.
  body = body
    .replace(/((?:href|action)=")https?:\/\/ziny\.io\//gi, '$1/')
    .replace(/((?:href|action)=")\/\/ziny\.io\//gi, '$1/');

  // Decode Cloudflare-obfuscated emails (the /cdn-cgi/ decoder doesn't exist on
  // our origin). data-cfemail: first hex byte is the XOR key for the rest.
  const cfDecode = (hex) => {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  };
  body = body
    .replace(/<a\b[^>]*class="[^"]*__cf_email__[^"]*"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/a>/gi,
      (_m, hex) => { const e = cfDecode(hex); return `<a href="mailto:${e}">${e}</a>`; })
    .replace(/<span\b[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/span>/gi, (_m, hex) => cfDecode(hex))
    .replace(/href="\/cdn-cgi\/l\/email-protection[^"]*"/gi, 'href="#"');

  // Mirror referenced assets
  const assets = new Map();
  collectAssets(html, assets); // from raw (catches data-src originals)
  for (const [file, url] of assets) await mirror(file, url);

  writeFileSync(join(OUT_DIR, `${slug}.styles.css`), styles);
  writeFileSync(join(OUT_DIR, `${slug}.body.html`), body);
  writeFileSync(join(OUT_DIR, `${slug}.bodyclass.txt`), bodyClass);
  writeFileSync(join(OUT_DIR, `${slug}.scripts.json`), JSON.stringify(scripts));
  writeFileSync(join(OUT_DIR, `${slug}.links.json`), JSON.stringify(links));
  if (++done % 20 === 0) console.log(`  ${done}/${slugs.length}…`);
}
console.log(`✓ ${done} pages, ${cssCache.size} CSS cached, ${fetchedAssets.size} assets`);
