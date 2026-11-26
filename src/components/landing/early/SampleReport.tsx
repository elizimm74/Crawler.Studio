"use client";
// An interactive SAMPLE report for the early-access page. Every number here is ILLUSTRATIVE
// (a made-up site, "MealMate"), labelled as such on screen. It shows the shape of a real Crawler
// report: intent, objections, friction, persona feedback, audiences and ranked fixes.
import { useState } from "react";

const GREEN = "#02aa3d";
const TOTAL = 1000;

const TABS = ["Summary", "Objections", "Friction", "Personas", "Audiences", "Fixes"] as const;
type Tab = (typeof TABS)[number];

const INTENT = [
  { label: "Would buy", n: 200, color: GREEN },
  { label: "Maybe", n: 310, color: "#0b0b0c" },
  { label: "Would not", n: 490, color: "#c9c9c6" },
];

const OBJECTIONS = [
  { label: "Can't find the price", pct: 26, quote: "I scrolled twice and still don't know what it costs." },
  { label: "No proof it works", pct: 21, quote: "No reviews, no real people. Why would I trust it?" },
  { label: "Not clear what it does", pct: 18, quote: "Is this a recipe app or a grocery service?" },
  { label: "Sign-up asks too much", pct: 15, quote: "A full account before I've even seen it? No." },
  { label: "Happy with what I use now", pct: 11, quote: "My notes app already does this for free." },
];

const FUNNEL = [
  { step: "Landing page", left: 38, note: "Left within the first screen" },
  { step: "Pricing", left: 27, note: "Left after looking for the price" },
  { step: "Sign up", left: 15, note: "Left at the account form" },
];

const PERSONAS = [
  { who: "Priya, 34", tags: "Busy parent · phone · came from Instagram", verdict: "Maybe", text: "I like the weekly plan idea. I'd need to see the price before I give my email." },
  { who: "Marcus, 19", tags: "Student · tight budget · came from TikTok", verdict: "Would not", text: "Looked cool but there's no free option I can see. Closed it." },
  { who: "Dana, 45", tags: "Nurse · 10 seconds of patience · hidden price is a dealbreaker", verdict: "Would not", text: "If they hide the price, it's expensive. Not my thing." },
  { who: "Leo, 28", tags: "Early adopter · laptop · came from a friend", verdict: "Would buy", text: "Clean, fast, my friend uses it. I'd try the trial today." },
];

const AUDIENCES = [
  { label: "Early adopters", rate: 28 },
  { label: "Impulse buyers", rate: 25 },
  { label: "Busy people", rate: 21 },
  { label: "Price-checkers", rate: 20 },
  { label: "Skeptics", rate: 16 },
];

const FIXES = [
  { n: "01", title: "Show the price on the first screen", why: "Price was the #1 reason people left.", win: 90 },
  { n: "02", title: "Add real proof near the button", why: "Trust was the #2 reason, mostly from skeptics.", win: 70 },
  { n: "03", title: "Let people look before making an account", why: "15% left at the sign-up form.", win: 45 },
];

const VERDICT_STYLE: Record<string, string> = {
  "Would buy": "bg-[#02aa3d] text-[#052e16]",
  Maybe: "bg-black text-white",
  "Would not": "bg-[#e6e6e2] text-black",
};

export default function SampleReport() {
  const [tab, setTab] = useState<Tab>("Summary");

  return (
    <div className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_40px_80px_-50px_rgba(0,0,0,.35)]">
      {/* window bar */}
      <div className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-3">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        </div>
        <p className="truncate text-xs text-black/50">mealmate.app · {TOTAL.toLocaleString("en-US")} simulated customers</p>
        <span className="shrink-0 rounded-full border border-black/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-black/55">Illustrative</span>
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="Sample report sections" className="flex gap-1 overflow-x-auto border-b border-black/10 px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm transition ${tab === t ? "bg-black text-white" : "text-black/60 hover:bg-black/5 hover:text-black"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-[24rem] p-6 md:p-8">
        {tab === "Summary" && (
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/50">Purchase intent</p>
              <p className="mt-3 text-6xl font-semibold tracking-tight">20%</p>
              <p className="mt-2 text-black/60">200 of 1,000 simulated customers would buy.</p>
              <p className="mt-6 rounded-xl bg-[#f4f4f2] p-4 text-sm leading-relaxed text-black/75">
                Most people leave because they can&apos;t see the price or any proof. Fix those two first.
              </p>
            </div>
            <div className="grid content-start gap-4">
              {INTENT.map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm">
                    <span>{r.label}</span>
                    <span className="tabular-nums text-black/60">{r.n} · {Math.round((r.n / TOTAL) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.n / TOTAL) * 100}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Objections" && (
          <ol className="grid gap-4">
            {OBJECTIONS.map((o, i) => (
              <li key={o.label} className="grid gap-2 border-b border-black/10 pb-4 last:border-0 md:grid-cols-[2rem_1fr_auto] md:items-center md:gap-6">
                <span className="text-xs text-black/40">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-semibold">{o.label}</p>
                  <p className="mt-1 text-sm text-black/55">&ldquo;{o.quote}&rdquo;</p>
                </div>
                <span className="text-2xl font-semibold tabular-nums">{o.pct}%</span>
              </li>
            ))}
          </ol>
        )}

        {tab === "Friction" && (
          <div>
            <p className="text-sm text-black/60">Where simulated customers left, step by step.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {FUNNEL.map((f, i) => (
                <div key={f.step} className="rounded-xl border border-black/10 p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-black/45">Step {i + 1}</p>
                  <p className="mt-2 font-semibold">{f.step}</p>
                  <p className="mt-4 text-4xl font-semibold tabular-nums">{f.left}%</p>
                  <p className="mt-1 text-sm text-black/55">{f.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-black/55">The other 20% reached the end and said they would buy.</p>
          </div>
        )}

        {tab === "Personas" && (
          <div className="grid gap-4 md:grid-cols-2">
            {PERSONAS.map((p) => (
              <article key={p.who} className="rounded-xl border border-black/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.who}</p>
                    <p className="mt-1 text-xs text-black/50">{p.tags}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${VERDICT_STYLE[p.verdict]}`}>{p.verdict}</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-black/75">&ldquo;{p.text}&rdquo;</p>
              </article>
            ))}
          </div>
        )}

        {tab === "Audiences" && (
          <div>
            <p className="text-sm text-black/60">Buy rate by mindset.</p>
            <div className="mt-6 grid gap-4">
              {AUDIENCES.map((a) => (
                <div key={a.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-4 text-sm">
                  <span>{a.label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-black transition-all duration-700" style={{ width: `${a.rate * 3}%` }} />
                  </div>
                  <span className="text-right tabular-nums">{a.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Fixes" && (
          <ol className="grid gap-4">
            {FIXES.map((f) => (
              <li key={f.n} className="flex flex-col gap-4 rounded-xl border border-black/10 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                  <span className="text-xs text-black/40">{f.n}</span>
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-1 text-sm text-black/55">{f.why}</p>
                  </div>
                </div>
                <span className="shrink-0 self-start rounded-full px-3 py-1.5 text-xs font-semibold md:self-center" style={{ background: GREEN, color: "#052e16" }}>
                  Could win back {f.win}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="border-t border-black/10 px-6 py-3 text-xs text-black/45">Illustrative sample. A made-up site and made-up numbers, showing what a Crawler report contains.</p>
    </div>
  );
}
