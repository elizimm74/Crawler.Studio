// GET /api/tests/:id
//  - waiting/running: { status, stage, progress, journey, filesPrefix }  (for the live view)
//  - done/error:      the full report (Run) + filesPrefix
//    A FREE-TRIAL test whose owner hasn't paid yet gets the preview version (src/lib/preview.ts);
//    the moment they pay (any plan or pack), the same request returns the full report.
// Row Level Security: you only ever get your own tests.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { stripCosts } from "@/lib/stripCosts";
import { toPreview } from "@/lib/preview";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: row } = await auth.supabase
    .from("tests")
    .select("status, stage, progress, error, tier, data")
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
  const run = stripCosts(row.data) as Record<string, unknown> | null; // costs are private
  if (row.status === "error" && (!run || !("stats" in run))) {
    return NextResponse.json({ status: "error", error: row.error ?? "The test failed.", filesPrefix });
  }
  if (row.tier === "trial" && run && "stats" in run) {
    const { data: me } = await auth.supabase.rpc("my_plan");
    if (!(me as { paid?: boolean } | null)?.paid) return NextResponse.json({ ...toPreview(run), filesPrefix });
  }
  return NextResponse.json({ ...run, filesPrefix });
}
