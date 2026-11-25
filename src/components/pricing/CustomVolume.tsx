"use client";
// ENTERPRISE + "Need more Crawlers?": a short request form for custom volume.
// It saves to the database through request_custom_volume() (migration 0023: checks the email,
// limits floods), which also pings the founder's Slack pulse. Nobody can read the requests from a
// browser; the founder sees them on /admin/insights.
// It opens by itself when someone follows a "#custom" link.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { ENTERPRISE } from "@/lib/plans";

const VOLUMES = ["50,000 a month", "100,000 a month", "250,000 a month", "500,000+ a month", "Not sure yet"];

export default function CustomVolume({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  // "#custom" in the address (the "Need more Crawlers?" link) opens the form
  useEffect(() => {
    const check = () => window.location.hash === "#custom" && setOpen(true);
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("website")) return; // a hidden field only bots fill in
    setState("busy");
    setError(null);
    const { error: err } = await supabaseBrowser().rpc("request_custom_volume", {
      p_name: String(f.get("name") ?? ""),
      p_email: String(f.get("email") ?? ""),
      p_company: String(f.get("company") ?? ""),
      p_volume: String(f.get("volume") ?? ""),
      p_message: String(f.get("message") ?? ""),
    });
    if (err) {
      setError(err.message.replace(/^.*?: /, "") || "Couldn't send. Please try again.");
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <section id="custom" className="scroll-mt-28 rounded-3xl border border-line bg-white p-6 sm:p-8" aria-labelledby="enterprise-title">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-muted">{ENTERPRISE.name}</p>
          <h2 id="enterprise-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Need more Crawlers? <span className="text-muted">{ENTERPRISE.title}.</span>
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ENTERPRISE.features.map((x) => (
              <li key={x} className="rounded-full border border-line bg-subtle px-3 py-1 text-sm">
                {x}
              </li>
            ))}
          </ul>
        </div>
        {!open && (
          <button type="button" className="btn btn-secondary h-11 rounded-full px-6" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="custom-form">
            Talk to us
          </button>
        )}
      </div>

      {open &&
        (state === "sent" ? (
          <p role="status" className="mt-6 rounded-2xl bg-subtle p-4 text-sm">
            Thanks! We got your request and will email you back. (Usually within 2 working days.)
          </p>
        ) : !enabled ? (
          <p className="mt-6 rounded-2xl bg-subtle p-4 text-sm text-muted">Requests aren&apos;t switched on yet on this copy of Crawler.</p>
        ) : (
          <form id="custom-form" onSubmit={send} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Name</span>
              <input name="name" required maxLength={80} className="field mt-1.5 w-full" autoComplete="name" />
            </label>
            <label className="block">
              <span className="field-label">Work email</span>
              <input name="email" type="email" required maxLength={200} className="field mt-1.5 w-full" autoComplete="email" />
            </label>
            <label className="block">
              <span className="field-label">Company (optional)</span>
              <input name="company" maxLength={120} className="field mt-1.5 w-full" autoComplete="organization" />
            </label>
            <label className="block">
              <span className="field-label">Crawlers you need</span>
              <select name="volume" className="field mt-1.5 w-full" defaultValue={VOLUMES[1]}>
                {VOLUMES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">What do you want to test? (optional)</span>
              <textarea name="message" maxLength={1000} rows={3} className="field mt-1.5 w-full" />
            </label>
            {/* bots fill this in; people never see it */}
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button type="submit" className="btn btn-primary h-11 rounded-full px-6" disabled={state === "busy"}>
                {state === "busy" ? "Sending…" : "Send request"}
              </button>
              <p className="text-xs text-faint">We only use your email to reply about this request.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm sm:col-span-2">
                {error}
              </p>
            )}
          </form>
        ))}
    </section>
  );
}
