"use client";
// "You receive": the report, drawn as a Crawler window with a "View as" switch underneath
// (Summary / Customers / Fixes / Fix prompt). DEMO DATA from the made-up MealMate example.
import { useState } from "react";
import AppWindow, { Props } from "./AppWindow";
import type { SampleData } from "@/components/landing/home/SampleReport";

const VIEWS = ["Summary", "Customers", "Fixes", "Fix prompt"] as const;

// a fair mix of decisions (yes / no / maybe, in turn), not just the first six rows
function mix<T extends { verdict: "buy" | "maybe" | "no" }>(people: T[]): T[] {
  const by = (v: T["verdict"]) => people.filter((p) => p.verdict === v);
  const lists = [by("buy"), by("no"), by("maybe")];
  const out: T[] = [];
  for (let i = 0; out.length < 6 && i < 6; i++) for (const l of lists) if (l[i] && out.length < 6) out.push(l[i]);
  return out;
}

export default function ReportWindow({ data }: { data: SampleData }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Summary");
  const pct = (n: number) => Math.round((n / data.total) * 100);
  return (
    <div>
      <AppWindow
        crumb={`${data.host} · Run 01`}
        title={`${data.host} — Report`}
        tabs={["Configuration", "Customers", "Report"]}
        active="Report"
        scene="dusk"
        side={<Props rows={[["Status", <span key="s" className="text-[#0b0b0a]">Completed</span>], ["Customers", data.total], ["Run", "01"], ["Data", "Demo"]]} files={["report.pdf", "fix-prompt.txt"]} />}
      >
        {view === "Summary" && (
          <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <div className="hidden text-[12px] text-faint sm:block">
              <p className="mb-2 uppercase tracking-[0.12em]">Contents</p>
              {["Summary", "Objections", "Fixes", "Customers"].map((c, i) => (
                <p key={c} className={`win-item ${i === 0 ? "on" : ""}`}>
                  {c}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[11px] text-faint">
                Generated from run 01 · {data.total} simulated customers · demo data
              </p>
              <p className="mt-2 text-[15px] leading-snug text-fg">
                {data.buy} of {data.total} would sign up. Most people leave because they can&apos;t see the price or any proof.
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-faint">Findings</p>
              <div className="mt-2 space-y-2">
                {data.objections.slice(0, 3).map((o, i) => (
                  <div key={o.category} className="win-card p-3">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="win-chip">0{i + 1}</span>
                      <span className="capitalize">{o.category}</span>
                      <span className="ml-auto win-num">{o.count} customers</span>
                    </div>
                    <div className="mt-2 grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 text-[11px] text-muted">
                      <span className="win-num">{o.pct}%</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-subtle">
                        <span className="block h-full rounded-full bg-[#000000]" style={{ width: `${o.pct}%` }} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {view === "Customers" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {mix(data.people).map((p, i) => (
              <div key={i} className="win-card p-3">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate">{p.label}</span>
                  <span className={`win-chip ${p.verdict === "buy" ? "!bg-[#000000] !text-[#ffffff]" : ""}`}>{p.verdict === "buy" ? "Would buy" : p.verdict === "maybe" ? "Maybe" : "No"}</span>
                </div>
                <p className="mt-2 text-[12.5px] text-muted">“{p.quote}”</p>
              </div>
            ))}
          </div>
        )}
        {view === "Fixes" && (
          <div className="space-y-2">
            {data.fixes.slice(0, 4).map((f, i) => (
              <div key={f.title} className="win-card flex items-start gap-3 p-3">
                <span className="win-chip">0{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-fg">{f.title}</p>
                  <p className="mt-1 text-[12px] text-muted">{f.change}</p>
                </div>
                <span className="win-chip">+{f.winBack}</span>
              </div>
            ))}
          </div>
        )}
        {view === "Fix prompt" && (
          <pre className="win-card overflow-hidden whitespace-pre-wrap p-3 font-mono text-[11.5px] leading-relaxed text-muted">
            {`I'm improving my website: ${data.host}.
I tested it with Crawler: ${data.buy} of ${data.total} simulated customers said they would sign up.
(AI-simulated customers: a strong hint, not proof.)

## Fix 1: ${data.fixes[0]?.title ?? ""}
Change: ${data.fixes[0]?.change ?? ""}

## Rules
- Keep everything true. Do NOT invent testimonials, reviews or numbers.`}
          </pre>
        )}
      </AppWindow>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="t-label">View as</span>
        <div className="seg" role="tablist" aria-label="View the report as">
          {VIEWS.map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-faint">
        Demo data from a made-up site. Buy rate {pct(data.buy)}% · {data.total} simulated customers.
      </p>
    </div>
  );
}
