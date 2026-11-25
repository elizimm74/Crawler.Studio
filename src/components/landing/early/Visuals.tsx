import type { ReactNode } from "react";

// The animated diagrams on the early-access page. Pure SVG + CSS (no libraries, no photos).
// They are ILLUSTRATIONS of how a simulation looks, not live data. All motion is off for
// visitors who asked for reduced motion.

const INK = "#0b0b0c";
const GREEN = "#02aa3d";

// Deterministic layout so the server and the browser draw the same picture.
function nodesOnRing(count: number, rx: number, ry: number, cx: number, cy: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.07;
    const r = 1 + ((i * 37) % 11) / 40; // slight wobble so it looks organic
    return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r, kind: i % 5 === 0 ? "buy" : i % 3 === 0 ? "maybe" : "no" };
  });
}

export const VISUAL_CSS = `
.ce-pulse { animation: ce-pulse 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.ce-flow { stroke-dasharray: 3 14; animation: ce-flow 2.4s linear infinite; }
.ce-scan { animation: ce-scan 4.6s ease-in-out infinite; }
.ce-bar { transform-box: fill-box; transform-origin: left center; animation: ce-bar 5s ease-in-out infinite; }
.ce-spin { transform-box: view-box; transform-origin: 280px 280px; animation: ce-spin 60s linear infinite; }
@keyframes ce-pulse { 0%,100% { opacity: .35; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes ce-flow { to { stroke-dashoffset: -34; } }
@keyframes ce-scan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: .9; } 90% { opacity: .9; } 100% { transform: translateY(300px); opacity: 0; } }
@keyframes ce-bar { 0%,100% { transform: scaleX(.55); } 50% { transform: scaleX(1); } }
@keyframes ce-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ce-pulse, .ce-flow, .ce-scan, .ce-bar, .ce-spin { animation: none; }
}
`;

const DOT = { buy: GREEN, maybe: "#ffffff", no: "#c9c9c6" } as const;

// HERO: one website in the middle, customer nodes around it, signals flowing in.
export function HeroSimulation() {
  const nodes = nodesOnRing(36, 214, 186, 280, 280);
  return (
    <svg viewBox="0 0 560 560" role="img" aria-label="Illustration: simulated customers visiting a website, each one leaves a buy, maybe or no decision" className="h-auto w-full">
      <defs>
        <radialGradient id="ce-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={GREEN} stopOpacity=".18" />
          <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="280" cy="280" r="250" fill="url(#ce-glow)" />
      <circle cx="280" cy="280" r="214" fill="none" stroke={INK} strokeOpacity=".12" strokeWidth=".8" strokeDasharray="2 6" className="ce-spin" />
      <circle cx="280" cy="280" r="150" fill="none" stroke={INK} strokeOpacity=".08" strokeWidth=".8" />

      {nodes.map((n, i) => (
        <path key={`l${i}`} d={`M${n.x} ${n.y} Q ${(n.x + 280) / 2 + (i % 2 ? 22 : -22)} ${(n.y + 280) / 2} 280 280`} fill="none" stroke={INK} strokeOpacity=".18" strokeWidth=".7" />
      ))}
      {nodes.slice(0, 14).map((n, i) => (
        <path key={`f${i}`} className="ce-flow" d={`M${n.x} ${n.y} Q ${(n.x + 280) / 2 + (i % 2 ? 22 : -22)} ${(n.y + 280) / 2} 280 280`} fill="none" stroke={GREEN} strokeWidth="1.4" style={{ animationDelay: `${(i * 0.17).toFixed(2)}s` }} />
      ))}

      {nodes.map((n, i) => (
        <g key={`n${i}`} className="ce-pulse" style={{ animationDelay: `${((i * 0.19) % 3.2).toFixed(2)}s` }}>
          <circle cx={n.x} cy={n.y} r="7" fill={DOT[n.kind as keyof typeof DOT]} stroke={INK} strokeOpacity={n.kind === "maybe" ? 0.6 : 0} strokeWidth="1" />
        </g>
      ))}

      {/* the website */}
      <rect x="208" y="226" width="144" height="108" rx="10" fill="#ffffff" stroke={INK} strokeWidth="1.2" />
      <line x1="208" y1="246" x2="352" y2="246" stroke={INK} strokeOpacity=".2" />
      <circle cx="222" cy="236" r="3" fill={INK} fillOpacity=".4" />
      <rect x="226" y="262" width="60" height="7" rx="3.5" fill={INK} fillOpacity=".85" />
      <rect x="226" y="278" width="100" height="5" rx="2.5" fill={INK} fillOpacity=".18" />
      <rect x="226" y="292" width="84" height="5" rx="2.5" fill={INK} fillOpacity=".18" />
      <rect x="226" y="306" width="44" height="14" rx="7" fill={GREEN} />
      <rect className="ce-scan" x="208" y="226" width="144" height="2" fill={GREEN} />

      {/* legend */}
      <g fontSize="11" fill={INK} fontFamily="inherit">
        <circle cx="46" cy="520" r="5" fill={GREEN} /><text x="58" y="524">buy</text>
        <circle cx="120" cy="520" r="5" fill="#fff" stroke={INK} strokeOpacity=".6" /><text x="132" y="524">maybe</text>
        <circle cx="206" cy="520" r="5" fill="#c9c9c6" /><text x="218" y="524">no</text>
      </g>
      <text x="514" y="524" textAnchor="end" fontSize="10" fill={INK} fillOpacity=".45">illustration</text>
    </svg>
  );
}

// 01 SIMULATE: personas walk through steps of a page.
export function SimulateVisual() {
  const steps = [60, 170, 280, 390, 500];
  return (
    <svg viewBox="0 0 560 300" role="img" aria-label="Illustration: personas moving through a website, from the homepage to pricing to checkout" className="h-auto w-full">
      <line x1="40" y1="150" x2="520" y2="150" stroke={INK} strokeOpacity=".15" strokeWidth="1" strokeDasharray="3 6" />
      {steps.map((x, i) => (
        <g key={x}>
          <rect x={x - 42} y="118" width="84" height="64" rx="8" fill="#fff" stroke={INK} strokeOpacity=".5" strokeWidth=".9" />
          <rect x={x - 30} y="130" width="44" height="5" rx="2.5" fill={INK} fillOpacity=".7" />
          <rect x={x - 30} y="142" width="60" height="4" rx="2" fill={INK} fillOpacity=".15" />
          <rect x={x - 30} y="152" width="36" height="4" rx="2" fill={INK} fillOpacity=".15" />
          <text x={x} y="206" textAnchor="middle" fontSize="11" fill={INK} fillOpacity=".55">{["Home", "Product", "Pricing", "Sign up", "Decision"][i]}</text>
        </g>
      ))}
      {[0, 1, 2, 3].map((p) => (
        <circle key={p} r="5.5" fill={p === 0 ? GREEN : INK} className="ce-pulse" style={{ animationDelay: `${p * 0.4}s` }}>
          <animateMotion dur="6s" repeatCount="indefinite" begin={`${p * 0.9}s`} path="M40 110 L500 110" />
        </circle>
      ))}
      <text x="40" y="256" fontSize="12" fill={INK} fillOpacity=".7">Personas: a student, a busy parent, a skeptic, an early adopter</text>
      <text x="520" y="284" textAnchor="end" fontSize="10" fill={INK} fillOpacity=".45">illustration</text>
    </svg>
  );
}

// 02 ANALYZE: purchase intent and objections.
export function AnalyzeVisual() {
  const bars = [
    { label: "Would buy", value: 0.34, color: GREEN },
    { label: "Maybe", value: 0.29, color: INK },
    { label: "Would not", value: 0.37, color: "#c9c9c6" },
  ];
  const objections = [
    ["Price is not clear", 0.41],
    ["Sign-up asks too much", 0.27],
    ["Not sure who it's for", 0.18],
  ] as const;
  return (
    <svg viewBox="0 0 560 300" role="img" aria-label="Illustration: purchase intent split and the top reasons customers gave for not buying" className="h-auto w-full">
      {bars.map((b, i) => (
        <g key={b.label} transform={`translate(40 ${50 + i * 46})`}>
          <text x="0" y="14" fontSize="12" fill={INK} fillOpacity=".7">{b.label}</text>
          <rect x="120" y="2" width="300" height="14" rx="7" fill={INK} fillOpacity=".06" />
          <rect className="ce-bar" x="120" y="2" width={300 * b.value} height="14" rx="7" fill={b.color} style={{ animationDelay: `${i * 0.3}s` }} />
          <text x="436" y="14" fontSize="12" fill={INK}>{Math.round(b.value * 100)}%</text>
        </g>
      ))}
      <line x1="40" y1="200" x2="520" y2="200" stroke={INK} strokeOpacity=".12" />
      <text x="40" y="228" fontSize="11" fill={INK} fillOpacity=".5" letterSpacing="1.5">TOP REASONS</text>
      {objections.map(([label, v], i) => (
        <g key={`o${label}`}>
          <text x={40 + (i * 170)} y="252" fontSize="12" fill={INK}>{label}</text>
          <text x={40 + i * 170} y="270" fontSize="16" fill={GREEN} fontWeight="600">{Math.round(v * 100)}%</text>
        </g>
      ))}
      <text x="520" y="290" textAnchor="end" fontSize="10" fill={INK} fillOpacity=".45">illustration</text>
    </svg>
  );
}

// 03 OPTIMIZE: ranked fixes.
export function OptimizeVisual() {
  const fixes = [
    { n: "01", title: "Show the price on the first screen", win: "+14" },
    { n: "02", title: "Ask for an email before the account form", win: "+9" },
    { n: "03", title: "Say who it's for in one line", win: "+6" },
  ];
  return (
    <svg viewBox="0 0 560 300" role="img" aria-label="Illustration: a ranked list of fixes, each with how many simulated customers it could win back" className="h-auto w-full">
      {fixes.map((f, i) => (
        <g key={f.n} transform={`translate(40 ${40 + i * 74})`}>
          <rect x="0" y="0" width="480" height="58" rx="12" fill="#fff" stroke={INK} strokeOpacity=".15" />
          <text x="22" y="34" fontSize="13" fill={INK} fillOpacity=".5">{f.n}</text>
          <text x="66" y="34" fontSize="16" fill={INK} fontWeight="500">{f.title}</text>
          <rect x="390" y="18" width="70" height="24" rx="12" fill={GREEN} />
          <text x="425" y="35" textAnchor="middle" fontSize="12" fill="#052e16" fontWeight="600">{f.win} more</text>
        </g>
      ))}
      <text x="40" y="282" fontSize="11" fill={INK} fillOpacity=".5">Ranked by how many simulated customers each fix could win back.</text>
      <text x="520" y="290" textAnchor="end" fontSize="10" fill={INK} fillOpacity=".45">illustration</text>
    </svg>
  );
}

// SCIENCE: a research field of many personas, each with its own path, feeding one aggregate.
export function ScienceField() {
  const people = nodesOnRing(60, 230, 150, 300, 220);
  return (
    <svg viewBox="0 0 600 440" role="img" aria-label="Illustration: many simulated personas, each with its own path, combined into aggregated results" className="h-auto w-full">
      <rect x="0" y="0" width="600" height="440" fill="#fff" />
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="0" y1={440 * t} x2="600" y2={440 * t} stroke={INK} strokeOpacity=".05" />
      ))}
      {people.map((p, i) => (
        <path key={`p${i}`} d={`M${p.x} ${p.y} L ${300 + (i % 7 - 3) * 6} ${300 + (i % 5) * 4} L 300 350`} fill="none" stroke={p.kind === "buy" ? GREEN : INK} strokeOpacity={p.kind === "buy" ? 0.45 : 0.1} strokeWidth=".8" />
      ))}
      {people.map((p, i) => (
        <circle key={`c${i}`} cx={p.x} cy={p.y} r="3.2" fill={p.kind === "buy" ? GREEN : p.kind === "maybe" ? "#fff" : "#c9c9c6"} stroke={INK} strokeOpacity={p.kind === "maybe" ? 0.5 : 0} className="ce-pulse" style={{ animationDelay: `${((i * 0.11) % 3.2).toFixed(2)}s` }} />
      ))}
      <rect x="180" y="330" width="240" height="64" rx="10" fill={INK} />
      <text x="300" y="358" textAnchor="middle" fontSize="12" fill="#fff" fillOpacity=".65" letterSpacing="1.5">AGGREGATED</text>
      <text x="300" y="382" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="600">counted in code, not guessed</text>
      <text x="16" y="424" fontSize="11" fill={INK} fillOpacity=".5">Each dot is one simulated customer. Illustration only.</text>
    </svg>
  );
}

// Thin line icons for the "What you can test" grid.
export function LineIcon({ name }: { name: "page" | "list" | "tag" | "compass" | "ad" | "people" | "target" }) {
  const common = { fill: "none", stroke: INK, strokeWidth: 1.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<typeof name, JSX> = {
    page: (<><rect x="4" y="3" width="16" height="18" rx="2" {...common} /><line x1="8" y1="8" x2="16" y2="8" {...common} /><line x1="8" y1="12" x2="16" y2="12" {...common} /><line x1="8" y1="16" x2="13" y2="16" {...common} /></>),
    list: (<><rect x="3" y="4" width="8" height="7" rx="1.5" {...common} /><rect x="13" y="4" width="8" height="7" rx="1.5" {...common} /><rect x="3" y="13" width="8" height="7" rx="1.5" {...common} /><rect x="13" y="13" width="8" height="7" rx="1.5" {...common} /></>),
    tag: (<><path d="M3 12V4h8l10 10-8 8z" {...common} /><circle cx="7.5" cy="8.5" r="1.3" {...common} /></>),
    compass: (<><circle cx="12" cy="12" r="9" {...common} /><path d="M15.5 8.5l-2 5-5 2 2-5z" {...common} /></>),
    ad: (<><rect x="3" y="6" width="18" height="12" rx="2" {...common} /><path d="M7 14l3-4 3 3 2-2 2 3" {...common} /></>),
    people: (<><circle cx="9" cy="8" r="3" {...common} /><circle cx="17" cy="9" r="2.5" {...common} /><path d="M3 19c0-3 3-5 6-5s6 2 6 5M14 19c0-2 1.5-3.5 3.5-3.5S21 17 21 19" {...common} /></>),
    target: (<><circle cx="12" cy="12" r="9" {...common} /><circle cx="12" cy="12" r="5" {...common} /><circle cx="12" cy="12" r="1.2" {...common} /></>),
  };
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]">
      {paths[name]}
    </svg>
  );
}

type JSX = ReactNode;
