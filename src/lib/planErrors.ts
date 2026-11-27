// Turns the database's plan-limit codes into a friendly answer for the browser.
// WHY: since migration 0025 the database refuses to START an analysis when the person has no test
// left to run (NO_TESTS_LEFT) or when it's a video/ad and their plan has no Ad Analysis
// (PLAN_NO_ADS). Those rules live in the database so nobody can get around them by calling it
// directly; this file only words the refusal nicely. 402 = "payment required".
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/supabase/api";

export function analyzeError(message: string) {
  if (message.includes("NO_TESTS_LEFT")) {
    return NextResponse.json(
      { error: "You've used your free test. Pick a monthly plan or pay for one analysis on the Pricing page to keep testing.", limitReached: true },
      { status: 402 },
    );
  }
  if (message.includes("PLAN_NO_ADS")) {
    return NextResponse.json(
      { error: "Ad Analysis (video, ad and creator tests) starts on the Growth plan. See the Pricing page.", limitReached: true },
      { status: 402 },
    );
  }
  return jsonError(message, 429);
}
