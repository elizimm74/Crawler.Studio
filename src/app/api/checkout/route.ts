// POST /api/checkout -> { url }  (the Stripe Checkout page)
//   { planId: "starter" | "growth" | "pro" | "agency" }          a MONTHLY subscription (annual was removed)
//   { packId: "test100" | "test250" | "test500" | "test1000" }    pay per analysis (one-time)
// Signed-in only. Prices come from src/lib/plans.ts, never the browser.
// Launch discount: the SERVER decides (Black Friday window, or a verified waitlist email, via the
// launch_offer() database function). At most ONE discount, monthly billing only, first 3 months.
// Someone who already has a live plan is sent to "Manage billing" instead of a second subscription.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { createCheckout, createPackCheckout, createPortal, paidPlan, stripeEnabled } from "@/lib/stripe";
import { findPack, launchDiscount, type Interval } from "@/lib/plans";
import { SITE_URL } from "@/lib/config";

export async function POST(req: Request) {
  if (!stripeEnabled()) return jsonError("Payments aren't switched on yet.", 503);
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { planId?: string; packId?: string };
  const pack = findPack(body.packId);
  const plan = pack ? null : paidPlan(body.planId);
  if (!pack && !plan) return jsonError("Unknown plan.");
  const interval: Interval = "month"; // monthly only: annual billing was removed
  try {
    const { user, supabase } = auth;
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    const customer = (profile?.stripe_customer_id as string | null) ?? null;

    // Pay per analysis: always allowed, even with a subscription (it tops up Crawlers).
    if (pack) {
      const url = await createPackCheckout(pack, { id: user.id, email: user.email, customer }, SITE_URL);
      return NextResponse.json({ url });
    }

    const { data: live } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due", "incomplete"])
      .limit(1);
    if (live?.length && customer) {
      return NextResponse.json({ url: await createPortal(customer, SITE_URL), manage: true });
    }

    // The one launch discount this person qualifies for (0 = none).
    let onWaitlist = false;
    let waitlistSize = 0;
    {
      const { data: offer } = await supabase.rpc("launch_offer");
      const o = (offer ?? {}) as { on_waitlist?: boolean; waitlist_size?: number };
      onWaitlist = Boolean(o.on_waitlist);
      waitlistSize = Number(o.waitlist_size ?? 0);
    }
    const discountPercent = launchDiscount({ interval, onWaitlist, waitlistSize });

    const url = await createCheckout(plan!, { id: user.id, email: user.email, customer }, SITE_URL, { discountPercent });
    return NextResponse.json({ url, discountPercent });
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return jsonError("Couldn't open the payment page. Please try again.", 502);
  }
}
