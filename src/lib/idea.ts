// IDEA tests: nothing is built yet, the founder describes the idea in words.
// We turn the description into a "crawl" with no screenshots (the pitch is the hero page, the
// price is the pricing page, how people would get it is the signup page), so the rest of the
// engine (simulated customers, counting, report) works exactly like a website test.
// The simulated customers are told it's an IDEA (lens "idea" in productTypes.ts), so they judge
// the idea, not missing design.
//
// Pure functions (no AI, no database): shared by the API route and the worker, and benched.
import type { CrawledPage, Crawl } from "./types";

export type IdeaInput = {
  name: string; // "MealMate"
  pitch: string; // what it is and what problem it solves
  who: string; // who it's for (optional)
  price: string; // "$9/month", "free with a $5 pro plan" (optional)
  how: string; // how people would get it: "download from the App Store", "sign up on a website" (optional)
  alternatives: string; // what people do today instead (optional)
};

// Lengths are also enforced by the database (start_idea_analyze), these are the same limits.
export const IDEA_LIMITS = { name: 80, pitch: 1500, who: 300, price: 200, how: 300, alternatives: 300 } as const;
export const IDEA_MIN_PITCH = 30; // a few words aren't enough to judge

const clean = (x: unknown, max: number) =>
  typeof x === "string"
    ? x
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "") // control characters
        .replace(/\s+\n/g, "\n")
        .trim()
        .slice(0, max)
    : "";

// Cleans what the browser sent. Returns null (with a reason) when it can't be tested.
export function cleanIdea(raw: unknown): { idea: IdeaInput; problem: null } | { idea: null; problem: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const idea: IdeaInput = {
    name: clean(r.name, IDEA_LIMITS.name),
    pitch: clean(r.pitch, IDEA_LIMITS.pitch),
    who: clean(r.who, IDEA_LIMITS.who),
    price: clean(r.price, IDEA_LIMITS.price),
    how: clean(r.how, IDEA_LIMITS.how),
    alternatives: clean(r.alternatives, IDEA_LIMITS.alternatives),
  };
  if (idea.name.length < 2) return { idea: null, problem: "Give your idea a name (a working name is fine)." };
  if (idea.pitch.length < IDEA_MIN_PITCH) return { idea: null, problem: "Describe the idea in at least a sentence or two: what it is and what problem it solves." };
  return { idea, problem: null };
}

// "MealMate!" -> "mealmate". Used in the test's address (idea://mealmate) so re-tests of the
// same idea line up on the dashboard.
// MUST match the database's slug in start_idea_analyze (migration 0029) exactly: lower case,
// anything not a-z/0-9 becomes "-", trim the dashes, then cut to 40.
export function ideaSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "idea"
  );
}

const NO_SIGNALS: CrawledPage["signals"] = { formFields: 0, asksForCard: false, socialLogin: false, pricesSeen: [], loginOnly: false };
const NOTE = "This is a written description of a product IDEA from its founder. There is no website or design yet.";

// The idea as the three "pages" every simulated customer reads.
export function ideaCrawl(id: string, idea: IdeaInput, filesPrefix = ""): Crawl {
  const url = `idea://${ideaSlug(idea.name)}`;
  const pages: CrawledPage[] = [
    {
      step: "hero",
      url,
      title: idea.name,
      note: NOTE,
      text: [
        `Name: ${idea.name}`,
        `The idea: ${idea.pitch}`,
        idea.who ? `Who it's for: ${idea.who}` : "",
        idea.alternatives ? `What people use today instead: ${idea.alternatives}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      screenshotFiles: [],
      signals: NO_SIGNALS,
    },
  ];
  if (idea.price) {
    pages.push({
      step: "pricing",
      url,
      title: `${idea.name}: price`,
      note: "The price the founder plans to charge.",
      text: `Planned price: ${idea.price}`,
      screenshotFiles: [],
      signals: { ...NO_SIGNALS, pricesSeen: [idea.price.slice(0, 60)] },
    });
  }
  if (idea.how) {
    pages.push({
      step: "signup",
      url,
      title: `${idea.name}: how to get it`,
      note: "How people would get it, as planned by the founder.",
      text: `How you would get it: ${idea.how}`,
      screenshotFiles: [],
      signals: NO_SIGNALS,
    });
  }
  return { id, url, createdAt: new Date().toISOString(), pages, costs: [], filesPrefix, mode: "idea" };
}

export const isIdeaUrl = (u: string) => u.startsWith("idea://");

// "idea://meal-mate" -> "Idea: meal mate" (dashboard, My tests, report labels).
export const ideaLabel = (u: string) => `Idea: ${u.replace(/^idea:\/\//, "").replace(/-/g, " ") || "untitled"}`;

// How a test's address is shown: "mealmate.app" for websites, "Idea: mealmate" for ideas.
export const displayUrl = (u: string) => (isIdeaUrl(u) ? ideaLabel(u) : u.replace(/^https?:\/\//, "").replace(/\/$/, ""));
