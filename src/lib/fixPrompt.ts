// "Copy fix prompt": turns a report's top ranked fixes into ONE prompt the founder can paste into an
// AI builder (Lovable, Cursor, Claude, ChatGPT, Bolt, Rork...). Pure function, browser-safe, benched.
// Honesty rules are written INTO the prompt: no invented reviews, numbers, discounts or urgency;
// a TODO instead of making up facts; small focused changes; mobile must keep working.

export type PromptKind = "website" | "app" | "game" | "store" | "video" | "idea";
export type PromptFix = {
  title: string;
  problem: string;
  change: string;
  where?: string; // "the landing page (top)", "screen 3: Paywall", "frame 2 (1.5s)"
  winBack?: number; // simulated customers (per crowd) this could win back (counted in code)
};
export type PromptCopy = { label: string; items: string[] };
export type PromptInput = {
  kind: PromptKind;
  name: string; // product name or address
  url?: string;
  whatItIs?: string;
  whoItsFor?: string;
  goal?: string; // "sign up", "start a free trial", "tap through"...
  result?: { yes: number; total: number }; // e.g. 20 of 100 would sign up
  fixes: PromptFix[];
  copy?: PromptCopy[];
  topN?: number; // how many fixes to include (default 3)
};

const TARGET: Record<PromptKind, string> = {
  website: "my website",
  store: "my online store",
  app: "my app's onboarding and paywall",
  game: "my game's first minutes and shop",
  video: "my video (ad / short-form post)",
  idea: "my product idea (nothing is built yet)",
};
const ASK: Record<PromptKind, string> = {
  idea: "Nothing is built yet, so don't write code. Rewrite my pitch: a one-line headline, a 2-sentence description, who it's for, and the price line, then list what I should find out or build first.",
  website: "Make these changes in the code of my site.",
  store: "Make these changes in my store (theme/code and product pages).",
  app: "Make these changes in my app's onboarding and paywall screens.",
  game: "Make these changes in my game's first-session flow and shop screens.",
  video:
    "You can't edit the video file, so give me a new edit plan: a shot-by-shot list with timings, the exact on-screen text, and the voiceover script.",
};

export function buildFixPrompt(input: PromptInput): string {
  const n = Math.max(1, Math.min(input.topN ?? 3, input.fixes.length));
  const fixes = input.fixes.slice(0, n);
  const L: string[] = [];
  const name = input.name.trim() || "my product";

  const generic = /^my\b/i.test(name); // "my app" adds nothing after "my app's onboarding"
  L.push(`I'm improving ${TARGET[input.kind]}${generic ? "" : `: ${name}`}${input.url && input.url !== name ? ` (${input.url})` : ""}.`);
  if (input.whatItIs) L.push(`What it is: ${input.whatItIs}`);
  if (input.whoItsFor) L.push(`Who it's for: ${input.whoItsFor}`);
  if (input.result && input.result.total > 0) {
    L.push(
      `I tested it with Crawler: ${input.result.yes} of ${input.result.total} simulated customers said they would ${input.goal || "convert"}. ` +
        `(These are AI-simulated customers, so treat this as a strong hint, not proof.)`,
    );
  }
  L.push("", `${ASK[input.kind]} Do the ${n === 1 ? "fix" : `${n} fixes`} below in this order (most important first).`);

  fixes.forEach((f, i) => {
    L.push("", `## Fix ${i + 1}: ${f.title.trim()}`);
    if (f.where) L.push(`Where: ${f.where}`);
    L.push(`Problem: ${f.problem.trim()}`);
    L.push(`Change: ${f.change.trim()}`);
    if (f.winBack && f.winBack > 0) {
      const per = input.result?.total ? ` out of ${input.result.total}` : "";
      L.push(`Why it matters: could win back about ${f.winBack}${per} simulated customers.`);
    }
  });

  const copy = (input.copy ?? []).map((c) => ({ ...c, items: c.items.map((s) => s.trim()).filter(Boolean) })).filter((c) => c.items.length);
  if (copy.length) {
    L.push("", "## Ready-made copy you can use (pick the best fit)");
    for (const c of copy) L.push(c.items.length === 1 ? `- ${c.label}: ${c.items[0]}` : `- ${c.label}:\n${c.items.map((s) => `  - ${s}`).join("\n")}`);
  }

  L.push(
    "",
    "## Rules",
    "- Keep everything true. Do NOT invent testimonials, reviews, user counts, logos, ratings, discounts, prices or countdown timers.",
    "- If a fix needs real information you don't have (a real price, a real review, real numbers), add a clearly marked TODO for me instead of making it up.",
    input.kind === "video"
      ? "- Keep the same product and claims; only change the hook, order, pacing, on-screen text and call to action."
      : "- Make the smallest change that achieves each fix. Don't redesign unrelated parts or change the brand style.",
    input.kind === "video" ? "- Keep it readable on a phone with the sound off (big captions, safe from the app's buttons)." : "- Keep it working and easy to read on phones.",
    "- When you're done, list what you changed and where, so I can check it and re-test with Crawler.",
  );
  return L.join("\n");
}
