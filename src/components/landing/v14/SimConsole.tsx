"use client";
// THE HERO'S PRODUCT PREVIEW: a drawing of Crawler running a simulation, with demo data.
// One simulated customer at a time "visits" a small sketch of the demo website (MealMate):
// the scan moves to the part of the page that stopped them (first screen / pricing / signup),
// their thought appears, they decide, and the live tally + objections + report build up.
// Everything is DEMO data from the made-up MealMate example (src/lib/homeDemo.ts), labelled so.
// Reduced motion / "Calmer motion": shows the finished state, no animation.
import { useEffect, useState } from "react";
import type { SimCustomer } from "@/lib/homeDemo";

type Props = {
  host: string;
  total: number;
  buy: number;
  maybe: number;
  no: number;
  sim: SimCustomer[];
  objections: { category: string; pct: number }[];
  topFix: string;
  winBack: number;
};

const STEP_LABEL: Record<string, string> = { hero: "First screen", pricing: "Pricing", product: "Trying it", signup: "Signup", none: "Signed up" };
const VERDICT = { buy: "Would buy", maybe: "Maybe", no: "Left" } as const;
const TICK = 1700; // ms per customer

export default function SimConsole(p: Props) {
  // i = which customer is visiting; i === sim.length means "done, report ready"
  const n = p.sim.length;
  const [i, setI] = useState(n);
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.calm;
    if (calm) return;
    setI(0);
    const t = setInterval(() => setI((x) => (x >= n + 2 ? 0 : x + 1)), TICK);
    return () => clearInterval(t);
  }, [n]);

  const step = Math.min(i, n);
  const done = i >= n;
  const now = done ? null : p.sim[i];
  // the tally grows with progress toward the demo run's real totals
  const progress = done ? 1 : (i + 0.5) / n;
  const shown = (x: number) => Math.round(x * progress);
  const seen = shown(p.total);
  const focus = now?.lostAt ?? "none";

  return (
    <div className="sim" aria-label="Example: a simulation running on a made-up website (demo data)" role="img">
      {/* window bar */}
      <div className="sim-bar">
        <span className="sim-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="truncate text-[12px] text-faint">
          Simulations <span className="mx-1">/</span> <span className="text-fg">{p.host}</span>
        </span>
        <span className={`sim-status ${done ? "is-done" : ""}`}>
          <i aria-hidden />
          {done ? "Report ready" : `Simulating ${seen}/${p.total}`}
        </span>
      </div>

      <div className="sim-grid">
        {/* customers */}
        <div className="sim-col sim-people">
          <p className="sim-label">Simulated customers</p>
          <ul className="mt-3 space-y-1.5">
            {p.sim.map((c, k) => {
              const state = k < step ? "decided" : k === step && !done ? "active" : "waiting";
              return (
                <li key={k} className={`sim-person is-${state}`}>
                  <span className={`sim-avatar v-${c.verdict}`} aria-hidden>
                    {c.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">{c.label}</span>
                    <span className="block truncate text-[11px] text-faint">
                      {c.budget} budget · {c.mindset}
                    </span>
                  </span>
                  <span className={`sim-tag v-${c.verdict}`}>{state === "decided" ? VERDICT[c.verdict] : state === "active" ? "Visiting" : ""}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-faint">+ {p.total - n} more, each with their own budget, mindset and reason for visiting.</p>
        </div>

        {/* the website they're visiting */}
        <div className="sim-col sim-stage">
          <div className="flex items-center justify-between">
            <p className="sim-label">{now ? `${now.label} is visiting` : "All customers finished"}</p>
            <p className="text-[11px] text-faint">{now ? `came from ${now.from}` : "demo data"}</p>
          </div>
          <div className="sim-site" aria-hidden>
            <div className="sim-site-nav">
              <b>{p.host.split(".")[0]}</b>
              <span />
              <span />
              <span className="sim-site-btn" />
            </div>
            <div className={`sim-zone ${focus === "hero" ? "is-focus" : ""}`}>
              <span className="sim-line w-[70%] h-3" />
              <span className="sim-line w-[52%]" />
              <span className="sim-line w-[34%] sim-cta" />
            </div>
            <div className={`sim-zone sim-zone-row ${focus === "pricing" ? "is-focus" : ""}`}>
              {[0, 1, 2].map((k) => (
                <span key={k} className="sim-price">
                  <span className="sim-line w-[60%]" />
                  <span className="sim-line w-[40%] h-3" />
                </span>
              ))}
            </div>
            <div className={`sim-zone ${focus === "signup" ? "is-focus" : ""}`}>
              <span className="sim-line w-full h-6 rounded-md" />
              <span className="sim-line w-full h-6 rounded-md" />
              <span className="sim-line w-[40%] h-6 rounded-md sim-cta" />
            </div>
            {now && <span className={`sim-cursor at-${focus}`} />}
          </div>
          <div className="sim-thought" key={i}>
            {now ? (
              <>
                <span className={`sim-tag v-${now.verdict}`}>{now.verdict === "buy" ? "Would buy" : `Stopped at: ${STEP_LABEL[now.lostAt] ?? now.lostAt}`}</span>
                <span className="mt-2 block text-[14px] leading-snug text-fg">&ldquo;{now.quote}&rdquo;</span>
              </>
            ) : (
              <>
                <span className="sim-tag v-buy">Report ready</span>
                <span className="mt-2 block text-[14px] leading-snug text-fg">
                  Biggest blocker: <b className="capitalize">{p.objections[0]?.category}</b>. Fix #1: {p.topFix} <span className="text-accent-ink">(+{p.winBack} could buy)</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* live results */}
        <div className="sim-col sim-results">
          <p className="sim-label">Live results</p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="sim-big">{shown(p.buy)}</span>
            <span className="text-sm text-faint">/ {p.total} would buy</span>
          </p>
          <div className="sim-stack" aria-hidden>
            <i className="v-buy" style={{ width: `${(shown(p.buy) / p.total) * 100}%` }} />
            <i className="v-maybe" style={{ width: `${(shown(p.maybe) / p.total) * 100}%` }} />
            <i className="v-no" style={{ width: `${(shown(p.no) / p.total) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-faint">
            <span>{shown(p.buy)} buy</span>
            <span>{shown(p.maybe)} maybe</span>
            <span>{shown(p.no)} no</span>
          </div>
          <p className="sim-label mt-6">Why they didn&apos;t buy</p>
          <ul className="mt-3 space-y-3">
            {p.objections.slice(0, 3).map((o) => (
              <li key={o.category}>
                <div className="flex justify-between text-[12px]">
                  <span className="capitalize text-fg">{o.category}</span>
                  <span className="text-faint">{Math.round(o.pct * progress)}%</span>
                </div>
                <div className="sim-meter">
                  <i style={{ width: `${o.pct * progress}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="sim-foot">Demo data from a made-up website. Simulated customers, simulated buying intent.</p>
    </div>
  );
}
