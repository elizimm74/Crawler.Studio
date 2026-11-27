// GET /api/tests/:id
//  - waiting/running: { status, stage, progress, journey, filesPrefix }  (for the live view)
//  - done/error:      the full report (Run) + filesPrefix
//    A FREE-TRIAL test whose owner hasn't paid yet gets the preview version. Since migration 0025
//    the DATABASE decides that (test_report()): users can't read the saved report column at all,
//    so the full report can't be fetched around the website. The moment they pay, it's the full one.
// Row Level Security: you only ever get your own tests.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { stripCosts } from "@/lib/stripCosts";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: row } = await auth.supabase
    .from("tests")
    .select("status, stage, progress, error, tier")
    .eq("id", id)
    .maybeSingle();
  if (!row) return jsonError("Test not found.", 404);

  const filesPrefix = `${auth.user.id}/tests/${id}`;
  if (row.status === "queued" || row.status === "running") {
    const p = (row.progress ?? {}) as { done?: number; total?: number; journey?: unknown };
    return NextResponse.json({
      status: "running",
      stage: row.status === "queued" ? "Waiting for a free worker" : (row.stage ?? "Starting"),
      progress: { done: p.done ?? 0, total: p.total ?? 100 },
      journey: p.journey ?? undefined,
      filesPrefix,
    });
  }
  const { data: report } = await auth.supabase.rpc("test_report", { p_id: id }); // full, or the trial preview
  const run = stripCosts(report) as Record<string, unknown> | null; // costs are private
  if (row.status === "error" && (!run || !("stats" in run))) {
    return NextResponse.json({ status: "error", error: row.error ?? "The test failed.", filesPrefix });
  }
  return NextResponse.json({ ...run, filesPrefix });
}
