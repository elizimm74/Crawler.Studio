// Renders public/brand/logo-options/<name>.html into <name>.png (for picking a new logo).
//   node scripts/render-logo-options.cjs           -> options.png
//   node scripts/render-logo-options.cjs claw-c    -> claw-c.png
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const dir = path.join(__dirname, "..", "public", "brand", "logo-options");
  const name = process.argv[2] || "options";
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1840, height: 560 }, deviceScaleFactor: 2 });
  await p.goto("file://" + path.join(dir, `${name}.html`), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.locator("#g").screenshot({ path: path.join(dir, `${name}.png`) });
  await b.close();
  console.log(`saved public/brand/logo-options/${name}.png`);
})();
