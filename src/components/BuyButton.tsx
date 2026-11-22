"use client";
// "Subscribe" on the pricing page: asks our server for a Stripe Checkout page, then goes there.
// Card details are typed on Stripe's page, never on Crawler's. If you already have a plan, the
// server sends you to "Manage billing" instead (no double subscriptions).
import { useState } from "react";

export default function BuyButton({ planId, label, primary }: { planId: "starter" | "growth" | "scale"; label: string; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="mt-8">
      <button type="button" onClick={buy} disabled={busy} className={`btn w-full ${primary ? "btn-primary" : "btn-secondary"}`}>
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
