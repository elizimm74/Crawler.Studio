// Small hand-made visuals for the dashboard (plain SVG + CSS, no chart library):
//   Crowd       100 dots, one per simulated customer; the ones who said yes light up one by one
//   TrendChart  your score over time for the same product
//   Bar         a thin animated bar (0-100%)
//   Icon        the sidebar's line icons
// Animations are CSS only, so "reduce motion" and the "Calmer motion" switch turn them off.

export function Crowd({ yes, total, size = "lg" }: { yes: number; total: number; size?: "lg" | "sm" }) {
  const n = Math.max(1, Math.min(100, total));
  const lit = Math.round((yes / Math.max(1, total)) * n);
  return (
    <div
      className={`grid ${size === "lg" ? "grid-cols-10 gap-[6px] sm:gap-2" : "grid-cols-10 gap-1"}`}
      role="img"
      aria-label={`${yes} of ${total} simulated customers said yes`}
    >
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`crowd-dot aspect-square rounded-full ${i < lit ? "bg-white" : "border border-white/15"}`}
          style={{ animationDelay: `${i * 12}ms` }}
        />
      ))}
    </div>
  );
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function TrendChart({ points }: { points: { pct: number; date: string }[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-white/15 text-center text-sm text-white/60">
        Run this product again after a fix to see your trend.
      </div>
    );
  }
  const W = 600, H = 180, P = 24;
  const max = Math.max(...points.map((p) => p.pct), 10);
  const x = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.pct)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Score trend: ${points.map((p) => p.pct + "%").join(", ")}`}>
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} stroke="#fff" strokeOpacity="0.06" />
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="trend-line" pathLength={1} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.pct)} r={i === points.length - 1 ? 6 : 4} fill={i === points.length - 1 ? "#fff" : "#000"} stroke="#fff" strokeWidth="2" />
            <text x={x(i)} y={y(p.pct) - 12} textAnchor="middle" fill="#fff" fontSize="13" fontFamily="var(--font-mono)">
              {p.pct}%
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-[11px] text-white/50">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}

export function Bar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="bar-grow h-full rounded-full bg-white" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, animationDelay: `${delay}ms` }} />
    </div>
  );
}

const PATHS: Record<string, string> = {
  overview: "M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z",
  tests: "M4 6h16M4 12h16M4 18h10",
  fixes: "M14 7l3-3 3 3-3 3M17 4v9a4 4 0 0 1-4 4H4",
  minds: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  playbook: "M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h10",
  plus: "M12 5v14M5 12h14",
};

export function Icon({ name, className = "" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
