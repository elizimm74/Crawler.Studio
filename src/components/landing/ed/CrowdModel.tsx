"use client";
// THE CROWD MODEL: one dot per simulated customer (100, from the made-up MealMate demo run).
// When it scrolls into view the dots drift from a loose crowd into groups: by decision
// (would buy / maybe / no) or by mindset. Each dot joins its two nearest neighbours with a faint
// line, like a network. Positions come from a fixed formula, so it looks the same every time.
// Pure SVG + CSS transitions (no library); still for reduced motion / "Calmer motion".
import { useEffect, useMemo, useRef, useState } from "react";
import type { CrowdPoint } from "@/lib/homeDemo";

const W = 640;
const H = 340;
type Mode = "crowd" | "decision" | "mindset";

// a tiny seeded random, so the picture is identical on every load
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export default function CrowdModel({ points }: { points: CrowdPoint[] }) {
  const [mode, setMode] = useState<Mode>("crowd");
  const ref = useRef<HTMLDivElement>(null);

  // start as a crowd, settle into decisions once you can see it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setMode((m) => (m === "crowd" ? "decision" : m)), 500);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const groups = useMemo(() => {
    if (mode === "decision") return ["buy", "maybe", "no"];
    if (mode === "mindset") return [...new Set(points.map((p) => p.mindset))];
    return ["all"];
  }, [mode, points]);

  // where each dot goes: a sunflower spiral inside its group's circle
  const pos = useMemo(() => {
    const r = rng(7);
    const keyOf = (p: CrowdPoint) => (mode === "decision" ? p.v : mode === "mindset" ? p.mindset : "all");
    const centers = groups.map((_, i) => ({ x: ((i + 0.5) / groups.length) * W, y: H / 2 + (i % 2 ? 26 : -18) * (groups.length > 1 ? 1 : 0) }));
    const counters: Record<string, number> = {};
    return points.map((p) => {
      const g = groups.indexOf(keyOf(p));
      const k = (counters[keyOf(p)] = (counters[keyOf(p)] ?? 0) + 1);
      const c = centers[Math.max(0, g)];
      if (mode === "crowd") return { x: 40 + r() * (W - 80), y: 40 + r() * (H - 80) };
      const a = k * 2.39996; // golden angle
      const rad = 10.5 * Math.sqrt(k);
      return { x: c.x + Math.cos(a) * rad, y: c.y + Math.sin(a) * rad };
    });
  }, [points, groups, mode]);

  // each dot joins its two nearest neighbours in the same group
  const links = useMemo(() => {
    const out: [number, number][] = [];
    pos.forEach((a, i) => {
      const near = pos
        .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
        .filter((x) => x.j !== i && x.d < 40 ** 2)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      near.forEach((n) => i < n.j && out.push([i, n.j]));
    });
    return out;
  }, [pos]);

  const count = (g: string) => points.filter((p) => (mode === "decision" ? p.v : p.mindset) === g).length;
  const label = (g: string) => (g === "buy" ? "Would buy" : g === "maybe" ? "Maybe" : g === "no" ? "Wouldn't" : g);
  const fill = (p: CrowdPoint) => (p.v === "buy" ? "#02aa3d" : p.v === "maybe" ? "#f2a516" : "rgb(12 32 20 / 0.22)");

  return (
    <div ref={ref} className="dpanel overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[19px] tracking-tight">The crowd model</p>
          <p className="mt-1 text-sm text-faint">100 simulated customers · demo data</p>
        </div>
        <div className="seg" role="tablist" aria-label="Group the crowd">
          {(["crowd", "decision", "mindset"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
              {m === "crowd" ? "Crowd" : m === "decision" ? "By decision" : "By mindset"}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="crowd-model mt-6 w-full" role="img" aria-label={`100 simulated customers grouped ${mode === "crowd" ? "loosely" : `by ${mode}`}`}>
        <g className="crowd-links">
          {links.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="rgb(12 32 20 / 0.12)" strokeWidth="1" />
          ))}
        </g>
        {points.map((p, i) => (
          <circle key={i} r={p.v === "buy" ? 5.6 : 4.6} fill={fill(p)} className="cm-dot" style={{ transform: `translate(${pos[i].x}px, ${pos[i].y}px)`, transitionDelay: `${(i % 25) * 14}ms` }} />
        ))}
        {mode !== "crowd" &&
          groups.map((g, i) => (
            <text key={g} x={((i + 0.5) / groups.length) * W} y={H - 14} textAnchor="middle" fill="rgb(12 32 20 / 0.6)" fontSize="12" style={{ textTransform: "capitalize" }}>
              {label(g)} · {count(g)}
            </text>
          ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-faint">
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-[#02aa3d]" /> would buy
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-[#f2a516]" /> maybe
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-[rgb(12_32_20_/_0.08)]" /> wouldn&apos;t
        </span>
      </div>
    </div>
  );
}
