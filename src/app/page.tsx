// The home page: the word "crawler" (huge, chunky) and one button, then, as you
// scroll down, the white sheet with every feature slides UP over the blue
// screen (the blue screen is sticky; ScrollLift pushes it back as you scroll).
// The button starts the questions, then the first test.
// (The intro animation that tears the page open lives in layout.tsx.)
import Link from "next/link";
import Claws from "@/components/Claws";
import { Arrow } from "@/components/landing/UrlForm";
import Features from "@/components/landing/Features";
import ScrollLift from "@/components/landing/ScrollLift";
import SmoothScroll from "@/components/landing/motion/SmoothScroll";
import Magnetic from "@/components/landing/motion/Magnetic";
import HomeOutro from "@/components/landing/HomeOutro";
import ScrollMarquee from "@/components/landing/motion/ScrollMarquee";

export default function Home() {
  return (
    <>
      {/* sticky: stays in place while the white sheet scrolls over it.
          -mt cancels main's top padding; the height is the screen minus the header. */}
      <section className="home-hero sticky top-16 -mt-12 h-[calc(100svh-4rem)] sm:-mt-16">
        <ScrollLift className="relative isolate flex h-full flex-col items-center text-center">
          {/* the big moving banner across the top: what Crawler is */}
          <ScrollMarquee size="md" pace={115} className="rise" label="What Crawler is" items={["100 customers", "Real reasons", "Before launch", "Any product"]} />
          <div className="relative flex flex-1 flex-col items-center justify-center pb-8">
          {/* faint claw scratches behind the word */}
          <Claws
            delay={0.3}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[22rem] w-72 -translate-x-1/2 -translate-y-1/2 opacity-[0.12] sm:h-[34rem] sm:w-[28rem]"
          />
          <h1 className="t-wordmark rise">crawler</h1>
          <p className="t-lead rise d1 mt-8 max-w-lg px-4">
            100 simulated customers try your app, game, site or store and tell you exactly why they wouldn&apos;t buy, before launch day.
          </p>
          <div className="rise d2 mt-10 flex flex-wrap items-center justify-center gap-3 px-4">
            <Magnetic>
              <Link href="/onboarding" className="btn btn-primary h-14 px-8 text-base">
                Test my product
                <Arrow />
              </Link>
            </Magnetic>
            {/* Crawler's own simulated customers ranked this #1: let people see a whole report before signing up */}
            <Link href="/example" className="btn btn-secondary h-14 px-6 text-base">
              See a full report, no sign-up
            </Link>
          </div>
          {/* what people worry about before signing up, answered in one line (all true: keep it that way) */}
          <p className="rise d3 mt-6 px-4 text-sm text-muted">No card needed · No marketing emails · Results in a few minutes</p>
          </div>
        </ScrollLift>
      </section>

      <Features />
      <HomeOutro />
      {/* inertial scrolling for mouse / trackpad (phones keep native scrolling) */}
      <SmoothScroll />
    </>
  );
}
