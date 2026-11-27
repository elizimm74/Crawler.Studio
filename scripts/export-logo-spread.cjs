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
  // the first 5
  { name: "green-white", bg: "#078F3B", ink: "#ffffff" },
  { name: "black-green", bg: "#0b0b0a", ink: "#22d36b" },
  { name: "white-black", bg: "#ffffff", ink: "#0b0b0a" },
  { name: "denim-cream", bg: "#3e4a6e", ink: "#f2f1ec" },
  { name: "concrete-black", bg: "#a9a7a0", ink: "#0b0b0a" },
  // 20 more (no orange or yellow: the founder ruled those out for Crawler)
  { name: "blue-white", bg: "#1d4ed8", ink: "#ffffff" },
  { name: "navy-sky", bg: "#0f1f3d", ink: "#7cc4ff" },
  { name: "sky-navy", bg: "#bfe3ff", ink: "#0f1f3d" },
  { name: "red-white", bg: "#d62839", ink: "#ffffff" },
  { name: "black-red", bg: "#0b0b0a", ink: "#ff3b4e" },
  { name: "pink-black", bg: "#ff8fc7", ink: "#0b0b0a" },
  { name: "hotpink-white", bg: "#e0418f", ink: "#ffffff" },
  { name: "purple-white", bg: "#6d28d9", ink: "#ffffff" },
  { name: "lavender-purple", bg: "#e6dcff", ink: "#5b21b6" },
  { name: "black-purple", bg: "#0b0b0a", ink: "#b18cff" },
  { name: "teal-white", bg: "#0d9e9c", ink: "#ffffff" },
  { name: "mint-forest", bg: "#c9f2dc", ink: "#0b5d33" },
  { name: "forest-mint", bg: "#0b3d23", ink: "#8ff0b8" },
  { name: "lime-black", bg: "#a6f25c", ink: "#0b0b0a" },
  { name: "black-lime", bg: "#0b0b0a", ink: "#a6f25c" },
  { name: "cream-denim", bg: "#f2f1ec", ink: "#3e4a6e" },
  { name: "charcoal-white", bg: "#2a2a28", ink: "#ffffff" },
  { name: "silver-navy", bg: "#d9dde3", ink: "#0f1f3d" },
  { name: "cyan-black", bg: "#22d3ee", ink: "#0b0b0a" },
  { name: "burgundy-pink", bg: "#5a0f24", ink: "#ff8fc7" },
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
