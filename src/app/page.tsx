// The home page, v8 (2026-11-25, founder's "MERGE OLD WEBSITE STRUCTURE WITH NEW BRAND IDENTITY"):
// the older site's explanation and science (crawler-wait-list.vercel.app = the v13 editorial home)
// rebuilt in the current Crawler look (washed-gray stone, black/white type, one washed-denim accent).
//   1 Hero + URL CTA → 2 animated customer simulation (banner + 01 lab animation) → 3 How Crawler
//   works (01–05, drawn product windows) → 4 Scientific methodology (03 lab animation, research
//   explorer, inner life, 5 decision steps, crowd model, audience breakdown, limits) → 5 Personas →
//   6 Interactive sample report → 7 What you can analyze → 8 Founder case studies (ILLUSTRATIVE:
//   nobody has published results with Crawler yet) → 9 Pricing (from plans.ts) → 10 FAQ → 11 CTA.
// Every number is a real plan fact (src/lib/plans.ts), a sourced research fact (Science.tsx), or
// clearly labelled demo data (the made-up MealMate example). No invented testimonials or results.
import Link from "next/link";
import HeroForm from "@/components/landing/home/HeroForm";
import { PERSONAS } from "@/components/landing/home/sections";
import ReportLab from "@/components/landing/home/ReportLab";
import SimConsole from "@/components/landing/v14/SimConsole";
import LabSequence, { type LabStage } from "@/components/landing/lab/LabSequence";
import ScrubBand from "@/components/landing/v14/ScrubBand";
import Manifesto from "@/components/landing/motion/Manifesto";
import AppWindow, { Props } from "@/components/landing/ed/AppWindow";
import Explorer, { type ExplorerGroups } from "@/components/landing/ed/Explorer";
import CrowdModel from "@/components/landing/ed/CrowdModel";
import DecisionPath from "@/components/landing/ed/DecisionPath";
import Toc from "@/components/landing/ed/Toc";
import Tilt from "@/components/landing/ed/Tilt";
import Claws from "@/components/Claws";
import Reveal from "@/components/Reveal";
import Faq from "@/components/landing/Faq";
import { ASSUMPTIONS, FACTS } from "@/components/landing/Science";
import { homeDemo } from "@/lib/homeDemo";
import { ENTERPRISE, PLANS, STARTER_CUSTOMERS, allowanceLabel } from "@/lib/plans";
import { FOCUS } from "@/lib/productTypes";
import { publishedCaseStudies } from "@/lib/caseStudies";

export const metadata = {
  title: { absolute: "Crawler: meet your customers before they meet your website" },
  description:
    "Would your customers actually buy? Crawler simulates customer behavior to test your website, product, pricing and ads, then shows what stops people buying and what to fix first.",
  alternates: { canonical: "/" },
};

// The four stages of each lab animation (founder's copy; 01.1 says "up to 1,000 per test" because
// a single Crawler test runs 100 to 1,000 simulated customers, not thousands).
const SIMULATION_STAGES: LabStage[] = [
  { code: "01.1", title: "Population generation", text: "Up to 1,000 unique customer profiles per test, each with distinct behaviors, preferences, and purchasing motivations." },
  { code: "01.2", title: "Behavioral variation", text: "Every simulated customer has different motivations, price sensitivity, expectations, and decision-making patterns." },
  { code: "01.3", title: "Experience simulation", text: "Customers navigate the experience, evaluate information, encounter friction, and make decisions." },
  { code: "01.4", title: "Decision modeling", text: "Observe where customers convert, where they hesitate, and what causes them to abandon the experience." },
];
const PATTERN_STAGES: LabStage[] = [
  { code: "03.1", title: "Signal detection", text: "Individual customer actions reveal signals about expectations, intent, and friction." },
  { code: "03.2", title: "Pattern recognition", text: "Repeated behaviors reveal common objections, purchasing motivations, and points of hesitation." },
  { code: "03.3", title: "Customer segmentation", text: "Identify which customer types respond positively, which need more information, and which are unlikely to convert." },
  { code: "03.4", title: "Actionable insights", text: "Turn simulated behavior into specific opportunities to improve your website and increase conversion." },
];

export default function Home() {
  const demo = homeDemo();
  const s = demo.sample;
  // shares of the demo crowd (would buy / maybe / left), used only to size the animation's groups
  const mix = { buy: s.buy / s.total, maybe: s.maybe / s.total, no: s.no / s.total };
  const groups: ExplorerGroups = {
    Research: FACTS.map((f) => ({ title: f.finding, source: f.source, who: f.who, body: "A published finding Crawler builds into how simulated customers behave. It shapes patience, what they look for and what makes them quit. Full list and limits on the science page." })),
    Assumptions: ASSUMPTIONS.map((a) => ({ title: a.what, source: "Labelled assumption", body: `${a.value}. This is our assumption, not a measured fact, and it's labelled that way everywhere it's used.` })),
    "Your audience": AUDIENCE_ITEMS.map((a) => ({ ...a, source: "You choose" })),
  };
  const p = s.people[0];
  const real = publishedCaseStudies();

  return (
    <div className="v14 bleed-full">
      {/* ================= 1. HERO ================= */}
      <section className="hero23 home-wide" aria-labelledby="hero-title">
        <Claws className="hero23-claws" color="#0b0b0a" />
        <p className="wordmark21 hero23-mark rise d1" aria-hidden data-scrub="leave" data-lag="0.8">
          <span className="scrub-l inline-block">crawler</span>
        </p>
        <div className="mt-8 grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div className="rise d2">
            <h1 id="hero-title" className="hero21-h !mt-0">
              Meet your customers <span>before they meet your website.</span>
            </h1>
            <p className="hero23-sub mt-5">Would your customers actually buy? Ask 1,000 simulated customers first.</p>
            <p className="lead14 mt-5 max-w-xl">
              Crawler simulates how real customers behave, then sends them through your website, product, pricing or ad. See who would buy, what stops the rest, and what to fix first.
            </p>
            <div className="url14 mt-8 max-w-2xl">
              <HeroForm cta="Run simulation" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-0 text-sm">
              <Link href="/onboarding" className="inline-flex min-h-11 items-center font-medium underline decoration-1 underline-offset-4 hover:decoration-2">
                No website? Test an app, game or ad →
              </Link>
              <Link href="/example" className="inline-flex min-h-11 items-center text-faint underline-offset-4 hover:text-fg hover:underline">
                See a full report, no sign-up
              </Link>
            </div>
            <p className="mt-4 text-sm text-faint">
              No credit card · Free: 1 test with {STARTER_CUSTOMERS} simulated customers · paid tests run up to 1,000 · simulated buying intent, not real purchases
            </p>
          </div>

          {/* one example simulated customer (the old site's spec sheet), on a charcoal tile */}
          <div className="rise d3 relative mx-auto w-full max-w-[26rem] pb-10 lg:mt-4" aria-label="An example simulated customer">
            <div className="hero23-tile" aria-hidden>
              <Claws className="hero23-tile-claws" color="#ffffff" delay={300} />
              <span className="absolute bottom-5 left-5 text-[11px] uppercase tracking-[0.16em] text-white/60">example · demo data</span>
            </div>
            <span className="glass-chip float-a absolute -left-4 top-8 z-20 hidden sm:inline-flex">
              <i className="h-2 w-2 rounded-full bg-[#3e4a6e]" /> {s.total} simulated customers
            </span>
            <span className="glass-chip float-b absolute -right-3 top-[38%] z-20 hidden sm:inline-flex">
              Biggest blocker · {s.objections[0]?.category} {s.objections[0]?.pct}%
            </span>
            <dl className="spec glass-spec absolute bottom-0 left-[-0.5rem] z-10 w-[78%] sm:left-[-1.5rem]">
              <p className="mb-1 inline-block rounded-full bg-[#e4e3dd] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3a3a3a]">{p ? p.label.split(",").slice(0, 2).join(",") : "24, student"}</p>
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
        </div>
      </section>

      {/* ================= 2. ANIMATED CUSTOMER SIMULATION ================= */}
      <ScrubBand />
      <section className="night18 lab" aria-label="Customer simulation">
        <div className="home-wide">
          <Manifesto
            bare
            className="statement14 max-w-5xl"
            text="*A focus group that never sleeps.* Crawler sends simulated customers through your launch before real ones arrive, so the first people to hit the price, the signup or the cart are ones who can tell you why they left."
          />
        </div>
        <LabSequence
          id="simulation"
          index="01"
          name="Customer simulation"
          heading="Watch a simulation run."
          hint="Scroll to run the simulation"
          note="Illustration. Group sizes follow Crawler's demo run, not real customers."
          scene="simulation"
          stages={SIMULATION_STAGES}
          mix={mix}
        />
      </section>

      {/* ================= 3. HOW CRAWLER WORKS (01–05) ================= */}
      <section id="how" className="home-wide scroll-mt-24 pt-24 sm:pt-32" aria-labelledby="how-title">
        <div className="eyebrow">
          <span>How Crawler works</span>
          <span>Steps 01–05</span>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <h2 id="how-title" className="t-h1">
            From one link
            <span className="block text-faint">to a list of fixes.</span>
          </h2>
          <p className="t-lead max-w-md lg:justify-self-end">No setup, no tracking code and no real traffic needed. Five steps, a few minutes.</p>
        </div>
      </section>

      <Row n="01" title="Submit your website." text="Crawler opens it like a first-time visitor, on a laptop and a phone, and finds your pricing and signup (or a product page and the cart). You choose what you want to learn: would they buy, is the price fair, is the value clear.">
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

      <Row n="02" title="Generate your customer audience." flip text="Pick who would actually visit, broad or niche. Ages, budgets, mindsets, devices and where they came from are sampled in code, so no two simulated customers think exactly alike.">
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
              <div key={id} className={`win-card p-3 ${i === 0 ? "!border-[#3e4a6e]" : ""}`}>
                <span className="win-num">{id}</span>
                <p className="mt-1 text-[14px] text-[#0a0a0a]">{t}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6b6b6b]">{d}</p>
                <p className="mt-3 text-[11px] text-[#9a9a9a]">Simulated customers</p>
                <p className="text-[12px]">≈ 33</p>
              </div>
            ))}
          </div>
        </AppWindow>
      </Row>

      <Row n="03" title="Simulate individual customer journeys." text="Every simulated customer visits on their own device, with their own patience and dealbreaker. Watch them go one by one: who reads on, who hesitates at the price, who leaves at the signup.">
        <div className="scene scene-dusk !p-4 sm:!p-8">
          <SimConsole host={s.host} total={s.total} buy={s.buy} maybe={s.maybe} no={s.no} sim={demo.sim} objections={s.objections} topFix={s.fixes[0]?.title ?? ""} winBack={s.fixes[0]?.winBack ?? 0} />
        </div>
      </Row>

      <Row n="04" title="Analyze purchase decisions and objections." flip text="Each customer answers the same questions in their own words: would you buy, what stopped you, where did you leave, what would change your mind. The answers are counted in code, never guessed.">
        <AppWindow crumb="mealmate.app" title="mealmate.app · Run 01" tabs={["Configuration", "Customers", "Report"]} active="Report" scene="sky" bleed="left" side={<Props rows={[["Status", "Completed"], ["Customers", String(s.total)], ["Data", "Demo"]]} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="win-card p-3">
              <p className="text-[12px] font-medium">Decisions</p>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-[#ececec]">
                <i className="bg-[#3e4a6e]" style={{ width: `${(s.buy / s.total) * 100}%` }} />
                <i className="bg-[#8f8e87]" style={{ width: `${(s.maybe / s.total) * 100}%` }} />
              </div>
              <ul className="mt-3 space-y-1 text-[12px] text-[#3a3a3a]">
                <li>{s.buy} would buy</li>
                <li>{s.maybe} maybe</li>
                <li>{s.no} wouldn&apos;t</li>
              </ul>
            </div>
            <div className="win-card p-3">
              <p className="text-[12px] font-medium">What stopped them</p>
              <ul className="mt-3 space-y-2">
                {s.objections.slice(0, 3).map((o) => (
                  <li key={o.category} className="text-[12px]">
                    <div className="flex justify-between capitalize text-[#3a3a3a]">
                      <span>{o.category}</span>
                      <span>{o.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ececec]">
                      <i className="block h-full bg-[#0b0b0a]" style={{ width: `${o.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AppWindow>
      </Row>

      <Row n="05" title="Receive prioritized recommendations." text="Fixes ranked by how many simulated customers each could win back, with rewritten copy. Copy one prompt into your AI builder, ship the change, then re-test the same crowd.">
        <AppWindow crumb="mealmate.app" title="Recommendations" tabs={["Summary", "Fixes", "Fix prompt"]} active="Fixes" scene="moss" side={<Props rows={[["Fixes", String(s.fixes.length)], ["Top win-back", `+${s.fixes[0]?.winBack ?? 0}`]]} files={["report.pdf", "fix-prompt.txt"]} />}>
          <ol className="space-y-2">
            {s.fixes.slice(0, 3).map((f, i) => (
              <li key={f.title} className="win-card flex items-start gap-3 p-3">
                <span className="win-num">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#0a0a0a]">{f.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6b6b6b]">{f.change}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#3e4a6e] px-2 py-0.5 text-[11px] font-semibold text-white">+{f.winBack}</span>
              </li>
            ))}
          </ol>
        </AppWindow>
      </Row>

      {/* ================= 4. SCIENTIFIC METHODOLOGY (dark) ================= */}
      <section className="night18 mt-32" aria-labelledby="science-title">
        <div className="home-wide">
          <div className="eyebrow">
            <span>Scientific methodology</span>
            <span>Inside Crawler</span>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <h2 id="science-title" className="t-h1">
              Every customer is built,
              <span className="block text-faint">not copied from a template.</span>
            </h2>
            <p className="t-lead max-w-md lg:justify-self-end">
              Busy parents, skeptical founders, teens on their phones: each simulated customer starts from published research about how people browse and buy, then gets a life of their own.
            </p>
          </div>
        </div>

        <LabSequence
          id="patterns"
          index="03"
          name="Behavioral patterns"
          heading="From many decisions, clear patterns."
          hint="Scroll to find the patterns"
          note="Illustration with demo data. The insights shown are examples."
          scene="patterns"
          stages={PATTERN_STAGES}
          mix={mix}
        />

        <div className="home-wide mt-28 grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
          <Toc
            label="Methodology"
            items={[
              { id: "research", n: "A", title: "Research" },
              { id: "minds", n: "B", title: "Personas" },
              { id: "decide", n: "C", title: "Decisions" },
              { id: "counting", n: "D", title: "Audience" },
              { id: "limits", n: "E", title: "Limitations" },
            ]}
          />
          <div className="min-w-0 space-y-28">
            <div id="research" className="scroll-mt-28">
              <div className="max-w-2xl">
                <h3 className="sci-h">Crawler starts with research.</h3>
                <p className="sci-p">
                  How fast people leave, what makes them quit a signup, how teens shop and what subscription apps convert: published findings set how every simulated customer behaves. Where there is no study, we say so and label it an assumption.
                </p>
              </div>
              <Reveal className="mt-10">
                <Explorer groups={groups} />
              </Reveal>
            </div>

            <div id="minds" className="scroll-mt-28 max-w-2xl">
              <h3 className="sci-h">Customers have an inner life.</h3>
              <p className="sci-p">
                A crowd is not a spreadsheet of identical rows. Each customer gets a reason for visiting, how badly they need this, sometimes a bad past experience, what would win them over and the one thing that makes them leave. Then they look at your real pages and decide.
              </p>
              <Reveal className="dpanel mt-8 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="tag bg-white/10 text-white">◷ Patience</span>
                  <span className="tag bg-white/10 text-white">◎ Mindset</span>
                  <span className="tag bg-[#3e4a6e] text-white">⌁ Dealbreaker</span>
                </div>
                <dl className="mt-5 divide-y divide-white/10 text-sm">
                  {[
                    ["Why they're here", "Saw it in a TikTok, curious, no plan to buy"],
                    ["How much they need it", "Nice to have"],
                    ["Burned before", "Charged after forgetting to cancel a free trial"],
                    ["What wins them", "A clear price that beats free alternatives"],
                    ["Dealbreaker", "A price that's hidden or needs a card upfront"],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                      <dt className="text-white/55">{k}</dt>
                      <dd className="text-white/85">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] text-white/45">Example customer. Inner-life odds are labelled assumptions.</p>
              </Reveal>
            </div>

            <div id="decide" className="scroll-mt-28">
              <div className="max-w-2xl">
                <h3 className="sci-h">Five steps before every decision.</h3>
                <p className="sci-p">
                  Every simulated customer thinks it through in the order a real visitor does: what they see first, whether they need it, their dealbreaker, whether they trust it, and then a decision in their own words.
                </p>
              </div>
              <Reveal className="mt-10">
                <DecisionPath />
              </Reveal>
            </div>

            <div id="counting" className="scroll-mt-28">
              <div className="max-w-2xl">
                <h3 className="sci-h">Every decision is counted in code.</h3>
                <p className="sci-p">
                  The AI only plays the customers. Counting is plain code: who would buy, who left where, which reasons repeat, and how many people each fix could win back. Re-test with the same customers and see exactly who changed their mind.
                </p>
              </div>
              <Reveal className="mt-10">
                <CrowdModel points={demo.crowd} />
              </Reveal>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Reveal className="dpanel p-6">
                  <p className="text-[19px] tracking-tight">Buy rate by mindset</p>
                  <p className="mt-1 text-sm text-white/50">Demo data · {s.total} simulated customers</p>
                  <div className="mt-6 space-y-3">
                    {(s.segments[0]?.rows ?? []).map((r) => (
                      <div key={r.value} className="grid grid-cols-[8rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
                        <span className="truncate text-white/75">{r.value}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full bg-[#8d9ac4]" style={{ width: `${Math.round(r.buyRate * 100)}%` }} />
                        </span>
                        <span className="text-right text-xs tabular-nums text-white/75">{Math.round(r.buyRate * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
                <Reveal className="dpanel p-6" delay={80}>
                  <p className="text-[19px] tracking-tight">What stopped them</p>
                  <p className="mt-1 text-sm text-white/50">Demo data · share of people who didn&apos;t buy</p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {s.objections.slice(0, 5).map((o) => (
                      <li key={o.category} className="flex items-center gap-3">
                        <span className="w-28 truncate capitalize text-white/75">{o.category}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full bg-white" style={{ width: `${o.pct}%` }} />
                        </span>
                        <span className="w-10 text-right text-xs tabular-nums text-white/75">{o.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            </div>

            <div id="limits" className="scroll-mt-28 max-w-3xl">
              <h3 className="sci-h">Honest about what it is.</h3>
              <p className="sci-p">
                Simulated customers are a fast, cheap signal about what to fix, not a forecast of your sales. They tend to say yes more often than real people. The useful part is the reasons, the ranking of problems and the change between two versions.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="dpanel p-5">
                  <p className="text-[17px]">Good at</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">Spotting missing prices, proof, unclear headlines and heavy signups. Comparing two versions on the same customers.</p>
                </div>
                <div className="dpanel p-5">
                  <p className="text-[17px]">Not a replacement for</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">Real customers, A/B tests after launch, or exact conversion rates. We publish predicted vs real results as they come in.</p>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/science" className="btn btn-primary h-11 px-6 text-sm">
                  Read the science
                </Link>
                <Link href="/accuracy" className="btn btn-secondary h-11 px-5 text-sm">
                  See accuracy so far
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. PERSONAS ================= */}
      <section className="home-wide py-20 sm:py-28" aria-labelledby="meet-title">
        <Head
          eyebrow="Individual personas"
          id="meet-title"
          title="Not one opinion. A hundred different ones."
          sub="Every test mixes people like these, sampled from the audience you pick: different budgets, moods, reasons for visiting and dealbreakers."
        />
        <ul className="personas14 mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.slice(0, 8).map((pp, k) => (
            <li key={pp.name} className="h-full">
              <Reveal delay={(k % 4) * 70} className="tile14 h-full">
                <div className="flex items-center gap-3">
                  <span className={`avatar14 a${k % 4}`} aria-hidden>
                    {pp.name.replace(/^The /, "").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight tracking-tight">{pp.name}</h3>
                    <p className="text-xs text-faint">Age {pp.age}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="chip14">Budget: {pp.budget.toLowerCase()}</span>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-faint">Buys for</dt>
                    <dd className="mt-0.5 text-fg">{pp.motive}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-faint">Leaves when</dt>
                    <dd className="mt-0.5 text-fg">{pp.objection}</dd>
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

      {/* ================= 6. SAMPLE RESEARCH REPORT ================= */}
      <section id="report" className="home-wide scroll-mt-24 pb-20 sm:pb-28" aria-labelledby="report-title">
        <Head
          eyebrow="Sample research report"
          id="report-title"
          title="A report you'd actually pay for."
          sub="Purchase intent, objections, friction, every customer's feedback, the audience breakdown and ranked fixes. Click through the tabs."
        />
        <Reveal className="mt-14">
          <ReportLab data={s} funnel={demo.funnel} />
        </Reveal>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/example" className="btn btn-secondary h-12 px-6">
            Open the full sample report
          </Link>
          <Link href="/onboarding" className="btn btn-primary h-12 px-6">
            Run yours free
          </Link>
        </div>
      </section>

      {/* ================= 7. WHAT YOU CAN ANALYZE ================= */}
      <section className="night18 home-wide" aria-labelledby="areas-title">
        <Head eyebrow="What you can analyze" id="areas-title" title="Everything a first-time visitor judges." sub="Websites, online stores, mobile apps, games and ads. On desktop and on a phone, from the first screen to the cart or signup." />
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
              <h3 className={`${k < 2 ? "mt-8" : "mt-5"} font-medium tracking-tight`}>{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-faint">Crawler looks and clicks like a visitor. It never pays, checks out or types into card fields.</p>
      </section>

      {/* ================= 8. FOUNDER CASE STUDIES (illustrative) ================= */}
      <section className="home-wide py-20 sm:py-28" aria-labelledby="cases-title">
        <Head
          eyebrow="Founder case studies"
          id="cases-title"
          title="What a test turns up."
          sub="Real founders who agreed to share their story, plus illustrative scenarios built from the problems Crawler looks for (clearly marked, not real companies or results)."
        />
        {/* REAL case studies first (src/lib/caseStudies.ts, with the founder's permission) */}
        {real.map((c) => (
          <Reveal key={c.slug} className="mt-14">
            <Link href={`/case-studies/${c.slug}`} className="cs-card group grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="cs-card-photo !aspect-[4/3] md:!aspect-auto md:min-h-[20rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt={c.photoAlt} loading="lazy" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.icon} alt="" aria-hidden className="cs-card-icon" />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#56554f]">
                  Real founder · {c.product} · {c.kind}
                </p>
                <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  {c.founder} built {c.product} at {c.age}.
                </h3>
                <p className="mt-3 text-[#45443f]">{c.summary}</p>
                <dl className="mt-6 flex flex-wrap gap-6">
                  {c.stats.slice(1).map((st) => (
                    <div key={st.label}>
                      <dd className="text-3xl font-semibold tabular-nums">{st.value}</dd>
                      <dt className="text-xs text-[#56554f]">{st.label}</dt>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] text-[#56554f]">
                  As reported by {c.founder.split(" ")[0]}{c.x ? ` (@${c.x} on X)` : ""}. Crawler test results coming soon.
                </p>
                <p className="mt-5 text-sm font-semibold underline-offset-4 group-hover:underline">Read the case study →</p>
              </div>
            </Link>
          </Reveal>
        ))}
        <ul className="mt-6 grid gap-4 lg:grid-cols-3">
          {CASES.map((c, k) => (
            <li key={c.title} className="h-full">
              <Reveal delay={k * 80} className="tile14 case23 h-full">
                <div className="flex items-center justify-between gap-3">
                  <span className="chip14">{c.kind}</span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-faint">Illustrative</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold leading-snug tracking-tight">{c.title}</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-faint">What the crowd said</dt>
                    <dd className="mt-1 text-fg">&ldquo;{c.quote}&rdquo;</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-faint">What Crawler found</dt>
                    <dd className="mt-1 text-fg">{c.found}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-faint">What to change</dt>
                    <dd className="mt-1 text-fg">{c.change}</dd>
                  </div>
                </dl>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ================= 9. PRICING (from plans.ts) ================= */}
      <section className="home-wide pb-20 sm:pb-28" aria-labelledby="price-title">
        <Head eyebrow="Pricing" id="price-title" title="Start free. Pay for the crowd you need." sub="1 Crawler = 1 simulated customer. Monthly plans reset each month; cancel any time." />
        <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((pl, k) => (
            <li key={pl.id} className="h-full">
              <Reveal delay={k * 60} className={`tile14 price23 h-full ${pl.badge === "Most popular" ? "is-hot" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{pl.name}</p>
                  {pl.badge && <span className="chip14">{pl.badge}</span>}
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">
                  ${pl.priceUsd}
                  <span className="text-sm font-normal text-faint">{pl.priceUsd ? " / month" : " once"}</span>
                </p>
                <p className="mt-2 text-sm text-muted">{allowanceLabel(pl)}</p>
                <p className="mt-3 text-sm text-fg">{pl.title}</p>
                {pl.ads ? <p className="mt-2 text-xs text-faint">Includes ad analysis</p> : null}
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="text-faint">
            {ENTERPRISE.name}: custom volume for teams. Or pay per analysis, from $9 a test.
          </p>
          <Link href="/pricing" className="btn btn-secondary h-11 px-5 text-sm">
            Compare plans
          </Link>
        </div>
      </section>

      {/* ================= 10. FAQ ================= */}
      <section className="home-wide pb-20 sm:pb-28">
        <Faq />
      </section>

      {/* founder spotlight (real case study): his face + the app icon, linking to the story */}
      {real.slice(0, 1).map((c) => (
        <section key={c.slug} className="home-wide pb-20" aria-label={`Founder spotlight: ${c.founder}`}>
          <Reveal>
            <Link href={`/case-studies/${c.slug}`} className="spot23 group">
              <span className="spot23-faces" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt="" className="spot23-face" loading="lazy" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.icon} alt="" className="spot23-icon" loading="lazy" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#56554f]">Founder spotlight</span>
                <span className="mt-1 block text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                  {c.founder}, {c.age}, tested {c.product} with Crawler.
                </span>
                <span className="mt-1 block text-sm text-[#45443f]">See how a 15-year-old founder uses simulated customers on his app.</span>
              </span>
              <span className="btn btn-primary h-11 shrink-0 px-5 text-sm">Read his story</span>
            </Link>
          </Reveal>
        </section>
      ))}

      {/* ================= 11. FINAL CTA ================= */}
      <section className="home-wide pb-28" aria-labelledby="final-title">
        <div className="final14 relative overflow-hidden">
          <Claws className="final23-claws" color="#0b0b0a" />
          <h2 id="final-title" className="h2-14 relative mx-auto max-w-3xl">
            Stop guessing. <span className="hl14">Start validating.</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-muted">Paste your website and see what your simulated customers think in a few minutes. Your first simulation is free.</p>
          <div className="url14 relative mx-auto mt-9 max-w-2xl text-left">
            <HeroForm cta="Run your first simulation" id="final-url" />
          </div>
          <p className="relative mt-4 text-sm text-faint">
            No credit card required ·{" "}
            <Link href="/onboarding" className="underline underline-offset-2 hover:text-fg">
              no website? start here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

// One "caption + window" row of How Crawler works: the caption on one side, the window running
// off the other edge; it rises in and gently tilts toward the mouse (desktop).
function Row({ n, title, text, children, flip = false, id }: { n: string; title: string; text: string; children: React.ReactNode; flip?: boolean; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 pt-24 sm:pt-32" aria-label={title}>
      <div className={`grid items-center gap-10 lg:gap-16 ${flip ? "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]" : "lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]"}`}>
        <div className={`px-4 sm:px-8 ${flip ? "lg:order-2 lg:pl-0 lg:pr-[max(3rem,calc((100vw-88rem)/2+3rem))]" : "lg:pr-0 lg:pl-[max(3rem,calc((100vw-88rem)/2+3rem))]"}`}>
          <p className="step23">{n}</p>
          <h3 className="mt-3 text-[1.7rem] font-semibold leading-tight tracking-tight">{title}</h3>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{text}</p>
        </div>
        <Reveal className={`min-w-0 ${flip ? "lg:order-1 pr-4 sm:pr-8 lg:pr-0" : "pl-4 sm:pl-8 lg:pl-0"}`}>
          <Tilt max={3}>{children}</Tilt>
        </Reveal>
      </div>
    </section>
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

const AUDIENCE_ITEMS = [
  { title: "Age, gender and where they live", body: "Set an age range (and lean it younger or older), a gender split and urban / suburban / rural. Every simulated customer is sampled from these ranges, so you get a spread, not one stereotype." },
  { title: "Budget and mindset", body: "Tight / okay / comfortable budgets, and mindsets like price-sensitive, skeptical, busy, impulse buyer or early adopter. These change what each customer notices and what makes them leave." },
  { title: "What they use now", body: "The app, competitor or workaround they'd have to switch from. Customers compare you with it, the way real people do." },
  { title: "Business buyers", body: "For B2B: role, company size, industry, and whether they can buy alone or need approval (then they look for pricing and proof to show a boss)." },
];

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

// Illustrative scenarios (NOT real companies, founders or results): the kinds of problems a test turns up.
const CASES = [
  {
    kind: "App · before launch",
    title: "A meal-planning app, two weeks before launch",
    quote: "$40 a year to plan dinners? I'll stick to my notes app.",
    found: "The price only appeared after signup, and the paywall never said the plan renews. Price was the top objection.",
    change: "Show the price under the headline and say plainly that it renews and how to cancel. Re-test the same crowd.",
  },
  {
    kind: "Online store · beta",
    title: "A streetwear drop page",
    quote: "Love the hoodie, but I'm not paying shipping I can't see until checkout.",
    found: "Shipping cost and delivery time were missing from the product page, and there was no size guide.",
    change: "Add a shipping and returns line under the price and a size chart next to the size picker.",
  },
  {
    kind: "SaaS · waitlist",
    title: "A SaaS waitlist with a vague headline",
    quote: "I read it twice and still don't know what it does.",
    found: "Most customers left on the first screen. The signup also asked for six fields before anything was shown.",
    change: "One sentence that says what it does and for whom, and an email-only signup.",
  },
];
