// GET /api/github/repos -> { enabled, connected, repos: [{ fullName, liveUrl, source, private }] }
// Only installations saved for THIS person (RLS), only the repos they gave the app.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/api";
import { githubEnabled, listRepos, type RepoInfo } from "@/lib/github";

export async function GET() {
  if (!githubEnabled()) return NextResponse.json({ enabled: false });
  const auth = await requireUser();
  if (auth.error) return NextResponse.json({ enabled: true, signedIn: false });
  const { data } = await auth.supabase.from("github_installations").select("installation_id, account_login").limit(3);
  if (!data?.length) return NextResponse.json({ enabled: true, connected: false, repos: [] });
  const repos: (RepoInfo & { account: string })[] = [];
  for (const row of data) {
    try {
      for (const r of await listRepos(Number(row.installation_id))) repos.push({ ...r, account: row.account_login as string });
    } catch (err) {
      console.error("[github/repos]", (err as Error).message); // e.g. the app was uninstalled on GitHub
    }
  }
  return NextResponse.json({ enabled: true, connected: true, accounts: data.map((d) => d.account_login), repos });
}
