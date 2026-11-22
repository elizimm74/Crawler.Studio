// The product name. Change it here and it updates everywhere.
export const APP_NAME = "Crawler";

// Where the site lives (share links, social images, Stripe's return pages, sign-in emails).
// NEXT_PUBLIC_SITE_URL wins if set; otherwise the real domain in production, your computer in dev.
export const PUBLIC_DOMAIN = "https://crawler.studio";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "production" ? PUBLIC_DOMAIN : "http://localhost:3000")
).replace(/\/$/, "");
