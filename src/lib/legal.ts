// The facts the legal pages share (/terms, /privacy, /refunds). Change them HERE and every page,
// the footer and Stripe Checkout follow.
// These pages are a careful, plain-English DRAFT written for Crawler as it really works today
// (2026-11-27). They are not legal advice: a parent/guardian (the account owner for Stripe) should
// read them before launch, and a lawyer is worth it once there are real customers.
import { PUBLIC_DOMAIN, SITE_URL } from "@/lib/config";

export const LEGAL = {
  product: "Crawler",
  domain: PUBLIC_DOMAIN, // crawler.studio
  site: SITE_URL,
  // MUST be a real inbox someone reads before launch (create it with the domain's email provider).
  supportEmail: "support@crawler.studio",
  updated: "November 27, 2026",
  effective: "December 5, 2026",
  // Optional: the US state whose laws apply. Leave empty and the clause is left out.
  governingLaw: "",
  minAge: 13,
};

// The outside companies that help run Crawler, and what each one sees. Shown on /privacy.
// KEEP TRUE: add a row the day a new service starts receiving people's data.
export const PROCESSORS: { name: string; does: string; sees: string }[] = [
  { name: "Supabase", does: "Database, sign-in and file storage", sees: "Your account, tests, reports, uploads and screenshots" },
  { name: "Vercel", does: "Hosts the website", sees: "Requests to the site (like any web host: IP address, browser)" },
  { name: "Railway", does: "Runs the machine that visits pages and runs tests", sees: "The pages, screenshots and settings of the tests it runs" },
  { name: "Anthropic", does: "The AI that plays the simulated customers and writes reports", sees: "Page text, screenshots, video frames, your product details and questions you ask about a test" },
  { name: "Stripe", does: "Payments", sees: "Your card and billing details (Crawler never sees your full card number)" },
  { name: "Resend", does: "Sends emails (sign-in links, the waitlist launch email)", sees: "Your email address and the email we send" },
  { name: "Slack", does: "Private alerts to the founder (a new sign-up, a payment)", sees: "Plan and amount, with email addresses masked (j***@gmail.com)" },
  { name: "Google", does: "Website fonts, and the YouTube Data API if you look up a YouTube channel", sees: "Your IP address when fonts load; the channel you look up" },
  { name: "Apple, Google, GitHub", does: "Sign-in, only if you choose it", sees: "That you signed in to Crawler; we receive your name and email" },
];
