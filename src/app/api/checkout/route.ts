// POST /api/checkout { planId: "launch" | "studio" } -> { url }  (the Stripe Checkout page)
// Signed-in only. Starts a MONTHLY subscription. The price and tests come from src/lib/plans.ts,
// never the browser. Someone who already has a live plan is sent to "Manage billing" instead
// (so nobody gets charged twice by accident).
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { createCheckout, createPortal, paidPlan, stripeEnabled } from "@/lib/stripe";
import { SITE_URL } from "@/lib/config";

export async function POST(req: Request) {
  if (!stripeEnabled()) return jsonError("Payments aren't switched on yet.", 503);
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { planId?: string };
  const plan = paidPlan(body.planId);
  if (!plan) return jsonError("Unknown plan.");
  try {
    const { user, supabase } = auth;
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    const customer = (profile?.stripe_customer_id as string | null) ?? null;
    const { data: live } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due", "incomplete"])
      .limit(1);
    if (live?.length && customer) {
      return NextResponse.json({ url: await createPortal(customer, SITE_URL), manage: true });
    }
    const url = await createCheckout(plan, { id: user.id, email: user.email, customer }, SITE_URL);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return jsonError("Couldn't open the payment page. Please try again.", 502);
  }
}
