// POST /api/account/delete { confirm: "DELETE" } -> permanently deletes the signed-in account.
// Order matters:
//   1. refuse while a paid plan is still active (so nobody keeps being charged)
//   2. delete_my_account() (migration 0021): deletes the login; all rows go with it (cascade),
//      keeping only a one-way email hash so the free test can't be claimed twice. If this fails,
//      NOTHING has been deleted.
//   3. sign out, then remove the person's stored files (screenshots, uploads) under {their id}/
// Step 3 uses the service key (users can't delete storage files themselves), and ONLY for this
// person's own folder, after their login was checked.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "screenshots";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== "DELETE") return jsonError('Type DELETE to confirm.');

  const { data: active } = await auth.supabase
    .from("subscriptions")
    .select("id")
    .in("status", ["active", "trialing", "past_due"])
    .eq("cancel_at_period_end", false)
    .limit(1);
  if (active?.length) return jsonError("Cancel your plan in Manage billing first, then delete your account.", 409);

  const uid = auth.user.id;
  // 1) delete the account first: if this fails, nothing else has been touched
  const { error } = await auth.supabase.rpc("delete_my_account");
  if (error) {
    console.error("[account/delete]", error.message);
    return jsonError(/cancel your plan/i.test(error.message) ? error.message : "Couldn't delete your account right now. Nothing was deleted. Please try again.", 400);
  }
  await auth.supabase.auth.signOut().catch(() => null);

  // 2) then their stored files (the account is already gone; a failure here is logged and retried by hand)
  try {
    const admin = supabaseAdmin();
    const files: string[] = [];
    const walk = async (prefix: string, depth: number) => {
      if (depth > 4 || files.length > 20_000) return;
      for (let offset = 0; ; offset += 1000) {
        const { data, error: e } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
        if (e || !data?.length) break;
        for (const item of data) {
          const p = `${prefix}/${item.name}`;
          if (item.id) files.push(p); // a file
          else await walk(p, depth + 1); // a folder
        }
        if (data.length < 1000) break;
      }
    };
    await walk(uid, 0);
    for (let i = 0; i < files.length; i += 500) await admin.storage.from(BUCKET).remove(files.slice(i, i + 500));
  } catch (err) {
    console.error("[account/delete] files left for", uid, (err as Error).message);
  }
  return NextResponse.json({ ok: true });
}
