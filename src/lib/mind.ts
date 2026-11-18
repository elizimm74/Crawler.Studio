// SMARTER CUSTOMERS, part 1: an inner life for every simulated customer, rolled IN CODE.
// Age, budget and mindset say WHO someone is. These say WHY they're here and HOW they decide:
//   motivation   why they're looking at this right now
//   need         how badly they need what it promises
//   burnedBefore a past bad experience that makes them careful (only some people have one)
//   convincedBy  the one thing most likely to win their trust
//   dealbreaker  the one thing most likely to make them leave
// These are ASSUMPTIONS built from common buyer-psychology patterns and our research notes
// (docs/persona-research.md). They are not measured. Tune them when real results come in.
import type { Persona } from "./types";

export type Mind = {
  motivation: string;
  need: "urgent" | "real but not urgent" | "nice to have" | "none yet";
  burnedBefore: string | null;
  convincedBy: string;
  dealbreaker: string;
};

type Rand = () => number;

function weighted<T extends string>(rand: Rand, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rand() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[0][0];
}

// Why they're here depends on how they arrived (a search means they're looking; an ad means they aren't).
function motivationFor(arrivedFrom: string, rand: Rand): string {
  const a = arrivedFrom.toLowerCase();
  if (a.includes("search")) {
    return weighted(rand, { "actively looking for a fix to a problem they have": 55, "comparing a few options before choosing": 45 });
  }
  if (a.includes("friend") || a.includes("colleague")) {
    return weighted(rand, { "someone they trust told them to look": 70, "checking it out to be polite, low interest": 30 });
  }
  if (a.includes("ad")) {
    return weighted(rand, { "curious after an ad, no plan to buy anything": 70, "the ad hit a real problem they have": 30 });
  }
  return weighted(rand, { "saw it on social media and got curious": 65, "it looked like something they've wanted for a while": 35 });
}

export function simulateMind(p: Persona, rand: Rand): Mind {
  const motivation = motivationFor(p.arrivedFrom, rand);
  const looking = motivation.startsWith("actively") || motivation.startsWith("comparing") || motivation.includes("real problem");
  const need = looking
    ? weighted(rand, { urgent: 35, "real but not urgent": 50, "nice to have": 15, "none yet": 0 })
    : weighted(rand, { urgent: 5, "real but not urgent": 25, "nice to have": 45, "none yet": 25 });

  // ASSUMPTION: about 1 in 4 people carry a bad past experience into a new product.
  const burnedBefore =
    rand() < 0.25
      ? weighted(rand, {
          "was charged after forgetting to cancel a free trial": 35,
          "paid for an app or tool they stopped using in a week": 30,
          "got spammed after giving their email to a site": 25,
          "bought something online that looked nothing like the photos": 10,
        })
      : null;

  // What wins them over and what loses them follow their mindset, budget and tech comfort.
  const convincedBy: Record<Persona["mindset"], string> = {
    "early adopter": "seeing it actually work (a demo, a video, trying it right away)",
    "price-sensitive": "a clear price that beats free alternatives, or a real free plan",
    skeptical: "proof from real people like them (reviews, ratings, names and faces)",
    busy: "a one-line promise and the fewest possible steps to the result",
    "impulse buyer": "an exciting first screen and a fast, easy way to say yes",
  };
  const dealbreaker =
    p.budget === "tight"
      ? "a price that's hidden, high, or needs a card upfront"
      : p.techComfort === "low"
        ? "any setup step they don't understand"
        : p.canBuyAlone === false
          ? "nothing to show their boss (pricing, security, proof)"
          : {
              "early adopter": "a waitlist or nothing to try today",
              "price-sensitive": "a price that's hidden or higher than free alternatives",
              skeptical: "no proof, or claims that sound too good to be true",
              busy: "more than a minute before they see any value",
              "impulse buyer": "a slow or long sign-up",
            }[p.mindset];

  return { motivation, need, burnedBefore, convincedBy: convincedBy[p.mindset], dealbreaker };
}

// The extra words added to each persona line the AI reads.
export function describeMind(m: Partial<Mind>): string[] {
  if (!m.motivation) return [];
  return [
    `why here: ${m.motivation}`,
    `need: ${m.need}`,
    ...(m.burnedBefore ? [`burned before: ${m.burnedBefore}`] : []),
    `won over by: ${m.convincedBy}`,
    `dealbreaker: ${m.dealbreaker}`,
  ];
}

// SMARTER CUSTOMERS, part 2: how each person decides. Shared by the website and app prompts.
export const DECISION_STEPS = `How each persona decides (think it through in order, briefly, in their head):
1. first_glance: what THEY notice first on their device in the time their patience allows (max 12 words).
2. Does this solve THEIR need, given why they're here? Someone with no real need rarely buys, however good the page is.
3. Dealbreaker check: is their dealbreaker present? If yes, they almost always leave or stay "maybe".
4. Trust check: is the thing that wins them over actually on the page? A past bad experience makes them look harder for it.
5. thought: one or two sentences of their inner reasoning, in their own voice (max 30 words). Then decide.
People are different: never give everyone the same objection. Each objection and quote must point at something specific they saw (or didn't see) on these screens.`;
