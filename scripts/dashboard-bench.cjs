// DASHBOARD BENCH: the dashboard's numbers and the saved-mind cleaner, with known answers
// (no AI, no database). Part of `npm run bench`. Any failure = exit code 1.
const path = require("path");
const lib = path.join(__dirname, "..", ".bench-build", "lib");
const { analyses, recurringBlockers, fixQueue, nextMoves, labelOf, summarize, kindOf } = require(path.join(lib, "dashboard.js"));
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

// ---------- payments: Stripe signature + monthly subscriptions ----------
const crypto = require("crypto");
const { verifyStripeSignature, checkoutForm, paidPlan } = require(path.join(lib, "stripe.js"));
const SECRET = "whsec_bench_only";
const sign = (payload, t, secret = SECRET) => `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
const NOW = 1_800_000_000;
test("a real Stripe signature passes", () => (verifyStripeSignature('{"a":1}', sign('{"a":1}', NOW), SECRET, NOW) ? null : "rejected"));
test("a changed payload, wrong secret, missing or old signature all fail", () => {
  const bad = [
    verifyStripeSignature('{"a":2}', sign('{"a":1}', NOW), SECRET, NOW),
    verifyStripeSignature('{"a":1}', sign('{"a":1}', NOW, "whsec_other"), SECRET, NOW),
    verifyStripeSignature('{"a":1}', null, SECRET, NOW),
    verifyStripeSignature('{"a":1}', sign('{"a":1}', NOW - 3600), SECRET, NOW),
    verifyStripeSignature('{"a":1}', "t=abc,v1=zz", SECRET, NOW),
  ];
  return bad.some(Boolean) ? "something bad passed: " + JSON.stringify(bad) : null;
});
test("any one of several v1 signatures may match (Stripe secret rotation)", () => {
  const good = sign('{"a":1}', NOW).split(",")[1];
  return verifyStripeSignature('{"a":1}', `t=${NOW},v1=${"0".repeat(64)},${good}`, SECRET, NOW) ? null : "rejected";
});
const UID = "11111111-2222-3333-4444-555555555555";
const { readInvoicePaid, readSubscription, portalConfigForm } = require(path.join(lib, "stripe.js"));
const { subscriptionLine } = require(path.join(lib, "dashboard.js"));
// An invoice.paid event, with our metadata where NEWER Stripe API versions put it (parent.subscription_details).
const inv = (o = {}, meta = { user_id: UID, plan_id: "launch" }, type = "invoice.paid") => ({
  type, data: { object: { id: "in_test_abcdefgh", status: "paid", billing_reason: "subscription_create", amount_paid: 1900, currency: "usd", parent: { subscription_details: { metadata: meta } }, ...o } },
});
test("a paid first invoice adds the plan's 5 tests (tests come from OUR plans, not Stripe)", () => {
  const p = readInvoicePaid(inv());
  return p && p.plan.tests === 5 && p.userId === UID && p.amountCents === 1900 && p.invoice === "in_test_abcdefgh" ? null : JSON.stringify(p);
});
test("a monthly renewal adds tests too; older API versions' metadata location also works", () => {
  const renew = readInvoicePaid(inv({ billing_reason: "subscription_cycle" }));
  const old = readInvoicePaid(inv({ parent: null, subscription_details: { metadata: { user_id: UID, plan_id: "studio" } }, amount_paid: 4900 }));
  return renew && old && old.plan.tests === 20 ? null : JSON.stringify([renew, old]);
});
test("unpaid, plan-change proration, unknown plan, bad user, overpaid or other events add nothing", () => {
  const cases = [
    inv({ status: "open" }), inv({ billing_reason: "subscription_update" }), inv({ billing_reason: "manual" }),
    inv({}, { user_id: UID, plan_id: "free" }), inv({}, { user_id: "x", plan_id: "launch" }), inv({ amount_paid: 99999 }),
    inv({}, undefined, "invoice.payment_failed"), inv({}, undefined, "checkout.session.completed"),
  ];
  const got = cases.map(readInvoicePaid);
  return got.every((x) => x === null) ? null : JSON.stringify(got);
});
const subEv = (o = {}, type = "customer.subscription.updated") => ({
  type, created: NOW, data: { object: { id: "sub_test_abc123", customer: "cus_test_abc123", status: "active", cancel_at_period_end: false, metadata: { user_id: UID, plan_id: "studio" }, items: { data: [{ current_period_end: NOW + 86400 * 30 }] }, ...o } },
});
test("subscription events: status, renew date (new API: on the item), cancel-at-month-end, deleted = canceled", () => {
  const a = readSubscription(subEv());
  const c = readSubscription(subEv({ cancel_at_period_end: true, items: undefined, current_period_end: NOW + 100 }));
  const d = readSubscription(subEv({}, "customer.subscription.deleted"));
  const bad = [readSubscription(subEv({ metadata: {} })), readSubscription(subEv({ customer: null })), readSubscription(subEv({}, "invoice.paid"))];
  return a && a.plan.id === "studio" && a.status === "active" && a.periodEnd === new Date((NOW + 86400 * 30) * 1000).toISOString() && a.eventAt === new Date(NOW * 1000).toISOString() &&
    c && c.cancelling && c.periodEnd && d && d.status === "canceled" && bad.every((x) => x === null)
    ? null : JSON.stringify({ a, c, d, bad });
});
test("checkout is a MONTHLY subscription; price, plan and who come from the server", () => {
  const f = checkoutForm(paidPlan("studio"), { id: UID, email: "a@b.co" }, "https://crawler.test");
  const g = checkoutForm(paidPlan("launch"), { id: UID, email: "a@b.co", customer: "cus_123" }, "https://crawler.test");
  return eq(
    [f.get("line_items[0][price_data][unit_amount]"), f.get("line_items[0][price_data][recurring][interval]"), f.get("mode"), f.get("subscription_data[metadata][plan_id]"), f.get("subscription_data[metadata][user_id]"), g.get("customer"), g.get("customer_email"), paidPlan("free"), paidPlan("x")],
    ["4900", "month", "subscription", "studio", UID, "cus_123", null, null, null],
    "form",
  );
});
test("billing page: cancel at the end of the month, no plan switching", () => {
  const f = portalConfigForm();
  return eq([f.get("features[subscription_cancel][mode]"), f.get("features[subscription_update][enabled]"), f.get("features[payment_method_update][enabled]")], ["at_period_end", "false", "true"], "portal");
});
test("plan line: renews / cancelled / payment failed / ended", () => {
  const now = new Date("2026-11-21T00:00:00Z");
  const r = (s) => subscriptionLine({ plan: "launch", renews: "2026-12-21T10:00:00Z", cancelling: false, ...s }, now);
  return eq(
    [r({ status: "active" }).text, r({ status: "active", cancelling: true }).text, r({ status: "past_due" }).warn, r({ status: "canceled" }).text, subscriptionLine(null)],
    ["Launch: renews Dec 21", "Launch: cancelled, active until Dec 21. Your tests stay.", true, "Launch ended. Your unused tests stay.", null],
    "lines",
  );
});

// ---------- re-tests: before / after with the same customers ----------
const { compareRuns } = require(path.join(lib, "compare.js"));
const prevSide = { personas: generatePersonas(aud, 10, 99), verdicts: [] };
const nextSide = { personas: generatePersonas(aud, 10, 99), verdicts: [] };
const V = (id, verdict) => ({ personaId: id, verdict, lostAt: "hero", objectionCategory: "price", objection: "too pricey", wouldChangeMind: "", quote: "q " + id });
prevSide.personas.forEach((p, i) => prevSide.verdicts.push(V(p.id, i < 2 ? "buy" : i < 5 ? "maybe" : "no")));
nextSide.personas.forEach((p, i) => nextSide.verdicts.push(V(p.id, i < 4 ? "buy" : i < 6 ? "maybe" : i === 9 ? "maybe" : "no")));
test("same seed + audience = the same customers come back", () => (prevSide.personas.every((p, i) => JSON.stringify(p) === JSON.stringify(nextSide.personas[i])) ? null : "crowd differs"));
test("before/after counts and who changed their mind", () => {
  const c = compareRuns(prevSide, nextSide);
  // before: 2 buy, 3 maybe, 5 no. after: 4 buy, 3 maybe (4,5,9), 3 no.
  return eq([c.matched, c.before.buy, c.after.buy, c.delta, c.won.length, c.lost.length, c.sameCrowd], [10, 2, 4, 2, 4, 0, true], "compare");
});
test("biggest moves are listed first (no -> buy before maybe -> buy)", () => {
  const p2 = { personas: prevSide.personas, verdicts: prevSide.personas.map((p, i) => V(p.id, i === 0 ? "maybe" : "no")) };
  const n2 = { personas: prevSide.personas, verdicts: prevSide.personas.map((p, i) => V(p.id, i === 0 || i === 1 ? "buy" : "no")) };
  const c = compareRuns(p2, n2);
  return eq(c.won.map((f) => [f.from, f.to]), [["no", "buy"], ["maybe", "buy"]], "order");
});
test("a different crowd is NOT compared person by person", () => {
  const other = { personas: generatePersonas(aud, 10, 12345), verdicts: [] };
  other.personas.forEach((p) => other.verdicts.push(V(p.id, "buy")));
  const c = compareRuns(prevSide, other);
  return c.sameCrowd === false && c.matched < 10 ? null : JSON.stringify([c.sameCrowd, c.matched]);
});

test("game and store tests get their own kind and label; old rows unchanged", () => {
  const g = { ...ROWS[1], ptype: "game" }, st = { ...ROWS[0], ptype: "store" };
  return eq([kindOf(g), labelOf(g), kindOf(st), labelOf(st), kindOf(ROWS[1]), labelOf(ROWS[1])], ["game", "Game first session + shop", "store", "mealmate.app", "app", "App onboarding + paywall"], "kinds");
});
test("thumbnails pass through (none = null, never invented)", () => eq(analyses([{ ...ROWS[0], thumb: "/api/files/u/crawls/x/hero-1.jpg" }, ROWS[3]]).map((a) => a.thumb), ["/api/files/u/crawls/x/hero-1.jpg", null], "thumbs"));

// ---------- revenue what-if ----------
const R = require(path.join(__dirname, "..", ".bench-build", "lib", "revenue.js"));
test("1,000 people x 40% yes x 10% follow-through x $20 = $800 a month (low $400, high $1,200)", () => {
  const r = R.projectRevenue({ people: 1000, price: 20, intentPct: 40 });
  return eq([r.rate, r.customersPerMonth, r.monthly], [0.04, 40, { low: 400, likely: 800, high: 1200 }], "projection");
});
test("fixes that win back 20 points add $400 a month", () => {
  const r = R.projectRevenue({ people: 1000, price: 20, intentPct: 40, fixPct: 20 });
  return eq([r.withFixes, r.upsidePerMonth], [1200, 400], "fixes");
});
test("12-month totals: fixes ship after month 2 (2 x 800 + 10 x 1,200)", () => {
  const r = R.projectRevenue({ people: 1000, price: 20, intentPct: 40, fixPct: 20 });
  return eq([r.asIs.length, r.yearAsIs, r.yearFixed, r.asIs[2], r.fixed[2]], [13, 9600, 13600, 1600, 1600], "series");
});
test("no people, no price or junk input = zeros, never NaN", () => {
  const r = R.projectRevenue({ people: NaN, price: -5, intentPct: 40 });
  return eq([r.monthly.likely, r.yearFixed, Number.isNaN(r.rate)], [0, 0, false], "zeros");
});
test("the rate can never pass 100% (yes 100 + fixes 50, follow-through 100%)", () => eq(R.projectRevenue({ people: 100, price: 10, intentPct: 100, realShare: 1, fixPct: 50 }).withFixes, 1000, "cap"));
test("money formatting", () => eq([R.money(840), R.money(12400), R.money(240000), R.money(1500000)], ["$840", "$12.4k", "$240k", "$1.5M"], "format"));

console.log(`\nDashboard bench: ${pass}/${total}`);
if (pass < total) process.exit(1);
