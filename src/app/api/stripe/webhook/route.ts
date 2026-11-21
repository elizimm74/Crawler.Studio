// POST /api/stripe/webhook  (called by STRIPE, not by people)
// 1. Check the Stripe-Signature header with STRIPE_WEBHOOK_SECRET (otherwise: 400, nothing happens).
// 2. invoice.paid (new subscription or monthly renewal) -> add that month's tests (record_invoice).
//    The invoice id is unique, so if Stripe sends the same event twice, tests are only added once.
// 3. customer.subscription.created/updated/deleted -> mirror the status (sync_subscription):
//    active, past_due (payment failed, Stripe is retrying), canceled, "cancels at the end of the month".
// This is the ONE web route that uses the Supabase secret key, because only the server may add tests.
import { NextResponse } from "next/server";
import { readInvoicePaid, readSubscription, verifyStripeSignature } from "@/lib/stripe";
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

  const sub = readSubscription(event);
  if (sub) {
    const { error, data } = await supabaseAdmin().rpc("sync_subscription", {
      p_sub: sub.sub,
      p_user: sub.userId,
      p_customer: sub.customer,
      p_plan: sub.plan.id,
      p_status: sub.status,
      p_period_end: sub.periodEnd,
      p_cancel: sub.cancelling,
      p_event_at: sub.eventAt,
    });
    if (error) return retry("sync_subscription", error.message);
    console.log(JSON.stringify({ event: "subscription", sub: sub.sub, status: sub.status, cancelling: sub.cancelling, applied: data }));
    return NextResponse.json({ received: true });
  }

  const paid = readInvoicePaid(event);
  if (paid) {
    const { error, data } = await supabaseAdmin().rpc("record_invoice", {
      p_invoice: paid.invoice,
      p_user: paid.userId,
      p_plan: paid.plan.id,
      p_tests: paid.plan.tests,
      p_amount: paid.amountCents,
      p_currency: paid.currency,
    });
    if (error) return retry("record_invoice", error.message);
    console.log(JSON.stringify({ event: "invoice_paid", invoice: paid.invoice, plan: paid.plan.id, added: data }));
    return NextResponse.json({ received: true, added: data });
  }

  return NextResponse.json({ received: true, ignored: true }); // other events: nothing to do
}

// Stripe retries on 5xx (for up to 3 days), so a database hiccup doesn't lose a payment.
function retry(what: string, message: string) {
  console.error(`[stripe webhook] ${what} failed:`, message);
  return NextResponse.json({ error: "try again" }, { status: 500 });
}
