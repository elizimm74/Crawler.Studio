// Stripe, without the Stripe package: two small calls to Stripe's API with plain fetch.
//   1. createCheckout(): makes a Stripe Checkout page for one pack. The PRICE comes from
//      src/lib/plans.ts on the server, never from the browser.
//   2. verifyStripeSignature(): proves a webhook really came from Stripe (HMAC-SHA256 with the
//      webhook secret, and the timestamp must be fresh so an old message can't be replayed).
// Keys live only in environment variables (.env.local / Vercel): STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET. They never go to the browser and never into git.
import { createHmac, timingSafeEqual } from "crypto";
import { PLANS, type Plan } from "./plans";

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

export type PaidPlan = Plan & { id: "launch" | "studio" };
export const paidPlan = (id: unknown): PaidPlan | null => {
  const p = PLANS.find((x) => x.id === id && x.priceUsd > 0);
  return (p as PaidPlan) ?? null;
};

// The form Stripe expects (bracket names for nested fields). Pure, so the bench can check it.
export function checkoutForm(plan: PaidPlan, user: { id: string; email?: string | null }, siteUrl: string): URLSearchParams {
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", `${siteUrl}/dashboard?paid=${plan.id}`);
  f.set("cancel_url", `${siteUrl}/pricing?cancelled=1`);
  f.set("client_reference_id", user.id);
  if (user.email && !user.email.endsWith("privaterelay.appleid.com")) f.set("customer_email", user.email);
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "usd");
  f.set("line_items[0][price_data][unit_amount]", String(Math.round(plan.priceUsd * 100)));
  f.set("line_items[0][price_data][product_data][name]", `Crawler ${plan.name} (${plan.tests} tests)`);
  f.set("line_items[0][price_data][product_data][description]", "One-time purchase. Tests never expire. Simulated customers, buying intent.");
  f.set("metadata[user_id]", user.id);
  f.set("metadata[plan_id]", plan.id);
  f.set("allow_promotion_codes", "true");
  return f;
}

export async function createCheckout(plan: PaidPlan, user: { id: string; email?: string | null }, siteUrl: string): Promise<string> {
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: checkoutForm(plan, user, siteUrl),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data.url;
}

// Stripe-Signature looks like: "t=1700000000,v1=abc...,v1=def..."
export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!Number.isFinite(t) || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  return sigs.some((s) => {
    const b = Buffer.from(s, "hex");
    return b.length === a.length && timingSafeEqual(a, b);
  });
}

// What a "checkout finished" event must contain before we add tests. Returns null if anything's off.
export type PaidCheckout = { session: string; userId: string; plan: PaidPlan; amountCents: number; currency: string };
export function readPaidCheckout(event: unknown): PaidCheckout | null {
  const e = event as { type?: string; data?: { object?: Record<string, unknown> } };
  if (e?.type !== "checkout.session.completed" && e?.type !== "checkout.session.async_payment_succeeded") return null;
  const s = e.data?.object ?? {};
  const meta = (s.metadata ?? {}) as Record<string, string>;
  const plan = paidPlan(meta.plan_id);
  const amount = Number(s.amount_total);
  if (s.payment_status !== "paid" || !plan || typeof s.id !== "string") return null;
  if (!/^[0-9a-f-]{36}$/.test(meta.user_id ?? "")) return null;
  // The amount paid must match the server's price (discount codes can lower it, never raise the tests).
  if (!Number.isFinite(amount) || amount < 0 || amount > plan.priceUsd * 100) return null;
  return { session: s.id, userId: meta.user_id, plan, amountCents: amount, currency: String(s.currency ?? "usd") };
}
