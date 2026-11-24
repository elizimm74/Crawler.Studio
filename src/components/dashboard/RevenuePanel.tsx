"use client";
// "Projected revenue" on the dashboard. Crawler doesn't measure revenue, so this is a WHAT-IF:
//   your latest test (measured)  x  the people and price you type in  x  a follow-through assumption.
// The numbers re-count live as you move the sliders. Every assumption is shown on the card, and the
// maths is in src/lib/revenue.ts (checked by the bench).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_REAL_SHARE, FIX_MONTH, MONTHS, money, projectRevenue, type RevenueProjection } from "@/lib/revenue";
import type { Analysis, QueuedFix } from "@/lib/dashboard";
import { useTween } from "./useTween";

const KEY = "crawler-revenue-v1";
type Inputs = { people: number; price: number; share: number };
const DEFAULTS: Inputs = { people: 1000, price: 20, share: DEFAULT_REAL_SHARE };

// What "people" means depends on what was tested.
export const PEOPLE_LABEL: Record<Analysis["kind"], string> = {
  website: "visitors a month",
  store: "visitors a month",
  app: "installs a month",
  game: "new players a month",
  video: "views a month",
};

export function useRevenue(latest: Analysis | undefined, fixes: QueuedFix[]) {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [touched, setTouched] = useState(false); // false = still the example numbers
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Inputs | null;
      if (saved && Number.isFinite(saved.people) && Number.isFinite(saved.price) && Number.isFinite(saved.share)) {
        setInputs(saved);
        setTouched(true);
      }
    } catch {
      // storage blocked: the example numbers stay
    }
  }, []);
  const set = (patch: Partial<Inputs>) => {
    const next = { ...inputs, ...patch };
    setInputs(next);
    setTouched(true);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // not important
    }
  };
  // Win-back points from THIS test's own fixes (counted by the test, same people never counted twice).
  const fixPct = useMemo(() => {
    if (!latest?.total) return 0;
    const wins = fixes.filter((f) => f.testId === latest.id).slice(0, 3).reduce((s, f) => s + f.wins, 0);
    return (wins / latest.total) * 100;
  }, [fixes, latest]);
  const projection = useMemo(
    () => (latest?.pct == null ? null : projectRevenue({ ...inputs, intentPct: latest.pct, realShare: inputs.share, fixPct })),
    [inputs, latest, fixPct],
  );
  return { inputs, set, touched, projection, fixPct };
}

export type Revenue = ReturnType<typeof useRevenue>;

export default function RevenuePanel({ latest, rev }: { latest: Analysis | undefined; rev: Revenue }) {
  const { inputs, set, touched, projection: p } = rev;
  const likely = useTween(p?.monthly.likely ?? 0, 1000);
  const year = useTween(p?.yearFixed ?? 0, 1200);

  if (!latest || !p) {
    return (
      <section className="gpanel dash-rise p-6 sm:p-8" aria-label="Projected revenue">
        <p className="t-label">projected revenue</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight">Run a test to see your revenue what-if</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          After your first test you can put in your visitors and price and see a rough monthly range, and what shipping the top fixes could add.
        </p>
        <Link href="/onboarding" className="btn btn-primary mt-5 h-11 px-5 text-sm">
          Start a test
        </Link>
      </section>
    );
  }

  return (
    <section className="gpanel dash-rise p-5 sm:p-7" aria-label="Projected revenue" style={{ animationDelay: "140ms" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="t-label flex items-center gap-2">
            <span className="pulse-dot" aria-hidden /> projected revenue · what-if
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{money(likely)}</span>
            <span className="text-lg text-faint">/ month</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            likely range {money(p.monthly.low)}–{money(p.monthly.high)} · about {Math.round(p.customersPerMonth)} customers a month
          </p>
        </div>
        {p.upsidePerMonth > 0 && (
          <div className="rounded-2xl border border-line bg-subtle px-4 py-3 text-right">
            <p className="text-xs text-faint">if you ship your top fixes</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">+{money(p.upsidePerMonth)}/mo</p>
            <p className="text-xs text-faint">{money(year)} over 12 months</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <RevenueChart p={p} />
        <div className="space-y-5">
          <Field label={PEOPLE_LABEL[latest.kind]} id="rev-people">
            <input
              id="rev-people"
              type="number"
              min={0}
              step={100}
              value={inputs.people}
              onChange={(e) => set({ people: Math.max(0, Number(e.target.value) || 0) })}
              className="field h-11 text-sm tabular-nums"
            />
          </Field>
          <Field label="price per customer ($)" id="rev-price">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">$</span>
              <input
                id="rev-price"
                type="number"
                min={0}
                step={1}
                value={inputs.price}
                onChange={(e) => set({ price: Math.max(0, Number(e.target.value) || 0) })}
                className="field h-11 pl-8 text-sm tabular-nums"
              />
            </div>
          </Field>
          <div>
            <label htmlFor="rev-share" className="flex items-baseline justify-between text-xs text-faint">
              <span>how many yeses really act</span>
              <span className="tabular-nums text-fg">{Math.round(inputs.share * 100)}%</span>
            </label>
            <input
              id="rev-share"
              type="range"
              min={2}
              max={30}
              step={1}
              value={Math.round(inputs.share * 100)}
              onChange={(e) => set({ share: Number(e.target.value) / 100 })}
              className="mt-2 w-full accent-[#22c55e]"
            />
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-faint">
        A what-if, not a forecast. It multiplies your latest test ({latest.pct}% of simulated customers said yes) by the numbers you typed
        {touched ? "" : " (these are example numbers: change them to yours)"} and by how many yeses really act, which is our assumption ({Math.round(DEFAULT_REAL_SHARE * 100)}% by default; people say yes far more
        often than they pay). It assumes steady traffic, one payment per customer, and that the top fixes ship after {FIX_MONTH} months. Real results will differ.
      </p>
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-faint">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// Cumulative revenue over 12 months: as-is (grey) vs with the fixes shipped (brand blue).
function RevenueChart({ p }: { p: RevenueProjection }) {
  const W = 640, H = 230, L = 8, R = 8, T = 16, B = 26;
  const max = Math.max(p.yearFixed, p.yearAsIs, 1) * 1.08;
  const x = (m: number) => L + (m / MONTHS) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (s: number[]) => s.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line(p.fixed)} L${x(MONTHS)},${H - B} L${x(0)},${H - B} Z`;
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Projected revenue over 12 months: ${money(p.yearAsIs)} as is, ${money(p.yearFixed)} with the fixes`}>
        <defs>
          <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={L} x2={W - R} y1={T + f * (H - T - B)} y2={T + f * (H - T - B)} stroke="currentColor" strokeOpacity="0.06" />
        ))}
        <path d={area} fill="url(#rev-fill)" className="fade-in" />
        <path d={line(p.asIs)} fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 6" />
        <line x1={x(FIX_MONTH)} x2={x(FIX_MONTH)} y1={T} y2={H - B} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 5" />
        <text x={x(FIX_MONTH) + 6} y={T + 10} fill="currentColor" fillOpacity="0.55" fontSize="11" fontFamily="var(--font-mono)">
          fixes ship
        </text>
        <path d={line(p.fixed)} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="trend-line" pathLength={1} />
        <circle cx={x(MONTHS)} cy={y(p.yearFixed)} r="5" fill="currentColor" className="fade-in" />
        {[0, 3, 6, 9, 12].map((m) => (
          <text key={m} x={x(m)} y={H - 6} textAnchor={m === 0 ? "start" : m === MONTHS ? "end" : "middle"} fill="currentColor" fillOpacity="0.4" fontSize="11" fontFamily="var(--font-mono)">
            {m === 0 ? "now" : `m${m}`}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-faint">
        <span className="flex items-center gap-2">
          <i className="inline-block h-0.5 w-5 rounded bg-[#16a34a]" /> with fixes · {money(p.yearFixed)}
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block h-0.5 w-5 rounded border-t-2 border-dotted border-faint" /> as is · {money(p.yearAsIs)}
        </span>
      </figcaption>
    </figure>
  );
}
