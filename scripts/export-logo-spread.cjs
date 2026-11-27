// Exports the HOME-PAGE claw mark (the three thin, spread-out scratches from src/components/Claws.tsx,
// tilted 16deg like on the site) as 5 square logos, each a different scratch colour on a different
// background. SVG + 1024px PNG each. Run: node scripts/export-logo-spread.cjs -> public/brand/logo/spread/
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "public", "brand", "logo", "spread");
// the exact shapes from Claws.tsx (no outline, so they stay thin and apart)
const PATHS = [
  "M28 6 C 50 60, 58 140, 40 214 C 86 142, 80 58, 28 6 Z",
  "M80 0 C 102 60, 110 146, 92 224 C 136 148, 130 56, 80 0 Z",
  "M132 14 C 150 66, 156 140, 140 206 C 180 140, 176 64, 132 14 Z",
];
// the tilted scratches measure ~196 x 254 around (106.4, 121.7): centre them in a square with room around
const VIEW = "-78.6 -63.3 370 370";
const LOGOS = [
  { name: "green-white", bg: "#078F3B", ink: "#ffffff" },
  { name: "black-green", bg: "#0b0b0a", ink: "#22d36b" },
  { name: "white-black", bg: "#ffffff", ink: "#0b0b0a" },
  { name: "denim-cream", bg: "#3e4a6e", ink: "#f2f1ec" },
  { name: "concrete-black", bg: "#a9a7a0", ink: "#0b0b0a" },
];
const svg = ({ bg, ink }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}" width="1024" height="1024"><rect x="-78.6" y="-63.3" width="370" height="370" fill="${bg}"/><g transform="rotate(16 92 115)" fill="${ink}">${PATHS.map((d) => `<path d="${d}"/>`).join("")}</g></svg>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const l of LOGOS) {
    const s = svg(l);
    fs.writeFileSync(path.join(OUT, `crawler-${l.name}.svg`), s + "\n");
    await p.setContent(`<html><body style="margin:0">${s}</body></html>`);
    await p.screenshot({ path: path.join(OUT, `crawler-${l.name}-1024.png`), clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  }
  await b.close();
  console.log(fs.readdirSync(OUT).join("\n"));
})();
