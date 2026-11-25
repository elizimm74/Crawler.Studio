// /admin/insights: PRIVATE (admins only). Who signs up and where they came from, and which of those
// people actually run a test and pay, so marketing goes where it works. Totals only, never individuals.
// Data: marketing_insights() in migration 0018 (refuses non-admins). Advice: src/lib/insights.ts.
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { DIM_LABELS, advice, pct, type Row } from "@/lib/insights";

export const metadata = { title: "Insights", robots: { index: false } };

type Insights = { days: number; signups: number; answered: number; tested: number; paid: number; groups: Record<string, Row[]>; other: string[] };
const PERIODS = [7, 30, 90, 365];
const ORDER = ["heard_from", "utm_source", "referrer", "age", "role", "stage", "goal", "first_kind"];

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!AUTH_ENABLED) notFound();
  const days = PERIODS.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const { data, error } = await (await supabaseServer()).rpc("marketing_insights", { p_days: days });
  if (error || !data) notFound(); // not an admin (or not signed in): this page doesn't exist for you
  const d = data as Insights;
  const tips = advice(d.groups, d.signups);
  // "Need more Crawlers?" requests from the pricing page (migration 0023; admins only, newest first)
  const { data: reqs } = await (await supabaseServer()).rpc("admin_sales_requests");
  const requests = (reqs ?? []) as { id: number; name: string; email: string; company: string | null; volume: string | null; message: string | null; created_at: string }[];

  return (
    <div className="mx-auto max-w-5xl">
      <p className="t-label">private · admins only</p>
      <h1 className="t-h1 mt-4">Who signs up, and what works</h1>
      <p className="t-lead mt-3 max-w-2xl">
        From the optional &quot;About you&quot; step and where people first arrived from. Totals only. Small numbers can mislead,
        so wait for 10+ sign-ups per channel before deciding.
      </p>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <Link key={p} href={`/admin/insights?days=${p}`} aria-pressed={p === days} className="chip">
            Last {p} days
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          ["Sign-ups", d.signups, ""],
          ["Answered “About you”", d.answered, `${pct(d.answered, d.signups)}%`],
          ["Ran a test", d.tested, `${pct(d.tested, d.signups)}%`],
          ["Paid", d.paid, `${pct(d.paid, d.signups)}%`],
        ].map(([label, n, share]) => (
          <div key={label as string} className="card p-5">
            <p className="t-label">{label}</p>
            <p className="t-number mt-2 text-4xl">{n}</p>
            {share && <p className="mt-1 text-sm text-faint">{share} of sign-ups</p>}
          </div>
        ))}
      </div>

      <section className="card mt-6 p-6" aria-labelledby="todo">
        <h2 id="todo" className="t-h3">What to do with this</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {tips.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="text-accent">→</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-faint">
          Tip: tag every link you post, e.g. crawler.studio/?utm_source=tiktok&amp;utm_campaign=launch-video, and it shows up
          under “Link tag” below even if people skip the questions.
        </p>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {ORDER.filter((k) => d.groups[k]?.length).map((k) => (
          <Table key={k} title={DIM_LABELS[k]?.title ?? k} labels={DIM_LABELS[k]?.labels} rows={d.groups[k]} />
        ))}
      </div>

      <section className="card mt-6 p-6" aria-labelledby="sales">
        <h2 id="sales" className="t-h3">Custom volume requests</h2>
        <p className="mt-1 text-sm text-muted">From &quot;Need more Crawlers?&quot; on the pricing page. Reply to them by email.</p>
        {requests.length === 0 ? (
          <p className="mt-4 text-sm text-faint">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {requests.map((r) => (
              <li key={r.id} className="py-3">
                <p>
                  <span className="font-medium">{r.name}</span> · <a className="underline underline-offset-4" href={`mailto:${r.email}`}>{r.email}</a>
                  {r.company && ` · ${r.company}`}
                  {r.volume && <span className="text-muted"> · wants {r.volume}</span>}
                  <span className="text-faint"> · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </p>
                {r.message && <p className="mt-1 text-muted">{r.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.other.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="t-h3">&quot;Somewhere else&quot;: in their words</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {d.other.map((o, i) => (
              <li key={i} className="rounded-full border border-line px-3 py-1 text-muted">
                {o}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Table({ title, labels, rows }: { title: string; labels?: Record<string, string>; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="card p-5">
      <h2 className="font-medium">{title}</h2>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">{title}: sign-ups, share who ran a test, share who paid</caption>
        <thead>
          <tr className="text-faint">
            <th scope="col" className="t-label py-2 text-left font-normal">answer</th>
            <th scope="col" className="t-label py-2 text-right font-normal">sign-ups</th>
            <th scope="col" className="t-label py-2 text-right font-normal">tested</th>
            <th scope="col" className="t-label py-2 text-right font-normal">paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.value} className="border-t border-line">
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                <span className={r.value === "not answered" ? "text-faint" : ""}>{labels?.[r.value] ?? r.value}</span>
                <span className="mt-1 block h-1 rounded-full bg-accent" style={{ width: `${(r.n / max) * 100}%` }} aria-hidden />
              </th>
              <td className="py-2 text-right tabular-nums">{r.n}</td>
              <td className="py-2 text-right tabular-nums text-muted">{pct(r.tested, r.n)}%</td>
              <td className="py-2 text-right tabular-nums text-muted">{pct(r.paid, r.n)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
