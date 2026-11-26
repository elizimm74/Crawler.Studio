// The early-access waitlist at /landing (v3): the product shown in full, the waitlist to get it.
// Look: washed off-white and concrete grey, black and charcoal type, thin black lines and claw
// marks, generous space. No pricing on this page.
// Honest by design: simulated research, not guaranteed predictions. The sample report and
// customer card are labelled illustrative; the research facts are named and sourced.
// "30,000" = the most simulated customers a month on Crawler's largest plan (one test is up to 1,000).
import type { Metadata } from "next";
import Waitlist from "@/components/landing/Waitlist";
import Reveal from "@/components/Reveal";
import SampleReport from "@/components/landing/early/SampleReport";
import { AnalyzeVisual, HeroSimulation, LineIcon, OptimizeVisual, ScienceField, SimulateVisual, VISUAL_CSS } from "@/components/landing/early/Visuals";
import { FACTS } from "@/components/landing/Science";

export const metadata: Metadata = {
  title: { absolute: "Crawler: meet your customers before they meet your website" },
  description:
    "Would your customers actually buy? Crawler simulates up to 30,000 customers a month to test your website, products, pricing and ads before you launch. Join the early-access list.",
  alternates: { canonical: "/landing" },
  openGraph: {
    title: "Crawler: meet your customers before they meet your website",
    description: "Up to 30,000 simulated customers a month. Join the early-access list.",
  },
};

// Soft paper grain, no cracks.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FOUND = ["Price hidden", "No proof", "Too many steps", "Sign-up wall", "Unclear value", "Card required", "Slow first screen", "Who is this for?"];

const STATS = [
  { big: "30,000", small: "simulated customers a month" },
  { big: "1,000", small: "customers in a single test" },
  { big: "Minutes", small: "from your link to the reasons" },
  { big: "Every", small: "decision explained in their own words" },
];

const DECIDE = [
  { n: "01", t: "First glance", d: "What they notice in the first few seconds, and what they skip." },
  { n: "02", t: "Need", d: "Whether this solves a problem they actually have today." },
  { n: "03", t: "Dealbreaker", d: "The one thing that makes them leave: a hidden price, a card form, no proof." },
  { n: "04", t: "Trust", d: "Whether they believe you: reviews, real people, a clear company." },
  { n: "05", t: "Decide", d: "Yes, maybe or no, with the reason in their own words." },
];

const TRAITS = ["Age", "Budget", "Device", "Where they came from", "Patience", "Mindset", "What they use now", "Past bad experiences"];

const TESTS = [
  { icon: "page" as const, title: "Websites and landing pages", body: "The first screen, the story, the sign-up." },
  { icon: "list" as const, title: "Product listings", body: "Titles, photos, sizes and the add-to-cart moment." },
  { icon: "tag" as const, title: "Pricing pages", body: "How your prices, plans and trials land with real-feeling buyers." },
  { icon: "compass" as const, title: "Brand positioning", body: "Whether people get what you are and who it's for." },
  { icon: "ad" as const, title: "Ads and creative", body: "Ad copy, videos and the page they send people to." },
  { icon: "people" as const, title: "Customer audiences", body: "Students, parents, founders, skeptics. Test the same page on each." },
  { icon: "target" as const, title: "Competitor pages", body: "Run your page and theirs, then compare where each loses people." },
];

const FAQ = [
  { q: "Are these real people?", a: "No. They are AI-simulated customers, each built with a different age, budget, device, mindset and patience. They show buying intent, not real purchases. Use them to find problems before real customers do." },
  { q: "How accurate is it?", a: "Simulated customers are a fast signal, not a sales forecast, and they tend to say yes more often than real people. They are good at spotting missing prices, missing proof, unclear headlines and heavy sign-ups. We publish predicted versus real results as they come in." },
  { q: "What happens to my website?", a: "Crawler only opens public pages, like a first-time visitor would. It never buys anything, never contacts anyone, and doesn't get around other sites' logins or bot checks." },
  { q: "When do I get access?", a: "Early-access invitations go out by email. Join the list, and invite friends with your link to move up." },
];

export default function EarlyAccessPage() {
  return (
    <div className="ea relative overflow-hidden bg-[#efefec] text-[#0b0b0c]">
      <style>{`
        html { scroll-behavior: smooth; }
        body:has(.ea) a[href="/pricing"] { display: none !important; }
        .ea .grain::before { content: ""; position: absolute; inset: 0; background-image: ${GRAIN}; pointer-events: none; }
        .ea .marquee { display: flex; width: max-content; animation: ea-marquee 40s linear infinite; }
        @keyframes ea-marquee { to { transform: translateX(-50%); } }
        .ea .float { animation: ea-float 7s ease-in-out infinite; }
        @keyframes ea-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .ea .marquee, .ea .float { animation: none; }
        }
        ${VISUAL_CSS}
      `}</style>

      {/* ============ 1. HERO ============ */}
      <section className="grain relative">
        <svg aria-hidden="true" viewBox="0 0 1000 700" className="pointer-events-none absolute -right-24 top-0 h-full w-[60%] opacity-[.1]" fill="none" stroke="#0b0b0c" strokeWidth="1.2" strokeLinecap="round">
          <path d="M120 40 C 260 240, 300 420, 210 680" />
          <path d="M190 30 C 330 230, 370 430, 280 690" />
          <path d="M260 40 C 400 240, 440 420, 350 680" />
        </svg>
        <div className="relative mx-auto grid max-w-[88rem] items-center gap-14 px-6 pt-16 pb-20 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:pt-24 md:pb-28">
          <div>
            <Reveal>
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-black/60">
                <span className="inline-block h-px w-8 bg-black" aria-hidden="true" />
                Crawler / Early access
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-8 text-[clamp(2.4rem,4.4vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
                Meet your customers <span className="text-black/40">before they meet your website.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-8 text-xl font-medium tracking-tight md:text-2xl">
                Would your customers actually buy? Ask up to <span className="rounded-md bg-black px-2 py-0.5 text-white">30,000</span> simulated customers a month first.
              </p>
              <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-black/65">
                Crawler sends AI-simulated customers through your website, products, pricing and ads. Each one decides whether to buy, and tells you exactly why not, before you spend money launching.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a href="#join" className="group inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-black px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#222]">
                  Get early access
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </a>
                <a href="#report" className="inline-flex h-14 items-center justify-center whitespace-nowrap rounded-full border border-black/20 px-8 text-sm font-semibold uppercase tracking-[0.12em] transition hover:border-black">
                  See a sample report
                </a>
              </div>
              <p className="mt-5 text-sm text-black/55">Free to join. No credit card.</p>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative">
            <div className="mx-auto max-w-[32rem]">
              <HeroSimulation />
            </div>
            {/* one simulated customer, floating over the crowd */}
            <div className="float relative mx-auto -mt-10 w-[15.5rem] md:absolute md:-bottom-10 md:-left-20 md:mt-0 rounded-2xl border border-black/10 bg-white/90 p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,.4)] backdrop-blur md:-left-6 md:bottom-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-black/50">Simulated customer</p>
                <p className="text-[10px] text-black/40">example</p>
              </div>
              <p className="mt-2 font-semibold">Dana, 45 · nurse</p>
              <dl className="mt-2 grid gap-1 text-xs text-black/65">
                <div className="flex justify-between"><dt>Came from</dt><dd>TikTok</dd></div>
                <div className="flex justify-between"><dt>Budget</dt><dd>Tight</dd></div>
                <div className="flex justify-between"><dt>Patience</dt><dd>About 10 sec</dd></div>
                <div className="flex justify-between"><dt>Dealbreaker</dt><dd>Hidden price</dd></div>
              </dl>
              <p className="mt-3 rounded-lg bg-[#e6e6e2] px-3 py-2 text-xs font-medium">Wouldn&apos;t buy: &ldquo;If they hide the price, it&apos;s expensive.&rdquo;</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 2. WHAT IT FINDS (moving band) ============ */}
      <section aria-label="Problems Crawler finds" className="overflow-hidden border-y border-black bg-black py-5 text-white">
        <div className="marquee">
          {[...FOUND, ...FOUND].map((w, i) => (
            <span key={i} className="flex items-center gap-8 pr-8 text-2xl font-semibold tracking-tight md:text-4xl">
              {w}
              <span aria-hidden="true" className="text-[#02aa3d]">✕</span>
            </span>
          ))}
        </div>
      </section>

      {/* stats */}
      <section className="mx-auto max-w-[88rem] px-6 py-16 md:px-10 md:py-20">
        <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.small} delay={i * 70}>
              <div className="border-l border-black/15 pl-5">
                <dt className="text-[clamp(2rem,3.6vw,3.2rem)] font-semibold tracking-[-0.03em]">{s.big}</dt>
                <dd className="mt-1 text-sm text-black/60">{s.small}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ============ 3. HOW IT WORKS ============ */}
      <section className="mx-auto max-w-[88rem] px-6 pb-24 md:px-10 md:pb-36">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 border-t border-black pt-6 md:flex-row md:items-end">
            <h2 className="text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">Paste a link. <span className="text-black/40">Choose who walks in.</span></h2>
            <p className="max-w-[24rem] text-black/60">Five steps from your website to the changes that win customers back.</p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <Reveal>
            <article className="h-full rounded-[20px] border border-black/10 bg-[#f7f7f5] p-8 md:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">01 — Submit your website</p>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">Crawler opens it like a first-time visitor.</h3>
              <p className="mt-3 text-black/65">On a laptop and a phone. It finds your pricing and sign-up on its own, and you choose what to learn: would they buy, is the price fair, is the value clear.</p>
              <div className="mt-8 flex items-center gap-2 rounded-full border border-black/15 bg-white p-1.5 pl-5 text-sm">
                <span className="text-black/40">https://</span>
                <span className="flex-1">yourwebsite.com</span>
                <span className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white">Simulate</span>
              </div>
            </article>
          </Reveal>
          <Reveal delay={100}>
            <article className="h-full rounded-[20px] border border-black/10 bg-[#f7f7f5] p-8 md:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">02 — Generate your customer audience</p>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">Pick who walks in. Every one is different.</h3>
              <p className="mt-3 text-black/65">Your audience becomes a crowd of individual people. Their traits are mixed in code, so it is never a thousand copies of one person.</p>
              <div className="mt-8 grid gap-2">
                {[["A1", "Busy parents"], ["A2", "Price-checkers"], ["A3", "Skeptics"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">
                    <span><span className="mr-3 text-black/40">{k}</span>{v}</span>
                    <span className="text-black/45">a third of the crowd</span>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { n: "03 — Simulate individual journeys", t: "Each customer walks through your site alone.", d: "Home, product, pricing, sign-up. Every one scrolls, compares and decides at their own pace.", v: <SimulateVisual /> },
            { n: "04 — Analyze decisions and objections", t: "See who would buy, and why the rest won't.", d: "Purchase intent, the objections people gave and where each one left, all counted in code.", v: <AnalyzeVisual /> },
            { n: "05 — Get prioritized recommendations", t: "Fix what matters first.", d: "Changes ranked by how many simulated customers each could win back, with rewritten copy.", v: <OptimizeVisual /> },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <article className="flex h-full flex-col rounded-[20px] border border-black/10 bg-[#f7f7f5] p-8">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">{s.n}</p>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-3 text-black/65">{s.d}</p>
                <div className="mt-auto pt-8">{s.v}</div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 4. INSIDE EVERY CUSTOMER (science) ============ */}
      <section className="border-y border-black/10 bg-[#e6e6e2]">
        <div className="mx-auto max-w-[88rem] px-6 py-24 md:px-10 md:py-36">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">The science</p>
            <h2 className="mt-6 max-w-[20ch] text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">
              Every customer is built, <span className="text-black/40">not copied from a template.</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid items-start gap-12 md:grid-cols-[1fr_1fr]">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.14em]">How each one decides</p>
              <ol className="mt-6 grid gap-0">
                {DECIDE.map((s) => (
                  <li key={s.n} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-black/15 py-5">
                    <span className="text-xs font-medium text-black/45">{s.n}</span>
                    <div>
                      <p className="text-lg font-semibold">{s.t}</p>
                      <p className="mt-1 text-black/65">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em]">What makes each one different</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {TRAITS.map((t) => (
                  <span key={t} className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm">{t}</span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-[20px] border border-black/10 bg-white p-4 md:p-6">
                <ScienceField />
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="mt-20 grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Built on published research</p>
                <ul className="mt-6 grid gap-0">
                  {FACTS.map((f) => (
                    <li key={f.finding} className="grid gap-1 border-t border-black/15 py-4 md:grid-cols-[1fr_14rem] md:gap-6">
                      <span>{f.finding}</span>
                      <span className="text-sm text-black/50">{f.source}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-black/50">Where no study exists, Crawler uses its own estimate and labels it as one.</p>
              </div>
              <div className="self-start rounded-2xl border border-black bg-white p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Honest about what it is</p>
                <p className="mt-4 text-black/70">
                  Simulated customers are a fast, cheap signal, not a sales forecast. They tend to say yes more often than real people.
                </p>
                <p className="mt-4 text-black/70">
                  They are good at spotting missing prices, missing proof, unclear headlines and heavy sign-ups. They don&apos;t replace real customers or A/B tests after launch.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 5. SAMPLE REPORT ============ */}
      <section id="report" className="scroll-mt-24 mx-auto max-w-[88rem] px-6 py-24 md:px-10 md:py-36">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 border-t border-black pt-6 md:flex-row md:items-end">
            <h2 className="text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">The simulation runs. <span className="text-black/40">The reasons come back.</span></h2>
            <p className="max-w-[24rem] text-black/60">Click through a sample report. Every number in it is illustrative.</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-14">
            <SampleReport />
          </div>
        </Reveal>
      </section>

      {/* ============ 6. WHAT YOU CAN TEST ============ */}
      <section className="mx-auto max-w-[88rem] px-6 pb-24 md:px-10 md:pb-36">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 border-t border-black pt-6 md:flex-row md:items-end">
            <h2 className="text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">What you can test.</h2>
            <p className="max-w-[24rem] text-black/60">Anything a customer sees before they decide.</p>
          </div>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 border-l border-t border-black/10 sm:grid-cols-2 lg:grid-cols-4">
          {TESTS.map((t, i) => (
            <Reveal key={t.title} delay={(i % 4) * 70}>
              <article className="group relative h-full border-b border-r border-black/10 p-8 transition-colors duration-500 hover:bg-white">
                <LineIcon name={t.icon} />
                <h3 className="mt-8 text-lg font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-2 text-sm text-black/60">{t.body}</p>
                <span aria-hidden="true" className="absolute left-8 right-8 bottom-0 h-px origin-left scale-x-0 bg-black transition-transform duration-500 group-hover:scale-x-100" />
              </article>
            </Reveal>
          ))}
          <Reveal delay={210}>
            <a href="#join" className="group flex h-full flex-col justify-between border-b border-r border-black/10 bg-black p-8 text-white transition hover:bg-[#1c1c1e]">
              <p className="text-lg font-semibold">Want to test yours first?</p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.12em]">
                Get early access <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </p>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ============ 7. WAITLIST ============ */}
      <section id="join" className="scroll-mt-24 border-t border-black bg-[#f7f7f5]">
        <div className="mx-auto grid max-w-[88rem] gap-16 px-6 py-24 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:py-36">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">Early access</p>
            <h2 className="mt-6 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">Get ahead before everyone else.</h2>
            <p className="mt-8 max-w-[30rem] text-lg leading-relaxed text-black/65">
              Be one of the first founders to see your business through 30,000 customers&apos; eyes. Join the list and we&apos;ll send your invitation by email.
            </p>
            <ol className="mt-12 grid gap-6">
              {[
                ["Join with your email.", "Everything else is optional."],
                ["Invite friends, move up.", "Each friend who joins with your link moves you up the list. You'll see your real place after you join."],
                ["Get your invitation.", "Early-access invitations arrive by email. Unsubscribe from any email in one click."],
              ].map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-4">
                  <span className="text-xs font-medium text-black/45">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-black/60">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-[20px] border border-black/10 bg-white p-6 md:p-10">
              <Waitlist />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 8. FAQ ============ */}
      <section className="mx-auto max-w-[88rem] px-6 py-24 md:px-10 md:py-32">
        <Reveal>
          <div className="border-t border-black pt-6">
            <h2 className="text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">Fair questions.</h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-x-16 md:grid-cols-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-black/15 py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                {f.q}
                <span aria-hidden="true" className="text-2xl font-normal transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-black/65">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ 9. FINAL CTA ============ */}
      <section className="relative bg-black text-white">
        <svg aria-hidden="true" viewBox="0 0 1000 600" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[.18]" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round">
          <path d="M520 20 C 640 200, 680 380, 600 590" />
          <path d="M590 10 C 710 190, 750 390, 670 595" />
          <path d="M660 20 C 780 200, 820 380, 740 590" />
        </svg>
        <div className="relative mx-auto max-w-[88rem] px-6 py-28 md:px-10 md:py-44">
          <Reveal>
            <h2 className="max-w-[18ch] text-[clamp(2.8rem,7.2vw,7rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
              Your competitors are guessing. <span className="text-white/45">You don&apos;t have to.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <p className="max-w-[32rem] text-lg leading-relaxed text-white/70">
                Meet 30,000 simulated customers before your real ones arrive. Join the early-access list today.
              </p>
              <a href="#join" className="group inline-flex h-14 shrink-0 items-center justify-center gap-3 rounded-full bg-white px-8 text-sm font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-[#e6e6e2]">
                Join the waitlist
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
