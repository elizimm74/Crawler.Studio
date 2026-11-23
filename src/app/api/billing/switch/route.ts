// POST /api/billing/switch { plan } -> move your monthly subscription to another plan right away.
// Signed-in only; uses YOUR active subscription (read with your own login, RLS) and Stripe checks
// it belongs to you. The webhook saves the new plan when Stripe confirms it.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { paidPlan, stripeEnabled, switchPlan } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!stripeEnabled()) return jsonError("Payments aren't switched on yet.", 503);
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const plan = paidPlan(body.plan);
  if (!plan) return jsonError("Pick a paid plan.");
  const { data: sub } = await auth.supabase
    .from("subscriptions")
    .select("id, status")
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return jsonError("You don't have an active plan to switch. Subscribe instead.", 404);
  try {
    await switchPlan(sub.id as string, plan, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[billing/switch]", msg);
    if (/card|payment|declined|insufficient/i.test(msg)) return jsonError("Your card was declined, so your plan didn't change. Update your card in Manage billing and try again.", 402);
    return jsonError("Couldn't switch your plan. Nothing was changed. Please try again.", 502);
  }
}
