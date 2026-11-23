// What KIND of product is being tested. The engine (crawler, simulated customers, counting)
// is the same for all of them; this file only changes what the simulated customers are told to
// judge. It is chosen by the founder in the questions and travels inside the product profile.
//
//   website: a landing page / web app          app: a mobile app's onboarding + paywall
//   game:    a Roblox or mobile game's first session + shop/offer (screenshots you upload)
//   store:   an online store (e.g. Shopify, clothing, dropshipping): product page, shipping, trust
//
// SAFETY: we only ever put one of these fixed sentences into a prompt (never text typed by a
// user), so a bad value can't inject instructions. Unknown values are ignored.

export const PRODUCT_TYPES = ["website", "app", "game", "store"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const isProductType = (x: unknown): x is ProductType => PRODUCT_TYPES.includes(x as ProductType);

export const PRODUCT_LABEL: Record<ProductType, string> = {
  website: "Website",
  app: "Mobile app",
  game: "Game (Roblox and more)",
  store: "Online store",
};

// Extra guidance for the simulated customers. These are general principles and ASSUMPTIONS,
// not measured results. website/app need none (their prompts already cover them).
const LENS: Partial<Record<ProductType, string>> = {
  game:
    "PRODUCT TYPE: a game (for example on Roblox or mobile). 'Onboarding' means the first session: loading, tutorial, first quests. " +
    "The 'paywall' means the shop or offer screen (game pass, premium, battle pass, in-game currency). " +
    "Prices may be real money or an in-game currency such as Robux: judge whether the value is clear for the price. " +
    "Most players are teens: many have no card of their own and need a parent, they compare with free games and with what their friends play, and they quit a boring or confusing start fast. " +
    "Never role-play anyone under 13. Pressure tactics aimed at young players (fake countdowns, hidden real prices, 'only now!') are a trust and policy risk, so recommend clear, fair offers and never manipulative ones.",
  store:
    "PRODUCT TYPE: an online store (for example a Shopify store selling clothing or other products). Judge it like a shopper: " +
    "is the product clear from the photos, price and size info; are shipping cost and delivery time easy to see before checkout; " +
    "are returns, contact details and reviews easy to find; does it feel trustworthy or like a throwaway shop; does it work well on a phone. " +
    "Extra costs that only show at checkout and slow or unclear delivery are common reasons shoppers leave. " +
    "Fake urgency (countdown timers, 'only 2 left') makes careful shoppers distrust a store, so never recommend it. " +
    "In this store test the 'pricing' page is a PRODUCT page and the 'signup' page is the CART (one item was added; nobody checks out or pays): lost_at pricing = left at the product page, signup = left at the cart.",
};

export function lensFor(t: unknown): string {
  return isProductType(t) ? (LENS[t] ?? "") : "";
}

// ---------- What the founder wants to learn (onboarding step 2) ----------
// Chosen from a FIXED list; only the ids travel to the server, and the prompt gets OUR sentence
// for each id (never user text), so this can't be used to inject instructions.
export const FOCUS = {
  buy: { label: "Would customers buy?", prompt: "whether people would actually buy or sign up, and the single biggest reason they wouldn't" },
  price: { label: "Is my price reasonable?", prompt: "the price: whether it feels fair for what they get, whether it is easy to find and understand, and any surprise costs" },
  value: { label: "Is the value clear?", prompt: "whether the page explains what it is, who it is for and why it is better, within the first few seconds" },
  blockers: { label: "What stops people converting?", prompt: "the exact moment and reason people would leave (missing information, trust, effort, the signup or cart)" },
  appeal: { label: "Is the product appealing?", prompt: "whether the product itself sounds desirable and different from what they use now" },
  general: { label: "General review", prompt: "a balanced first-visit review: clarity, trust, price and effort" },
} as const;
export type FocusId = keyof typeof FOCUS;
export const isFocusId = (x: unknown): x is FocusId => typeof x === "string" && Object.prototype.hasOwnProperty.call(FOCUS, x);
export const cleanFocus = (x: unknown): FocusId[] => [...new Set((Array.isArray(x) ? x : []).filter(isFocusId))].slice(0, 6);
export function focusLine(ids: unknown): string {
  const f = cleanFocus(ids);
  return f.length ? `The founder especially wants to learn about: ${f.map((id) => FOCUS[id].prompt).join("; ")}. Pay extra attention to these in your reasoning, but stay honest about everything else.` : "";
}
