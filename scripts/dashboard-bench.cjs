// DASHBOARD BENCH: the dashboard's numbers and the saved-mind cleaner, with known answers
// (no AI, no database). Part of `npm run bench`. Any failure = exit code 1.
const path = require("path");
const lib = path.join(__dirname, "..", ".bench-build", "lib");
const { analyses, recurringBlockers, fixQueue, nextMoves, labelOf, summarize } = require(path.join(lib, "dashboard.js"));
const { PLAYS, playsFor, MIND_TYPES, BENCHMARKS } = require(path.join(lib, "playbook.js"));
const { cleanAudience, mindProblem } = require(path.join(lib, "audience.js"));

let pass = 0, total = 0;
function test(name, fn) {
  total++;
  try { const problem = fn(); if (problem) throw new Error(problem); pass++; console.log(`  ✓ ${name}`); }
  catch (err) { console.log(`  ✗ ${name}: ${err.message}`); }
}
const eq = (a, b, what) => (JSON.stringify(a) === JSON.stringify(b) ? null : `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

// newest first, like the database returns them
const row = (id, url, status, score, blocker, fixes, extra = {}) => ({
  id, url, goal: "sign up", status, score, total: 100, created_at: `2026-11-0${id}T00:00:00Z`, kind: null,
  objections: blocker ? [{ category: blocker, count: 30 }] : null, fixes: fixes ?? null, ...extra,
});
const ROWS = [
  row("9", "https://www.mealmate.app/pricing", "done", 40, "price", [{ title: "Show the price on the homepage", change: "x", likelyFlip: 9 }, { title: "Ask for email only", likelyFlip: 4 }]),
  row("8", "app://abcdefgh12", "done", 9, "trust", [{ title: "Move permissions later", atPaywall: 20 }], { kind: "app" }),
  row("7", "https://mealmate.app", "running", null, null, null),
  row("6", "https://mealmate.app/", "done", 31, "price", [{ title: "Show the price on the homepage!", likelyFlip: 5 }]),
  row("5", "https://other.com", "error", null, null, null),
  row("4", "https://other.com", "done", 20, "unclear value", null),
];

console.log("\nRecent analyses");
test("labels: site host, app flow", () => eq([labelOf(ROWS[0]), labelOf(ROWS[1])], ["mealmate.app", "App onboarding + paywall"], "labels"));
const A = analyses(ROWS);
test("score as a percent; running tests have none", () => eq([A[0].pct, A[2].pct], [40, null], "pct"));
test("trend compares with the older test of the SAME site (www/path ignored)", () => eq(A[0].delta, 9, "delta"));
test("the first test of something has no trend", () => eq([A[3].delta, A[1].delta, A[5].delta], [null, null, null], "deltas"));
test("the #1 blocker is carried through", () => eq([A[0].blocker, A[1].blocker, A[2].blocker], ["price", "trust", null], "blockers"));
test("app tests are labelled as apps", () => eq(A[1].kind, "app", "kind"));

console.log("\nPatterns");
test("recurring blockers count only finished tests, biggest first", () => eq(recurringBlockers(ROWS).map((b) => [b.category, b.tests]), [["price", 2], ["trust", 1], ["unclear value", 1]], "blockers"));
test("share is out of finished tests", () => eq(recurringBlockers(ROWS)[0].share, 0.5, "share"));
test("no finished tests = no blockers", () => eq(recurringBlockers([ROWS[2], ROWS[4]]), [], "blockers"));
const Q = fixQueue(ROWS);
test("fix queue: best first, duplicates merged by title (keeps the biggest)", () => eq(Q.map((f) => [f.title, f.wins]), [["Move permissions later", 20], ["Show the price on the homepage", 9], ["Ask for email only", 4]], "queue"));
test("fix queue knows which test each fix came from", () => eq([Q[0].testId, Q[1].from], ["8", "mealmate.app"], "from"));
test("fix queue respects the limit", () => eq(fixQueue(ROWS, 1).length, 1, "length"));

console.log("\nNext best moves");
test("price + trust blockers give price + trust plays, no duplicates", () => {
  const m = nextMoves([{ category: "price" }, { category: "trust" }], 10);
  const ids = m.map((p) => p.id);
  return eq(new Set(ids).size, ids.length, "unique") || (m.length >= 2 ? null : "too few plays");
});
test("nextMoves respects the limit", () => eq(nextMoves([{ category: "price" }, { category: "trust" }], 3).length, 3, "limit"));

console.log("\nPlaybook honesty");
test("play ids are unique", () => eq(new Set(PLAYS.map((p) => p.id)).size, PLAYS.length, "unique ids"));
test("every play states its evidence type", () => (PLAYS.every((p) => ["store policy", "published research", "practitioner advice"].includes(p.evidence)) ? null : "bad evidence"));
test("'published research' and 'store policy' plays always name a source", () => (PLAYS.filter((p) => p.evidence !== "practitioner advice").every((p) => p.source?.label) ? null : "missing source"));
test("both areas have plays", () => eq([PLAYS.some((p) => p.area === "app"), PLAYS.some((p) => p.area === "web")], [true, true], "areas"));
test("every reason people say no has at least one play", () => {
  const cats = ["price", "unclear value", "trust", "not for me", "missing feature", "too complex", "happy with current solution", "signup friction"];
  const missing = cats.filter((c) => !playsFor(c).length);
  return missing.length ? "no play for: " + missing.join(", ") : null;
});
test("no play promises results or says 'will be rejected'", () => (/will be rejected|guarantee/i.test(JSON.stringify(PLAYS)) ? "overpromises" : null));
test("benchmarks carry a source; five mind types exist", () => eq([BENCHMARKS.every((b) => b.source), MIND_TYPES.length], [true, 5], "benchmarks"));

console.log("\nSaved minds (cleaning what the browser sends)");
test("junk is rejected", () => eq([cleanAudience(null), cleanAudience("x"), cleanAudience([])], [null, null, null], "junk"));
test("numbers are clamped, ages are ordered, unknown options dropped", () => {
  const a = cleanAudience({ ageMin: 99999, ageMax: 5, budgets: ["tight", "rich"], mindsets: ["skeptical", "hacker"], techComfort: ["high"], genderSplit: { female: 500 }, business: { decisionSelfPct: -4 } });
  return eq([a.ageMin, a.ageMax, a.budgets, a.mindsets, a.genderSplit.female, a.business.decisionSelfPct], [13, 90, ["tight"], ["skeptical"], 100, 0], "values");
});
test("long text and long lists are cut", () => {
  const a = cleanAudience({ occupations: Array.from({ length: 50 }, () => "x".repeat(500)) });
  return eq([a.occupations.length, a.occupations[0].length], [12, 60], "cut");
});
test("a mind needs a budget, a mindset and a tech level", () => eq([mindProblem(cleanAudience({})), mindProblem(cleanAudience({ budgets: ["okay"], mindsets: ["busy"], techComfort: ["low"] }))], ["Pick at least one budget.", null], "problems"));

test("summary: counts, average, best, customers simulated", () => {
  const sm = summarize(analyses(ROWS));
  return eq([sm.tests, sm.finished, sm.avgPct, sm.bestPct, sm.customers], [6, 4, 25, 40, 400], "summary");
});
test("summary trend = latest product only, oldest first", () => eq(summarize(analyses(ROWS)).trend.map((t) => t.pct), [31, 40], "trend"));
test("summary of nothing has no fake numbers", () => {
  const sm = summarize([]);
  return eq([sm.avgPct, sm.bestPct, sm.customers, sm.trend.length], [null, null, 0, 0], "empty");
});

// ---------- smarter customers: inner life + answer checks ----------
const { simulateMind, describeMind } = require(path.join(lib, "mind.js"));
const { answerQuality } = require(path.join(lib, "quality.js"));
const { generatePersonas, makeRandom, describePersona } = require(path.join(lib, "personas.js"));
const { DEFAULT_AUDIENCE } = (() => { try { return require(path.join(lib, "presets.js")); } catch { return {}; } })();
const aud = DEFAULT_AUDIENCE || { mode: "consumer", ageMin: 18, ageMax: 60, ageSkew: "even", genderSplit: { female: 50, male: 50, nonbinary: 0 }, countries: ["United States"], areaMix: { urban: 1, suburban: 1, rural: 1 }, occupations: ["x"], budgets: ["tight", "okay"], mindsets: ["skeptical", "busy"], techComfort: ["low", "high"], currentSolutions: ["nothing"], business: { roles: [], decisionSelfPct: 50, companySizes: [], industries: [] } };
test("every persona gets an inner life, and the same seed gives the same minds", () => {
  const a = generatePersonas(aud, 50, 42), b = generatePersonas(aud, 50, 42);
  if (a.some((p) => !p.mind || !p.mind.motivation || !p.mind.dealbreaker)) return "missing mind";
  return eq(a.map((p) => p.mind), b.map((p) => p.mind), "repeatable minds");
});
test("minds vary across a crowd (not 100 copies)", () => {
  const ps = generatePersonas(aud, 100, 7);
  const motives = new Set(ps.map((p) => p.mind.motivation)).size;
  const burned = ps.filter((p) => p.mind.burnedBefore).length;
  return motives >= 4 && burned > 5 && burned < 50 ? null : `motives ${motives}, burned ${burned}`;
});
test("tight budget -> price dealbreaker; search visitors are looking", () => {
  const r = makeRandom(1);
  const m = simulateMind({ budget: "tight", techComfort: "high", mindset: "busy", arrivedFrom: "a Google search" }, r);
  return m.dealbreaker.includes("price") && /looking|comparing/.test(m.motivation) ? null : JSON.stringify(m);
});
test("the persona line the AI reads includes the inner life", () => {
  const p = generatePersonas(aud, 1, 3)[0];
  return /why here:/.test(describePersona(p)) && /dealbreaker:/.test(describePersona(p)) ? null : "not described";
});
test("old personas without a mind still describe fine", () => eq(describeMind({}), [], "no mind"));
test("answer check: varied answers raise no flags", () => {
  const q = answerQuality(Array.from({ length: 20 }, (_, i) => ({ verdict: i % 3 ? "no" : "buy", objection: `reason ${i}`, quote: `quote number ${i}`, thought: "x" })));
  return eq([q.uniqueQuotesPct, q.flags.length, q.thoughtful], [100, 0, 20], "healthy");
});
test("answer check: copy-paste crowds get flagged", () => {
  const q = answerQuality(Array.from({ length: 20 }, () => ({ verdict: "no", objection: "Too expensive.", quote: "Too expensive!" })));
  return q.flags.length === 3 && q.uniqueQuotesPct === 5 ? null : JSON.stringify(q);
});

console.log(`\nDashboard bench: ${pass}/${total}`);
if (pass < total) process.exit(1);
