// The home page's content sections (server components, no client JS):
// How it works · Meet your customers · What Crawler analyzes · Use cases · Final CTA.
// Everything here describes what the engine REALLY does today; personas are labelled synthetic.
import Link from "next/link";
import HeroForm from "./HeroForm";
import { STARTER_CUSTOMERS } from "@/lib/plans";

export function SectionHead({ label, title, sub, id }: { label: string; title: string; sub?: string; id?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="t-label">{label}</p>
      <h2 id={id} className="t-h1 mt-3">
        {title}
      </h2>
      {sub && <p className="t-lead mt-4">{sub}</p>}
    </div>
  );
}

// ---------- How it works ----------
export function HowItWorks() {
  const steps = [
    {
      title: "Enter your website",
      text: "Paste your link. Crawler opens it in a real browser, on a laptop and a phone, and finds your pricing and signup (or a product page and cart).",
      ui: (
        <div className="rounded-lg border border-line p-3 font-mono text-xs text-muted">
          https://<span className="text-fg">yourwebsite.com</span>
          <span className="ml-1 inline-block h-3 w-px animate-pulse bg-fg align-middle" />
        </div>
      ),
    },
    {
      title: "Simulate potential customers",
      text: "A crowd of AI customers is built from your audience: different ages, budgets, mindsets, devices and reasons for visiting. Each one decides for themselves.",
      ui: (
        <div className="grid grid-cols-10 gap-1" aria-hidden>
          {Array.from({ length: 30 }, (_, i) => (
            <span key={i} className={`aspect-square rounded-full ${i % 7 === 0 || i % 5 === 0 ? "bg-accent" : i % 3 === 0 ? "bg-white/40" : "bg-white/10"}`} />
          ))}
        </div>
      ),
    },
    {
      title: "Discover what to improve",
      text: "See who would buy, who left and why, where they dropped off, and a ranked list of fixes with how many customers each could win back.",
      ui: (
        <ol className="space-y-1.5 text-xs">
          {["Show the price on the homepage", "Ask for an email only", "Add proof by the button"].map((t, i) => (
            <li key={t} className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5">
              <span className="font-mono text-accent">0{i + 1}</span>
              <span className="truncate">{t}</span>
            </li>
          ))}
        </ol>
      ),
    },
  ];
  return (
    <section aria-labelledby="how-title" id="how" className="scroll-mt-24">
      <SectionHead label="How it works" id="how-title" title="Three steps. A few minutes." />
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="card flex flex-col p-6">
            <span className="font-mono text-sm text-accent">0{i + 1}</span>
            <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
            <p className="mt-2 text-sm text-muted">{s.text}</p>
            <div className="mt-6 pt-2">{s.ui}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- Meet your customers ----------
// Each card is built from the engine's REAL building blocks (mindset, budget, where they came from,
// what convinces them, their dealbreaker: src/lib/personas.ts, behavior.ts, mind.ts).
const PERSONAS = [
  { name: "The price-conscious shopper", age: "18–34", prefs: "Compares prices, hunts for free plans", budget: "Tight", motive: "A clear price that beats free alternatives", objection: "Hidden price or a card upfront", style: "Checks the price first, leaves fast if it's unclear" },
  { name: "The quality-focused buyer", age: "25–54", prefs: "Reads details, photos and materials", budget: "Comfortable", motive: "Proof that it's well made and works", objection: "Vague descriptions, no reviews", style: "Slow and thorough" },
  { name: "The impulse purchaser", age: "16–30", prefs: "Fast, visual, mobile", budget: "Okay", motive: "An exciting first screen and an easy yes", objection: "A slow or long sign-up", style: "Decides in seconds" },
  { name: "The skeptical customer", age: "25–64", prefs: "Wants names, faces and ratings", budget: "Okay", motive: "Proof from real people like them", objection: "Claims that sound too good to be true", style: "Looks for reasons to say no" },
  { name: "The first-time visitor", age: "Any", prefs: "Came from an ad, no plan to buy", budget: "Any", motive: "Understanding what this is in seconds", objection: "Can't tell what it does", style: "Leaves within ~10 seconds if confused" },
  { name: "The comparison shopper", age: "25–44", prefs: "Came from a search, has tabs open", budget: "Okay", motive: "A clear reason this beats the others", objection: "No difference from what they use now", style: "Weighs options, rarely buys on the first visit" },
  { name: "The busy buyer", age: "30–54", prefs: "Wants the result, not a tour", budget: "Comfortable", motive: "A one-line promise and few steps", objection: "More than a minute before any value", style: "Skims, decides on the first screen" },
  { name: "The early adopter", age: "16–35", prefs: "Loves trying new things", budget: "Okay", motive: "Seeing it actually work today", objection: "A waitlist or nothing to try", style: "Says yes quickly if they can try it" },
];
export function MeetCustomers() {
  return (
    <section aria-labelledby="meet-title">
      <SectionHead
        label="Meet your customers"
        id="meet-title"
        title="Different people. Different reasons."
        sub="Every simulation mixes customer types like these, built from your audience settings, so you don't get 100 copies of one opinion."
      />
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PERSONAS.map((p) => (
          <li key={p.name} className="card p-5">
            <h3 className="font-medium">{p.name}</h3>
            <p className="mt-0.5 text-xs text-faint">Age {p.age} · Budget: {p.budget}</p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row k="Shops like" v={p.prefs} />
              <Row k="Buys for" v={p.motive} />
              <Row k="Objects to" v={p.objection} />
              <Row k="Decides" v={p.style} />
            </dl>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-faint">
        These are AI-generated synthetic personas, not real or surveyed people. Their traits come from public research and labelled assumptions (see{" "}
        <Link href="/science" className="underline underline-offset-2">
          the science
        </Link>
        ).
      </p>
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-faint">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

// ---------- What Crawler analyzes ----------
const AREAS = [
  ["First impressions", "What they notice in the first seconds, and whether they get it."],
  ["Website design", "Does it look professional and trustworthy on laptop and phone?"],
  ["Product positioning", "Is it clear who it's for and why it's different?"],
  ["Product descriptions", "Do they understand exactly what they'd get?"],
  ["Pricing", "Can they find it, understand it, and does it feel fair?"],
  ["Trust signals", "Reviews, proof, policies, contact details: present or missing."],
  ["Navigation", "Can they find pricing, signup or the product page?"],
  ["Signup & cart friction", "Form fields, card required, account walls. (We never pay or check out.)"],
  ["Value proposition", "Is the main promise believable and worth their time?"],
  ["Purchase objections", "Each customer's main reason not to buy, grouped and counted."],
  ["Mobile experience", "A phone screenshot is reviewed alongside the desktop one."],
  ["Conversion opportunities", "Ranked fixes, with how many customers each could win back."],
];
export function Analyzes() {
  return (
    <section aria-labelledby="areas-title">
      <SectionHead label="What Crawler analyzes" id="areas-title" title="Everything a new visitor judges." />
      <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map(([t, d], i) => (
          <li key={t} className="bg-bg p-5">
            <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-1 font-medium">{t}</h3>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Use cases ----------
const CASES = [
  ["Shopify stores", "See if shoppers trust your product page and what stops them adding to cart (store tests are in beta)."],
  ["Clothing brands", "Find out if photos, sizing, materials, shipping and returns answer buyers' questions."],
  ["Ecommerce businesses", "Spot surprise costs, missing reviews and weak product descriptions before you spend on ads."],
  ["SaaS startups", "Check your headline, pricing page and signup with the kind of buyers you want."],
  ["Mobile applications", "Upload onboarding and paywall screenshots and see where people quit."],
  ["Landing pages", "Test a waitlist or launch page before you send traffic to it."],
  ["Digital products", "Courses, templates, ebooks: is the value clear enough to pay for?"],
  ["Marketing agencies", "Bring a simulation to a client call: clear reasons and fixes, not opinions."],
  ["Startup founders", "Re-test after each change, with the same simulated customers, and see who changed their mind."],
];
export function UseCases() {
  return (
    <section aria-labelledby="cases-title">
      <SectionHead label="Use cases" id="cases-title" title="Built for people about to launch." />
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CASES.map(([t, d]) => (
          <li key={t} className="card p-5">
            <h3 className="font-medium">{t}</h3>
            <p className="mt-1.5 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Final CTA ----------
export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="card relative overflow-hidden px-6 py-14 text-center sm:px-12">
      <div className="final-glow" aria-hidden />
      <h2 id="final-title" className="t-h1 relative">
        Stop guessing. Start validating.
      </h2>
      <p className="t-lead relative mx-auto mt-4 max-w-lg">Paste your website and see what your simulated customers think in a few minutes.</p>
      <div className="relative mx-auto mt-8 max-w-xl">
        <HeroForm cta="Run Your First Simulation" id="final-url" />
      </div>
      <p className="relative mt-4 text-sm text-muted">
        No credit card required to get started. Free: 1 test with {STARTER_CUSTOMERS} simulated customers.
      </p>
    </section>
  );
}
