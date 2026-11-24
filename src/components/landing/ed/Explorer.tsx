"use client";
// The dark "what Crawler is built on" explorer: three groups (research, labelled assumptions,
// your audience), a list on the left and the selected item's detail on the right.
// Every row is real: the research facts and assumptions come from Science.tsx (the same list as
// /science and docs/persona-research.md); "your audience" lists the settings you control.
import { useState } from "react";

export type ExplorerItem = { title: string; source: string; body: string; who?: string };
export type ExplorerGroups = Record<"Research" | "Assumptions" | "Your audience", ExplorerItem[]>;

export default function Explorer({ groups }: { groups: ExplorerGroups }) {
  const names = Object.keys(groups) as (keyof ExplorerGroups)[];
  const [group, setGroup] = useState<keyof ExplorerGroups>(names[0]);
  const [pick, setPick] = useState(0);
  const items = groups[group];
  const it = items[Math.min(pick, items.length - 1)];

  return (
    <div>
      <div className="flex justify-center">
        <div className="seg" role="tablist" aria-label="What customers are built from">
          {names.map((n) => (
            <button
              key={n}
              role="tab"
              aria-selected={group === n}
              onClick={() => {
                setGroup(n);
                setPick(0);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="dpanel p-5 sm:p-6">
          <p className="text-[19px] tracking-tight">{group}</p>
          <ul className="mt-4 space-y-2" role="listbox" aria-label={group}>
            {items.map((x, i) => (
              <li key={x.title}>
                <button type="button" role="option" aria-selected={i === pick} onClick={() => setPick(i)} className="drow w-full">
                  <span className="truncate">{x.title}</span>
                  <span aria-hidden className="text-white/60">
                    {i === pick ? "×" : "›"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="dpanel p-5 sm:p-7" aria-live="polite">
          <p className="text-[22px] leading-tight tracking-tight">{it.title}</p>
          <p className="mt-3 text-sm text-white/80">
            {it.source}
            {it.who ? <span className="text-white/45"> · {it.who}</span> : null}
          </p>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">{it.body}</p>
          <Bars seed={it.title} />
        </div>
      </div>
    </div>
  );
}

// A small decorative "distribution" drawing so the detail panel isn't just text. It is NOT data
// (labelled as an illustration), the same shape every time for the same item.
function Bars({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rows = [0, 1, 2, 3].map((r) => {
    const pts: string[] = [];
    for (let x = 0; x <= 100; x += 4) {
      const v = Math.sin((x + ((h >> (r * 3)) % 40)) / 9) * 0.5 + Math.sin((x * (r + 2)) / 23) * 0.35;
      pts.push(`${x * 4},${18 - Math.max(0, v + 0.6) * 12}`);
    }
    return pts.join(" ");
  });
  return (
    <figure className="mt-8">
      <svg viewBox="0 0 400 96" className="w-full" aria-hidden>
        {rows.map((p, i) => (
          <g key={i} transform={`translate(0 ${i * 24})`}>
            <polyline points={p} fill="none" stroke={i % 2 ? "rgb(255 255 255 / 0.35)" : "#ffffff"} strokeWidth="1.4" />
            <line x1={120 + ((h >> i) % 200)} x2={120 + ((h >> i) % 200)} y1="4" y2="20" stroke="#648bff" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-[11px] text-white/40">Illustration, not data. The source above is the evidence.</figcaption>
    </figure>
  );
}
