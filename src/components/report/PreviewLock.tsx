// THE LOCKED PART of a free-trial report: what's waiting, and how to unlock it.
// The free trial shows the score and the top reasons; paying (any plan or a Crawler pack) unlocks the
// full report of this same test straight away. The blurred cards are plain grey shapes, not real
// content (the real fixes never reach the browser until they pay).
import Link from "next/link";
import { PACKS, PLANS } from "@/lib/plans";

export default function PreviewLock({ fixes, customers, kind = "website" }: { fixes: number; customers: number; kind?: "website" | "app" }) {
  const starter = PLANS.find((p) => p.id === "starter")!;
  const smallest = PACKS[0];
  const items = [
    `${fixes || "Your"} ranked fix${fixes === 1 ? "" : "es"}, each with how many customers it could win back`,
    kind === "app" ? "Screen-by-screen drop-off and paywall checks" : "Where they dropped off, and who liked it most",
    kind === "app" ? "Rewritten paywall headlines and buttons" : "Rewritten headline, subheadline and pricing copy",
    `All ${customers} simulated customers: what they thought, and why`,
    "A copy-paste prompt that fixes it with AI",
  ];
  return (
    <section id="unlock" className="lock-panel scroll-mt-32" aria-labelledby="unlock-title">
      <div className="lock-ghosts" aria-hidden>
        {[0, 1, 2].map((k) => (
          <div key={k} className="lock-ghost">
            <i />
            <span>
              <b />
              <b />
            </span>
            <em />
          </div>
        ))}
      </div>
      <div className="lock-body">
        <p className="t-label">free trial preview</p>
        <h2 id="unlock-title" className="mt-2 text-3xl font-bold tracking-tight">
          Your full report is ready.
        </h2>
        <p className="mt-2 max-w-xl text-muted">Unlock it to see exactly what to fix. It opens on this same test, nothing to re-run.</p>
        <ul className="mt-5 space-y-2 text-sm">
          {items.map((t) => (
            <li key={t} className="flex gap-2.5">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0 text-faint" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/pricing" className="btn btn-primary h-11 rounded-full px-6">
            Unlock the full report
          </Link>
          <p className="text-sm text-muted">
            Starter is ${starter.priceUsd}/month, or buy {smallest.crawlers} Crawlers once for ${smallest.priceUsd}.
          </p>
        </div>
      </div>
    </section>
  );
}
