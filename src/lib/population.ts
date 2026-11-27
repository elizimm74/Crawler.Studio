// ENGINE v2, part 1: ground every simulated customer in a REAL population.
//
// Before v2, every choice in the audience form was equally likely: if the founder ticked all five
// mindsets, 20% of the crowd were "impulse buyers", and "tight / okay / comfortable" budgets were a
// third each. Real crowds don't look like that. Here each attribute is drawn from a published
// distribution where one exists, and from a clearly labelled ASSUMPTION where it doesn't.
// The founder's audience settings still decide WHO is in the crowd (age range, countries,
// which budgets and mindsets are possible); these weights decide HOW COMMON each kind is.
//
// Every number below is listed with its source (or "ASSUMPTION") in docs/persona-research.md and on
// the /science page. Change one here = change it there too.
import type { Budget, Mindset, Persona } from "./types";

type Rand = () => number;

export const SOURCES = {
  shed: "Federal Reserve, Economic Well-Being of U.S. Households in 2024 (SHED, published May 2025)",
  rogers: "Everett Rogers, Diffusion of Innovations (adopter categories)",
  census: "U.S. Census Bureau age structure (roughly even across ages 18-64, thinning after 65)",
} as const;

// ---------- Budget: how much room someone has for a new purchase ----------
// FACT (SHED 2024): 63% of US adults would cover a $400 emergency expense with cash or its
// equivalent; 37% would not (13% couldn't pay it at all). We treat that 37% as "tight".
// ASSUMPTION: the 63% who could is split "okay" 38 / "comfortable" 25.
// ASSUMPTION: teens (13-17) mostly spend from an allowance or job money: tight 60 / okay 35 / comfortable 5.
const BUDGET_ADULT: Record<Budget, number> = { tight: 37, okay: 38, comfortable: 25 };
const BUDGET_TEEN: Record<Budget, number> = { tight: 60, okay: 35, comfortable: 5 };

// ---------- Mindset: how they approach something new ----------
// FACT (Rogers): innovators 2.5% + early adopters 13.5% = 16% of people adopt new things early.
// ASSUMPTION: the other 84% split skeptical 30 / price-sensitive 26 / busy 20 / impulse buyer 8.
const MINDSET_WEIGHTS: Record<Mindset, number> = {
  "early adopter": 16,
  skeptical: 30,
  "price-sensitive": 26,
  busy: 20,
  "impulse buyer": 8,
};

// Draw one of the ALLOWED options (the founder's selection), weighted by the real-world mix.
// An option the founder ticked always stays possible: unknown options get the average weight.
export function weightedAmong<T extends string>(rand: Rand, allowed: readonly T[], weights: Partial<Record<T, number>>, fallback: T): T {
  if (!allowed.length) return fallback;
  const known = allowed.map((a) => weights[a]).filter((w): w is number => typeof w === "number");
  const avg = known.length ? known.reduce((s, w) => s + w, 0) / known.length : 1;
  const ws = allowed.map((a) => Math.max(0.0001, weights[a] ?? avg));
  const total = ws.reduce((s, w) => s + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < allowed.length; i++) {
    roll -= ws[i];
    if (roll < 0) return allowed[i];
  }
  return allowed[allowed.length - 1];
}

export const pickBudget = (rand: Rand, allowed: readonly Budget[], age: number) =>
  weightedAmong(rand, allowed, age < 18 ? BUDGET_TEEN : BUDGET_ADULT, "okay");

export const pickMindset = (rand: Rand, allowed: readonly Mindset[]) => weightedAmong(rand, allowed, MINDSET_WEIGHTS, "skeptical");

// ---------- Age inside the founder's range ----------
// Census: roughly even across 18-64, fewer people at each age after 65. We keep "younger / older"
// skews from the form, then thin out ages over 65 (ASSUMPTION: 65-74 at 85%, 75+ at 50% weight).
export function pickAge(rand: Rand, min: number, max: number, skew: "even" | "younger" | "older"): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  for (let tries = 0; tries < 8; tries++) {
    let r = rand();
    if (skew === "younger") r = r * r;
    if (skew === "older") r = Math.sqrt(r);
    const age = Math.round(lo + r * (hi - lo));
    const keep = age >= 75 ? 0.5 : age >= 65 ? 0.85 : 1;
    if (keep >= 1 || rand() < keep) return age;
  }
  return Math.round((lo + hi) / 2);
}

// ---------- A concrete wallet and history, rolled before they see the site ----------
// ALL ASSUMPTIONS (no public dataset gives "spare money for an app like this" per person).
// They turn "okay budget" into numbers the persona can check a price against, out loud.
export type Spend = {
  monthlySpare: number; // USD a month they could put toward something like this without stress
  noThinkLimit: number; // USD they'd spend on something new without having to think hard
  subscriptions: number; // paid subscriptions they already have
  history: string; // one recent spending fact that shapes how careful they are
};

const SPARE: Record<Budget, [number, number]> = { tight: [5, 30], okay: [30, 120], comfortable: [120, 500] };
const TEEN_SPARE: Record<Budget, [number, number]> = { tight: [0, 15], okay: [15, 50], comfortable: [50, 150] };

export function simulateSpend(p: Pick<Persona, "age" | "budget" | "mindset" | "canBuyAlone">, rand: Rand): Spend {
  const [a, b] = (p.age < 18 ? TEEN_SPARE : SPARE)[p.budget];
  const monthlySpare = roundMoney(a + rand() * (b - a));
  // impulse buyers spend more before thinking; price-sensitive and skeptical people less
  const share = p.mindset === "impulse buyer" ? 0.6 : p.mindset === "price-sensitive" ? 0.15 : p.mindset === "skeptical" ? 0.2 : 0.3;
  const noThinkLimit = roundMoney(monthlySpare * share);
  const subscriptions = p.age < 18 ? Math.floor(rand() * 3) : Math.floor(rand() * (p.budget === "tight" ? 3 : p.budget === "okay" ? 5 : 8));
  const pool =
    p.age < 18
      ? ["has to ask a parent for anything over a few dollars", "spent their birthday money on a game last month", "bought something from a TikTok ad that disappointed them", "uses app-store gift cards, no card of their own"]
      : p.budget === "tight"
        ? ["cancelled a subscription last month to save money", "checks every price against a free alternative", "got charged after forgetting a free trial once", "hasn't paid for any new app or tool this year"]
        : p.budget === "okay"
          ? ["paid for one new app or tool in the last few months", "cancels things they don't use within a month", "bought something online this week after reading reviews", "keeps a close eye on what renews each month"]
          : ["pays for several tools and rarely checks the bill", "will pay to save time without much thought", "bought a premium plan last month to skip ads", "tries new products often and cancels the bad ones"];
  const history = p.canBuyAlone === false ? "has to get any purchase approved by their manager" : pool[Math.floor(rand() * pool.length)];
  return { monthlySpare, noThinkLimit, subscriptions, history };
}

// Patience as a number of seconds (the AI reads "about 10 seconds"; code uses the number).
export function patienceSeconds(patience: string, rand: Rand): number {
  if (patience.includes("10")) return 6 + Math.round(rand() * 8);
  if (patience.includes("30")) return 20 + Math.round(rand() * 25);
  return 90 + Math.round(rand() * 210);
}

const roundMoney = (n: number) => (n < 20 ? Math.round(n) : Math.round(n / 5) * 5);

export function describeSpend(s?: Spend): string[] {
  if (!s) return [];
  return [
    `can spare about $${s.monthlySpare}/month for something like this`,
    `spends up to $${s.noThinkLimit} on something new without thinking hard`,
    `${s.subscriptions} paid subscription${s.subscriptions === 1 ? "" : "s"} already`,
    `recently: ${s.history}`,
  ];
}
