"use client";
// The report for a VIDEO test, ordered by importance:
//   1. The answer: how many simulated viewers would tap through, the hook, the summary
//   2. The watch curve: who's still watching at every frame (with the frames under it)
//   3. View range + deal check (only with the account's real recent views; clearly labelled)
//   4. Will it spread? Fixes, new hooks, why people swiped, their comments, who taps
// Every number is counted in code (src/lib/video/aggregate.ts); the advice text is written by Sonnet.
import { FixProgress, FixStatusProvider, FixStatusSelect } from "@/components/report/FixStatus";
import PrintButton from "@/components/report/PrintButton";
import { priorityFor } from "@/lib/priority";
import { useMemo, useState } from "react";
import CopyFixPrompt from "@/components/report/CopyFixPrompt";
import QualityNote from "@/components/QualityNote";
import ShareBox from "@/components/ShareBox";
import ReportShell from "@/components/report/ReportShell";
import ReportRevenue from "@/components/report/ReportRevenue";
import NextSteps from "@/components/report/NextSteps";
import { fileUrl } from "@/lib/urls";
import type { VideoRun } from "@/lib/video/pipeline";
import { dealCheck, REAL_TAP_SHARE, SIGNAL_WEIGHTS, TYPICAL_SIGNAL, type Range } from "@/lib/video/aggregate";
import { PLACEMENT_LABEL } from "@/lib/video/types";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const rangeText = (r: Range) => (Math.round(r.low * 100) === Math.round(r.high * 100) ? pct(r.mid) : `${pct(r.low)}–${pct(r.high)}`);
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));
const money = (n: number) => (n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`);

export default function VideoReport({ run, demo = false }: { run: VideoRun & { filesPrefix?: string }; demo?: boolean }) {
  const stats = run.stats!;
  const advice = run.advice!;
  const s = run.settings;
  const img = (file: string) => (demo ? file : fileUrl(run.framesPrefix, file));
  const taps = Math.round(stats.tap.mid * stats.perSample);
  const [allComments, setAllComments] = useState(false);
  const [target, setTarget] = useState(10);
  const deal = useMemo(() => dealCheck(s.price, run.views ?? null, stats, target), [s.price, run.views, stats, target]);
  const beatFile = (n: number) => s.beats[n - 1]?.file;
  // couldWin adds up all crowds: divide by the number of crowds so it matches "of 100"
  const perCrowd = (n: number) => Math.round(n / Math.max(1, stats.samples));
  const fixWins = advice.fixes.slice(0, 3).reduce((n, f) => n + perCrowd(f.couldWin), 0);
  const sections = [
    { id: "answer", label: "Answer" },
    { id: "curve", label: "Watch curve" },
    { id: "views", label: "Views + deal" },
    { id: "fixes", label: "Fixes" },
    ...(demo ? [] : [{ id: "revenue", label: "Revenue" }, { id: "next", label: "Next steps" }, { id: "share", label: "Share" }]),
  ];

  return (
    <FixStatusProvider testId={run.id} demo={demo}>
    <ReportShell wide sections={sections}>
      {/* ---------- 1. The answer ---------- */}
      <section id="answer" className="gpanel dash-hero-glass dash-rise relative scroll-mt-32 overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="relative grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <p className="t-label">
              video test · {s.platform} · {PLACEMENT_LABEL[s.placement].toLowerCase()} · {stats.samples} crowds of {stats.perSample}
            </p>
            <p className="mt-6 flex flex-wrap items-baseline gap-x-4">
              <span className="text-7xl font-semibold tracking-tight tabular-nums sm:text-8xl">{taps}</span>
              <span className="text-2xl text-faint tabular-nums">/ {stats.perSample}</span>
            </p>
            <p className="mt-2 text-xl font-medium">simulated viewers would tap through to your product</p>
            <p className="mt-1 text-sm text-faint">range across 3 crowds: {rangeText(stats.tap)} · simulated intent, not real clicks</p>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">{advice.summary}</p>
            {!demo && (
              <a href="#share" className="btn btn-secondary mt-8 h-11 px-5 text-sm">
                Send this score
              </a>
            )}
          </div>
          <PhoneHook src={img(s.beats[0]?.file ?? "")} hook={stats.hook} />
        </div>
      </section>

      {/* ---------- 2. Four numbers ---------- */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="stopped scrolling" value={pct(stats.hook.mid)} sub={rangeText(stats.hook)} bar={stats.hook.mid} />
        <Tile label="watched to the end" value={pct(stats.finish.mid)} sub={`avg ${pct(stats.avgWatchPct)} of the video`} bar={stats.finish.mid} />
        <Tile label="would share it" value={pct(stats.share.mid)} sub={rangeText(stats.share)} bar={stats.share.mid} />
        <Tile label="would try the product" value={pct(stats.tryIt.mid)} sub={rangeText(stats.tryIt)} bar={stats.tryIt.mid} />
      </section>

      {/* ---------- 3. The watch curve ---------- */}
      <section id="curve" className="scroll-mt-32">
        <Head label="the watch curve" title="Where they swiped away" sub="Share of all viewers still watching after each frame." />
        <div className="gpanel mt-6 rounded-2xl p-4 sm:p-6">
          <WatchCurve run={run} img={img} />
        </div>
      </section>

      {/* ---------- 4. Views + deal ---------- */}
      <section id="views" className="grid scroll-mt-32 gap-4 md:grid-cols-2">
        <div className="gpanel rounded-2xl p-6">
          <p className="t-label">estimated views</p>
          {run.views ? (
            <>
              <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">{compact(run.views.likely)}</p>
              <p className="mt-1 text-sm text-muted">
                likely · range {compact(run.views.low)}–{compact(run.views.high)}
              </p>
              <RangeBar low={run.views.low} likely={run.views.likely} high={run.views.high} usual={run.views.usual} />
              <p className="mt-5 text-sm">
                <span className="rounded-full border border-line-strong px-2.5 py-1 text-xs">{run.views.verdict}</span>
                <span className="ml-2 text-muted">
                  ×{run.views.multiplier} vs the account&apos;s usual {compact(run.views.usual)} (median of {run.views.basedOn} videos)
                </span>
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Add the posting account&apos;s recent views when you set up a test, and we&apos;ll turn this into a view range for that account.
            </p>
          )}
          <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-faint">
            A rough estimate, not a prediction: it scales the account&apos;s usual views by how well the simulated viewers stopped, watched and shared
            (weights {SIGNAL_WEIGHTS.hook}/{SIGNAL_WEIGHTS.finish}/{SIGNAL_WEIGHTS.share}, typical = {TYPICAL_SIGNAL}, our assumptions). Algorithms and timing can make any
            video do far better or worse.
          </p>
        </div>

        <div className="gpanel rounded-2xl p-6">
          <p className="t-label">deal check</p>
          {deal ? (
            <>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <p className="text-5xl font-semibold tracking-tight tabular-nums">{money(deal.cpm.likely)}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${deal.verdict === "good deal" ? "bg-accent text-white" : "border border-line-strong"}`}>{deal.verdict}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                per 1,000 views for {money(deal.price)} · best {money(deal.cpm.best)}, worst {money(deal.cpm.worst)}
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
                <Mini label="visitors" value={compact(deal.visitors.likely)} />
                <Mini label="per visitor" value={deal.perVisitor ? money(deal.perVisitor) : "—"} />
                <Mini label="would try it" value={compact(deal.tries)} />
              </dl>
              <label className="mt-6 flex items-center justify-between gap-3 text-sm text-muted">
                Your target per 1,000 views
                <span className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">$</span>
                  <input type="number" min={1} step={1} value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} className="field h-10 w-24 pl-6 text-sm" />
                </span>
              </label>
              <p className="mt-4 text-xs leading-relaxed text-faint">
                Visitors count 1 in {Math.round(1 / REAL_TAP_SHARE)} simulated taps as a real visit (people say they&apos;d tap far more than they do; our assumption).
                Change your target to compare with what you pay for ads.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">
              {s.placement === "organic"
                ? "Your own post costs nothing to run, so there's no deal to check. Test a creator post or an ad to compare prices."
                : "Add the creator's price (or your ad budget) and their recent views to see cost per 1,000 views and per visitor."}
            </p>
          )}
        </div>
      </section>

      {/* ---------- 5. Will it spread? ---------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <Reasons title="Why it could spread" items={advice.spreads} mark="+" />
        <Reasons title="Why it could stall" items={advice.stalls} mark="−" />
      </section>

      {/* ---------- 6. Fixes ---------- */}
      <section id="fixes" className="scroll-mt-32">
        <Head label="edit these first" title="Ranked fixes" sub="Ordered by how many simulated viewers each could win back." />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <FixProgress titles={advice.fixes.map((f) => f.title)} />
          <PrintButton />
        </div>
        <ol className="mt-6 space-y-3">
          {advice.fixes.map((f, i) => (
            <li key={i} className="card grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5">
              {f.frame > 0 && beatFile(f.frame) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img(beatFile(f.frame)!)} alt={`Frame ${f.frame}`} className="h-24 w-14 rounded-lg border border-line object-cover" />
              ) : (
                <span className="flex h-24 w-14 items-center justify-center rounded-lg border border-line font-mono text-xs text-faint">all</span>
              )}
              <div className="min-w-0">
                <p className="t-label">
                  0{i + 1}
                  {f.frame > 0 ? ` · frame ${f.frame} · ${s.beats[f.frame - 1]?.t.toFixed(1)}s` : " · whole video"}
                </p>
                <p className="mt-1 font-medium">{f.title}</p>
                <p className="mt-1 text-sm text-muted">{f.problem}</p>
                <p className="mt-2 text-sm">{f.change}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`pill prio prio-${priorityFor(Math.round(f.couldWin / Math.max(1, stats.samples)), stats.perSample).toLowerCase()}`}>
                    {priorityFor(Math.round(f.couldWin / Math.max(1, stats.samples)), stats.perSample)}
                  </span>
                  <FixStatusSelect title={f.title} />
                </div>
              </div>
              <p className="col-span-2 text-sm text-muted sm:col-span-1 sm:text-right">
                {/* couldWin adds up all crowds: show it per crowd, like every other number on this page */}
                <span className="text-2xl font-semibold text-fg tabular-nums">+{Math.round(f.couldWin / Math.max(1, stats.samples))}</span>
                <span className="block text-xs">of {stats.perSample} viewers it could win</span>
              </p>
            </li>
          ))}
        </ol>
        <CopyFixPrompt
          input={{
            kind: "video",
            name: `my ${s.platform} video`,
            whatItIs: run.profile?.whatItIs,
            whoItsFor: run.profile?.whoItsFor,
            goal: "tap through to the product",
            result: { yes: taps, total: stats.perSample },
            fixes: advice.fixes.map((f) => ({ title: f.title, problem: f.problem, change: f.change, where: f.frame > 0 ? `frame ${f.frame}` : "the whole video", winBack: Math.round(f.couldWin / Math.max(1, stats.samples)) })), // counts add up all crowds: per crowd
            copy: [
              { label: "New hooks (first line)", items: advice.hooks },
              { label: "Captions", items: advice.captions },
              { label: "Call to action", items: [advice.cta] },
            ],
          }}
        />
</section>

      {/* ---------- 7. New hooks ---------- */}
      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="gpanel rounded-2xl p-6">
          <p className="t-label">new hooks · first 2 seconds</p>
          <ol className="mt-4 space-y-3">
            {advice.hooks.map((h, i) => (
              <CopyLine key={i} text={h} big />
            ))}
          </ol>
        </div>
        <div className="gpanel rounded-2xl p-6">
          <p className="t-label">captions</p>
          <ol className="mt-4 space-y-3">
            {advice.captions.map((c, i) => (
              <CopyLine key={i} text={c} />
            ))}
          </ol>
          <p className="t-label mt-6">ending</p>
          <div className="mt-3">
            <CopyLine text={advice.cta} />
          </div>
        </div>
      </section>

      {/* ---------- 8. Why they swiped ---------- */}
      <section>
        <Head label="why they left" title="What lost them" sub="Everyone who didn't end up trying the product, grouped." />
        <ul className="mt-6 space-y-4">
          {stats.objections.slice(0, 6).map((o) => (
            <li key={o.category} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
              <span className="text-sm font-medium capitalize">{o.category}</span>
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                    <div className="bar-grow h-full rounded-full bg-accent" style={{ width: `${Math.max(2, o.pct * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm tabular-nums text-muted">{pct(o.pct)}</span>
                </div>
                {o.examples[0] && <p className="mt-1 text-sm text-faint">“{o.examples[0]}”</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 9. Comments ---------- */}
      <section>
        <Head label="in their words" title="The comments" sub="What simulated viewers would write under it." />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {stats.quotes.slice(0, allComments ? 60 : 8).map((q) => (
            <li key={q.personaId} className="flex gap-3 rounded-2xl border border-line p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-medium text-muted">{avatar(run, q.personaId)}</span>
              <div className="min-w-0">
                <p className="text-xs text-faint">
                  {who(run, q.personaId)}
                  {q.tapped && <span className="ml-2 text-fg">tapped through</span>}
                  {q.shared && <span className="ml-2 text-fg">shared</span>}
                  {!q.tapped && !q.shared && q.leftAt > 0 && <span className="ml-2">swiped at {s.beats[q.leftAt - 1]?.t.toFixed(1)}s</span>}
                </p>
                <p className="mt-1">{q.quote}</p>
              </div>
            </li>
          ))}
        </ul>
        {stats.quotes.length > 8 && (
          <button onClick={() => setAllComments(!allComments)} className="btn btn-text mt-3 text-sm">
            {allComments ? "Show fewer" : `Show all ${Math.min(60, stats.quotes.length)}`}
          </button>
        )}
      </section>

      {/* ---------- 10. Who taps ---------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <SegmentList title="Tap rate by age" items={stats.byAge} />
        <SegmentList title="Tap rate by mindset" items={stats.byMindset} />
      </section>

      <QualityNote quality={run.quality} />

      {!demo && (
        <>
          <ReportRevenue
            testId={run.id}
            url={run.url}
            kind="video"
            yes={taps}
            total={stats.perSample}
            goal="tap through"
            fixes={advice.fixes.map((f) => ({ title: f.title, wins: perCrowd(f.couldWin) }))}
            createdAt={run.createdAt}
          />
          <NextSteps kind="video" fixWins={fixWins} retestHref="/onboarding?kind=video" newVersionHref="/onboarding?kind=video" />
          <ShareBox testId={run.id} headline={`${taps} of ${stats.perSample} simulated viewers would tap through from my ${s.platform} video`} />
        </>
      )}
      <p className="text-xs leading-relaxed text-faint">
        Simulated viewers saw {s.beats.length} still frames{s.script ? " plus the words you typed" : ""}, not the moving video or its sound. Treat this as a
        pre-post gut check: it compares versions well, but real feeds decide real views.
      </p>
    </ReportShell>
    </FixStatusProvider>
  );
}

// ---------- pieces ----------

function Head({ label, title, sub }: { label: string; title: string; sub: string }) {
  return (
    <div>
      <p className="t-label">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-muted">{sub}</p>
    </div>
  );
}

function Tile({ label, value, sub, bar }: { label: string; value: string; sub: string; bar: number }) {
  return (
    <div className="gpanel rounded-2xl p-5">
      <p className="t-label">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-faint">{sub}</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-subtle">
        <div className="bar-grow h-full rounded-full bg-accent" style={{ width: `${Math.max(2, bar * 100)}%` }} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-label">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// A phone with the first frame and a ring: how many stopped scrolling.
function PhoneHook({ src, hook }: { src: string; hook: Range }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto w-[200px] md:w-full">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-line bg-black shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt="The first frame of your video" className="h-full w-full object-cover opacity-80" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 72 72" className="h-14 w-14 -rotate-90" aria-hidden>
              <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="6" />
              <circle cx="36" cy="36" r={r} fill="none" stroke="#0b0b0a" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${hook.mid * c} ${c}`} className="ring-draw" />
            </svg>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{pct(hook.mid)}</p>
              <p className="text-[11px] leading-tight text-muted">stopped scrolling</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The retention-style curve: x = time, y = share still watching; frames sit under it.
function WatchCurve({ run, img }: { run: VideoRun; img: (f: string) => string }) {
  const stats = run.stats!;
  const beats = run.settings.beats;
  const end = Math.max(run.settings.duration, beats[beats.length - 1]?.t ?? 1);
  const W = 800, H = 240, P = 12;
  const x = (t: number) => P + (t / end) * (W - 2 * P);
  const y = (v: number) => P + (1 - v) * (H - 2 * P);
  // Start at 100% at 0s, then a step after each frame.
  const pts: [number, number][] = [[x(0), y(1)]];
  stats.curve.forEach((c, i) => {
    const t = beats[i]?.t ?? 0;
    const next = beats[i + 1]?.t ?? end;
    pts.push([x(t), y(i === 0 ? 1 : stats.curve[i - 1].watching)]);
    pts.push([x((t + next) / 2), y(c.watching)]);
  });
  pts.push([x(end), y(stats.curve[stats.curve.length - 1]?.watching ?? 0)]);
  const line = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const area = `${line} L${x(end)},${H - P} L${x(0)},${H - P} Z`;
  const drop = stats.biggestDrop;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Still watching: ${stats.curve.map((c) => `${c.t.toFixed(1)}s ${pct(c.watching)}`).join(", ")}`}>
        <defs>
          <linearGradient id="watch-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0b0b0a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#0b0b0a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <g key={f}>
            <line x1={P} x2={W - P} y1={y(f)} y2={y(f)} stroke="#fff" strokeOpacity="0.06" />
            <text x={W - P} y={y(f) - 4} textAnchor="end" fill="#fff" fillOpacity="0.35" fontSize="11" fontFamily="var(--font-mono)">
              {f * 100}%
            </text>
          </g>
        ))}
        <path d={area} fill="url(#watch-fill)" />
        <path d={line} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" className="trend-line" pathLength={1} />
        {drop && (
          <g>
            <line x1={x(drop.t)} x2={x(drop.t)} y1={P} y2={H - P} stroke="#fff" strokeOpacity="0.3" strokeDasharray="3 4" />
            <rect x={Math.min(x(drop.t) + 6, W - 170)} y={P} width="160" height="24" rx="12" fill="#f5f6f8" />
            <text x={Math.min(x(drop.t) + 6, W - 170) + 80} y={P + 16} textAnchor="middle" fill="var(--bg)" fontSize="12" fontWeight="600">
              {pct(drop.left / Math.max(1, stats.total))} swiped at {drop.t.toFixed(1)}s
            </text>
          </g>
        )}
      </svg>
      <ol className="mt-3 grid gap-1.5 px-[1.5%]" style={{ gridTemplateColumns: `repeat(${stats.curve.length}, minmax(0, 1fr))` }} aria-label="Frames">
        {stats.curve.map((c) => (
          <li key={c.n} className="min-w-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(c.file)} alt={`Frame at ${c.t.toFixed(1)}s`} className={`aspect-[9/16] w-full rounded-md border object-cover ${drop?.n === c.n ? "border-accent" : "border-line"}`} />
            <span className="mt-1 block font-mono text-[10px] text-faint">{pct(c.watching)}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function RangeBar({ low, likely, high, usual }: { low: number; likely: number; high: number; usual: number }) {
  const max = Math.max(high, usual) * 1.1;
  const at = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="relative mt-6 h-10" aria-hidden>
      <div className="absolute inset-x-0 top-4 h-1.5 rounded-full bg-subtle" />
      <div className="absolute top-4 h-1.5 rounded-full bg-accent/60" style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }} />
      <span className="absolute top-2.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#08090d] bg-white" style={{ left: at(likely) }} />
      <span className="absolute top-0 h-9 w-px bg-faint" style={{ left: at(usual) }} />
      <span className="absolute top-8 -translate-x-1/2 font-mono text-[10px] text-faint" style={{ left: at(usual) }}>
        usual
      </span>
    </div>
  );
}

function Reasons({ title, items, mark }: { title: string; items: string[]; mark: string }) {
  return (
    <div className="gpanel rounded-2xl p-6">
      <p className="t-label">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${mark === "+" ? "bg-accent text-white" : "border border-line-strong text-muted"}`} aria-hidden>
              {mark}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CopyLine({ text, big = false }: { text: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <li className="group flex items-start justify-between gap-3 rounded-xl border border-line p-3">
      <span className={big ? "text-lg font-medium" : "text-sm"}>{text}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).catch(() => null);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
        className="shrink-0 rounded-md px-2 py-1 text-xs text-faint hover:text-fg"
      >
        {done ? "copied" : "copy"}
      </button>
    </li>
  );
}

function SegmentList({ title, items }: { title: string; items: { name: string; viewers: number; tapRate: number }[] }) {
  const max = Math.max(0.01, ...items.map((s) => s.tapRate));
  return (
    <div className="gpanel rounded-2xl p-6">
      <p className="t-label">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((s) => (
          <li key={s.name} className="grid grid-cols-[110px_minmax(0,1fr)_48px] items-center gap-3 text-sm">
            <span className="truncate capitalize text-muted">{s.name}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className="bar-grow h-full rounded-full bg-white" style={{ width: `${Math.max(2, (s.tapRate / max) * 100)}%` }} />
            </div>
            <span className="text-right tabular-nums">{pct(s.tapRate)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function persona(run: VideoRun, id: string) {
  return run.personas.find((p) => p.id === id);
}
function avatar(run: VideoRun, id: string) {
  const p = persona(run, id);
  return p ? `${p.age}` : "?";
}
function who(run: VideoRun, id: string) {
  const p = persona(run, id);
  return p ? `${p.age} · ${p.occupation}` : "viewer";
}
