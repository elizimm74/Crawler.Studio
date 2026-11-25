"use client";
// The interactive parts of /settings: change password, sign out everywhere, delete account.
// Each shows a loading state, a success message, or the reason it failed.
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [pw, setPw] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("Use at least 8 characters.");
    setState("busy");
    setError(null);
    const { error: err } = await supabaseBrowser().auth.updateUser({ password: pw });
    if (err) {
      setError(err.message.includes("same") ? "That's your current password. Pick a new one." : err.message);
      setState("idle");
    } else {
      setPw("");
      setState("done");
    }
  }
  return (
    <form onSubmit={save} className="space-y-2">
      <label htmlFor="new-pw" className="text-sm font-medium">
        {hasPassword ? "Change password" : "Add a password (so you can also sign in with email)"}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password, 8+ characters" className="field h-11 flex-1" />
        <button disabled={state === "busy" || !pw} aria-busy={state === "busy"} className="btn btn-secondary h-11 px-5 text-sm">
          {state === "busy" ? "Saving…" : "Save password"}
        </button>
      </div>
      <p aria-live="polite" className="text-sm">
        {state === "done" && "Password saved."}
        {error && <span role="alert">{error}</span>}
      </p>
    </form>
  );
}

export function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">Sign out on every device</p>
        <p className="text-sm text-muted">Use this if you signed in on a computer that isn&apos;t yours.</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await supabaseBrowser().auth.signOut({ scope: "global" }).catch(() => null);
          window.location.href = "/signin";
        }}
        className="btn btn-ghost h-11 px-4 text-sm"
      >
        {busy ? "Signing out…" : "Sign out everywhere"}
      </button>
    </div>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function del() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: text }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't delete your account.");
      window.location.href = "/?deleted=1";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Deletes your login, every test and report, saved audiences and uploaded screenshots. This can&apos;t be undone. A paid plan must be
        cancelled first. We keep only a scrambled (one-way) copy of your email so the free test can&apos;t be claimed again.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost h-11 px-4 text-sm">
          Delete my account…
        </button>
      ) : (
        <div className="space-y-2">
          <label htmlFor="del-confirm" className="block font-medium">
            Type DELETE to confirm
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="del-confirm" value={text} onChange={(e) => setText(e.target.value)} className="field h-11 flex-1" autoComplete="off" />
            <button type="button" onClick={del} disabled={busy || text !== "DELETE"} aria-busy={busy} className="btn btn-primary h-11 px-5 text-sm">
              {busy ? "Deleting…" : "Delete forever"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost h-11 px-4 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
