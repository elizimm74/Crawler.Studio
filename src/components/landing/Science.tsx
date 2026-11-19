// "The science": how Crawler's consumer models are built, shown up front on the home page.
// Everything here mirrors docs/persona-research.md and src/lib/behavior.ts. FACTS come from
// published research (named); ASSUMPTIONS are our own estimates and are labelled as such.
// If you change a number here, change it in docs/persona-research.md too (and the other way round).
import Reveal from "../Reveal";
import Claws from "../Claws";

const PIPELINE = [
  { n: "01", title: "Published research", text: "Studies on how real people browse, sign up and pay: attention spans, sign-up walls, card requirements, how teens shop." },
  { n: "02", title: "Behavior rules", text: "Each finding becomes a rule. A rule only applies to the people it fits: teen rules for teens, buyer rules for buyers." },
  { n: "03", title: "A varied crowd, sampled in code", text: "100 people with different ages, budgets, devices, patience and habits. Rolled by code, not invented by AI, so it isn't 100 copies of one person." },
  { n: "04", title: "Counted, not guessed", text: "Each person thinks first (first glance, need, dealbreaker, trust), then decides. Code counts the answers, checks they are varied, groups the reasons and ranks the fixes." },
] as const;

const FACTS = [
  { finding: "Visitors decide within about 10 seconds, and skim", who: "Everyone", source: "Nielsen Norman Group" },
  { finding: "The median landing page converts about 6.6% of visitors (SaaS about 3.8%)", who: "Everyone", source: "Unbounce, Q4 2024 (41,000 pages)" },
  { finding: "Forced account creation is a top reason people quit (about 18-19% of abandoners)", who: "Everyone", source: "Baymard Institute" },
  { finding: "Requiring a card for a trial cuts trial sign-ups (about 10% vs 2% of visitors)", who: "Everyone", source: "Totango data, via Chargebee" },
  { finding: "Most teens read comments (75%) and reviews (72%) before buying, and trust friends over influencers", who: "Ages 13-17", source: "Teen shopping survey, via Net Influencer" },
  { finding: "About 87% of US teens own an iPhone", who: "Ages 13-17", source: "Piper Sandler, Fall 2025 (10,959 teens)" },
  { finding: "Median download-to-trial for subscription apps is about 6.2%", who: "App users", source: "RevenueCat, 2025" },
] as const;

const ASSUMPTIONS = [
  { what: "Share on a phone", value: "Teens 85% · adults 60% · business buyers 35%" },
  { what: "Patience", value: "About 10 sec, 30 sec or a few minutes; teens skew shorter" },
  { what: "Teens and card-required trials", value: "Mostly a dead end (most have no card of their own)" },
  { what: "Inner life", value: "Why they're here, how much they need it, past bad experiences (about 1 in 4), what wins them, their dealbreaker" },
] as const;

export default function Science() {
  return (
    <div className="relative">
      <Claws color="#ffffff" className="pointer-events-none absolute -top-16 right-0 h-40 w-32 opacity-[0.14] sm:right-8" />
      <p className="t-label text-center">the science behind the customers</p>
      <h2 className="t-chunk mt-3 text-center">Consumer models built on research.</h2>
      <p className="t-lead mx-auto mt-4 max-w-2xl text-center">
        Every simulated customer starts from published studies about how real people browse and buy. Here&apos;s exactly how, and where each
        number comes from.
      </p>

      {/* the 4-step pipeline */}
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE.map((s, i) => (
          <li key={s.n}>
            <Reveal delay={i * 80} className={`h-full rounded-xl p-5 ${i % 2 ? "card-blue" : "card"}`}>
              <p className="t-number text-4xl text-accent">{s.n}</p>
              <p className="mt-3 font-medium">{s.title}</p>
              <p className="mt-2 text-sm opacity-80">{s.text}</p>
            </Reveal>
          </li>
        ))}
      </ol>

      {/* the model card: facts with sources, then our labelled assumptions */}
      <Reveal className="card mt-8 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
          <p className="font-medium">Model card</p>
          <p className="t-label">facts = published · assumptions = our estimates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Research findings used by Crawler&apos;s simulated customers, with sources</caption>
            <thead>
              <tr>
                {["Finding", "Applies to", "Source"].map((h) => (
                  <th key={h} scope="col" className="t-label whitespace-nowrap px-5 py-3 font-normal sm:px-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACTS.map((f) => (
                <tr key={f.finding} className="border-t border-line">
                  <th scope="row" className="px-5 py-3 font-medium sm:px-6">
                    {f.finding}
                  </th>
                  <td className="whitespace-nowrap px-5 py-3 text-muted sm:px-6">{f.who}</td>
                  <td className="px-5 py-3 text-muted sm:px-6">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line bg-subtle px-5 py-4 sm:px-6">
          <p className="t-label">assumptions (our estimates, tuned as real results come in)</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {ASSUMPTIONS.map((a) => (
              <li key={a.what} className="text-sm">
                <span className="font-medium">{a.what}: </span>
                <span className="text-muted">{a.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-faint">
        Most numbers are US-based, some studies are older or reported second-hand, and none of these organizations endorse or use Crawler.
        Simulated customers show buying intent, not real purchases. The /accuracy page compares predictions with real launches as they come in.
      </p>
    </div>
  );
}
