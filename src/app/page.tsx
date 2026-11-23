// The home page. One job: make a new visitor understand Crawler in seconds and start a simulation.
//   Hero (promise + URL box + demo picture) → How it works → Meet your customers → What Crawler
//   analyzes → Interactive sample report (DEMO DATA) → Use cases → FAQ → Final CTA.
// Every number on this page is either a real plan fact (src/lib/plans.ts) or clearly labelled demo data.
// Signed-in visitors are sent to /dashboard by the middleware (unless ?home=1).
import Link from "next/link";
import HeroForm from "@/components/landing/home/HeroForm";
import HeroVisual from "@/components/landing/home/HeroVisual";
import SampleReport from "@/components/landing/home/SampleReport";
import { Analyzes, FinalCta, HowItWorks, MeetCustomers, SectionHead, UseCases } from "@/components/landing/home/sections";
import Faq from "@/components/landing/Faq";
import { homeDemo } from "@/lib/homeDemo";
import { STARTER_CUSTOMERS } from "@/lib/plans";
import ScrollMarquee from "@/components/landing/motion/ScrollMarquee";

export const metadata = {
  title: { absolute: "Crawler: AI customer simulations for your website" },
  description:
    "Would your customers actually buy? Crawler runs AI-simulated customers through your website, store or app and shows what makes them buy, what makes them leave, and what to fix before launch.",
  alternates: { canonical: "/" },
};

export default function Home() {
  const demo = homeDemo();
  return (
    // .bleed-full breaks out of the page's narrow column so the home page can use the whole screen.
    <div className="home bleed-full -mt-12 sm:-mt-16">
      {/* ---------- Hero: fills the first screen ---------- */}
      <section className="home-wide grid min-h-[calc(100svh-4rem)] items-center gap-12 py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16" aria-labelledby="hero-title">
        <div className="rise">
          {/* the hook: a real, sourced fact about how fast people leave */}
          <p className="hook-pill">
            <span className="hook-dot" aria-hidden />
            Visitors decide in about 10 seconds. They never tell you why.
          </p>
          <h1 id="hero-title" className="t-display mt-6">
            Would your customers <span className="text-accent">actually</span> buy?
          </h1>
          <p className="t-lead mt-6 max-w-xl text-lg sm:text-xl">
            Paste your link. AI shoppers try your site and tell you exactly why they wouldn&apos;t buy, and what to fix before launch.
          </p>
          <div className="mt-8 max-w-xl">
            <HeroForm />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#how" className="btn btn-text h-11 px-0 text-sm">
              See How It Works ↓
            </a>
            <span className="text-sm text-muted">No credit card required to get started.</span>
          </div>
          <p className="mt-2 text-xs text-faint">
            Free: 1 test with {STARTER_CUSTOMERS} simulated customers. Results show simulated buying intent, not real purchases. 10-second fact:{" "}
            <a href="https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Nielsen Norman Group
            </a>
            .
          </p>
        </div>
        <div className="rise d2 hero-visual-wrap">
          <HeroVisual demo={demo.hero} />
        </div>
      </section>

      {/* ---------- full-width banner: what Crawler catches ---------- */}
      <div className="border-y border-line py-6">
        <ScrollMarquee
          size="md"
          pace={90}
          className="self-stretch"
          label="Problems Crawler catches"
          items={["Price hidden", "No reviews", "6-field signup", "Vague headline", "Card required", "No returns policy", "Slow on phones", "Shipping surprise"]}
        />
      </div>

      <div className="home-wide space-y-28 pb-28 pt-20 sm:space-y-36 sm:pb-36 sm:pt-24">
      {/* ---------- the problem, said bluntly ---------- */}
      <section aria-labelledby="problem-title">
        <p className="t-label">The problem</p>
        <h2 id="problem-title" className="sr-only">
          Why launches fail quietly
        </h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {[
            ["They leave.", "They never tell you why.", "Most visitors bounce in seconds. Your analytics shows that they left, not the reason."],
            ["Friends are nice.", "Strangers don't buy.", "People who know you say it looks great. People who don't, quietly close the tab."],
            ["A/B tests need traffic.", "You don't have it yet.", "Before launch there's nobody to test on. After launch, you're guessing with real customers."],
          ].map(([a, b, c]) => (
            <div key={a} className="bg-bg p-8 sm:p-10">
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{a}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-muted sm:text-4xl">{b}</p>
              <p className="mt-5 text-muted">{c}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-2xl font-medium tracking-tight sm:text-3xl">
          Crawler gives you the <span className="text-accent">why</span>, before launch day.
        </p>
      </section>

      <HowItWorks />
      <MeetCustomers />
      <Analyzes />

      {/* ---------- Sample report ---------- */}
      <section aria-labelledby="sample-title">
        <SectionHead
          label="Sample report"
          id="sample-title"
          title="What you get back."
          sub="Click through a full example: decisions, who said what, the objections, and ranked fixes. It's demo data from a made-up site."
        />
        <div className="mt-10">
          <SampleReport data={demo.sample} />
        </div>
      </section>

      <UseCases />
      <Faq />
      <FinalCta />
      <p className="-mt-20 text-center text-sm text-muted sm:-mt-28">
        Want the details first?{" "}
        <Link href="/science" className="underline underline-offset-2">
          How the simulation works
        </Link>{" "}
        ·{" "}
        <Link href="/accuracy" className="underline underline-offset-2">
          Accuracy
        </Link>{" "}
        ·{" "}
        <Link href="/pricing" className="underline underline-offset-2">
          Pricing
        </Link>
      </p>
      </div>
    </div>
  );
}
