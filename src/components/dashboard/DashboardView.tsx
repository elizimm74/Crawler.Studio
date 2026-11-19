"use client";
// The dashboard (v5, 2026-11-19, founder: "minimal, beautiful"). Less on screen, more space:
//   sidebar  logo, the 5 views, you + your plan (phones: a tab row)
//   top      search your tests (⌘K or /) + ONE main button: New test
//   overview a calm greeting line, your latest result (screenshot, score ring, blocker),
//            3 score tiles, your next fixes, recent tests, a one-line invite strip
// Every number is counted from your own tests (src/lib/dashboard.ts). Empty states say so.
// Press "N" anywhere (outside a text box) to start a new test.
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
  ["overview", "Overview"],
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

function Title({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium text-white/70">{children}</h2>
      {action}
    </div>
  );
}

function Delta({ n, suffix = " pts" }: { n: number | null; suffix?: string }) {
  if (n === null) return <span className="text-xs text-faint">first test</span>;
  if (n === 0) return <span className="text-xs text-faint">no change</span>;
  return (
    <span className={`text-xs font-medium ${n > 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
      {n > 0 ? "↑" : "↓"} {Math.abs(n)}
      {suffix}
    </span>
  );
}

// A thumbnail: the real screenshot when we have one, otherwise a letter (or a phone for apps/games).
function Thumb({ a, size = "h-11 w-11" }: { a: Analysis; size?: string }) {
  const [broken, setBroken] = useState(false);
  if (a.thumb && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a private signed screenshot, not a static asset
      <img src={a.thumb} alt="" loading="lazy" onError={() => setBroken(true)} className={`${size} shrink-0 rounded-xl border border-white/10 bg-[#0c0d12] object-cover object-top`} />
    );
  }
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-base font-medium`} aria-hidden>
      {a.kind === "app" || a.kind === "game" ? <Icon name="phone" /> : a.label.charAt(0).toUpperCase()}
    </span>
  );
}

function ViewAll({ onClick, children = "View all" }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-xs text-faint transition-colors hover:text-fg">
      {children} →
    </button>
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
  const recent = Math.min(10, done.length);
  const allPcts = done.map((a) => a.pct!).reverse();
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
    ["Latest score", latest ? pctOf(latest) : "–", latest?.delta ?? null, trendPcts, "your newest test"],
    ["Average", sum.avgPct === null ? "–" : `${sum.avgPct}%`, null, allPcts, "across finished tests"],
    ["Best", sum.bestPct === null ? "–" : `${sum.bestPct}%`, null, allPcts, "your high-water mark"],
  ];
  const summary = latest
    ? `${latest.label} ${latest.delta === null ? "scored" : latest.delta > 0 ? "climbed to" : latest.delta < 0 ? "slipped to" : "held at"} ${latest.score} of ${latest.total}.${latest.blocker ? ` Biggest blocker: ${latest.blocker}.` : ""}`
    : `Your first test is free. ${plan.customers} simulated customers try your app, game, site or store.`;

  return (
    <div className="dash mx-auto max-w-6xl">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-10">
        {/* ================= sidebar ================= */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">
            <p className="flex items-center gap-2 px-3 text-base font-semibold">
              <Mark size={22} className="text-white" /> Crawler
            </p>
            <nav aria-label="Dashboard" className="mt-6 flex flex-col gap-0.5">
              {VIEWS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  aria-current={view === id ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                    view === id ? "dash-active text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon name={VIEW_ICON[id]} className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-8 border-t border-white/[0.08] px-3 pt-5 text-sm">
              <p className="font-medium">{data.name}</p>
              <p className="mt-0.5 text-xs text-faint">
                {planLabel}
                {!plan.unlimited && ` · ${plan.left} test${plan.left === 1 ? "" : "s"} left`}
              </p>
              {!plan.unlimited && plan.limit > 0 && (
                <div className="mt-3">
                  <Bar pct={(plan.used / plan.limit) * 100} />
                </div>
              )}
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
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm ${view === id ? "dash-active text-white" : "text-white/55"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ================= main ================= */}
        <div className="min-w-0 space-y-6">
          {/* top bar: search + the ONE main button */}
          <div className="flex items-center gap-3">
            <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4">
              <Icon name="search" className="h-4 w-4 shrink-0 text-faint" />
              <span className="sr-only">Search your tests</span>
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value && view !== "tests") pick("tests");
                }}
                placeholder="Search tests…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-faint focus:outline-none"
              />
              <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">⌘K</kbd>
            </label>
            <Link href="/onboarding" className="btn btn-primary h-11 shrink-0 px-5 text-sm">
              <Icon name="plus" className="h-4 w-4" /> New test
            </Link>
          </div>

          {paid && (
            <p role="status" className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
              <span className="font-medium">Payment received. Thank you!</span>{" "}
              <span className="text-muted">
                Your {paid === "studio" ? "Studio" : "Launch"} Pack tests are being added. Refresh in a few seconds if the count hasn&apos;t changed.
              </span>
            </p>
          )}

          {/* ===== OVERVIEW ===== */}
          {view === "overview" && (
            <>
              <header className="pt-4">
                <p className="text-sm text-faint">
                  {hello}, {data.name}
                </p>
                <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">{summary}</h1>
              </header>

              {/* latest result */}
              {latest ? (
                <Panel label="Latest result" className="p-0 sm:p-0">
                  <div className="grid md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex gap-5 p-5 sm:p-6">
                      <Thumb a={latest} size="h-28 w-28 sm:h-32 sm:w-32" />
                      <div className="min-w-0">
                        <p className="text-xs text-faint">
                          Latest · {date(latest.created_at)} · {latest.kind}
                        </p>
                        <p className="mt-1 truncate text-xl font-semibold">{latest.label}</p>
                        <p className="mt-2 text-sm text-muted">
                          {latest.score} of {latest.total} simulated customers would {latest.goal ?? "convert"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Delta n={latest.delta} suffix=" pts vs last" />
                          {latest.blocker && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-muted">blocker: {latest.blocker}</span>}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Link href={`/run/${latest.id}`} className="btn btn-secondary h-10 px-4 text-sm">
                            Open report
                          </Link>
                          {latest.kind === "website" || latest.kind === "store" ? (
                            <Link href={`/app?url=${encodeURIComponent(latest.url)}&retest=${latest.id}${latest.kind === "store" ? "&type=store" : ""}`} className="btn btn-text h-10 text-sm">
                              Re-test
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center border-t border-white/[0.06] p-6 md:border-l md:border-t-0">
                      <Ring pct={latest.pct ?? 0} label={`would ${latest.goal ?? "convert"}`} />
                    </div>
                  </div>
                </Panel>
              ) : (
                <Panel label="Get started">
                  <p className="text-lg font-semibold">Run your first test</p>
                  <p className="mt-1 max-w-lg text-sm text-muted">About a minute. You get a score, the reasons people said no, and fixes ranked by how many customers each wins back.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/onboarding" className="btn btn-primary h-10 px-5 text-sm">
                      Start free test
                    </Link>
                    <Link href="/example" className="btn btn-text h-10 text-sm">
                      See an example
                    </Link>
                  </div>
                </Panel>
              )}

              {/* three score tiles */}
              <Panel label="Scores" className="p-0 sm:p-0">
                <div className="grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {tiles.map(([label, value, delta, spark, note], i) => (
                    <div key={label} className="p-5 sm:p-6">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs text-faint">{label}</p>
                        {delta !== null ? <Delta n={delta} /> : <span className="text-xs text-faint">{note}</span>}
                      </div>
                      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
                      <div className="mt-3">
                        <Spark values={spark} id={`m${i}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* next fixes + recent tests */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel label="Next fixes">
                  <Title action={data.fixes.length ? <ViewAll onClick={() => pick("fixes")} /> : undefined}>Next fixes</Title>
                  {data.fixes.length ? (
                    <ol className="mt-3 divide-y divide-white/[0.06]">
                      {data.fixes.slice(0, 3).map((f, i) => (
                        <li key={f.title}>
                          <Link href={`/run/${f.testId}`} className="flex items-center gap-4 py-3.5 transition-colors hover:text-white">
                            <span className="w-5 font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 flex-1 text-sm">{f.title}</span>
                            {f.wins > 0 && <span className="shrink-0 text-sm font-medium tabular-nums">+{f.wins}</span>}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-sm text-faint">Your ranked fixes land here after your first test.</p>
                  )}
                </Panel>

                <Panel label="Recent tests">
                  <Title action={data.analyses.length ? <ViewAll onClick={() => pick("tests")} /> : undefined}>Recent tests</Title>
                  {data.analyses.length ? (
                    <ul className="mt-3 divide-y divide-white/[0.06]">
                      {data.analyses.slice(0, 4).map((a) => (
                        <li key={a.id}>
                          <Link href={`/run/${a.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:text-white">
                            <Thumb a={a} size="h-9 w-9" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{a.label}</span>
                              <span className="block text-xs text-faint">{ago(a.created_at)}</span>
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                              {a.status === "done" ? pctOf(a) : a.status === "error" ? <span className="text-xs text-faint">failed</span> : <span className="text-xs text-faint">running…</span>}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-faint">No tests yet.</p>
                  )}
                </Panel>
              </div>

              {/* invite: one quiet line (the full card lives on the Fixes view) */}
              {!plan.unlimited && plan.plan === "free" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] px-5 py-4 text-sm">
                  <span className="text-muted">
                    Invite {plan.referrals.needed} friends to unlock 100-customer tests · {plan.referrals.count}/{plan.referrals.needed} joined
                  </span>
                  <ViewAll onClick={() => pick("fixes")}>Get your invite link</ViewAll>
                </div>
              )}
            </>
          )}

          {/* ===== TESTS ===== */}
          {view === "tests" && (
            <div className="space-y-6">
              <Panel label="All tests">
                <Title
                  action={
                    <Link href="/tests" className="text-xs text-faint hover:text-fg">
                      Full history →
                    </Link>
                  }
                >
                  {query ? `Tests matching “${query}”` : "Tests"}
                </Title>
                {found.length === 0 ? (
                  <p className="mt-4 text-sm text-faint">{query ? "Nothing matches that search." : "No tests yet. Your first one is free."}</p>
                ) : (
                  <ul className="mt-3 divide-y divide-white/[0.06]">
                    {found.map((a) => (
                      <li key={a.id}>
                        <Link href={`/run/${a.id}`} className="flex items-center gap-4 py-3 transition-colors hover:text-white">
                          <Thumb a={a} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{a.label}</span>
                            <span className="block truncate text-xs text-faint">
                              {date(a.created_at)} · {a.kind}
                              {a.blocker ? ` · ${a.blocker}` : ""}
                            </span>
                          </span>
                          {a.status === "done" && a.pct !== null ? (
                            <>
                              <span className="hidden w-28 sm:block">
                                <Bar pct={a.pct} />
                              </span>
                              <span className="w-16 text-right text-lg font-semibold tabular-nums">{pctOf(a)}</span>
                            </>
                          ) : (
                            <span className="text-xs text-faint">{a.status === "error" ? "failed · not counted" : "running…"}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              {!query && sum.trend.length >= 2 && (
                <Panel label="Score trend">
                  <Title action={<Delta n={trendDelta} />}>Trend · {latest?.label}</Title>
                  <div className="mt-4">
                    <TrendChart points={sum.trend} />
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* ===== FIXES ===== */}
          {view === "fixes" && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-5">
                <Panel className="xl:col-span-3" label="Fix queue">
                  <Title>Fix queue · biggest win-back first</Title>
                  {data.fixes.length === 0 ? (
                    <p className="mt-4 text-sm text-faint">Run a test and your ranked fixes land here.</p>
                  ) : (
                    <ol className="mt-3 divide-y divide-white/[0.06]">
                      {data.fixes.map((f, i) => (
                        <li key={f.title} className="flex items-start gap-4 py-4">
                          <span className="w-5 pt-0.5 font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                          <div className="min-w-0 flex-1">
                            <Link href={`/run/${f.testId}`} className="font-medium hover:underline">
                              {f.title}
                            </Link>
                            {f.change && <p className="mt-1 text-sm text-muted">{f.change}</p>}
                            <p className="mt-1 text-xs text-faint">from {f.from}</p>
                          </div>
                          {f.wins > 0 && <span className="shrink-0 text-lg font-semibold tabular-nums">+{f.wins}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </Panel>
                <Panel className="xl:col-span-2" label="What keeps blocking people">
                  <Title>What keeps blocking people</Title>
                  {data.blockers.length === 0 ? (
                    <p className="mt-4 text-sm text-faint">Your blockers show up here after your first test.</p>
                  ) : (
                    <ul className="mt-4 space-y-4">
                      {data.blockers.slice(0, 5).map((b, i) => (
                        <li key={b.category}>
                          <div className="mb-2 flex justify-between gap-4 text-sm">
                            <span className="first-letter:uppercase">{b.category}</span>
                            <span className="font-mono text-xs text-faint">
                              {b.tests}/{recent}
                            </span>
                          </div>
                          <Bar pct={b.share * 100} delay={i * 120} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
              <Panel label="Plays to try">
                <Title>Plays for your blockers</Title>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(data.moves.length ? data.moves : [PLAYS.find((p) => p.area === "web")!]).map((p) => (
                    <PlayCard key={p.id} play={p} />
                  ))}
                </div>
              </Panel>
              {!plan.unlimited && plan.plan === "free" && <InviteCard plan={plan} />}
            </div>
          )}

          {/* ===== MINDS ===== */}
          {view === "minds" && (
            <Panel label="Customer minds">
              <Title>Customer minds · who tests your product</Title>
              <div className="mt-5">
                <MindsSection minds={data.minds} />
              </div>
            </Panel>
          )}

          {/* ===== PLAYBOOK ===== */}
          {view === "playbook" && (
            <Panel label="Playbook">
              <Title>Playbook · what&apos;s working, with the evidence</Title>
              <div className="mt-5">
                <PlaybookSection trends={data.trends} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
