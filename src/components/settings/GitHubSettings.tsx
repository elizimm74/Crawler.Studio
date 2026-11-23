"use client";
// Settings → GitHub: which GitHub accounts are connected, connect one, or disconnect.
import { useEffect, useState } from "react";
import { GitHubMark } from "@/components/GitHubImport";

export default function GitHubSettings() {
  const [accounts, setAccounts] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  if (accounts === null) return <p className="text-sm text-muted">Checking GitHub…</p>;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Import a repo&apos;s live website into a test. Crawler only sees repo names and deployment addresses, never your code.
      </p>
      {accounts.length ? <p>Connected: {accounts.join(", ")}</p> : <p className="text-muted">Not connected.</p>}
      <div className="flex flex-wrap gap-2">
        <a href="/api/github/install?next=/settings" className="btn btn-secondary h-11 px-4 text-sm">
          <GitHubMark /> {accounts.length ? "Add repos or accounts" : "Connect GitHub"}
        </a>
        {accounts.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await fetch("/api/github/disconnect", { method: "POST" }).catch(() => null);
              setBusy(false);
              if (r?.ok) {
                setAccounts([]);
                setMsg("Disconnected. To remove the app's access completely, uninstall it on GitHub (Settings → Applications).");
              } else setMsg("Couldn't disconnect. Please try again.");
            }}
            className="btn btn-ghost h-11 px-4 text-sm"
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>
      {msg && <p aria-live="polite">{msg}</p>}
    </div>
  );
}
