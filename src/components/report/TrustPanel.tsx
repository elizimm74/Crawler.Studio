// "Why should I trust this number?" (engine v2). Sits right under the score.
// Shows what the crowd SAID next to what we PREDICT they'd actually do (with a 90% range), what's
// normal for this goal on real traffic, which calibration was used, and how much of the reasoning
// is backed by words really found on the page. Every number here is counted in code (aggregate.ts).
import Link from "next/link";
import type { Behavior, EvidenceStats } from "@/lib/aggregate";

const p1 = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

export default function TrustPanel({ behavior, evidence, goal, total }: { behavior?: Behavior; evidence?: EvidenceStats; goal: string; total: number }) {
  if (!behavior) return null; // runs from before engine v2
  const { stated, predicted, baseRate, calibration } = behavior;
  const verifiedPct = evidence && evidence.checkable ? Math.round((evidence.verified / evidence.checkable) * 100) : null;
  return (
    <section id="trust" className="card scroll-mt-32 p-6 sm:p-8" aria-labelledby="trust-title">
      <p className="t-label">why trust this number</p>
      <h2 id="trust-title" className="mt-2 text-2xl font-semibold tracking-tight">
        What they said vs. what they&apos;d do
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile
          label={`Said they'd ${goal}`}
          value={p1(stated.rate)}
          detail={`${Math.round(stated.rate * total)} of ${total} · 90% range ${p1(stated.low)}–${p1(stated.high)}`}
        />
        <Tile
          strong
          label={`Predicted to actually ${goal}`}
          value={p1(predicted.rate)}
          detail={`90% range ${p1(predicted.low)}–${p1(predicted.high)} · about ${predicted.count} of ${total}`}
        />
        <Tile label="Normal on real traffic" value={`${p1(baseRate.low)}–${p1(baseRate.high)}`} detail={baseRate.text} small />
      </div>

      <div className="mt-6 grid gap-6 text-sm md:grid-cols-2">
        <div>
          <p className="font-medium">Why the prediction is lower</p>
          <p className="mt-1 text-muted">
            People (and AI customers even more) say yes far more often than they act. Each &ldquo;yes&rdquo; is turned into a chance of really doing
            it, lowered for things like these:
          </p>
          {behavior.topReductions.length > 0 && (
            <ul className="mt-2 space-y-1 text-muted">
              {behavior.topReductions.map((r) => (
                <li key={r.why}>
                  · {r.why} <span className="text-faint">({r.people} of the yeses)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="font-medium">Calibration</p>
            <p className="mt-1 text-muted">{calibration.note}</p>
          </div>
          {evidence && (
            <div>
              <p className="font-medium">Evidence</p>
              <p className="mt-1 text-muted">
                Every decision had to point at one exact thing on your page.{" "}
                {verifiedPct !== null && (
                  <>
                    {verifiedPct}% of the {evidence.checkable} quoted page words were found on your page by code.{" "}
                  </>
                )}
                {evidence.missing > 0 && <>{evidence.missing} decisions were about something missing.</>}
              </p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-6 text-xs text-faint">
        The range is wide on purpose: it covers which customers happened to be picked and how unsure the calibration is.{" "}
        <Link href="/science#engine" className="underline">
          How it works
        </Link>{" "}
        ·{" "}
        <Link href="/accuracy" className="underline">
          Predicted vs. real results
        </Link>
      </p>
    </section>
  );
}

function Tile({ label, value, detail, strong, small }: { label: string; value: string; detail: string; strong?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-line-strong bg-subtle" : "border-line"}`}>
      <p className="text-xs text-faint">{label}</p>
      <p className={`mt-1 tabular-nums font-semibold tracking-tight ${small ? "text-2xl" : "text-4xl"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
