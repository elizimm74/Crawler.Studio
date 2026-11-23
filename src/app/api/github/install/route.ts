// GET /api/github/install?next=/onboarding -> sends the signed-in person to GitHub to install the
// Crawler app on the repos they choose. The signed "state" proves it's them when GitHub sends them back.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { githubEnabled, installUrl, signState } from "@/lib/github";
import { safePath } from "@/lib/safePath";

export async function GET(req: Request) {
  if (!githubEnabled()) return jsonError("GitHub import isn't switched on yet.", 503);
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const next = safePath(new URL(req.url).searchParams.get("next"), "/onboarding");
  const res = NextResponse.redirect(installUrl(signState(auth.user.id)));
  res.cookies.set("crawler-gh-next", next, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 900, path: "/" });
  return res;
}
