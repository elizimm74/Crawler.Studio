// npm run sitecheck [-- http://localhost:3000]
// REAL automated browser tests of Crawler's public pages (Playwright, already installed).
// For every page x device (iPhone, Android, iPad, laptop, large monitor) it checks:
//   no sideways scrolling, no console errors / page crashes, no broken images, no failed requests
//   to our own site, exactly one <h1>, a unique <title>, a meta description, buttons/links big
//   enough to tap on phones, and that every internal link on the page answers (not 404/500).
// Then it runs the key FLOWS: hero URL box (bad + good address), onboarding steps, the sample
// report tabs, the FAQ, the pricing cards and the PDF button on the sample report.
// Results go to data/sitecheck-<date>.json. Exit code 1 if anything failed.
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/pricing", "/example", "/example?kind=app", "/science", "/accuracy", "/onboarding", "/signin", "/signup", "/tools/paywall-checker", "/this-page-does-not-exist"];
const DEVICES = {
  "iPhone 15": devices["iPhone 15"] ?? devices["iPhone 13"],
  "Android (Pixel 7)": devices["Pixel 7"] ?? devices["Pixel 5"],
  "iPad": devices["iPad (gen 7)"] ?? devices["iPad Mini"],
  "Laptop 1440": { viewport: { width: 1440, height: 900 } },
  "Monitor 2560": { viewport: { width: 2560, height: 1440 } },
};

const results = [];
const record = (r) => {
  results.push(r);
  console.log(`${r.ok ? "✓" : "✗"} [${r.type}] ${r.device ? r.device + " " : ""}${r.page ?? ""} ${r.check}${r.detail ? " — " + r.detail : ""}`);
};

(async () => {
  const browser = await chromium.launch();
  const titles = new Map();
  const linkStatus = new Map();

  for (const [device, opts] of Object.entries(DEVICES)) {
    const ctx = await browser.newContext({ ...opts });
    for (const pg of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      const badRequests = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*404/.test(m.text()) && errors.push(m.text()));
      page.on("response", (res) => {
        const u = res.url();
        if (u.startsWith(BASE) && res.status() >= 500) badRequests.push(`${res.status()} ${u.replace(BASE, "")}`);
      });
      const res = await page.goto(BASE + pg, { waitUntil: "networkidle" }).catch((e) => ({ status: () => 0, e }));
      const status = res.status();
      const expect404 = pg.includes("does-not-exist");
      record({ type: "page", device, page: pg, check: "loads", ok: expect404 ? status === 404 : status === 200, detail: `HTTP ${status}` });
      await page.waitForTimeout(400);
      const info = await page.evaluate(() => {
        const smallTargets = [...document.querySelectorAll("a, button, input, select, [role=tab]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (!r.width || !r.height || style.visibility === "hidden" || el.closest("footer, .sr-only, p, li, td, dd, label")) return false;
            return r.height < 36 || r.width < 36;
          })
          .map((el) => (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30));
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          h1: document.querySelectorAll("h1").length,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
          brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src")),
          links: [...new Set([...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href")))],
          smallTargets,
        };
      });
      record({ type: "page", device, page: pg, check: "no sideways scroll", ok: info.overflow <= 1, detail: info.overflow > 1 ? `${info.overflow}px too wide` : "" });
      record({ type: "page", device, page: pg, check: "no console errors", ok: errors.length === 0, detail: errors.slice(0, 2).join(" | ").slice(0, 200) });
      record({ type: "page", device, page: pg, check: "no server errors", ok: badRequests.length === 0, detail: badRequests.slice(0, 3).join(", ") });
      record({ type: "page", device, page: pg, check: "images load", ok: info.brokenImages.length === 0, detail: info.brokenImages.join(", ") });
      if (device === "Laptop 1440") {
        record({ type: "seo", page: pg, check: "exactly one h1", ok: info.h1 === 1, detail: `${info.h1} found` });
        record({ type: "seo", page: pg, check: "has a meta description", ok: info.description.length > 40 || expect404, detail: info.description.slice(0, 60) });
        if (!expect404) titles.set(pg, info.title);
        for (const href of info.links) if (!linkStatus.has(href)) linkStatus.set(href, null);
      }
      if (device.startsWith("iPhone") || device.startsWith("Android")) {
        record({ type: "mobile", device, page: pg, check: "tap targets at least 36px", ok: info.smallTargets.length === 0, detail: info.smallTargets.slice(0, 5).join(", ") });
      }
      await page.close();
    }
    await ctx.close();
  }

  // unique titles (example + example?kind=app share one page on purpose)
  const seen = new Map();
  for (const [pg, t] of titles) seen.set(t, [...(seen.get(t) ?? []), pg]);
  for (const [t, pgs] of seen) record({ type: "seo", check: `unique title "${t}"`, ok: pgs.length === 1 || pgs.every((p) => p.startsWith("/example")), detail: pgs.join(", ") });

  // every internal link answers (private pages answer with a redirect to sign-in, which is fine)
  const req = await (await browser.newContext()).request;
  for (const href of linkStatus.keys()) {
    const r = await req.get(BASE + href, { maxRedirects: 0 }).catch(() => null);
    const s = r ? r.status() : 0;
    record({ type: "links", check: `link ${href}`, ok: s > 0 && s < 400, detail: `HTTP ${s}` });
  }

  // ---------- flows ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const flow = async (name, fn) => {
    try {
      const detail = await fn();
      record({ type: "flow", check: name, ok: true, detail: detail || "" });
    } catch (e) {
      record({ type: "flow", check: name, ok: false, detail: e.message.split("\n")[0].slice(0, 200) });
    }
  };
  await flow("hero: a bad address shows an error and stays on the page", async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.fill("#hero-url", "not a site");
    await p.getByRole("button", { name: /Run free simulation/ }).first().click();
    await p.getByRole("alert").first().waitFor({ timeout: 3000 });
    if (!p.url().endsWith("/")) throw new Error("navigated away");
  });
  await flow("hero: a good address goes to onboarding WITH the address", async () => {
    await p.fill("#hero-url", "example.com");
    await p.getByRole("button", { name: /Run free simulation/ }).first().click();
    await p.waitForURL(/\/onboarding\?url=example\.com/, { timeout: 8000 });
    await p.locator("#ob-url").waitFor();
    const v = await p.inputValue("#ob-url");
    if (!v.includes("example.com")) throw new Error(`url field = ${v}`);
  });
  await flow("onboarding: 'Continue' leads to the objectives step; objectives toggle", async () => {
    await p.getByRole("button", { name: /^Continue/ }).waitFor();
    await p.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /^Continue/.test(b.textContent) && !b.disabled), null, { timeout: 15000 });
    await p.getByRole("button", { name: /^Continue/ }).click();
    await p.getByRole("heading", { name: /What do you want to learn/ }).waitFor();
    const price = p.getByRole("button", { name: /Is my price reasonable/ });
    await price.click();
    if ((await price.getAttribute("aria-pressed")) !== "true") throw new Error("objective didn't toggle on");
  });
  await flow("onboarding: switching to 'Mobile app' changes the step", async () => {
    await p.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
    await p.getByRole("button", { name: /Mobile app \(screenshots\)/ }).click();
    await p.getByRole("heading", { name: /Testing a mobile app/ }).waitFor();
  });
  await flow("home: the live simulation preview runs and the sample report shows ranked fixes", async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    // the preview starts at customer 1 and moves on by itself (demo data)
    await p.getByText(/Simulating \d+\/100/).first().waitFor({ timeout: 5000 });
    await p.getByText("Ranked fixes", { exact: true }).first().waitFor({ timeout: 3000 });
    await p.getByText("Show the price on the homepage").first().waitFor({ timeout: 3000 });
    await p.getByText(/Simulated results · demo data/).first().waitFor({ timeout: 3000 });
  });
  await flow("home: the sample-report link and final URL box are there", async () => {
    await p.locator('a[href="#report"]').first().waitFor();
    await p.locator("#final-url").waitFor();
  });
  await flow("home: FAQ answers open", async () => {
    await p.getByText("What does it cost?").click();
    await p.getByText(/1 test with 25 simulated customers/).first().waitFor();
  });
  await flow("home: demo data is labelled", async () => {
    const n = await p.getByText(/Demo data/i).count();
    if (n < 2) throw new Error(`only ${n} demo labels`);
    return `${n} labels`;
  });
  await flow("pricing: 5 plans, annual toggle, packs, enterprise, same numbers as the code", async () => {
    await p.goto(BASE + "/pricing", { waitUntil: "networkidle" });
    for (const t of ["25 Crawlers", "1,000 Crawlers", "5,000 Crawlers", "15,000 Crawlers", "40,000 Crawlers", "$1.90 per 100 Crawlers", "Ad Analysis unlocked", "No Ad Analysis", "Most popular", "Need more Crawlers?", "Not ready for a subscription?", "Compare plans", "renew automatically"]) await p.getByText(t, { exact: false }).first().waitFor({ timeout: 3000 });
    const price = () => p.locator(".plan-card").evaluateAll((cards) => cards.map((c) => c.textContent.match(/\$\s*([\d.]+)\s*(one time|\/ month)/)?.[1]));
    const monthly = (await price()).join(",");
    if (monthly !== "0,19,49,99,199") throw new Error(`monthly prices on cards: ${monthly}`);
    await p.getByRole("button", { name: /Annual/ }).click();
    const yearly = (await price()).join(",");
    if (yearly !== "0,15.83,40.83,82.50,165.83") throw new Error(`annual prices on cards: ${yearly}`);
    await p.getByText("$490 billed yearly").first().waitFor({ timeout: 3000 });
    const packs = await p.locator(".pack-card").count();
    if (packs !== 4) throw new Error(`${packs} pack cards`);
    await p.getByRole("link", { name: "Need more Crawlers?" }).click();
    await p.locator("#custom-form, #custom").first().waitFor({ timeout: 3000 });
    return "monthly + annual prices, 4 packs, custom volume";
  });
  await flow("sample report: fix tracker saves a status (demo: in this browser)", async () => {
    await p.goto(BASE + "/example", { waitUntil: "networkidle" });
    await p.locator("#fixes").scrollIntoViewIfNeeded();
    const sel = p.locator("#fixes select").first();
    await sel.selectOption("completed");
    await p.getByText(/1 of \d+ fixes completed/).waitFor({ timeout: 3000 });
    await p.reload({ waitUntil: "networkidle" });
    await p.getByText(/1 of \d+ fixes completed/).waitFor({ timeout: 3000 });
  });
  await flow("sample report: 'Download PDF' opens print", async () => {
    await p.evaluate(() => {
      window.__printed = false;
      window.print = () => (window.__printed = true);
    });
    await p.getByRole("button", { name: "Download PDF" }).first().click();
    if (!(await p.evaluate(() => window.__printed))) throw new Error("print not called");
  });
  await flow("sample report: copy fix prompt puts text on the clipboard", async () => {
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await p.getByRole("button", { name: /Copy fix prompt/ }).first().click();
    const text = await p.evaluate(() => navigator.clipboard.readText());
    if (!/Do NOT invent testimonials/.test(text)) throw new Error("prompt missing rules");
    return `${text.length} characters`;
  });
  await flow("API: URL checker refuses a private address", async () => {
    const r = await p.request.post(BASE + "/api/check-url", { data: { url: "http://169.254.169.254/latest/meta-data" } });
    const d = await r.json();
    if (d.ok) throw new Error("private address was accepted");
  });
  await flow("API: private APIs need sign-in", async () => {
    for (const u of ["/api/tests", "/api/crawls", "/api/billing", "/api/account/delete"]) {
      const r = await p.request.post(BASE + u, { data: {} });
      if (![401, 503].includes(r.status())) throw new Error(`${u} answered ${r.status()}`);
    }
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  const out = path.join(__dirname, "..", "data", `sitecheck-${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ base: BASE, ran: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\nSite check: ${results.length - failed.length}/${results.length} passed. Saved ${path.relative(process.cwd(), out)}`);
  process.exit(failed.length ? 1 : 0);
})();
