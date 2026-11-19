// BEFORE / AFTER: compare a re-test with the test it repeats.
// A re-test uses the SAME seed and audience, so code rebuilds the SAME simulated customers
// (same ids, ages, budgets, minds). That lets us show exactly who changed their mind after a fix.
// Pure code, no AI: the bench checks it with known answers.
import type { Persona, Verdict } from "./types";

type Side = { personas: Persona[]; verdicts: Verdict[] };
export type Flip = { personaId: string; who: string; from: Verdict["verdict"]; to: Verdict["verdict"]; quote: string; reasonBefore: string };
export type Comparison = {
  matched: number; // customers who exist in both tests (normally all of them)
  before: { buy: number; maybe: number; no: number };
  after: { buy: number; maybe: number; no: number };
  delta: number; // change in "buy", counted only over matched customers
  won: Flip[]; // moved up (no -> maybe/buy, maybe -> buy)
  lost: Flip[]; // moved down
  sameCrowd: boolean; // false if the customers don't line up (then only totals are fair to compare)
};

const RANK = { no: 0, maybe: 1, buy: 2 } as const;
const sameMan = (a: Persona, b: Persona) => a.age === b.age && a.budget === b.budget && a.mindset === b.mindset && a.occupation === b.occupation;
const who = (p: Persona) => `${p.age}, ${p.occupation}, ${p.mindset}`;

export function compareRuns(prev: Side, next: Side): Comparison {
  const prevBy = new Map(prev.verdicts.map((v) => [v.personaId, v]));
  const prevPeople = new Map(prev.personas.map((p) => [p.id, p]));
  const count = (vs: Verdict[]) => ({
    buy: vs.filter((v) => v.verdict === "buy").length,
    maybe: vs.filter((v) => v.verdict === "maybe").length,
    no: vs.filter((v) => v.verdict === "no").length,
  });
  const won: Flip[] = [];
  const lost: Flip[] = [];
  const matchedPrev: Verdict[] = [];
  const matchedNext: Verdict[] = [];
  let mismatched = 0;
  for (const p of next.personas) {
    const a = prevBy.get(p.id);
    const b = next.verdicts.find((v) => v.personaId === p.id);
    const before = prevPeople.get(p.id);
    if (!a || !b || !before) continue;
    if (!sameMan(before, p)) {
      mismatched++;
      continue;
    }
    matchedPrev.push(a);
    matchedNext.push(b);
    if (RANK[b.verdict] === RANK[a.verdict]) continue;
    const flip = { personaId: p.id, who: who(p), from: a.verdict, to: b.verdict, quote: b.quote, reasonBefore: a.objection };
    (RANK[b.verdict] > RANK[a.verdict] ? won : lost).push(flip);
  }
  const before = count(matchedPrev);
  const after = count(matchedNext);
  // Biggest moves first: no -> buy before maybe -> buy.
  const size = (f: Flip) => Math.abs(RANK[f.to] - RANK[f.from]);
  won.sort((x, y) => size(y) - size(x));
  lost.sort((x, y) => size(y) - size(x));
  return {
    matched: matchedPrev.length,
    before,
    after,
    delta: after.buy - before.buy,
    won,
    lost,
    sameCrowd: matchedPrev.length > 0 && mismatched === 0,
  };
}
