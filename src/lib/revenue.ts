// REVENUE WHAT-IF: turns a test's simulated "yes" rate into a rough monthly revenue range.
// Crawler does NOT measure revenue. This is arithmetic on three things:
//   1. your latest test's result (e.g. 38 of 100 simulated customers said yes)   -> measured by the test
//   2. how many people reach your product per month, and your price              -> typed in by YOU
//   3. "follow-through": the share of simulated yeses who really act             -> an ASSUMPTION (default 10%)
// People say yes far more often than they really pay, so without (3) the number would be fantasy.
// Pure functions (no browser, no AI) so the bench can check them with known answers.

export const DEFAULT_REAL_SHARE = 0.1; // ASSUMPTION: 1 in 10 simulated yeses really converts. Change it with real data.
export const RANGE_LOW = 0.5; // the low case uses half the follow-through
export const RANGE_HIGH = 1.5; // the high case uses one and a half times
export const FIX_MONTH = 2; // the what-if ships the top fixes after 2 months
export const MONTHS = 12;

export type RevenueInput = {
  people: number; // people reaching the product each month (visitors / installs / views)
  price: number; // what one customer pays (first payment)
  intentPct: number; // the test's simulated yes rate, 0..100
  realShare?: number; // follow-through, 0..1
  fixPct?: number; // extra yes points (0..100) the top fixes could win back, counted by the test
};

export type RevenueProjection = {
  rate: number; // real conversion rate (0..1) = intent x follow-through
  customersPerMonth: number;
  monthly: { low: number; likely: number; high: number }; // dollars per month
  withFixes: number; // likely dollars per month after the fixes
  upsidePerMonth: number;
  asIs: number[]; // cumulative dollars after month 0..12
  fixed: number[]; // same, with the fixes shipped after FIX_MONTH
  yearAsIs: number;
  yearFixed: number;
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : lo));
const round = (x: number) => Math.round(x * 100) / 100;

export function projectRevenue(i: RevenueInput): RevenueProjection {
  const people = Math.max(0, Number.isFinite(i.people) ? i.people : 0);
  const price = Math.max(0, Number.isFinite(i.price) ? i.price : 0);
  const intent = clamp(i.intentPct, 0, 100) / 100;
  const share = clamp(i.realShare ?? DEFAULT_REAL_SHARE, 0, 1);
  const fixIntent = clamp(i.intentPct + clamp(i.fixPct ?? 0, 0, 100), 0, 100) / 100;
  const dollars = (intentRate: number, s: number) => round(people * clamp(intentRate * s, 0, 1) * price);

  const rate = Math.round(clamp(intent * share, 0, 1) * 1e6) / 1e6;
  const likely = dollars(intent, share);
  const withFixes = dollars(fixIntent, share);
  const asIs: number[] = [0];
  const fixed: number[] = [0];
  for (let m = 1; m <= MONTHS; m++) {
    asIs.push(round(asIs[m - 1] + likely));
    fixed.push(round(fixed[m - 1] + (m <= FIX_MONTH ? likely : withFixes)));
  }
  return {
    rate,
    customersPerMonth: round(people * rate),
    monthly: { low: dollars(intent, share * RANGE_LOW), likely, high: dollars(intent, share * RANGE_HIGH) },
    withFixes,
    upsidePerMonth: round(withFixes - likely),
    asIs,
    fixed,
    yearAsIs: asIs[MONTHS],
    yearFixed: fixed[MONTHS],
  };
}

// "$1,240", "$12.4k", "$240k", "$1.2M"
export function money(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e5) return `$${Math.round(v / 1e3)}k`;
  if (Math.abs(v) >= 1e4) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${v.toLocaleString("en-US")}`;
}
