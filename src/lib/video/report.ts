// VIDEO TESTS, step 5: Sonnet turns the COUNTED results into fixes, new hooks and an honest
// "why it will / won't spread". It never sees every raw answer, and how many viewers each fix
// could win back is counted in code (each reason is credited to one fix only).
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, assertNotRefused, SONNET } from "../ai";
import { costOfCall } from "../cost";
import { profileToText } from "../suggest";
import { OBJECTION_CATEGORIES, type CallCost, type ProductProfile } from "../types";
import type { VideoStats } from "./aggregate";
import { PLACEMENT_LABEL, type VideoSettings } from "./types";

const AdviceSchema = z.object({
  summary: z.string(),
  spreads: z.array(z.string()), // what helps it spread
  stalls: z.array(z.string()), // what holds it back
  fixes: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      change: z.string(),
      frame: z.number(), // the frame it changes (0 = the whole video)
      addresses: z.array(z.enum(OBJECTION_CATEGORIES)),
    }),
  ),
  hooks: z.array(z.string()), // new opening lines
  captions: z.array(z.string()),
  cta: z.string(),
});

export type VideoFix = z.infer<typeof AdviceSchema>["fixes"][number] & { couldWin: number };
export type VideoAdvice = Omit<z.infer<typeof AdviceSchema>, "fixes"> & { fixes: VideoFix[] };

export async function writeVideoAdvice(settings: VideoSettings, profile: ProductProfile, stats: VideoStats): Promise<{ advice: VideoAdvice; cost: CallCost }> {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const r = (x: { mid: number; low: number; high: number }) => `${pct(x.mid)} (range ${pct(x.low)}–${pct(x.high)})`;
  const summary = {
    viewersPerCrowd: stats.perSample,
    crowds: stats.samples,
    stoppedScrolling: r(stats.hook),
    watchedToEnd: r(stats.finish),
    averageWatched: pct(stats.avgWatchPct),
    wouldShare: r(stats.share),
    tappedThrough: r(stats.tap),
    wouldTryProduct: r(stats.tryIt),
    watchCurve: stats.curve.map((c) => ({ frame: c.n, at: `${c.t.toFixed(1)}s`, stillWatching: pct(c.watching), swipedHere: c.left })),
    reasons: stats.objections.map((o) => ({ category: o.category, count: o.count, early: o.early, examples: o.examples.slice(0, 5), wouldChangeMind: o.changeMind.slice(0, 5) })),
    tapRateByAge: stats.byAge.map((s) => `${s.name}: ${pct(s.tapRate)} of ${s.viewers}`),
  };

  const response = await anthropic.beta.messages.parse({
    model: SONNET,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AdviceSchema) },
    messages: [
      {
        role: "user",
        content:
          `You are a sharp short-form video strategist (TikTok, Reels, Shorts, paid social) advising a small founder.\n` +
          `Simulated viewers watched their ${Math.round(settings.duration)}s ${settings.platform} video (${PLACEMENT_LABEL[settings.placement]}). Here is the video and the counted results.\n\n` +
          `PRODUCT:\n${profileToText(profile)}\n\n` +
          `FRAMES:\n${settings.beats.map((b, i) => `${i + 1}. ${b.t.toFixed(1)}s: ${b.shows}${b.text ? ` Text: "${b.text}"` : ""}`).join("\n")}\n\n` +
          `WHAT'S SAID: ${settings.script || "(not given)"}\nCAPTION: ${settings.caption || "(none)"}\n\n` +
          `RESULTS (JSON):\n${JSON.stringify(summary, null, 1)}\n\n` +
          `Write:\n` +
          `- summary: ONE sentence (max 30 words): the biggest problem and what to do.\n` +
          `- spreads: 2-3 short reasons this video could get pushed and shared (max 14 words each), only if the results support them.\n` +
          `- stalls: 2-3 short reasons it would stall (max 14 words each), pointing at specific frames or seconds.\n` +
          `- fixes: 3-5 specific edits, biggest impact first, no overlap. title max 8 words, problem max 20 words, change: ONE concrete edit, max 30 words. ` +
          `frame: the frame number it changes (0 = whole video). addresses: reason categories from the results that it solves.\n` +
          `- hooks: 3 rewritten opening lines for the first 2 seconds (max 10 words each), on-screen-text style.\n` +
          `- captions: 2 rewritten captions (max 20 words, no hashtag spam).\n` +
          `- cta: one clear call to action for the end (max 8 words).\n` +
          `Be blunt and specific to THIS video. Never promise virality or invent numbers. Never suggest fake urgency, fake reviews or misleading claims.`,
      },
    ],
  });
  assertNotRefused(response.stop_reason, "video report");
  const raw = response.parsed_output;
  if (!raw) throw new Error("The report came back in the wrong format.");

  const claimed = new Set<string>();
  const remaining = [...raw.fixes];
  const fixes: VideoFix[] = [];
  const gain = (f: (typeof remaining)[number]) => {
    const groups = stats.objections.filter((o) => f.addresses.includes(o.category) && !claimed.has(o.category));
    return { couldWin: groups.reduce((s, o) => s + o.count, 0), cats: groups.map((o) => o.category) };
  };
  while (remaining.length) {
    remaining.sort((x, y) => gain(y).couldWin - gain(x).couldWin);
    const best = remaining.shift()!;
    const g = gain(best);
    g.cats.forEach((c) => claimed.add(c));
    fixes.push({ ...best, frame: Math.max(0, Math.min(settings.beats.length, Math.round(best.frame))), couldWin: g.couldWin });
  }
  return { advice: { ...raw, fixes }, cost: costOfCall("video report", response.model, response.usage) };
}
