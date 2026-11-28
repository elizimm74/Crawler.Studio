// Only allow going back to a page on OUR site after sign-in (never to another website).
// "/dashboard" is fine; "//evil.com", "/\evil.com", "https://evil.com" and tricks with tabs or
// newlines are not (browsers treat a backslash like a slash, so "/\evil.com" would leave the site).
export function safePath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || next.length > 2000) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next) || /^\/[^/?#]*:/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://crawler.invalid");
    return u.origin === "https://crawler.invalid" ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
