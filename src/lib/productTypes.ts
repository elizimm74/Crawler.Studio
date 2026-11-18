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
    "Fake urgency (countdown timers, 'only 2 left') makes careful shoppers distrust a store, so never recommend it.",
};

export function lensFor(t: unknown): string {
  return isProductType(t) ? (LENS[t] ?? "") : "";
}
