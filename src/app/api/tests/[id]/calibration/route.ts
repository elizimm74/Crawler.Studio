// GET /api/tests/:id/calibration -> the latest calibration of YOUR test (after you added its real
// result) + the current global calibration. Reads only your own rows (RLS on calibration_runs).
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { data: rows, error } = await auth.supabase
    .from("calibration_runs")
    .select("created_at, engine, kind, stated_pct, raw_pct, shown_pct, loo_pct, real_pct, visitors, site_delta, error_pp, within_margin, used_in_fit")
    .eq("test_id", id)
    .eq("superseded", false)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    // database not upgraded yet (migration 0028): nothing to show, not an error for the person
    if (/relation|does not exist|schema cache/i.test(error.message)) return NextResponse.json({ row: null, state: null });
    return jsonError(error.message);
  }
  const { data: pub } = await auth.supabase.rpc("public_calibration");
  const state = (pub as { state?: unknown } | null)?.state ?? null;
  return NextResponse.json({ row: rows?.[0] ?? null, state });
}
