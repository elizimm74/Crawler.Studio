// A first GUESS at what kind of site this is, from its address and the start of its HTML.
// Pure and cheap (no AI). Onboarding shows it pre-selected and the founder can change it.
// Each category maps to one of the engine's real test types (website / store / app).

export const CATEGORIES = {
  ecommerce: { label: "Online store", engine: "store" },
  clothing: { label: "Clothing brand", engine: "store" },
  saas: { label: "SaaS / web app", engine: "website" },
  app: { label: "Mobile app", engine: "app" },
  agency: { label: "Agency / service", engine: "website" },
  landing: { label: "Landing page", engine: "website" },
  other: { label: "Other", engine: "website" },
} as const;
export type Category = keyof typeof CATEGORIES;
export const isCategory = (x: unknown): x is Category => typeof x === "string" && Object.prototype.hasOwnProperty.call(CATEGORIES, x);

const has = (text: string, words: RegExp) => words.test(text);

export function guessCategory(url: string, html = ""): Category {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  const h = html.slice(0, 200_000).toLowerCase();
  if (/(^|\.)apps\.apple\.com$|(^|\.)play\.google\.com$/.test(host)) return "app";
  const shop =
    host.endsWith(".myshopify.com") ||
    has(h, /cdn\.shopify\.com|shopify\.theme|woocommerce|bigcommerce|squarespace-commerce|"@type"\s*:\s*"product"|add to cart|add to bag/);
  if (shop) {
    return has(h, /\b(hoodie|t-shirt|tee|streetwear|apparel|clothing|dress|jeans|sneaker|jacket|sweatshirt|joggers)\b/) ? "clothing" : "ecommerce";
  }
  if (has(h, /apps\.apple\.com\/[a-z/]*app|play\.google\.com\/store\/apps|download on the app store|get it on google play/) && !has(h, /pricing|sign up free|start free trial/)) return "app";
  if (has(h, /\b(free trial|pricing|per month|\/mo\b|sign up free|get started free|dashboard|integrations|api)\b/)) return "saas";
  if (has(h, /\b(agency|our clients|case studies|book a call|our services|we help brands)\b/)) return "agency";
  if (has(h, /\b(join the waitlist|waitlist|coming soon|early access)\b/)) return "landing";
  return "other";
}
