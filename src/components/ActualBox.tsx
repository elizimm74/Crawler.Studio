"use client";
// "Did you launch this? Tell us what really happened." The founder enters their
// REAL conversion rate; it goes (anonymously) on the public /accuracy page next
// to Crawler's prediction. That track record is how we earn trust.
// ENGINE v2: saving it also CALIBRATES: the worker refits the same simulated crowd to the real rate
// (src/worker/calibrate.ts), and this box shows predicted vs real side by side when that's done.
import { useEffect, useState } from "react";
import { deltaInWords, MARGIN_PP, MIN_VISITORS } from "@/lib/calibration";

type CalRow = {
  stated_pct: number | null;
  raw_pct: number | null;
  shown_pct: number | null;
  loo_pct: number | null;
  real_pct: number;
  visitors: number | null;
  site_delta: number | null;
  error_pp: number | null;
  within_margin: boolean | null;
  used_in_fit: boolean;
};
type CalState = { n: number; accuracy?: { n?: number; withinPct?: number | null; medianErrorPp?: number | null } };

export default function ActualBox({ testId, kind }: { testId: string; kind: "website" | "app" | "video" }) {
  const [value, setValue] = useState("");
  const [visitors, setVisitors] = useState("");
  const [days, setDays] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cal, setCal] = useState<{ row: CalRow | null; state: CalState | null } | null>(null);

  // After saving, wait for the worker to calibrate (usually a few seconds), then show the comparison.
  useEffect(() => {
    if (state !== "done") return;
    let stop = false;
    let tries = 0;
    const tick = async () => {
      tries++;
      try {
        const res = await fetch(`/api/tests/${testId}/calibration`, { cache: "no-store" });
        const d = await res.json();
        if (!stop && d.row) return setCal(d);
      } catch {}
      if (!stop && tries < 30) setTimeout(tick, 2000);
      else if (!stop) setCal({ row: null, state: null });
    };
    tick();
    return () => {
      stop = true;
    };
  }, [state, testId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/actual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realPct: Number(value), visitors: visitors ? Number(visitors) : undefined, days: days ? Number(days) : undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <section id="actual" className="card scroll-mt-32 p-6 sm:p-8" aria-labelledby="actual-title">
      <h2 id="actual-title" className="t-h3">
        Launched it? Tell us what really happened
      </h2>
      <p className="mt-1 text-sm text-muted">
        {kind === "app"
          ? "What share of people who installed your app really started a trial or subscribed?"
          : "What share of your real visitors really signed up or bought?"}{" "}
        We show predictions next to real results, anonymously, on the{" "}
        <a href="/accuracy" className="underline">
          accuracy page
        </a>
        .
      </p>
      {state === "done" ? (
        <div className="mt-4 rounded-lg border border-line-strong bg-subtle p-4 text-sm">
          <p>Thank you. That helps make Crawler more honest.</p>
          {!cal && <p className="mt-2 text-muted" aria-live="polite">Calibrating the same simulated crowd to your real result…</p>}
          {cal && !cal.row && (
            <p className="mt-2 text-muted">Saved. The comparison will appear here once our test machine has processed it (refresh in a minute).</p>
          )}
          {cal?.row && <Comparison row={cal.row} state={cal.state} />}
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-col flex-wrap gap-2 sm:flex-row">
          <label htmlFor="actual-input" className="sr-only">
            Real conversion rate in percent
          </label>
          <div className="relative sm:w-48">
            <input
              id="actual-input"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 4.5"
              className="field h-12 pr-10"
              required
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">%</span>
          </div>
          <label htmlFor="actual-visitors" className="sr-only">
            Real visitors counted (optional)
          </label>
          <input id="actual-visitors" type="number" min={1} step="1" value={visitors} onChange={(e) => setVisitors(e.target.value)} placeholder="visitors (optional)" className="field h-12 sm:w-44" />
          <label htmlFor="actual-days" className="sr-only">
            Over how many days (optional)
          </label>
          <input id="actual-days" type="number" min={1} step="1" value={days} onChange={(e) => setDays(e.target.value)} placeholder="days (optional)" className="field h-12 sm:w-36" />
          <button className="btn btn-secondary h-12 px-6" disabled={state === "busy" || !value} aria-busy={state === "busy"}>
            {state === "busy" ? "Saving…" : "Save my real result"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm">
          <span className="font-medium">Heads up: </span>
          {error}
        </p>
      )}
    </section>
  );
}

// Predicted vs real, side by side, and what calibration learned from it.
function Comparison({ row, state }: { row: CalRow; state: CalState | null }) {
  const f = (x: number | null | undefined) => (x === null || x === undefined ? "–" : `${Number(x).toFixed(1)}%`);
  const enough = (row.visitors ?? 0) >= MIN_VISITORS;
  return (
    <div className="mt-4" aria-live="polite">
      <div className="grid gap-2 sm:grid-cols-3">
        <Cell label="Real result" value={f(row.real_pct)} strong />
        <Cell label="Crawler predicted" value={f(row.shown_pct ?? row.raw_pct)} />
        <Cell label="Simulated customers said yes" value={f(row.stated_pct)} />
      </div>
      {row.site_delta !== null && (
        <p className="mt-3 text-muted">
          Against your real result, this crowd was <strong className="text-fg">{deltaInWords(Number(row.site_delta))}</strong>.{" "}
          {enough
            ? "Your next tests of this site are calibrated with it, and it now counts toward Crawler's public accuracy."
            : `It's shown on the accuracy page, but results from fewer than ${MIN_VISITORS} visitors aren't used to calibrate (too noisy). Add the visitor count if you have it.`}
        </p>
      )}
      {row.loo_pct !== null && row.used_in_fit && (
        <p className="mt-2 text-muted">
          Predicted by a calibration that never saw your result: {f(row.loo_pct)}, {row.within_margin ? "within" : "outside"} our ±{MARGIN_PP}-point margin.
        </p>
      )}
      {state?.accuracy?.n ? (
        <p className="mt-2 text-xs text-faint">
          Across {state.accuracy.n} real results: {state.accuracy.withinPct}% within ±{MARGIN_PP} points, median miss {state.accuracy.medianErrorPp} points.
        </p>
      ) : null}
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${strong ? "border-line-strong bg-bg" : "border-line"}`}>
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
