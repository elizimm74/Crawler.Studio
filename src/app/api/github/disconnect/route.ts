// POST /api/github/disconnect -> forget this person's GitHub connections on Crawler.
// (To remove the app's access completely, they uninstall it on GitHub: Settings > Applications.)
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { error } = await auth.supabase.from("github_installations").delete().eq("user_id", auth.user.id);
  if (error) return jsonError("Couldn't disconnect GitHub. Please try again.", 500);
  return NextResponse.json({ ok: true });
}
