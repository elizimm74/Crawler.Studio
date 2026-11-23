// POST /api/check-url { url } -> { ok, url, host, title?, category?, problem? }
// Used by the home page and onboarding BEFORE sign-up: is this a real, public website we can open?
// It never runs AI and never stores anything. Safety:
//   - private / internal addresses are refused (netguard, with a DNS lookup), and every redirect hop
//     is checked again, so this can't be used to reach the server's own network
//   - at most 3 redirects, 6 seconds, and only the first 200 KB of the page is read
//   - a small per-visitor rate limit (in memory, per server instance)
import { NextResponse } from "next/server";
import { normalizeUrl } from "@/lib/normalizeUrl";
import { guardOn, publicUrlProblem } from "@/lib/netguard";
import { guessCategory } from "@/lib/category";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) hits.clear(); // never grows without limit
  return recent.length > 20; // 20 checks a minute per visitor
}

const fail = (problem: string, status = 200) => NextResponse.json({ ok: false, problem }, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return fail("Too many checks. Wait a minute and try again.", 429);

  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  let url = normalizeUrl(typeof body.url === "string" ? body.url : "");
  if (!url) return fail("That doesn't look like a website address. Try something like yourstore.com");

  let res: Response | null = null;
  try {
    for (let hop = 0; hop <= 3; hop++) {
      if (guardOn()) {
        const problem = await publicUrlProblem(url);
        if (problem) return fail("That address isn't a public website we can open.");
      }
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(6_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; CrawlerCheck/1.0; +https://crawler.studio)", Accept: "text/html,*/*" },
      });
      const next: string | null = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!next) break;
      url = new URL(next, url).toString();
      if (!/^https?:/i.test(url)) return fail("That site redirects somewhere we can't open.");
      res = null;
    }
  } catch {
    return fail("We couldn't reach that site. Check the address, or try again in a moment.");
  }
  if (!res) return fail("That site redirects too many times.");

  const host = new URL(url).hostname.replace(/^www\./, "");
  // Many sites block simple checks (403/429/503 from bot protection) but open fine in a real browser.
  if (res.status === 404 || res.status === 410) return fail("That page doesn't exist (404). Check the address.");
  const blocked = res.status >= 400;

  let html = "";
  if (!blocked && (res.headers.get("content-type") ?? "").includes("html") && res.body) {
    const reader = res.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (size < 200_000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    void reader.cancel().catch(() => null);
    html = new TextDecoder().decode(Buffer.concat(chunks));
  } else {
    void res.body?.cancel().catch(() => null);
  }
  const title = (html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  return NextResponse.json({
    ok: true,
    url,
    host,
    title: title ? decodeEntities(title).slice(0, 120) : undefined,
    category: guessCategory(url, html),
    // honest note: we'll still try in a full browser
    note: blocked ? "This site blocks quick checks. Crawler will try with a full browser; some sites with bot protection can't be tested." : undefined,
  });
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
