"use client";
// The home page's interactive SAMPLE REPORT. The data is the made-up "MealMate" example
// (src/lib/example.ts), counted by the real report code, and it's marked DEMO DATA everywhere.
import { useState } from "react";
import Link from "next/link";

export type SampleData = {
  host: string;
  total: number;
  buy: number;
  maybe: number;
  no: number;
  segments: { label: string; rows: { value: string; n: number; buyRate: number }[] }[];
  objections: { category: string; count: number; pct: number; example: string }[];
  strengths: string[];
  fixes: { title: string; problem: string; change: string; winBack: number; priority: string }[];
  people: { label: string; verdict: "buy" | "maybe" | "no"; quote: string; reason: string; motive: string }[];
};

const TABS = ["Overview", "Customers", "Objections", "Fixes"] as const;
const PILL = { buy: "pill-buy", maybe: "pill-maybe", no: "pill-no" } as const;
const WORD = { buy: "Would buy", maybe: "Might buy", no: "Wouldn't buy" } as const;

export default function SampleReport({ data }: { data: SampleData }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [filter, setFilter] = useState<"all" | "buy" | "maybe" | "no">("all");
  const pct = (n: number) => Math.round((n / data.total) * 100);
  const people = data.people.filter((p) => filter === "all" || p.verdict === filter);

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-medium">{data.host}</p>
          <p className="text-xs text-muted">Simulated purchase intent · {data.total} simulated customers</p>
        </div>
        <span className="demo-tag">Demo data · not a real customer</span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line px-3" role="tablist" aria-label="Sample report sections">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm transition-colors ${tab === t ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6" role="tabpanel" aria-label={tab}>
        {tab === "Overview" && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="t-label">overall simulated purchase intent</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight">
                <span className="text-accent">{data.buy}</span>
                <span className="text-2xl text-muted"> / {data.total} would sign up</span>
              </p>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${data.buy} would buy, ${data.maybe} might, ${data.no} wouldn't`}>
                <span className="bg-accent" style={{ width: `${pct(data.buy)}%` }} />
                <span className="bg-white/40" style={{ width: `${pct(data.maybe)}%` }} />
                <span className="bg-white/10" style={{ width: `${pct(data.no)}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <Stat k="Would buy" v={`${data.buy} · ${pct(data.buy)}%`} />
                <Stat k="Might buy" v={`${data.maybe} · ${pct(data.maybe)}%`} />
                <Stat k="Wouldn't" v={`${data.no} · ${pct(data.no)}%`} />
              </dl>
              <p className="t-label mt-6">what worked</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {data.strengths.map((s) => (
                  <li key={s} className="text-muted">
                    <span className="text-fg">+</span> “{s}”
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-5">
              {data.segments.map((seg) => (
                <div key={seg.label}>
                  <p className="t-label">buy rate by {seg.label}</p>
                  <ul className="mt-2 space-y-1.5">
                    {seg.rows.map((r) => (
                      <li key={r.value} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                        <span className="truncate text-muted">{r.value}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(r.buyRate * 100)}%` }} />
                        </span>
                        <span className="text-right font-mono text-xs">{Math.round(r.buyRate * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Customers" && (
          <div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by decision">
              {(["all", "buy", "maybe", "no"] as const).map((f) => (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className="chip">
                  {f === "all" ? `All (${data.people.length})` : `${WORD[f]} (${data.people.filter((p) => p.verdict === f).length})`}
                </button>
              ))}
            </div>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {people.map((p, i) => (
                <li key={i} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{p.label}</span>
                    <span className={`pill ${PILL[p.verdict]} shrink-0`}>{WORD[p.verdict]}</span>
                  </div>
                  <p className="mt-2 text-sm">“{p.quote}”</p>
                  <p className="mt-2 text-xs text-muted">
                    <span className="text-faint">Here for:</span> {p.motive}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    <span className="text-faint">{p.verdict === "buy" ? "Small worry:" : "Why not:"}</span> {p.reason}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "Objections" && (
          <ul className="space-y-3">
            {data.objections.map((o) => (
              <li key={o.category} className="rounded-xl border border-line p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium capitalize">{o.category}</span>
                  <span className="font-mono text-sm">
                    {o.count} customers · {o.pct}% of non-buyers
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${o.pct}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">“{o.example}”</p>
              </li>
            ))}
          </ul>
        )}

        {tab === "Fixes" && (
          <ol className="space-y-3">
            {data.fixes.map((f, i) => (
              <li key={f.title} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-accent">0{i + 1}</span>
                  <span className="font-medium">{f.title}</span>
                  <span className="pill ml-auto">{f.priority}</span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  <span className="text-faint">Problem:</span> {f.problem}
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-faint">Fix:</span> {f.change}
                </p>
                <p className="mt-2 text-xs text-muted">Could win back about {f.winBack} of {data.total} simulated customers.</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-sm">
        <span className="text-muted">Made-up site, made-up customers, counted by the real report code.</span>
        <Link href="/example" className="btn btn-secondary h-11 px-4 text-sm">
          Open the full sample report
        </Link>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-2.5">
      <dt className="text-xs text-faint">{k}</dt>
      <dd className="mt-0.5 font-mono text-sm">{v}</dd>
    </div>
  );
}
