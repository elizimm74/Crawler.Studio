// SMARTER CUSTOMERS, part 3: checks on the ANSWERS themselves, done in code after every test.
// A crowd that repeats itself or agrees on everything is a warning sign, so the report says so
// instead of hiding it. Pure functions: the bench tests them with known answers.
export type Quality = {
  answers: number;
  uniqueQuotesPct: number; // share of quotes that aren't near-copies of another quote
  uniqueReasonsPct: number; // the same, for objections
  thoughtful: number; // how many answers include their reasoning (newer runs)
  flags: string[]; // plain-English warnings; empty = looks healthy
};

type Answer = { verdict?: string; decision?: string; objection: string; quote: string; thought?: string };

// "Price is too high!" and "price is too high" count as the same answer.
const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
const uniquePct = (list: string[]) => (list.length ? Math.round((new Set(list.map(key)).size / list.length) * 100) : 100);

// Engine v2 extras from aggregate.ts (optional so app/video callers keep working).
type Extra = {
  behavior?: { yesBias: boolean; stated: { rate: number }; baseRate: { high: number } };
  evidence?: { checkable: number; verified: number };
};

export function answerQuality(answers: Answer[], extra: Extra = {}): Quality & { evidencePct?: number } {
  const n = answers.length;
  const uniqueQuotesPct = uniquePct(answers.map((a) => a.quote));
  const uniqueReasonsPct = uniquePct(answers.map((a) => a.objection));
  const outcomes = new Set(answers.map((a) => a.verdict ?? a.decision ?? ""));
  const flags: string[] = [];
  if (n >= 10 && uniqueQuotesPct < 70) flags.push("Many customers said almost the same thing, so treat the quotes as less reliable.");
  if (n >= 10 && uniqueReasonsPct < 50) flags.push("Many customers gave the same reason word for word. The top blocker is probably right, but the details are thin.");
  if (n >= 20 && outcomes.size === 1) flags.push("Every customer made the same decision. Real crowds rarely agree completely; check the page facts and audience.");
  if (extra.behavior?.yesBias) {
    flags.push(
      `${Math.round(extra.behavior.stated.rate * 100)}% of customers said yes, far above what real pages get (usually under ${Math.round(extra.behavior.baseRate.high * 100)}%). AI customers lean towards yes; rely on the predicted rate, not the raw count.`,
    );
  }
  const ev = extra.evidence;
  const evidencePct = ev && ev.checkable ? Math.round((ev.verified / ev.checkable) * 100) : undefined;
  if (evidencePct !== undefined && ev!.checkable >= 10 && evidencePct < 60) {
    flags.push(`Only ${evidencePct}% of the page words customers quoted could be found on your page. Treat their reasons as less reliable.`);
  }
  return { evidencePct, answers: n, uniqueQuotesPct, uniqueReasonsPct, thoughtful: answers.filter((a) => a.thought && a.thought.trim()).length, flags };
}
