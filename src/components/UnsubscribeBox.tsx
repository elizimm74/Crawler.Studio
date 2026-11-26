"use client";
// The unsubscribe button every launch email links to (/unsubscribe?t=<secret token>).
// It shows a button first instead of unsubscribing on page load, so email scanners that open
// links can't unsubscribe people by accident. Calls unsubscribe_waitlist() (migration 0012).
import { useState } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export default function UnsubscribeBox() {
  const [state, setState] = useState<"ask" | "busy" | "done" | "notfound" | "error">("ask");

  async function go() {
    const token = new URLSearchParams(window.location.search).get("t") || "";
    if (!/^[0-9a-f-]{36}$/i.test(token)) return setState("notfound");
    setState("busy");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/unsubscribe_waitlist`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token }),
      });
      if (!res.ok) throw new Error();
      setState((await res.json()) ? "done" : "notfound");
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <p role="status" className="text-lg">You are unsubscribed. You won&apos;t get any more emails from this list.</p>;
  if (state === "notfound") return <p role="status" className="text-lg">This link doesn&apos;t match anyone on the list. You may already be unsubscribed.</p>;

  return (
    <div>
      <p className="text-lg text-muted">Stop getting Crawler launch emails?</p>
      <button type="button" onClick={go} disabled={state === "busy"} className="btn btn-primary mt-6 h-12 px-6">
        {state === "busy" ? "Unsubscribing…" : "Yes, unsubscribe me"}
      </button>
      {state === "error" && <p role="alert" className="mt-4 text-sm">We couldn&apos;t reach the server. Please try again.</p>}
    </div>
  );
}
