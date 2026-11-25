"use client";
// /auth/reset: set a new password. People arrive here from the "Forgot password" email:
// the link goes to /auth/callback (which signs them in), then here. Also how someone who joined
// with Apple or Google can add a password to their account.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export default function ResetPassword() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED) return setSignedIn(false); // accounts switched off (no Supabase keys)
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)))
      .catch(() => setSignedIn(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setMessage("Use at least 6 characters.");
    if (password !== again) return setMessage("The two passwords don't match.");
    setBusy(true);
    setMessage(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="paper mx-auto max-w-md px-6 py-10 sm:px-10">
      <h1 className="t-h2">Set a new password</h1>
      {signedIn === false ? (
        <p className="mt-4 text-sm text-muted">
          This link has expired or was already used. Go to{" "}
          <Link href="/signin" className="text-fg underline underline-offset-2">
            Sign in
          </Link>{" "}
          and click &quot;Forgot password&quot; again.
        </p>
      ) : (
        <form onSubmit={save} className="mt-6 space-y-4">
          <label htmlFor="new-pass" className="sr-only">
            New password
          </label>
          <input id="new-pass" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (6+ characters)" autoComplete="new-password" className="field" />
          <label htmlFor="new-pass-2" className="sr-only">
            New password again
          </label>
          <input id="new-pass-2" type="password" minLength={6} required value={again} onChange={(e) => setAgain(e.target.value)} placeholder="Same password again" autoComplete="new-password" className="field" />
          {message && (
            <p role="alert" className="rounded-lg border border-line-strong bg-subtle p-4 text-sm">
              {message}
            </p>
          )}
          <button disabled={busy || signedIn === null} aria-busy={busy} className="btn btn-primary w-full">
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      )}
    </div>
  );
}
