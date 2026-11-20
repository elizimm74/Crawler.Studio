// Shapes for VIDEO tests: a TikTok / Reel / Short / ad, judged by simulated viewers.
// The AI can't watch video, so the browser pulls ~12 still frames out of it (with their
// timestamps) and uploads them as JPEGs. Simulated viewers "scroll past" those frames in
// order, like a feed, and decide when they'd swipe away and whether they'd tap through.
// Sound is NOT heard: the founder can type what's said (the script) so viewers get it.
import type { CallCost, ObjectionCategory, Persona, ProductProfile, Audience } from "../types";

export const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube", "X"] as const;
export type Platform = (typeof PLATFORMS)[number];

// Who posts it: your own account, a creator you pay, or a paid ad ("Sponsored").
export const PLACEMENTS = ["organic", "creator", "ad"] as const;
export type Placement = (typeof PLACEMENTS)[number];
export const PLACEMENT_LABEL: Record<Placement, string> = {
  organic: "My own post",
  creator: "A creator posts it",
  ad: "A paid ad",
};

// One frame of the video and what's on it (the founder can correct it).
export type VideoBeat = {
  file: string; // "1.jpg"
  t: number; // seconds into the video
  shows: string; // what's on screen, one sentence
  text: string; // on-screen text / captions, copied ("" if none)
};

// The account that posts it: its usual views. Typed in by the founder, or read from
// YouTube's official API. We use the MEDIAN of recent videos (one viral hit doesn't skew it).
export type CreatorStats = {
  handle: string;
  platform: Platform;
  followers: number | null;
  recentViews: number[]; // views of recent videos (newest first), at most 30
  source: "entered" | "youtube";
};

// ---------- What the analyze step saves (crawls.data) ----------

export type VideoInput = { batch: string; frames: string[]; times: number[]; duration: number; platform: Platform };

export type VideoAnalysis = {
  kind: "video";
  input: VideoInput;
  filesPrefix: string; // "{userId}/uploads/{batch}"
  beats: VideoBeat[];
  hook: string; // what the first seconds promise, in plain words
  productFirstSeen: number; // seconds until the product/brand first shows (-1 = never)
  profile: ProductProfile; // the product the video promotes
  audience: Audience | null;
  suggestError?: string;
};

// ---------- Settings the founder confirms ----------

export type VideoSettings = {
  platform: Platform;
  placement: Placement;
  duration: number;
  beats: VideoBeat[];
  script: string; // what's said / the voiceover (optional, we can't hear audio)
  caption: string; // the post caption (optional)
  creator: CreatorStats | null; // the posting account's usual views (optional)
  price: number | null; // what the creator or the ad costs, in dollars (optional)
};

// ---------- One simulated viewer ----------

export const AFTER_TAP = ["try it", "maybe later", "not for me", "didn't tap"] as const;
export type AfterTap = (typeof AFTER_TAP)[number];

export type VideoVerdict = {
  personaId: string;
  sample: number;
  stopped: boolean; // stopped scrolling at all (passed the hook)
  leftAt: number; // the frame number (1-based) where they swiped away; 0 = watched to the end
  liked: boolean;
  shared: boolean; // would send it to a friend / repost
  tapped: boolean; // would tap through to the product (link, profile, "Learn more")
  afterTap: AfterTap; // once on the product, would they try it?
  objectionCategory: ObjectionCategory;
  objection: string; // why they swiped / didn't tap (or their small doubt)
  wouldChangeMind: string;
  quote: string; // what they'd comment, in their own voice
  firstGlance?: string;
  thought?: string;
};

export type VideoPersona = Persona & { sample: number; follows: boolean };

export type { CallCost };
