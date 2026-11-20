// Cleans what the browser sends for a video test before it's saved.
// Never trust the browser: only the frames of YOUR saved analysis, known options, short text.
import { PLACEMENTS, PLATFORMS, type CreatorStats, type VideoBeat, type VideoInput, type VideoSettings } from "./types";

const str = (x: unknown, max = 200) => (typeof x === "string" ? x.slice(0, max) : "");
const oneOf = <T extends string>(x: unknown, options: readonly T[], fallback: T): T => (options.includes(x as T) ? (x as T) : fallback);
const num = (x: unknown, lo: number, hi: number) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};

export function cleanCreator(x: unknown, fallbackPlatform: VideoSettings["platform"]): CreatorStats | null {
  if (!x || typeof x !== "object") return null;
  const c = x as Partial<CreatorStats>;
  const recentViews = (Array.isArray(c.recentViews) ? c.recentViews : [])
    .map((v) => num(v, 0, 5e9))
    .filter((v): v is number => v !== null)
    .map(Math.round)
    .slice(0, 30);
  if (!recentViews.length) return null;
  const followers = num(c.followers, 0, 5e9);
  return {
    handle: str(c.handle, 60).replace(/[^\w.@-]/g, ""),
    platform: oneOf(c.platform, PLATFORMS, fallbackPlatform),
    followers: followers === null ? null : Math.round(followers),
    recentViews,
    source: c.source === "youtube" ? "youtube" : "entered",
  };
}

// input = the saved analysis's input (the frames and their times are the truth).
export function cleanVideoSettings(raw: Partial<VideoSettings>, input: VideoInput): VideoSettings {
  const byFile = new Map((Array.isArray(raw.beats) ? raw.beats : []).map((b: Partial<VideoBeat>) => [b?.file, b]));
  const platform = oneOf(raw.platform, PLATFORMS, input.platform);
  const price = num(raw.price, 0, 1e7);
  return {
    platform,
    placement: oneOf(raw.placement, PLACEMENTS, "organic"),
    duration: input.duration,
    beats: input.frames.map((file, i) => {
      const b = byFile.get(file) ?? {};
      return { file, t: input.times[i] ?? 0, shows: str(b.shows, 300), text: str(b.text, 300) };
    }),
    script: str(raw.script, 2000),
    caption: str(raw.caption, 500),
    creator: cleanCreator(raw.creator, platform),
    price: price ? Math.round(price * 100) / 100 : null,
  };
}
