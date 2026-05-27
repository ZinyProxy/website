/**
 * Crop the same Y bands from live + mine fullpage screenshots so we can
 * inspect what's actually different in each hotspot identified by diff-pages.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const BANDS = [
  { name: "band-200-700", y: 200, h: 500 },
  { name: "band-2000-2700", y: 2000, h: 700 },
  { name: "band-4600-5000", y: 4600, h: 400 },
  { name: "band-5400-6000", y: 5400, h: 600 },
  { name: "band-7000-7700", y: 7000, h: 700 },
];

function cropY(png, y0, h) {
  const out = new PNG({ width: png.width, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = ((y0 + y) * png.width + x) * 4;
      const j = (y * png.width + x) * 4;
      out.data[j] = png.data[i];
      out.data[j + 1] = png.data[i + 1];
      out.data[j + 2] = png.data[i + 2];
      out.data[j + 3] = png.data[i + 3];
    }
  }
  return out;
}

const live = PNG.sync.read(readFileSync("reference/compare/live-fullpage.png"));
const mine = PNG.sync.read(readFileSync("reference/compare/mine-fullpage.png"));

for (const b of BANDS) {
  writeFileSync(`reference/compare/${b.name}-live.png`, PNG.sync.write(cropY(live, b.y, b.h)));
  writeFileSync(`reference/compare/${b.name}-mine.png`, PNG.sync.write(cropY(mine, b.y, b.h)));
  console.log(`✓ ${b.name}`);
}
