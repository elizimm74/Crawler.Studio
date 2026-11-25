"use client";
// THE HOME PAGE'S INTERACTIVE SAMPLE REPORT (founder's merge brief, 2026-11-25: "a detailed,
// interactive sample report: purchase intent, objections, conversion friction, persona-level
// feedback, audience breakdown, recommended improvements; sample data clearly labelled").
// Six tabs, all fed by the made-up MealMate demo run (src/lib/homeDemo.ts), which is produced by
// the REAL counting code, so the numbers add up exactly like a real report. Labelled "illustrative".
import { useState } from "react";
import type { SampleData } from "@/components/landing/home/SampleReport";
import type { FunnelRow } from "@/lib/homeDemo";

const TABS = ["Purchase intent", "Objections", "Friction", "Personas", "Audience", "Recommendations"] as const;
type Tab = (typeof TABS)[number];
const VERDICT = { buy: "Would buy", maybe: "Maybe", no: "Wouldn't buy" } as const;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export default function ReportLab({ data, funnel }: { data: SampleData; funnel: FunnelRow[] }) {
  const [tab, setTab] = useState<Tab>("Purchase intent");
  const [who, setWho] = useState<"all" | "buy" | "maybe" | "no">("all");
  const lostTotal = funnel.reduce((a, r) => a + r.lost, 0);
  const worst = [...funnel].sort((a, b) => b.lost - a.lost)[0];
  const people = data.people.filter((p) => who === "all" || p.verdict === who);

  return (
    <div className="rl">
      {/* the report's own header, like the real one */}
      <div className="rl-top">
        <div className="min-w-0">
          <p className="rl-kicker">Sample report · illustrative data</p>
          <p className="truncate text-lg font-semibold tracking-tight">{data.host} · Run 01</p>
        </div>
        <p className="rl-meta">
          {data.total} simulated customers · demo site, not a real company
        </p>
      </div>

      <div className="rl-tabs" role="tablist" aria-label="Sample report sections">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} aria-controls="rl-panel" id={`rl-${t}`} onClick={() => setTab(t)} className="rl-tab">
            {t}
          </button>
        ))}
      </div>

      <div id="rl-panel" role="tabpanel" aria-labelledby={`rl-${tab}`} className="rl-body" key={tab}>
        {tab === "Purchase intent" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <p className="rl-big">
                {data.buy}
                <span>/{data.total}</span>
              </p>
              <p className="mt-2 text-[15px] font-medium">would sign up</p>
              <p className="mt-3 max-w-sm text-sm text-[#45443f]">Most people leave because they can&apos;t see the price or any proof. That&apos;s simulated buying intent, not a forecast of real sales.</p>
            </div>
            <div>
              <div className="rl-stack" aria-hidden>
                <i className="is-buy" style={{ width: `${pct(data.buy, data.total)}%` }} />
                <i className="is-maybe" style={{ width: `${pct(data.maybe, data.total)}%` }} />
                <i className="is-no" style={{ width: `${pct(data.no, data.total)}%` }} />
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["buy", data.buy],
                    ["maybe", data.maybe],
                    ["no", data.no],
                  ] as const
                ).map(([k, n]) => (
                  <li key={k} className="rl-cell">
                    <span className={`rl-dot is-${k}`} aria-hidden />
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{n}</p>
                    <p className="text-xs text-[#56554f]">
                      {VERDICT[k]} · {pct(n, data.total)}%
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "Objections" && (
          <ul className="space-y-4">
            {data.objections.map((o, i) => (
              <li key={o.category} className="rl-row">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium capitalize">
                    <span className="rl-n">0{i + 1}</span> {o.category}
                  </p>
                  <p className="shrink-0 text-sm tabular-nums text-[#45443f]">
                    {o.count} customers · {o.pct}% of non-buyers
                  </p>
                </div>
                <div className="rl-bar mt-2" aria-hidden>
                  <i style={{ width: `${o.pct}%` }} />
                </div>
                {o.example && <p className="mt-2 text-sm italic text-[#45443f]">&ldquo;{o.example}&rdquo;</p>}
              </li>
            ))}
          </ul>
        )}

        {tab === "Friction" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ol className="space-y-4">
              {funnel.map((r, i) => (
                <li key={r.step} className="rl-row">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium">
                      <span className="rl-n">Step {i + 1}</span> {r.label}
                    </p>
                    <p className="text-sm tabular-nums text-[#45443f]">{r.lost} left here</p>
                  </div>
                  <div className="rl-bar mt-2" aria-hidden>
                    <i style={{ width: `${pct(r.lost, lostTotal)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
            {worst && (
              <div className="rl-callout">
                <p className="rl-kicker">Biggest drop</p>
                <p className="mt-2 text-xl font-semibold tracking-tight">{worst.label}</p>
                <p className="mt-2 text-sm text-[#45443f]">
                  {worst.lost} of the {lostTotal} customers who didn&apos;t buy stopped here. Fix this step first.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "Personas" && (
          <div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter customers">
              {(["all", "buy", "maybe", "no"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)} className="chip">
                  {k === "all" ? "Everyone" : VERDICT[k]}
                </button>
              ))}
            </div>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {people.slice(0, 6).map((p, i) => (
                <li key={i} className="rl-cell">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium capitalize">{p.label}</p>
                    <span className={`rl-chip is-${p.verdict}`}>{VERDICT[p.verdict]}</span>
                  </div>
                  <p className="mt-3 text-[15px] leading-snug">&ldquo;{p.quote}&rdquo;</p>
                  <dl className="mt-3 space-y-1 text-xs text-[#56554f]">
                    <div>
                      <dt className="inline font-medium text-[#0b0b0a]">Why they came: </dt>
                      <dd className="inline">{p.motive}</dd>
                    </div>
                    {p.verdict !== "buy" && (
                      <div>
                        <dt className="inline font-medium text-[#0b0b0a]">What stopped them: </dt>
                        <dd className="inline">{p.reason}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "Audience" && (
          <div className="grid gap-8 md:grid-cols-2">
            {data.segments.map((seg) => (
              <div key={seg.label}>
                <p className="rl-kicker">Buy rate by {seg.label}</p>
                <ul className="mt-4 space-y-3">
                  {seg.rows.map((r) => (
                    <li key={r.value} className="grid grid-cols-[8rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                      <span className="truncate capitalize">{r.value}</span>
                      <span className="rl-bar" aria-hidden>
                        <i style={{ width: `${Math.round(r.buyRate * 100)}%` }} />
                      </span>
                      <span className="text-right tabular-nums text-[#45443f]">{Math.round(r.buyRate * 100)}%</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[#56554f]">Groups of 3 or more customers only.</p>
              </div>
            ))}
          </div>
        )}

        {tab === "Recommendations" && (
          <ol className="space-y-3">
            {data.fixes.slice(0, 4).map((f, i) => (
              <li key={f.title} className="rl-fix">
                <span className="rl-rank" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold tracking-tight">{f.title}</p>
                    <span className="rl-chip">{f.priority}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#45443f]">{f.problem}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Do this: </span>
                    {f.change}
                  </p>
                </div>
                <span className="rl-win" title="Simulated customers this fix could win back">
                  +{f.winBack}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="rl-foot">Illustrative sample from a made-up site (MealMate), counted by Crawler&apos;s real report code. Your report uses your pages and your audience.</p>
    </div>
  );
}
