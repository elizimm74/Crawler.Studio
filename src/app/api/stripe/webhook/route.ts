// POST /api/stripe/webhook  (called by STRIPE, not by people)
// 1. Check the Stripe-Signature header with STRIPE_WEBHOOK_SECRET (otherwise: 400, nothing happens).
// 2. For a paid checkout, record the purchase and add the tests (record_purchase in migration 0008).
//    The session id is unique, so if Stripe sends the same event twice, tests are only added once.
// This is the ONE web route that uses the Supabase secret key, because only the server may add tests.
import { NextResponse } from "next/server";
import { readPaidCheckout, verifyStripeSignature } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const payload = await req.text(); // the RAW body: the signature is over these exact bytes
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const paid = readPaidCheckout(event);
  if (!paid) return NextResponse.json({ received: true, ignored: true }); // other events: nothing to do

  const { error, data } = await supabaseAdmin().rpc("record_purchase", {
    p_session: paid.session,
    p_user: paid.userId,
    p_plan: paid.plan.id,
    p_tests: paid.plan.tests,
    p_amount: paid.amountCents,
    p_currency: paid.currency,
  });
  if (error) {
    console.error("[stripe webhook] record_purchase failed:", error.message);
    return NextResponse.json({ error: "try again" }, { status: 500 }); // Stripe retries on 5xx
  }
  console.log(JSON.stringify({ event: "purchase", session: paid.session, plan: paid.plan.id, added: data }));
  return NextResponse.json({ received: true, added: data });
}
