// Marketing insights: the "About you" questions asked during onboarding, the first-visit tracking
// (which link or post brought someone), and the pure logic that turns the totals into advice.
// Browser-safe (no server imports), so the onboarding screen and the admin page share the labels.
// The allowed values MUST match migration 0018 (signup_answers checks + save_signup_answers).

export const AGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"] as const;
export const HEARD: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X / Twitter",
  youtube: "YouTube",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  producthunt: "Product Hunt",
  google: "Google search",
  ai: "ChatGPT / AI assistant",
  friend: "A friend",
  other: "Somewhere else",
};
export const ROLES: Record<string, string> = {
  student: "Student founder",
  solo: "Solo founder",
  team: "Startup team",
  agency: "Agency / freelancer",
  marketer: "Marketer",
  creator: "Creator",
  smallbiz: "Small business owner",
  other: "Something else",
};
export const STAGES: Record<string, string> = {
  idea: "Just an idea",
  building: "Building it",
  soon: "Launching soon",
  live: "Already live",
  growing: "Growing (has revenue)",
};
export const GOALS: Record<string, string> = {
  signups: "More sign-ups",
  sales: "More sales",
  paywall: "Better app paywall",
  ads: "Better ads / videos",
  pricing: "Get pricing right",
  curious: "Just curious",
};
export const DIM_LABELS: Record<string, { title: string; labels?: Record<string, string> }> = {
  heard_from: { title: "Where they heard about Crawler", labels: HEARD },
  utm_source: { title: "Link tag (utm_source)" },
  referrer: { title: "Site they came from" },
  age: { title: "Age" },
  role: { title: "Who they are", labels: ROLES },
  stage: { title: "Stage", labels: STAGES },
  goal: { title: "What they want", labels: GOALS },
  first_kind: { title: "First thing they tested" },
};

export type About = { age?: string; heard?: string; heardOther?: string; role?: string; stage?: string; goal?: string };

// ---------- first visit: where did this person come from? ----------
// Saved once per browser, on the first page they ever see: link tags (?utm_source=tiktok...) and the
// site that sent them (just the domain, e.g. www.tiktok.com). Sent with their answers at sign-up.
export type FirstTouch = { utmSource?: string; utmMedium?: string; utmCampaign?: string; ref?: string; path?: string };
const clip = (s: string | null | undefined, n: number) => (s ? s.trim().slice(0, n) : undefined);

export function readFirstTouch(href: string, referrer: string): FirstTouch {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return {};
  }
  let ref: string | undefined;
  try {
    const r = referrer ? new URL(referrer) : null;
    if (r && r.hostname && r.hostname !== u.hostname) ref = r.hostname.toLowerCase(); // only other sites, domain only
  } catch {
    ref = undefined;
  }
  const out: FirstTouch = {
    utmSource: clip(u.searchParams.get("utm_source") ?? u.searchParams.get("ref"), 60),
    utmMedium: clip(u.searchParams.get("utm_medium"), 60),
    utmCampaign: clip(u.searchParams.get("utm_campaign"), 60),
    ref: clip(ref, 100),
    path: clip(u.pathname, 100),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as FirstTouch;
}

const KEY = "crawler-first-touch";
export function rememberFirstTouch() {
  try {
    if (localStorage.getItem(KEY)) return; // only the FIRST visit counts
    localStorage.setItem(KEY, JSON.stringify(readFirstTouch(location.href, document.referrer)));
  } catch {
    // storage blocked: no first-touch info, that's fine
  }
}
export function firstTouch(): FirstTouch {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as FirstTouch;
  } catch {
    return {};
  }
}

// ---------- turning totals into advice ----------
export type Row = { value: string; n: number; tested: number; paid: number };
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// The channel that brings the most PAYING people per sign-up, but only once it has enough sign-ups
// to mean something (default 10). Small numbers lie, so below that we say "too early to tell".
export function bestBy(rows: Row[] | undefined, key: "paid" | "tested", minN = 10): Row | null {
  const ok = (rows ?? []).filter((r) => r.value !== "not answered" && r.n >= minN);
  if (!ok.length) return null;
  return [...ok].sort((a, b) => b[key] / b.n - a[key] / a.n || b.n - a.n)[0];
}

// Plain-English suggestions from the numbers. Never more confident than the sample allows.
export function advice(groups: Record<string, Row[]>, signups: number, minN = 10): string[] {
  const out: string[] = [];
  if (signups < minN) {
    out.push(`Only ${signups} sign-up${signups === 1 ? "" : "s"} so far: too early to compare channels. Keep posting and check back at ${minN}+ per channel.`);
    return out;
  }
  const label = (dim: string, v: string) => DIM_LABELS[dim]?.labels?.[v] ?? v;
  const top = (groups.heard_from ?? []).filter((r) => r.value !== "not answered")[0];
  if (top) out.push(`Most sign-ups come from ${label("heard_from", top.value)} (${top.n}). Keep feeding that channel.`);
  const payer = bestBy(groups.heard_from, "paid", minN);
  if (payer && payer.paid > 0) out.push(`${label("heard_from", payer.value)} brings the most paying customers per sign-up (${pct(payer.paid, payer.n)}%). Put more effort there, even if it's smaller.`);
  const tester = bestBy(groups.heard_from, "tested", minN);
  if (tester) out.push(`${label("heard_from", tester.value)} sign-ups are the most likely to actually run a test (${pct(tester.tested, tester.n)}%).`);
  const age = (groups.age ?? []).filter((r) => r.value !== "not answered")[0];
  if (age) out.push(`Your biggest age group is ${age.value}. Write posts, examples and presets for them.`);
  const role = (groups.role ?? []).filter((r) => r.value !== "not answered")[0];
  if (role) out.push(`Most people describe themselves as "${label("role", role.value)}". Speak to them on the home page.`);
  const weak = (groups.heard_from ?? []).filter((r) => r.value !== "not answered" && r.n >= minN && r.tested === 0);
  for (const w of weak.slice(0, 2)) out.push(`${label("heard_from", w.value)} brings sign-ups who never run a test. Check what those posts promise vs what Crawler does.`);
  return out;
}
