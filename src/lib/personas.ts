// STEP 2 of the engine: build personas IN CODE (no AI, so it's free).
// Each persona gets every attribute drawn from the audience settings, so 100 personas come out
// varied instead of 100 copies. ENGINE v2: age, budget and mindset are weighted by real-world
// distributions (population.ts), and every persona gets a concrete wallet, a spending history,
// patience in seconds and one dealbreaker BEFORE they see the site.
import type { Audience, Persona } from "./types";
import { simulateVisit } from "./behavior";
import { describeMind, simulateMind } from "./mind";
import { describeSpend, patienceSeconds, pickAge, pickBudget, pickMindset, simulateSpend } from "./population";

// Bump when the way customers are built or asked changes, so before/after comparisons and the
// accuracy log know which engine produced a result.
export const ENGINE_VERSION = 2;

// A "seeded" random number generator: the same seed always produces the same
// personas. That makes runs repeatable, which matters for before/after tests.
export function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    // mulberry32 — a tiny, well-known algorithm. Returns a number in [0, 1).
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePersonas(audience: Audience, count: number, seed: number): Persona[] {
  const rand = makeRandom(seed);

  // Pick one item from a list, all equally likely.
  const pick = <T,>(list: readonly T[], fallback: T): T =>
    list.length ? list[Math.floor(rand() * list.length)] : fallback;

  // Pick a key using percentages, e.g. {urban: 40, suburban: 45, rural: 15}.
  const weighted = <K extends string>(weights: Record<K, number>): K => {
    const entries = Object.entries(weights) as [K, number][];
    const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    let roll = rand() * (total || 1);
    for (const [key, w] of entries) {
      roll -= Math.max(0, w);
      if (roll < 0) return key;
    }
    return entries[0][0];
  };

  const b = audience.business;
  const personas: Persona[] = [];
  for (let i = 0; i < count; i++) {
    // (device/arrivedFrom/patience are filled in just below)
    const age = pickAge(rand, audience.ageMin, audience.ageMax, audience.ageSkew);
    const p: Persona = {
      device: "laptop",
      arrivedFrom: "",
      patience: "",
      id: `P${String(i + 1).padStart(3, "0")}`,
      age,
      gender: weighted(audience.genderSplit),
      country: pick(audience.countries, "United States"),
      area: weighted(audience.areaMix),
      occupation: pick(audience.occupations, "office worker"),
      budget: pickBudget(rand, audience.budgets, age),
      mindset: pickMindset(rand, audience.mindsets),
      techComfort: pick(audience.techComfort, "medium"),
      currentSolution: pick(audience.currentSolutions, "nothing"),
    };
    if (audience.mode === "business") {
      p.role = pick(b.roles, "manager");
      p.canBuyAlone = rand() * 100 < b.decisionSelfPct;
      p.companySize = pick(b.companySizes, "2-10");
      p.industry = pick(b.industries, "general");
    }
    // Simulate the visit itself: device, where they came from, patience.
    Object.assign(p, simulateVisit(p, rand));
    // ...and their inner life: why they're here, what wins them, what loses them (mind.ts).
    p.mind = simulateMind(p, rand);
    // ...and a concrete wallet + history and patience in seconds (population.ts).
    p.spend = simulateSpend(p, rand);
    p.patienceSec = patienceSeconds(p.patience, rand);
    personas.push(p);
  }
  return personas;
}

// One short line per persona — this is what the AI reads.
export function describePersona(p: Persona): string {
  const parts = [
    `${p.id}: ${p.age}yo ${p.gender}`,
    `${p.area} ${p.country}`,
    p.occupation,
    `${p.budget} budget`,
    `${p.mindset}`,
    `tech comfort ${p.techComfort}`,
    `currently uses: ${p.currentSolution}`,
    `visiting on a ${p.device}`,
    `came from ${p.arrivedFrom}`,
    p.patienceSec ? `patience about ${p.patienceSec} seconds` : `patience ${p.patience}`,
    ...describeSpend(p.spend),
    ...describeMind(p.mind ?? {}),
  ];
  if (p.role) {
    parts.push(
      `role ${p.role} at a ${p.companySize}-person ${p.industry} company`,
      p.canBuyAlone ? "can buy on their own" : "needs approval to buy",
    );
  }
  return parts.join(", ");
}
