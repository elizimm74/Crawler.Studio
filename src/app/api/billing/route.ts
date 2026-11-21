// POST /api/billing -> { url }  ("Manage billing": Stripe's own page to change card, see invoices, cancel)
// Signed-in only, and only for people who have paid before (they have a Stripe customer id).
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { createPortal, stripeEnabled } from "@/lib/stripe";
import { SITE_URL } from "@/lib/config";

export async function POST() {
  if (!stripeEnabled()) return jsonError("Payments aren't switched on yet.", 503);
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { data: profile } = await auth.supabase.from("profiles").select("stripe_customer_id").eq("id", auth.user.id).maybeSingle();
  const customer = profile?.stripe_customer_id as string | null;
  if (!customer) return jsonError("You don't have a paid plan yet.", 404);
  try {
    return NextResponse.json({ url: await createPortal(customer, SITE_URL) });
  } catch (err) {
    console.error("[billing]", (err as Error).message);
    return jsonError("Couldn't open billing. Please try again.", 502);
  }
}
