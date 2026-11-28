// POST /api/crawls  { url, kind?: "website" | "store" }  ->  { crawlId }
//                  { kind: "idea", idea: { name, pitch, who?, price?, how?, alternatives? } }  (no website yet)
// Queues an "analyze" job. A worker crawls the site; the browser checks
// GET /api/crawls/:id until it's done.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { analyzeError } from "@/lib/planErrors";
import { normalizeUrl } from "@/lib/normalizeUrl";
import { cleanIdea } from "@/lib/idea";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { url?: string; kind?: string; idea?: unknown };

  // An idea: no website to open. The words are checked here AND by the database.
  if (body.kind === "idea") {
    const { idea, problem } = cleanIdea(body.idea);
    if (!idea) return jsonError(problem);
    const { data, error } = await auth.supabase.rpc("start_idea_analyze", { p_idea: idea });
    if (error) return analyzeError(error.message);
    return NextResponse.json({ crawlId: data as string });
  }

  const url = normalizeUrl(body.url);
  if (!url) return jsonError("Please enter a valid website address.");

  // start_analyze checks the rate limit and creates the crawl + job together.
  const kind = body.kind === "store" ? "store" : "website"; // a store crawl goes product page -> cart
  const { data, error } = await auth.supabase.rpc("start_analyze", { p_url: url, p_kind: kind });
  if (error) return analyzeError(error.message); // plan limits are checked by the database
  return NextResponse.json({ crawlId: data as string });
}
