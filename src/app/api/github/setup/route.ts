// GET /api/github/setup?installation_id=&code=&state= : GitHub sends people here after installing.
// Saved ONLY if (1) the signed state matches this signed-in person and (2) GitHub confirms, with the
// person's own one-time code, that their GitHub account can see this installation.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/supabase/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { confirmInstallation, githubEnabled, verifyState } from "@/lib/github";
import { safePath } from "@/lib/safePath";
import { SITE_URL } from "@/lib/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const next = safePath(jar.get("crawler-gh-next")?.value, "/onboarding");
  const back = (status: string) => {
    const to = new URL(next, SITE_URL);
    to.searchParams.set("github", status);
    const res = NextResponse.redirect(to);
    res.cookies.delete("crawler-gh-next");
    return res;
  };
  if (!githubEnabled()) return back("off");
  const auth = await requireUser();
  if (auth.error) return back("signin");
  const id = Number(url.searchParams.get("installation_id"));
  const code = url.searchParams.get("code");
  if (!Number.isInteger(id) || id <= 0 || !code || !verifyState(url.searchParams.get("state"), auth.user.id)) return back("failed");
  try {
    const ok = await confirmInstallation(code, id);
    if (!ok) return back("failed");
    const { error } = await supabaseAdmin()
      .from("github_installations")
      .upsert({ user_id: auth.user.id, installation_id: id, account_login: ok.account.slice(0, 100) });
    if (error) throw new Error(error.message);
    return back("connected");
  } catch (err) {
    console.error("[github/setup]", (err as Error).message);
    return back("failed");
  }
}
