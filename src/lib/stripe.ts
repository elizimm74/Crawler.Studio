// Stripe, without the Stripe package: a few calls to Stripe's API with plain fetch.
//   1. createCheckout(): a Stripe Checkout page that starts a MONTHLY subscription, or
//      createPackCheckout(): a ONE-TIME payment for one analysis (pay per analysis). Prices come from
//      src/lib/plans.ts on the server, never from the browser. A launch discount (launch week or
//      waitlist) is decided on the server too, and only one is ever applied.
//   2. createPortal(): Stripe's "Manage billing" page (change card, see invoices, cancel).
//   3. verifyStripeSignature(): proves a webhook really came from Stripe (HMAC-SHA256 with the
//      webhook secret, and the timestamp must be fresh so an old message can't be replayed).
//   4. readSubscription(): pull what we need out of Stripe's subscription events, or null.
//      (Plans are customers per MONTH, counted in the database from the billing period, so a paid
//      invoice needs no separate handling: the subscription's status + period are enough.)
// Keys live only in environment variables (.env.local / Vercel): STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET. They never go to the browser and never into git.
import { createHmac, timingSafeEqual } from "crypto";
import { PLANS, PROMO_MONTHS, type Interval, type Pack, type PaidPlanId, type Plan } from "./plans";

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

export type PaidPlan = Plan & { id: PaidPlanId };
export const paidPlan = (id: unknown): PaidPlan | null => {
  const p = PLANS.find((x) => x.id === id && x.priceUsd > 0);
  return (p as PaidPlan) ?? null;
};

const UUID = /^[0-9a-f-]{36}$/;

// The form Stripe expects (bracket names for nested fields). Pure, so the bench can check it.
// `customer`: the person's existing Stripe customer id, so all their invoices stay in one place.
// Always MONTHLY (annual billing was removed 2026-11-26). `coupon`: a launch-discount coupon id (see ensureCoupon).
const crawlers = (x: number) => x.toLocaleString("en-US");
export const planProductName = (plan: Plan) => `Crawler ${plan.name} (${crawlers(plan.customers)} Crawlers a month)`;
export function checkoutForm(
  plan: PaidPlan,
  user: { id: string; email?: string | null; customer?: string | null },
  siteUrl: string,
  opts: { coupon?: string | null } = {},
): URLSearchParams {
  const interval: Interval = "month";
  const f = new URLSearchParams();
  f.set("mode", "subscription");
  f.set("success_url", `${siteUrl}/dashboard?paid=${plan.id}`);
  f.set("cancel_url", `${siteUrl}/pricing?cancelled=1`);
  f.set("client_reference_id", user.id);
  if (user.customer) f.set("customer", user.customer);
  else if (user.email && !user.email.endsWith("privaterelay.appleid.com")) f.set("customer_email", user.email);
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "usd");
  const cents = Math.round(plan.priceUsd * 100);
  f.set("line_items[0][price_data][unit_amount]", String(cents));
  f.set("line_items[0][price_data][recurring][interval]", interval);
  f.set("line_items[0][price_data][product_data][name]", planProductName(plan));
  // Shown under the plan name on Stripe's checkout page.
  f.set(
    "line_items[0][price_data][product_data][description]",
    `1 Crawler = 1 simulated customer. Test your website${plan.ads ? " and your ads" : ""} before launch. ${crawlers(plan.customers)} Crawlers reset every month.`,
  );
  // Shown above the Subscribe button (honest renewal note).
  f.set(
    "custom_text[submit][message]",
    `Crawler renews every month until you cancel. Cancel any time from Manage billing on your dashboard. Simulated customers show buying intent, not real purchases. By subscribing you agree to the [Terms](${siteUrl}/terms) and [Refund Policy](${siteUrl}/refunds).`,
  );
  // The webhook reads WHO and WHICH PLAN from the subscription's metadata (set here, by our server).
  f.set("metadata[user_id]", user.id);
  f.set("metadata[plan_id]", plan.id);
  f.set("metadata[interval]", interval);
  f.set("subscription_data[metadata][user_id]", user.id);
  f.set("subscription_data[metadata][plan_id]", plan.id);
  f.set("subscription_data[metadata][interval]", interval);
  f.set("subscription_data[description]", "Simulated customers, buying intent. Cancel any time.");
  // ONE discount at most: our launch coupon if they qualify, otherwise they may type a promo code.
  // (Stripe doesn't allow both at once, which is also how we keep discounts from stacking.)
  if (opts.coupon) f.set("discounts[0][coupon]", opts.coupon);
  else f.set("allow_promotion_codes", "true");
  return f;
}

// A ONE-TIME payment for ONE analysis (pay per analysis, no subscription). The webhook adds that
// many Crawlers to the balance, and the next test uses them.
export const packProductName = (pack: Pack) => `Crawler analysis: up to ${crawlers(pack.crawlers)} simulated customers`;
export function packCheckoutForm(pack: Pack, user: { id: string; email?: string | null; customer?: string | null }, siteUrl: string): URLSearchParams {
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", `${siteUrl}/dashboard?pack=${pack.id}`);
  f.set("cancel_url", `${siteUrl}/pricing?cancelled=1`);
  f.set("client_reference_id", user.id);
  if (user.customer) f.set("customer", user.customer);
  else {
    f.set("customer_creation", "always"); // so receipts and later purchases stay together
    if (user.email && !user.email.endsWith("privaterelay.appleid.com")) f.set("customer_email", user.email);
  }
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "usd");
  f.set("line_items[0][price_data][unit_amount]", String(Math.round(pack.priceUsd * 100)));
  f.set("line_items[0][price_data][product_data][name]", packProductName(pack));
  f.set(
    "line_items[0][price_data][product_data][description]",
    "One analysis, paid once. 1 Crawler = 1 simulated customer. For website, store and app tests (Ad Analysis needs a Growth plan). Doesn't expire, and a test that fails on our side gives the Crawlers back.",
  );
  f.set(
    "custom_text[submit][message]",
    `One-time payment, nothing renews. Simulated customers show buying intent, not real purchases. By paying you agree to the [Terms](${siteUrl}/terms) and [Refund Policy](${siteUrl}/refunds).`,
  );
  f.set("metadata[kind]", "pack");
  f.set("metadata[pack_id]", pack.id);
  f.set("metadata[user_id]", user.id);
  f.set("payment_intent_data[metadata][pack_id]", pack.id);
  f.set("payment_intent_data[metadata][user_id]", user.id);
  return f;
}

// The launch coupon for a discount %: X% off the first PROMO_MONTHS monthly invoices.
// One coupon per percentage, created once in Stripe and then reused (its id never changes).
export const couponId = (percent: number) => `crawler-launch-${percent}-${PROMO_MONTHS}m`;
export function couponForm(percent: number): URLSearchParams {
  const f = new URLSearchParams();
  f.set("id", couponId(percent));
  f.set("percent_off", String(percent));
  f.set("duration", "repeating");
  f.set("duration_in_months", String(PROMO_MONTHS));
  f.set("name", `Launch offer: ${percent}% off your first ${PROMO_MONTHS} months`);
  return f;
}

async function stripe<T>(path: string, form?: URLSearchParams, method = "POST", idempotencyKey?: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // the same key twice = Stripe does it once (no double charges on a double click or retry)
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "GET" ? undefined : form,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data;
}

export async function createCheckout(
  plan: PaidPlan,
  user: { id: string; email?: string | null; customer?: string | null },
  siteUrl: string,
  opts: { discountPercent?: number } = {},
): Promise<string> {
  const coupon = opts.discountPercent && opts.discountPercent > 0 ? await ensureCoupon(opts.discountPercent) : null;
  const data = await stripe<{ url?: string }>("checkout/sessions", checkoutForm(plan, user, siteUrl, { coupon }));
  if (!data.url) throw new Error("Stripe gave no checkout URL");
  return data.url;
}

export async function createPackCheckout(pack: Pack, user: { id: string; email?: string | null; customer?: string | null }, siteUrl: string): Promise<string> {
  const data = await stripe<{ url?: string }>("checkout/sessions", packCheckoutForm(pack, user, siteUrl));
  if (!data.url) throw new Error("Stripe gave no checkout URL");
  return data.url;
}

// Make sure the launch coupon exists in Stripe (create it the first time), and return its id.
async function ensureCoupon(percent: number): Promise<string> {
  const id = couponId(percent);
  try {
    await stripe(`coupons/${encodeURIComponent(id)}`, undefined, "GET");
  } catch {
    try {
      await stripe("coupons", couponForm(percent), "POST", `coupon-${id}`);
    } catch (err) {
      // created by a parallel checkout a moment ago: fine
      if (!/already exists/i.test((err as Error).message)) throw err;
    }
  }
  return id;
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
// Plans the webhook may record: today's four, plus older ones (scale, and the first sandbox build's two).
const SUB_PLANS = ["starter", "growth", "pro", "agency", "scale", "launch", "studio"];
export type SubState = {
  sub: string; userId: string; customer: string; plan: string; interval: Interval;
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
  const recurring = String(obj(obj(item.price).recurring).interval ?? obj(obj(item.plan)).interval ?? meta.interval ?? "month");
  return {
    sub: s.id,
    userId,
    customer,
    plan,
    interval: recurring === "year" ? "year" : "month",
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


// checkout.session.completed for a Crawler PACK -> add the Crawlers (record_pack, once per session).
// Only a PAID one-time session with OUR metadata, a known pack and an amount no higher than its price.
export type PackPaid = { session: string; userId: string; pack: string; amountCents: number; currency: string; customer: string | null };
export function readPackCheckout(event: unknown, packs: Pack[]): PackPaid | null {
  const e = obj(event);
  if (e.type !== "checkout.session.completed" && e.type !== "checkout.session.async_payment_succeeded") return null;
  const s = obj(obj(e.data).object);
  const meta = obj(s.metadata);
  if (s.mode !== "payment" || s.payment_status !== "paid" || meta.kind !== "pack") return null;
  const pack = packs.find((p) => p.id === meta.pack_id);
  const userId = String(meta.user_id ?? "");
  const amount = Number(s.amount_total);
  if (!pack || !UUID.test(userId) || typeof s.id !== "string" || !s.id.startsWith("cs_")) return null;
  if (!Number.isFinite(amount) || amount < 0 || amount > Math.round(pack.priceUsd * 100)) return null;
  return { session: s.id, userId, pack: pack.id, amountCents: Math.round(amount), currency: String(s.currency ?? "usd"), customer: str(s.customer) || null };
}

// ---------- Switching plans (upgrade / downgrade) ----------
// Upgrades charge the difference for the rest of the month NOW (and fail if the card fails, so nobody
// gets a bigger plan without paying). Downgrades take effect now and the unused part becomes a credit
// on the next invoice. The webhook then saves the new plan (customer.subscription.updated).
// Switching always lands on MONTHLY billing (annual was removed; an old annual sandbox plan becomes monthly).
export function switchForm(plan: PaidPlan, from: PaidPlan, userId: string, itemId: string, productId: string): URLSearchParams {
  const interval: Interval = "month";
  const up = plan.priceUsd > from.priceUsd;
  const f = new URLSearchParams();
  f.set("items[0][id]", itemId);
  f.set("items[0][price_data][currency]", "usd");
  f.set("items[0][price_data][product]", productId);
  f.set("items[0][price_data][unit_amount]", String(Math.round(plan.priceUsd * 100)));
  f.set("items[0][price_data][recurring][interval]", interval);
  f.set("metadata[user_id]", userId);
  f.set("metadata[plan_id]", plan.id);
  f.set("metadata[interval]", interval);
  f.set("proration_behavior", up ? "always_invoice" : "create_prorations");
  if (up) f.set("payment_behavior", "error_if_incomplete");
  f.set("cancel_at_period_end", "false"); // switching means they're staying
  return f;
}

type StripeSub = { id: string; status: string; metadata?: Record<string, string>; items?: { data?: { id: string; price?: { recurring?: { interval?: string } } }[] } };

export async function switchPlan(subId: string, plan: PaidPlan, userId: string): Promise<void> {
  const sub = await stripe<StripeSub>(`subscriptions/${encodeURIComponent(subId)}`, undefined, "GET");
  if (sub.metadata?.user_id !== userId) throw new Error("subscription does not belong to this user"); // never touch someone else's
  if (!["active", "trialing"].includes(sub.status)) throw new Error(`subscription is ${sub.status}`);
  const from = paidPlan(sub.metadata?.plan_id);
  if (!from) throw new Error("unknown current plan");
  if (from.id === plan.id) return;
  const item = sub.items?.data?.[0]?.id;
  if (!item) throw new Error("subscription has no item");
  // a product named after the NEW plan, so invoices say what they're paying for
  const product = await stripe<{ id: string }>(
    "products",
    new URLSearchParams({ name: planProductName(plan) }),
    "POST",
    `product-${subId}-${plan.id}`,
  );
  await stripe(`subscriptions/${encodeURIComponent(subId)}`, switchForm(plan, from, userId, item, product.id), "POST", `switch-${subId}-${plan.id}-${Math.floor(Date.now() / 60_000)}`);
}
