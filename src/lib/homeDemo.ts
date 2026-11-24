// The DEMO data shown on the home page (hero picture + sample report), built from the made-up
// "MealMate" example (src/lib/example.ts) so it always matches /example. Server-side only.
import { exampleWebsiteRun } from "./example";
import { priorityFor } from "./priority";
import type { HeroDemo } from "@/components/landing/home/HeroVisual";
import type { SampleData } from "@/components/landing/home/SampleReport";

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Built once per server process (it never changes), not on every visit.
export type CrowdPoint = { v: "buy" | "maybe" | "no"; mindset: string };
type HomeDemo = { hero: HeroDemo; sample: SampleData; crowd: CrowdPoint[] };
let cached: HomeDemo | null = null;
export function homeDemo(): HomeDemo {
  return (cached ??= buildHomeDemo());
}

function buildHomeDemo(): HomeDemo {
  const run = exampleWebsiteRun();
  const s = run.stats!;
  const byId = new Map(run.personas.map((p) => [p.id, p]));
  const label = (id: string) => {
    const p = byId.get(id)!;
    return `${p.age}, ${p.occupation.toLowerCase()}, ${p.mindset}`;
  };
  // a fair mix of decisions for the people list (not only the nice quotes)
  const pickOf = (v: "buy" | "maybe" | "no", n: number) => run.verdicts.filter((x) => x.verdict === v).slice(0, n);
  const mixed = [...pickOf("no", 4), ...pickOf("maybe", 3), ...pickOf("buy", 3)];
  const people = mixed.map((v) => ({
    label: label(v.personaId),
    verdict: v.verdict,
    quote: v.quote,
    reason: v.verdict === "buy" ? v.objection : v.objection,
    motive: byId.get(v.personaId)?.mind?.motivation ?? `came from ${byId.get(v.personaId)?.arrivedFrom}`,
  }));
  const fixes = run.advice!.fixes.map((f) => ({
    title: f.title,
    problem: f.problem,
    change: f.change,
    winBack: f.likelyFlip || f.couldFlip,
    priority: priorityFor(f.couldFlip, s.total),
  }));
  const host = run.url.replace(/^https?:\/\//, "");
  const seg = (key: string, label: string) => ({ label, rows: (s.segments[key] ?? []).filter((r) => r.n >= 3).slice(0, 5).map((r) => ({ value: r.value, n: r.n, buyRate: r.buyRate })) });
  // one point per simulated customer: their decision and mindset (for the crowd model picture)
  const crowd: CrowdPoint[] = run.verdicts.map((v) => ({ v: v.verdict, mindset: byId.get(v.personaId)?.mindset ?? "other" }));
  return {
    crowd,
    hero: {
      host,
      total: s.total,
      buy: s.buy,
      maybe: s.maybe,
      no: s.no,
      people: [mixed[0], mixed[4], mixed[7], mixed[1]].filter(Boolean).map((v) => ({ label: short(label(v.personaId), 34), verdict: v.verdict, reason: short(v.quote, 60) })),
      topFix: fixes[0]?.title ?? "",
      winBack: fixes[0]?.winBack ?? 0,
    },
    sample: {
      host,
      total: s.total,
      buy: s.buy,
      maybe: s.maybe,
      no: s.no,
      segments: [seg("mindset", "mindset"), seg("budget", "budget")].filter((x) => x.rows.length),
      objections: s.objections.slice(0, 5).map((o) => ({ category: o.category, count: o.count, pct: Math.round(o.pctOfNonBuyers * 100), example: o.examples[0] ?? "" })),
      strengths: [...new Set(run.verdicts.filter((v) => v.verdict === "buy").map((v) => v.quote))].slice(0, 3),
      fixes,
      people,
    },
  };
}
