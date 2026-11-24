"use client";
// The dashboard (v7, 2026-11-23, founder: "looks like AI slop, make it professional like Fastlane;
// no site menu at the top"). A calm LIGHT workspace: white panels with hairline borders, small
// uppercase mono labels, mono numbers in quiet stat tiles, one blue accent. The site header and
// footer are hidden here (globals.css: body:has(.dash-app)); the rail has the logo + Settings + Sign out.
// (Earlier v6 notes:)
//   rail     a full-height glass sidebar flush with the left edge: you, the 5 views (a pill glides
//            between them), quick actions, your plan (phones: a tab row)
//   top      search your tests (⌘K or /) + ONE main button: New test
//   overview greeting + your latest result with its 100-dot crowd, 4 count-up tiles, the REVENUE
//            WHAT-IF (RevenuePanel: your test x your numbers x an assumption, labelled), next
//            fixes, what keeps blocking people, recent tests
// Glass panels follow your cursor with a soft spotlight; everything animates in and respects
// reduced motion / "Calmer motion".
// Every number is counted from your own tests (src/lib/dashboard.ts). Empty states say so.
// Press "N" anywhere (outside a text box) to start a new test.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MindsSection from "./MindsSection";
import PlaybookSection, { PlayCard } from "./PlaybookSection";
import InviteCard from "./InviteCard";
import RevenuePanel, { useRevenue } from "./RevenuePanel";
import { Bar, Icon, TrendChart } from "./viz";
import { money } from "@/lib/revenue";
import { PLAYS } from "@/lib/playbook";
import { subscriptionLine, summarize, type Analysis, type DashboardData } from "@/lib/dashboard";
import ManageBilling from "@/components/ManageBilling";
import Mark from "@/components/Mark";
import { PLANS, planName } from "@/lib/plans";

const VIEWS = [
  ["overview", "Overview"],
  ["tests", "Simulations"],
  ["sites", "My websites"],
  ["fixes", "Fixes"],
  ["minds", "Customer minds"],
  ["playbook", "Playbook"],
] as const;
type ViewId = (typeof VIEWS)[number][0];
const VIEW_ICON: Record<ViewId, string> = { overview: "overview", tests: "chart", sites: "overview", fixes: "fix", minds: "minds", playbook: "playbook" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
const pctOf = (a: Analysis) => (a.pct === null ? "–" : `${a.pct}%`);

// A glass panel. A soft blue spotlight follows the cursor over it (CSS variables --mx / --my).
// A plain white panel with a hairline border (the Fastlane-style surface).
function Panel({ children, className = "", label, flush = false }: { children: React.ReactNode; className?: string; label?: string; i?: number; flush?: boolean }) {
  return (
    <section aria-label={label} className={`fl-panel ${flush ? "" : "p-5 sm:p-6"} ${className}`}>
      {children}
    </section>
  );
}

// A headline number tile: counts up when it appears, with a little chart under it.
// A headline number: mono digits on a quiet tile, a label and one line of context.
function Kpi({ label, value, format, sub }: { label: string; value: number | null; format: (n: number) => string; sub: React.ReactNode; spark?: number[]; id?: string; i?: number }) {
  return (
    <div className="fl-panel p-5">
      <p className="fl-label">{label}</p>
      <p className="fl-num mt-3 text-3xl sm:text-[2.1rem]">{value === null ? "–" : format(value)}</p>
      <p className="mt-2 min-h-4 text-xs text-faint">{sub}</p>
    </div>
  );
}

// A small Fastlane-style stat tile: a mono value and a tiny caption.
function Tile({ n, k, text = false }: { n: string; k: string; text?: boolean }) {
  return (
    <div className="fl-tile">
      <p className={`${text ? "truncate text-base font-medium first-letter:uppercase" : "fl-num text-xl"}`}>{n}</p>
      <p className="mt-1 text-[11px] text-faint">{k}</p>
    </div>
  );
}

function Title({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="fl-label">{children}</h2>
      {action}
    </div>
  );
}

function Delta({ n, suffix = " pts" }: { n: number | null; suffix?: string }) {
  if (n === null) return <span className="text-xs text-faint">first test</span>;
  if (n === 0) return <span className="text-xs text-faint">no change</span>;
  return (
    <span className={`text-xs font-medium ${n > 0 ? "text-[#02aa3d]" : "text-[#f87171]"}`}>
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
      <img src={a.thumb} alt="" loading="lazy" onError={() => setBroken(true)} className={`${size} shrink-0 rounded-xl border border-line bg-subtle object-cover object-top`} />
    );
  }
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl border border-[#bfe9cc] bg-[#e8f8ee] text-base font-medium text-[#047a30]`} aria-hidden>
      {a.kind === "app" || a.kind === "game" || a.kind === "video" ? <Icon name={a.kind === "video" ? "play" : "phone"} /> : a.label.charAt(0).toUpperCase()}
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

export default function DashboardView({ data, paid }: { data: DashboardData; paid?: string }) {
  const router = useRouter();
  const [view, setView] = useState<ViewId>("overview");
  const [hello, setHello] = useState("Welcome back");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "running" | "done" | "error">("all");
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
  const stateOf = (a: Analysis) => (a.status === "done" ? "done" : a.status === "error" ? "error" : "running");
  const found = useMemo(
    () =>
      (query.trim()
        ? data.analyses.filter((a) => `${a.label} ${a.blocker ?? ""} ${a.kind}`.toLowerCase().includes(query.trim().toLowerCase()))
        : data.analyses
      ).filter((a) => status === "all" || stateOf(a) === status),
    [query, status, data.analyses],
  );
  // My websites: every site or store tested, newest first, with its history
  const sites = useMemo(() => {
    const map = new Map<string, Analysis[]>();
    for (const a of data.analyses) if (a.kind === "website" || a.kind === "store") map.set(a.label, [...(map.get(a.label) ?? []), a]);
    return [...map.entries()].map(([label, list]) => {
      const finished = list.filter((a) => a.status === "done");
      return { label, kind: list[0].kind, url: list[0].url, tests: list.length, last: list[0].created_at, latest: finished[0], best: finished.reduce<number | null>((m, a) => (a.pct !== null && (m === null || a.pct > m) ? a.pct : m), null) };
    });
  }, [data.analyses]);
  const planLabel = plan.unlimited ? "Admin" : plan.plan === "pack" ? "Paid tests" : `${planName(plan.plan)} plan`;
  const subLine = subscriptionLine(plan.subscription);
  const summary = latest
    ? `${latest.label} ${latest.delta === null ? "scored" : latest.delta > 0 ? "climbed to" : latest.delta < 0 ? "slipped to" : "held at"} ${latest.score} of ${latest.total}.${latest.blocker ? ` Biggest blocker: ${latest.blocker}.` : ""}`
    : `Your first test is free. ${plan.customers} simulated customers try your app, game, site or store.`;

  const rev = useRevenue(latest, data.fixes);
  const idx = Math.max(0, VIEWS.findIndex(([id]) => id === view));
  const initial = (data.name || "?").charAt(0).toUpperCase();

  return (
    // The wrapper breaks out of the page's centered column so the rail sits on the far left of the screen.
    <div className="dash dash-app -mt-12 sm:-mt-16 -mb-24 lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* ================= the rail: far left, full height, glass ================= */}
        <aside className="fl-rail min-w-0 px-4 pt-4 sm:px-6 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:px-4 lg:py-5">
          <div className="hidden h-full flex-col lg:flex">
            <Link href="/?home=1" className="flex h-10 items-center gap-2 px-2 text-[15px] font-semibold tracking-tight" aria-label="Crawler home">
              <span className="logo-tile is-small" aria-hidden><Mark size={13} className="text-white" /></span> crawler
            </Link>

            <p className="fl-label mt-8 px-3">Workspace</p>
            <nav aria-label="Dashboard" className="relative mt-2">
              {/* the pill that glides to the selected view (each item is 44px + 4px gap) */}
              <span aria-hidden className="dash-pill" style={{ transform: `translateY(${idx * 48}px)` }} />
              {VIEWS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  aria-current={view === id ? "page" : undefined}
                  className={`relative z-10 mb-1 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${view === id ? "font-medium text-fg" : "text-muted hover:text-fg"}`}
                >
                  <Icon name={VIEW_ICON[id]} className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>

            <p className="fl-label mt-8 px-3">Actions</p>
            <div className="mt-2 space-y-1">
              <Link href="/onboarding" className="dash-quick">
                <Icon name="plus" className="h-4 w-4" /> New test <kbd className="ml-auto font-mono text-[10px] text-faint">N</kbd>
              </Link>
              <Link href="/onboarding?kind=video" className="dash-quick">
                <Icon name="play" className="h-4 w-4" /> Test a video or ad
              </Link>
              <Link href="/pricing" className="dash-quick">
                <Icon name="spark" className="h-4 w-4" /> Plans and usage
              </Link>
              <Link href="/settings" className="dash-quick">
                <Icon name="spark" className="h-4 w-4" /> Settings
              </Link>
              <Link href="/example" className="dash-quick">
                <Icon name="chart" className="h-4 w-4" /> Sample report
              </Link>
              {plan.unlimited && (
                <Link href="/admin/insights" className="dash-quick">
                  <Icon name="spark" className="h-4 w-4" /> Insights (admin)
                </Link>
              )}
            </div>

            <div className="mt-auto pt-8">
              <div className="fl-panel p-4">
                {plan.monthly && !plan.unlimited ? (
                  <>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">Customers this month</span>
                      <span className="text-xs tabular-nums text-faint">{plan.monthly.left.toLocaleString("en-US")} left</span>
                    </div>
                    <div className="mt-3">
                      <Bar pct={(plan.monthly.used / Math.max(1, plan.monthly.allowance)) * 100} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{plan.unlimited ? "Unlimited tests" : "Tests"}</span>
                      {!plan.unlimited && <span className="text-xs tabular-nums text-faint">{plan.left} left</span>}
                    </div>
                    {!plan.unlimited && plan.limit > 0 && (
                      <div className="mt-3">
                        <Bar pct={(plan.used / plan.limit) * 100} />
                      </div>
                    )}
                  </>
                )}
                {subLine && <p className={`mt-3 text-xs ${subLine.warn ? "text-fg" : "text-faint"}`}>{subLine.text}</p>}
                {plan.billing && <ManageBilling className="mt-2 text-xs text-faint underline underline-offset-2 transition-colors hover:text-fg" />}
                {!plan.unlimited && plan.plan === "free" && !plan.billing && (
                  <button type="button" onClick={() => pick("fixes")} className="mt-3 text-xs text-faint transition-colors hover:text-fg">
                    Invite {plan.referrals.needed} friends: {plan.referrals.count}/{plan.referrals.needed} →
                  </button>
                )}
              </div>
              {/* who's signed in + sign out (the site header is hidden on the dashboard) */}
              <div className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{initial}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{data.name}</span>
                  <span className="block truncate text-xs text-faint">{planLabel}</span>
                </span>
                <a href="/auth/signout" className="text-xs text-faint transition-colors hover:text-fg">
                  Sign out
                </a>
              </div>
            </div>
          </div>
          {/* phones: a small top bar + a tab row instead of the rail */}
          <div className="flex h-12 items-center justify-between lg:hidden">
            <Link href="/?home=1" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Crawler home">
              <span className="logo-tile is-small" aria-hidden><Mark size={13} className="text-white" /></span> crawler
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/settings" className="btn btn-text h-10 px-3 text-sm">
                Settings
              </Link>
              <a href="/auth/signout" className="btn btn-text h-10 px-3 text-sm">
                Sign out
              </a>
            </div>
          </div>
          <nav aria-label="Dashboard views" className="-mx-4 mt-2 flex gap-1 overflow-x-auto px-4 pb-1 lg:hidden">
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-current={view === id ? "page" : undefined}
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm ${view === id ? "dash-active text-fg" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ================= main ================= */}
        <div className="min-w-0 space-y-6 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-8 [&>*]:mx-auto [&>*]:max-w-[1180px]">
          {/* top bar: search + the ONE main button */}
          <div className="flex items-center gap-3">
            <label className="fl-search flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-4">
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
                className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
              />
              <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">⌘K</kbd>
            </label>
            <Link href="/onboarding" className="btn btn-primary h-11 shrink-0 px-5 text-sm">
              <Icon name="plus" className="h-4 w-4" /> New test
            </Link>
          </div>

          {subLine?.warn && (
            <p role="status" className="fl-panel flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="font-medium">{subLine.text}</span>
              {plan.billing && <ManageBilling className="btn btn-secondary h-9 px-4 text-sm" label="Update card" />}
            </p>
          )}

          {paid && (
            <p role="status" className="fl-panel p-4 text-sm">
              <span className="font-medium">Payment received. Thank you!</span>{" "}
              <span className="text-muted">
                Your {planName(paid)} plan is on: {(PLANS.find((p) => p.id === paid)?.customers ?? 0).toLocaleString("en-US")} simulated customers this month. Refresh in a few seconds if it hasn&apos;t shown up yet. It renews monthly until you cancel in Manage billing.
              </span>
            </p>
          )}

          {/* ===== OVERVIEW ===== */}
          {view === "overview" && (
            <>
              {/* header: greeting + one sentence from the person's latest result */}
              {/* the greeting banner: a quiet blue-black panel (no photos: the product is the visual) */}
              <div className="dash-banner relative flex flex-wrap items-end justify-between gap-6 overflow-hidden rounded-2xl border border-line px-6 py-8 sm:px-8 sm:py-10">
                <div className="relative z-10 min-w-0">
                  <p className="fl-label !text-[#047a30]">
                    {hello}, {data.name}
                  </p>
                  <h1 className="mt-3 max-w-3xl text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">{summary}</h1>
                </div>
                {!latest && (
                  <div className="relative z-10 flex gap-2">
                    <Link href="/onboarding" className="btn btn-primary h-11 px-5 text-sm">
                      Start free test
                    </Link>
                    <Link href="/example" className="btn btn-secondary h-11 px-5 text-sm">
                      See an example
                    </Link>
                  </div>
                )}
              </div>

              {latest && (
                <Panel label="Latest result" flush>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
                    <p className="fl-label">Latest result</p>
                    <span className="fl-chip">{latest.label}</span>
                  </div>
                  <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="flex items-center gap-5">
                      <span className="hidden sm:block">
                        <Thumb a={latest} size="h-24 w-24" />
                      </span>
                      <div className="min-w-0">
                        <p className="fl-num text-5xl" style={{ color: "#058a37" }}>
                          {latest.score ?? "–"}
                          <span className="text-2xl text-faint">/{latest.total ?? 100}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">simulated {latest.kind === "video" ? "viewers would tap through" : `customers would ${latest.goal ?? "buy"}`}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Link href={`/run/${latest.id}`} className="btn btn-primary h-10 px-4 text-sm">
                            Open report
                          </Link>
                          {latest.kind === "website" || latest.kind === "store" ? (
                            <Link href={`/app?url=${encodeURIComponent(latest.url)}&retest=${latest.id}${latest.kind === "store" ? "&type=store" : ""}`} className="btn btn-secondary h-10 px-4 text-sm">
                              Re-test
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 self-center sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                      <Tile n={latest.pct === null ? "–" : `${latest.pct}%`} k="said yes" />
                      <Tile n={latest.delta === null ? "first" : `${latest.delta > 0 ? "+" : ""}${latest.delta}`} k="pts vs last test" />
                      <Tile n={latest.blocker ?? "–"} k="#1 blocker" text />
                      <Tile n={data.fixes[0] ? `+${data.fixes[0].wins}` : "–"} k="top fix could win" />
                    </div>
                  </div>
                </Panel>
              )}

              {/* four headline numbers */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                  i={1}
                  id="k0"
                  label="Projected revenue / month"
                  value={rev.projection ? rev.projection.monthly.likely : null}
                  format={money}
                  sub={rev.projection ? (rev.touched ? "what-if, see below" : "example numbers, edit below") : "after your first test"}
                  spark={rev.projection ? rev.projection.fixed.slice(1) : []}
                />
                <Kpi i={2} id="k1" label="Latest score" value={latest?.pct ?? null} format={(n) => `${Math.round(n)}%`} sub={latest ? <Delta n={latest.delta} /> : "no tests yet"} spark={trendPcts} />
                <Kpi i={3} id="k2" label="Customers simulated" value={sum.customers} format={(n) => Math.round(n).toLocaleString("en-US")} sub={`across ${sum.finished} finished test${sum.finished === 1 ? "" : "s"}`} spark={allPcts} />
                <Kpi i={4} id="k3" label="Best score" value={sum.bestPct} format={(n) => `${Math.round(n)}%`} sub={sum.avgPct === null ? "your high-water mark" : `average ${sum.avgPct}%`} spark={allPcts} />
              </div>

              {/* the revenue what-if */}
              <RevenuePanel latest={latest} rev={rev} />

              {/* next fixes + blockers + recent tests */}
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <Panel label="Next fixes" i={5}>
                  <Title action={data.fixes.length ? <ViewAll onClick={() => pick("fixes")} /> : undefined}>Next fixes</Title>
                  {data.fixes.length ? (
                    <ol className="mt-3 divide-y divide-line">
                      {data.fixes.slice(0, 3).map((f, i) => (
                        <li key={f.title}>
                          <Link href={`/run/${f.testId}`} className="group flex items-center gap-3 py-3.5 transition-colors hover:text-fg">
                            <span className="w-5 font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 flex-1 text-sm">{f.title}</span>
                            {f.wins > 0 && <span className="shrink-0 rounded-full bg-[#058a37]/25 px-2 py-0.5 text-xs font-medium tabular-nums">+{f.wins}</span>}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-sm text-faint">Your ranked fixes land here after your first test.</p>
                  )}
                </Panel>

                <Panel label="What keeps blocking people" i={6}>
                  <Title action={data.blockers.length ? <ViewAll onClick={() => pick("fixes")} /> : undefined}>What keeps blocking people</Title>
                  {data.blockers.length ? (
                    <ul className="mt-4 space-y-4">
                      {data.blockers.slice(0, 4).map((b, i) => (
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
                  ) : (
                    <p className="mt-3 text-sm text-faint">Your blockers show up here after your first test.</p>
                  )}
                </Panel>

                <Panel label="Recent tests" i={7} className="lg:col-span-2 xl:col-span-1">
                  <Title action={data.analyses.length ? <ViewAll onClick={() => pick("tests")} /> : undefined}>Recent tests</Title>
                  {data.analyses.length ? (
                    <ul className="mt-3 divide-y divide-line">
                      {data.analyses.slice(0, 4).map((a) => (
                        <li key={a.id}>
                          <Link href={`/run/${a.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:text-fg">
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
                <div className="fl-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
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
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
                  {(["all", "running", "done", "error"] as const).map((k) => (
                    <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)} className="chip">
                      {k === "all" ? `All ${data.analyses.length}` : k === "running" ? `Running ${data.analyses.filter((a) => stateOf(a) === "running").length}` : k === "done" ? `Completed ${data.analyses.filter((a) => stateOf(a) === "done").length}` : `Failed ${data.analyses.filter((a) => stateOf(a) === "error").length}`}
                    </button>
                  ))}
                </div>
                {found.length === 0 ? (
                  <p className="mt-4 text-sm text-faint">
                    {query ? "Nothing matches that search." : status !== "all" ? "No simulations with that status." : "No simulations yet. "}
                    {!query && status === "all" && (
                      <Link href="/onboarding" className="underline underline-offset-2">
                        Run your first one free
                      </Link>
                    )}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {found.map((a) => (
                      <li key={a.id}>
                        <Link href={`/run/${a.id}`} className="flex items-center gap-4 py-3 transition-colors hover:text-fg">
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

          {/* ===== MY WEBSITES ===== */}
          {view === "sites" && (
            <Panel label="My websites">
              <Title>Websites and stores you tested</Title>
              {sites.length === 0 ? (
                <div className="mt-4 text-sm text-faint">
                  <p>No websites yet. Paste one and see what simulated customers think.</p>
                  <Link href="/onboarding" className="btn btn-primary mt-4 h-11 px-5 text-sm">
                    Test a website
                  </Link>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {sites.map((site) => (
                    <li key={site.label} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{site.label}</p>
                        <p className="text-xs text-faint">
                          {site.kind === "store" ? "Online store" : "Website"} · {site.tests} test{site.tests === 1 ? "" : "s"} · last tested {date(site.last)}
                          {site.best !== null ? ` · best ${Math.round(site.best)}%` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {site.latest && (
                          <Link href={`/run/${site.latest.id}`} className="btn btn-secondary h-10 px-4 text-sm">
                            Latest report
                          </Link>
                        )}
                        <Link
                          href={site.latest ? `/app?url=${encodeURIComponent(site.url)}&retest=${site.latest.id}${site.kind === "store" ? "&type=store" : ""}` : `/onboarding?url=${encodeURIComponent(site.url)}`}
                          className="btn btn-ghost h-10 px-4 text-sm"
                        >
                          Re-test
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
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
                    <ol className="mt-3 divide-y divide-line">
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
