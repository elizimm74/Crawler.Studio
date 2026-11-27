"use client";
// The sign-in / sign-up form: email + password, or "Continue with Apple / Google".
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { safePath } from "@/lib/safePath";

export default function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(params.get("error"));
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!AUTH_ENABLED) {
    return (
      <p className="card p-6 text-sm text-muted">
        Accounts aren&apos;t switched on yet. Add the Supabase keys to <code>.env.local</code> (see the README), then
        restart <code>npm run dev</code>.
      </p>
    );
  }

  // New accounts go through the 3-question onboarding first (it then continues to `next`).
  // ...unless they already gave us their URL (they came from onboarding, so skip it).
  const hasUrl = new URL(next, "http://x").searchParams.has("url");
  const after = mode === "signup" && !hasUrl ? `/onboarding?next=${encodeURIComponent(next)}` : next;
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(after)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback() } })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(friendly(error.message));
    // Supabase doesn't say "this email is taken" (so nobody can probe which emails have accounts):
    // it returns a user with NO identities and sends no email. Tell the person what to do instead.
    if (mode === "signup" && data.user && (data.user.identities?.length ?? 0) === 0) {
      return setMessage("That email already has an account. Sign in instead, or use Continue with Apple / Google if that's how you joined. No password? Use \"Forgot password\" on the sign-in page.");
    }
    // New accounts usually need to confirm their email first.
    if (mode === "signup" && !data.session) return setCheckEmail(true);
    router.push(after);
    router.refresh(); // update the header (signed in now)
  }

  // "Continue with GitHub / Google / Apple": Supabase sends the person there, then back to
  // /auth/callback, which finishes signing them in. GitHub asks ONLY for name + email
  // ("read:user user:email"): signing in never gives Crawler access to anyone's code.
  async function oauth(provider: "github" | "google" | "apple") {
    setMessage(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback(), ...(provider === "github" ? { scopes: "read:user user:email" } : {}) },
    });
    if (error) setMessage(friendly(error.message));
  }

  // "Forgot password": emails a link back to /auth/callback, which signs them in and opens /auth/reset.
  // Also how someone who joined with Apple or Google can add a password.
  async function forgot() {
    if (!email) return setMessage("Type your email above first, then click Forgot password.");
    setBusy(true);
    setMessage(null);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
    });
    setBusy(false);
    if (error) return setMessage(friendly(error.message));
    setResetSent(true);
  }

  if (resetSent) {
    return (
      <div className="card p-6">
        <p className="t-h3">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          If <b>{email}</b> has an account, we sent a link to set a new password. It can take a minute; check spam too.
        </p>
      </div>
    );
  }

  if (checkEmail) {
    return (
      <div className="card p-6">
        <p className="t-h3">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          We sent a link to <b>{email}</b>. Click it to finish signing up. It can take a minute; check spam too.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* GitHub first: most indie hackers and developers already have it open. */}
      <button onClick={() => oauth("github")} type="button" className="btn btn-secondary w-full">
        <GitHubMark /> Continue with GitHub
      </button>
      {/* Apple's rules: a black button with the white Apple logo. */}
      <button onClick={() => oauth("apple")} type="button" className="btn w-full bg-[#000000] text-white hover:opacity-85">
        <AppleMark /> Continue with Apple
      </button>
      <button onClick={() => oauth("google")} type="button" className="btn btn-ghost w-full">
        <GoogleMark /> Continue with Google
      </button>
      <div className="t-label flex items-center gap-4">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label htmlFor="auth-email" className="sr-only">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          id="auth-email"
          placeholder="you@email.com"
          autoComplete="email"
          className="field"
        />
        <label htmlFor="auth-password" className="sr-only">
          Password
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Make a password (6+ characters)" : "Password"}
          id="auth-password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="field"
        />
        {message && (
          <p role="alert" className="rounded-lg border border-line-strong bg-subtle p-4 text-sm">
            {message}
          </p>
        )}
        <button disabled={busy} aria-busy={busy} className="btn btn-primary w-full">
          {busy ? "One sec…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        {mode === "signin" && (
          <button type="button" onClick={forgot} disabled={busy} className="text-sm text-muted underline underline-offset-2 hover:text-fg">
            Forgot password? (or joined with Apple / Google and want one)
          </button>
        )}
      </form>
      <p className="text-xs text-muted">
        By continuing you agree to Crawler&apos;s{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-fg">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">Privacy Policy</Link>. Under 18? Ask a parent or guardian first.
      </p>
      <p className="text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href={`/signin?next=${encodeURIComponent(next)}`} className="font-medium text-fg underline underline-offset-2">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-fg underline underline-offset-2">
              Create a free account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

// Google's standard four-color "G" (Google's sign-in guidelines ask for this one).
// GitHub's mark (the Octocat silhouette), in the text color.
function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// Apple's logo, in the text color (white on the black button).
function AppleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.59-.75 2.99-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.24.88-1.29 1.24-2.53 1.26-2.6-.03-.01-2.42-.93-2.45-3.72zM14.08 5.85c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.77-.97 2.82 1.02.08 2.07-.52 2.71-1.28z" />
    </svg>
  );
}

// Only allow going back to pages on OUR site (never a link to another website).
const safeNext = (next: string | null) => safePath(next, "/dashboard");

function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match.";
  if (/email not confirmed/i.test(msg)) return "Please click the link in your email first.";
  if (/already registered/i.test(msg)) return "That email already has an account. Try signing in.";
  if (/provider is not enabled|unsupported provider/i.test(msg)) return "That sign-in option isn't switched on yet. Use email for now.";
  if (/rate limit/i.test(msg)) return "Too many emails or tries right now. Wait a few minutes and try again.";
  if (/error sending|smtp/i.test(msg)) return "We couldn't send the email right now. Try again in a few minutes, or use Continue with Apple.";
  return msg;
}
