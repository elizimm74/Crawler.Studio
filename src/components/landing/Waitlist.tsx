"use client";
// The early-access form. Everything goes to the real database (the join_waitlist function, see
// supabase/migrations/0023_waitlist_referrals.sql). Visitors can only join and read their own
// position with their referral code. The list itself can't be read from the browser.
// Duplicates: the database answers the same way for everyone, so nobody can learn who is on the list.
import { useEffect, useState } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const ROLES = [
  { id: "founder", label: "Founder" },
  { id: "ecommerce", label: "Ecommerce brand" },
  { id: "marketer", label: "Marketer" },
  { id: "agency", label: "Agency" },
  { id: "other", label: "Other" },
] as const;

const STORE_KEY = "crawler-early-access";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

type Status = { found: boolean; position?: number; total?: number; referrals?: number };
type Stage = "form" | "busy" | "done" | "already" | "error";

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (data.message as string)) || "Something went wrong. Please try again.");
  return data as T;
}

function readStored(): { code?: string } {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStored(value: { code: string }) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    // Private browsing can block storage. The link is still shown on this screen.
  }
}

export default function Waitlist() {
  const [stage, setStage] = useState<Stage>("form");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);

  // Returning visitor on the same browser: show their place again.
  useEffect(() => {
    const saved = readStored().code;
    if (!saved || !SUPABASE_URL || !SUPABASE_KEY) return;
    setCode(saved);
    setStage("done");
    rpc<Status>("waitlist_status", { p_code: saved }).then(setStatus).catch(() => setStatus(null));
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const first = String(data.get("name") || "").trim();
    const site = String(data.get("website") || "").trim();
    const role = String(data.get("role") || "") || null;
    const trap = String(data.get("company") || ""); // hidden from people; bots fill it

    if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address, like you@yourbusiness.com.");
    if (first.length > 80) return fail("Please keep your first name under 80 characters.");
    if (site && !/^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(site)) return fail("Please enter a website like yourbusiness.com, or leave it empty.");
    if (trap) return setStage("done"); // bots get a success that saves nothing

    if (!SUPABASE_URL || !SUPABASE_KEY) return fail("Early access isn't connected yet. Please try again later.");

    const ref = new URLSearchParams(window.location.search).get("ref");
    setStage("busy");
    setMessage("");
    try {
      const res = await rpc<{ already: boolean; referral_code?: string }>("join_waitlist", {
        p_email: email,
        p_name: first,
        p_source: "landing-next",
        p_website: site || null,
        p_role: role,
        p_ref: ref || null,
      });
      if (res.already || !res.referral_code) {
        setStage("already");
        return;
      }
      writeStored({ code: res.referral_code });
      setCode(res.referral_code);
      setStage("done");
      rpc<Status>("waitlist_status", { p_code: res.referral_code }).then(setStatus).catch(() => setStatus(null));
    } catch (err) {
      fail(err instanceof Error ? err.message : "We couldn't reach the server. Please try again.");
    }
  }

  function fail(text: string) {
    setMessage(text);
    setStage("error");
  }

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/landing?ref=${code}` : "";

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copy didn't work. Select the link and copy it yourself.");
    }
  }

  if (stage === "already") {
    return (
      <div role="status" className="rounded-2xl border border-black/10 bg-white p-8">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-black/50">Already registered</p>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight">You are already on the list.</h3>
        <p className="mt-4 text-black/70">Launch updates and early-access invitations arrive by email. Nothing else to do.</p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div role="status" className="rounded-2xl border border-black/10 bg-white p-8">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#02aa3d]">Registered</p>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight">You are on the early-access list.</h3>
        <p className="mt-4 text-black/70">
          Launch updates and early-access invitations will arrive by email. You will not receive anything else from this form.
        </p>

        {status?.found && (
          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-black/10 pt-6">
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-black/50">Your place</dt>
              <dd className="mt-1 text-3xl font-semibold">
                #{status.position} <span className="text-base font-normal text-black/50">of {status.total}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-black/50">Friends joined</dt>
              <dd className="mt-1 text-3xl font-semibold">{status.referrals}</dd>
            </div>
          </dl>
        )}

        {link && (
          <div className="mt-8 border-t border-black/10 pt-6">
            <p className="text-sm font-medium">Move up the list: invite friends</p>
            <p className="mt-1 text-sm text-black/60">Each friend who joins with your link moves you up. Your place is based on the people who have joined so far, so it can change.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} className="h-12 flex-1 rounded-lg border border-black/15 bg-[#f4f4f2] px-4 text-sm" />
              <button type="button" onClick={copy} className="h-12 rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-[#222]">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}
        {message && <p role="alert" className="mt-4 text-sm">{message}</p>}
      </div>
    );
  }

  const busy = stage === "busy";
  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Email address <span className="text-[#02aa3d]">*</span></span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@yourbusiness.com" className="h-13 rounded-lg border border-black/15 bg-white px-4 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">First name <span className="text-black/40">(optional)</span></span>
          <input name="name" autoComplete="given-name" placeholder="Alex" className="h-13 rounded-lg border border-black/15 bg-white px-4 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium">Business website <span className="text-black/40">(optional)</span></span>
        <input name="website" inputMode="url" autoComplete="url" placeholder="yourbusiness.com" className="h-13 rounded-lg border border-black/15 bg-white px-4 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">What best describes you?</legend>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <label key={r.id} className="cursor-pointer">
              <input type="radio" name="role" value={r.id} className="peer sr-only" />
              <span className="inline-flex h-10 items-center rounded-full border border-black/15 bg-white px-4 text-sm transition hover:border-black/50 peer-checked:border-black peer-checked:bg-black peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#02aa3d]">
                {r.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* hidden from people, visible to bots */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <button type="submit" disabled={busy} className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-black px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#222] disabled:opacity-60">
        {busy ? "Adding you…" : "Request early access"}
        {!busy && <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>}
      </button>

      <p className="text-xs text-black/50">We will only email you about Crawler&apos;s launch and early-access invitations. Unsubscribe in one click from any email.</p>

      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
