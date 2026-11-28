// GET /auth/confirm?token_hash=...&type=signup&next=/app
// The sturdier way to confirm an email: it works even when the link is opened in a different browser
// or app than the one used to sign up (the /auth/callback "code" way needs the same browser).
// Used when the Supabase email template links here ({{ .TokenHash }}, see docs/launch-day.md).
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { safePath } from "@/lib/safePath";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safePath(url.searchParams.get("next"), type === "recovery" ? "/auth/reset" : "/dashboard");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const msg = "That link has expired or was already used. If you just confirmed your email, sign in to continue.";
  return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(next)}&error=${encodeURIComponent(msg)}`, url.origin));
}
