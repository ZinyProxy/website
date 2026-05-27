/**
 * Extract <head> + <html> attrs from reference/raw/<slug>.html
 * into src/captured/<slug>.head.html and <slug>.html-attrs.json.
 *
 * No network — pure local parse over the raw server HTML we already have.
 * Run: `node scripts/extract-heads.mjs`
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'reference/raw';
const OUT = 'src/captured';

const files = readdirSync(RAW).filter((f) => f.endsWith('.html'));
console.log(`extracting head + html attrs from ${files.length} raw pages`);

const reHtmlTag = /<html\b([^>]*)>/i;
const reHead = /<head\b[^>]*>([\s\S]*?)<\/head>/i;
const reAttr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;

let ok = 0, fail = 0;
for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  try {
    const html = readFileSync(join(RAW, file), 'utf8');

    const htmlMatch = html.match(reHtmlTag);
    const attrs = {};
    if (htmlMatch) {
      let m;
      reAttr.lastIndex = 0;
      while ((m = reAttr.exec(htmlMatch[1])) !== null) {
        attrs[m[1]] = m[2];
      }
    }

    const headMatch = html.match(reHead);
    if (!headMatch) throw new Error('no <head> found');

    writeFileSync(join(OUT, `${slug}.head.html`), headMatch[1].trim() + '\n');
    writeFileSync(join(OUT, `${slug}.html-attrs.json`), JSON.stringify(attrs, null, 2) + '\n');
    ok++;
  } catch (e) {
    console.warn(`! ${slug}: ${e.message}`);
    fail++;
  }
}
console.log(`done: ${ok} ok, ${fail} failed`);
