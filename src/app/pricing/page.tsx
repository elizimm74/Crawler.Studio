// /pricing: the plans from src/lib/plans.ts. Monthly plans measured in simulated customers, cancel any time.
// Paid plans open Stripe Checkout (BuyButton -> /api/checkout). Signed-out visitors sign up first.
// Without the Stripe keys in the environment, they say "Coming soon".
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { PLANS, allowanceLabel, per100Label, planName, priceLabel } from "@/lib/plans";
import ManageBilling from "@/components/ManageBilling";
import { supabaseServer } from "@/lib/supabase/server";
import { stripeEnabled } from "@/lib/stripe";
import BuyButton from "@/components/BuyButton";
import { Compare } from "@/components/landing/Sections";

export const metadata = { title: "Pricing", description: "Crawler pricing: start free with 1 test of 25 simulated customers. Monthly plans from $25 for 1,000 simulated customers.", alternates: { canonical: "/pricing" } };

export default async function Pricing({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  const user = await currentUser();
  const payments = stripeEnabled();
  const signedIn = Boolean(user) || !AUTH_ENABLED;
  // Already paying? Show "Manage billing" instead of a second Subscribe button.
  let current: string | null = null;
  let billing = false;
  if (user && AUTH_ENABLED) {
    const { data } = await (await supabaseServer()).rpc("my_plan");
    const sub = (data as { subscription?: { plan: string; status: string } | null; billing?: boolean } | null) ?? null;
    billing = Boolean(sub?.billing);
    if (sub?.subscription && ["active", "trialing", "past_due"].includes(sub.subscription.status)) current = sub.subscription.plan;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="t-label">pricing</p>
      <h1 className="t-h1 mt-4">Pay for the crowd you need.</h1>
      <p className="t-lead mt-4 max-w-xl">
        Every plan gives you simulated customers each month. A test uses as many as it simulates: 100 for a quick read,
        up to 1,000 for a big launch. Cancel any time.
      </p>

      {cancelled && (
        <p role="status" className="card mt-8 p-4 text-sm">
          Checkout cancelled. Nothing was charged.
        </p>
      )}
      {billing && (
        <p className="card mt-8 flex flex-wrap items-center gap-3 p-4 text-sm">
          {current ? `You're on ${planName(current)}.` : "You've paid before."} Change your card, see invoices or cancel:
          <ManageBilling className="btn btn-secondary h-9 px-4 text-sm" />
        </p>
      )}

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const free = p.priceUsd === 0;
          return (
            <div key={p.id} className={`card flex flex-col p-6 ${p.id === "starter" ? "border-fg" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                {p.id === "starter" && <span className="pill pill-buy">one launch a month</span>}
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="t-number text-5xl">{priceLabel(p)}</span>
                <span className="text-faint">{free ? "" : "/ month"}</span>
              </p>
              <p className="mt-1 text-sm text-faint">{allowanceLabel(p)}</p>
              {!free && <p className="text-xs text-faint">{per100Label(p)}</p>}
              <p className="mt-4 text-sm text-muted">{p.note}</p>
              <ul className="mt-6 flex-1 space-y-2 border-t border-line pt-6 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              {free ? (
                <Link href={signedIn ? "/app" : "/signup"} className="btn btn-secondary mt-8 w-full">
                  Start free
                </Link>
              ) : !payments ? (
                <span className="btn btn-ghost mt-8 w-full cursor-default text-faint" aria-disabled>
                  Coming soon
                </span>
              ) : current === p.id ? (
                <span className="btn btn-ghost mt-8 w-full cursor-default" aria-disabled>
                  Your plan
                </span>
              ) : current ? (
                <ManageBilling className="btn btn-secondary mt-8 w-full" label="Cancel, then switch" />
              ) : user || !AUTH_ENABLED ? (
                <BuyButton planId={p.id as "starter" | "growth" | "scale"} label={`Subscribe · ${priceLabel(p)}/month`} primary={p.id === "starter"} />
              ) : (
                <Link href="/signup?next=/pricing" className={`btn mt-8 w-full ${p.id === "starter" ? "btn-primary" : "btn-secondary"}`}>
                  Sign up to subscribe
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-renewal disclosure (clear terms BEFORE paying, easy cancel: required by auto-renewal laws). */}
      <p className="mt-8 max-w-2xl text-sm text-muted">
        Paid plans renew automatically every month at the price shown until you cancel. Cancel any time from Manage billing
        on your dashboard: you keep the plan until the end of the month you paid for. Each month&apos;s simulated customers
        reset when the plan renews (unused ones don&apos;t carry over). A test that fails on our side doesn&apos;t count.
      </p>
      <p className="t-label mt-6">
        every test: simulated customers · buying intent, not real purchases · secure checkout by Stripe
      </p>

      {/* Crawler's own simulated customers asked for this: how it compares with panels and A/B tests */}
      <div className="mt-24">
        <Compare />
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 shrink-0 text-faint" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
