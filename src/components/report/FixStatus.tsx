"use client";
// "Not started / In progress / Completed" for each recommended fix.
// Saved to the database (table fix_status, migration 0019: only you can see your rows).
// If the database can't be reached (or on the demo report) it falls back to this browser.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export const FIX_STATES = { not_started: "Not started", in_progress: "In progress", completed: "Completed" } as const;
export type FixState = keyof typeof FIX_STATES;
const key = (title: string) => title.trim().slice(0, 200);

type Ctx = { get: (title: string) => FixState; set: (title: string, s: FixState) => void; saving: string | null; error: string | null };
const FixCtx = createContext<Ctx | null>(null);

export function FixStatusProvider({ testId, demo = false, children }: { testId: string; demo?: boolean; children: React.ReactNode }) {
  const [map, setMap] = useState<Record<string, FixState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useDb, setUseDb] = useState(!demo && AUTH_ENABLED);
  const local = `crawler-fixes-${testId}`;

  useEffect(() => {
    let alive = true;
    const fromLocal = () => {
      try {
        const v = localStorage.getItem(local);
        if (v && alive) setMap(JSON.parse(v));
      } catch {}
    };
    if (!useDb) return fromLocal();
    supabaseBrowser()
      .from("fix_status")
      .select("fix_key, status")
      .eq("test_id", testId)
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) {
          setUseDb(false); // table missing / offline: keep working in this browser
          fromLocal();
          return;
        }
        setMap(Object.fromEntries((data ?? []).map((r) => [r.fix_key as string, r.status as FixState])));
      });
    return () => {
      alive = false;
    };
  }, [testId, useDb, local]);

  const set = useCallback(
    (title: string, s: FixState) => {
      const k = key(title);
      const before = map[k];
      const next = { ...map, [k]: s };
      setMap(next);
      setError(null);
      if (!useDb) {
        try {
          localStorage.setItem(local, JSON.stringify(next));
        } catch {}
        return;
      }
      setSaving(k);
      supabaseBrowser()
        .from("fix_status")
        .upsert({ test_id: testId, fix_key: k, status: s, updated_at: new Date().toISOString() })
        .then(({ error: e }) => {
          setSaving(null);
          if (e) {
            setMap((m) => ({ ...m, [k]: before ?? "not_started" }));
            setError("Couldn't save that change. Try again.");
          }
        });
    },
    [map, useDb, testId, local],
  );

  const value = useMemo<Ctx>(() => ({ get: (t) => map[key(t)] ?? "not_started", set, saving, error }), [map, set, saving, error]);
  return <FixCtx.Provider value={value}>{children}</FixCtx.Provider>;
}

export function FixStatusSelect({ title }: { title: string }) {
  const ctx = useContext(FixCtx);
  if (!ctx) return null;
  const s = ctx.get(title);
  return (
    <label className="fixstatus inline-flex items-center gap-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${s === "completed" ? "bg-accent" : s === "in_progress" ? "bg-fg" : "bg-line-strong"}`} aria-hidden />
      <span className="sr-only">Status of this fix</span>
      <select
        value={s}
        onChange={(e) => ctx.set(title, e.target.value as FixState)}
        className="h-9 rounded-lg border border-line bg-transparent px-2 text-xs text-fg"
        aria-busy={ctx.saving === key(title)}
      >
        {(Object.keys(FIX_STATES) as FixState[]).map((k) => (
          <option key={k} value={k}>
            {FIX_STATES[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

// "2 of 4 fixes done" + any save error, shown above the fix list.
export function FixProgress({ titles }: { titles: string[] }) {
  const ctx = useContext(FixCtx);
  if (!ctx || !titles.length) return null;
  const done = titles.filter((t) => ctx.get(t) === "completed").length;
  const doing = titles.filter((t) => ctx.get(t) === "in_progress").length;
  return (
    <p className="text-sm text-muted" aria-live="polite">
      {done} of {titles.length} fixes completed{doing ? ` · ${doing} in progress` : ""}
      {ctx.error && <span className="ml-2 text-fg">{ctx.error}</span>}
    </p>
  );
}
