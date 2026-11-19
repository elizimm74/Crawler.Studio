"use client";
// The dashboard: a dark, product-grade workspace. It only DISPLAYS data it is given
// (src/app/dashboard/page.tsx loads it as the signed-in user).
//
// Layout
//   left:  sidebar (New test, the 5 views, your plan + invite progress). On phones it becomes a row of tabs.
//   right: the selected view. "Overview" = your latest result as a crowd of 100 dots, the headline numbers,
//          your trend, what keeps blocking people, the fix queue and recent tests.
// Every number on this screen is counted in code from your own tests (src/lib/dashboard.ts). Nothing is estimated.
// Shortcut: press "N" anywhere (outside a text box) to start a new test.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MindsSection from "./MindsSection";
import PlaybookSection, { PlayCard } from "./PlaybookSection";
import InviteCard from "./InviteCard";
import { Bar, Crowd, Icon, TrendChart } from "./viz";
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

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const DISPLAY = {
  fontFamily: "Archivo, var(--font-sans)",
  fontWeight: 900,
  letterSpacing: "-0.05em",
} as const;

// A dark panel. Everything on the dashboard sits in one of these.
function Panel({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      className={`dash-panel rounded-2xl p-5 sm:p-6 ${className}`}
      aria-label={label}
    >
      {children}
    </section>
  );
}

function Delta({ n }: { n: number | null }) {
  if (n === null)
    return (
      <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[11px] text-white/60">
        first test
      </span>
    );
  if (n === 0)
    return (
      <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[11px] text-white/60">
        no change
      </span>
    );
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${n > 0 ? "bg-white text-black" : "border border-white/30 text-white"}`}
    >
      {n > 0 ? "▲" : "▼"} {Math.abs(n)} pts
    </span>
  );
}

export default function DashboardView({ data, paid }: { data: DashboardData; paid?: "launch" | "studio" }) {
  const router = useRouter();
  const [view, setView] = useState<ViewId>("overview");
  const [hello, setHello] = useState("Welcome back");
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setHello(
      h < 5
        ? "Up late"
        : h < 12
          ? "Good morning"
          : h < 18
            ? "Good afternoon"
            : "Good evening",
    );
    setToday(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
    const fromHash = window.location.hash.slice(1) as ViewId;
    if (VIEWS.some(([id]) => id === fromHash)) setView(fromHash);
    // "N" = new test (ignored while typing in a box)
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        /INPUT|TEXTAREA|SELECT/.test(t.tagName) ||
        t.isContentEditable
      )
        return;
      if (e.key === "n" || e.key === "N") router.push("/onboarding");
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
  const topFix = data.fixes[0];
  const topBlocker = data.blockers[0];
  const recent = Math.min(10, done.length);

  // One personal sentence, built only from this person's own results.
  const summary = !latest
    ? "Your first test is free. Drop in your app, game, site or store and meet 100 simulated customers."
    : `${latest.label} ${latest.delta === null ? "scored" : latest.delta > 0 ? "climbed to" : latest.delta < 0 ? "slipped to" : "held at"} ${latest.score} of ${latest.total}.` +
      (latest.blocker ? ` Biggest blocker: ${latest.blocker}.` : "");

  return (
    <div className="dash mx-auto max-w-7xl">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
        {/* ================= sidebar ================= */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Link
            href="/onboarding"
            className="btn btn-primary hidden h-11 w-full justify-between px-4 lg:flex"
          >
            <span className="flex items-center gap-2">
              <Icon name="plus" /> New test
            </span>
            <kbd className="rounded border border-black/20 px-1.5 font-mono text-[11px]">
              N
            </kbd>
          </Link>
          <nav
            aria-label="Dashboard"
            className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:mt-6 lg:flex-col lg:overflow-visible lg:px-0"
          >
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-current={view === id ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  view === id
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon name={id} />
                {label}
              </button>
            ))}
          </nav>

          <div className="dash-panel mt-6 hidden rounded-2xl p-4 lg:block">
            <p className="t-label">
              {plan.unlimited ? "admin" : plan.plan === "pack" ? "test packs" : `${plan.plan} plan`}
            </p>
            <p className="mt-2 text-2xl" style={DISPLAY}>
              {plan.unlimited
                ? "Unlimited"
                : `${plan.left} test${plan.left === 1 ? "" : "s"} left`}
            </p>
            {!plan.unlimited && (
              <div className="mt-3">
                <Bar pct={plan.limit ? (plan.used / plan.limit) * 100 : 0} />
                <p className="mt-2 text-xs text-white/60">
                  {plan.used} of {plan.limit} used · {plan.customers} customers
                  per test
                </p>
              </div>
            )}
            {!plan.unlimited && plan.plan === "free" && (
              <button
                type="button"
                onClick={() => pick("overview")}
                className="mt-4 block w-full rounded-lg border border-white/15 p-3 text-left text-xs text-white/70 hover:border-white/30 hover:text-white"
              >
                <span className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: plan.referrals.needed }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < plan.referrals.count ? "bg-white" : "bg-white/15"}`}
                    />
                  ))}
                </span>
                <span className="mt-2 block">
                  {plan.referrals.count}/{plan.referrals.needed} friends joined.
                  Unlock 100 customers.
                </span>
              </button>
            )}
          </div>
        </aside>

        {/* ================= main ================= */}
        <div className="min-w-0 space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-6 pb-2">
            <div className="min-w-0">
              <p className="t-label">{today || "dashboard"}</p>
              <h1 className="mt-3 text-4xl sm:text-5xl" style={DISPLAY}>
                {hello}, {data.name}.
              </h1>
              <p className="mt-3 max-w-2xl text-white/70">{summary}</p>
            </div>
            <div className="flex gap-2 lg:hidden">
              <Link href="/onboarding" className="btn btn-primary h-11 px-5">
                <Icon name="plus" /> New test
              </Link>
            </div>
          </header>

          {paid && (
            <div role="status" className="dash-panel rounded-2xl p-4 text-sm">
              <span className="font-medium">Payment received. Thank you!</span>{" "}
              <span className="text-white/70">
                Your {paid === "studio" ? "Studio" : "Launch"} Pack tests are being added. It can take a few seconds; refresh if the count hasn&apos;t changed.
              </span>
            </div>
          )}

          {/* ===== OVERVIEW ===== */}
          {view === "overview" && (
            <>
              <div className="grid gap-6 xl:grid-cols-3">
                {/* hero: the latest result as a crowd */}
                <Panel
                  className="dash-hero xl:col-span-2"
                  label="Latest result"
                >
                  {latest ? (
                    <>
                      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
                        <div>
                          <p className="t-label">
                            latest · {latest.label} · {date(latest.created_at)}
                          </p>
                          <p className="mt-4 flex items-end gap-2 leading-none">
                            <span
                              className="text-[6.5rem] sm:text-[8rem]"
                              style={{
                                ...DISPLAY,
                                letterSpacing: "-0.07em",
                                lineHeight: 0.8,
                              }}
                            >
                              {latest.score}
                            </span>
                            <span
                              className="pb-2 text-2xl text-white/40"
                              style={DISPLAY}
                            >
                              /{latest.total}
                            </span>
                          </p>
                          <p className="mt-3 text-white/80">
                            simulated customers would {latest.goal ?? "convert"}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Delta n={latest.delta} />
                            <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[11px] text-white/60">
                              {latest.kind}
                            </span>
                          </div>
                        </div>
                        <div className="mx-auto w-full max-w-[260px]">
                          <Crowd
                            yes={latest.score ?? 0}
                            total={latest.total ?? 100}
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex border-t border-white/10 pt-5 flex-wrap gap-2">
                        <Link
                          href={`/run/${latest.id}`}
                          className="btn btn-primary h-11 px-5"
                        >
                          Open report
                        </Link>
                        <Link
                          href={`/run/${latest.id}#share`}
                          className="btn h-11 border border-white/20 px-5 text-white hover:bg-white/10"
                        >
                          Send score
                        </Link>
                        <Link
                          href={
                            latest.kind === "app"
                              ? "/onboarding?kind=app"
                              : `/app?url=${encodeURIComponent(latest.url)}`
                          }
                          className="btn h-11 px-4 text-white/70 hover:text-white"
                        >
                          Test again
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
                      <div>
                        <p className="t-label">no tests yet</p>
                        <p
                          className="mt-4 text-3xl sm:text-4xl"
                          style={DISPLAY}
                        >
                          100 customers are waiting.
                        </p>
                        <p className="mt-3 max-w-md text-white/70">
                          About a minute from now you&apos;ll know what stops them
                          from buying.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          <Link
                            href="/onboarding"
                            className="btn btn-primary h-11 px-5"
                          >
                            Run my first test
                          </Link>
                          <Link
                            href="/example"
                            className="btn h-11 border border-white/20 px-5 text-white hover:bg-white/10"
                          >
                            See an example
                          </Link>
                        </div>
                      </div>
                      <div className="mx-auto w-full max-w-[260px]">
                        <Crowd yes={0} total={100} />
                      </div>
                    </div>
                  )}
                </Panel>

                {/* what to do next */}
                <Panel className="flex flex-col" label="What to do next">
                  <p className="t-label">biggest blocker</p>
                  <p
                    className="mt-2 text-2xl first-letter:uppercase"
                    style={DISPLAY}
                  >
                    {topBlocker?.category ?? latest?.blocker ?? "Nothing yet"}
                  </p>
                  {topBlocker && (
                    <p className="mt-1 text-sm text-white/60">
                      #1 reason in {topBlocker.tests} of your last {recent} test
                      {recent === 1 ? "" : "s"}
                    </p>
                  )}
                  <div className="my-5 h-px bg-white/10" />
                  <p className="t-label">best next fix</p>
                  {topFix ? (
                    <>
                      <p className="mt-2 font-medium">{topFix.title}</p>
                      {topFix.wins > 0 && (
                        <p className="mt-2 flex items-baseline gap-2">
                          <span className="text-4xl" style={DISPLAY}>
                            +{topFix.wins}
                          </span>
                          <span className="text-sm text-white/60">
                            customers it could win back
                          </span>
                        </p>
                      )}
                      <Link
                        href={`/run/${topFix.testId}`}
                        className="mt-auto pt-5 text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
                      >
                        See it in the report →
                      </Link>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-white/60">
                      Your best fix, and how many customers it could win back,
                      lands here after your first test.{" "}
                      <button
                        type="button"
                        onClick={() => pick("playbook")}
                        className="underline underline-offset-4 hover:text-white"
                      >
                        Browse the playbook
                      </button>
                    </p>
                  )}
                </Panel>
              </div>

              {/* headline numbers */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {(
                  [
                    [
                      "tests run",
                      String(sum.tests),
                      `${sum.finished} finished`,
                    ],
                    [
                      "average score",
                      sum.avgPct === null ? "–" : `${sum.avgPct}%`,
                      "across finished tests",
                    ],
                    [
                      "best score",
                      sum.bestPct === null ? "–" : `${sum.bestPct}%`,
                      "your high-water mark",
                    ],
                    [
                      "customers simulated",
                      sum.customers.toLocaleString("en-US"),
                      "all simulated, all yours",
                    ],
                  ] as const
                ).map(([label, value, note]) => (
                  <Panel key={label} label={label}>
                    <p className="t-label">{label}</p>
                    <p className="mt-3 text-4xl sm:text-5xl" style={DISPLAY}>
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-white/50">{note}</p>
                  </Panel>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <Panel className="xl:col-span-2" label="Score trend">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="t-label">trend</p>
                      <p className="mt-1 font-medium">
                        {latest ? latest.label : "Your product"}
                      </p>
                    </div>
                    {sum.trend.length >= 2 && (
                      <Delta
                        n={
                          sum.trend[sum.trend.length - 1].pct - sum.trend[0].pct
                        }
                      />
                    )}
                  </div>
                  <TrendChart points={sum.trend} />
                </Panel>

                <Panel label="What keeps blocking people">
                  <p className="t-label">what keeps blocking people</p>
                  {data.blockers.length === 0 ? (
                    <p className="mt-4 text-sm text-white/60">
                      Your blockers show up here after your first test.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-5">
                      {data.blockers.slice(0, 5).map((b, i) => (
                        <li key={b.category}>
                          <div className="mb-2 flex justify-between gap-4 text-sm">
                            <span className="first-letter:uppercase">
                              {b.category}
                            </span>
                            <span className="font-mono text-xs text-white/50">
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

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel label="Fix queue">
                  <div className="flex items-end justify-between">
                    <p className="t-label">fix queue</p>
                    <button
                      type="button"
                      onClick={() => pick("fixes")}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      All fixes →
                    </button>
                  </div>
                  <FixList fixes={data.fixes.slice(0, 3)} />
                </Panel>
                <Panel label="Recent tests">
                  <div className="flex items-end justify-between">
                    <p className="t-label">recent tests</p>
                    <button
                      type="button"
                      onClick={() => pick("tests")}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      All tests →
                    </button>
                  </div>
                  <TestList items={data.analyses.slice(0, 4)} compact />
                </Panel>
              </div>

              {!plan.unlimited && plan.plan === "free" && (
                <InviteCard plan={plan} />
              )}
            </>
          )}

          {/* ===== TESTS ===== */}
          {view === "tests" && (
            <Panel label="All tests">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-3xl" style={DISPLAY}>
                  Tests
                </h2>
                <Link
                  href="/tests"
                  className="text-sm text-white/60 hover:text-white"
                >
                  Full history →
                </Link>
              </div>
              <TestList items={data.analyses} />
            </Panel>
          )}

          {/* ===== FIXES ===== */}
          {view === "fixes" && (
            <div className="grid gap-6 xl:grid-cols-5">
              <Panel className="xl:col-span-3" label="Fix queue">
                <h2 className="text-3xl" style={DISPLAY}>
                  Fix queue
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  From your latest tests, biggest win-back first.
                </p>
                <FixList fixes={data.fixes} />
              </Panel>
              <Panel className="xl:col-span-2" label="Plays to try">
                <p className="t-label">plays for your blockers</p>
                <div className="mt-4 space-y-3">
                  {(data.moves.length
                    ? data.moves
                    : [PLAYS.find((p) => p.area === "web")!]
                  ).map((p) => (
                    <PlayCard key={p.id} play={p} />
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ===== MINDS ===== */}
          {view === "minds" && (
            <Panel label="Customer minds">
              <h2 className="text-3xl" style={DISPLAY}>
                Customer minds
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Who tests your product. Pick a ready-made mind or build your
                own.
              </p>
              <div className="mt-6">
                <MindsSection minds={data.minds} />
              </div>
            </Panel>
          )}

          {/* ===== PLAYBOOK ===== */}
          {view === "playbook" && (
            <Panel label="Playbook">
              <h2 className="text-3xl" style={DISPLAY}>
                Playbook
              </h2>
              <p className="mt-1 text-sm text-white/60">
                What&apos;s working for apps, games and stores, with the
                evidence behind each play.
              </p>
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

function FixList({ fixes }: { fixes: DashboardData["fixes"] }) {
  if (!fixes.length)
    return (
      <p className="mt-4 text-sm text-white/60">
        Run a test and your ranked fixes land here.
      </p>
    );
  return (
    <ol className="mt-4 divide-y divide-white/10">
      {fixes.map((f, i) => (
        <li key={f.title} className="flex items-start gap-4 py-4">
          <span className="w-6 pt-0.5 font-mono text-xs text-white/40">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/run/${f.testId}`}
              className="font-medium hover:underline"
            >
              {f.title}
            </Link>
            {f.change && (
              <p className="mt-1 text-sm text-white/60">{f.change}</p>
            )}
            <p className="mt-1 font-mono text-[11px] text-white/40">
              from {f.from}
            </p>
          </div>
          {f.wins > 0 && (
            <span className="shrink-0 text-2xl" style={DISPLAY}>
              +{f.wins}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function TestList({
  items,
  compact = false,
}: {
  items: Analysis[];
  compact?: boolean;
}) {
  if (!items.length)
    return (
      <p className="mt-4 text-sm text-white/60">
        No tests yet. Your first one is free.
      </p>
    );
  return (
    <ul className="mt-4 divide-y divide-white/10">
      {items.map((a) => (
        <li key={a.id}>
          <Link
            href={`/run/${a.id}`}
            className="group flex items-center gap-4 rounded-lg py-3 hover:bg-white/[0.03]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{a.label}</p>
              <p className="truncate font-mono text-[11px] text-white/40">
                {date(a.created_at)} · {a.kind}
                {!compact && a.blocker ? ` · ${a.blocker}` : ""}
              </p>
            </div>
            {a.status === "done" && a.pct !== null ? (
              <>
                <div className="hidden w-24 sm:block">
                  <Bar pct={a.pct} />
                </div>
                <span className="w-16 text-right text-2xl" style={DISPLAY}>
                  {a.score}
                  <span className="text-sm text-white/40">/{a.total}</span>
                </span>
              </>
            ) : (
              <span className="font-mono text-xs text-white/50">
                {a.status === "error" ? "failed · not counted" : "running…"}
              </span>
            )}
            <span
              className="text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
              aria-hidden
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
