// The home page, v6 (2026-11-24, founder's "complete brand, UI/UX & conversion redesign":
// premium like aaru.com but Crawler's own, blue/black/white, the product as the hero visual).
//   Hero: badge, headline, URL box (the starting point), live simulation preview
//   → How it works (4 steps, each with a tiny UI) → Meet your customers → What Crawler analyzes
//   → Sample report → Use cases → Honest by design + free plan → FAQ → final URL box.
// Every number is a real plan fact (src/lib/plans.ts) or clearly labelled demo data (the made-up
// MealMate example in src/lib/example.ts). No invented testimonials, users or accuracy claims.
import Link from "next/link";
import HeroForm from "@/components/landing/home/HeroForm";
import { PERSONAS } from "@/components/landing/home/sections";
import SimConsole from "@/components/landing/v14/SimConsole";
import ReportPreview from "@/components/landing/v14/ReportPreview";
import SimField from "@/components/landing/v14/SimField";
import ScrubBand from "@/components/landing/v14/ScrubBand";
import Manifesto from "@/components/landing/motion/Manifesto";
import Reveal from "@/components/Reveal";
import Faq from "@/components/landing/Faq";
import { homeDemo } from "@/lib/homeDemo";
import { PLANS, STARTER_CUSTOMERS } from "@/lib/plans";

export const metadata = {
  title: { absolute: "Crawler: meet your customers before they meet your website" },
  description:
    "Crawler sends AI-simulated customers through your website, store or app. See who would buy, why the rest leave, and exactly what to fix, before launch.",
  alternates: { canonical: "/" },
};

const lowestPaid = Math.min(...PLANS.filter((p) => p.priceUsd > 0).map((p) => p.priceUsd));

export default function Home() {
  const demo = homeDemo();
  const s = demo.sample;

  return (
    <div className="v14 bleed-full">
      {/* ================= HERO ================= */}
      <section className="hero14 home-wide pb-16 pt-12 sm:pt-20" aria-labelledby="hero-title">
        {/* the two lines drift apart as you scroll away (ScrollScrub "leave" -> --p) */}
        <h1 id="hero-title" className="h14 rise d1 max-w-6xl" data-scrub="leave" data-lag="0.8">
          <span className="scrub-l inline-block">Meet your customers</span> <span className="hl14 scrub-r inline-block sm:block">before they meet your website.</span>
        </h1>
        <div className="rise d2 mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="lead14">Crawler sends 100 AI-simulated customers through your site. See who would buy, why the rest leave, and exactly what to fix, in minutes.</p>
            <div className="url14 mt-8">
              <HeroForm cta="Run free simulation" />
            </div>
            <p className="mt-4 text-sm text-faint">
              No credit card · Free: 1 test with {STARTER_CUSTOMERS} simulated customers ·{" "}
              <Link href="#report" className="text-muted underline-offset-4 hover:text-fg hover:underline">
                See a sample report
              </Link>
            </p>
          </div>
          <Link href="/example" className="badge14 self-start justify-self-start lg:self-end">
            <span className="badge14-dot" aria-hidden />
            <span>
              Websites, stores, apps <span className="text-faint">and ads</span>
            </span>
            <span className="text-faint" aria-hidden>
              →
            </span>
          </Link>
        </div>
        {/* the product window rises and settles as it comes up (ScrollScrub "enter") */}
        <div className="rise d4 scrub-rise relative mt-16 text-left" data-scrub="enter" data-lag="0.7">
          <div className="stage14" aria-hidden />
          <SimConsole
            host={s.host}
            total={s.total}
            buy={s.buy}
            maybe={s.maybe}
            no={s.no}
            sim={demo.sim}
            objections={s.objections}
            topFix={s.fixes[0]?.title ?? ""}
            winBack={s.fixes[0]?.winBack ?? 0}
          />
        </div>
      </section>

      {/* ================= THE BLOCKERS, sliding past as you scroll (klad-style scrubbed band) ================= */}
      <ScrubBand />

      {/* ================= STATEMENT, on a washed-black band (night18): words light up as you scroll ================= */}
      <section className="night18 home-wide" aria-label="What Crawler is">
        <Manifesto
          bare
          className="statement14 max-w-5xl"
          text="*A focus group that never sleeps.* Crawler sends simulated customers through your launch before real ones arrive, so the first people to hit the price, the signup or the cart are ones who can tell you why they left."
        />
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="home-wide scroll-mt-24 py-20 sm:py-28" aria-labelledby="how-title">
        <Head eyebrow="How a simulation works" id="how-title" title="From a link to a list of fixes." sub="No setup, no tracking code, no real visitors needed. Scroll to watch Crawler run a simulation, step by step." />
        {/* the animated "how a simulation works" field (demo data), see SimField.tsx */}
        <div className="mt-14">
          <SimField crowd={demo.crowd} host={demo.sample.host} topFix={demo.sample.fixes[0]?.title} winBack={demo.sample.fixes[0]?.winBack} />
        </div>
      </section>

      {/* ================= MEET YOUR CUSTOMERS ================= */}
      <section className="home-wide py-20 sm:py-28" aria-labelledby="meet-title">
        <Head
          eyebrow="Meet your customers"
          id="meet-title"
          title="Not one opinion. A hundred different ones."
          sub="Every test mixes people like these, sampled from the audience you pick: different budgets, moods, reasons for visiting and dealbreakers."
        />
        <ul className="personas14 mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.slice(0, 8).map((p, k) => (
            <li key={p.name} className="h-full">
              <Reveal delay={(k % 4) * 70} className="tile14 h-full">
                <div className="flex items-center gap-3">
                  <span className={`avatar14 a${k % 4}`} aria-hidden>
                    {p.name.replace(/^The /, "").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight tracking-tight">{p.name}</h3>
                    <p className="text-xs text-faint">Age {p.age}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="chip14">Budget: {p.budget.toLowerCase()}</span>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-faint">Buys for</dt>
                    <dd className="mt-0.5 text-fg">{p.motive}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-faint">Leaves when</dt>
                    <dd className="mt-0.5 text-fg">{p.objection}</dd>
                  </div>
                </dl>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-faint">
          Synthetic personas, not real or surveyed people. Their traits come from published research and labelled assumptions:{" "}
          <Link href="/science" className="underline underline-offset-2 hover:text-fg">
            read the science
          </Link>
          .
        </p>
      </section>

      {/* ================= WHAT CRAWLER ANALYZES ================= */}
      <section className="night18 home-wide" aria-labelledby="areas-title">
        <Head eyebrow="What Crawler analyzes" id="areas-title" title="Everything a first-time visitor judges." sub="On desktop and on a phone, from the first screen to the cart or signup." />
        <ul className="bento14 mt-14">
          {AREAS.map(([title, body, icon], k) => (
            <li key={title} className={`bento14-cell ${k < 2 ? "is-big" : ""}`}>
              {k === 0 && <MiniPricing />}
              {k === 1 && <MiniObjections data={s.objections} />}
              {k > 1 && (
                <span className="icon14" aria-hidden>
                  <Icon d={icon} />
                </span>
              )}
              <h3 className={`${k < 2 ? "mt-8" : "mt-5"} font-medium tracking-tight`}>
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-faint">Crawler looks and clicks like a visitor. It never pays, checks out or types into card fields.</p>
      </section>

      {/* ================= SAMPLE REPORT ================= */}
      <section id="report" className="band17 home-wide scroll-mt-24 py-20 sm:py-28" aria-labelledby="report-title">
        <Head
          eyebrow="Sample report"
          id="report-title"
          title="A report you'd actually pay for."
          sub="Who would buy, what stopped everyone else, where they left, and fixes ranked by how many customers each could win back."
        />
        <div className="scrub-rise mt-14" data-scrub="enter" data-lag="0.7">
          <ReportPreview data={s} funnel={demo.funnel} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/example" className="btn btn-secondary h-12 px-6">
            Open the full sample report
          </Link>
          <Link href="/onboarding" className="btn btn-primary h-12 px-6">
            Run yours free
          </Link>
        </div>
      </section>

      {/* ================= USE CASES ================= */}
      <section className="home-wide py-20 sm:py-28" aria-labelledby="uses-title">
        <Head eyebrow="Use cases" id="uses-title" title="Built for people who launch things." />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USES.map((u, k) => (
            <li key={u.title} className="h-full">
              <Reveal delay={(k % 3) * 80} className="tile14 use14 h-full">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight">{u.title}</h3>
                  {u.tag && <span className="chip14">{u.tag}</span>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{u.body}</p>
                <p className="mt-5 border-t border-line pt-4 text-[13px] text-fg">
                  <span className="text-faint">Ask it: </span>
                  {u.ask}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ================= HONEST BY DESIGN + FREE PLAN ================= */}
      <section className="night18 home-wide" aria-labelledby="honest-title">
        <div className="honest14">
          <div>
            <p className="eyebrow14">Honest by design</p>
            <h2 id="honest-title" className="h2-14 mt-4">
              A strong hint, <span className="text-faint">not a crystal ball.</span>
            </h2>
            <p className="mt-5 max-w-md text-muted">
              Simulated customers show you likely problems fast and cheap. They don&apos;t replace real customers, so every report says so, and every number traces back to who said it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/science" className="btn btn-secondary h-11 px-5 text-sm">
                Read the science
              </Link>
              <Link href="/accuracy" className="btn btn-text h-11 px-3 text-sm">
                How we measure accuracy →
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {HONEST.map(([t, b]) => (
              <li key={t} className="tile14 !p-5">
                <h3 className="font-semibold tracking-tight">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{b}</p>
              </li>
            ))}
            <li className="tile14 plan14 !p-5 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold tracking-tight">Start free</h3>
                  <p className="mt-1 text-sm text-muted">
                    1 test with {STARTER_CUSTOMERS} simulated customers, no card. Plans from ${lowestPaid}/month.
                  </p>
                </div>
                <Link href="/pricing" className="btn btn-secondary h-11 px-5 text-sm">
                  See pricing
                </Link>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="home-wide py-20 sm:py-28">
        <Faq />
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="home-wide pb-28" aria-labelledby="final-title">
        <div className="final14">
          <h2 id="final-title" className="h2-14 mx-auto max-w-3xl">
            Your next customer is about to visit. <span className="hl14">Meet them first.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-muted">Paste your website. Your first simulation is free and takes a few minutes.</p>
          <div className="url14 mx-auto mt-9 max-w-2xl text-left">
            <HeroForm cta="Run free simulation" id="final-url" />
          </div>
          <p className="mt-4 text-sm text-faint">No credit card required.</p>
        </div>
      </section>
      {/* soft, inertial scrolling (mouse / trackpad only; off for reduced motion) */}
    </div>
  );
}

function Head({ eyebrow, id, title, sub }: { eyebrow: string; id: string; title: string; sub?: string }) {
  // Linear-style split header: label + title on the left, the one-line explanation on the right.
  return (
    <div className="head14">
      <div>
        <p className="eyebrow14">{eyebrow}</p>
        <h2 id={id} className="h2-14 mt-4 max-w-xl">
          {title}
        </h2>
      </div>
      {sub && <p className="max-w-md text-muted lg:pb-2">{sub}</p>}
    </div>
  );
}

// Bento card visuals: tiny pieces of real Crawler UI (demo data), not illustrations.
function MiniPricing() {
  return (
    <div className="bento14-visual" aria-hidden>
      <div className="mini-plan">
        <span className="text-[12px] text-faint">Pro plan</span>
        <span className="mini-blur">$••</span>
        <span className="mini-flag">Price hidden until signup</span>
      </div>
      <div className="mini-plan is-dim">
        <span className="text-[12px] text-faint">Team</span>
        <span className="text-[13px] text-muted">Contact sales</span>
      </div>
    </div>
  );
}
function MiniObjections({ data }: { data: { category: string; pct: number }[] }) {
  return (
    <div className="bento14-visual !block" aria-hidden>
      {data.slice(0, 3).map((o) => (
        <div key={o.category} className="mb-3 last:mb-0">
          <div className="flex justify-between text-[12px]">
            <span className="capitalize text-fg">{o.category}</span>
            <span className="text-faint">{o.pct}%</span>
          </div>
          <div className="sim-meter">
            <i style={{ width: `${o.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ---------- content ----------


const AREAS: [string, string, string][] = [
  ["Pricing", "Can they find it, read it, and does it feel fair?", "M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3.2 4.5 1.5 4.5 3.3-2 3-4.5 3-4.5-1.3-4.5-3"],
  ["Purchase objections", "Each customer's main reason not to buy, grouped and counted.", "M12 8v5M12 16.5v.5M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
  ["Product pages", "Do visitors understand exactly what they'd get?", "M4 5h16v14H4zM4 9h16M8 13h5"],
  ["Website design", "Does it look professional on laptop and phone?", "M3 5h18v11H3zM8 20h8M12 16v4"],
  ["Trust signals", "Reviews, proof, policies and contact details: there or missing.", "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"],
  ["Navigation", "Can they find pricing, signup or the product page?", "M4 6h16M4 12h10M4 18h6"],
  ["Checkout experience", "Cart, sign-up fields, account walls. Never pays.", "M5 6h15l-2 8H7L5 3H3M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01"],
  ["Messaging", "Is the main promise clear, specific and believable?", "M4 5h16v11H8l-4 4z"],
];

const USES = [
  { title: "Shopify stores", tag: "Store test · beta", body: "Crawler opens a product page and adds to cart like a shopper, then customers judge price, shipping, returns and trust.", ask: "Why aren't people adding to cart?" },
  { title: "Clothing brands", tag: "Store test · beta", body: "Test your drop page on Gen Z shoppers before it goes live: sizing, delivery cost, reviews and vibe.", ask: "Would 16–24 year olds buy this hoodie at $68?" },
  { title: "E-commerce businesses", tag: null, body: "Find the step where shoppers give up, from the first screen to the cart, on phone and laptop.", ask: "What's the biggest blocker on my product page?" },
  { title: "SaaS startups", tag: null, body: "Pricing page, free trial, signup form: see which one loses the most simulated buyers and why.", ask: "Is my pricing page scaring people off?" },
  { title: "Marketing agencies", tag: null, body: "Run a test on a client's site before the pitch and send the report link as proof of what to fix.", ask: "What should we fix first for this client?" },
  { title: "Pre-launch founders", tag: null, body: "Test a landing page or waitlist before you have traffic, then re-test the same crowd after you change it.", ask: "Would anyone join this waitlist?" },
];

const HONEST: [string, string][] = [
  ["Simulated, and labelled", "Customers are AI-simulated. Results show buying intent, not real purchases, and every report says so."],
  ["Built on research", "Patience, trust and checkout behaviour come from published studies; guesses are labelled as assumptions."],
  ["Counted in code", "Scores, objections and win-backs are counted from each customer's answer, not made up by the AI."],
  ["Safe on your site", "Crawler looks and clicks like a visitor. It never pays, checks out or logs into accounts it shouldn't."],
];
