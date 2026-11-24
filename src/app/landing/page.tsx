// The landing page at /landing: the current look (white + brand green, Geist, editorial rows),
// built from the existing design system. Honest by design: simulated customers and buying intent,
// never real purchases, and no invented logos, reviews or numbers. The example result is labelled.
import Link from "next/link";
import HeroForm from "@/components/landing/home/HeroForm";
import Waitlist from "@/components/landing/Waitlist";
import Mark from "@/components/Mark";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: { absolute: "Crawler: find out why customers won't buy, before you launch" },
  description:
    "Crawler runs AI-simulated customers through your website, store, app, game or video and shows what makes them buy, what makes them leave, and what to fix before launch.",
  alternates: { canonical: "/landing" },
};

const HOW = [
  {
    n: "01",
    title: "Give us your link",
    body: "A website, online store, app, game or video or ad. Crawler opens it the way a visitor would, reads the pages, prices and sign-up flow, and checks the address first.",
  },
  {
    n: "02",
    title: "Pick who to test with",
    body: "Choose a customer, such as students, busy parents or small business owners, or let Crawler suggest one from your page. You can save your own.",
  },
  {
    n: "03",
    title: "100 simulated customers try it",
    body: "Each one looks, thinks and decides in order: first glance, what they need, what would stop them, whether they trust it, then buy, maybe or no.",
  },
  {
    n: "04",
    title: "Get the reasons and the fixes",
    body: "Results are counted in code: buying intent, what stopped people, and ranked fixes with rewritten copy. Copy a fix prompt, change the page, then re-test with the same customers.",
  },
];

const FAQ = [
  {
    q: "Are these real people?",
    a: "No. They are AI-simulated customers built from the audience you choose. Use the result to find problems to test, not as a sales forecast.",
  },
  {
    q: "Does it make purchases or contact anyone?",
    a: "No. Crawler measures buying intent only. Nothing is bought, and no one is contacted.",
  },
  {
    q: "What do I need to start?",
    a: "A link and a few answers about who the product is for. No credit card is needed to start, and the free plan includes a starter test.",
  },
  {
    q: "What does it cost?",
    a: "Free to start. Paid plans begin at $25 a month for 1,000 simulated customers a month, and they renew automatically until you cancel.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="home-wide pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="grid items-center gap-16 md:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="t-label mb-6 inline-flex items-center gap-2 text-faint">
              <Mark size={16} /> Crawler · simulated customers
            </p>
            <h1 className="t-h1 max-w-[16ch]">Would your customers actually buy?</h1>
            <p className="t-lead mt-6 max-w-[44ch] text-muted">
              Crawler runs simulated customers through your site, store, app or video and shows what makes them buy, what makes them leave, and what to fix before you launch.
            </p>
            <div className="mt-10 max-w-xl">
              <HeroForm cta="Test my site free" id="landing-url" />
            </div>
            <p className="mt-6 text-sm text-faint">
              Simulated buying intent, not real purchases. No credit card to start.{" "}
              <Link href="/example" className="underline underline-offset-4">
                See a full example report
              </Link>
            </p>
          </Reveal>
          <Reveal delay={120}>
            <ExampleCard />
          </Reveal>
        </div>
      </section>

      {/* VIDEO */}
      <section className="home-wide py-20 md:py-28">
        <div className="eyebrow">
          <span>Watch it</span>
          <span>38 seconds</span>
        </div>
        <Reveal>
          <div className="mt-12 overflow-hidden rounded-[12px] border border-line bg-black">
            <video
              className="aspect-video w-full"
              src="/video/crawler-launch-web.mp4"
              controls
              playsInline
              preload="metadata"
              aria-label="Crawler launch video: simulated customers test a landing page and show what stops them from buying"
            >
              Your browser can&apos;t play this video. You can still read the steps below.
            </video>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="home-wide py-20 md:py-28">
        <div className="eyebrow">
          <span>How the product works</span>
          <span>Four steps, about a few minutes</span>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2">
          {HOW.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <li className="card h-full list-none p-8">
                <p className="t-label text-accent-ink">{s.n}</p>
                <h3 className="t-h3 mt-6">{s.title}</h3>
                <p className="mt-4 text-muted">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <p className="mt-10 max-w-[60ch] text-sm text-faint">
          How accurate is it? Simulated customers show direction, not a sales forecast. Each result says how many people it covered and what it could not check, and the research behind the customer model is published on the science page.{" "}
          <Link href="/science" className="underline underline-offset-4">
            Read the science
          </Link>
          .
        </p>
      </section>

      {/* WAITLIST */}
      <section className="home-wide py-20 md:py-28">
        <div className="eyebrow">
          <span>Get the launch email</span>
          <span>One email at launch</span>
        </div>
        <Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-start">
            <div>
              <h2 className="t-h2 max-w-[18ch]">Be first to test your product.</h2>
              <p className="mt-4 max-w-[44ch] text-muted">
                Add your name and email and we will tell you the day Crawler opens. One email at launch, the odd update, and you can unsubscribe from any email. We don&apos;t sell your email.
              </p>
            </div>
            <div className="card p-8">
              <Waitlist />
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="home-wide py-20 md:py-28">
        <div className="eyebrow">
          <span>Good to know</span>
          <span>Honest answers</span>
        </div>
        <dl className="mt-12 grid gap-10 md:grid-cols-2">
          {FAQ.map((item) => (
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
              <p className="mt-4 max-w-[48ch] text-muted">Start with one link. Your first results come back in a few minutes.</p>
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
