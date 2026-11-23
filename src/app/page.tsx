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

export const metadata = {
  title: { absolute: "Crawler: AI customer simulations for your website" },
  description:
    "Would your customers actually buy? Crawler runs AI-simulated customers through your website, store or app and shows what makes them buy, what makes them leave, and what to fix before launch.",
  alternates: { canonical: "/" },
};

export default function Home() {
  const demo = homeDemo();
  return (
    <div className="home space-y-28 sm:space-y-36">
      {/* ---------- Hero ---------- */}
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1fr_1.05fr] lg:gap-16" aria-labelledby="hero-title">
        <div className="rise">
          <p className="t-label">AI customer simulation</p>
          <h1 id="hero-title" className="t-display mt-4">
            Would your customers actually buy?
          </h1>
          <p className="t-lead mt-6 max-w-xl">
            Test your website with AI-powered customer simulations. Discover what makes people buy, what makes them leave, and exactly what to fix before launch.
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
            Free: 1 test with {STARTER_CUSTOMERS} simulated customers. Results show simulated buying intent, not real purchases.
          </p>
        </div>
        <div className="rise d2">
          <HeroVisual demo={demo.hero} />
        </div>
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
  );
}
