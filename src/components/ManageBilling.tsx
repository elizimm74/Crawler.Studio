"use client";
// "Manage billing": opens Stripe's own page (change card, see invoices, cancel the monthly plan).
// Our server makes the link (POST /api/billing); card details never touch Crawler.
import { useState } from "react";

export default function ManageBilling({ className = "", label = "Manage billing" }: { className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" onClick={open} disabled={busy} aria-busy={busy} className={className}>
        {busy ? "Opening…" : label}
      </button>
      {error && (
        <span role="alert" className="block text-xs text-muted">
          {error}
        </span>
      )}
    </>
  );
}
