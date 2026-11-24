// Small hand-made visuals for the dashboard (plain SVG + CSS, no chart library):
//   Crowd       100 dots, one per simulated customer; the ones who said yes light up one by one
//   TrendChart  your score over time for the same product
//   Bar         a thin animated bar (0-100%)
//   Icon        the sidebar's line icons
//   Spark       a tiny area chart for a metric tile
//   Ring        a progress ring around a big number
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
          className={`crowd-dot aspect-square rounded-full ${i < lit ? "bg-[#058a37]" : "border border-line"}`}
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
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-line text-center text-sm text-muted">
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
            <stop offset="0" stopColor="currentColor" stopOpacity="0.07" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} stroke="currentColor" strokeOpacity="0.06" />
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="trend-line" pathLength={1} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.pct)} r={i === points.length - 1 ? 6 : 4} fill={i === points.length - 1 ? "currentColor" : "var(--bg-raised, #fff)"} stroke="currentColor" strokeWidth="2" />
            <text x={x(i)} y={y(p.pct) - 12} textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="var(--font-mono)">
              {p.pct}%
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-[11px] text-muted">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}

export function Bar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      <div className="bar-grow h-full rounded-full bg-[#058a37]" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, animationDelay: `${delay}ms` }} />
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
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  chart: "M5 20V10M12 20V4M19 20v-7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  fix: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z",
  tag: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  cart: "M3 4h2l2.4 11h10.2L20 7H6.3M9 20h.01M17 20h.01",
  check: "M5 12l5 5 9-10",
  play: "M7 4.5v15l12-7.5z",
};

export function Icon({ name, className = "" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

// A tiny area chart for a metric tile (values 0-100). Fewer than 2 points = a flat hint line.
export function Spark({ values, id }: { values: number[]; id: string }) {
  const W = 160, H = 48;
  const v = values.length >= 2 ? values : [0, 0];
  const max = Math.max(...v, 1), min = Math.min(...v, 0);
  const pts = v.map((x, i) => [(i / (v.length - 1)) * W, H - 4 - ((x - min) / (max - min || 1)) * (H - 10)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#058a37" stopOpacity="0.45" />
          <stop offset="1" stopColor="#058a37" stopOpacity="0" />
        </linearGradient>
      </defs>
      {values.length >= 2 && <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#sp-${id})`} />}
      <path d={line} fill="none" stroke="#047a30" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeOpacity={values.length >= 2 ? 1 : 0.3} />
    </svg>
  );
}

// A progress ring (0-100) with a big number in the middle.
export function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 52, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`${Math.round(p)}% ${label}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#ring-g)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} className="ring-draw" />
        <defs>
          <linearGradient id="ring-g" x1="0" x2="1">
            <stop offset="0" stopColor="#058a37" />
            <stop offset="1" stopColor="#047a30" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold tracking-tight">{Math.round(p)}%</span>
        <span className="mt-1 max-w-[6rem] text-[11px] leading-tight text-muted">{label}</span>
      </div>
    </div>
  );
}
