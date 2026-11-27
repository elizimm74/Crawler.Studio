// Server helpers for the home page and pricing: is the launch offer on (and how many spots are left),
// and the public proof numbers (tests run, sites analyzed). Both come from the database (migration
// 0027) and never break a page: if the database can't be reached, they quietly return nothing.
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { LAUNCH_OFFER } from "@/lib/plans";

export type LaunchState = { phase: "soon" | "on" | "over"; left: number };
// Show the proof line only once it means something (a handful of tests isn't proof yet).
export const PROOF_MIN_TESTS = 25;

export async function launchState(now = new Date()): Promise<LaunchState> {
  const t = now.getTime();
  const fallback: LaunchState = {
    phase: t < Date.parse(LAUNCH_OFFER.start) ? "soon" : t < Date.parse(LAUNCH_OFFER.end) ? "on" : "over",
    left: LAUNCH_OFFER.spots,
  };
  if (!AUTH_ENABLED) return fallback;
  try {
    const { data } = await (await supabaseServer()).rpc("launch_offer_status");
    const s = data as { active?: boolean; left?: number; start?: string; end?: string } | null;
    if (!s) return fallback;
    const left = Math.max(0, Number(s.left ?? 0));
    if (t < Date.parse(String(s.start))) return { phase: "soon", left };
    if (s.active) return { phase: "on", left };
    return { phase: "over", left };
  } catch {
    return fallback;
  }
}

export async function proofStats(): Promise<{ tests: number; sites: number } | null> {
  if (!AUTH_ENABLED) return null;
  try {
    const { data } = await (await supabaseServer()).rpc("public_stats");
    const s = data as { tests?: number; sites?: number } | null;
    const tests = Number(s?.tests ?? 0);
    if (tests < PROOF_MIN_TESTS) return null;
    return { tests, sites: Number(s?.sites ?? 0) };
  } catch {
    return null;
  }
}
