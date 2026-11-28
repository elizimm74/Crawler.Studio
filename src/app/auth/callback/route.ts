// GET /auth/callback?code=...&next=/app
// Where email-confirmation links and "Continue with Google / Apple" send people back.
// Swaps the one-time code for a real sign-in, then continues to `next`.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safePath } from "@/lib/safePath";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safePath(url.searchParams.get("next"), "/dashboard"); // only pages on our own site

  // Google or Apple sent the person back with an error (e.g. they pressed "Cancel").
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    const msg = /denied|cancel/i.test(providerError) ? "Sign-in was cancelled." : `Sign-in didn't work: ${providerError}`;
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(msg)}`, url.origin));
  }

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("[auth/callback] code exchange failed:", error.message);
  }
  // Usually: the email link was opened in another browser/app than the one used to sign up (so the
  // one-time code can't be finished here), or it was already used. The email IS confirmed by now,
  // so one normal sign-in finishes it, and `next` keeps them on track.
  const msg = "Almost there: your email is confirmed. Sign in once more to continue.";
  return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(next)}&error=${encodeURIComponent(msg)}`, url.origin));
}
