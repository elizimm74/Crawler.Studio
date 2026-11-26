// The home page, v5 "Editorial" (2026-11-24, after aaru.com/simulation):
//   Hero (white): headline + URL box, a simulated customer's "spec sheet" over a painted tile
//   → black fade → YOU PROVIDE (steps 1–3): the Crawler app drawn in windows on painted backdrops
//   → INSIDE CRAWLER (black, steps 4–6): research explorer, inner life, counting, honest limits
//   → YOU RECEIVE (step 7): the report window with a "View as" switch → FAQ → final CTA.
// Every number is a real plan fact (src/lib/plans.ts), a sourced research fact (Science.tsx), or
// clearly labelled demo data (the made-up MealMate example). No photos, no borrowed art.
import Link from "next/link";
import EarlyAccessPage from "./landing/page";
import HeroForm from "@/components/landing/home/HeroForm";
import AppWindow, { Props } from "@/components/landing/ed/AppWindow";
import Explorer, { type ExplorerGroups } from "@/components/landing/ed/Explorer";
import ReportWindow from "@/components/landing/ed/ReportWindow";
import Toc from "@/components/landing/ed/Toc";
import CrowdModel from "@/components/landing/ed/CrowdModel";
import DecisionPath from "@/components/landing/ed/DecisionPath";
import Tilt from "@/components/landing/ed/Tilt";
import Reveal from "@/components/Reveal";
import SmoothScroll from "@/components/landing/motion/SmoothScroll";
import Faq from "@/components/landing/Faq";
import { ASSUMPTIONS, FACTS } from "@/components/landing/Science";
import { homeDemo } from "@/lib/homeDemo";
import { STARTER_CUSTOMERS } from "@/lib/plans";
import { FOCUS } from "@/lib/productTypes";

export const metadata = {
  title: { absolute: "Crawler: AI customer simulations for your website" },
  description:
    "Would your customers actually buy? Crawler runs AI-simulated customers through your website, store or app and shows what makes them buy, what makes them leave, and what to fix before launch.",
  alternates: { canonical: "/" },
};

const AUDIENCE_ITEMS = [
  { title: "Age, gender and where they live", body: "Set an age range (and lean it younger or older), a gender split and urban / suburban / rural. Every simulated customer is sampled from these ranges, so you get a spread, not one stereotype." },
  { title: "Budget and mindset", body: "Tight / okay / comfortable budgets, and mindsets like price-sensitive, skeptical, busy, impulse buyer or early adopter. These change what each customer notices and what makes them leave." },
  { title: "What they use now", body: "The app, competitor or workaround they'd have to switch from. Customers compare you with it, the way real people do." },
  { title: "Business buyers", body: "For B2B: role, company size, industry, and whether they can buy alone or need approval (then they look for pricing and proof to show a boss)." },
];

export default function Home() {
  // Pre-launch switch: set WAITLIST_MODE=1 in Vercel to show the early-access waitlist here.
  // Remove it (and redeploy) on launch day to bring this home page back. /landing always works.
  if (process.env.WAITLIST_MODE === "1") return <EarlyAccessPage />;

  const demo = homeDemo();
  const groups: ExplorerGroups = {
    Research: FACTS.map((f) => ({ title: f.finding, source: f.source, who: f.who, body: "A published finding Crawler builds into how simulated customers behave. It shapes patience, what they look for and what makes them quit. Full list and limits on the science page." })),
    Assumptions: ASSUMPTIONS.map((a) => ({ title: a.what, source: "Labelled assumption", body: `${a.value}. This is our assumption, not a measured fact, and it's labelled that way everywhere it's used.` })),
    "Your audience": AUDIENCE_ITEMS.map((a) => ({ ...a, source: "You choose" })),
  };
  const p = demo.sample.people[0];

  return (
    <div className="bleed-full -mt-12 sm:-mt-16">
      {/* ================= HERO (white) ================= */}
      <section className="home-wide grid min-h-[calc(100svh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20" aria-labelledby="hero-title">
        <div className="rise">
          <p className="text-[15px] text-faint">
            AI customer simulation. <span className="text-accent">From link to fixes.</span>
          </p>
          <h1 id="hero-title" className="t-display mt-6">
            Would your customers <span className="serif">actually</span> buy?
            <span className="block text-faint">Ask a hundred of them first.</span>
          </h1>
          <p className="t-lead mt-8 max-w-lg">
            Paste your link. AI shoppers try your site and tell you exactly why they wouldn&apos;t buy, and what to fix before launch.
          </p>
          <div className="mt-8 max-w-xl">
            <HeroForm />
          </div>
          <p className="mt-4 text-sm text-faint">
            No credit card required · Free: 1 test with {STARTER_CUSTOMERS} simulated customers · Simulated buying intent, not real purchases
          </p>
        </div>

        {/* a simulated customer's spec sheet over a painted tile (example) */}
        <div className="rise d2 relative mx-auto w-full max-w-[26rem]" aria-label="An example simulated customer">
          <span className="tag absolute left-4 top-0 z-20 -translate-y-1/2 bg-[#02aa3d] text-[#052e16]">Simulated customer</span>
          <div className="scene scene-dusk aspect-[4/5] w-[78%] !p-0" aria-hidden>
            <div className="absolute inset-x-6 bottom-6 font-mono text-[11px] text-white/80">example · demo data</div>
          </div>
          <div className="absolute right-0 top-[-1.5rem] h-28 w-28" aria-hidden>
            <div className="scene scene-moss h-full w-full !rounded-2xl !p-0">
              <div className="relative z-10 grid h-full grid-cols-5 gap-1.5 p-3">
                {Array.from({ length: 25 }, (_, i) => (
                  <span key={i} className={`aspect-square rounded-full ${i % 4 === 0 ? "bg-white" : "bg-white/30"}`} />
                ))}
              </div>
            </div>
          </div>
          {/* floating glass chips (demo numbers) */}
          <span className="glass-chip float-a absolute -left-6 top-10 z-20 hidden sm:inline-flex">
            <i className="h-2 w-2 rounded-full bg-[#02aa3d]" /> {demo.sample.total} simulated customers
          </span>
          <span className="glass-chip float-b absolute -right-4 top-[46%] z-20 hidden sm:inline-flex">
            Biggest blocker · {demo.sample.objections[0]?.category} {demo.sample.objections[0]?.pct}%
          </span>
          <span className="glass-chip float-c absolute -bottom-16 right-2 z-20 hidden sm:inline-flex">
            Fix #1 · +{demo.sample.fixes[0]?.winBack ?? 0} could win back
          </span>
          <dl className="spec glass-spec absolute -bottom-10 left-[-1rem] z-10 w-[72%] sm:left-[-2.5rem]">
            <p className="mb-1 inline-block rounded-full bg-[#dedede] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3a3a3a]">{p ? p.label.split(",").slice(0, 2).join(",") : "24, student"}</p>
            {[
              ["Came from", "a TikTok video"],
              ["Budget", "Tight"],
              ["Patience", "about 10 seconds"],
              ["Dealbreaker", "a hidden price"],
              ["Decision", "Wouldn't buy"],
            ].map(([k, v]) => (
              <div key={k} className="spec-row">
                <dt>{k}</dt>
                <dd className="text-[#0a0a0a]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* black → white fade, like a page turning */}
      <div className="fade-band" aria-hidden />

      {/* ================= YOU PROVIDE (white) ================= */}
      <section className="home-wide pt-20" aria-labelledby="provide-title">
        <div className="eyebrow">
          <span>You provide</span>
          <span>Steps 1–3</span>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <h2 id="provide-title" className="t-h1">
            Paste a link.
            <span className="block text-faint">Choose who walks in.</span>
          </h2>
          <p className="t-lead max-w-md lg:justify-self-end">
            Start with your website, store or app and what you want to learn. Pick the people who would actually visit, and Crawler builds them.
          </p>
        </div>
      </section>

      <Row id="how" n="01" title="Your website" text="Crawler opens it like a first-time visitor, on a laptop and a phone, and finds your pricing and signup (or a product page and the cart). You choose what you want to learn: would they buy, is the price fair, is the value clear.">
        <AppWindow
          crumb="mealmate.app"
          title="mealmate.app simulation"
          tabs={["Configuration", "Customers", "Report"]}
          active="Configuration"
          side={<Props rows={[["Status", "Draft"], ["Customers", "100"], ["Device mix", "Phone + laptop"]]} files={["landing.png", "pricing.png", "signup.png"]} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="win-card p-3">
              <p className="text-[12px] font-medium">Description</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#3a3a3a]">MealMate plans a week of dinners and a grocery list for busy parents. The simulation tests the landing page, pricing and signup.</p>
              <div className="mt-3 space-y-1 text-[12px] text-[#3a3a3a]">
                <p>✓ Landing page</p>
                <p>✓ Pricing: not shown</p>
                <p>✓ Signup: 6 fields</p>
              </div>
            </div>
            <div className="win-card p-3">
              <p className="text-[12px] font-medium">
                Objectives <span className="text-[#9a9a9a]">3/{Object.keys(FOCUS).length}</span>
              </p>
              <ol className="mt-2 space-y-2 text-[12.5px] text-[#3a3a3a]">
                {(["buy", "price", "value"] as const).map((k, i) => (
                  <li key={k} className="flex gap-2">
                    <span className="win-num">{i + 1}</span>
                    {FOCUS[k].label}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </AppWindow>
      </Row>

      <Row n="02" title="Customers" flip text="Each audience becomes a crowd of simulated customers, broad or niche. Ages, budgets, mindsets, devices and where they came from are sampled in code, so no two think exactly alike.">
        <AppWindow
          crumb="mealmate.app"
          title="mealmate.app simulation"
          tabs={["Configuration", "Customers", "Report"]}
          active="Customers"
          scene="moss"
          bleed="left"
          side={<Props rows={[["Status", "Ready"], ["Audience", "Busy moms"], ["Customers", "100"]]} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["A1", "Busy parents", "Short on time, plan meals on their phone after the kids are asleep. Want the result, not a tour."],
              ["A2", "Price-checkers", "Compare against free apps and notes. Leave if the price is hidden or needs a card upfront."],
              ["A3", "Skeptics", "Burned by a trial before. Look for reviews, real people and an easy way to cancel."],
            ].map(([id, t, d], i) => (
              <div key={id} className={`win-card p-3 ${i === 0 ? "!border-[#02aa3d]" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="win-num">{id}</span>
                </div>
                <p className="mt-1 text-[14px] text-[#0a0a0a]">{t}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6b6b6b]">{d}</p>
                <p className="mt-3 text-[11px] text-[#9a9a9a]">Simulated customers</p>
                <p className="text-[12px]">≈ 33</p>
              </div>
            ))}
          </div>
        </AppWindow>
      </Row>

      <Row n="03" title="What every customer answers" text="Every simulated customer decides for themselves and answers the same questions, in their own words. Those answers are counted in code, never guessed.">
        <AppWindow crumb="mealmate.app" title="mealmate.app simulation" tabs={["Configuration", "Customers", "Report"]} active="Customers" scene="sky" side={<Props rows={[["Questions", "5"], ["Answered", "0/100"]]} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Q1", "Single choice", "Would you sign up?", ["Yes", "Maybe", "No"]],
              ["Q2", "Free response", "What stopped you?", []],
              ["Q3", "Single choice", "Where did you leave?", ["Landing page", "Pricing", "Signup"]],
              ["Q4", "Free response", "What would change your mind?", []],
            ].map(([id, kind, q, opts]) => (
              <div key={id as string} className="win-card p-3">
                <div className="flex items-center gap-2">
                  <span className="win-num">{id as string}</span>
                  <span className="win-chip">{kind as string}</span>
                </div>
                <p className="mt-2 text-[14px] leading-snug text-[#0a0a0a]">{q as string}</p>
                {(opts as string[]).length ? (
                  <ol className="mt-2 space-y-1 text-[12px] text-[#3a3a3a]">
                    {(opts as string[]).map((o, i) => (
                      <li key={o}>
                        <span className="win-num mr-2">{"ABC"[i]}</span>
                        {o}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 rounded-md border border-[#ececec] px-2 py-1.5 text-[12px] text-[#9a9a9a]">Customers answer in their own words</p>
                )}
              </div>
            ))}
          </div>
        </AppWindow>
      </Row>

      <div className="fade-to-black mt-32" aria-hidden />

      {/* ================= INSIDE CRAWLER (black) ================= */}
      <section className="band-dark pb-32" aria-labelledby="inside-title">
        <div className="home-wide">
          <div className="eyebrow">
            <span>Inside Crawler</span>
            <span>Steps 4–6</span>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <h2 id="inside-title" className="t-h1">
              Every customer is built,
              <span className="block text-faint">not copied from a template.</span>
            </h2>
            <p className="t-lead max-w-md lg:justify-self-end">
              Busy parents, skeptical founders, teens on their phones: each simulated customer starts from published research about how people browse and buy, then gets a life of their own.
            </p>
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <Toc
              label="Inside Crawler"
              items={[
                { id: "research", n: "04", title: "Research" },
                { id: "minds", n: "05", title: "Customers" },
                { id: "counting", n: "06", title: "Decisions" },
              ]}
            />
            <div className="min-w-0 space-y-28">
              <div id="research" className="scroll-mt-28">
                <div className="max-w-2xl">
                  <h3 className="text-[1.75rem] tracking-tight">Crawler starts with research.</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-white/85">
                    How fast people leave, what makes them quit a signup, how teens shop and what subscription apps convert: published findings set how every simulated customer behaves. Where there is no study, we say so and label it an assumption.
                  </p>
                  <div className="note mt-8">
                    <p className="note-title">ⓘ Facts and assumptions</p>
                    <p className="mt-2 text-sm text-white/70">Every number that shapes a customer is either a named, published source or a labelled assumption. None is hidden, and none is presented as more than it is.</p>
                    <Link href="/science" className="note-btn">
                      Read the science +
                    </Link>
                  </div>
                </div>
                <Reveal className="mt-14">
                  <Explorer groups={groups} />
                </Reveal>
              </div>

              <div id="minds" className="scroll-mt-28 max-w-2xl">
                <h3 className="text-[1.75rem] tracking-tight">Customers have an inner life.</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-white/85">
                  A crowd is not a spreadsheet of identical rows. Each customer gets a reason for visiting, how badly they need this, sometimes a bad past experience, what would win them over and the one thing that makes them leave. Then they look at your real pages and decide.
                </p>
                <div className="dpanel mt-8 p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="tag bg-white/10 text-white">◷ Patience</span>
                    <span className="tag bg-white/10 text-white">◎ Mindset</span>
                    <span className="tag bg-[#4ade80]/20 text-[#bbf7d0]">⌁ Dealbreaker</span>
                  </div>
                  <dl className="mt-5 divide-y divide-white/10 text-sm">
                    {[
                      ["Why they're here", "Saw it in a TikTok, curious, no plan to buy"],
                      ["How much they need it", "Nice to have"],
                      ["Burned before", "Charged after forgetting to cancel a free trial"],
                      ["What wins them", "A clear price that beats free alternatives"],
                      ["Dealbreaker", "A price that's hidden or needs a card upfront"],
                    ].map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-white/55">{k}</dt>
                        <dd className="text-white/80">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[11px] text-white/40">Example customer. Inner-life odds are labelled assumptions.</p>
                </div>
              </div>

              <div className="scroll-mt-28">
                <div className="max-w-2xl">
                  <h3 className="text-[1.75rem] tracking-tight">Five steps before every decision.</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-white/85">
                    Every simulated customer thinks it through in the same order a real visitor does: what they see first, whether they need it, their dealbreaker, whether they trust it, and then a decision in their own words.
                  </p>
                </div>
                <Reveal className="mt-10">
                  <DecisionPath />
                </Reveal>
              </div>

              <div id="counting" className="scroll-mt-28">
                <div className="max-w-2xl">
                  <h3 className="text-[1.75rem] tracking-tight">Every decision is counted in code.</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-white/85">
                    The AI only plays the customers. Counting is plain code: who would buy, who left where, which reasons repeat, and how many people each fix could win back. Re-test with the same customers and see exactly who changed their mind.
                  </p>
                </div>
                <Reveal className="mt-10">
                  <CrowdModel points={demo.crowd} />
                </Reveal>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="dpanel p-6">
                    <p className="text-[19px] tracking-tight">Buy rate by mindset</p>
                    <p className="mt-1 text-sm text-white/45">Demo data · {demo.sample.total} simulated customers</p>
                    <div className="mt-6 space-y-3">
                      {(demo.sample.segments[0]?.rows ?? []).map((r) => (
                        <div key={r.value} className="grid grid-cols-[8rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
                          <span className="truncate text-white/70">{r.value}</span>
                          <span className="h-2 overflow-hidden rounded-full bg-white/10">
                            <span className="block h-full rounded-full bg-[#4ade80]" style={{ width: `${Math.round(r.buyRate * 100)}%` }} />
                          </span>
                          <span className="text-right font-mono text-xs text-white/70">{Math.round(r.buyRate * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dpanel p-6">
                    <p className="text-[19px] tracking-tight">What stopped them</p>
                    <p className="mt-1 text-sm text-white/45">Demo data · share of people who didn&apos;t buy</p>
                    <ul className="mt-6 space-y-3 text-sm">
                      {demo.sample.objections.slice(0, 5).map((o) => (
                        <li key={o.category} className="flex items-center gap-3">
                          <span className="w-28 truncate capitalize text-white/70">{o.category}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                            <span className="block h-full rounded-full bg-white" style={{ width: `${o.pct}%` }} />
                          </span>
                          <span className="w-10 text-right font-mono text-xs text-white/70">{o.pct}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="max-w-2xl">
                <h3 className="text-[1.75rem] tracking-tight">Honest about what it is.</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-white/85">
                  Simulated customers are a fast, cheap signal about what to fix, not a forecast of your sales. They tend to say yes more often than real people. The useful part is the reasons, the ranking of problems and the change between two versions.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="dpanel p-5">
                    <p className="text-[17px]">Good at</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">Spotting missing prices, proof, unclear headlines and heavy signups. Comparing two versions on the same customers.</p>
                  </div>
                  <div className="dpanel p-5">
                    <p className="text-[17px]">Not a replacement for</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">Real customers, A/B tests after launch, or exact conversion rates. We publish predicted vs real results as they come in.</p>
                  </div>
                </div>
                <Link href="/accuracy" className="btn btn-primary mt-8 h-11 px-6 text-sm">
                  See accuracy so far
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fade-to-white" aria-hidden />

      {/* ================= YOU RECEIVE (white) ================= */}
      <section className="home-wide pb-28" aria-labelledby="receive-title">
        <div className="eyebrow">
          <span>You receive</span>
          <span>Step 7</span>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <h2 id="receive-title" className="t-h1">
            The simulation runs.
            <span className="block text-faint">The reasons come back.</span>
          </h2>
          <p className="t-lead max-w-md lg:justify-self-end">
            A report you can act on: who would buy, what stopped everyone else, where they left, and ranked fixes with how many customers each could win back. Then copy one prompt and let your AI builder make the changes.
          </p>
        </div>
        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div>
            <p className="text-[1.35rem] tracking-tight">Your report</p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">Every finding traces back to the customers who said it. Read it by customer type, export a PDF, track each fix, and re-test the same crowd after you ship.</p>
            <Link href="/example" className="btn btn-secondary mt-6 h-11 px-5 text-sm">
              Open the full sample report
            </Link>
          </div>
          <div className="lg:-mr-[max(0px,calc((100vw-88rem)/2+3rem))]">
            <Reveal>
              <ReportWindow data={demo.sample} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="home-wide pb-28">
        <Faq />
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="home-wide pb-24" aria-labelledby="final-title">
        <div className="scene scene-dusk !p-0">
          <div className="relative z-10 px-6 py-20 text-center text-white sm:px-12 sm:py-28">
            <h2 id="final-title" className="t-h1 text-white">
              Stop guessing.
              <span className="block text-white/70">
                Start <span className="serif">validating.</span>
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-white/80">Paste your website and see what your simulated customers think in a few minutes.</p>
            <div className="band-dark mx-auto mt-8 max-w-xl rounded-[22px] !bg-black/40 p-2 backdrop-blur">
              <HeroForm cta="Run Your First Simulation" id="final-url" />
            </div>
            <p className="mt-4 text-sm text-white/70">No credit card required to get started.</p>
          </div>
        </div>
      </section>
      {/* soft, inertial scrolling (mouse / trackpad only; off for reduced motion) */}
      <SmoothScroll />
    </div>
  );
}

// One "caption + window" row: the caption on one side, the window running off the other edge.
function Row({ n, title, text, children, flip = false, id }: { n: string; title: string; text: string; children: React.ReactNode; flip?: boolean; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 pt-36 sm:pt-44" aria-label={title}>
      <div className={`grid items-center gap-10 lg:gap-16 ${flip ? "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]" : "lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]"}`}>
        <div className={`px-4 sm:px-8 ${flip ? "lg:order-2 lg:pl-0 lg:pr-[max(3rem,calc((100vw-88rem)/2+3rem))]" : "lg:pr-0 lg:pl-[max(3rem,calc((100vw-88rem)/2+3rem))]"}`}>
          <p className="font-mono text-xs text-faint">{n}</p>
          <p className="mt-2 text-[1.6rem] leading-tight tracking-tight">{title}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{text}</p>
        </div>
        <Reveal className={`min-w-0 ${flip ? "lg:order-1" : ""} ${flip ? "pr-4 sm:pr-8 lg:pr-0" : "pl-4 sm:pl-8 lg:pl-0"}`}>
          <Tilt max={3}>{children}</Tilt>
        </Reveal>
      </div>
    </section>
  );
}
