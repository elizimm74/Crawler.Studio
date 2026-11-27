"use client";
// THE FIVE PLANS in one section (MONTHLY only: annual billing was removed 2026-11-26), with a clear upgrade path:
// Free trial -> Starter (your website) -> Growth (+ your ads) -> Pro (your whole funnel) -> Agency (every client).
// Every number comes from src/lib/plans.ts. Features that aren't built yet carry a "Soon" tag, so
// nobody pays for something that doesn't exist yet.
// The buttons: free -> start a test; paid -> Stripe Checkout (BuyButton), or for people who already
// pay: switch plan / manage billing. Without Stripe keys, paid buttons say "Coming soon".
import Link from "next/link";
import BuyButton from "@/components/BuyButton";
import SwitchPlanButton from "@/components/SwitchPlanButton";
import ManageBilling from "@/components/ManageBilling";
import { PLANS, PROMO_MONTHS, discounted, per100Label, type PaidPlanId } from "@/lib/plans";

type Props = {
  signedIn: boolean; // signed in, or accounts are switched off (local dev)
  payments: boolean; // Stripe keys are set
  current: string | null; // their live plan id, if they pay
  offerPercent: number; // the launch discount THIS visitor would get on a monthly plan (0 = none)
};

const n = (x: number) => x.toLocaleString("en-US");
const PATH = ["Try it", "Your website", "+ Your ads", "Your whole funnel", "Every client"];

export default function PricingPlans({ signedIn, payments, current, offerPercent }: Props) {
  const currentPlan = PLANS.find((p) => p.id === current && p.priceUsd > 0);

  return (
    <div>
      {/* the upgrade path, lined up with the cards (big screens) */}
      <ol className="price-path mt-2 hidden xl:grid" aria-label="Upgrade path">
        {PATH.map((step, k) => (
          <li key={step} className={k === 2 ? "is-hot" : ""}>
            <i aria-hidden />
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS.map((p) => {
          const free = p.priceUsd === 0;
          const hot = p.id === "growth";
          const monthly = p.priceUsd;
          const isCurrent = current === p.id;
          return (
            <section key={p.id} className={`plan-card relative flex flex-col rounded-3xl border p-6 ${hot ? "plan-rec" : "border-line"}`} aria-labelledby={`plan-${p.id}`}>
              {/* "Most popular" / "Highest volume" floats on the card's top edge */}
              {p.badge && <span className={`plan-flag ${hot ? "" : "is-quiet"}`}>{p.badge}</span>}
              <p id={`plan-${p.id}`} className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
                {p.name}
              </p>
              <h2 className="mt-3 text-xl xl:min-h-[2.5em] font-semibold leading-tight tracking-tight">{p.title}</h2>
              <p className="mt-1.5 text-sm text-muted xl:min-h-[2.9em]">{p.note}</p>

              {/* price */}
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{free ? "$0" : `$${Number.isInteger(monthly) ? monthly : monthly.toFixed(2)}`}</span>
                <span className="text-sm text-muted">{free ? "one time" : "/ month"}</span>
              </p>
              <p className="mt-1 min-h-4 text-xs text-faint">{free ? "No card needed" : "Billed monthly, cancel any time"}</p>
              {!free && offerPercent > 0 && (
                <p className="promo-line mt-2">
                  ${discounted(p.priceUsd, offerPercent)}/mo for {PROMO_MONTHS} months
                </p>
              )}

              {/* the allowance, big and clear */}
              <p className="allow-line mt-4">
                <b>{n(p.customers)} Crawlers</b> {free ? "once" : "/ month"}
                <span>{free ? "1 Crawler = 1 simulated customer" : per100Label(p)}</span>
              </p>

              {/* the button */}
              <div className="plan-cta mt-5">
                {free ? (
                  <Link href={signedIn ? "/onboarding" : "/#hero-url"} className="btn btn-secondary w-full rounded-full">
                    Run simulation
                  </Link>
                ) : !payments ? (
                  <span className="btn btn-ghost w-full cursor-default rounded-full text-faint" aria-disabled>
                    Coming soon
                  </span>
                ) : isCurrent ? (
                  <span className="btn btn-ghost w-full cursor-default rounded-full" aria-disabled>
                    Your current plan
                  </span>
                ) : currentPlan ? (
                  <SwitchPlanButton
                    planId={p.id}
                    planName={p.name}
                    price={p.priceUsd}
                    upgrade={p.priceUsd > currentPlan.priceUsd}
                  />
                ) : current ? (
                  <ManageBilling className="btn btn-secondary w-full rounded-full" label="Manage billing" />
                ) : signedIn ? (
                  <BuyButton planId={p.id as PaidPlanId} label={hot ? "Get Growth" : `Choose ${p.name}`} primary={hot} />
                ) : (
                  <Link href="/signup?next=/pricing" className={`btn w-full rounded-full ${hot ? "btn-primary" : "btn-secondary"}`}>
                    {hot ? "Get Growth" : `Choose ${p.name}`}
                  </Link>
                )}
              </div>

              {/* what you get */}
              {p.includes && <p className="mt-6 text-sm font-semibold">{p.includes}</p>}
              <ul className={`${p.includes ? "mt-3" : "mt-6"} space-y-2.5 text-sm`}>
                {p.features.map((f) => (
                  <li key={f.text} className={`flex gap-2.5 ${f.soon ? "text-faint" : ""}`}>
                    <Tick soon={f.soon} />
                    <span>
                      {f.text}
                      {f.soon && <span className="soon-tag">Soon</span>}
                    </span>
                  </li>
                ))}
                {p.missing && (
                  <li className="flex gap-2.5 text-faint">
                    <Dash />
                    <span>{p.missing}</span>
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <a href="#custom" className="underline-offset-4 hover:text-fg hover:underline">
          Need more Crawlers?
        </a>{" "}
        Enterprise volumes and pay per analysis are below.
      </p>
    </div>
  );
}

function Tick({ soon }: { soon?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mt-px shrink-0 ${soon ? "text-faint" : "tick-green"}`} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
function Dash() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-px shrink-0" aria-hidden>
      <path d="M7 12h10" />
    </svg>
  );
}
