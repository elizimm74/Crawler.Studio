// A Supabase connection with the SECRET key, which skips Row Level Security.
// Used by the WORKER, and by exactly ONE web route: the Stripe webhook
// (src/app/api/stripe/webhook), which must add purchased tests. Never import it
// anywhere else in the web app (pages, components, other API routes).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

export function supabaseAdmin() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is missing (needed by the worker and the Stripe webhook).");
  return createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
