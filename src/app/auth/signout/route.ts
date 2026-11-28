// POST /auth/signout: signs out, then goes to the landing page.
// Sign-out buttons must be a <form method="post">, never a plain link: browsers can open links
// in the background (prefetch), which would sign people out by accident.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (AUTH_ENABLED) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL("/?home=1", request.url), { status: 303 });
}

// Someone typed or bookmarked the address: don't show a "405" error page, show the
// settings page, which has a working Sign out button.
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/settings", request.url), { status: 303 });
}
