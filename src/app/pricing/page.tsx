// /pricing: the plans from src/lib/plans.ts. Monthly plans measured in simulated customers, cancel any time.
// Paid plans open Stripe Checkout (BuyButton -> /api/checkout). Signed-out visitors sign up first.
// Without the Stripe keys in the environment, they say "Coming soon".
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { PLANS, per100Label, planName } from "@/lib/plans";
import ManageBilling from "@/components/ManageBilling";
import { supabaseServer } from "@/lib/supabase/server";
import { paidPlan, stripeEnabled } from "@/lib/stripe";
import SwitchPlanButton from "@/components/SwitchPlanButton";
import { INVITES_TO_UNLOCK, STARTER_CUSTOMERS, TEST_SIZES } from "@/lib/plans";
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
    <div className="mx-auto max-w-7xl">
      {/* Summarized, card-first layout: name, one-line promise, the button, the price, a short list. */}
      <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">Pick your crowd</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted">Pay for simulated customers. Cancel any time.</p>

      {cancelled && (
        <p role="status" className="card mx-auto mt-8 max-w-xl p-4 text-center text-sm">
          Checkout cancelled. Nothing was charged.
        </p>
      )}
      {billing && (
        <p className="card mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3 p-4 text-sm">
          {current ? `You're on ${planName(current)}.` : "You've paid before."}
          <ManageBilling className="btn btn-secondary h-9 px-4 text-sm" />
        </p>
      )}

      <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const free = p.priceUsd === 0;
          const rec = p.id === "starter";
          const copy = PLAN_COPY[p.id];
          return (
            <div key={p.id} className={`plan-card flex flex-col rounded-3xl border p-7 ${rec ? "plan-rec" : "border-line bg-subtle"}`}>
              <div className="flex min-h-8 items-center justify-between gap-2">
                <p className="text-lg font-medium">{p.name}</p>
                {rec && <span className="plan-badge">Recommended</span>}
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">{copy.title}</h2>
              <p className="mt-2 min-h-12 text-muted">{copy.line}</p>

              <div className="plan-cta mt-6">
                {free ? (
                  <Link href={signedIn ? "/app" : "/signup"} className="btn btn-secondary w-full rounded-full">
                    Start free
                  </Link>
                ) : !payments ? (
                  <span className="btn btn-ghost w-full cursor-default rounded-full text-faint" aria-disabled>
                    Coming soon
                  </span>
                ) : current === p.id ? (
                  <span className="btn btn-ghost w-full cursor-default rounded-full" aria-disabled>
                    Your current plan
                  </span>
                ) : current && paidPlan(current) ? (
                  <SwitchPlanButton planId={p.id} planName={p.name} price={p.priceUsd} upgrade={p.priceUsd > (paidPlan(current)?.priceUsd ?? 0)} />
                ) : current ? (
                  <ManageBilling className="btn btn-secondary w-full rounded-full" label="Manage billing" />
                ) : user || !AUTH_ENABLED ? (
                  <BuyButton planId={p.id as "starter" | "growth" | "scale"} label="Start now" primary={rec} />
                ) : (
                  <Link href="/signup?next=/pricing" className={`btn w-full rounded-full ${rec ? "btn-primary" : "btn-secondary"}`}>
                    Start now
                  </Link>
                )}
              </div>

              <p className="mt-7 flex items-baseline gap-1">
                <span className="text-sm text-muted">$</span>
                <span className="text-4xl font-semibold tracking-tight">{p.priceUsd}</span>
                <span className="text-muted">{free ? "" : "/ month"}</span>
              </p>
              <p className="mt-1 text-sm text-faint">{free ? "No card needed" : per100Label(p)}</p>

              <ul className="mt-7 space-y-3.5 text-[15px]">
                {copy.points.map(([icon, text]) => (
                  <li key={text} className="flex gap-3">
                    <PlanIcon name={icon} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Auto-renewal disclosure (clear terms BEFORE paying, easy cancel: required by auto-renewal laws). */}
      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted">
        Paid plans renew automatically every month at the price shown until you cancel. Cancel any time from Manage billing
        on your dashboard: you keep the plan until the end of the month you paid for. Each month&apos;s simulated customers
        reset when the plan renews (unused ones don&apos;t carry over). A test that fails on our side doesn&apos;t count.
      </p>
      <p className="t-label mt-6 text-center">
        every test: simulated customers · buying intent, not real purchases · secure checkout by Stripe
      </p>

      {/* Crawler's own simulated customers asked for this: how it compares with panels and A/B tests */}
      <div className="mt-24">
        <Compare />
      </div>
    </div>
  );
}

// The short, summarized words on each card. Every number matches src/lib/plans.ts (and the database).
const n = (x: number) => x.toLocaleString("en-US");
const customersOf = (id: string) => PLANS.find((p) => p.id === id)?.customers ?? 0;
const PLAN_COPY: Record<string, { title: string; line: string; points: [IconName, string][] }> = {
  free: {
    title: "Try Crawler",
    line: "See what simulated customers think, once.",
    points: [
      ["crowd", `1 test with ${STARTER_CUSTOMERS} simulated customers`],
      ["report", "Full report with ranked fixes"],
      ["gift", `Invite ${INVITES_TO_UNLOCK} friends: +1 test of 100`],
      ["card", "No card needed"],
    ],
  },
  starter: {
    title: "Launch ready",
    line: "Test, fix and re-test before you ship.",
    points: [
      ["crowd", `${n(customersOf("starter"))} simulated customers a month`],
      ["test", "About 10 tests of 100"],
      ["globe", "Websites, apps, games and stores"],
      ["repeat", "AI explorer and re-tests"],
      ["report", "Fix tracker, PDF and fix prompt"],
    ],
  },
  growth: {
    title: "Bigger crowds",
    line: "For launches you can't afford to get wrong.",
    points: [
      ["crowd", `${n(customersOf("growth"))} simulated customers a month`],
      ["test", `Tests up to ${n(TEST_SIZES[TEST_SIZES.length - 1])} customers each`],
      ["video", "Video, ad and creator tests"],
      ["check", "Everything in Starter"],
    ],
  },
  scale: {
    title: "Always shipping",
    line: "For studios and teams testing every week.",
    points: [
      ["crowd", `${n(customersOf("scale"))} simulated customers a month`],
      ["test", `Tests up to ${n(TEST_SIZES[TEST_SIZES.length - 1])} customers each`],
      ["video", "Video, ad and creator tests"],
      ["check", "Everything in Growth"],
    ],
  },
};

type IconName = "crowd" | "report" | "gift" | "card" | "test" | "globe" | "repeat" | "video" | "check";
const ICON_PATHS: Record<IconName, string> = {
  crowd: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M21 20a5 5 0 0 0-4-4.9",
  report: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-3-5-3-5-1s5 1 5 1zm0 0c2-3 5-3 5-1s-5 1-5 1z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  test: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  repeat: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
  video: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM10 9v6l5-3z",
  check: "M5 12.5l4.5 4.5L19 7",
};
function PlanIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-muted" aria-hidden>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
