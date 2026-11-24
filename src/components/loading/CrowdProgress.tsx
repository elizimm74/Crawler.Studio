// The run screen while simulated customers review the product: a grid of dots, one per
// customer, that light up as REAL answers come back (done / total from the worker), a big live
// counter, and the stages of a test. Nothing here is faked: the dots are the real progress.
const STAGES = [
  ["Creating", "Building your simulated customers"],
  ["Customers", "Customers are reviewing"],
  ["Viewers", "Viewers are watching"],
  ["The explorer", "Trying the product"],
  ["Crunching", "Counting the answers"],
  ["Writing", "Writing your fixes"],
] as const;

export default function CrowdProgress({ stage, done, total, seconds }: { stage: string; done: number; total: number; seconds: number }) {
  const n = Math.max(1, Math.min(total, 300));
  const shown = Math.min(100, n); // never more than 100 dots on screen
  const lit = Math.round((done / Math.max(1, total)) * shown);
  const pct = Math.round((done / Math.max(1, total)) * 100);
  // which stage are we in (by the worker's own stage text)
  const at = Math.max(0, STAGES.findIndex(([key]) => stage.startsWith(key) || stage.includes(key.toLowerCase())));
  const video = stage.startsWith("Viewers");
  const steps = STAGES.filter(([key]) => (key !== "The explorer" || stage.startsWith("The explorer")) && (video ? key !== "Customers" : key !== "Viewers"));

  return (
    <section className="grid items-center gap-10 md:grid-cols-[1fr_1fr]" aria-live="polite">
      <div className="min-w-0">
        <p className="t-label flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
          live · {seconds}s
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{stage}</h1>
        <p className="mt-6 flex items-baseline gap-3">
          <span className="text-7xl font-semibold tracking-tight tabular-nums">{done}</span>
          <span className="text-xl text-faint tabular-nums">/ {total} {video ? "viewers" : "customers"}</span>
        </p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-8 space-y-3 text-sm">
          {steps.map(([key, label]) => {
            const i = STAGES.findIndex(([k]) => k === key);
            const state = i < at ? "done" : i === at ? "now" : "next";
            return (
              <li key={key} className={`flex items-center gap-3 ${state === "next" ? "text-faint" : "text-fg"}`}>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${state === "done" ? "border-fg bg-fg text-bg" : state === "now" ? "border-accent" : "border-line-strong"}`}
                  aria-hidden
                >
                  {state === "done" ? (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : state === "now" ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  ) : null}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="dash-panel rounded-2xl p-5 sm:p-6" aria-hidden>
        <div className="grid grid-cols-10 gap-[7px]">
          {Array.from({ length: shown }, (_, i) => (
            <span
              key={i}
              className={`aspect-square rounded-full transition-colors duration-500 ${i < lit ? "bg-white" : i < lit + 4 && done < total ? "crowd-next border border-accent" : "border border-line"}`}
            />
          ))}
        </div>
        <p className="mt-4 font-mono text-[11px] text-faint">{shown < total ? `each dot ≈ ${Math.round(total / shown)} customers` : "one dot = one simulated customer"}</p>
      </div>
    </section>
  );
}
