// /accuracy: Crawler's PUBLIC track record. Founders enter what really happened
// after launch; we show it next to what Crawler predicted. Nothing identifying.
// We say plainly what this can and can't show.
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { Arrow } from "@/components/landing/UrlForm";

export const metadata = {
  title: "Accuracy: simulated vs real results",
  alternates: { canonical: "/accuracy" },
  description: "What Crawler's AI customer simulations measure, what the scores mean and don't mean, and how predictions compare with real results.",
};

type Row = { kind: "website" | "app" | "video"; predicted: number; real: number; simulated?: number; visitors?: number | null; days?: number | null; month?: string };

const DISCLAIMER =
  "Crawler is an AI-powered customer simulation tool. Its predictions represent simulated customer behavior and should not be interpreted as guaranteed real-world conversion rates.";

export default async function Accuracy() {
  let rows: Row[] = [];
  if (AUTH_ENABLED) {
    const supabase = await supabaseServer();
    const { data } = await supabase.rpc("public_accuracy");
    rows = (data as Row[] | null) ?? [];
  }
  const enough = rows.length >= 5;
  const rank = enough ? spearman(rows.map((r) => r.predicted), rows.map((r) => r.real)) : null;
  const visitors = rows.reduce((n, r) => n + (r.visitors ?? 0), 0);
  const withVisitors = rows.filter((r) => r.visitors).length;
  const months = rows.map((r) => r.month).filter(Boolean).sort() as string[];
  const period = months.length ? (months[0] === months[months.length - 1] ? months[0] : `${months[0]} to ${months[months.length - 1]}`) : "none yet";
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="t-label">accuracy</p>
      <h1 className="t-h1 mt-4">How far can you trust a simulation?</h1>
      <p className="t-lead mt-4">What Crawler measures, what the numbers mean and don&apos;t mean, and how they compare with real results so far.</p>

      <p className="card mt-8 p-5 text-sm">{DISCLAIMER}</p>

      <ol className="mt-12 space-y-10">
        <Part n={1} title="What Crawler measures">
          Simulated buying intent: how many AI-simulated customers, built from the audience you choose, say they would take your goal action (sign up,
          buy, start a trial) after seeing your real pages, and why the others wouldn&apos;t. Pages, prices and signup steps are captured from your live
          site; the decisions are made by an AI model role-playing each customer.
        </Part>
        <Part n={2} title="What a simulated customer is">
          A profile sampled in code (age, budget, mindset, device, where they came from, patience, a reason for visiting) that an AI model role-plays.
          It is not a real or surveyed person. Research shows models like this can reproduce many average human patterns, and also that they can be
          wrong, too uniform or biased toward some groups.{" "}
          <Link href="/science" className="underline underline-offset-2">
            Read the research and its limits
          </Link>
          .
        </Part>
        <Part n={3} title="What the scores mean">
          &quot;20 of 100 would sign up&quot; means 20 of the 100 simulated customers chose yes. The useful parts are the <em>reasons</em>, the
          <em> ranking</em> of problems, and the <em>change</em> between two versions tested on the same simulated customers.
        </Part>
        <Part n={4} title="What they do not mean">
          They are not your conversion rate, a revenue forecast, or a guarantee. Simulated customers usually say yes more often than real visitors
          do, and they never see your ads, your brand&apos;s reputation or a real checkout.
        </Part>
        <Part n={5} title="How predictions are compared with real behavior">
          After launch, founders can enter their real conversion rate (and, optionally, how many visitors and over how many days) under their report.
          We show each result here anonymously next to the prediction. Because simulated rates run higher, the fair test is the{" "}
          <em>ranking</em>: do pages Crawler rates higher also convert better in real life? That&apos;s the rank correlation below, shown only once
          there are at least 5 results.
        </Part>
        <Part n={6} title="Limits of AI-generated customer behavior">
          Models can be overconfident, miss cultural and personal context, over-represent some viewpoints, and react to wording more than real
          people do. Crawler reduces this with varied profiles, step-by-step reasoning, checks for copy-paste answers, counting in code and ranges
          across repeated crowds (apps and videos), but it can&apos;t remove it.
        </Part>
      </ol>

      <section className="card mt-14 p-6 sm:p-8" aria-labelledby="results-title">
        <h2 id="results-title" className="t-h3">
          Validation so far
        </h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          <Stat label="real results shared" value={String(rows.length)} />
          <Stat label="real visitors counted" value={withVisitors ? visitors.toLocaleString("en-US") : "not given"} hint={withVisitors ? `from ${withVisitors} of ${rows.length} results` : undefined} />
          <Stat label="time period" value={period} />
          <Stat label="avg predicted" value={rows.length ? `${avg(rows.map((r) => r.predicted)).toFixed(1)}%` : "-"} hint="simulated intent" />
          <Stat label="avg observed" value={rows.length ? `${avg(rows.map((r) => r.real)).toFixed(1)}%` : "-"} hint="real behavior" />
          <Stat label="ranking match" value={rank === null ? "needs 5+" : rank.toFixed(2)} hint="1 = higher predictions went with higher real results" />
        </dl>
        {!enough && (
          <p className="mt-8 rounded-lg border border-line-strong p-4 text-sm">
            There isn&apos;t enough real-world data yet to say how accurate Crawler is ({rows.length} result{rows.length === 1 ? "" : "s"} so far; we wait
            for at least 5 before showing a ranking). We&apos;d rather show this than invent numbers. {DISCLAIMER}
          </p>
        )}
        {rows.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Each real result next to Crawler&apos;s prediction</caption>
              <thead>
                <tr className="t-label border-b border-line">
                  <th scope="col" className="py-2 pr-4 font-normal">type</th>
                  <th scope="col" className="py-2 pr-4 font-normal">predicted (simulated)</th>
                  <th scope="col" className="py-2 pr-4 font-normal">observed (real)</th>
                  <th scope="col" className="py-2 pr-4 font-normal">simulated customers</th>
                  <th scope="col" className="py-2 pr-4 font-normal">real visitors</th>
                  <th scope="col" className="py-2 font-normal">period</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="py-3 pr-4">{r.kind}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.predicted}%</td>
                    <td className="py-3 pr-4 tabular-nums">{r.real}%</td>
                    <td className="py-3 pr-4 tabular-nums">{r.simulated ?? "-"}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.visitors ? r.visitors.toLocaleString("en-US") : "not given"}</td>
                    <td className="py-3 tabular-nums">{r.days ? `${r.days} days` : "-"}{r.month ? ` · ${r.month}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-6 text-xs text-faint">
          Methodology: each row is one finished Crawler test whose owner entered a real result. Predicted = share of simulated customers who said yes.
          Observed = the owner&apos;s own real conversion rate (we can&apos;t verify it). Results are self-reported and not a random sample. No names
          or websites are shown.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/onboarding" className="btn btn-primary h-12 px-6">
          Run a test <Arrow />
        </Link>
        <Link href="/science" className="btn btn-secondary h-12 px-6">
          The science
        </Link>
      </div>
    </div>
  );
}

function Part({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid gap-2 sm:grid-cols-[3rem_1fr]">
      <span className="font-mono text-sm text-accent">0{n}</span>
      <div>
        <h2 className="text-xl font-medium">{title}</h2>
        <p className="mt-2 text-muted">{children}</p>
      </div>
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="t-label">{label}</dt>
      <dd className="t-number mt-2 text-3xl">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

// Rank correlation: do higher predictions go with higher real results? (-1 to 1)
function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(xs.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2 + 1; // ties share the average rank
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
