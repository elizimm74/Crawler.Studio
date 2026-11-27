// POST /api/video-crawls  { batch, frames, times, duration, platform }  ->  { crawlId }
// The browser already pulled still frames out of the video and uploaded them to the user's own
// folder (screenshots/{userId}/uploads/{batch}/1.jpg, ...). start_video_analyze checks the names,
// times, length, platform and rate limit, then queues an "analyze" job; a worker reads the frames.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { analyzeError } from "@/lib/planErrors";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { batch?: string; frames?: string[]; times?: number[]; duration?: number; platform?: string };
  if (!body.batch || !Array.isArray(body.frames) || !Array.isArray(body.times)) return jsonError("Please upload your video first.");
  const { data, error } = await auth.supabase.rpc("start_video_analyze", {
    p_batch: body.batch,
    p_frames: body.frames,
    p_meta: { times: body.times, duration: body.duration, platform: body.platform },
  });
  if (error) return analyzeError(error.message); // plan limits are checked by the database
  return NextResponse.json({ crawlId: data as string });
}
