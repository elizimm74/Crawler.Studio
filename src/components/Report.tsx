"use client";
// The report page, ordered by importance:
//   1. The answer: score + one-sentence summary
//   2. Fix these first: the top 3 fixes
//   3. Three quick facts: where people left, who liked it most / least
//   4. Everything else, folded away (click to open), most useful first
// Every number comes from run.stats (calculated in code); the advice text
// comes from run.advice (written by Sonnet).
import { displayUrl, isIdeaUrl } from "@/lib/idea";
import QualityNote from "./QualityNote";
import CompareBox from "./CompareBox";
import Link from "next/link";
import { useState } from "react";
import type { Run } from "@/lib/pipeline";
import type { QuoteItem, SegmentRow } from "@/lib/aggregate";
import JourneyView from "@/components/JourneyView";
import AskBox from "@/components/AskBox";
import ShareBox from "@/components/ShareBox";
import ActualBox from "@/components/ActualBox";
import ReportShell from "@/components/report/ReportShell";
import ReportHero from "@/components/report/ReportHero";
import ReportRevenue from "@/components/report/ReportRevenue";
import NextSteps from "@/components/report/NextSteps";
import CopyFixPrompt from "./report/CopyFixPrompt";
import FixCard from "@/components/report/FixCard";
import { FixProgress, FixStatusProvider } from "@/components/report/FixStatus";
import PrintButton from "@/components/report/PrintButton";
import PreviewLock from "@/components/report/PreviewLock";
import TrustPanel from "@/components/report/TrustPanel";
import { PRIORITIES, priorityFor } from "@/lib/priority";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const STEP_NAMES: Record<string, string> = {
  hero: "the landing page",
  pricing: "pricing",
  product: "trying the product",
  signup: "signup",
  converted: "converted",
};

// Online-store tests visit a product page and the cart instead of pricing and signup.
const STORE_STEP_NAMES: Record<string, string> = { ...STEP_NAMES, pricing: "the product page", signup: "the cart" };

export default function Report({ run, demo = false }: { run: Run & { filesPrefix: string }; demo?: boolean }) {
  const stepNames = run.profile?.productType === "store" ? STORE_STEP_NAMES : STEP_NAMES;
  const stats = run.stats!;
  const advice = run.advice!;
  const goal = run.profile?.goal ?? "buy";
  const top = stats.objections[0];
  const worstStep = [...stats.funnel].filter((f) => f.step !== "converted").sort((a, b) => b.lost - a.lost)[0];
  const { best, worst } = extremeSegments(stats.segments, stats.total);
  const [moreFixes, setMoreFixes] = useState(false);
  const fixes = advice.fixes.filter((f) => f.couldFlip > 0);
  const shownFixes = moreFixes ? fixes : fixes.slice(0, 3);

  const isIdea = isIdeaUrl(run.url);
  // an idea re-test reopens the idea form with last time's words (?from=), the same customers come back
  const retestHref = isIdea
    ? `/app?kind=idea&retest=${run.id}&from=${encodeURIComponent(run.crawlId)}`
    : `/app?url=${encodeURIComponent(run.url)}&retest=${run.id}${run.profile?.productType === "store" ? "&type=store" : ""}`;
  const kind = isIdea ? "idea" : run.profile?.productType === "store" ? "store" : "website";
  const shownName = displayUrl(run.url);
  const fixWins = fixes.slice(0, 3).reduce((n, f) => n + f.likelyFlip, 0);
  const sections = [
    { id: "answer", label: "Answer" },
    ...(stats.behavior ? [{ id: "trust", label: "Trust" }] : []),
    { id: "fixes", label: "Fixes" },
    { id: "problems", label: "Problems" },
    { id: "customers", label: "Customers" },
    { id: "details", label: "Details" },
    ...(demo ? [] : [{ id: "revenue", label: "Revenue" }, { id: "next", label: "Next steps" }, { id: "share", label: "Share" }]),
  ];

  // FREE TRIAL, not paid yet: the score, the summary and the top reasons, then the locked panel.
  if (run.preview) {
    return (
      <ReportShell sections={[{ id: "answer", label: "Answer" }, { id: "problems", label: "Problems" }, { id: "unlock", label: "Full report" }]}>
        <ReportHero
          label={shownName}
          tag="free trial preview"
          value={stats.buy}
          total={stats.total}
          headline={`would ${goal}`}
          summary={firstSentence(advice.summary)}
          pills={top ? [{ text: `Biggest blocker: ${top.category} · ${pct(top.pctOfNonBuyers)}`, warn: true }] : []}
          yes={stats.buy}
          crowdTotal={stats.total}
          crowdCaption={`one dot = one simulated customer · ${stats.buy} said yes, ${stats.maybe} maybe`}
          actions={
            <Link href="#unlock" className="btn btn-primary h-11 px-5 text-sm">
              See what to fix
            </Link>
          }
        >
          <VerdictBar buy={stats.buy} maybe={stats.maybe} no={stats.no} goal={goal} />
        </ReportHero>
        <section id="problems" className="scroll-mt-32">
          <p className="t-label">customer feedback preview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">What stopped them</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {stats.objections
              .filter((o) => o.category !== "none")
              .slice(0, 3)
              .map((o) => (
                <li key={o.category} className="card p-5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium first-letter:uppercase">{o.category}</span>
                    <span className="tabular-nums text-muted">{pct(o.count / Math.max(1, stats.total))}</span>
                  </div>
                  <p className="mt-1 text-xs text-faint">{o.count} of {stats.total} simulated customers</p>
                  {o.examples[0] && <p className="mt-3 text-sm text-muted">“{o.examples[0]}”</p>}
                </li>
              ))}
          </ul>
        </section>
        <PreviewLock fixes={run.preview.fixes} customers={run.preview.customers} />
        <p className="text-center text-xs text-faint">
          Simulation result: these are AI-simulated customers. Their buying intent is a strong hint about what to fix, not a real conversion rate.
        </p>
      </ReportShell>
    );
  }

  return (
    <FixStatusProvider testId={run.id} demo={demo}>
    <ReportShell sections={sections}>
      {/* ---------- 1. The answer ---------- */}
      <ReportHero
        label={shownName}
        tag={isIdea ? "idea report" : run.profile?.productType === "store" ? "store report" : "report"}
        value={stats.buy}
        total={stats.total}
        headline={stats.behavior ? `said they'd ${goal}` : `would ${goal}`}
        summary={firstSentence(advice.summary)}
        pills={[
          ...(top ? [{ text: `Biggest blocker: ${top.category} · ${pct(top.pctOfNonBuyers)}`, warn: true }] : []),
          ...(run.journey && run.journey.steps.length > 0 ? [{ text: `Product test: ${run.journey.status === "completed" ? "worked" : run.journey.status}` }] : []),
        ]}
        yes={stats.buy}
        crowdTotal={stats.total}
        crowdCaption={`one dot = one simulated customer · ${stats.buy} said yes, ${stats.maybe} maybe`}
        actions={
          <>
            {!demo && (
              <>
                <a href="#share" className="btn btn-primary h-11 px-5 text-sm">
                  Send this score
                </a>
                <Link href={retestHref} className="btn btn-secondary h-11 px-5 text-sm">
                  Fix it, then re-test
                </Link>
              </>
            )}
            <PrintButton />
          </>
        }
      >
        <VerdictBar buy={stats.buy} maybe={stats.maybe} no={stats.no} goal={goal} />
      </ReportHero>

      {/* engine v2: said vs predicted, ranges, calibration, evidence */}
      <TrustPanel behavior={stats.behavior} evidence={stats.evidence} goal={goal} total={stats.total} />

      {/* a re-test: before / after with the same customers */}
      {!demo && run.compareTo && <CompareBox run={run} />}
      {/* ---------- 2. Fix these first ---------- */}
      <section id="fixes" className="scroll-mt-32">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="t-label">edit these first</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Fix these first</h2>
          </div>
          <span className="t-label hidden sm:inline">ranked by people won back</span>
        </div>
        <div className="mt-3">
          <FixProgress titles={fixes.map((f) => f.title)} />
        </div>
        <div className="mt-6 space-y-3" role="list">
          {shownFixes.map((f, i) => (
            <FixCard
              key={i}
              n={i + 1}
              title={f.title}
              problem={f.problem}
              change={f.change}
              win={f.likelyFlip}
              winLabel={`of ${stats.maybe} maybes`}
              priority={priorityFor(f.couldFlip, stats.total)}
              evidence={`${f.couldFlip} of ${stats.total} simulated customers left for a reason this addresses (${f.addresses.join(", ")}); ${f.likelyFlip} of them said "maybe".${f.cites ? ` What they pointed at: “${f.cites.replace(/^missing:\s*/i, "missing: ")}”${f.citedBy ? ` (${f.citedBy} customers)` : ""}.` : ""} Expected direction: more people say yes.`}
              meta={`where: ${stepNames[f.step] ?? f.step}`}
              tracked
            />
          ))}
        </div>
        <CopyFixPrompt
          input={{
            kind,
            name: shownName,
            url: isIdea ? undefined : run.url,
            whatItIs: run.profile?.whatItIs,
            whoItsFor: run.profile?.whoItsFor,
            goal,
            result: { yes: stats.buy, total: stats.total },
            fixes: fixes.map((f) => ({ title: f.title, problem: f.problem, change: f.change, where: stepNames[f.step] ?? f.step, winBack: f.likelyFlip || f.couldFlip })),
            copy: [
              { label: "Headline options", items: advice.headlineOptions },
              { label: "Subheadline", items: [advice.subheadline] },
              { label: "Pricing copy", items: [advice.pricingCopy] },
            ],
          }}
        />
        {fixes.length > 3 && (
          <button onClick={() => setMoreFixes(!moreFixes)} className="btn btn-text mt-2 -ml-3">
            {moreFixes ? "Show fewer" : `Show ${fixes.length - 3} more fix${fixes.length - 3 === 1 ? "" : "es"}`}
          </button>
        )}
      </section>

      {/* ---------- 3. Quick facts: one card, split by lines ---------- */}
      <section className="card grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Fact label="Liked it most" value={best ? best.value : "-"} detail={best ? `${best.dimension} · ${pct(best.buyRate)} would ${goal}` : "Not enough data"} />
        <Fact label="Liked it least" value={worst ? worst.value : "-"} detail={worst ? `${worst.dimension} · ${pct(worst.buyRate)} would ${goal}` : "Not enough data"} />
        <Fact
          label="Most people left at"
          value={worstStep && worstStep.lost > 0 ? stepNames[worstStep.step] : "-"}
          detail={worstStep && worstStep.lost > 0 ? `${worstStep.lost} of ${stats.total} gave up there` : ""}
        />
      </section>

      {/* ---------- Top problems, by priority (counted in code) ---------- */}
      <section id="problems" className="scroll-mt-32">
        <p className="t-label">top problems</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">What stopped them</h2>
        <p className="mt-2 text-sm text-muted">Priority comes from how many of the {stats.total} simulated customers each problem affected.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {PRIORITIES.map((level) => {
            const items = stats.objections.filter((o) => o.category !== "none" && priorityFor(o.count, stats.total) === level);
            if (!items.length) return null;
            return (
              <div key={level} className="card p-5">
                <p className={`pill prio prio-${level.toLowerCase()}`}>{level}</p>
                <ul className="mt-4 space-y-4">
                  {items.map((o) => (
                    <li key={o.category}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-medium first-letter:uppercase">{o.category}</span>
                        <span className="tabular-nums text-muted">
                          {o.count} customers · {pct(o.count / Math.max(1, stats.total))}
                        </span>
                      </div>
                      {o.examples[0] && <p className="mt-1 text-sm text-muted">“{o.examples[0]}”</p>}
                      {o.evidence?.[0] && (
                        <p className="mt-1 text-xs text-muted">
                          On the page: <span className="text-fg">{o.evidence[0].kind === "missing" ? `missing: ${o.evidence[0].text}` : `“${o.evidence[0].text}”`}</span> · cited by {o.evidence[0].count}
                        </p>
                      )}
                      {o.changeMind[0] && <p className="mt-1 text-xs text-faint">Would change their mind: {o.changeMind[0]}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Every simulated customer ---------- */}
      <section id="customers" className="scroll-mt-32">
        <p className="t-label">persona breakdown</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Every simulated customer</h2>
        <CustomerList run={run} goal={goal} />
      </section>

      {/* ---------- 4. Details, folded away ---------- */}
      <section id="details" className="gpanel scroll-mt-32 px-5 sm:px-8">
        {run.journey && run.journey.steps.length > 0 && (
          <Fold title="Product test" hint={`${run.journey.steps.length} steps · ${run.journey.status}`}>
            <JourneyView filesPrefix={run.filesPrefix} journey={run.journey} />
          </Fold>
        )}

        <Fold title="Why people said no" hint={`${stats.objections.length} reasons`}>
          <div className="space-y-6">
            {stats.objections.slice(0, 5).map((o) => (
              <div key={o.category}>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-medium first-letter:uppercase">{o.category}</span>
                  <span className="tabular-nums text-muted">{pct(o.pctOfNonBuyers)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-raised">
                  <div className="h-1.5 rounded-full bg-fg" style={{ width: pct(o.pctOfNonBuyers) }} />
                </div>
                {o.examples[0] && <p className="mt-2 text-sm text-muted">“{o.examples[0]}”</p>}
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="Where they dropped off" hint={worstStep ? `most at ${stepNames[worstStep.step]}` : ""}>
          <div className="space-y-4">
            {stats.funnel.map((f) => (
              <div key={f.step}>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="first-letter:uppercase">{f.step === "converted" ? `Would ${goal}` : stepNames[f.step]}</span>
                  <span className="tabular-nums text-muted">
                    {f.reached}
                    {f.lost ? ` · ${f.lost} left` : ""}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-raised">
                  <div
                    className={`h-1.5 rounded-full ${f.step === "converted" ? "bg-accent" : "bg-fg"}`}
                    style={{ width: pct(f.reached / Math.max(1, stats.total)) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="Rewritten copy" hint="new headline + pricing text">
          <dl className="space-y-6">
            <div>
              <dt className="t-label">Headline</dt>
              <dd className="t-h3 mt-2">“{advice.headlineOptions[0]}”</dd>
              {advice.headlineOptions.slice(1).map((h, i) => (
                <dd key={i} className="text-muted">
                  or “{h}”
                </dd>
              ))}
            </div>
            <div>
              <dt className="t-label">Subheadline</dt>
              <dd className="mt-2">{advice.subheadline}</dd>
            </div>
            <div>
              <dt className="t-label">Pricing</dt>
              <dd className="mt-2">{advice.pricingCopy}</dd>
            </div>
          </dl>
        </Fold>

        <Fold title="Who liked it" hint="by age, budget, device">
          <AllSegments segments={stats.segments} goal={goal} />
        </Fold>

        {run.reputation && (
          <Fold title="What people say online" hint={run.reputation.found ? "real reviews" : "no reviews found"}>
            <div className="space-y-4 text-sm">
              <p className="text-muted">{run.reputation.summary}</p>
              {run.reputation.found && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <List title="Praise" items={run.reputation.praise} />
                  <List title="Complaints" items={run.reputation.complaints} />
                </div>
              )}
              {run.reputation.sources.length > 0 && (
                <p className="text-faint">
                  Sources:{" "}
                  {run.reputation.sources.slice(0, 5).map((src, i) => (
                    <span key={src.url}>
                      {i > 0 && " · "}
                      <a href={src.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-fg">
                        {src.title.slice(0, 40)}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </Fold>
        )}

        <Fold title="What they said" hint={`${stats.allQuotes.length} quotes`}>
          <Quotes best={stats.bestQuotes} all={stats.allQuotes} goal={goal} />
        </Fold>
      </section>

      {/* free follow-up questions (and "something's wrong" fixes) */}
      {!demo && (
        <>
          <ReportRevenue
            testId={run.id}
            url={run.url}
            kind={kind}
            yes={stats.buy}
            total={stats.total}
            goal={goal}
            fixes={fixes.map((f) => ({ title: f.title, wins: f.likelyFlip }))}
            createdAt={run.createdAt}
          />
          <NextSteps kind={kind} fixWins={fixWins} retestHref={retestHref} newVersionHref={retestHref} />
          <ShareBox testId={run.id} headline={`${stats.buy} of ${stats.total} simulated customers would ${goal}${isIdea ? ` (${shownName.toLowerCase()})` : ` on ${run.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}`}`} />
          <AskBox testId={run.id} rerunHref={isIdea ? `/app?kind=idea&from=${encodeURIComponent(run.crawlId)}` : `/app?url=${encodeURIComponent(run.url)}`} />
          <ActualBox testId={run.id} kind="website" />
        </>
      )}

      <QualityNote quality={run.quality} />
      <p className="text-center text-xs text-faint">
        Simulation result: these are AI-simulated customers. Their buying intent is a strong hint about what to fix, not a real conversion rate.
      </p>
    </ReportShell>
    </FixStatusProvider>
  );
}

// ---------- helpers ----------

// The summary can be long; the top card shows only its first sentence.
function firstSentence(text: string) {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

// The single best and worst group across all segments (ignoring tiny groups
// and segments where everyone is the same, e.g. all "female").
function extremeSegments(segments: Record<string, SegmentRow[]>, total: number) {
  const minSize = Math.max(5, Math.round(total * 0.08));
  const all = Object.entries(segments)
    .filter(([, list]) => list.length > 1)
    .flatMap(([dimension, list]) => list.filter((r) => r.n >= minSize).map((r) => ({ ...r, dimension })));
  // engine v2: only compare groups big enough to trust, when there are any
  const big = all.filter((r) => r.small === false);
  const rows = big.length >= 2 ? big : all;
  if (rows.length < 2) return { best: undefined, worst: undefined };
  const sorted = [...rows].sort((a, b) => b.buyRate - a.buyRate || b.n - a.n);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

function AllSegments({ segments, goal }: { segments: Record<string, SegmentRow[]>; goal: string }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(segments)
        .filter(([, rows]) => rows.length > 1) // skip segments where everyone is the same
        .map(([name, rows]) => (
          <div key={name}>
            <p className="t-label mb-2">{name}</p>
            {[...rows]
              .sort((a, b) => b.buyRate - a.buyRate)
              .slice(0, 5)
              .map((r) => (
                <div key={r.value} className={`py-0.5 text-sm ${r.small ? "opacity-60" : ""}`} title={`${r.n} simulated customers`}>
                  <div className="flex items-center gap-2">
                    <span className="w-32 truncate text-muted">{r.value}</span>
                    <span className="flex-1 rounded px-2 py-0.5 text-right tabular-nums" style={heat(r.buyRate)}>
                      {pct(r.buyRate)}
                    </span>
                  </div>
                  {r.low !== undefined && r.high !== undefined && (
                    <p className="pl-[8.5rem] text-[11px] text-faint">
                      n={r.n} · range {pct(r.low)}–{pct(r.high)}
                      {r.small ? " · too few to trust" : ""}
                    </p>
                  )}
                </div>
              ))}
          </div>
        ))}
      <p className="text-sm text-faint sm:col-span-2 lg:col-span-3">
        % = share who said they&apos;d {goal}. Stronger color = more. The range is the 90% range for that group; groups under 30 simulated customers
        are faded and marked &ldquo;too few to trust&rdquo;, because a difference there can easily be chance.
      </p>
    </div>
  );
}

// Accent shade: 0% = faint, 50%+ = full accent. Text stays readable in light and dark.
function heat(rate: number): React.CSSProperties {
  const t = Math.min(1, rate / 0.5);
  return {
    background: `color-mix(in oklab, var(--accent) ${Math.round(8 + t * 92)}%, transparent)`,
    color: t > 0.6 ? "var(--accent-fg)" : "var(--fg)",
  };
}

function VerdictBar({ buy, maybe, no, goal }: { buy: number; maybe: number; no: number; goal: string }) {
  const total = Math.max(1, buy + maybe + no);
  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="flex h-2 gap-1" role="img" aria-label={`${buy} would ${goal}, ${maybe} maybe, ${no} no`}>
        <div className="rounded-full bg-accent" style={{ width: pct(buy / total) }} />
        <div className="rounded-full bg-fg" style={{ width: pct(maybe / total) }} />
        <div className="rounded-full bg-line-strong" style={{ width: pct(no / total) }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Key swatch="bg-accent" label={`Would ${goal}`} n={buy} total={total} />
        <Key swatch="bg-fg" label="Maybe" n={maybe} total={total} />
        <Key swatch="bg-line-strong" label="No" n={no} total={total} />
      </div>
    </div>
  );
}

function Key({ swatch, label, n, total }: { swatch: string; label: string; n: number; total: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden />
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">
        {n} <span className="text-faint">· {pct(n / total)}</span>
      </span>
    </span>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 p-6">
      <p className="t-label">{label}</p>
      <p className="t-h3 mt-2 line-clamp-2 first-letter:uppercase" title={value}>
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

// A section you click to open. Keeps the page short.
function Fold({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4">
        <span className="t-h3">{title}</span>
        <span className="flex items-center gap-4 text-faint">
          <span className="hidden text-sm sm:inline">{hint}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-open:rotate-180" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="pb-8 pt-2">{children}</div>
    </details>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Quotes({ best, all, goal }: { best: QuoteItem[]; all: QuoteItem[]; goal: string }) {
  // "buy" is the internal name; show the site's real goal, e.g. "would join the waitlist".
  const verdictLabel = (v: QuoteItem["verdict"]) => (v === "buy" ? `would ${goal}` : v);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | QuoteItem["verdict"]>("all");
  // Short version: 2 positive, 2 maybe, 2 negative.
  const short = (["buy", "maybe", "no"] as const).flatMap((v) => best.filter((q) => q.verdict === v).slice(0, 2));
  const list = showAll ? all.filter((q) => filter === "all" || q.verdict === filter) : short;

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((q) => (
          <figure key={q.personaId} className="min-w-0 rounded-lg border border-line p-4">
            <blockquote className="text-sm">“{q.quote}”</blockquote>
            <figcaption className="mt-2 flex items-center justify-between gap-2 text-xs text-faint">
              <span className="truncate">{q.label}</span>
              <span className={`pill pill-${q.verdict}`}>{verdictLabel(q.verdict)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setShowAll(!showAll)} className="btn btn-ghost text-sm">
          {showAll ? "Show fewer" : `Browse all ${all.length}`}
        </button>
        {showAll &&
          (["all", "buy", "maybe", "no"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className="chip"
            >
              {f === "all" ? "all" : verdictLabel(f)}
            </button>
          ))}
      </div>
    </div>
  );
}

// Every simulated customer: who they are, their decision, why they came, their objection and reasoning.
// Filter by decision; 12 at a time so long tests (1,000 customers) stay fast.
function CustomerList({ run, goal }: { run: Run; goal: string }) {
  const [filter, setFilter] = useState<"all" | "buy" | "maybe" | "no">("all");
  const [shown, setShown] = useState(12);
  const byId = new Map(run.personas.map((p) => [p.id, p]));
  const rows = run.verdicts.filter((v) => filter === "all" || v.verdict === filter);
  const word = { buy: `Would ${goal}`, maybe: "Might", no: "Wouldn't" } as const;
  const pill = { buy: "pill-buy", maybe: "pill-maybe", no: "pill-no" } as const;
  const count = (k: "buy" | "maybe" | "no") => run.verdicts.filter((v) => v.verdict === k).length;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter customers by decision">
        {(["all", "buy", "maybe", "no"] as const).map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setShown(12);
            }}
            className="chip"
          >
            {f === "all" ? `All ${run.verdicts.length}` : `${word[f]} · ${count(f)}`}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.slice(0, shown).map((v) => {
          const p = byId.get(v.personaId);
          return (
            <li key={v.personaId} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p ? `${p.age}, ${p.occupation}` : v.personaId}
                  </p>
                  {p && (
                    <p className="text-xs text-faint">
                      {p.mindset} · budget {p.budget}
                      {p.spend ? ` (~$${p.spend.monthlySpare}/mo spare)` : ""} · {p.device} · came from {p.arrivedFrom}
                    </p>
                  )}
                </div>
                <span className={`pill ${pill[v.verdict]} shrink-0`}>{word[v.verdict]}</span>
              </div>
              <p className="mt-3 text-sm">“{v.quote}”</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                {p?.mind?.motivation && <Line k="Why they came" v={p.mind.motivation} />}
                {v.objection && <Line k={v.verdict === "buy" ? "Small worry" : "Objection"} v={v.objection} />}
                {v.reasonsNot?.length ? <Line k="Reasons not to" v={v.reasonsNot.join("; ")} /> : null}
                {v.reasonsFor?.length ? <Line k="Reasons to" v={v.reasonsFor.join("; ")} /> : null}
                {v.priceCheck && <Line k="Price vs budget" v={v.priceCheck} />}
                {v.thought && <Line k="Reasoning" v={v.thought} />}
                {v.evidence && (
                  <Line
                    k="Decided by"
                    v={`${v.evidence.kind === "missing" ? `missing: ${v.evidence.text}` : `${v.evidence.kind} “${v.evidence.text}”`}${v.evidence.verified === false ? " (not found on the page)" : v.evidence.verified ? " (found on the page)" : ""}`}
                  />
                )}
                {v.wouldChangeMind && v.verdict !== "buy" && <Line k="Would change their mind" v={v.wouldChangeMind} />}
              </dl>
            </li>
          );
        })}
      </ul>
      {rows.length > shown && (
        <button onClick={() => setShown((n) => n + 24)} className="btn btn-secondary mt-4 h-11 px-5 text-sm">
          Show more ({rows.length - shown} left)
        </button>
      )}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="inline text-faint">{k}: </dt>
      <dd className="inline text-muted">{v}</dd>
    </div>
  );
}
