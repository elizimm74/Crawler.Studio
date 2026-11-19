// POST /api/checkout { planId: "launch" | "studio" } -> { url }  (the Stripe Checkout page)
// Signed-in only. The price and number of tests come from src/lib/plans.ts, never the browser.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { createCheckout, paidPlan, stripeEnabled } from "@/lib/stripe";
import { SITE_URL } from "@/lib/config";

export async function POST(req: Request) {
  if (!stripeEnabled()) return jsonError("Payments aren't switched on yet.", 503);
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { planId?: string };
  const plan = paidPlan(body.planId);
  if (!plan) return jsonError("Unknown pack.");
  try {
    const { data } = await auth.supabase.auth.getUser();
    const url = await createCheckout(plan, { id: data.user!.id, email: data.user!.email }, SITE_URL);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return jsonError("Couldn't open the payment page. Please try again.", 502);
  }
}
