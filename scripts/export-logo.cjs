// Exports the Crawler logo (the three solid claw scratches, src/components/Mark.tsx) as files:
// SVGs in 3 colours, transparent PNGs, a "mark + crawler" lockup and a square profile icon.
// Run: node scripts/export-logo.cjs   -> public/brand/logo/
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "public", "brand", "logo");
const PATHS = [
  "M28 6 C 50 60, 58 140, 40 214 C 86 142, 80 58, 28 6 Z",
  "M80 0 C 102 60, 110 146, 92 224 C 136 148, 130 56, 80 0 Z",
  "M132 14 C 150 66, 156 140, 140 206 C 180 140, 176 64, 132 14 Z",
];
const COLORS = { black: "#0b0b0a", white: "#ffffff", denim: "#3e4a6e" };
const mark = (color, size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40.6 -25.3 294 294"${size ? ` width="${size}" height="${size}"` : ""}><g transform="rotate(16 92 115)" fill="${color}" stroke="${color}" stroke-width="30" stroke-linejoin="round">${PATHS.map((d) => `<path d="${d}"/>`).join("")}</g></svg>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, c] of Object.entries(COLORS)) fs.writeFileSync(path.join(OUT, `crawler-mark-${name}.svg`), mark(c) + "\n");

  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  const font = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@800&display=block">';
  const shot = async (html, w, h, file, transparent = true) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head>${font}<style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file), omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
  };
  // the mark alone, transparent, big enough for anything
  for (const [name, c] of Object.entries(COLORS)) await shot(mark(c, 1024), 1024, 1024, `crawler-mark-${name}-1024.png`);
  // lockup: mark + "crawler" wordmark (Geist 800, like the site header)
  const lockup = (c) =>
    `<div style="display:flex;align-items:center;gap:56px;padding:40px 64px;width:max-content">${mark(c, 300)}<span style="font:800 260px/1 Geist,sans-serif;letter-spacing:-0.06em;color:${c};padding-bottom:30px">crawler</span></div>`;
  for (const name of ["black", "white"]) {
    await p.setViewportSize({ width: 2000, height: 400 });
    await p.setContent(`<!doctype html><html><head>${font}<style>html,body{margin:0;background:transparent}</style></head><body>${lockup(COLORS[name])}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const box = await p.locator("div").first().boundingBox();
    await p.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
    await p.screenshot({ path: path.join(OUT, `crawler-lockup-${name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) } });
  }
  // square profile icon (X, TikTok, Instagram, App Store-style): white mark on washed denim, and black on concrete-grey
  await shot(`<div style="width:1024px;height:1024px;background:#3e4a6e;display:grid;place-items:center">${mark("#ffffff", 700)}</div>`, 1024, 1024, "crawler-icon-denim-1024.png", false);
  await shot(`<div style="width:1024px;height:1024px;background:#a9a7a0;display:grid;place-items:center">${mark("#0b0b0a", 700)}</div>`, 1024, 1024, "crawler-icon-concrete-1024.png", false);
  await b.close();
  console.log(fs.readdirSync(OUT).join("\n"));
})();
