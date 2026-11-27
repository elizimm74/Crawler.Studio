// STEP 5 of the engine: turn raw verdicts into report numbers — IN CODE.
// This is free and exact, and it's why we never need to send every raw
// verdict to the expensive model.
import type { Audience, Goal, Persona, Verdict, ObjectionCategory, FunnelStep } from "./types";
import { baseRateFor, followThrough, meanShifted, predictedRange, UNCALIBRATED_SD, wilson } from "./intent";
import { topEvidence, type EvidenceCount } from "./evidence";

// A segment with fewer simulated customers than this is shown, but flagged "too few to trust".
export const MIN_SEGMENT = 30;

// Which calibration a test used (see calibration.ts). Picked by the worker before counting.
export type CalibrationUsed = {
  source: "none" | "global" | "site";
  delta: number; // log-odds shift applied to every person's probability
  sd: number; // how unsure that shift is
  n: number; // real results behind it
  note: string; // plain English, shown in the report
};

export const NO_CALIBRATION: CalibrationUsed = {
  source: "none",
  delta: 0,
  sd: UNCALIBRATED_SD,
  n: 0,
  note: "Not calibrated yet: the say-versus-do adjustment uses research-based starting values until enough founders add their real results.",
};

// ENGINE v2: what the crowd SAID vs what we PREDICT they'd do, both with 90% ranges.
export type Behavior = {
  engine: number;
  stated: { rate: number; low: number; high: number }; // "said yes" share, Wilson 90%
  predicted: { rate: number; low: number; high: number; count: number }; // after say-vs-do + calibration
  baseRate: { low: number; high: number; text: string }; // what's normal for this goal on real traffic
  calibration: CalibrationUsed;
  topReductions: { why: string; people: number }[]; // the most common reasons yeses were discounted
  p: number[]; // each person's probability BEFORE calibration, in persona order (calibration refits on these)
  yesBias: boolean; // the stated rate is far above anything real (see quality.ts)
};

export type EvidenceStats = {
  checkable: number; // decisions that quoted page words
  verified: number; // ...whose words were really found on the page
  missing: number; // decisions caused by something missing from the page
  top: EvidenceCount[]; // most-cited elements overall
};

export type SegmentRow = {
  value: string;
  n: number;
  buy: number;
  maybe: number;
  no: number;
  buyRate: number; // 0..1
  low?: number; // 90% range of buyRate (Wilson), engine v2
  high?: number;
  predicted?: number; // predicted real rate for this segment (say-vs-do + calibration)
  small?: boolean; // fewer than MIN_SEGMENT people: don't trust the difference
};

export type ObjectionGroup = {
  category: ObjectionCategory;
  count: number;
  pctOfNonBuyers: number; // 0..1
  maybeCount: number; // the easiest people to flip
  examples: string[]; // a few objections in their own words
  changeMind: string[]; // what they said would win them
  evidence?: EvidenceCount[]; // the page elements these people cited (engine v2)
};

export type QuoteItem = {
  personaId: string;
  verdict: Verdict["verdict"];
  quote: string;
  label: string; // short persona description, e.g. "24, student, price-sensitive"
};

export type Stats = {
  total: number;
  buy: number;
  maybe: number;
  no: number;
  buyRate: number;
  segments: Record<string, SegmentRow[]>; // e.g. segments.age = [...]
  funnel: { step: FunnelStep | "converted"; reached: number; lost: number }[];
  objections: ObjectionGroup[];
  bestQuotes: QuoteItem[];
  allQuotes: QuoteItem[];
  behavior?: Behavior; // engine v2
  evidence?: EvidenceStats; // engine v2
};

export type AggregateOptions = { goal?: Goal; calibration?: CalibrationUsed; engine?: number; seed?: number };

export function ageBucket(age: number) {
  if (age < 18) return "under 18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

export function aggregate(
  audience: Audience,
  personas: Persona[],
  verdicts: Verdict[],
  triedProduct = false, // true when the explorer ran, adds a "product" funnel step
  opts: AggregateOptions = {},
): Stats {
  const personaById = new Map(personas.map((p) => [p.id, p]));
  const rows = verdicts
    .map((v) => ({ v, p: personaById.get(v.personaId)! }))
    .filter((r) => r.p);

  const total = rows.length;
  const goal: Goal = opts.goal ?? "sign up";
  const cal = opts.calibration ?? NO_CALIBRATION;
  const intents = rows.map((r) => followThrough(r.p, r.v, goal));
  const probOf = new Map(rows.map((r, i) => [r.v.personaId, intents[i].p]));
  const count = (verdict: Verdict["verdict"]) => rows.filter((r) => r.v.verdict === verdict).length;
  const buy = count("buy");

  // ----- Segments (the heatmap) -----
  const segmentFns: Record<string, (p: Persona) => string | undefined> = {
    age: (p) => ageBucket(p.age),
    budget: (p) => p.budget,
    occupation: (p) => p.occupation,
    mindset: (p) => p.mindset,
    "tech comfort": (p) => p.techComfort,
    area: (p) => p.area,
    gender: (p) => p.gender,
    device: (p) => p.device,
    "came from": (p) => p.arrivedFrom,
    patience: (p) => p.patience,
  };
  if (audience.mode === "business") {
    segmentFns.role = (p) => p.role;
    segmentFns["company size"] = (p) => p.companySize;
    segmentFns["who decides"] = (p) => (p.canBuyAlone ? "can buy alone" : "needs approval");
  }

  const segments: Record<string, SegmentRow[]> = {};
  for (const [name, fn] of Object.entries(segmentFns)) {
    const groups = new Map<string, SegmentRow & { ps: number[] }>();
    for (const { v, p } of rows) {
      const key = fn(p);
      if (!key) continue;
      const g = groups.get(key) ?? { value: key, n: 0, buy: 0, maybe: 0, no: 0, buyRate: 0, ps: [] as number[] };
      g.n++;
      g[v.verdict]++;
      g.ps.push(probOf.get(v.personaId) ?? 0);
      groups.set(key, g);
    }
    segments[name] = [...groups.values()]
      .map(({ ps, ...g }) => {
        const [low, high] = wilson(g.buy, g.n);
        return { ...g, buyRate: g.n ? g.buy / g.n : 0, low, high, predicted: meanShifted(ps, cal.delta), small: g.n < MIN_SEGMENT };
      })
      .sort((a, b) => (name === "age" ? a.value.localeCompare(b.value) : b.n - a.n));
  }

  // ----- Funnel drop-off -----
  let reached = total;
  const funnel: Stats["funnel"] = [];
  const steps = triedProduct ? (["hero", "pricing", "product", "signup"] as const) : (["hero", "pricing", "signup"] as const);
  for (const step of steps) {
    const lost = rows.filter((r) => r.v.lostAt === step).length;
    funnel.push({ step, reached, lost });
    reached -= lost;
  }
  funnel.push({ step: "converted", reached, lost: 0 });

  // ----- Objections, grouped by category -----
  const nonBuyers = rows.filter((r) => r.v.verdict !== "buy");
  const byCat = new Map<ObjectionCategory, typeof nonBuyers>();
  for (const r of nonBuyers) {
    const list = byCat.get(r.v.objectionCategory) ?? [];
    list.push(r);
    byCat.set(r.v.objectionCategory, list);
  }
  const objections: ObjectionGroup[] = [...byCat.entries()]
    .map(([category, list]) => ({
      category,
      count: list.length,
      pctOfNonBuyers: nonBuyers.length ? list.length / nonBuyers.length : 0,
      maybeCount: list.filter((r) => r.v.verdict === "maybe").length,
      // Put "maybe" people first: their feedback is the most actionable.
      examples: sortMaybeFirst(list).slice(0, 8).map((r) => r.v.objection),
      changeMind: sortMaybeFirst(list).slice(0, 8).map((r) => r.v.wouldChangeMind),
      evidence: topEvidence(list.map((r) => r.v.evidence), 3),
    }))
    .sort((a, b) => b.count - a.count);

  // ----- Quotes -----
  const allQuotes: QuoteItem[] = rows.map(({ v, p }) => ({
    personaId: p.id,
    verdict: v.verdict,
    quote: v.quote,
    label: [p.age, p.role ?? p.occupation, p.mindset].join(", "),
  }));

  // ----- Engine v2: say vs do, ranges, evidence -----
  const ps = intents.map((x) => x.p);
  const [sLow, sHigh] = wilson(buy, total);
  const predictedRate = meanShifted(ps, cal.delta);
  const [pLow, pHigh] = predictedRange(ps, cal.delta, cal.sd, opts.seed ?? 1);
  const reductions = new Map<string, number>();
  rows.forEach((r, i) => {
    if (r.v.verdict !== "buy") return;
    for (const f of intents[i].factors) reductions.set(f.why, (reductions.get(f.why) ?? 0) + 1);
  });
  const base = baseRateFor(goal);
  const statedRate = total ? buy / total : 0;
  const behavior: Behavior | undefined = total
    ? {
        engine: opts.engine ?? 2,
        stated: { rate: statedRate, low: sLow, high: sHigh },
        predicted: { rate: predictedRate, low: pLow, high: pHigh, count: Math.round(predictedRate * total) },
        baseRate: base,
        calibration: cal,
        topReductions: [...reductions.entries()].map(([why, people]) => ({ why, people })).sort((a, b) => b.people - a.people).slice(0, 4),
        p: ps.map((x) => Math.round(x * 1e4) / 1e4),
        // more than 5x the top of the normal band AND over 30% said yes
        yesBias: statedRate > Math.max(0.3, base.high * 5),
      }
    : undefined;
  const evs = rows.map((r) => r.v.evidence).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const evidence: EvidenceStats | undefined = evs.length
    ? {
        checkable: evs.filter((e) => e.verified !== null).length,
        verified: evs.filter((e) => e.verified === true).length,
        missing: evs.filter((e) => e.kind === "missing").length,
        top: topEvidence(evs, 6),
      }
    : undefined;

  return {
    behavior,
    evidence,
    total,
    buy,
    maybe: count("maybe"),
    no: count("no"),
    buyRate: total ? buy / total : 0,
    segments,
    funnel,
    objections,
    bestQuotes: pickBestQuotes(rows),
    allQuotes,
  };
}

function sortMaybeFirst<T extends { v: Verdict }>(list: T[]) {
  return [...list].sort((a, b) => Number(b.v.verdict === "maybe") - Number(a.v.verdict === "maybe"));
}

// "Best" = a balanced mix: some buyers, some maybes, mostly no's (like reality),
// spread across different objections, and quotes of a readable length.
function pickBestQuotes(rows: { v: Verdict; p: Persona }[]): QuoteItem[] {
  const goodLength = rows.filter((r) => r.v.quote.length >= 25 && r.v.quote.length <= 160);
  const pool = goodLength.length >= 10 ? goodLength : rows;
  const picked: typeof rows = [];
  const usedCats = new Set<string>();
  const want: [Verdict["verdict"], number][] = [["buy", 3], ["maybe", 3], ["no", 4]];

  for (const [verdict, n] of want) {
    const candidates = pool.filter((r) => r.v.verdict === verdict);
    // First pass: one per objection category; second pass: fill the rest.
    for (const pass of [0, 1]) {
      for (const r of candidates) {
        if (picked.filter((x) => x.v.verdict === verdict).length >= n) break;
        if (picked.includes(r)) continue;
        if (pass === 0 && usedCats.has(r.v.objectionCategory)) continue;
        picked.push(r);
        usedCats.add(r.v.objectionCategory);
      }
    }
  }
  // Top up to 10 if one verdict type was rare.
  for (const r of pool) {
    if (picked.length >= 10) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked.map(({ v, p }) => ({
    personaId: p.id,
    verdict: v.verdict,
    quote: v.quote,
    label: [p.age, p.role ?? p.occupation, p.mindset].join(", "),
  }));
}
