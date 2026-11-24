// A standalone landing page at /landing, built only from the existing design system
// (globals.css tokens, .t-* type scale, .card / .btn classes, Geist, the green brand colour).
// Honest by design: simulated customers and buying intent, never real purchases, and no
// invented logos, reviews or numbers. The example result is clearly labelled as an example.
import Link from "next/link";
import Mark from "@/components/Mark";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: { absolute: "Crawler: find out why customers won't buy, before you launch" },
  description:
    "Crawler runs AI-simulated customers through your website, store or app and shows what makes them buy, what makes them leave, and what to fix before launch.",
  alternates: { canonical: "/landing" },
};

const STEPS = [
  {
    n: "01",
    title: "Paste your link",
    body: "Your website, store or app. Crawler opens it the way a visitor would and reads the pages, prices and sign-up flow.",
  },
  {
    n: "02",
    title: "Pick who to test with",
    body: "Choose the kind of customer you want, such as students, busy parents or small business owners. Or let Crawler suggest one.",
  },
  {
    n: "03",
    title: "Read what they said",
    body: "Each simulated customer says buy, maybe or no, gives the main reason, and what would change their mind.",
  },
];

const RESULTS = [
  { title: "Buying intent", body: "How many simulated customers would buy, broken down by segment, so you know who the page is for." },
  { title: "Biggest blocker", body: "The single reason most people leave, grouped from every answer. Price, trust, confusing sign-up and more." },
  { title: "Ranked fixes", body: "Changes sorted by how many simulated customers each one would win back, with rewritten copy you can use." },
];

const QUESTIONS = [
  {
    q: "Are these real people?",
    a: "No. They are AI-simulated customers built from the audience you choose. Use the result to find problems to test, not as a sales forecast.",
  },
  {
    q: "Does it make purchases?",
    a: "No. Crawler measures buying intent only. Nothing is bought, and no one is contacted.",
  },
  {
    q: "What do I need to start?",
    a: "A link and a few answers about who the product is for. No credit card is needed to start.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* HERO */}
      <section className="home-wide pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid items-center gap-16 md:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="t-label mb-6 inline-flex items-center gap-2 text-faint">
              <Mark size={16} /> Crawler · simulated customers
            </p>
            <h1 className="t-h1 max-w-[16ch]">
              Would your customers actually buy?
            </h1>
            <p className="t-lead mt-6 max-w-[44ch] text-muted">
              Crawler runs simulated customers through your site, store or app and shows what makes them buy, what makes them leave, and what to fix before you launch.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/onboarding" className="btn btn-primary h-12 px-7">
                Test my site
              </Link>
              <a href="#how" className="btn btn-secondary h-12 px-7">
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-faint">
              Simulated buying intent, not real purchases. No credit card required.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <ExampleCard />
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="home-wide py-24 md:py-32">
        <div className="eyebrow">
          <span>How it works</span>
          <span>3 steps</span>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <article className="card h-full p-8">
                <p className="t-label text-accent-ink">{s.n}</p>
                <h3 className="t-h3 mt-6">{s.title}</h3>
                <p className="mt-4 text-muted">{s.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="home-wide py-24 md:py-32">
        <div className="eyebrow">
          <span>What you get</span>
          <span>Before launch day</span>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line md:grid-cols-3">
          {RESULTS.map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <div className="h-full bg-bg p-8 md:p-10">
                <h3 className="t-h3">{r.title}</h3>
                <p className="mt-4 text-muted">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* QUESTIONS */}
      <section className="home-wide py-24 md:py-32">
        <div className="eyebrow">
          <span>Good to know</span>
          <span>Honest answers</span>
        </div>
        <dl className="mt-16 grid gap-10 md:grid-cols-3">
          {QUESTIONS.map((item) => (
            <div key={item.q}>
              <dt className="t-h3">{item.q}</dt>
              <dd className="mt-4 text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* FINAL CTA */}
      <section className="home-wide pt-12 pb-32">
        <Reveal>
          <div className="card flex flex-col items-start gap-8 p-10 md:flex-row md:items-center md:justify-between md:p-14">
            <div>
              <h2 className="t-h2 max-w-[20ch]">Find the problem before your customers do.</h2>
              <p className="mt-4 max-w-[48ch] text-muted">Start with one link. You will see your first results in minutes.</p>
            </div>
            <Link href="/onboarding" className="btn btn-primary h-12 shrink-0 px-7">
              Test my site
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

// A small, clearly labelled example of what a result looks like (made-up numbers).
function ExampleCard() {
  return (
    <div className="card p-8">
      <div className="flex items-center justify-between text-xs text-faint">
        <span className="t-label">Example result</span>
        <span>Demo data</span>
      </div>
      <div className="mt-8 flex items-end gap-3">
        <span className="t-display text-accent-ink">12</span>
        <span className="pb-3 text-muted">of 25 would buy</span>
      </div>
      <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-raised" aria-hidden="true">
        <div className="h-full w-[48%] rounded-full bg-accent-ink" />
      </div>
      <dl className="mt-8 space-y-4 text-sm">
        <div className="flex justify-between gap-4 border-t border-line pt-4">
          <dt className="text-muted">Biggest blocker</dt>
          <dd>Price is unclear</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-4">
          <dt className="text-muted">Top fix</dt>
          <dd>Show the price on the hero</dd>
        </div>
      </dl>
    </div>
  );
}
