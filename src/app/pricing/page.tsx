// /pricing: Crawler's FINAL pricing (founder, 2026-11-25). Everything here reads src/lib/plans.ts.
//   1. The five plans in one section (Free trial -> Starter -> Growth -> Pro -> Agency), with a
//      clear upgrade path. MONTHLY only (annual billing removed 2026-11-26). Growth is emphasised.
//   2. A launch-offer note (Black Friday window, or a waitlist discount), worked out on the server.
//   3. Enterprise + "Need more Crawlers?" (a request form).
//   4. Pay per analysis: buy one test at a time, no subscription.
//   5. A feature comparison table, then the honest fine print (auto-renewal, resets, discounts).
// Features that aren't built yet are tagged "Soon" everywhere on this page.
import Link from "next/link";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import {
  BLACK_FRIDAY,
  PACKS,
  PROMO_MONTHS,
  STARTER_CUSTOMERS,
  WAITLIST_TIERS,
  blackFridayActive,
  launchDiscount,
  planName,
  waitlistPercent,
} from "@/lib/plans";
import ManageBilling from "@/components/ManageBilling";
import { stripeEnabled } from "@/lib/stripe";
import BuyButton from "@/components/BuyButton";
import PricingPlans from "@/components/pricing/PricingPlans";
import CustomVolume from "@/components/pricing/CustomVolume";
import { Compare } from "@/components/landing/Sections";

export const metadata = {
  title: "Pricing",
  description: "Crawler pricing: a free trial with 25 Crawlers, then monthly plans from $19 for 1,000 Crawlers, or pay per analysis from $9. Ad Analysis from $49.",
  alternates: { canonical: "/pricing" },
};

const n = (x: number) => x.toLocaleString("en-US");

export default async function Pricing({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  const user = await currentUser();
  const payments = stripeEnabled();
  const signedIn = Boolean(user) || !AUTH_ENABLED;

  // Already paying? Their plan (for switch buttons and "Manage billing").
  let current: string | null = null;
  let billing = false;
  let packs = 0;
  let onWaitlist = false;
  let waitlistSize = 0;
  if (AUTH_ENABLED) {
    const db = await supabaseServer();
    if (user) {
      const { data } = await db.rpc("my_plan");
      const me = (data as { subscription?: { plan: string; status: string; interval?: string } | null; billing?: boolean; packs?: number } | null) ?? null;
      billing = Boolean(me?.billing);
      packs = Number(me?.packs ?? 0);
      if (me?.subscription && ["active", "trialing", "past_due"].includes(me.subscription.status)) {
        current = me.subscription.plan;
      }
      const { data: offer } = await db.rpc("launch_offer");
      const o = (offer ?? {}) as { on_waitlist?: boolean; waitlist_size?: number };
      onWaitlist = Boolean(o.on_waitlist);
      waitlistSize = Number(o.waitlist_size ?? 0);
    } else {
      const { data } = await db.rpc("waitlist_count");
      waitlistSize = Number(data ?? 0);
    }
  }
  const bf = blackFridayActive();
  // the discount THIS visitor would get on a monthly plan (the server applies the same rule at checkout)
  const offerPercent = launchDiscount({ interval: "month", onWaitlist, waitlistSize });
  const waitlistNow = waitlistPercent(waitlistSize);
  const bfEnds = new Date(new Date(BLACK_FRIDAY.end).getTime() - 1).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });

  return (
    <div className="mx-auto max-w-[88rem]">
      <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">Pick your crowd</h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
        1 Crawler = 1 simulated customer. Start free, then pick how many Crawlers you need each month.
        <br className="hidden sm:block" /> <strong className="font-semibold text-fg">Starter</strong> tests your website.{" "}
        <strong className="font-semibold text-fg">Growth</strong> tests your website and your ads.{" "}
        <strong className="font-semibold text-fg">Pro and Agency</strong> test your whole marketing.
      </p>

      {/* launch offer: one discount at a time, never stacked */}
      {(bf || offerPercent > 0 || waitlistNow > 0) && (
        <div className="offer-note mx-auto mt-8 max-w-2xl">
          {bf ? (
            <p>
              <strong>Black Friday:</strong> {BLACK_FRIDAY.percent}% off your first {PROMO_MONTHS} months on any monthly plan, until {bfEnds}.
            </p>
          ) : onWaitlist ? (
            <p>
              <strong>Your launch offer:</strong> you&apos;re on the waitlist, so you get {offerPercent}% off your first {PROMO_MONTHS} months on a monthly plan.
              It&apos;s applied automatically at checkout.
            </p>
          ) : (
            <p>
              <strong>On our waitlist?</strong> Sign up with the same email and get {waitlistNow}% off your first {PROMO_MONTHS} months on a monthly plan.
              The discount grows to {WAITLIST_TIERS[WAITLIST_TIERS.length - 1].percent}% as the waitlist grows.
            </p>
          )}
          <p className="mt-1 text-xs opacity-80">One discount per customer. Discounts don&apos;t stack and don&apos;t apply to pay per analysis.</p>
        </div>
      )}

      {cancelled && (
        <p role="status" className="card mx-auto mt-8 max-w-xl p-4 text-center text-sm">
          Checkout cancelled. Nothing was charged.
        </p>
      )}
      {(billing || packs > 0) && (
        <p className="card mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3 p-4 text-sm">
          {current ? `You're on ${planName(current)}.` : "You've paid before."}
          {packs > 0 && ` ${n(packs)} paid Crawlers left for your next analysis.`}
          {billing && <ManageBilling className="btn btn-secondary h-9 px-4 text-sm" />}
        </p>
      )}

      {/* the five plans get the full screen width (the page column is too narrow for five cards) */}
      <div className="bleed-full mt-10">
        <div className="home-wide">
          <PricingPlans signedIn={signedIn} payments={payments} current={current} offerPercent={bf || onWaitlist ? offerPercent : 0} />
        </div>
      </div>

      {/* Enterprise + custom volume */}
      <div className="mt-12">
        <CustomVolume enabled={AUTH_ENABLED} />
      </div>

      {/* pay per analysis: one test at a time, no subscription */}
      <section id="pay-per-analysis" className="mt-20" aria-labelledby="packs-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow14 justify-center">Pay per analysis</p>
          <h2 id="packs-title" className="mt-4 text-3xl font-bold tracking-tight">Just need one test?</h2>
          <p className="mt-3 text-muted">
            Pay once for one analysis. Pick how many simulated customers it runs. Nothing renews, and it doesn&apos;t expire. For website, store and app
            tests; Ad Analysis needs Growth or higher.
          </p>
        </div>
        <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PACKS.map((pk) => (
            <li key={pk.id} className="pack-card flex flex-col rounded-3xl border border-line p-6">
              <p className="text-sm text-muted">1 analysis</p>
              <p className="text-2xl font-bold tracking-tight">{n(pk.crawlers)} customers</p>
              <p className="mt-5 text-3xl font-bold tracking-tight">${pk.priceUsd}</p>
              <p className="text-xs text-faint">one-time · ${((pk.priceUsd / pk.crawlers) * 100).toFixed(2)} per 100 customers</p>
              <div className="plan-cta mt-6">
                {!payments ? (
                  <span className="btn btn-ghost w-full cursor-default rounded-full text-faint" aria-disabled>
                    Coming soon
                  </span>
                ) : signedIn ? (
                  <BuyButton packId={pk.id} label="Pay for this test" />
                ) : (
                  <Link href="/signup?next=/pricing" className="btn btn-secondary w-full rounded-full">
                    Pay for this test
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* feature comparison */}
      <section className="mt-24" aria-labelledby="compare-title">
        <h2 id="compare-title" className="text-center text-3xl font-bold tracking-tight">
          Compare plans
        </h2>
        <p className="mt-3 text-center text-muted">&ldquo;Soon&rdquo; means it&apos;s on our roadmap and not available yet.</p>
        <p className="t-label mt-6 sm:hidden" aria-hidden>
          swipe the table sideways →
        </p>
        <div className="mt-3 overflow-x-auto sm:mt-8">
          <table className="compare-plans w-full min-w-[44rem] border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">What each plan includes</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[34%]">
                  <span className="sr-only">Feature</span>
                </th>
                {["Starter", "Growth", "Pro", "Agency"].map((h) => (
                  <th key={h} scope="col" className={h === "Growth" ? "is-hot" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, cells]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {cells.map((c, k) => (
                    <td key={k} className={k === 1 ? "is-hot" : ""}>
                      <Cell v={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Auto-renewal + discount disclosure (clear terms BEFORE paying, easy cancel). */}
      <div className="mx-auto mt-14 max-w-3xl space-y-3 text-center text-sm text-muted">
        <p>
          Plans are billed monthly and renew automatically at the price shown every month until you cancel.
          Cancel any time from Manage billing on your dashboard: you keep the plan until the end of the period you paid for.
        </p>
        <p>
          Your Crawlers reset every month and unused ones don&apos;t carry over. A pay-per-analysis test is paid once, never expires, and is used
          after your monthly Crawlers if you also have a plan. A test that fails on our side doesn&apos;t use any Crawlers. The free trial is one test with {STARTER_CUSTOMERS} Crawlers; upgrading
          unlocks its full report.
        </p>
        <p>
          Launch discounts take {BLACK_FRIDAY.percent}% or less off the first {PROMO_MONTHS} monthly payments, one per customer, and never stack.
        </p>
      </div>
      <p className="t-label mt-6 text-center">every test: simulated customers · buying intent, not real purchases · secure checkout by Stripe</p>

      {/* how Crawler compares with panels and A/B tests, on a washed-black band */}
      <div className="night18 mt-16">
        <Compare />
      </div>
    </div>
  );
}

// ---------- the comparison table (true today, or tagged "soon") ----------
type CellValue = boolean | string | { soon: string | true };
const SOON = { soon: true as const };
const COMPARE: [string, CellValue[]][] = [
  ["Crawlers per month", ["1,000", "5,000", "15,000", "40,000"]],
  ["Website, store and app analysis", [true, true, true, true]],
  ["Purchase intent", [true, true, true, true]],
  ["Objections and ranked fixes", [true, true, true, true]],
  ["Ad Analysis (video, ad and creator tests)", [false, true, true, true]],
  ["Advanced ad testing", [false, "Basic", { soon: "Full" }, { soon: "Full" }]],
  ["Simulation processing", ["Standard", "Standard", "Priority", "Highest priority"]],
  ["Analysis history", ["Standard", "Standard", "Standard", "Expanded"]],
  ["Multiple brands and projects", [false, false, { soon: "Limited" }, SOON]],
  ["Team workspaces", [false, false, false, SOON]],
];

function Cell({ v }: { v: CellValue }) {
  if (v === true)
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="tick-green" role="img" aria-label="Included">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    );
  if (v === false)
    return (
      <span className="text-faint" aria-label="Not included">
        —
      </span>
    );
  if (typeof v === "string") return <span>{v}</span>;
  return (
    <span className="text-faint">
      {v.soon === true ? "Included" : v.soon}
      <span className="soon-tag">Soon</span>
    </span>
  );
}
