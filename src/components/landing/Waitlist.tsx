"use client";
// The launch waitlist form. It calls the same database function as index.html (join_waitlist),
// using the PUBLIC publishable key. The database only lets visitors join; nobody can read the list.
// A hidden "website" field catches bots: they get a fake success and nothing is saved.
import { useState } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

async function joinWaitlist(name: string, email: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_name: name, p_email: email, p_source: "landing-next" }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || "Something went wrong. Please try again.");
}

export default function Waitlist() {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") || "").trim();
    const email = String(new FormData(form).get("email") || "").trim();
    const bot = String(new FormData(form).get("website") || "");

    if (!name) return fail("Please tell us your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("That email doesn't look right.");
    if (bot) return setStatus("done"); // bots: a success that saves nothing

    setStatus("busy");
    setMessage("");
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("The waitlist isn't connected yet. Please try again later.");
      await joinWaitlist(name, email);
      setStatus("done");
    } catch (err) {
      fail(err instanceof Error ? err.message : "We couldn't reach the server. Please try again.");
    }
  }

  function fail(text: string) {
    setMessage(text);
    setStatus("error");
  }

  if (status === "done") {
    return (
      <p role="status" className="text-lg">
        You are on the list. We will email you at launch. You can unsubscribe at any time from that email.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      <label className="sr-only" htmlFor="wl-name">Your name</label>
      <input id="wl-name" name="name" autoComplete="given-name" placeholder="Your name" className="field h-14 text-base" />
      <label className="sr-only" htmlFor="wl-email">Your email</label>
      <input id="wl-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="field h-14 text-base" />
      <button type="submit" disabled={status === "busy"} className="btn btn-primary h-14 w-full px-6 text-base">
        {status === "busy" ? "Adding you…" : "Join the launch list"}
      </button>
      {/* hidden from people, visible to bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {message && (
        <p role="alert" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
