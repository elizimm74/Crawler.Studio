// NETWORK GUARD: Crawler's browser visits addresses that STRANGERS type in. Without this, someone
// could type an internal address (the cloud's secret metadata service at 169.254.169.254, the worker's
// own machine at 127.0.0.1, or a private network like *.railway.internal) and Crawler would visit it
// and hand back a screenshot + the text. That attack is called SSRF.
//
// The rule: in production, the browser may only load PUBLIC internet addresses. Every request is
// checked (the page, its images, scripts, and any redirect), and the domain is looked up so a public
// name that points at a private address is caught too.
// On your own computer (npm run dev / worker:dev / benches) it's off, so the /demo practice sites on
// localhost keep working. Force it on/off with GUARD_PRIVATE_URLS=1 / 0.
import { lookup } from "dns/promises";
import { isIP } from "net";
import type { BrowserContext } from "playwright";

export const guardOn = () =>
  process.env.GUARD_PRIVATE_URLS === "1" || (process.env.GUARD_PRIVATE_URLS !== "0" && process.env.NODE_ENV === "production");

// Private, local and reserved address ranges (IPv4 + IPv6). Pure, so the bench can check it.
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 || // "this network", private, loopback, multicast + reserved
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local: cloud metadata lives here
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) || // IETF reserved
      (a === 198 && (b === 18 || b === 19)) // benchmarking
    );
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // an IPv4 address written as IPv6
    if (mapped) return isPrivateIp(mapped[1]);
    return /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s) || s.startsWith("64:ff9b:"); // private, link-local, multicast, NAT64
  }
  return false;
}

// Names that only exist inside private networks.
const PRIVATE_NAME = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain)$/i;

// Quick check without the internet (used by the website before queueing a test).
export function obviouslyPrivate(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return PRIVATE_NAME.test(h) || isPrivateIp(h) || !h.includes(".");
}

const cache = new Map<string, { blocked: boolean; at: number }>();
// Full check: also looks the name up, so "evil.example" pointing at 10.0.0.5 is caught.
export async function hostIsBlocked(hostname: string): Promise<boolean> {
  if (!guardOn()) return false;
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (obviouslyPrivate(h)) return true;
  const hit = cache.get(h);
  if (hit && Date.now() - hit.at < 60_000) return hit.blocked;
  let blocked: boolean;
  try {
    const addrs = await lookup(h, { all: true });
    blocked = addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address));
  } catch {
    blocked = false; // the name doesn't resolve: the browser will just fail to load it
  }
  cache.set(h, { blocked, at: Date.now() });
  return blocked;
}

// Is this a public http(s) address the crawler may visit? Returns a friendly reason if not.
export async function publicUrlProblem(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "That doesn't look like a web address.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "Only http:// and https:// addresses can be tested.";
  if (u.username || u.password) return "Addresses with a username or password in them can't be tested.";
  if (await hostIsBlocked(u.hostname)) return "That address is private or local, so Crawler can't visit it. Use your public website address.";
  return null;
}

// Every request this browser makes goes through the check (pages, redirects, images, scripts...).
export async function guardContext(context: BrowserContext) {
  if (!guardOn()) return;
  await context.route("**/*", async (route) => {
    let u: URL;
    try {
      u = new URL(route.request().url());
    } catch {
      return route.abort("blockedbyclient");
    }
    if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    if ((u.protocol !== "http:" && u.protocol !== "https:") || (await hostIsBlocked(u.hostname))) {
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
}
