"use client";
// "Import from GitHub": pick one of your repos and Crawler fills in its live website.
// Hidden when the GitHub app isn't set up, or for signed-out visitors (they just paste a URL).
import { useEffect, useState } from "react";

type Repo = { id: number; fullName: string; private: boolean; liveUrl: string | null; source: string | null; account: string };
type State = { enabled: boolean; signedIn?: boolean; connected?: boolean; repos?: Repo[]; accounts?: string[] };

export default function GitHubImport({ onPick, next = "/onboarding" }: { onPick: (url: string, repo: string) => void; next?: string }) {
  const [state, setState] = useState<State | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-sm text-muted">Couldn&apos;t reach GitHub right now. Paste your website instead.</p>;
  if (!state?.enabled || state.signedIn === false) return null;
  if (!state.connected)
    return (
      <a href={`/api/github/install?next=${encodeURIComponent(next)}`} className="btn btn-ghost h-11 px-4 text-sm">
        <GitHubMark /> Import from GitHub
      </a>
    );

  const repos = state.repos ?? [];
  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen(!open)} className="btn btn-ghost h-11 px-4 text-sm" aria-expanded={open}>
        <GitHubMark /> {open ? "Hide your repos" : `Pick from GitHub (${repos.length})`}
      </button>
      {open && (
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {repos.length === 0 && <li className="p-4 text-sm text-muted">No repos shared with Crawler yet. Add some in the GitHub app settings.</li>}
          {repos.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {r.fullName} {r.private && <span className="text-xs text-faint">· private</span>}
                </p>
                <p className="truncate text-xs text-faint">{r.liveUrl ? `${r.liveUrl.replace(/^https?:\/\//, "")} · from the ${r.source}` : "No live website found (add one in the repo's About → Website)"}</p>
              </div>
              <button type="button" disabled={!r.liveUrl} onClick={() => r.liveUrl && (onPick(r.liveUrl, r.fullName), setOpen(false))} className="btn btn-secondary h-10 shrink-0 px-3 text-sm">
                Use
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-faint">
        Crawler only sees repo names and deployment addresses, never your code. Manage access in{" "}
        <a href="/settings" className="underline underline-offset-2">
          Settings
        </a>
        .
      </p>
    </div>
  );
}

export function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
