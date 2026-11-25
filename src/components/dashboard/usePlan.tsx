"use client";
// What this account's next test looks like: how many Crawlers (simulated customers), how many tests are left,
// and the invite progress. The database decides; this only fetches it (GET /api/plan).
import { useEffect, useState } from "react";
import Link from "next/link";
import { sizesFor, type PlanData } from "@/lib/dashboard";
import { TEST_SIZES } from "@/lib/plans";

export type PlanInfo = PlanData;

export function usePlan(): PlanInfo | null {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  useEffect(() => {
    fetch("/api/plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setPlan(d))
      .catch(() => null);
  }, []);
  return plan;
}

// Shown on the launch step when this is a starter-size test.
export function StarterNote({ plan }: { plan: PlanInfo | null }) {
  if (!plan || plan.customers >= 100) return null;
  const { count, needed } = plan.referrals;
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="font-medium">
          Starter test: {plan.customers} simulated customers
        </p>
        <p className="mt-1 text-sm text-muted">
          Invite {needed} friends and unlock a full 100-customer test ({count} of {needed} so far). Friends count once they verify their email.
        </p>
      </div>
      <Link href="/dashboard#invite" className="btn btn-secondary h-11 shrink-0 px-5">
        Invite friends
      </Link>
    </div>
  );
}

// Can this account choose a test size? Paid plans, Crawler packs (not for Ad Analysis) and admins can.
// Free trials can't: the server sets their size (25 starter / 100 after invites).
export function canPickSize(plan: PlanInfo | null, video = false): boolean {
  return Boolean(plan && (plan.monthly || plan.unlimited || (!video && (plan.packs ?? 0) > 0)));
}

// Pick how many Crawlers this test uses (only sizes that fit: this month's Crawlers, then pack Crawlers).
export function SizePicker({ plan, value, onChange, video = false }: { plan: PlanInfo | null; value: number; onChange: (n: number) => void; video?: boolean }) {
  if (!plan || !canPickSize(plan, video)) return null;
  const packs = video ? 0 : (plan.packs ?? 0);
  const fits = sizesFor(plan.monthly, plan.unlimited, TEST_SIZES, packs);
  const n = (x: number) => x.toLocaleString("en-US");
  const left = plan.unlimited
    ? "Admin: no monthly limit."
    : [
        plan.monthly ? `${n(plan.monthly.left)} of ${n(plan.monthly.allowance)} Crawlers left this month.` : "",
        packs > 0 ? `${n(packs)} pack Crawlers${plan.monthly ? " on top" : " left"}.` : "",
        "Bigger crowds take longer (1,000 is a few minutes).",
      ]
        .filter(Boolean)
        .join(" ");
  return (
    <div className="card p-4 sm:p-6">
      <p className="font-medium">How many Crawlers?</p>
      <p className="mt-1 text-sm text-muted">{left}</p>
      {fits.length ? (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Test size">
          {fits.map((x) => (
            <button key={x} type="button" className="chip" aria-pressed={value === x} onClick={() => onChange(x)}>
              {n(x)}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm">
          You&apos;ve used this month&apos;s Crawlers.{" "}
          <Link href="/pricing" className="underline underline-offset-2">
            Upgrade or buy a pack
          </Link>{" "}
          , or wait until your plan renews.
        </p>
      )}
    </div>
  );
}

// Keeps the chosen size valid when the plan loads (e.g. 1,000 picked but only 300 left -> 250).
export function fitSize(plan: PlanInfo | null, wanted: number, video = false): number {
  if (!plan || !canPickSize(plan, video)) return 100;
  const fits = sizesFor(plan.monthly, plan.unlimited, TEST_SIZES, video ? 0 : (plan.packs ?? 0));
  return fits.includes(wanted) ? wanted : (fits[fits.length - 1] ?? 100);
}

// Video / ad tests aren't in this plan: say so up front (the server refuses them anyway).
export function AdsGate({ plan }: { plan: PlanInfo | null }) {
  if (!plan || plan.ads || plan.unlimited) return null;
  return (
    <div className="card p-6">
      <p className="t-h3">Ad Analysis unlocks on Growth</p>
      <p className="mt-2 text-sm text-muted">
        Simulated viewers watch your ad or creator video frame by frame and tell you where they&apos;d swipe away. It comes
        with Growth ($49/month) and up. The free trial, Starter and Crawler packs cover websites, stores and apps.
      </p>
      <Link href="/pricing" className="btn btn-primary mt-4 h-11 px-5">
        See plans
      </Link>
    </div>
  );
}
