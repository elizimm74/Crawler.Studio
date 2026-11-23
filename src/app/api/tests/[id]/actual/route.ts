// POST /api/tests/:id/actual { realPct } -> the founder's REAL conversion rate for this test.
// It powers the public accuracy page (prediction vs reality, anonymous).
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { realPct?: number; visitors?: number; days?: number };
  const pct = Number(body.realPct);
  if (!Number.isFinite(pct)) return jsonError("Please enter a number from 0 to 100.");
  // optional detail (migration 0020): whole numbers in range, or left out
  const whole = (v: unknown, max: number) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= max ? Number(v) : undefined);
  const visitors = whole(body.visitors, 100_000_000);
  const days = whole(body.days, 3650);
  let { error } = await auth.supabase.rpc("submit_actual", { p_test_id: id, p_real_pct: pct, ...(visitors ? { p_visitors: visitors } : {}), ...(days ? { p_days: days } : {}) });
  // database not upgraded yet (0020 not applied): save the percentage the old way
  if (error && (visitors || days) && /function|parameter|schema cache/i.test(error.message)) {
    ({ error } = await auth.supabase.rpc("submit_actual", { p_test_id: id, p_real_pct: pct }));
  }
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
