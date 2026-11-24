// /science: the research behind Crawler, how each simulated customer is built, what it is good and
// bad at, and how we keep people safe. Public, so founders (and their investors) can check our work.
// RULES for this page: every research claim names its source and links to it; the limits are stated
// as plainly as the strengths; nothing here promises an exact conversion rate.
// Research papers checked 2026-11-23 (titles, authors, venues). Behaviour facts come from
// src/components/landing/Science.tsx (FACTS), which mirrors docs/persona-research.md.
import Link from "next/link";
import { ASSUMPTIONS, FACTS } from "@/components/landing/Science";
import CrowdModel from "@/components/landing/ed/CrowdModel";
import DecisionPath from "@/components/landing/ed/DecisionPath";
import { homeDemo } from "@/lib/homeDemo";

export const metadata = {
  title: "The science behind AI customer simulations",
  alternates: { canonical: "/science" },
  description: "The published research behind Crawler's simulated customers, how each one is built, what it's good and bad at, and how we keep you safe.",
};

// Peer-reviewed or working-paper research on AI models standing in for real people.
const PAPERS = [
  {
    cite: "Argyle, Busby, Fulda, Gubler, Rytting & Wingate (2023)",
    title: "Out of One, Many: Using Language Models to Simulate Human Samples",
    venue: "Political Analysis 31(3)",
    href: "https://arxiv.org/abs/2209.06899",
    found: "Given realistic backgrounds, an AI model reproduced how different real groups answered large US surveys, in many cases closely. The authors call this “algorithmic fidelity”.",
    limit: "How well it works varies by group and by topic.",
  },
  {
    cite: "Aher, Arriaga & Kalai (2023)",
    title: "Using Large Language Models to Simulate Multiple Humans and Replicate Human Subject Studies",
    venue: "ICML 2023",
    href: "https://arxiv.org/abs/2208.10264",
    found: "Simulated crowds replicated the results of several classic human studies (for example the Ultimatum Game).",
    limit: "Some models showed a “hyper-accuracy” distortion: they know facts real people get wrong.",
  },
  {
    cite: "Horton, Filippas & Manning (2023)",
    title: "Large Language Models as Simulated Economic Agents: What Can We Learn from Homo Silicus?",
    venue: "NBER Working Paper 31122",
    href: "https://www.nber.org/papers/w31122",
    found: "AI “agents” given preferences and information behaved qualitatively like people in classic economics experiments.",
    limit: "A working paper (not peer-reviewed); results are qualitative, not exact numbers.",
  },
  {
    cite: "Brand, Israeli & Ngwe (2023)",
    title: "Using GPT for Market Research",
    venue: "Harvard Business School Working Paper 23-062",
    href: "https://papers.ssrn.com/abstract=4395751",
    found: "AI answers about buying followed realistic patterns, and some willingness-to-pay numbers came close to human studies.",
    limit: "Exact numbers were often off and sometimes pointed the wrong way. The authors recommend AI as a supplement to human research, not a replacement.",
  },
  {
    cite: "Santurkar, Durmus, Ladhak, Lee, Liang & Hashimoto (2023)",
    title: "Whose Opinions Do Language Models Reflect?",
    venue: "ICML 2023",
    href: "https://arxiv.org/abs/2303.17548",
    found: "Measured how well AI models match the opinions of 60 US demographic groups.",
    limit: "Large gaps remained, even when the model was told which group to act as; some groups (e.g. people 65+) were poorly represented.",
  },
] as const;

const STEPS = [
  ["We read your product like a visitor", "A real browser opens your site (or your app screenshots), finds pricing and sign-up, and records what's actually on the screen: text, prices, form fields, whether a card is needed. Code measures these facts; the AI doesn't guess them."],
  ["We build a varied crowd in code", "Each simulated customer gets an age, budget, device, mindset, tech comfort, patience and a reason for visiting, rolled by code from the audience you pick. That's how 100 people stay different instead of 100 copies of one stereotype."],
  ["Each person gets research-backed behaviour", "Findings from the studies below become rules that only apply to the people they fit (teen rules for teens, buyer rules for buyers). Our own estimates are labelled as assumptions."],
  ["They think before they decide", "Every customer writes a first glance and a thought (need, dealbreaker, trust) before saying yes, maybe or no, and must point at something real on your screens."],
  ["Code counts; quality is checked", "Counting, grouping reasons, drop-off and fix rankings are done in code, not by the AI. Answers are checked for copy-paste crowds and unanimous decisions, and the report flags it."],
] as const;

const GOOD = [
  "Finding the reasons people hesitate: hidden prices, sign-up walls, unclear value, missing proof",
  "Ranking which fixes are likely to matter most",
  "Comparing two versions with the same simulated crowd (re-tests and A/B paywalls)",
  "Spotting problems before you spend money on traffic",
];
const NOT = [
  "Predicting your exact conversion rate or revenue",
  "Replacing real customers, interviews or A/B tests",
  "Knowing things not on the page (your brand's reputation, word of mouth, timing)",
  "Representing every group equally well (research shows gaps for some groups)",
];

export default function SciencePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="t-label">the science</p>
      <h1 className="t-h1 mt-4">What Crawler is built on, and where it stops.</h1>
      <p className="t-lead mt-4 max-w-2xl">
        Crawler uses AI to role-play realistic customers, a method that published research has tested. It is good at finding
        <em> why </em>people won&apos;t buy and <em>what to fix first</em>. It does not predict your exact sales. Here is the
        evidence, our method, and our limits.
      </p>

      <div className="card mt-10 p-6 sm:p-8">
        <p className="t-label">in one sentence</p>
        <p className="mt-3 text-xl font-medium leading-snug sm:text-2xl">
          Crawler doesn&apos;t predict your conversion rate. It finds the likely reasons people won&apos;t buy, and ranks which fixes
          matter most, before you spend money on traffic.
        </p>
      </div>

      {/* 1. research on AI standing in for people */}
      <section className="mt-20" aria-labelledby="research">
        <p className="t-label">01 · the research</p>
        <h2 id="research" className="t-h2 mt-3">Can AI stand in for real people? What studies found.</h2>
        <p className="mt-3 max-w-2xl text-muted">The honest summary: often useful for patterns and reasons, not reliable for exact numbers. We show both sides.</p>
        <div className="mt-8 space-y-4">
          {PAPERS.map((p) => (
            <article key={p.title} className="card p-5 sm:p-6">
              <p className="t-label">{p.venue}</p>
              <h3 className="mt-2 font-medium">
                <a href={p.href} target="_blank" rel="noopener noreferrer" className="inline-block py-2 underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                  {p.title}
                </a>
              </h3>
              <p className="mt-1 text-sm text-faint">{p.cite}</p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="font-medium text-accent">Found: </span>
                  {p.found}
                </p>
                <p className="text-muted">
                  <span className="font-medium text-fg">Limit: </span>
                  {p.limit}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2. how each customer is built */}
      {/* the model, visualised (dark panel, same pieces as the home page) */}
      <section className="band-dark mt-20 rounded-[28px] p-5 sm:p-8" aria-labelledby="model">
        <p className="t-label">The model, visualised</p>
        <h2 id="model" className="t-h2 mt-3">
          A crowd, then five steps,
          <span className="block text-faint">then a count.</span>
        </h2>
        <div className="mt-8 space-y-6">
          <CrowdModel points={homeDemo().crowd} />
          <DecisionPath />
        </div>
      </section>

      <section className="mt-20" aria-labelledby="method">
        <p className="t-label">02 · our method</p>
        <h2 id="method" className="t-h2 mt-3">How each simulated customer is built</h2>
        <ol className="mt-8 space-y-6">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-5">
              <span className="t-number w-10 shrink-0 text-2xl text-accent">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 3. the behaviour facts + our assumptions */}
      <section className="mt-20" aria-labelledby="facts">
        <p className="t-label">03 · behaviour facts we use</p>
        <h2 id="facts" className="t-h2 mt-3">Published facts, and our labelled assumptions</h2>
        <div className="card mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Behaviour findings used by Crawler, with sources</caption>
            <thead>
              <tr>
                {["Finding", "Applies to", "Source"].map((h) => (
                  <th key={h} scope="col" className="t-label px-3 py-3 font-normal sm:px-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACTS.map((f) => (
                <tr key={f.finding} className="border-t border-line">
                  <th scope="row" className="px-3 py-3 font-medium sm:px-5">
                    {f.finding}
                  </th>
                  <td className="px-3 py-3 text-muted sm:px-5">{f.who}</td>
                  <td className="px-3 py-3 text-muted sm:px-5">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line px-3 py-4 sm:px-5">
            <p className="t-label">our assumptions (estimates, tuned as real results come in)</p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {ASSUMPTIONS.map((a) => (
                <li key={a.what}>
                  <span className="font-medium">{a.what}: </span>
                  <span className="text-muted">{a.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-faint">Most figures are US-based; some are vendor data or survey results reported by others. None of these organizations endorse or use Crawler.</p>
      </section>

      {/* 4. good at / not good at */}
      <section className="mt-20 grid gap-4 sm:grid-cols-2" aria-label="What Crawler is and isn't good at">
        <div className="card p-6">
          <p className="t-label">good at</p>
          <ul className="mt-4 space-y-3 text-sm">
            {GOOD.map((g) => (
              <li key={g} className="flex gap-3">
                <span aria-hidden className="text-accent">✓</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <p className="t-label">not good at</p>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            {NOT.map((g) => (
              <li key={g} className="flex gap-3">
                <span aria-hidden>✕</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. safety: what if it's wrong? */}
      <section className="mt-20" aria-labelledby="safe">
        <p className="t-label">04 · what if it&apos;s wrong?</p>
        <h2 id="safe" className="t-h2 mt-3">How we keep a wrong answer cheap</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            ["Direction, not promises", "Reports rank reasons and fixes. They never promise a conversion rate or revenue."],
            ["Cheap, reversible fixes", "Most suggestions take an hour and can be undone: show the price, shorten sign-up, add proof. Being wrong costs little."],
            ["Ranges, not single numbers", "App tests run three separate crowds and show the spread. Small differences are labelled “too close to call”."],
            ["Check with real people", "Ship the top fix, then watch your real numbers. Re-tests reuse the same simulated crowd so you can see who changed their mind."],
          ].map(([t, d]) => (
            <div key={t} className="card p-5">
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. accuracy: measured, published */}
      <section className="mt-20" aria-labelledby="acc">
        <p className="t-label">05 · measuring accuracy</p>
        <h2 id="acc" className="t-h2 mt-3">We measure ourselves against real results</h2>
        <p className="mt-3 max-w-2xl text-muted">
          After a launch, founders can add their real conversion rate under any report. Once there are enough, we publish how
          Crawler&apos;s predictions line up with reality, good or bad. Next, we plan to run Crawler on real, published A/B
          tests and publish how often it picks the real winner.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/accuracy" className="btn btn-secondary">
            See the accuracy page
          </Link>
          <Link href="/example" className="btn btn-ghost">
            See a full example report
          </Link>
        </div>
      </section>

      <p className="t-label mt-20">simulated customers · buying intent, not real purchases · research checked november 2026</p>
    </div>
  );
}
