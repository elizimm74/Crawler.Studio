// THE SAMPLE REPORT on the home page: what a finished Crawler report looks like, drawn with the
// made-up MealMate demo run (every number is counted from that demo, and labelled as simulated).
// Server component; the bars grow in when they scroll into view (.rp-grow + Reveal).
import type { SampleData } from "@/components/landing/home/SampleReport";
import type { FunnelRow } from "@/lib/homeDemo";
import Reveal from "@/components/Reveal";

const PRIO: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

export default function ReportPreview({ data, funnel }: { data: SampleData; funnel: FunnelRow[] }) {
  const pct = (n: number) => Math.round((n / data.total) * 100);
  const lostMax = Math.max(1, ...funnel.map((f) => f.lost));
  const quotes = [data.people.find((x) => x.verdict === "buy"), data.people.find((x) => x.verdict === "maybe"), data.people.find((x) => x.verdict === "no")].filter(Boolean) as SampleData["people"];
  return (
    <Reveal>
      <div className="rp">
        <div className="sim-bar">
          <span className="sim-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="truncate text-[12px] text-faint">
            Reports <span className="mx-1">/</span> <span className="text-fg">{data.host} · Run 01</span>
          </span>
          <span className="rp-badge">Simulated results · demo data</span>
        </div>

        <div className="grid gap-px bg-line lg:grid-cols-[0.9fr_1.1fr]">
          {/* left: the answer */}
          <div className="rp-cell">
            <p className="sim-label">Purchase intent</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="rp-score">{data.buy}</span>
              <span className="text-lg text-faint">/ {data.total} would sign up</span>
            </p>
            <div className="sim-stack mt-5" aria-hidden>
              <i className="v-buy rp-grow" style={{ width: `${pct(data.buy)}%` }} />
              <i className="v-maybe rp-grow" style={{ width: `${pct(data.maybe)}%` }} />
              <i className="v-no rp-grow" style={{ width: `${pct(data.no)}%` }} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
              {(
                [
                  ["Would buy", data.buy, "v-buy"],
                  ["Maybe", data.maybe, "v-maybe"],
                  ["Wouldn't", data.no, "v-no"],
                ] as const
              ).map(([k, v, c]) => (
                <div key={k}>
                  <dt className="flex items-center gap-1.5 text-faint">
                    <i className={`rp-dot ${c}`} aria-hidden /> {k}
                  </dt>
                  <dd className="mt-0.5 text-[15px] text-fg">{pct(v)}%</dd>
                </div>
              ))}
            </dl>

            <p className="sim-label mt-9">Where they stopped</p>
            <ul className="mt-4 space-y-3">
              {funnel.map((f) => (
                <li key={f.step} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-[13px]">
                  <span className="text-muted">{f.label}</span>
                  <span className="sim-meter !mt-0">
                    <i className="rp-grow" style={{ width: `${(f.lost / lostMax) * 100}%` }} />
                  </span>
                  <span className="text-right text-fg">{f.lost}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-faint">Simulated customers who left at each step, out of {data.total}.</p>
          </div>

          {/* right: why, and what to do */}
          <div className="rp-cell">
            <p className="sim-label">Main objections</p>
            <ul className="mt-4 space-y-4">
              {data.objections.slice(0, 3).map((o) => (
                <li key={o.category}>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="capitalize text-fg">{o.category}</span>
                    <span className="text-faint">
                      {o.count} customers · {o.pct}%
                    </span>
                  </div>
                  <div className="sim-meter">
                    <i className="rp-grow" style={{ width: `${o.pct}%` }} />
                  </div>
                  {o.example && <p className="mt-1.5 truncate text-[12px] text-faint">&ldquo;{o.example}&rdquo;</p>}
                </li>
              ))}
            </ul>

            <p className="sim-label mt-9">Ranked fixes</p>
            <ol className="mt-4 space-y-2">
              {data.fixes.slice(0, 3).map((f, k) => (
                <li key={f.title} className="rp-fix">
                  <span className="rp-num">0{k + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-fg">{f.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-faint">{f.change}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rp-win">+{f.winBack}</span>
                    {f.priority && <span className="text-[10px] uppercase tracking-[0.12em] text-faint">{PRIO[f.priority] ?? f.priority}</span>}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[11px] text-faint">+N = simulated customers each fix could win back, counted in code.</p>
          </div>
        </div>

        {/* a few of the customers, in their own words */}
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
          {quotes.map((q, k) => (
            <figure key={k} className="rp-cell !py-5">
              <span className={`sim-tag v-${q.verdict}`}>{q.verdict === "buy" ? "Would buy" : q.verdict === "maybe" ? "Maybe" : "Wouldn't buy"}</span>
              <blockquote className="mt-3 text-[14px] leading-snug text-fg">&ldquo;{q.quote}&rdquo;</blockquote>
              <figcaption className="mt-2 truncate text-[12px] text-faint">{q.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
