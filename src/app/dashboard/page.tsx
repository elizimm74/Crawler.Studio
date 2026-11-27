// /dashboard: the signed-in home. Recent analyses (with trends), your next best moves, your saved
// customer minds, what's working for apps and high conversion, and your invite progress.
// This file only LOADS the data (as you: Row Level Security keeps it yours); DashboardView shows it.
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { SITE_URL } from "@/lib/config";
import { findPack } from "@/lib/plans";
import DashboardView from "@/components/dashboard/DashboardView";
import { analyses, fixQueue, nextMoves, recurringBlockers, type DashboardData, type PlanData, type TestRow, type Trends } from "@/lib/dashboard";

export const metadata = { title: "Dashboard", robots: { index: false } };

const HISTORY_STANDARD = 20;
const HISTORY_EXPANDED = 100;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ paid?: string; pack?: string }> }) {
  const { paid, pack } = await searchParams;
  if (!AUTH_ENABLED) {
    return (
      <div className="paper mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <h1 className="t-h1">Dashboard</h1>
        <p className="card mt-8 p-6 text-muted">Accounts are switched off, so there is no dashboard yet.</p>
      </div>
    );
  }
  const user = await currentUser();
  const supabase = await supabaseServer();

  const [testsRes, mindsRes, planRes, trendsRes] = await Promise.all([
    // Only the small parts of each test the dashboard needs (not the whole saved report).
    // my_tests() lives in the database (migration 0025) and hides a locked free trial's fixes there.
    supabase.rpc("my_tests", { p_limit: HISTORY_EXPANDED }),
    supabase.from("saved_audiences").select("id, name, audience, updated_at").order("updated_at", { ascending: false }),
    supabase.rpc("my_plan"),
    supabase.rpc("crawler_trends"),
  ]);

  // Agency (and admins) get the expanded history; everyone else sees their latest 20 tests here.
  const plan0 = planRes.data as { plan?: string; unlimited?: boolean; paid?: boolean } | null;
  const expanded = Boolean(plan0?.unlimited) || plan0?.plan === "agency";
  const rows = ((testsRes.data ?? []) as unknown as (TestRow & { crawl_id: string | null; tier?: string | null })[])
    .slice(0, expanded ? HISTORY_EXPANDED : HISTORY_STANDARD)
    // a free-trial report is a preview until they pay: its fixes stay locked here too
    .map((r) => (r.tier === "trial" && !plan0?.paid ? { ...r, fixes: null } : r));

  // Thumbnails: the first screenshot of each test's page (websites/stores) or its first uploaded
  // screen (apps/games). Shown through /api/files, which only ever serves your own files.
  const crawlIds = [...new Set(rows.map((r) => r.crawl_id).filter((x): x is string => Boolean(x)))];
  if (crawlIds.length && user) {
    const { data: crawls } = await supabase
      .from("crawls")
      .select("id, hero:data->crawl->pages->0->screenshotFiles->>0, batch:data->input->>batch, first:data->input->screens->>0, frame:data->input->frames->>0")
      .in("id", crawlIds);
    const thumbs = new Map(
      ((crawls ?? []) as { id: string; hero: string | null; batch: string | null; first: string | null; frame: string | null }[]).map((c) => [
        c.id,
        c.hero ? `/api/files/${user.id}/crawls/${c.id}/${c.hero}` : c.batch && (c.first || c.frame) ? `/api/files/${user.id}/uploads/${c.batch}/${c.first || c.frame}` : null,
      ]),
    );
    for (const r of rows) r.thumb = r.crawl_id ? (thumbs.get(r.crawl_id) ?? null) : null;
  }
  const raw = planRes.data as (Omit<PlanData, "inviteLink"> & { referrals: PlanData["referrals"] }) | null;
  const plan: PlanData = raw
    ? { ...raw, inviteLink: `${SITE_URL}/r/${raw.referrals.code}` }
    : { plan: "free", unlimited: false, customers: 25, used: 0, limit: 1, left: 1, inviteLink: SITE_URL, referrals: { count: 0, needed: 3, code: "" } };

  const blockers = recurringBlockers(rows);
  const meta = user?.user_metadata ?? {};
  const first = String(meta.full_name ?? meta.name ?? "").trim().split(" ")[0];
  const email = user?.email ?? "";
  // Apple's "hide my email" addresses look like random text, so don't greet people with those.
  const name = first || (email && !email.endsWith("privaterelay.appleid.com") ? email.split("@")[0] : "there");

  const data: DashboardData = {
    name,
    analyses: analyses(rows),
    blockers,
    fixes: fixQueue(rows),
    moves: nextMoves(blockers),
    minds: (mindsRes.data ?? []) as DashboardData["minds"],
    plan,
    trends: (trendsRes.data as Trends | null) ?? null,
  };
  const thanks = (["starter", "growth", "pro", "agency"] as string[]).includes(paid ?? "") ? paid : findPack(pack) ? pack : undefined;
  return <DashboardView data={data} paid={thanks} />;
}
