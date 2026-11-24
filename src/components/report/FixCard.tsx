"use client";
// One ranked fix as a glass card: its number, what's wrong, what to do, and how many simulated
// customers it could win back (counted in code when the test ran). Slides in as you scroll.
import Reveal from "@/components/Reveal";
import { FixStatusSelect } from "./FixStatus";

export default function FixCard({
  n,
  title,
  problem,
  change,
  win,
  winLabel,
  meta,
  priority,
  evidence,
  tracked = false,
}: {
  n: number;
  title: string;
  problem?: string;
  change: string;
  win?: number;
  winLabel?: string;
  meta?: string;
  priority?: string; // Critical / High / Medium / Low, from counts (src/lib/priority.ts)
  evidence?: string; // "Why it matters": what the simulation saw, in numbers
  tracked?: boolean; // show the Not started / In progress / Completed selector
}) {
  return (
    <Reveal delay={Math.min(n - 1, 4) * 70}>
      <div role="listitem" className="gpanel fixcard">
        <span className="fixnum" aria-hidden>
          {String(n).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-medium leading-snug">{title}</p>
            {priority && <span className={`pill prio prio-${priority.toLowerCase()}`}>{priority}</span>}
          </div>
          {problem && (
            <p className="mt-1.5 text-muted">
              <span className="text-faint">Problem: </span>
              {problem}
            </p>
          )}
          {evidence && (
            <p className="mt-1.5 text-sm text-muted">
              <span className="text-faint">Why it matters: </span>
              {evidence}
            </p>
          )}
          <p className="mt-2">
            <span className="font-medium">Do this: </span>
            <span className="text-fg/90">{change}</span>
          </p>
          {meta && <p className="t-label mt-3">{meta}</p>}
          {tracked && (
            <div className="mt-3">
              <FixStatusSelect title={title} />
            </div>
          )}
        </div>
        {win !== undefined && win > 0 && (
          <div className="winpill self-start" aria-label={`${win} ${winLabel ?? "could be won back"}`}>
            <span className="text-2xl font-semibold tabular-nums">+{win}</span>
            <span className="text-center text-[11px] leading-tight text-muted">{winLabel ?? "could be won back"}</span>
          </div>
        )}
      </div>
    </Reveal>
  );
}
