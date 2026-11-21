// Turns public/demo/crawler-app/screens.html into 5 phone screenshots (1170x2532, like an iPhone),
// ready to upload into Crawler's own App test, in order: 1.jpg ... 5.jpg (5 = the paywall).
// Also saves overview.png (all five side by side) for sharing.
// Run: node scripts/render-app-screens.cjs            (the Crawler app, 5 screens)
//      node scripts/render-app-screens.cjs mealmate   (the pretend MealMate app for /example, 7 screens, smaller files)
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const mealmate = process.argv[2] === "mealmate";
  const folder = mealmate ? "mealmate-app" : "crawler-app";
  const count = mealmate ? 7 : 5;
  const dir = path.join(__dirname, "..", "public", "demo", folder);
  const browser = await chromium.launch();
  const width = mealmate ? 3000 : 2200;
  const page = await browser.newPage({ viewport: { width, height: 920 }, deviceScaleFactor: mealmate ? 2 : 3 });
  await page.goto("file://" + path.join(dir, "screens.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (let i = 1; i <= count; i++) {
    await page.locator(`#s${i}`).screenshot({ path: path.join(dir, `${i}.jpg`), type: "jpeg", quality: mealmate ? 82 : 90 });
  }
  const sheet = await browser.newPage({ viewport: { width, height: 920 }, deviceScaleFactor: 1 });
  await sheet.goto("file://" + path.join(dir, "screens.html"), { waitUntil: "networkidle" });
  await sheet.evaluate(() => document.fonts.ready);
  await sheet.locator(".row").screenshot({ path: path.join(dir, "overview.png") });
  await browser.close();
  console.log(`saved 1.jpg ... ${count}.jpg and overview.png in public/demo/${folder}/`);
})();
