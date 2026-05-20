/**
 * Process the captured live ziny.io homepage into two artifacts read by
 * src/pages/index.astro at build time:
 *   src/captured/home.styles.css  — every inline <style> block, asset URLs rewritten
 *   src/captured/home.body.html   — body inner HTML, scripts stripped, asset URLs rewritten
 *
 * Pixel parity is guaranteed by emitting Elementor's own CSS verbatim.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'reference/home/index.html';
const OUT_DIR = 'src/captured';
mkdirSync(OUT_DIR, { recursive: true });

const html = readFileSync(SRC, 'utf8');

const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join('\n');

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error('no <body> in capture');
let body = bodyMatch[1];

// Strip all client scripts — we re-implement motion ourselves.
body = body.replace(/<script[\s\S]*?<\/script>/g, '');
body = body.replace(/<noscript[\s\S]*?<\/noscript>/g, '');
body = body.replace(/<link[^>]+rel=["']preload["'][^>]*>/g, '');

const rewriteUrl = (u) => {
  const m = u.match(/(?:https?:)?\/\/ziny\.io\/wp-content\/uploads\/[^/]+\/(?:[^/]+\/)*([^?#"' )]+)/);
  return m ? `/ziny/${m[1]}` : u;
};

const rewriteAll = (s) => s.replace(
  /((?:https?:)?\/\/ziny\.io\/wp-content\/uploads\/[^"')\s]+\.(?:png|jpe?g|webp|svg|gif|avif))/gi,
  (m) => rewriteUrl(m),
);

body = rewriteAll(body).replace(/srcset="([^"]+)"/g, (_, ss) =>
  `srcset="${ss.split(',').map((p) => {
    const [u, sz] = p.trim().split(/\s+/);
    return [rewriteUrl(u), sz].filter(Boolean).join(' ');
  }).join(', ')}"`,
);
const stylesOut = rewriteAll(styles);

writeFileSync(`${OUT_DIR}/home.styles.css`, stylesOut);
writeFileSync(`${OUT_DIR}/home.body.html`, body);
console.log(`✓ css=${(stylesOut.length / 1024).toFixed(1)} KB  body=${(body.length / 1024).toFixed(1)} KB`);
