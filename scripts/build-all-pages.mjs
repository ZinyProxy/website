/**
 * Process every captured page in reference/pages/<slug>/page.html into the
 * pair src/captured/<slug>.{body.html, styles.css} that [...slug].astro and
 * index.astro read at build time.
 *
 * For each page: inlines all external <link rel=stylesheet> + every inline
 * <style> block, strips client scripts, mirrors any new wp uploads to
 * /public/ziny/, rewrites image URLs to local. Page-specific CSS bundle so
 * widgets that only appear on certain pages still style correctly.
 *
 * Run: node scripts/build-all-pages.mjs [--only home,residential-proxy,...]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REF_DIR = 'reference/pages';
const OUT_DIR = 'src/captured';
const ASSET_DIR = 'public/ziny';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ASSET_DIR, { recursive: true });

const only = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? new Set(process.argv[i + 1].split(',')) : null; })();

const allSlugs = readdirSync(REF_DIR).filter((s) => {
  try { return statSync(join(REF_DIR, s)).isDirectory() && existsSync(join(REF_DIR, s, 'page.html')); } catch { return false; }
});
const slugs = only ? allSlugs.filter((s) => only.has(s)) : allSlugs;
console.log(`processing ${slugs.length} pages…`);

// --- shared CSS fetch cache (many pages share the same external CSS files) -
const cssCache = new Map();
async function fetchCss(url) {
  if (cssCache.has(url)) return cssCache.get(url);
  const baseUrl = new URL(url);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let css = await res.text();
    css = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (_, q, ref) => {
      if (/^(?:data:|https?:|\/\/)/i.test(ref)) return `url(${q}${ref}${q})`;
      const abs = new URL(ref, baseUrl).toString();
      return `url(${q}${abs}${q})`;
    });
    cssCache.set(url, css);
    return css;
  } catch (e) {
    console.warn(`  ! css skipped ${url}: ${e.message}`);
    cssCache.set(url, '');
    return '';
  }
}

// --- asset mirroring ------------------------------------------------------
const uploadRe = /(?:https?:)?\/\/ziny\.io\/wp-content\/uploads\/[^/]+\/(?:[^/]+\/)*([^?#"' )]+\.(?:png|jpe?g|webp|svg|gif|avif|woff2?|ttf|otf|eot))/gi;
const fetchedAssets = new Set();
async function mirror(name, fullUrl) {
  if (!name || fetchedAssets.has(name)) return;
  fetchedAssets.add(name);
  const dest = join(ASSET_DIR, name);
  if (existsSync(dest)) return;
  try {
    const safe = fullUrl.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c)).replace(/^\/\//, 'https://');
    const r = await fetch(safe);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    /* silent — many srcset paths legitimately 404 on the live site */
  }
}

let processed = 0;
for (const slug of slugs) {
  const html = readFileSync(join(REF_DIR, slug, 'page.html'), 'utf8');

  const cssUrls = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [])
    .map((t) => t.match(/href=["']([^"']+)["']/i)?.[1])
    .filter((u) => u && /^https?:\/\//i.test(u));

  const ext = [];
  for (const u of cssUrls) ext.push(`/* === ${u} === */\n${await fetchCss(u)}`);
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  let styles = [...ext, inlineCss].join('\n');

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  if (!bodyMatch) { console.warn(`  ! no <body> in ${slug}`); continue; }
  let body = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/g, '')
    .replace(/<link[^>]+rel=["']preload["'][^>]*>/g, '');

  // Collect & mirror referenced uploads, then rewrite to /ziny/<basename>.
  const refs = new Map();
  for (const m of styles.matchAll(uploadRe)) refs.set(m[1], m[0]);
  for (const m of body.matchAll(uploadRe)) refs.set(m[1], m[0]);
  for (const [name, full] of refs) await mirror(name, full);

  const rw = (s) => s.replace(uploadRe, (_full, name) => `/ziny/${name}`);
  body = rw(body).replace(/srcset="([^"]+)"/g, (_, ss) =>
    `srcset="${ss.split(',').map((p) => {
      const [u, sz] = p.trim().split(/\s+/);
      return [u.replace(uploadRe, (_f, n) => `/ziny/${n}`), sz].filter(Boolean).join(' ');
    }).join(', ')}"`,
  );
  styles = rw(styles);

  writeFileSync(join(OUT_DIR, `${slug}.styles.css`), styles);
  writeFileSync(join(OUT_DIR, `${slug}.body.html`), body);
  processed++;
  if (processed % 20 === 0) console.log(`  ${processed}/${slugs.length}…`);
}
console.log(`✓ done: ${processed} pages, ${cssCache.size} unique CSS files cached, ${fetchedAssets.size} assets touched`);
