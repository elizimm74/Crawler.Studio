"use client";
// The answer at the top of every report: a glass panel with the big score that counts up, the
// one-sentence summary, the key pills, and the test's simulated crowd as dots (one dot per customer,
// the yeses lit). Everything shown is passed in from the counted stats; nothing is made up here.
import { useTween } from "@/components/dashboard/useTween";
import { Crowd } from "@/components/dashboard/viz";

export type Pill = { text: string; warn?: boolean };

export default function ReportHero({
  label,
  tag,
  value,
  total,
  headline,
  sub,
  summary,
  pills,
  yes,
  crowdTotal,
  crowdCaption,
  actions,
  children,
}: {
  label: string; // what was tested: "mealmate.app"
  tag: string; // "report" / "app test · 3 samples of 100"
  value: number; // the big number
  total: number;
  headline: string; // "would sign up"
  sub?: string; // "range across 3 crowds: 31–37%"
  summary: string;
  pills: Pill[];
  yes: number; // lit dots
  crowdTotal: number;
  crowdCaption: string;
  actions?: React.ReactNode;
  children?: React.ReactNode; // e.g. the verdict bar
}) {
  const n = useTween(value, 1100);
  return (
    <section id="answer" className="gpanel dash-hero-glass dash-rise scroll-mt-32 overflow-hidden p-6 sm:p-10" aria-label="The answer">
      <div className="flex items-center justify-between gap-4">
        <span className="t-label flex min-w-0 items-center gap-2 truncate">
          <span className="pulse-dot shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        {/* the page's one heading, for screen readers and search engines (the big number is the visual headline) */}
        <h1 className="sr-only">
          {label} {tag}: {value} of {total} simulated customers {headline}
        </h1>
        <span className="t-label shrink-0">{tag}</span>
      </div>
      <div className="mt-8 grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <p className="flex items-end gap-2">
            <span className="text-8xl font-semibold leading-none tracking-tight tabular-nums sm:text-9xl">{Math.round(n)}</span>
            <span className="pb-2 text-3xl text-faint tabular-nums sm:text-4xl">/{total}</span>
          </p>
          <p className="mt-3 text-xl font-medium">{headline}</p>
          {sub && <p className="mt-1 text-sm text-faint">{sub}</p>}
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{summary}</p>
          {pills.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {pills.map((p) => (
                <span key={p.text} className={`rounded-full border px-3 py-1 text-xs ${p.warn ? "border-white/25 bg-white/[0.08] text-fg" : "border-white/10 bg-white/[0.04] text-muted"}`}>
                  {p.text}
                </span>
              ))}
            </div>
          )}
          {actions && <div className="mt-7 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className="mx-auto w-full max-w-[280px]">
          <Crowd yes={yes} total={crowdTotal} />
          <p className="mt-3 text-xs text-faint">{crowdCaption}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
