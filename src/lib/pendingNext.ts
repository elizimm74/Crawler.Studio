// Remembers where someone was heading (e.g. /app?url=... after onboarding) while they sign up.
// Why: the confirmation email (or Google / Apple) often opens in a NEW tab, or Supabase falls back to
// the home page, and the `next` in the link is lost. localStorage survives that (same browser).
// Kept for 24 hours, only our own paths (safePath), and used once.
import { safePath } from "./safePath";

const KEY = "crawler-next";
const DAY = 24 * 60 * 60 * 1000;

export function savePendingNext(path: string) {
  try {
    const safe = safePath(path, "");
    if (safe && safe !== "/dashboard") localStorage.setItem(KEY, JSON.stringify({ path: safe, t: Date.now() }));
  } catch {
    // storage blocked: they'll land on the dashboard instead
  }
}

export function takePendingNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const { path, t } = JSON.parse(raw) as { path?: string; t?: number };
    if (!path || !t || Date.now() - t > DAY) return null;
    return safePath(path, "") || null;
  } catch {
    return null;
  }
}
