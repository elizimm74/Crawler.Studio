// FREE TRIAL PREVIEW (founder's pricing, 2026-11-25): the free trial gives a "basic customer feedback
// preview" and a "basic purchase-intent preview"; upgrading unlocks the full report.
// The full report is still saved (so it unlocks the moment they pay); this just trims what the API
// SENDS for a trial test whose owner hasn't paid yet. Kept: the score, the summary, the top 3 reasons
// people said no. Removed: ranked fixes, rewritten copy, every customer's answers, the quotes,
// "what would change their mind", the product-test journey and online reviews.
// (It's a soft lock: it's the person's own test. It decides what the report page shows.)

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

export function toPreview<T extends Obj>(run: T): T {
  const stats = obj(run.stats);
  const advice = obj(run.advice);
  const total = Number(stats.total ?? (Number(stats.perSample ?? 0) * Number(stats.samples ?? 1))) || 0;
  const objections = arr(stats.objections)
    .slice(0, 3)
    .map((o) => ({ ...obj(o), examples: arr(obj(o).examples).slice(0, 1), changeMind: [] }));
  return {
    ...run,
    verdicts: [],
    personas: [],
    journey: undefined,
    reputation: undefined,
    checks: Array.isArray(run.checks) ? [] : run.checks,
    checksB: null,
    stats: { ...stats, objections, bestQuotes: arr(stats.bestQuotes).slice(0, 2), allQuotes: [] },
    advice: { summary: String(advice.summary ?? ""), fixes: [], headlineOptions: [], subheadline: "", pricingCopy: "" },
    preview: { fixes: arr(advice.fixes).length, customers: total },
  };
}
