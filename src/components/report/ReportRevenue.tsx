"use client";
// The revenue what-if, inside a report. It's the same panel as the dashboard (same saved numbers, same
// maths in src/lib/revenue.ts): this test's measured yes rate x the visitors and price you type x an
// assumption. The fixes' win-back counts come from this report's own fixes.
import RevenuePanel, { useRevenue } from "@/components/dashboard/RevenuePanel";
import type { Analysis, QueuedFix } from "@/lib/dashboard";

export default function ReportRevenue({
  testId,
  url,
  kind,
  yes,
  total,
  goal,
  fixes,
  createdAt,
}: {
  testId: string;
  url: string;
  kind: Analysis["kind"];
  yes: number; // simulated yeses (middle crowd for app / video tests)
  total: number;
  goal: string;
  fixes: { title: string; wins: number }[];
  createdAt: string;
}) {
  const latest: Analysis = {
    id: testId,
    url,
    label: url,
    kind,
    thumb: null,
    status: "done",
    pct: total ? Math.round((yes / total) * 100) : null,
    score: yes,
    total,
    goal,
    blocker: null,
    delta: null,
    created_at: createdAt,
  };
  const queued: QueuedFix[] = fixes.map((f) => ({ title: f.title, change: "", wins: f.wins, from: url, testId }));
  const rev = useRevenue(latest, queued);
  return (
    <section id="revenue" className="scroll-mt-32">
      <RevenuePanel latest={latest} rev={rev} />
    </section>
  );
}
