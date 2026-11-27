// ENGINE v2, part 3: separate what people SAY from what they'd DO.
//
// People (and AI personas even more) say "I'd buy that" far more often than they actually buy.
// Stated-preference research calls this HYPOTHETICAL BIAS: what people say they'd pay or do is
// reliably higher than what they do with real money, and the gap grows with the price
// (Murphy et al. 2005, Environmental and Resource Economics; Morwitz, Steckel & Gupta 2007,
// International Journal of Forecasting). So the crowd's answers are kept exactly as given
// ("38 of 100 said yes"), and THIS file turns each answer into a probability that the person
// would actually do it. The sum of those probabilities is the PREDICTED rate.
//
// The follow-through numbers below are PRIORS (ASSUMPTIONS informed by that research). They are
// what we use until real results exist. Calibration (calibration.ts) then learns how far off they
// are from founders' real conversion rates and shifts every prediction by that amount.
import type { Goal, Persona, Verdict } from "./types";
import { makeRandom } from "./personas";

// ---------- What "normal" looks like (used in the prompt, the report and the yes-bias check) ----------
export type BaseRate = { low: number; high: number; text: string };

export function baseRateFor(goal: Goal): BaseRate {
  switch (goal) {
    case "buy":
      return { low: 0.015, high: 0.03, text: "On real online stores only about 1.5-3% of visits end in a purchase (2025 ecommerce benchmarks: Triple Whale, IRP Commerce, OptiMonk)." };
    case "start a free trial":
      return { low: 0.02, high: 0.1, text: "Free trials that ask for a card upfront get roughly 2% of visitors; trials with no card roughly 10% (Totango data via Chargebee)." };
    case "book a demo":
      return { low: 0.01, high: 0.05, text: "Most landing pages convert a small minority of visitors; a demo booking is a bigger ask than a free signup, so expect the low end (Unbounce benchmark: median landing page 6.6%, SaaS 3.8%)." };
    default:
      return { low: 0.02, high: 0.08, text: "Across 41,000 landing pages, the median converts about 6.6% of visitors (SaaS about 3.8%) (Unbounce Conversion Benchmark Report, Q4 2024)." };
  }
}

// ---------- Follow-through priors (ASSUMPTIONS) ----------
// Share of stated "yes" answers that become the real action. Money now = lowest; a free email
// signup = highest. In line with the common "divide stated intent by about two" rule of thumb
// discussed in the stated-preference literature, but here per goal and per person.
const FOLLOW_THROUGH: Record<Goal, number> = {
  buy: 0.35,
  "start a free trial": 0.5,
  "sign up": 0.5,
  "join the waitlist": 0.6,
  "download the app": 0.5,
  "book a demo": 0.3,
};
export const MAYBE_P = 0.04; // a few "maybe"s still do it later (ASSUMPTION)
export const NO_P = 0.002; // almost none of the "no"s (ASSUMPTION)

const paysNow = (goal: Goal) => goal === "buy" || goal === "book a demo";

export type IntentFactor = { why: string; times: number };

// The chance THIS person really does it, plus the reasons it was lowered (shown in the report).
export function followThrough(p: Persona, v: Pick<Verdict, "verdict">, goal: Goal): { p: number; factors: IntentFactor[] } {
  if (v.verdict === "no") return { p: NO_P, factors: [] };
  const base = v.verdict === "buy" ? FOLLOW_THROUGH[goal] ?? 0.5 : MAYBE_P;
  const factors: IntentFactor[] = [];
  const add = (why: string, times: number) => factors.push({ why, times });
  const lowPatience = (p.patienceSec ?? (p.patience.includes("10") ? 10 : 30)) <= 15;
  const tight = p.budget === "tight";
  // impulse yeses fade fastest: decided on a feeling, and the feeling passes (ASSUMPTION)
  if (p.mindset === "impulse buyer" && (lowPatience || tight)) add("impulse yes from someone with little patience or money: these fade", 0.5);
  else if (lowPatience) add("very little patience: easy to get distracted before finishing", 0.75);
  if (tight && paysNow(goal)) add("tight budget and it costs money today", 0.6);
  if (p.canBuyAlone === false) add("needs a manager's approval first", 0.5);
  if (p.mind?.need === "none yet") add("no real need yet", 0.5);
  else if (p.mind?.need === "nice to have") add("only a nice-to-have", 0.75);
  if (p.mind?.burnedBefore && goal === "start a free trial") add("burned by a free trial before", 0.85);
  const prob = factors.reduce((x, f) => x * f.times, base);
  return { p: clamp01(prob), factors };
}

// ---------- Calibration shift (log-odds) ----------
// A calibration "delta" moves every probability up or down by the same amount on the log-odds
// scale: delta -0.69 roughly halves small probabilities, +0.69 roughly doubles them. Doing it in
// log-odds (not plain percentages) keeps a strong page strong and a weak page weak.
const logit = (x: number) => Math.log(x / (1 - x));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
export const shift = (p: number, delta: number) => (delta === 0 ? p : sigmoid(logit(Math.min(0.999, Math.max(0.0001, p))) + delta));
export const meanShifted = (ps: number[], delta: number) => (ps.length ? ps.reduce((s, p) => s + shift(p, delta), 0) / ps.length : 0);

// ---------- Confidence ranges ----------
// Wilson score interval (90%): the honest range for "k of n said yes" with a small n.
export function wilson(k: number, n: number, z = 1.645): [number, number] {
  if (!n) return [0, 0];
  const ph = k / n;
  const d = 1 + (z * z) / n;
  const c = (ph + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((ph * (1 - ph)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

// How unsure the calibration itself is (log-odds). Before any real results: wide on purpose.
export const UNCALIBRATED_SD = 0.7;

// 90% range for the predicted rate: resample the crowd (who happened to be picked) AND move the
// calibration by its own uncertainty. Seeded, so the same test always shows the same range.
export function predictedRange(ps: number[], delta: number, sd: number, seed = 1): [number, number] {
  if (!ps.length) return [0, 0];
  const rand = makeRandom(seed);
  const draws: number[] = [];
  for (let b = 0; b < 400; b++) {
    const d = delta + sd * normal(rand);
    let sum = 0;
    for (let i = 0; i < ps.length; i++) sum += shift(ps[Math.floor(rand() * ps.length)], d);
    draws.push(sum / ps.length);
  }
  draws.sort((a, b) => a - b);
  return [draws[Math.floor(0.05 * draws.length)], draws[Math.ceil(0.95 * draws.length) - 1]];
}

function normal(rand: () => number) {
  // Box-Muller
  const u = Math.max(1e-9, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const clamp01 = (x: number) => Math.min(0.999, Math.max(0, x));
