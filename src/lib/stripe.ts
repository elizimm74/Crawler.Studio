// Stripe, without the Stripe package: a few calls to Stripe's API with plain fetch.
//   1. createCheckout(): a Stripe Checkout page that starts a MONTHLY subscription. The price
//      comes from src/lib/plans.ts on the server, never from the browser.
//   2. createPortal(): Stripe's "Manage billing" page (change card, see invoices, cancel).
//   3. verifyStripeSignature(): proves a webhook really came from Stripe (HMAC-SHA256 with the
//      webhook secret, and the timestamp must be fresh so an old message can't be replayed).
//   4. readSubscription(): pull what we need out of Stripe's subscription events, or null.
//      (Plans are customers per MONTH, counted in the database from the billing period, so a paid
//      invoice needs no separate handling: the subscription's status + period are enough.)
// Keys live only in environment variables (.env.local / Vercel): STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET. They never go to the browser and never into git.
import { createHmac, timingSafeEqual } from "crypto";
import { PLANS, type Plan } from "./plans";

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

export type PaidPlan = Plan & { id: "starter" | "growth" | "scale" };
export const paidPlan = (id: unknown): PaidPlan | null => {
  const p = PLANS.find((x) => x.id === id && x.priceUsd > 0);
  return (p as PaidPlan) ?? null;
};

const UUID = /^[0-9a-f-]{36}$/;

// The form Stripe expects (bracket names for nested fields). Pure, so the bench can check it.
// `customer`: the person's existing Stripe customer id, so all their invoices stay in one place.
export function checkoutForm(
  plan: PaidPlan,
  user: { id: string; email?: string | null; customer?: string | null },
  siteUrl: string,
): URLSearchParams {
  const f = new URLSearchParams();
  f.set("mode", "subscription");
  f.set("success_url", `${siteUrl}/dashboard?paid=${plan.id}`);
  f.set("cancel_url", `${siteUrl}/pricing?cancelled=1`);
  f.set("client_reference_id", user.id);
  if (user.customer) f.set("customer", user.customer);
  else if (user.email && !user.email.endsWith("privaterelay.appleid.com")) f.set("customer_email", user.email);
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "usd");
  f.set("line_items[0][price_data][unit_amount]", String(Math.round(plan.priceUsd * 100)));
  f.set("line_items[0][price_data][recurring][interval]", "month");
  f.set("line_items[0][price_data][product_data][name]", `Crawler ${plan.name} (${plan.customers.toLocaleString("en-US")} simulated customers a month)`);
  // The webhook reads WHO and WHICH PLAN from the subscription's metadata (set here, by our server).
  f.set("metadata[user_id]", user.id);
  f.set("metadata[plan_id]", plan.id);
  f.set("subscription_data[metadata][user_id]", user.id);
  f.set("subscription_data[metadata][plan_id]", plan.id);
  f.set("subscription_data[description]", "Simulated customers, buying intent. Cancel any time.");
  f.set("allow_promotion_codes", "true");
  return f;
}

async function stripe<T>(path: string, form?: URLSearchParams, method = "POST"): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : form,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data;
}

export async function createCheckout(plan: PaidPlan, user: { id: string; email?: string | null; customer?: string | null }, siteUrl: string): Promise<string> {
  const data = await stripe<{ url?: string }>("checkout/sessions", checkoutForm(plan, user, siteUrl));
  if (!data.url) throw new Error("Stripe gave no checkout URL");
  return data.url;
}

// Stripe's customer portal needs a "configuration". Use the account's existing one; if there is none
// (a brand-new account or sandbox), create one: update card, see invoices, cancel at the end of the
// month. Switching plans is OFF (our prices aren't saved Stripe products); people cancel and re-subscribe.
export function portalConfigForm(): URLSearchParams {
  const f = new URLSearchParams();
  f.set("business_profile[headline]", "Crawler: manage your plan");
  f.set("features[invoice_history][enabled]", "true");
  f.set("features[payment_method_update][enabled]", "true");
  f.set("features[customer_update][enabled]", "true");
  f.set("features[customer_update][allowed_updates][0]", "email");
  f.set("features[customer_update][allowed_updates][1]", "address");
  f.set("features[subscription_cancel][enabled]", "true");
  f.set("features[subscription_cancel][mode]", "at_period_end");
  f.set("features[subscription_cancel][cancellation_reason][enabled]", "true");
  ["too_expensive", "unused", "missing_features", "low_quality", "other"].forEach((r, i) =>
    f.set(`features[subscription_cancel][cancellation_reason][options][${i}]`, r),
  );
  f.set("features[subscription_update][enabled]", "false");
  return f;
}

export async function createPortal(customer: string, siteUrl: string): Promise<string> {
  const list = await stripe<{ data?: { id: string }[] }>("billing_portal/configurations?active=true&limit=1", undefined, "GET");
  const config = list.data?.[0]?.id ?? (await stripe<{ id: string }>("billing_portal/configurations", portalConfigForm())).id;
  const f = new URLSearchParams({ customer, return_url: `${siteUrl}/dashboard`, configuration: config });
  const data = await stripe<{ url?: string }>("billing_portal/sessions", f);
  if (!data.url) throw new Error("Stripe gave no billing URL");
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

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" ? (x as Obj) : {});
const str = (x: unknown) => (typeof x === "string" ? x : typeof obj(x).id === "string" ? (obj(x).id as string) : "");

// customer.subscription.created / .updated / .deleted -> mirror the status in our database.
// Plans the webhook may record: today's three, plus the two from the first sandbox build.
const SUB_PLANS = ["starter", "growth", "scale", "launch", "studio"];
export type SubState = {
  sub: string; userId: string; customer: string; plan: string;
  status: string; periodStart: string | null; periodEnd: string | null; cancelling: boolean; eventAt: string;
};
const SUB_EVENTS = ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];
export function readSubscription(event: unknown): SubState | null {
  const e = obj(event);
  if (!SUB_EVENTS.includes(String(e.type))) return null;
  const s = obj(obj(e.data).object);
  const meta = obj(s.metadata);
  const plan = String(meta.plan_id ?? "");
  const userId = String(meta.user_id ?? "");
  const customer = str(s.customer);
  if (!SUB_PLANS.includes(plan) || !UUID.test(userId) || typeof s.id !== "string" || !customer) return null;
  // The period end moved from the subscription onto its items in newer API versions.
  const item = obj(((obj(s.items).data as unknown[]) ?? [])[0]);
  const end = Number(s.current_period_end ?? item.current_period_end);
  const start = Number(s.current_period_start ?? item.current_period_start);
  const iso = (sec: number) => (Number.isFinite(sec) && sec > 0 ? new Date(sec * 1000).toISOString() : null);
  const created = Number(e.created);
  return {
    sub: s.id,
    userId,
    customer,
    plan,
    status: e.type === "customer.subscription.deleted" ? "canceled" : String(s.status ?? "incomplete"),
    periodStart: iso(start),
    periodEnd: iso(end),
    cancelling: Boolean(s.cancel_at_period_end) || Boolean(s.cancel_at),
    eventAt: new Date((Number.isFinite(created) && created > 0 ? created : Date.now() / 1000) * 1000).toISOString(),
  };
}

// invoice.paid -> one real payment (the first month or a renewal), for revenue tracking.
// Who + which plan come from OUR metadata on the subscription; Stripe has moved where an invoice
// keeps it between API versions, so look in each place (newest first).
export type Payment = { invoice: string; userId: string; plan: string; amountCents: number; currency: string; paidAt: string };
export function readPayment(event: unknown): Payment | null {
  const e = obj(event);
  if (e.type !== "invoice.paid") return null;
  const inv = obj(obj(e.data).object);
  if (inv.status !== "paid" || typeof inv.id !== "string") return null;
  const line = obj(((obj(inv.lines).data as unknown[]) ?? [])[0]);
  let meta: Obj = {};
  for (const m of [obj(obj(inv.parent).subscription_details).metadata, obj(inv.subscription_details).metadata, line.metadata]) {
    if (obj(m).user_id && obj(m).plan_id) {
      meta = obj(m);
      break;
    }
  }
  const plan = String(meta.plan_id ?? "");
  const userId = String(meta.user_id ?? "");
  const amount = Number(inv.amount_paid);
  if (!SUB_PLANS.includes(plan) || !UUID.test(userId) || !Number.isFinite(amount) || amount < 0) return null;
  const paid = Number(obj(inv.status_transitions).paid_at ?? e.created);
  return {
    invoice: inv.id,
    userId,
    plan,
    amountCents: Math.round(amount),
    currency: String(inv.currency ?? "usd"),
    paidAt: new Date((Number.isFinite(paid) && paid > 0 ? paid : Date.now() / 1000) * 1000).toISOString(),
  };
}
