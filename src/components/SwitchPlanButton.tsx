"use client";
// "Upgrade to Growth" on the pricing page for people who already pay. Two taps on purpose:
// the first shows exactly what will happen to their bill, the second does it.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SwitchPlanButton({ planId, planName, price, upgrade }: { planId: string; planName: string; price: number; upgrade: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setStep("busy");
    setError(null);
    try {
      const res = await fetch("/api/billing/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't switch your plan.");
      setStep("done");
      setTimeout(() => router.refresh(), 2500); // the webhook saves the new plan a moment later
    } catch (err) {
      setError((err as Error).message);
      setStep("confirm");
    }
  }

  if (step === "done") return <p className="mt-8 rounded-lg border border-line-strong p-3 text-sm">Switched to {planName}. Your new allowance shows up in a few seconds.</p>;
  const bill = upgrade
    ? `You'll pay the difference for the rest of this month now, then $${price}/month. The bigger allowance starts right away.`
    : `From now on it's $${price}/month. The unused part of this month becomes a credit on your next bill, and your allowance drops to ${planName}'s right away.`;
  return (
    <div className="mt-8">
      {step === "idle" ? (
        <button type="button" onClick={() => setStep("confirm")} className={`btn w-full ${upgrade ? "btn-primary" : "btn-secondary"}`}>
          {upgrade ? "Upgrade" : "Downgrade"} to {planName}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted">{bill}</p>
          <div className="flex gap-2">
            <button type="button" onClick={go} disabled={step === "busy"} className="btn btn-primary flex-1">
              {step === "busy" ? "Switching…" : "Confirm"}
            </button>
            <button type="button" onClick={() => setStep("idle")} disabled={step === "busy"} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
