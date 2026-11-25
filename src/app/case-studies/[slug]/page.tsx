// /case-studies/<slug>: one founder's story + their Crawler test (once it has run).
// Everything comes from src/lib/caseStudies.ts. Their numbers are labelled as reported by them;
// the Crawler section shows "coming soon" until a real test exists. Nothing here is invented.
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_STUDIES, findCaseStudy } from "@/lib/caseStudies";

export function generateStaticParams() {
  return CASE_STUDIES.filter((c) => c.published).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = findCaseStudy((await params).slug);
  if (!c) return { title: "Case study" };
  return {
    title: `${c.product}: ${c.founder}, ${c.age}`,
    description: c.summary,
    alternates: { canonical: `/case-studies/${c.slug}` },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = findCaseStudy((await params).slug);
  if (!c) notFound();
  const first = c.founder.split(" ")[0];

  return (
    <article className="mx-auto max-w-5xl py-10 sm:py-14">
      <Link href="/case-studies" className="text-sm text-faint hover:text-fg">
        ← All case studies
      </Link>

      {/* header: photo + icon + who */}
      <header className="mt-8 grid items-center gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="cs-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.photo} alt={c.photoAlt} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.icon} alt={c.iconAlt} className="cs-icon" />
        </div>
        <div>
          <p className="eyebrow14">Founder case study · {c.kind}</p>
          <h1 className="h2-14 mt-4">
            {c.founder} built {c.product} at {c.age}.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">{c.summary}</p>
          <dl className="mt-8 grid grid-cols-3 gap-3">
            {c.stats.map((s) => (
              <div key={s.label} className="cs-stat">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{s.value}</span>
                  <span className="mt-1 block text-xs text-muted">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-faint">Figures as reported by {first}. They come from before his Crawler test.</p>
        </div>
      </header>

      {/* the story */}
      <div className="mx-auto mt-20 max-w-2xl space-y-14">
        {c.story.map((s) => (
          <section key={s.heading}>
            <h2 className="text-2xl font-semibold tracking-tight">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-4 text-[17px] leading-relaxed text-fg">
                {p}
              </p>
            ))}
          </section>
        ))}

        {/* the Crawler test */}
        <section className="cs-test" aria-labelledby="cs-test-title">
          <p className="eyebrow14">The Crawler test</p>
          {c.crawler ? (
            <>
              <h2 id="cs-test-title" className="mt-3 text-2xl font-semibold tracking-tight">
                What Crawler found
              </h2>
              <p className="mt-3 text-muted">{c.crawler.tested}</p>
              <h3 className="mt-6 font-semibold">Findings</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {c.crawler.found.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <h3 className="mt-6 font-semibold">What {first} changed</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {c.crawler.changed.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {c.crawler.quote && <blockquote className="mt-6 border-l-2 border-line-strong pl-4 text-lg">&ldquo;{c.crawler.quote}&rdquo; <span className="block text-sm text-faint">{c.founder}</span></blockquote>}
            </>
          ) : (
            <>
              <h2 id="cs-test-title" className="mt-3 text-2xl font-semibold tracking-tight">
                Results coming soon.
              </h2>
              <p className="mt-3 text-muted">
                {first} is running {c.product} through Crawler. When the test is done we&apos;ll publish what the simulated customers said, what he changed, and what happened next. Nothing here will be made up.
              </p>
            </>
          )}
        </section>

        <section className="cs-cta">
          <h2 className="text-2xl font-semibold tracking-tight">Test your app like {first}.</h2>
          <p className="mt-2 text-muted">Your first simulation is free. No credit card.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding" className="btn btn-primary h-12 px-6">
              Start a simulation
            </Link>
            <Link href="/example" className="btn btn-secondary h-12 px-6">
              See a sample report
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
