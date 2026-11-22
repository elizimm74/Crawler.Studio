// POST /api/crawls  { url, kind?: "website" | "store" }  ->  { crawlId }
// Queues an "analyze" job. A worker crawls the site; the browser checks
// GET /api/crawls/:id until it's done.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { normalizeUrl } from "@/lib/normalizeUrl";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { url?: string; kind?: string };
  const url = normalizeUrl(body.url);
  if (!url) return jsonError("Please enter a valid website address.");

  // start_analyze checks the rate limit and creates the crawl + job together.
  const kind = body.kind === "store" ? "store" : "website"; // a store crawl goes product page -> cart
  const { data, error } = await auth.supabase.rpc("start_analyze", { p_url: url, p_kind: kind });
  if (error) return jsonError(error.message, 429);
  return NextResponse.json({ crawlId: data as string });
}
