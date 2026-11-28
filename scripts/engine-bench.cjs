// ENGINE BENCH (engine v2): population weights, say-vs-do, ranges, calibration and evidence checks,
// all with known answers (no AI, no database). Part of `npm run bench`. Any failure = exit code 1.
const path = require("path");
const lib = path.join(__dirname, "..", ".bench-build", "lib");
const { makeRandom, generatePersonas, ENGINE_VERSION } = require(path.join(lib, "personas.js"));
const { pickBudget, pickMindset, simulateSpend } = require(path.join(lib, "population.js"));
const { followThrough, wilson, meanShifted, predictedRange, baseRateFor, NO_P, MAYBE_P } = require(path.join(lib, "intent.js"));
const { fitSiteDelta, fitGlobal, leaveOneOut, summarizeAccuracy, deltaInWords, PRIOR_WEIGHT, MARGIN_PP } = require(path.join(lib, "calibration.js"));
const { verifyEvidence, makeEvidence, topEvidence, evidenceHaystack } = require(path.join(lib, "evidence.js"));
const { aggregate, MIN_SEGMENT } = require(path.join(lib, "aggregate.js"));
const { answerQuality } = require(path.join(lib, "quality.js"));
const { DEFAULT_AUDIENCE } = require(path.join(lib, "presets.js"));

let pass = 0, total = 0;
function test(name, fn) {
  total++;
  try { const problem = fn(); if (problem) throw new Error(problem); pass++; console.log(`  ✓ ${name}`); }
  catch (err) { console.log(`  ✗ ${name}: ${err.message}`); }
}
const near = (a, b, tol, what) => (Math.abs(a - b) <= tol ? null : `${what}: expected ${b} ± ${tol}, got ${a}`);

console.log("\nPopulation (real-world weights)");
const R = makeRandom(42);
const ALL_BUDGETS = ["tight", "okay", "comfortable"];
const budgets = Array.from({ length: 20000 }, () => pickBudget(R, ALL_BUDGETS, 35));
test("adults: ~37% tight (Fed SHED 2024: 37% couldn't cover $400 with cash)", () => near(budgets.filter((b) => b === "tight").length / 20000, 0.37, 0.015, "tight share"));
test("teens skew tighter than adults", () => {
  const teen = Array.from({ length: 5000 }, () => pickBudget(R, ALL_BUDGETS, 15)).filter((b) => b === "tight").length / 5000;
  return teen > 0.5 ? null : `teen tight share ${teen}`;
});
test("the founder's selection always wins (only 'comfortable' -> all comfortable)", () => {
  const xs = Array.from({ length: 500 }, () => pickBudget(R, ["comfortable"], 30));
  return xs.every((x) => x === "comfortable") ? null : "a non-selected budget appeared";
});
const MINDS = ["early adopter", "price-sensitive", "skeptical", "busy", "impulse buyer"];
const minds = Array.from({ length: 20000 }, () => pickMindset(R, MINDS));
test("early adopters ~16% (Rogers: innovators 2.5% + early adopters 13.5%)", () => near(minds.filter((m) => m === "early adopter").length / 20000, 0.16, 0.015, "early adopter share"));
test("impulse buyers are rare (~8%), not a fifth of the crowd", () => near(minds.filter((m) => m === "impulse buyer").length / 20000, 0.08, 0.012, "impulse share"));

const crowd = generatePersonas(DEFAULT_AUDIENCE, 300, 7);
test("every persona has a wallet, a history, patience in seconds and a dealbreaker", () => {
  const bad = crowd.find((p) => !p.spend || typeof p.spend.monthlySpare !== "number" || !p.spend.history || !p.patienceSec || !p.mind?.dealbreaker);
  return bad ? `persona ${bad.id} is missing something` : null;
});
test("tight budgets get less spare money than comfortable ones", () => {
  const avg = (b) => { const xs = crowd.filter((p) => p.budget === b && p.age >= 18).map((p) => p.spend.monthlySpare); return xs.reduce((s, x) => s + x, 0) / xs.length; };
  return avg("tight") < avg("okay") && avg("okay") < avg("comfortable") ? null : `tight ${avg("tight")} okay ${avg("okay")} comfortable ${avg("comfortable")}`;
});
test("same seed = the same crowd (re-tests reuse customers)", () => JSON.stringify(generatePersonas(DEFAULT_AUDIENCE, 50, 99)) === JSON.stringify(generatePersonas(DEFAULT_AUDIENCE, 50, 99)) ? null : "crowd changed");
test("people who need a manager's approval say so in their history", () => {
  const s = simulateSpend({ age: 40, budget: "okay", mindset: "busy", canBuyAlone: false }, makeRandom(1));
  return /approved/.test(s.history) ? null : s.history;
});
test("engine version is 2", () => (ENGINE_VERSION === 2 ? null : String(ENGINE_VERSION)));

console.log("\nSay vs do");
const base = { ...crowd[0], mindset: "busy", budget: "okay", patience: "a few minutes", patienceSec: 120, canBuyAlone: undefined, mind: { ...crowd[0].mind, need: "urgent", burnedBefore: null } };
const yes = { verdict: "buy" };
test("no < maybe < buy", () => {
  const a = followThrough(base, { verdict: "no" }, "sign up").p, b = followThrough(base, { verdict: "maybe" }, "sign up").p, c = followThrough(base, yes, "sign up").p;
  return a === NO_P && b === MAYBE_P && a < b && b < c ? null : `${a} ${b} ${c}`;
});
test("a stated 'buy' is NOT a sure purchase (follow-through < 1)", () => (followThrough(base, yes, "buy").p < 0.5 ? null : "too high"));
test("impulse yeses decay with low patience (x0.5)", () => {
  const calm = followThrough({ ...base, mindset: "impulse buyer" }, yes, "sign up").p;
  const rushed = followThrough({ ...base, mindset: "impulse buyer", patienceSec: 8 }, yes, "sign up").p;
  return near(rushed / calm, 0.5, 0.001, "ratio");
});
test("impulse yeses decay with a tight budget too", () => {
  const ok = followThrough({ ...base, mindset: "impulse buyer" }, yes, "sign up").p;
  const tight = followThrough({ ...base, mindset: "impulse buyer", budget: "tight" }, yes, "sign up").p;
  return tight < ok ? null : `${tight} >= ${ok}`;
});
test("tight budget + paying today lowers it; a free signup doesn't get the money penalty", () => {
  const buy = followThrough({ ...base, budget: "tight" }, yes, "buy");
  const free = followThrough({ ...base, budget: "tight" }, yes, "sign up");
  return buy.factors.some((f) => /costs money/.test(f.why)) && !free.factors.some((f) => /costs money/.test(f.why)) ? null : "money factor wrong";
});
test("base rates: buying is the lowest band", () => (baseRateFor("buy").high < baseRateFor("sign up").high ? null : "order"));

console.log("\nRanges");
test("Wilson 50/100 ≈ 42%–58% (90%)", () => { const [l, h] = wilson(50, 100); return near(l, 0.418, 0.005, "low") || near(h, 0.582, 0.005, "high"); });
test("Wilson 0/100 never goes below 0 and isn't a flat 0", () => { const [l, h] = wilson(0, 100); return l === 0 && h > 0.01 && h < 0.04 ? null : `${l} ${h}`; });
const ps = Array.from({ length: 100 }, (_, i) => (i < 20 ? 0.4 : i < 45 ? 0.04 : 0.002));
test("predicted range contains the predicted rate and is seeded (repeatable)", () => {
  const r1 = predictedRange(ps, 0, 0.7, 5), r2 = predictedRange(ps, 0, 0.7, 5), m = meanShifted(ps, 0);
  return r1[0] <= m && m <= r1[1] && r1[0] === r2[0] && r1[1] === r2[1] ? null : `${r1} vs ${m}`;
});
test("a calibrated (small sd) range is narrower than an uncalibrated one", () => {
  const w = (r) => r[1] - r[0];
  return w(predictedRange(ps, 0, 0.1, 3)) < w(predictedRange(ps, 0, 0.7, 3)) ? null : "not narrower";
});

console.log("\nCalibration");
test("site delta makes the SAME crowd hit the real rate exactly", () => near(meanShifted(ps, fitSiteDelta(ps, 0.03)), 0.03, 0.0005, "fitted mean"));
test("a lower real rate -> a negative delta ('too eager')", () => (fitSiteDelta(ps, 0.01) < 0 && /too eager/.test(deltaInWords(fitSiteDelta(ps, 0.01))) ? null : "sign/wording"));
const row = (id, user, real, visitors = 1000) => ({ id, user, ps, real, visitors, usable: true });
test("one result is shrunk toward 0 (prior counts as 3 results)", () => {
  const d = fitSiteDelta(ps, 0.03);
  return near(fitGlobal([row("a", "u1", 0.03)]).delta, d / (1 + PRIOR_WEIGHT), 1e-6, "delta");
});
test("one account = one vote (10 results from one account weigh like 1)", () => {
  const flood = Array.from({ length: 10 }, (_, i) => row(`f${i}`, "spammer", 0.001));
  const g = fitGlobal([...flood, row("a", "u1", 0.03)]);
  const fair = fitGlobal([row("f0", "spammer", 0.001), row("a", "u1", 0.03)]);
  return near(g.delta, fair.delta, 1e-6, "flooded delta");
});
test("results with < 200 visitors are not used to fit", () => (fitGlobal([row("a", "u1", 0.03, 50)]).n === 0 ? null : "used"));
test("leave-one-out never uses a result to predict itself", () => {
  const loo = leaveOneOut([row("only", "u1", 0.01)]);
  return near(loo[0].predicted, meanShifted(ps, 0), 1e-9, "self-only prediction (must be uncalibrated)");
});
test("consistent sites -> leave-one-out predictions land within the margin", () => {
  const rows = Array.from({ length: 8 }, (_, i) => row(`s${i}`, `u${i}`, 0.03));
  const loo = leaveOneOut(rows);
  const acc = summarizeAccuracy(loo);
  return acc.withinPct === 100 && acc.medianErrorPp <= MARGIN_PP ? null : JSON.stringify(acc);
});
test("excluded / old-engine results are ignored", () => (fitGlobal([{ ...row("a", "u1", 0.03), usable: false }]).n === 0 ? null : "used"));

console.log("\nEvidence");
const crawlish = { pages: [{ title: "MealMate", text: "Dinner, solved. Plan a week of meals in 60 seconds. Start free — $6/month after.", signals: { pricesSeen: ["$6/month"] } }] };
const hay = evidenceHaystack(crawlish);
test("exact page words are verified", () => (verifyEvidence("headline", "Dinner, solved.", hay) === true ? null : "not found"));
test("made-up words are NOT verified", () => (verifyEvidence("copy", "Trusted by 10,000 families", hay) === false ? null : "wrongly verified"));
test("something missing can't be verified (null), and is labelled missing", () => {
  const e = makeEvidence("trust signal", "MISSING: no reviews anywhere", "hero", hay);
  return e.kind === "missing" && e.verified === null && e.text === "no reviews anywhere" ? null : JSON.stringify(e);
});
test("prices count as page text", () => (verifyEvidence("price", "$6/month", hay) === true ? null : "price not found"));
test("unverified quotes never become a top cited element", () => {
  const top = topEvidence([{ kind: "copy", text: "fake", step: "hero", verified: false }, { kind: "headline", text: "Dinner, solved.", step: "hero", verified: true }]);
  return top.length === 1 && top[0].text === "Dinner, solved." ? null : JSON.stringify(top);
});

console.log("\nReport numbers");
const people = generatePersonas(DEFAULT_AUDIENCE, 100, 3);
const verdicts = people.map((p, i) => ({
  personaId: p.id, verdict: i < 60 ? "buy" : i < 80 ? "maybe" : "no", lostAt: i < 60 ? "none" : "hero",
  objectionCategory: i < 60 ? "none" : "price", objection: `o${i}`, wouldChangeMind: "x", quote: `q${i}`,
  evidence: { kind: "headline", text: "Dinner, solved.", step: "hero", verified: true },
}));
const stats = aggregate(DEFAULT_AUDIENCE, people, verdicts, false, { goal: "sign up", seed: 1 });
test("stated and predicted are both reported, predicted lower than stated", () => {
  const b = stats.behavior;
  return b && b.stated.rate === 0.6 && b.predicted.rate < b.stated.rate && b.predicted.low <= b.predicted.rate && b.predicted.rate <= b.predicted.high ? null : JSON.stringify(b && { s: b.stated, p: b.predicted });
});
test("60% yes on a signup page is flagged as yes-bias", () => (stats.behavior.yesBias && answerQuality(verdicts, stats).flags.some((f) => /lean towards yes/.test(f)) ? null : "not flagged"));
test(`segments under ${MIN_SEGMENT} people are flagged 'too small'`, () => {
  const rows = Object.values(stats.segments).flat();
  const wrong = rows.find((r) => (r.n < MIN_SEGMENT) !== r.small || r.low === undefined);
  return wrong ? JSON.stringify(wrong) : null;
});
test("the per-person probabilities are saved for later calibration", () => (stats.behavior.p.length === 100 ? null : String(stats.behavior.p.length)));
test("evidence is counted (100% verified here)", () => (stats.evidence.verified === 100 && stats.evidence.checkable === 100 ? null : JSON.stringify(stats.evidence)));

console.log("\nIdea tests (no website yet)");
const { cleanIdea, ideaCrawl, ideaSlug, ideaLabel, displayUrl } = require(path.join(lib, "idea.js"));
const { lensFor } = require(path.join(lib, "productTypes.js"));
test("an idea needs a name and a real description", () => {
  const a = cleanIdea({ name: "M", pitch: "a meal planner that plans dinners from your fridge" }).problem;
  const b = cleanIdea({ name: "MealMate", pitch: "meal app" }).problem;
  const c = cleanIdea({ name: "MealMate", pitch: "A meal planner that plans a week of dinners from your fridge." }).problem;
  return a && b && c === null ? null : JSON.stringify({ a, b, c });
});
test("idea text is trimmed to the limits and control characters removed", () => {
  const { idea } = cleanIdea({ name: "  Meal\u0007Mate  ", pitch: "x".repeat(5000), price: 42 });
  return idea.name === "MealMate" && idea.pitch.length === 1500 && idea.price === "" ? null : JSON.stringify({ n: idea.name, p: idea.pitch.length, price: idea.price });
});
test("the idea becomes pages: pitch = hero, price = pricing, how = signup (no screenshots)", () => {
  const { idea } = cleanIdea({ name: "MealMate!", pitch: "A meal planner that plans a week of dinners from your fridge.", price: "$5/month", how: "App Store" });
  const c = ideaCrawl("abc", idea);
  const steps = c.pages.map((p) => p.step).join(",");
  return c.mode === "idea" && c.url === "idea://mealmate" && steps === "hero,pricing,signup" && c.pages.every((p) => p.screenshotFiles.length === 0) && c.pages[1].signals.pricesSeen[0] === "$5/month"
    ? null
    : JSON.stringify({ mode: c.mode, url: c.url, steps });
});
test("no price / no 'how' = only the pitch page", () => {
  const { idea } = cleanIdea({ name: "Fit", pitch: "A gym buddy finder for people who hate working out alone." });
  return ideaCrawl("x", idea).pages.length === 1 ? null : "extra pages";
});
test("slug + labels", () =>
  ideaSlug("Ça va: Meal—Mate 2.0!") === "a-va-meal-mate-2-0" && ideaSlug("!!!") === "idea" && ideaLabel("idea://meal-mate") === "Idea: meal mate" && displayUrl("https://x.com/") === "x.com"
    ? null
    : ideaSlug("Ça va: Meal—Mate 2.0!"));
test("customers are told it's an idea (fixed sentence), games are retired", () =>
  /IDEA/.test(lensFor("idea")) && lensFor("game") === "" ? null : "lens");

console.log(`\n${pass}/${total} engine checks passed\n`);
if (pass !== total) process.exit(1);
