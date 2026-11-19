"use client";
// The dashboard (v4, 2026-11-19): the founder's mockup style (sidebar, search bar, electric-blue
// buttons, a hero line, metric tiles with mini charts, a ring, insight + recent-test lists),
// filled ONLY with Crawler's real numbers. Nothing here is estimated or invented: every number
// is counted from the person's own tests (src/lib/dashboard.ts). Empty states say so plainly.
//
// Layout
//   left:  sidebar (logo, the 5 views, a "Run a test" card, your plan). Phones: a tab row.
//   top:   search your tests (press / or ⌘K), plan pill.
//   views: Dashboard, Tests, Fixes, Customer minds, Playbook. Press "N" for a new test.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MindsSection from "./MindsSection";
import PlaybookSection, { PlayCard } from "./PlaybookSection";
import InviteCard from "./InviteCard";
import { Bar, Icon, Ring, Spark, TrendChart } from "./viz";
import Mark from "@/components/Mark";
import { PLAYS } from "@/lib/playbook";
import { summarize, type Analysis, type DashboardData } from "@/lib/dashboard";

const VIEWS = [
  ["overview", "Dashboard"],
  ["tests", "Tests"],
  ["fixes", "Fixes"],
  ["minds", "Customer minds"],
  ["playbook", "Playbook"],
] as const;
type ViewId = (typeof VIEWS)[number][0];
const VIEW_ICON: Record<ViewId, string> = { overview: "overview", tests: "chart", fixes: "fix", minds: "minds", playbook: "playbook" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
const pctOf = (a: Analysis) => (a.pct === null ? "–" : `${a.pct}%`);

function Panel({ children, className = "", label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <section className={`dash-panel rounded-2xl p-5 sm:p-6 ${className}`} aria-label={label}>
      {children}
    </section>
  );
}

function PanelTitle({ icon, children, action }: { icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <Icon name={icon} className="text-[#6b91ff]" />
        {children}
      </h2>
      {action}
    </div>
  );
}

function Delta({ n, suffix = " pts" }: { n: number | null; suffix?: string }) {
  if (n === null) return <span className="text-xs text-white/50">first test</span>;
  if (n === 0) return <span className="text-xs text-white/50">no change</span>;
  return (
    <span className={`text-sm font-medium ${n > 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
      {n > 0 ? "↑" : "↓"} {Math.abs(n)}
      {suffix}
    </span>
  );
}

// A small square "thumbnail" for a test: the site's first letter, or a phone for app tests.
function Thumb({ a, size = "h-12 w-12" }: { a: Analysis; size?: string }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#1b2a7a] to-[#0a1033] text-lg font-semibold`}
      aria-hidden
    >
      {a.kind === "app" ? <Icon name="phone" /> : a.label.charAt(0).toUpperCase()}
    </span>
  );
}

export default function DashboardView({ data, paid }: { data: DashboardData; paid?: "launch" | "studio" }) {
  const router = useRouter();
  const [view, setView] = useState<ViewId>("overview");
  const [hello, setHello] = useState("Welcome back");
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setHello(h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    const fromHash = window.location.hash.slice(1) as ViewId;
    if (VIEWS.some(([id]) => id === fromHash)) setView(fromHash);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "n" || e.key === "N") router.push("/onboarding");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const pick = (id: ViewId) => {
    setView(id);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      // not important
    }
  };

  const { plan } = data;
  const sum = summarize(data.analyses);
  const done = data.analyses.filter((a) => a.status === "done");
  const latest: Analysis | undefined = done[0];
  const topBlocker = data.blockers[0];
  const recent = Math.min(10, done.length);
  const allPcts = done.map((a) => a.pct!).reverse(); // oldest first, every product
  const trendPcts = sum.trend.map((t) => t.pct);
  const trendDelta = trendPcts.length >= 2 ? trendPcts[trendPcts.length - 1] - trendPcts[0] : null;
  const found = useMemo(
    () =>
      query.trim()
        ? data.analyses.filter((a) => `${a.label} ${a.blocker ?? ""} ${a.kind}`.toLowerCase().includes(query.trim().toLowerCase()))
        : data.analyses,
    [query, data.analyses],
  );
  const planLabel = plan.unlimited ? "Admin" : plan.plan === "pack" ? "Test packs" : plan.plan === "free" ? "Free plan" : `${plan.plan} plan`;
  const tiles: [string, string, number | null, number[], string][] = [
    ["Latest score", latest ? pctOf(latest) : "–", latest?.delta ?? null, trendPcts, `would ${latest?.goal ?? "convert"}`],
    ["Average score", sum.avgPct === null ? "–" : `${sum.avgPct}%`, null, allPcts, "across finished tests"],
    ["Best score", sum.bestPct === null ? "–" : `${sum.bestPct}%`, null, allPcts, "your high-water mark"],
  ];

  return (
    <div className="dash mx-auto max-w-7xl">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        {/* ================= sidebar ================= */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="dash-panel hidden rounded-2xl p-4 lg:block">
            <p className="flex items-center gap-2 px-1 text-lg font-semibold">
              <Mark size={26} className="text-[#6b91ff]" /> Crawler
            </p>
            <nav aria-label="Dashboard" className="mt-5 flex flex-col gap-1">
              {VIEWS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  aria-current={view === id ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                    view === id ? "dash-active text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon name={VIEW_ICON[id]} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <Icon name="bolt" className="h-7 w-7 text-[#6b91ff]" />
              <p className="mt-2 font-semibold leading-snug">Run a test in about a minute</p>
              <p className="mt-1 text-xs text-white/60">{plan.customers} simulated customers try your app, game, site or store.</p>
              <Link href="/onboarding" className="btn btn-primary mt-4 h-10 w-full text-sm">
                Start test <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3 border-t border-white/10 px-1 pt-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 font-semibold" aria-hidden>
                {data.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{data.name}</p>
                <p className="text-xs text-white/55">
                  {planLabel}
                  {!plan.unlimited && ` · ${plan.left} test${plan.left === 1 ? "" : "s"} left`}
                </p>
              </div>
            </div>
          </div>
          {/* phones: a tab row instead of the sidebar */}
          <nav aria-label="Dashboard views" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:hidden">
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-current={view === id ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm ${view === id ? "dash-active text-white" : "text-white/65"}`}
              >
                <Icon name={VIEW_ICON[id]} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ================= main ================= */}
        <div className="min-w-0 space-y-6">
          {/* top bar: search + plan */}
          <div className="flex items-center gap-3">
            <label className="dash-panel flex min-h-12 flex-1 items-center gap-3 rounded-2xl px-4">
              <Icon name="search" className="shrink-0 text-white/50" />
              <span className="sr-only">Search your tests</span>
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value && view !== "tests") pick("tests");
                }}
                placeholder="Search your tests, sites or blockers…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
              />
              <kbd className="hidden rounded-md border border-white/15 px-1.5 py-0.5 font-mono text-[11px] text-white/50 sm:block">⌘K</kbd>
            </label>
            <span className="dash-panel hidden min-h-12 items-center gap-2 rounded-2xl px-4 text-sm sm:flex">
              <Icon name="spark" className="text-[#6b91ff]" /> {planLabel}
            </span>
          </div>

          {paid && (
            <div role="status" className="dash-panel rounded-2xl p-4 text-sm">
              <span className="font-medium">Payment received. Thank you!</span>{" "}
              <span className="text-white/70">
                Your {paid === "studio" ? "Studio" : "Launch"} Pack tests are being added. Refresh in a few seconds if the count hasn&apos;t changed.
              </span>
            </div>
          )}

          {/* ===== OVERVIEW ===== */}
          {view === "overview" && (
            <>
              {/* hero */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative overflow-hidden rounded-2xl px-1 py-4 sm:py-6">
                  <div className="dash-orb" aria-hidden>
                    <Mark size={220} className="text-[#6b91ff]" />
                  </div>
                  <p className="t-label relative">
                    {hello}, {data.name}
                  </p>
                  <h1 className="relative mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
                    Test. Fix. <span className="text-[#5b86ff]">Launch.</span>
                  </h1>
                  <p className="relative mt-4 max-w-xl text-white/75">
                    {latest
                      ? `${latest.label} ${latest.delta === null ? "scored" : latest.delta > 0 ? "climbed to" : latest.delta < 0 ? "slipped to" : "held at"} ${latest.score} of ${latest.total}.${latest.blocker ? ` Biggest blocker: ${latest.blocker}.` : ""}`
                      : `${plan.customers} simulated customers try your product and tell you exactly what to fix before launch.`}
                  </p>
                  <div className="relative mt-6 flex flex-wrap gap-3">
                    <Link href="/onboarding" className="btn btn-primary h-12 px-6">
                      Run new test <span aria-hidden>→</span>
                    </Link>
                    <Link href={latest ? `/run/${latest.id}` : "/example"} className="btn btn-secondary h-12 px-6">
                      {latest ? "Open latest report" : "View example"}
                    </Link>
                  </div>
                </div>

                <Panel label="Customers simulated">
                  <p className="flex items-center gap-2 text-sm text-[#7aa0ff]">
                    <span className="h-2 w-2 rounded-full bg-[#4d7bff]" /> Your crowd so far
                  </p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">{sum.customers.toLocaleString("en-US")}</p>
                  <p className="text-sm text-white/60">
                    simulated customers across {sum.finished} finished test{sum.finished === 1 ? "" : "s"}
                  </p>
                  <div className="mt-3">
                    <Spark values={allPcts} id="crowd" />
                  </div>
                </Panel>
              </div>

              {/* performance overview + latest test */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Panel label="Performance overview">
                  <PanelTitle icon="chart">Performance overview</PanelTitle>
                  <div className="mt-5 grid gap-6 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
                    {tiles.map(([label, value, delta, spark, note], i) => (
                      <div key={label} className={i ? "sm:pl-6" : ""}>
                        <p className="text-sm text-white/65">{label}</p>
                        <p className="mt-2 text-4xl font-semibold tracking-tight">{value}</p>
                        <div className="mt-1 flex min-h-6 items-center gap-2">
                          {delta !== null ? <Delta n={delta} /> : <span className="text-xs text-white/50">{note}</span>}
                        </div>
                        <div className="mt-2">
                          <Spark values={spark} id={`m${i}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel label="Latest test">
                  <PanelTitle icon="spark">Latest test</PanelTitle>
                  {latest ? (
                    <div className="mt-4 flex gap-4">
                      <Thumb a={latest} size="h-24 w-24" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{latest.label}</p>
                        {latest.blocker && (
                          <span className="mt-1 inline-block rounded-md bg-[#3d6bff]/20 px-2 py-0.5 text-xs text-[#9db7ff]">blocker: {latest.blocker}</span>
                        )}
                        <p className="mt-2 text-sm">
                          {latest.score} of {latest.total} would {latest.goal ?? "convert"}
                        </p>
                        <Delta n={latest.delta} suffix=" pts vs last" />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-white/60">Your first result lands here.</p>
                  )}
                  <Link href={latest ? `/run/${latest.id}` : "/onboarding"} className="btn btn-secondary mt-5 h-10 w-full text-sm">
                    {latest ? "View details" : "Run my first test"} <span aria-hidden>→</span>
                  </Link>
                </Panel>
              </div>

              {/* result ring, top fixes, recent tests */}
              <div className="grid gap-6 xl:grid-cols-3">
                <Panel label="Test result">
                  <PanelTitle icon="chart">Test result</PanelTitle>
                  <div className="mt-5 flex flex-wrap items-center gap-6">
                    <Ring pct={latest?.pct ?? 0} label={latest ? `would ${latest.goal ?? "convert"}` : "no test yet"} />
                    <ul className="space-y-3 text-sm">
                      {[`${latest?.total ?? plan.customers} simulated customers`, "Buying intent, not purchases", "A reason for every “no”", "Every number counted in code"].map((t) => (
                        <li key={t} className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3d6bff]">
                            <Icon name="check" className="h-3 w-3" />
                          </span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Panel>

                <Panel label="Top fixes">
                  <PanelTitle
                    icon="spark"
                    action={
                      <button type="button" onClick={() => pick("fixes")} className="text-sm text-[#7aa0ff] hover:text-white">
                        View all →
                      </button>
                    }
                  >
                    Top fixes
                  </PanelTitle>
                  {data.fixes.length ? (
                    <ul className="mt-4 divide-y divide-white/10">
                      {data.fixes.slice(0, 3).map((f, i) => (
                        <li key={f.title}>
                          <Link href={`/run/${f.testId}`} className="flex items-center gap-3 py-3 hover:text-white">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#7aa0ff]">
                              <Icon name={["cart", "phone", "tag"][i] ?? "fix"} />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                              {f.title}
                              {f.wins > 0 && <span className="block text-xs text-white/55">could win back {f.wins} customers</span>}
                            </span>
                            <span className="text-white/40" aria-hidden>
                              ›
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-white/60">Your ranked fixes land here after your first test. Meanwhile:</p>
                      <PlayCard play={PLAYS.find((p) => p.area === "app")!} />
                    </div>
                  )}
                </Panel>

                <Panel label="Recent tests">
                  <PanelTitle
                    icon="clock"
                    action={
                      <button type="button" onClick={() => pick("tests")} className="text-sm text-[#7aa0ff] hover:text-white">
                        View all →
                      </button>
                    }
                  >
                    Recent tests
                  </PanelTitle>
                  {data.analyses.length ? (
                    <ul className="mt-4 space-y-1">
                      {data.analyses.slice(0, 3).map((a) => (
                        <li key={a.id}>
                          <Link href={`/run/${a.id}`} className="flex items-center gap-3 rounded-xl py-2 hover:bg-white/[0.03]">
                            <Thumb a={a} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{a.label}</span>
                              <span className="flex items-center gap-2 text-xs text-white/55">
                                {a.status === "done" ? `${pctOf(a)} would ${a.goal ?? "convert"}` : a.status === "error" ? "failed · not counted" : "running…"}
                                {a.delta !== null && a.delta !== 0 && <Delta n={a.delta} />}
                              </span>
                            </span>
                            <span className="flex flex-col items-end gap-1 text-xs text-white/50">
                              {ago(a.created_at)}
                              <span
                                className={`h-2 w-2 rounded-full ${a.status === "done" ? "bg-[#4ade80]" : a.status === "error" ? "bg-[#f87171]" : "bg-[#facc15]"}`}
                                aria-hidden
                              />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-white/60">No tests yet. Your first one is free.</p>
                  )}
                </Panel>
              </div>

              {/* trend + blockers */}
              <div className="grid gap-6 xl:grid-cols-3">
                <Panel className="xl:col-span-2" label="Score trend">
                  <PanelTitle icon="chart" action={trendDelta !== null ? <Delta n={trendDelta} /> : undefined}>
                    Trend · {latest ? latest.label : "your product"}
                  </PanelTitle>
                  <div className="mt-4">
                    <TrendChart points={sum.trend} />
                  </div>
                </Panel>
                <Panel label="What keeps blocking people">
                  <PanelTitle icon="fix">What keeps blocking people</PanelTitle>
                  {data.blockers.length === 0 ? (
                    <p className="mt-4 text-sm text-white/60">Your blockers show up here after your first test.</p>
                  ) : (
                    <ul className="mt-5 space-y-5">
                      {data.blockers.slice(0, 5).map((b, i) => (
                        <li key={b.category}>
                          <div className="mb-2 flex justify-between gap-4 text-sm">
                            <span className="first-letter:uppercase">{b.category}</span>
                            <span className="font-mono text-xs text-white/50">
                              {b.tests}/{recent}
                            </span>
                          </div>
                          <Bar pct={b.share * 100} delay={i * 120} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {topBlocker && <p className="mt-4 text-xs text-white/50">The #1 reason people said no, across your last {recent} tests.</p>}
                </Panel>
              </div>

              {!plan.unlimited && plan.plan === "free" && <InviteCard plan={plan} />}
            </>
          )}

          {/* ===== TESTS ===== */}
          {view === "tests" && (
            <Panel label="All tests">
              <PanelTitle
                icon="chart"
                action={
                  <Link href="/tests" className="text-sm text-[#7aa0ff] hover:text-white">
                    Full history →
                  </Link>
                }
              >
                {query ? `Tests matching “${query}”` : "Tests"}
              </PanelTitle>
              {found.length === 0 ? (
                <p className="mt-4 text-sm text-white/60">{query ? "Nothing matches that search." : "No tests yet. Your first one is free."}</p>
              ) : (
                <ul className="mt-4 divide-y divide-white/10">
                  {found.map((a) => (
                    <li key={a.id}>
                      <Link href={`/run/${a.id}`} className="flex items-center gap-4 py-3 hover:bg-white/[0.03]">
                        <Thumb a={a} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{a.label}</span>
                          <span className="block truncate font-mono text-[11px] text-white/45">
                            {date(a.created_at)} · {a.kind}
                            {a.blocker ? ` · ${a.blocker}` : ""}
                          </span>
                        </span>
                        {a.status === "done" && a.pct !== null ? (
                          <>
                            <span className="hidden w-28 sm:block">
                              <Bar pct={a.pct} />
                            </span>
                            <span className="w-20 text-right text-2xl font-semibold tracking-tight">
                              {a.score}
                              <span className="text-sm text-white/45">/{a.total}</span>
                            </span>
                          </>
                        ) : (
                          <span className="font-mono text-xs text-white/50">{a.status === "error" ? "failed · not counted" : "running…"}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {/* ===== FIXES ===== */}
          {view === "fixes" && (
            <div className="grid gap-6 xl:grid-cols-5">
              <Panel className="xl:col-span-3" label="Fix queue">
                <PanelTitle icon="fix">Fix queue</PanelTitle>
                <p className="mt-1 text-sm text-white/60">From your latest tests, biggest win-back first.</p>
                {data.fixes.length === 0 ? (
                  <p className="mt-4 text-sm text-white/60">Run a test and your ranked fixes land here.</p>
                ) : (
                  <ol className="mt-4 divide-y divide-white/10">
                    {data.fixes.map((f, i) => (
                      <li key={f.title} className="flex items-start gap-4 py-4">
                        <span className="w-6 pt-0.5 font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/run/${f.testId}`} className="font-medium hover:underline">
                            {f.title}
                          </Link>
                          {f.change && <p className="mt-1 text-sm text-white/60">{f.change}</p>}
                          <p className="mt-1 font-mono text-[11px] text-white/40">from {f.from}</p>
                        </div>
                        {f.wins > 0 && <span className="shrink-0 text-2xl font-semibold text-[#7aa0ff]">+{f.wins}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
              <Panel className="xl:col-span-2" label="Plays to try">
                <PanelTitle icon="spark">Plays for your blockers</PanelTitle>
                <div className="mt-4 space-y-3">
                  {(data.moves.length ? data.moves : [PLAYS.find((p) => p.area === "web")!]).map((p) => (
                    <PlayCard key={p.id} play={p} />
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ===== MINDS ===== */}
          {view === "minds" && (
            <Panel label="Customer minds">
              <PanelTitle icon="minds">Customer minds</PanelTitle>
              <p className="mt-1 text-sm text-white/60">Who tests your product. Pick a ready-made mind or build your own.</p>
              <div className="mt-6">
                <MindsSection minds={data.minds} />
              </div>
            </Panel>
          )}

          {/* ===== PLAYBOOK ===== */}
          {view === "playbook" && (
            <Panel label="Playbook">
              <PanelTitle icon="playbook">Playbook</PanelTitle>
              <p className="mt-1 text-sm text-white/60">What&apos;s working for apps, games and stores, with the evidence behind each play.</p>
              <div className="mt-6">
                <PlaybookSection trends={data.trends} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
