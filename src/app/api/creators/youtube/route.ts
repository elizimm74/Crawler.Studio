// GET /api/creators/youtube?handle=@name -> { handle, title, followers, recentViews, source: "youtube" }
// Uses YouTube's OFFICIAL Data API (free, needs YOUTUBE_API_KEY on the server). Only public numbers:
// subscriber count and the view counts of the channel's ~15 latest uploads. Videos younger than
// 2 days are skipped (their views are still climbing). Signed-in users only.
// TikTok and Instagram have no open API for this, and scraping them breaks their rules, so for
// those the founder types the numbers in.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";

const API = "https://www.googleapis.com/youtube/v3";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return jsonError("YouTube lookup isn't switched on yet. Type the recent views in instead.", 501);

  const raw = new URL(req.url).searchParams.get("handle")?.trim() ?? "";
  const handle = raw.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/\/.*$/, "");
  if (!/^@?[A-Za-z0-9._-]{3,30}$/.test(handle)) return jsonError("That doesn't look like a YouTube handle, e.g. @creatorname.");
  const at = handle.startsWith("@") ? handle : `@${handle}`;

  try {
    const get = async (path: string, params: Record<string, string>) => {
      const res = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key })}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`YouTube said ${res.status}`);
      return res.json();
    };
    const ch = await get("channels", { part: "snippet,statistics,contentDetails", forHandle: at });
    const channel = ch.items?.[0];
    if (!channel) return jsonError(`No YouTube channel found for ${at}.`, 404);
    const uploads = channel.contentDetails?.relatedPlaylists?.uploads as string | undefined;
    let recentViews: number[] = [];
    if (uploads) {
      const list = await get("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: "15" });
      const ids = (list.items ?? []).map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId).join(",");
      if (ids) {
        const vids = await get("videos", { part: "statistics,snippet", id: ids });
        const twoDays = Date.now() - 2 * 864e5;
        recentViews = (vids.items ?? [])
          .filter((v: { snippet: { publishedAt: string } }) => new Date(v.snippet.publishedAt).getTime() < twoDays)
          .map((v: { statistics: { viewCount?: string } }) => Number(v.statistics.viewCount ?? 0))
          .filter((n: number) => Number.isFinite(n));
      }
    }
    const subs = channel.statistics?.hiddenSubscriberCount ? null : Number(channel.statistics?.subscriberCount ?? NaN);
    return NextResponse.json({
      handle: at,
      title: String(channel.snippet?.title ?? at).slice(0, 80),
      followers: Number.isFinite(subs) ? subs : null,
      recentViews: recentViews.slice(0, 30),
      source: "youtube",
    });
  } catch {
    return jsonError("Couldn't reach YouTube right now. Type the recent views in instead.", 502);
  }
}
