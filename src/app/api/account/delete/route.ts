// POST /api/account/delete { confirm: "DELETE" } -> permanently deletes the signed-in account.
// Order matters:
//   1. refuse while a paid plan is still active (so nobody keeps being charged)
//   2. remove the person's stored files (screenshots, uploads) under {their id}/
//   3. delete_my_account() (migration 0021): deletes the login; all rows go with it (cascade),
//      keeping only a one-way email hash so the free test can't be claimed twice
//   4. sign out
// Step 2 uses the service key (users can't delete storage files themselves), and ONLY for this
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
  try {
    const admin = supabaseAdmin();
    const files: string[] = [];
    const walk = async (prefix: string, depth: number) => {
      if (depth > 4 || files.length > 20_000) return;
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
        if (error || !data?.length) break;
        for (const item of data) {
          const path = `${prefix}/${item.name}`;
          if (item.id) files.push(path); // a file
          else await walk(path, depth + 1); // a folder
        }
        if (data.length < 1000) break;
      }
    };
    await walk(uid, 0);
    for (let i = 0; i < files.length; i += 500) await admin.storage.from(BUCKET).remove(files.slice(i, i + 500));
  } catch (err) {
    // files couldn't be removed (e.g. no service key): stop, so we never leave files without an owner
    console.error("[account/delete] files", (err as Error).message);
    return jsonError("Couldn't delete your files right now, so nothing was deleted. Please try again or contact us.", 502);
  }

  const { error } = await auth.supabase.rpc("delete_my_account");
  if (error) return jsonError(error.message, 400);
  await auth.supabase.auth.signOut().catch(() => null);
  return NextResponse.json({ ok: true });
}
