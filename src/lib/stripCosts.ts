// Run costs (what each test cost us in AI calls) are PRIVATE: users never see them.
// The worker logs them and keeps the total in tests.cost_usd (hidden from users, used only for
// the founder's Slack report). This removes every cost field from a saved report/analysis before
// it's stored or sent to a browser. Older rows may still have them, so the API routes use it too.
const COST_KEYS = new Set(["costs", "totalCostUsd", "costUsd", "cost_usd"]);

export function stripCosts<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripCosts) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (!COST_KEYS.has(k)) out[k] = stripCosts(v);
    return out as T;
  }
  return value;
}
