// Runs before every page and API request:
//  1. keeps the visitor's sign-in fresh (Supabase tokens expire hourly; the login cookie lasts 400 days,
//     so people stay signed in on this browser until they sign out)
//  2. sends signed-out visitors to /signin for the private parts of the app
//  3. sends SIGNED-IN visitors from the home page / sign-in / sign-up straight to their dashboard
//     (the landing page is still reachable at /?home=1, linked in the footer)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { safePath } from "@/lib/safePath";

const PRIVATE_PAGES = ["/app", "/run", "/tests", "/dashboard", "/admin", "/settings"];
const PRIVATE_APIS = ["/api/crawls", "/api/tests", "/api/files", "/api/account", "/api/billing", "/api/github/install", "/api/github/disconnect"];

export async function middleware(request: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next(); // accounts switched off

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // This call also refreshes an expired sign-in. Don't remove it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A redirect must carry any refreshed sign-in cookies too, or the fresh login would be lost on the way.
  const redirect = (url: URL) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  const path = request.nextUrl.pathname;
  const q = request.nextUrl.searchParams;
  if (!path.startsWith("/auth/") && (q.has("code") || q.has("token_hash") || q.has("error_description"))) {
    const target = new URL(q.has("token_hash") ? "/auth/confirm" : "/auth/callback", request.url);
    q.forEach((v, k) => target.searchParams.set(k, v));
    if (!target.searchParams.has("next") && path !== "/") target.searchParams.set("next", path);
    return redirect(target);
  }
  const starts = (list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && starts(PRIVATE_APIS)) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!user && starts(PRIVATE_PAGES)) {
    const url = request.nextUrl.clone();
    // Coming from the landing page's URL box (/app?url=...)? They're probably
    // new, so show sign UP. Either way, keep where they were going (+ the URL).
    const fromLanding = path === "/app" && request.nextUrl.searchParams.has("url");
    url.pathname = fromLanding ? "/signup" : "/signin";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirect(url);
  }
  // Already signed in? Skip the landing page and the sign-in forms: go straight to the dashboard.
  const toDashboard = (path === "/" && !request.nextUrl.searchParams.has("home")) || path === "/signin" || path === "/signup";
  if (user && toDashboard && request.method === "GET") {
    // From /signin?next=/app?url=... keep going there; otherwise the dashboard. Only our own pages.
    const target = path === "/" ? "/dashboard" : safePath(request.nextUrl.searchParams.get("next"), "/dashboard");
    return redirect(new URL(target, request.url));
  }
  // Arrived through a friend's invite link and now signed in? Credit the friend once, then forget the cookie.
  // (The database only accepts brand-new accounts and never your own code.)
  const ref = request.cookies.get("crawler_ref")?.value;
  if (user && ref) {
    await supabase.rpc("claim_referral", { p_code: ref });
    response.cookies.delete("crawler_ref");
  }
  return response;
}

export const config = {
  // Skip static files and images (faster).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
