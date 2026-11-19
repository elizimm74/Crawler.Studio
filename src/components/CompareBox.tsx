"use client";
// Before / after for a RE-TEST: loads the earlier test and compares the same simulated customers
// (src/lib/compare.ts does the counting). Shows the score change and exactly who changed their mind.
import { useEffect, useState } from "react";
import Link from "next/link";
import { compareRuns, type Comparison } from "@/lib/compare";
import type { Run } from "@/lib/pipeline";

const WORD = { buy: "yes", maybe: "maybe", no: "no" } as const;

export default function CompareBox({ run }: { run: Run }) {
  const [cmp, setCmp] = useState<Comparison | null>(null);
  const [prevUrl, setPrevUrl] = useState<string>("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!run.compareTo) return;
    fetch(`/api/tests/${run.compareTo}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((prev: Run) => {
        if (!prev.verdicts || !prev.personas) throw new Error();
        setPrevUrl(prev.createdAt);
        setCmp(compareRuns(prev, run));
      })
      .catch(() => setFailed(true));
  }, [run]);
  if (!run.compareTo) return null;
  if (failed) return <p className="card p-4 text-sm text-muted">This is a re-test, but the earlier test couldn&apos;t be loaded to compare.</p>;
  if (!cmp) return <p className="card p-4 text-sm text-muted">Comparing with your earlier test…</p>;
  const goal = run.profile?.goal ?? "buy";
  const date = prevUrl ? new Date(prevUrl).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "before";

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="cmp-title">
      <p className="t-label">re-test · same simulated customers</p>
      <h2 id="cmp-title" className="t-h2 mt-2">
        {cmp.delta > 0 ? `${cmp.delta} more would ${goal}` : cmp.delta < 0 ? `${-cmp.delta} fewer would ${goal}` : `No change in who would ${goal}`}
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-xl border border-line p-4">
          <p className="t-label">{date}</p>
          <p className="t-number mt-1 text-4xl">{cmp.before.buy}</p>
          <p className="text-xs text-faint">of {cmp.matched}</p>
        </div>
        <div className="rounded-xl border border-line-strong p-4">
          <p className="t-label">now</p>
          <p className="t-number mt-1 text-4xl text-accent-ink">{cmp.after.buy}</p>
          <p className="text-xs text-faint">of {cmp.matched}</p>
        </div>
      </div>
      {!cmp.sameCrowd && (
        <p className="mt-4 text-sm text-muted">Some customers didn&apos;t line up between the two tests, so only the matching ones are compared.</p>
      )}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <FlipList title={`Changed their mind for the better (${cmp.won.length})`} flips={cmp.won} />
        <FlipList title={`Changed their mind for the worse (${cmp.lost.length})`} flips={cmp.lost} />
      </div>
      <p className="mt-6 text-xs text-faint">
        Same simulated customers, same audience; only your page changed. Simulated customers can still shift a little by chance between runs, so small
        changes (1 or 2 people) aren&apos;t a clear signal.{" "}
        <Link href={`/run/${run.compareTo}`} className="underline underline-offset-2">
          Open the earlier report
        </Link>
      </p>
    </section>
  );
}

function FlipList({ title, flips }: { title: string; flips: Comparison["won"] }) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      {flips.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nobody.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {flips.slice(0, 6).map((f) => (
            <li key={f.personaId} className="rounded-xl border border-line p-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{f.who}</span>
                <span className="font-mono text-xs text-faint">
                  {WORD[f.from]} → {WORD[f.to]}
                </span>
              </p>
              <p className="mt-1 text-muted">&ldquo;{f.quote}&rdquo;</p>
              {f.from !== "buy" && f.reasonBefore && <p className="mt-1 text-xs text-faint">Before: {f.reasonBefore}</p>}
            </li>
          ))}
          {flips.length > 6 && <li className="text-xs text-faint">and {flips.length - 6} more</li>}
        </ul>
      )}
    </div>
  );
}
