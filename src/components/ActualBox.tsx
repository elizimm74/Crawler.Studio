"use client";
// "Did you launch this? Tell us what really happened." The founder enters their
// REAL conversion rate; it goes (anonymously) on the public /accuracy page next
// to Crawler's prediction. That track record is how we earn trust.
import { useState } from "react";

export default function ActualBox({ testId, kind }: { testId: string; kind: "website" | "app" | "video" }) {
  const [value, setValue] = useState("");
  const [visitors, setVisitors] = useState("");
  const [days, setDays] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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
        <p className="mt-4 rounded-lg border border-line-strong bg-subtle p-4 text-sm">Thank you. That helps make Crawler more honest.</p>
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
