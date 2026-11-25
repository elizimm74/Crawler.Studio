"use client";
// A pricing-page buy button: asks our server for a Stripe Checkout page, then goes there.
//   planId + interval -> a monthly or annual subscription
//   packId            -> a one-time Crawler pack
// Card details are typed on Stripe's page, never on Crawler's. If you already have a plan, the
// server sends you to "Manage billing" instead (no double subscriptions). Any launch discount is
// decided by the server and shows up on Stripe's page.
import { useState } from "react";
import type { Interval, PackId, PaidPlanId } from "@/lib/plans";

type Props = { label: string; primary?: boolean; planId?: PaidPlanId; interval?: Interval; packId?: PackId; className?: string };

export default function BuyButton({ planId, interval = "month", packId, label, primary, className = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const body = packId ? { packId } : { planId, interval };
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className={className}>
      <button type="button" onClick={buy} disabled={busy} aria-busy={busy} className={`btn w-full ${primary ? "btn-primary" : "btn-secondary"}`}>
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-muted">
          {error}
        </p>
      )}
    </div>
  );
}
