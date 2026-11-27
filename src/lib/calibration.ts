// ENGINE v2, part 5: CALIBRATION. Pure math, no AI, no database (the worker feeds it rows).
//
// A founder tells us their REAL conversion rate for a tested page. We take the SAME crowd that
// test simulated (its saved per-person probabilities from intent.ts) and find the one shift
// ("delta", in log-odds) that makes the crowd's predicted rate equal the real rate. Re-running the
// AI to tune it would cost money and could only overfit one site; this is free and exact.
//
// One site tells us about that site. Many sites tell us how far off Crawler is IN GENERAL:
//   - global delta = a shrunk, weighted average of every site's delta (shrunk toward 0 so a
//     handful of results can't swing it, one vote per account so nobody can flood it)
//   - honest accuracy = LEAVE-ONE-OUT: each result is predicted with a delta fitted on ALL THE
//     OTHER results, never on itself, then compared with reality. That is the number we publish.
import { meanShifted, UNCALIBRATED_SD } from "./intent";

export const MARGIN_PP = 2; // "within 2 percentage points" = a hit
export const MIN_VISITORS = 200; // real results from fewer visitors are shown but not used to fit
export const PRIOR_WEIGHT = 3; // the "0 shift" prior counts as 3 results
export const MIN_FOR_GLOBAL = 5; // the global calibration is only applied once 5+ results fit it

// Find delta so the crowd's mean predicted probability equals `real` (0..1). Bisection: always
// converges, and the mean is monotonic in delta.
export function fitSiteDelta(ps: number[], real: number): number {
  if (!ps.length) return 0;
  const target = Math.min(0.995, Math.max(0.0005, real));
  let lo = -9;
  let hi = 9;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (meanShifted(ps, mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type CalRow = {
  id: string; // anything unique (the test id)
  user: string; // account, so one account gets one vote in total
  ps: number[]; // the crowd's per-person probabilities (before any calibration)
  real: number; // 0..1
  visitors: number | null;
  usable: boolean; // false = excluded by an admin, or a different engine version
};

export type GlobalFit = { delta: number; sd: number; n: number; users: number };

// Weighted, shrunk average of the site deltas. Weight = (enough visitors ? 1 : 0) / results by that user.
export function fitGlobal(rows: CalRow[]): GlobalFit {
  const used = rows.filter((r) => r.usable && (r.visitors ?? 0) >= MIN_VISITORS && r.ps.length);
  if (!used.length) return { delta: 0, sd: UNCALIBRATED_SD, n: 0, users: 0 };
  const perUser = new Map<string, number>();
  for (const r of used) perUser.set(r.user, (perUser.get(r.user) ?? 0) + 1);
  let wsum = 0;
  let dsum = 0;
  const deltas: { d: number; w: number }[] = [];
  for (const r of used) {
    const w = 1 / perUser.get(r.user)!;
    const d = fitSiteDelta(r.ps, r.real);
    deltas.push({ d, w });
    wsum += w;
    dsum += w * d;
  }
  const delta = dsum / (wsum + PRIOR_WEIGHT);
  // spread of the site deltas around the fit, shrunk toward the uncalibrated width when n is small
  const varSites = deltas.reduce((s, x) => s + x.w * (x.d - delta) ** 2, 0) / Math.max(wsum, 1);
  const k = wsum / (wsum + PRIOR_WEIGHT);
  const sd = Math.sqrt(k * varSites + (1 - k) * UNCALIBRATED_SD ** 2);
  return { delta, sd, n: used.length, users: perUser.size };
}

export type LooResult = { id: string; predicted: number; real: number; errorPp: number; within: boolean };

// Leave-one-out: predict each usable row with a global fit that never saw it.
export function leaveOneOut(rows: CalRow[]): LooResult[] {
  const out: LooResult[] = [];
  for (const r of rows) {
    if (!r.ps.length) continue;
    const others = rows.filter((x) => x.id !== r.id);
    const fit = fitGlobal(others);
    const delta = fit.n >= MIN_FOR_GLOBAL ? fit.delta : 0;
    const predicted = meanShifted(r.ps, delta);
    const errorPp = Math.abs(predicted - r.real) * 100;
    out.push({ id: r.id, predicted, real: r.real, errorPp, within: errorPp <= MARGIN_PP });
  }
  return out;
}

export type AccuracySummary = { n: number; withinPct: number | null; medianErrorPp: number | null };

export function summarizeAccuracy(results: { errorPp: number; within: boolean }[]): AccuracySummary {
  if (!results.length) return { n: 0, withinPct: null, medianErrorPp: null };
  const errs = results.map((r) => r.errorPp).sort((a, b) => a - b);
  const mid = errs.length >> 1;
  const median = errs.length % 2 ? errs[mid] : (errs[mid - 1] + errs[mid]) / 2;
  return {
    n: results.length,
    withinPct: Math.round((results.filter((r) => r.within).length / results.length) * 100),
    medianErrorPp: Math.round(median * 10) / 10,
  };
}

// "Crawler's crowd was about 2.4x too eager" (or "too cautious"), from a delta, at a typical rate.
export function deltaInWords(delta: number): string {
  const ratio = Math.exp(-delta); // for small probabilities, odds ratio ~ probability ratio
  if (Math.abs(delta) < 0.1) return "almost exactly right";
  return ratio > 1 ? `about ${ratio.toFixed(1)}x too eager` : `about ${(1 / ratio).toFixed(1)}x too cautious`;
}
