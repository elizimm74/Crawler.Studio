// The EXAMPLE reports on /example. Everything here is MADE UP (a pretend meal-
// planning site and a pretend meal-planning app, "MealMate"), and the page says so. But the numbers
// aren't typed in: we invent customers and answers, then run the REAL counting
// code (aggregate.ts / app/aggregate.ts) on them, so the example always looks
// exactly like a real report.
import { generatePersonas, makeRandom } from "./personas";
import { aggregate } from "./aggregate";
import type { Run } from "./pipeline";
import type { Audience, Evidence, ObjectionCategory, ProductProfile, Verdict } from "./types";

// The page element each kind of objection pointed at on the pretend MealMate page (made up, like the rest).
const EVIDENCE: Record<string, Evidence> = {
  price: { kind: "missing", text: "no price anywhere before signup", step: "pricing", verified: null },
  "unclear value": { kind: "headline", text: "Dinner, solved.", step: "hero", verified: true },
  trust: { kind: "missing", text: "no reviews or user numbers on the page", step: "hero", verified: null },
  "signup friction": { kind: "form", text: "Phone number (required)", step: "signup", verified: true },
  "happy with current solution": { kind: "copy", text: "Plan smarter, eat better", step: "hero", verified: true },
  "not for me": { kind: "image", text: "a young couple cooking in a big kitchen", step: "hero", verified: null },
  buy: { kind: "button", text: "Start free week, no card", step: "signup", verified: true },
};
import { PRESETS } from "./presets";
import { generateAppPersonas, SAMPLES } from "./app/personas";
import { aggregateApp } from "./app/aggregate";
import { checkPaywall } from "./app/checks";
import type { AppRun } from "./app/pipeline";
import type { AppScreen, AppSettings, AppVerdict, PaywallFacts } from "./app/types";

// ---------- website example: "MealMate" ----------

const QUOTES: Record<string, string[]> = {
  price: ["I can't tell what this costs, so I'm out.", "Why is the price hidden until signup? Feels sketchy.", "Too expensive for something I haven't tried."],
  "unclear value": ["I still don't get what it actually does.", "Cool headline, but what do I get?", "Is this a recipe app or a grocery thing?"],
  trust: ["No reviews anywhere. Who else uses this?", "I'd want to see real people say it works first.", "Not putting my email into something I've never heard of."],
  "signup friction": ["Six fields just to look around? Nope.", "Make me sign up before I see anything? Bye.", "Why do you need my phone number?"],
  "happy with current solution": ["I already use a notes app for this.", "My free app does enough.", "Not switching for a small upgrade."],
  "not for me": ["This is for people with way more free time.", "I don't cook, so no.", "Feels built for somebody older."],
};
const YES_QUOTES = ["Honestly this would save me a ton of time, I'm in.", "Free trial, no card? Sure, why not.", "Okay the weekly plan thing is actually useful."];

function pick<T>(rand: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rand() * xs.length)];
}

export function exampleWebsiteRun(): Run & { filesPrefix: string } {
  const audience: Audience = PRESETS["Busy moms"];
  const personas = generatePersonas(audience, 100, 20260);
  const rand = makeRandom(7);
  const verdicts: Verdict[] = personas.map((p) => {
    // A pretend "who would buy" rule: patient, tech-comfortable, not-tight-budget people convert more.
    const score =
      (p.budget === "comfortable" ? 0.18 : p.budget === "okay" ? 0.08 : -0.06) +
      (p.techComfort === "high" ? 0.1 : p.techComfort === "low" ? -0.08 : 0) +
      (p.patience === "a few minutes" ? 0.1 : p.patience === "about 10 seconds" ? -0.1 : 0) +
      (p.mindset === "skeptical" ? -0.1 : p.mindset === "impulse buyer" ? 0.12 : 0);
    const r = rand();
    const verdict = r < 0.2 + score ? "buy" : r < 0.46 + score ? "maybe" : "no";
    if (verdict === "buy") {
      return { personaId: p.id, verdict, lostAt: "none", objectionCategory: "none", objection: "Small worry: what happens after the free week?", wouldChangeMind: "Show the price after the trial up front.", quote: pick(rand, YES_QUOTES), reasonsNot: ["Not sure what it costs after the free week"], reasonsFor: ["Saves planning time every Sunday", "No card needed to start"], priceCheck: "Free week, no card: costs me an email, fine.", evidence: EVIDENCE.buy };
    }
    const cat: ObjectionCategory = (p.budget === "tight" ? pick(rand, ["price", "price", "unclear value"] as const) : p.mindset === "skeptical" ? pick(rand, ["trust", "trust", "signup friction"] as const) : pick(rand, ["price", "unclear value", "signup friction", "trust", "happy with current solution", "not for me"] as const)) as ObjectionCategory;
    const lostAt = cat === "price" ? "pricing" : cat === "signup friction" ? "signup" : cat === "unclear value" || cat === "not for me" ? "hero" : pick(rand, ["hero", "pricing", "signup"] as const);
    const change: Record<string, string> = {
      price: "Put the price on the homepage.",
      "unclear value": "Say what it does in the first line.",
      trust: "Show reviews and real user counts.",
      "signup friction": "Ask for just an email.",
      "happy with current solution": "Show what it does that my notes app can't.",
      "not for me": "Show someone like me using it.",
    };
    return { personaId: p.id, verdict, lostAt, objectionCategory: cat, objection: QUOTES[cat][0], wouldChangeMind: change[cat], quote: pick(rand, QUOTES[cat]), reasonsNot: [QUOTES[cat][0]], reasonsFor: verdict === "maybe" ? ["The weekly plan idea is useful"] : [], priceCheck: cat === "price" ? `No price shown vs about $${p.spend?.monthlySpare ?? 30}/month spare: can't judge it.` : "Free to start, but it wants my details.", evidence: EVIDENCE[cat] };
  });

  const stats = aggregate(audience, personas, verdicts, false, { goal: "sign up", seed: 20260 });
  const profile: ProductProfile = {
    goal: "sign up",
    whatItIs: "MealMate plans a week of dinners and a grocery list for busy parents.",
    whoItsFor: "Busy parents who want less dinner stress.",
    mainPromise: "A week of dinners planned in 60 seconds.",
    prices: [],
    proof: [],
    friction: ["price hidden until signup", "no reviews", "6 signup fields"],
    tryTask: "",
  };
  const claimed = new Set<string>();
  const fix = (title: string, problem: string, change: string, step: "hero" | "pricing" | "signup", addresses: ObjectionCategory[], cites: string) => {
    const groups = stats.objections.filter((o) => addresses.includes(o.category) && !claimed.has(o.category));
    groups.forEach((g) => claimed.add(g.category));
    const citedBy = stats.objections.filter((o) => addresses.includes(o.category)).reduce((n, o) => n + (o.evidence?.[0]?.count ?? 0), 0) || undefined;
    return { title, problem, change, step, addresses, cites, citedBy, couldFlip: groups.reduce((s, g) => s + g.count, 0), likelyFlip: groups.reduce((s, g) => s + g.maybeCount, 0) };
  };
  const fixes = [
    fix("Show the price on the homepage", "People can't see what it costs, so they assume the worst.", "Add a one-line price under the hero button: \"Free for a week, then $6/month.\"", "hero", ["price"], "missing: no price anywhere before signup"),
    fix("Ask for an email only", "Six fields before seeing anything loses people at the last step.", "Cut signup to email. Ask the rest after they've seen their first plan.", "signup", ["signup friction"], "Phone number (required)"),
    fix("Add proof next to the button", "No reviews or user counts, so skeptics bounce.", "Add three real parent quotes and a user count under the headline.", "hero", ["trust"], "missing: no reviews or user numbers on the page"),
    fix("Say what it does in one line", "The headline is clever but vague.", "Rewrite the first line: \"Dinner planned for your whole week, with the grocery list.\"", "hero", ["unclear value", "not for me"], "Dinner, solved."),
  ].sort((a, b) => b.likelyFlip - a.likelyFlip || b.couldFlip - a.couldFlip);

  return {
    id: "example",
    crawlId: "example",
    url: "https://mealmate.app",
    createdAt: new Date().toISOString(),
    profile,
    audience,
    seed: 20260,
    engine: 2,
    status: "done",
    stage: "Done",
    progress: { done: 100, total: 100 },
    personas,
    verdicts,
    stats,
    advice: {
      summary: "Most people leave because they can't see the price or any proof. Show both above the fold and cut signup to an email.",
      fixes,
      headlineOptions: ["Dinner planned for your whole week", "A week of dinners in 60 seconds", "Stop asking \"what's for dinner?\""],
      subheadline: "MealMate plans your meals and your grocery list. Free for a week.",
      pricingCopy: "Free for 7 days, then $6/month. Cancel anytime in two taps.",
    },
    costs: [],
    filesPrefix: "example",
  };
}

// ---------- app example: the "MealMate" meal-planning app ----------
// Its 7 screens are ORIGINAL drawings in public/demo/mealmate-app/ (made by scripts/render-app-screens.cjs mealmate).

export function exampleAppRun(): AppRun {
  const mk = (n: number, type: AppScreen["type"], title: string, summary: string, extra: Partial<AppScreen> = {}): AppScreen => ({
    file: `/demo/mealmate-app/${n}.jpg`, type, title, summary, asks: [], cta: "Continue", canSkip: false, ...extra,
  });
  const screens: AppScreen[] = [
    mk(1, "welcome", "A week of meals, planned in 2 minutes", "Intro with a plate illustration and the promise.", { cta: "Get started" }),
    mk(2, "question", "What's your main goal?", "Pick one of four goals.", { asks: ["goal"] }),
    mk(3, "question", "How many people do you cook for?", "Pick a household size.", { asks: ["household size"] }),
    mk(4, "permission", "Get a nudge before dinner?", "Asks for notification permission.", { asks: ["notifications"], cta: "Allow notifications", canSkip: true }),
    mk(5, "value", "Your week is ready", "Daily targets and the first dinner of the plan.", { cta: "See my plan" }),
    mk(6, "signup", "Save your plan", "Apple, Google or email to see the week.", { asks: ["account"] }),
    mk(7, "paywall", "Try MealMate Plus free for 7 days", "Trial timeline, monthly vs yearly plans.", { cta: "Start my free week" }),
  ];
  const paywall: PaywallFacts = {
    plans: [
      { name: "Yearly", price: "$39.99", period: "year", trialDays: 7, highlighted: true },
      { name: "Monthly", price: "$7.99", period: "month", trialDays: 0, highlighted: false },
    ],
    closeButton: "small or faint",
    restorePurchases: false,
    termsLink: false,
    privacyLink: false,
    priceAfterTrialShown: true,
    autoRenewExplained: false,
    socialProof: [],
    headline: "Try MealMate Plus free for 7 days",
    ctaText: "Start my free week",
  };
  const settings: AppSettings = { screens, screensB: [], paywall, paywallB: null, iphonePct: 70, sources: ["TikTok / Instagram ad", "App Store search"] };
  const audience: Audience = PRESETS["Busy moms"] ?? PRESETS["Gen Z students"];
  const personas = generateAppPersonas(audience, settings, 100, 4242);
  const rand = makeRandom(99);
  const verdicts: AppVerdict[] = personas.map((p) => {
    const patient = p.patience.startsWith("high") ? 0.1 : p.patience.startsWith("low") ? -0.12 : 0;
    const r = rand();
    // where they quit: mostly the age question, notifications, sign-up wall, then the paywall
    let stoppedAt = 0;
    const gates: [number, number][] = [[1, 0.04], [2, 0.05], [3, 0.07], [4, 0.1 - patient / 2], [5, 0.12 - patient / 2], [6, 0.18 - patient / 2]];
    let acc = 0;
    for (const [screen, share] of gates) {
      acc += Math.max(0.01, share);
      if (r < acc) { stoppedAt = screen; break; }
    }
    const base: AppVerdict = { personaId: p.id, sample: p.sample, stoppedAt, decision: "never reached", decisionB: null, objectionCategory: "signup friction", objection: "Too many steps before I saw a recipe.", wouldChangeMind: "Let me see my week before signing up.", quote: "I just want to see what's for dinner." };
    if (stoppedAt) {
      const early: Record<number, [ObjectionCategory, string, string]> = {
        1: ["unclear value", "Another meal planner? I already save recipes on TikTok.", "Show a real week of dinners on the first screen."],
        2: ["too complex", "These goals all sound the same.", "Let me pick more than one, or skip."],
        3: ["too complex", "More questions before I see anything.", "Ask this after showing the plan."],
        4: ["trust", "Notifications before I've even cooked one meal? No.", "Ask after I've tried a recipe."],
        5: ["unclear value", "Looks nice, but I can't open a single recipe.", "Let me open one recipe before signing up."],
        6: ["signup friction", "An account just to see my own plan? Annoying.", "Show the week first, ask me to save it later."],
      };
      const [cat, objection, change] = early[stoppedAt];
      return { ...base, objectionCategory: cat, objection, wouldChangeMind: change, quote: objection };
    }
    const buy = 0.1 + patient + (p.budget === "comfortable" ? 0.08 : p.budget === "tight" ? -0.06 : 0) + (p.source === "friend's link" ? 0.06 : 0);
    const r2 = rand();
    if (r2 < buy * 0.75) return { ...base, decision: "start trial", objectionCategory: "none", objection: "Will it charge me if I forget?", wouldChangeMind: "Keep the reminder before the trial ends.", quote: "Free week, and they remind me before it ends? Fine." };
    if (r2 < buy * 0.85) return { ...base, decision: "subscribe", objectionCategory: "none", objection: "Hope it actually saves me money.", wouldChangeMind: "Show what a week of groceries costs.", quote: "$7.99 is less than one takeout night." };
    return { ...base, decision: "close", objectionCategory: "price", objection: "It never says it renews or how to cancel.", wouldChangeMind: "Say it renews and how to cancel.", quote: "$40 a year to plan dinners? I'll stick to my notes app." };
  });

  const stats = aggregateApp(screens, personas, verdicts, SAMPLES);
  const checks = checkPaywall(paywall);
  const claimed = new Set<string>();
  const fix = (title: string, problem: string, change: string, screen: number, addresses: ObjectionCategory[]) => {
    const groups = stats.objections.filter((o) => addresses.includes(o.category) && !claimed.has(o.category));
    groups.forEach((g) => claimed.add(g.category));
    return { title, problem, change, screen, addresses, couldWin: groups.reduce((s, g) => s + g.count, 0), atPaywall: groups.reduce((s, g) => s + g.atPaywall, 0) };
  };
  const fixes = [
    fix("Say it renews and how to cancel", "The paywall never says the yearly plan renews automatically or how to cancel.", "Under the button: \"7 days free, then $39.99/year. Renews automatically. Cancel anytime in Settings.\" Make the faint ✕ easy to see.", 7, ["price"]),
    fix("Ask for notifications later", "The notification ask comes before anyone has cooked a meal.", "Move it to after the first recipe is opened.", 4, ["trust"]),
    fix("Show the week before the account wall", "People must sign up just to see the plan they built.", "Open the week first; ask them to save it when they leave.", 6, ["signup friction"]),
    fix("Cut a question", "Two questions in a row before any value.", "Keep the goal question; guess household size and let them change it later.", 3, ["too complex", "unclear value"]),
  ].sort((a, b) => b.atPaywall - a.atPaywall || b.couldWin - a.couldWin);

  return {
    kind: "app",
    id: "example",
    crawlId: "example",
    url: "app://example",
    createdAt: new Date().toISOString(),
    profile: { goal: "start a free trial", whatItIs: "MealMate plans a week of dinners with recipes, macros and one grocery list.", whoItsFor: "Busy people who cook at home.", mainPromise: "A week of meals, planned in 2 minutes.", prices: ["Yearly: $39.99 (7-day free trial)", "Monthly: $7.99"], proof: [], friction: ["account wall before the plan", "notification ask before any value", "faint close button on the paywall"], tryTask: "" },
    audience,
    settings,
    screensPrefix: "example",
    seed: 4242,
    status: "done",
    stage: "Done",
    progress: { done: 300, total: 300 },
    checks,
    checksB: null,
    personas,
    verdicts,
    stats,
    advice: {
      summary: "Most people quit before the paywall. Show the finished week before asking for notifications or an account, and say clearly that the yearly plan renews.",
      fixes,
      paywallHeadlines: ["Your week of dinners, sorted", "Plan less. Eat better.", "Keep your week planned"],
      ctaOptions: ["Try 7 days free", "Start my free week", "Plan my week"],
      trialLine: "7 days free, then $39.99/year. Renews automatically. Cancel anytime in Settings.",
      onboardingTip: "Show the finished week before asking for notifications or an account.",
    },
    costs: [],
  };
}
