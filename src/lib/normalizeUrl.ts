// SERVER ONLY (uses netguard, which needs Node's dns/net).
import { guardOn, obviouslyPrivate } from "./netguard";

// Turns what people type ("mysite.com") into a full address, or null.
// In production, private / internal addresses are refused here too (the worker checks again, with DNS).
export function normalizeUrl(input?: string | null) {
  if (!input?.trim() || input.length > 2000) return null;
  const raw = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  try {
    const u = new URL(raw);
    if (u.username || u.password) return null;
    if (guardOn()) return obviouslyPrivate(u.hostname) ? null : u.toString();
    // On your own computer: real domains, plus localhost so the demo sites work.
    return u.hostname.includes(".") || u.hostname === "localhost" ? u.toString() : null;
  } catch {
    return null;
  }
}
