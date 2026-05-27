/**
 * Pixel-diff live-fullpage.png vs mine-fullpage.png, output diff.png
 * highlighting differences in red. Reports total % diff and the Y bands
 * with the densest differences (so we know which sections to look at).
 *
 * Run: node scripts/diff-pages.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const a = PNG.sync.read(readFileSync("reference/compare/live-fullpage.png"));
const b = PNG.sync.read(readFileSync("reference/compare/mine-fullpage.png"));

const width = Math.min(a.width, b.width);
const height = Math.min(a.height, b.height);
console.log(`live: ${a.width}×${a.height}, mine: ${b.width}×${b.height}, comparing: ${width}×${height}`);

// Crop both to same size (PNG.sync needs a same-size buffer)
function crop(png, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * png.width + x) * 4;
      const j = (y * w + x) * 4;
      out.data[j] = png.data[i];
      out.data[j + 1] = png.data[i + 1];
      out.data[j + 2] = png.data[i + 2];
      out.data[j + 3] = png.data[i + 3];
    }
  }
  return out;
}
const A = crop(a, width, height);
const B = crop(b, width, height);

const diff = new PNG({ width, height });
const diffPixels = pixelmatch(A.data, B.data, diff.data, width, height, {
  threshold: 0.1,
  includeAA: false,
  diffColor: [255, 0, 0],
  alpha: 0.4,
});

const total = width * height;
console.log(`different pixels: ${diffPixels} / ${total} (${(diffPixels / total * 100).toFixed(2)}%)`);

writeFileSync("reference/compare/diff.png", PNG.sync.write(diff));
console.log("wrote reference/compare/diff.png");

// Count diff pixels per horizontal band (200px tall) so we know which sections diverge.
const BAND = 200;
const bands = Math.ceil(height / BAND);
const counts = new Array(bands).fill(0);
for (let y = 0; y < height; y++) {
  const band = Math.floor(y / BAND);
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    // pixelmatch wrote red where they differ; anti-aliased = yellow. We count any red channel > G+B.
    if (diff.data[idx] > 200 && diff.data[idx + 1] < 100) counts[band]++;
  }
}
console.log("\nDiff density by 200px band (Y range → diff pixel count → % of band):");
counts.forEach((c, i) => {
  const pct = (c / (BAND * width) * 100).toFixed(2);
  const bar = "█".repeat(Math.min(60, Math.round(c / (BAND * width) * 600)));
  console.log(`  y=${(i * BAND).toString().padStart(5)}-${((i + 1) * BAND).toString().padStart(5)}: ${c.toString().padStart(7)} (${pct}%) ${bar}`);
});
