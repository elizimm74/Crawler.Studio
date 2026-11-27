// Fixes contradictions in a customer's answer so the counting is clean, e.g.
// you can't subscribe on a paywall you never reached. Pure code (no AI), so
// the bench tests it directly.
import type { ObjectionCategory } from "../types";
import type { AppPersona, AppSettings, AppVerdict, PaywallDecision } from "./types";

// One customer's raw answer, as the AI returns it.
export type Raw = {
  persona_id: string;
  stopped_at_screen: number;
  paywall_a: PaywallDecision;
  paywall_b: PaywallDecision;
  objection_category: ObjectionCategory;
  objection: string;
  would_change_mind: string;
  quote: string;
  first_glance?: string;
  thought?: string;
  reasons_not?: string[];
  reasons_for?: string[];
  price_check?: string;
  evidence_screen?: number;
  evidence_text?: string;
};

// The words we know are on each screen (read from the screenshots + the paywall facts the founder checked).
// Evidence that matches them is "verified"; anything else on a screenshot can't be checked by code (null).
function screenText(settings: AppSettings, screen: number): string {
  const s = settings.screens[screen - 1];
  if (!s) return "";
  const pay = s.type === "paywall" && settings.paywall ? [settings.paywall.headline, ...settings.paywall.plans.map((x) => `${x.name} ${x.price} ${x.period}`)] : [];
  return [s.title, s.summary, s.cta, ...s.asks, ...pay].join(" ").toLowerCase();
}

// Fix contradictions so the counting is clean. Exported for the bench.
export function normalizeApp(r: Raw, p: AppPersona, settings: AppSettings, hasB: boolean): AppVerdict {
  const n = settings.screens.length;
  let stoppedAt = Math.min(n, Math.max(0, Math.round(r.stopped_at_screen)));
  const firstPaywall = settings.screens.findIndex((s) => s.type === "paywall") + 1; // 0 = no paywall
  const trialOffered = (f: AppSettings["paywall"]) => Boolean(f?.plans.some((x) => x.trialDays > 0));
  const converts = (d: PaywallDecision) => d === "start trial" || d === "subscribe";

  // Fix one decision against the facts of that paywall.
  const fix = (d: PaywallDecision, facts: AppSettings["paywall"]): PaywallDecision => {
    if (d === "never reached") return "close"; // they reached it (checked by the caller)
    if (d === "start trial" && !trialOffered(facts)) return "subscribe";
    if (d === "subscribe" && facts && facts.plans.length && facts.plans.every((x) => x.trialDays > 0)) return "start trial";
    return d;
  };

  let decision: PaywallDecision;
  let decisionB: PaywallDecision | null = hasB ? "never reached" : null;
  const quitBeforePaywall = firstPaywall === 0 || (stoppedAt > 0 && stoppedAt < firstPaywall);
  if (quitBeforePaywall) {
    decision = "never reached";
  } else {
    decision = fix(r.paywall_a, settings.paywall);
    if (hasB) decisionB = fix(r.paywall_b, settings.paywallB);
    // Paid at the paywall but "quit" exactly there: they didn't quit.
    if ((converts(decision) || (decisionB && converts(decisionB))) && settings.screens[stoppedAt - 1]?.type === "paywall") stoppedAt = 0;
  }

  const converted = converts(decision);
  return {
    personaId: p.id,
    sample: p.sample,
    stoppedAt,
    decision,
    decisionB,
    objectionCategory: converted ? "none" : r.objection_category === "none" ? "unclear value" : r.objection_category,
    objection: r.objection,
    wouldChangeMind: r.would_change_mind,
    quote: r.quote,
    ...(r.first_glance ? { firstGlance: r.first_glance } : {}),
    ...(r.thought ? { thought: r.thought } : {}),
    ...(r.reasons_not ? { reasonsNot: r.reasons_not.slice(0, 3) } : {}),
    ...(r.reasons_for ? { reasonsFor: r.reasons_for.slice(0, 3) } : {}),
    ...(r.price_check ? { priceCheck: r.price_check } : {}),
    ...(r.evidence_text
      ? (() => {
          const screen = Math.min(n, Math.max(1, Math.round(r.evidence_screen ?? 1)));
          const words = r.evidence_text.toLowerCase().replace(/^missing:\s*/, "").trim();
          const known = screenText(settings, screen);
          return { evidence: { screen, text: r.evidence_text.slice(0, 200), verified: /^missing:/i.test(r.evidence_text) ? null : known.includes(words) ? true : null } };
        })()
      : {}),
  };
}
