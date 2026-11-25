// The early-access page at /landing (v2, the waitlist brief).
// Look: washed off-white and concrete grey, black and charcoal type, thin black lines, generous
// space. No photos, no cracks, no decorative cards. All claims are honest: simulated research,
// not guaranteed predictions. Every number on the page is either a real count from the database
// or clearly labelled as an illustration.
import type { Metadata } from "next";
import Waitlist from "@/components/landing/Waitlist";
import Reveal from "@/components/Reveal";
import { AnalyzeVisual, HeroSimulation, LineIcon, OptimizeVisual, ScienceField, SimulateVisual, VISUAL_CSS } from "@/components/landing/early/Visuals";

export const metadata: Metadata = {
  title: { absolute: "Crawler: early access. Know what your customers think before they do." },
  description:
    "Crawler simulates real-world customer behavior with AI personas to test your website, pricing, products and ads before you launch. Join the early-access list.",
  alternates: { canonical: "/landing" },
  openGraph: {
    title: "Crawler: know what your customers think before they do",
    description: "Join the early-access list for simulated customer research.",
  },
};

// Concrete grain: a soft noise texture, no cracks. Used once, very faint.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const TESTS = [
  { icon: "page" as const, title: "Websites and landing pages", body: "The first screen, the story, the sign-up, the price." },
  { icon: "list" as const, title: "Product listings", body: "Titles, photos, sizes and the add-to-cart moment." },
  { icon: "tag" as const, title: "Pricing strategies", body: "Monthly or yearly, bundles, free trials, what the price looks like." },
  { icon: "compass" as const, title: "Brand positioning", body: "Whether a visitor understands what you are and who it is for." },
  { icon: "ad" as const, title: "Advertisements and creative", body: "Ad copy and the page it sends people to, before the budget goes out." },
  { icon: "people" as const, title: "Customer demographics", body: "Test the same page against different audiences, from students to small business owners." },
  { icon: "target" as const, title: "Competitor positioning", body: "Run your page and a competitor's page, then compare where each one loses people." },
];

const SCIENCE = [
  "Thousands of distinct customer personas, each with its own budget, habits and doubts.",
  "Different purchasing behaviors: some skim, some compare, some leave at the first form.",
  "Individual website interactions, step by step, from the first screen to the decision.",
  "Product and pricing evaluations, with the reasons written down for every decision.",
  "Aggregated insights and recommendations, counted in code and ranked by impact.",
];

const FEATURES = [
  {
    n: "01",
    label: "Simulate",
    title: "Put your website in front of thousands of AI-powered customer personas.",
    body: "Personas explore your pages the way real visitors do: they arrive, scroll, compare prices and decide whether to continue.",
    visual: <SimulateVisual />,
  },
  {
    n: "02",
    label: "Analyze",
    title: "Understand exactly what's stopping customers from buying.",
    body: "See purchase intent broken down by audience, the objections people gave, what they said about pricing, and where friction builds up.",
    visual: <AnalyzeVisual />,
  },
  {
    n: "03",
    label: "Optimize",
    title: "Turn customer insights into your next competitive advantage.",
    body: "Get ranked recommendations, sharper positioning and the changes most likely to win back customers, with the number of simulated customers each one could win back.",
    visual: <OptimizeVisual />,
  },
];

export default function EarlyAccessPage() {
  return (
    <div className="ea relative overflow-hidden bg-[#efefec] text-[#0b0b0c]">
      <style>{`
        html { scroll-behavior: smooth; }
        .ea .hairline { border-color: rgba(11,11,12,.12); }
        .ea .grain::before { content: ""; position: absolute; inset: 0; background-image: ${GRAIN}; pointer-events: none; opacity: .9; }
        .ea .claw { fill: none; stroke: #0b0b0c; stroke-linecap: round; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
        ${VISUAL_CSS}
      `}</style>

      {/* ============ 1. HERO ============ */}
      <section className="grain relative mx-auto grid max-w-[88rem] items-center gap-16 px-6 pt-20 pb-24 md:grid-cols-[1.02fr_0.98fr] md:px-10 md:pt-28 md:pb-36">
        <svg aria-hidden="true" viewBox="0 0 1000 700" className="pointer-events-none absolute -right-24 top-0 h-[120%] w-[60%] opacity-[.1] md:opacity-[.14]" fill="none" stroke="#0b0b0c" strokeWidth="1.2" strokeLinecap="round">
          <path d="M120 40 C 260 240, 300 420, 210 680" />
          <path d="M190 30 C 330 230, 370 430, 280 690" />
          <path d="M260 40 C 400 240, 440 420, 350 680" />
          <path d="M620 80 C 700 260, 720 420, 640 640" strokeOpacity=".6" />
        </svg>
        <div className="relative z-10">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-black/60">
              <span className="inline-block h-px w-8 bg-black" aria-hidden="true" />
              Crawler / Early access program
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 text-[clamp(2.4rem,4.8vw,4.6rem)] font-semibold leading-[0.95] tracking-[-0.035em]">
              Know what your customers think. <span className="text-black/40">Before they do.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 max-w-[38rem] text-lg leading-relaxed text-black/70">
              Your next customers are already here. Crawler simulates real-world customer behavior using AI-powered personas to analyze your website, products, pricing, and advertisements before you spend money launching them.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a href="#join" className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-black px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#222]">
                Get early access
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <p className="text-sm text-black/55">Free to join. No credit card.</p>
            </div>
            <p className="mt-8 text-sm text-black/55">Test your business against 1,000+ simulated customers.</p>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative z-10">
          <div className="mx-auto max-w-[34rem]">
            <HeroSimulation />
          </div>
        </Reveal>
      </section>

      {/* ============ 2. PRODUCT ============ */}
      <section className="mx-auto max-w-[88rem] px-6 py-24 md:px-10 md:py-36">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 border-t border-black pt-6 md:flex-row md:items-end">
            <h2 className="text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">Your business. Under the microscope.</h2>
            <p className="max-w-[24rem] text-black/60">Three steps, from a simulated crowd to a ranked list of changes.</p>
          </div>
        </Reveal>

        <div className="mt-20 grid gap-24 md:gap-32">
          {FEATURES.map((f, i) => (
            <div key={f.n} className={`grid items-center gap-12 md:grid-cols-2 md:gap-20 ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">
                  {f.n} — {f.label}
                </p>
                <h3 className="mt-6 text-[clamp(1.7rem,2.8vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-black/65">{f.body}</p>
              </Reveal>
              <Reveal delay={120}>
                <div className="rounded-[20px] border border-black/10 bg-[#f7f7f5] p-6 md:p-10">{f.visual}</div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ============ 3. SCIENCE ============ */}
      <section className="border-y border-black/10 bg-[#e6e6e2]">
        <div className="mx-auto grid max-w-[88rem] items-center gap-16 px-6 py-24 md:grid-cols-[0.95fr_1.05fr] md:px-10 md:py-36">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">The science</p>
            <h2 className="mt-6 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">Not another analytics dashboard.</h2>
            <p className="mt-8 max-w-[30rem] text-lg leading-relaxed text-black/65">
              Analytics show what visitors did after they arrived. Crawler asks what people like them would do before they leave, and why.
            </p>
            <ul className="mt-10 grid gap-4">
              {SCIENCE.map((s, i) => (
                <li key={s} className="grid grid-cols-[2.25rem_1fr] gap-4 border-t border-black/10 pt-4 text-black/75">
                  <span className="text-xs font-medium text-black/45">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 rounded-2xl border border-black bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em]">A note on what this is</p>
              <p className="mt-3 text-black/70">
                Crawler produces simulated research, not guaranteed predictions of real-world consumer behavior. Simulated customers can point you to likely problems. Only real customers can confirm them.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-[20px] border border-black/10 bg-white p-4 md:p-6">
              <ScienceField />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 4. WHAT YOU CAN TEST ============ */}
      <section className="mx-auto max-w-[88rem] px-6 py-24 md:px-10 md:py-36">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 border-t border-black pt-6 md:flex-row md:items-end">
            <h2 className="text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">What you can test.</h2>
            <p className="max-w-[24rem] text-black/60">Anything a customer sees before they decide.</p>
          </div>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 border-l border-t border-black/10 sm:grid-cols-2 lg:grid-cols-3">
          {TESTS.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 80}>
              <article className="group relative h-full cursor-default border-b border-r border-black/10 p-8 transition-colors duration-500 hover:bg-white md:p-10">
                <LineIcon name={t.icon} />
                <h3 className="mt-8 text-xl font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-3 text-black/60">{t.body}</p>
                <span aria-hidden="true" className="absolute left-8 right-8 bottom-0 h-px origin-left scale-x-0 bg-black transition-transform duration-500 group-hover:scale-x-100 md:left-10 md:right-10" />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 5. WAITLIST ============ */}
      <section id="join" className="scroll-mt-24 border-t border-black bg-[#f7f7f5]">
        <div className="mx-auto grid max-w-[88rem] gap-16 px-6 py-24 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:py-36">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/50">Early access</p>
            <h2 className="mt-6 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[1] tracking-[-0.03em]">Get ahead before everyone else.</h2>
            <p className="mt-8 max-w-[30rem] text-lg leading-relaxed text-black/65">
              Join the Crawler early-access list and be among the first to experience a new way of understanding your customers.
            </p>

            <ol className="mt-12 grid gap-6">
              {[
                ["Join with your email.", "Add a few details so we can tailor your invitation. Everything is optional except your email."],
                ["Invite friends.", "Each friend who joins through your link moves you up the list. Your place is based on the people who have joined so far."],
                ["Get your invitation by email.", "Launch updates and early-access invitations are sent by email. Unsubscribe from any email in one click."],
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

      {/* ============ 6. FINAL CTA ============ */}
      <section className="grain relative bg-black text-white">
        <div className="relative mx-auto max-w-[88rem] px-6 py-28 md:px-10 md:py-44">
          <Reveal>
            <h2 className="max-w-[18ch] text-[clamp(2.8rem,7.2vw,7rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
              Your competitors are guessing. <span className="text-white/45">You don&apos;t have to.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <p className="max-w-[32rem] text-lg leading-relaxed text-white/70">
                Get early access to Crawler and start making decisions with simulated customer intelligence.
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
