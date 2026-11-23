// The hero picture: one EXAMPLE simulation from start to finish (a site, simulated customers,
// their decisions, the progress, the result). It's a still picture of DEMO DATA (the made-up
// "MealMate" example counted by the real code), labelled as such. No fake live activity.
export type HeroDemo = {
  host: string;
  total: number;
  buy: number;
  maybe: number;
  no: number;
  people: { label: string; verdict: "buy" | "maybe" | "no"; reason: string }[];
  topFix: string;
  winBack: number;
};

const PILL = { buy: "pill-buy", maybe: "pill-maybe", no: "pill-no" } as const;
const WORD = { buy: "Would buy", maybe: "Might buy", no: "Wouldn't buy" } as const;

export default function HeroVisual({ demo }: { demo: HeroDemo }) {
  const pct = (n: number) => Math.round((n / demo.total) * 100);
  return (
    <figure className="hero-visual card relative overflow-hidden p-0" aria-label="Example simulation, demo data">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </div>
        <span className="truncate font-mono text-xs text-muted">{demo.host}</span>
        <span className="demo-tag">Demo data</span>
      </div>

      <div className="grid gap-0 sm:grid-cols-[1fr_1.15fr]">
        {/* 1. the website being read */}
        <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
          <p className="t-label">1 · reading the site</p>
          <div className="mt-3 space-y-2 rounded-lg border border-line p-3" aria-hidden>
            <div className="h-2 w-1/3 rounded bg-line-strong" />
            <div className="h-3.5 w-4/5 rounded bg-fg/70" />
            <div className="h-2 w-3/5 rounded bg-line-strong" />
            <div className="mt-2 h-6 w-24 rounded bg-accent" />
            <div className="grid grid-cols-3 gap-1.5 pt-2">
              <div className="h-8 rounded bg-white/[0.05]" />
              <div className="h-8 rounded bg-white/[0.05]" />
              <div className="h-8 rounded bg-white/[0.05]" />
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            <li>✓ Landing page</li>
            <li>✓ Pricing: not shown</li>
            <li>✓ Signup: 6 fields</li>
          </ul>
        </div>

        {/* 2. simulated customers decide */}
        <div className="p-4">
          <p className="t-label">2 · simulated customers decide</p>
          <ul className="mt-3 space-y-2">
            {demo.people.map((p, i) => (
              <li key={i} className="hero-row rounded-lg border border-line p-2.5" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{p.label}</span>
                  <span className={`pill ${PILL[p.verdict]} shrink-0 text-[11px]`}>{WORD[p.verdict]}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted">“{p.reason}”</p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted">
              <span>Simulation complete</span>
              <span className="font-mono">
                {demo.total}/{demo.total}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full w-full rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. the report */}
      <div className="border-t border-line p-4">
        <p className="t-label">3 · the report</p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={`${demo.buy} would buy, ${demo.maybe} might, ${demo.no} wouldn't`}>
          <span className="bg-accent" style={{ width: `${pct(demo.buy)}%` }} />
          <span className="bg-white/40" style={{ width: `${pct(demo.maybe)}%` }} />
          <span className="bg-white/10" style={{ width: `${pct(demo.no)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            <b className="text-accent">{demo.buy}</b> would buy
          </span>
          <span>
            <b>{demo.maybe}</b> might
          </span>
          <span className="text-muted">
            <b>{demo.no}</b> wouldn&apos;t
          </span>
        </div>
        <p className="mt-3 rounded-lg bg-white/[0.04] p-3 text-xs">
          <span className="font-medium">Fix #1:</span> {demo.topFix} <span className="text-muted">· could win back about {demo.winBack} of {demo.total}</span>
        </p>
      </div>
    </figure>
  );
}
