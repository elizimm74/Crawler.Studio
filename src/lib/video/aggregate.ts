// VIDEO TESTS: everything counted IN CODE (no AI), so it can be checked with known answers.
//   normalizeVideo   fixes contradictions in a viewer's answer (you can't share a video you skipped)
//   aggregateVideo   hook rate, watch curve, finish rate, shares, taps, reasons, segments (3 crowds -> ranges)
//   estimateViews    a VIEW RANGE from the posting account's own recent views (only if given)
//   dealCheck        cost per 1,000 views and per visitor for a creator deal or ad
// Every constant marked ASSUMPTION is a starting guess, not a measured fact. The report says so.
import type { ObjectionCategory } from "../types";
import { range, type Range } from "../app/aggregate";
import { AFTER_TAP, type AfterTap, type CreatorStats, type VideoBeat, type VideoPersona, type VideoVerdict } from "./types";

export type { Range };

// ---------- 1. Clean up one answer ----------

export type RawVideoAnswer = {
  stopped_scrolling: boolean;
  swiped_at_frame: number;
  liked: boolean;
  shared: boolean;
  tapped_through: boolean;
  after_tap: AfterTap;
  objection_category: ObjectionCategory;
  objection: string;
  would_change_mind: string;
  quote: string;
  first_glance?: string;
  thought?: string;
};

export function normalizeVideo(r: RawVideoAnswer, p: { id: string; sample: number }, frames: number): VideoVerdict {
  const n = Math.max(1, frames);
  let leftAt = Math.round(Number(r.swiped_at_frame) || 0);
  if (leftAt < 0 || leftAt > n) leftAt = 0;
  const stopped = Boolean(r.stopped_scrolling);
  // Didn't stop scrolling = gone during the first frame. Stopped but "left at frame 1" contradicts that.
  if (!stopped) leftAt = 1;
  else if (leftAt === 1) leftAt = n >= 2 ? 2 : 0;
  const watched = stopped; // only people who stopped can like / share / tap
  const tapped = watched && Boolean(r.tapped_through);
  const afterTap: AfterTap = tapped ? (AFTER_TAP.includes(r.after_tap) && r.after_tap !== "didn't tap" ? r.after_tap : "maybe later") : "didn't tap";
  const converted = afterTap === "try it";
  return {
    personaId: p.id,
    sample: p.sample,
    stopped,
    leftAt,
    liked: watched && Boolean(r.liked),
    shared: watched && Boolean(r.shared),
    tapped,
    afterTap,
    objectionCategory: converted ? "none" : r.objection_category === "none" ? "unclear value" : r.objection_category,
    objection: String(r.objection ?? "").slice(0, 300),
    wouldChangeMind: String(r.would_change_mind ?? "").slice(0, 300),
    quote: String(r.quote ?? "").slice(0, 200),
    firstGlance: r.first_glance?.slice(0, 200),
    thought: r.thought?.slice(0, 400),
  };
}

// ---------- 2. Count ----------

export type CurvePoint = { n: number; file: string; t: number; watching: number; left: number }; // watching = 0..1 of all viewers

export type VideoObjection = { category: ObjectionCategory; count: number; pct: number; early: number; examples: string[]; changeMind: string[] };

export type Segment = { name: string; viewers: number; tapRate: number };

export type VideoStats = {
  samples: number;
  perSample: number;
  total: number;
  hook: Range; // stopped scrolling
  finish: Range; // watched to the end
  share: Range;
  like: Range;
  tap: Range; // tapped through to the product
  tryIt: Range; // tapped AND would try it
  avgWatchPct: number; // average share of the video watched (0..1)
  curve: CurvePoint[]; // after each frame: share still watching
  biggestDrop: CurvePoint | null; // the frame where most people swiped
  objections: VideoObjection[]; // why they swiped / didn't tap, biggest first
  byAge: Segment[];
  byMindset: Segment[];
  signal: Range; // reach signal 0..1 (see below)
  quotes: { personaId: string; quote: string; tapped: boolean; shared: boolean; leftAt: number }[];
};

const AGE_BANDS: [string, number, number][] = [
  ["13–17", 13, 17],
  ["18–24", 18, 24],
  ["25–34", 25, 34],
  ["35–44", 35, 44],
  ["45+", 45, 200],
];

// REACH SIGNAL (ASSUMPTION): platforms push videos that make people stop, keep watching and share.
// We blend the three into one 0..1 number. The weights are our starting guess, not a platform formula.
export const SIGNAL_WEIGHTS = { hook: 0.4, finish: 0.35, share: 0.25 } as const;
export const SHARE_CAP = 0.2; // ASSUMPTION: 20%+ of viewers wanting to share counts as "maxed out"
export function reachSignal(hook: number, finish: number, share: number): number {
  const s = SIGNAL_WEIGHTS.hook * hook + SIGNAL_WEIGHTS.finish * finish + SIGNAL_WEIGHTS.share * Math.min(1, share / SHARE_CAP);
  return Math.round(Math.max(0, Math.min(1, s)) * 1000) / 1000;
}

export function aggregateVideo(beats: VideoBeat[], duration: number, personas: VideoPersona[], verdicts: VideoVerdict[], samples: number): VideoStats {
  const n = beats.length;
  const total = verdicts.length;
  const bySample = (s: number) => verdicts.filter((v) => v.sample === s);
  const rateRange = (pick: (v: VideoVerdict) => boolean) =>
    range(
      Array.from({ length: samples }, (_, s) => bySample(s))
        .filter((vs) => vs.length)
        .map((vs) => vs.filter(pick).length / vs.length),
    );
  const pct = (count: number) => (total ? count / total : 0);

  const hook = rateRange((v) => v.stopped);
  const finish = rateRange((v) => v.leftAt === 0);
  const share = rateRange((v) => v.shared);
  const signal = range(
    Array.from({ length: samples }, (_, s) => bySample(s))
      .filter((vs) => vs.length)
      .map((vs) => reachSignal(vs.filter((v) => v.stopped).length / vs.length, vs.filter((v) => v.leftAt === 0).length / vs.length, vs.filter((v) => v.shared).length / vs.length)),
  );

  // Watch curve: after frame k, who is still watching (left later, or never).
  const curve: CurvePoint[] = beats.map((b, i) => {
    const k = i + 1;
    return {
      n: k,
      file: b.file,
      t: b.t,
      watching: pct(verdicts.filter((v) => v.leftAt === 0 || v.leftAt > k).length),
      left: verdicts.filter((v) => v.leftAt === k).length,
    };
  });
  const biggestDrop = curve.reduce<CurvePoint | null>((best, c) => (!best || c.left > best.left ? c : best), null);

  // Average watch time: someone who left at frame k left between frame k and the next one.
  const end = Math.max(duration, beats[n - 1]?.t ?? 0, 0.1);
  const leftTime = (k: number) => {
    const here = beats[k - 1]?.t ?? 0;
    const next = beats[k]?.t ?? end;
    return (here + next) / 2;
  };
  const avgWatchPct = total ? verdicts.reduce((s, v) => s + (v.leftAt === 0 ? 1 : Math.min(1, leftTime(v.leftAt) / end)), 0) / total : 0;

  // Reasons (everyone who didn't end up trying the product).
  const notWon = verdicts.filter((v) => v.afterTap !== "try it");
  const groups = new Map<ObjectionCategory, VideoVerdict[]>();
  for (const v of notWon) groups.set(v.objectionCategory, [...(groups.get(v.objectionCategory) ?? []), v]);
  const objections: VideoObjection[] = [...groups.entries()]
    .filter(([c]) => c !== "none")
    .map(([category, vs]) => ({
      category,
      count: vs.length,
      pct: notWon.length ? vs.length / notWon.length : 0,
      early: vs.filter((v) => v.leftAt === 1 || (v.leftAt > 0 && v.leftAt <= Math.ceil(n / 3))).length,
      examples: unique(vs.map((v) => v.objection)).slice(0, 8),
      changeMind: unique(vs.map((v) => v.wouldChangeMind)).slice(0, 8),
    }))
    .sort((a, b) => b.count - a.count);

  // Segments: who taps.
  const byId = new Map(personas.map((p) => [p.id, p]));
  const seg = (name: string, test: (p: VideoPersona) => boolean): Segment => {
    const vs = verdicts.filter((v) => {
      const p = byId.get(v.personaId);
      return p ? test(p) : false;
    });
    return { name, viewers: vs.length, tapRate: vs.length ? vs.filter((v) => v.tapped).length / vs.length : 0 };
  };
  const byAge = AGE_BANDS.map(([name, lo, hi]) => seg(name, (p) => p.age >= lo && p.age <= hi)).filter((s) => s.viewers > 0);
  const mindsets = [...new Set(personas.map((p) => p.mindset))];
  const byMindset = mindsets.map((m) => seg(m, (p) => p.mindset === m)).filter((s) => s.viewers > 0).sort((a, b) => b.tapRate - a.tapRate);

  // Quotes: the most "alive" ones first (tapped or shared), one per wording.
  const seen = new Set<string>();
  const quotes = [...verdicts]
    .sort((a, b) => Number(b.tapped) + Number(b.shared) - (Number(a.tapped) + Number(a.shared)))
    .filter((v) => v.quote && !seen.has(v.quote.toLowerCase()) && seen.add(v.quote.toLowerCase()))
    .map((v) => ({ personaId: v.personaId, quote: v.quote, tapped: v.tapped, shared: v.shared, leftAt: v.leftAt }));

  return {
    samples,
    perSample: samples ? Math.round(total / samples) : total,
    total,
    hook,
    finish,
    share,
    like: rateRange((v) => v.liked),
    tap: rateRange((v) => v.tapped),
    tryIt: rateRange((v) => v.afterTap === "try it"),
    avgWatchPct: Math.round(avgWatchPct * 1000) / 1000,
    curve,
    biggestDrop: biggestDrop && biggestDrop.left > 0 ? biggestDrop : null,
    objections,
    byAge,
    byMindset,
    signal,
    quotes,
  };
}

function unique(xs: string[]) {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}

// ---------- 3. A view range from the account's own history ----------

export function median(xs: number[]): number {
  const v = xs.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

// ASSUMPTION: a "typical" video scores about 0.4 on the reach signal. Above that, the range moves up;
// below it, down. The curve is gentle and capped (x0.3 to x3), because one test can't promise a viral hit.
export const TYPICAL_SIGNAL = 0.4;
export const MULTIPLIER_CAP = { low: 0.3, high: 3 } as const;
export function signalMultiplier(signal: number): number {
  const m = Math.pow(Math.max(0.01, signal) / TYPICAL_SIGNAL, 1.5);
  return Math.round(Math.max(MULTIPLIER_CAP.low, Math.min(MULTIPLIER_CAP.high, m)) * 100) / 100;
}

export type ViewEstimate = {
  usual: number; // the account's median views
  low: number;
  likely: number;
  high: number;
  multiplier: number; // vs the account's usual
  verdict: "below usual" | "around usual" | "above usual";
  basedOn: number; // how many recent videos the median came from
};

// Wide on purpose: -50% / +80% around the likely number, stretched by how much the 3 crowds disagreed.
export function estimateViews(signal: Range, creator: CreatorStats | null): ViewEstimate | null {
  const usual = median(creator?.recentViews ?? []);
  if (!creator || usual <= 0) return null;
  const mid = signalMultiplier(signal.mid);
  const likely = Math.round(usual * mid);
  const low = Math.round(usual * signalMultiplier(signal.low) * 0.5);
  const high = Math.round(usual * signalMultiplier(signal.high) * 1.8);
  return {
    usual,
    low: Math.min(low, likely),
    likely,
    high: Math.max(high, likely),
    multiplier: mid,
    verdict: mid < 0.85 ? "below usual" : mid > 1.2 ? "above usual" : "around usual",
    basedOn: creator.recentViews.filter((x) => Number.isFinite(x) && x >= 0).length,
  };
}

// ---------- 4. Is the deal worth it? ----------

// ASSUMPTION: people say they'd tap far more often than they really do. We count 1 in 10 simulated
// taps as a real visit. Change it when you have real numbers from your own posts.
export const REAL_TAP_SHARE = 0.1;

export type DealCheck = {
  price: number;
  cpm: { best: number; likely: number; worst: number }; // dollars per 1,000 views
  visitors: { low: number; likely: number; high: number };
  perVisitor: number | null; // dollars per likely visitor
  tries: number; // likely visitors who'd try it
  verdict: "good deal" | "fair" | "pricey";
  target: number; // the founder's target cost per 1,000 views
};

export function dealCheck(price: number | null, views: ViewEstimate | null, stats: Pick<VideoStats, "tap" | "tryIt">, targetCpm: number): DealCheck | null {
  if (!price || price <= 0 || !views || views.likely <= 0) return null;
  const cpm = (v: number) => Math.round((price / Math.max(1, v)) * 1000 * 100) / 100;
  const visits = (v: number, rate: number) => Math.round(v * rate * REAL_TAP_SHARE);
  const likelyVisitors = visits(views.likely, stats.tap.mid);
  const tryShare = stats.tap.mid > 0 ? stats.tryIt.mid / stats.tap.mid : 0;
  const likelyCpm = cpm(views.likely);
  const target = targetCpm > 0 ? targetCpm : 10;
  return {
    price,
    cpm: { best: cpm(views.high), likely: likelyCpm, worst: cpm(views.low) },
    visitors: { low: visits(views.low, stats.tap.low), likely: likelyVisitors, high: visits(views.high, stats.tap.high) },
    perVisitor: likelyVisitors > 0 ? Math.round((price / likelyVisitors) * 100) / 100 : null,
    tries: Math.round(likelyVisitors * tryShare),
    verdict: likelyCpm <= target * 0.8 ? "good deal" : likelyCpm <= target * 1.25 ? "fair" : "pricey",
    target,
  };
}

// Pull view counts out of whatever the founder pastes: "12k, 8.4K, 1.2M, 950".
export function parseViews(text: string): number[] {
  return (text.match(/\d[\d,.]*\s*[kKmM]?/g) ?? [])
    .map((raw) => {
      const s = raw.replace(/\s/g, "");
      const unit = s.slice(-1).toLowerCase();
      const mult = unit === "k" ? 1e3 : unit === "m" ? 1e6 : 1;
      const num = Number((mult === 1 ? s : s.slice(0, -1)).replace(/,/g, ""));
      return Number.isFinite(num) ? Math.round(num * mult) : NaN;
    })
    .filter((x) => Number.isFinite(x) && x >= 0)
    .slice(0, 30);
}
