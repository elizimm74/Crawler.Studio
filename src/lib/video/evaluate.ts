// VIDEO TESTS, step 3: simulated viewers scroll into the video and decide, frame by frame,
// whether to keep watching, then whether to like, share, and tap through to the product.
// ~25 viewers per Haiku call; the frames are prompt-cached, so later batches cost ~10%.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, assertNotRefused, HAIKU } from "../ai";
import { costOfCall } from "../cost";
import { profileToText } from "../suggest";
import { DECISION_STEPS } from "../mind";
import type { BlobStore } from "../blobs";
import { OBJECTION_CATEGORIES, type CallCost, type ProductProfile } from "../types";
import { describeVideoPersona } from "./personas";
import { normalizeVideo } from "./aggregate";
import { AFTER_TAP, type VideoPersona, type VideoSettings, type VideoVerdict } from "./types";

const BATCH_SIZE = 25;
const PARALLEL = 4;

const BatchSchema = z.object({
  results: z.array(
    z.object({
      persona_id: z.string(),
      first_glance: z.string(),
      thought: z.string(),
      stopped_scrolling: z.boolean(),
      swiped_at_frame: z.number(),
      liked: z.boolean(),
      shared: z.boolean(),
      tapped_through: z.boolean(),
      after_tap: z.enum(AFTER_TAP),
      objection_category: z.enum(OBJECTION_CATEGORIES),
      objection: z.string(),
      would_change_mind: z.string(),
      quote: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `You simulate real people scrolling a short-video feed (TikTok, Instagram Reels, YouTube Shorts...). A video that promotes a product comes up.
You see the video as still frames in order (with timestamps), what's said in it (if the founder typed it; you can't hear audio), the caption, how it's posted, and a list of personas. For EACH persona, stay fully in character and decide honestly.

Watch it like a real person with a moving thumb:
- stopped_scrolling: in the first second or two, does the first frame make this person stop? Most people scroll past most videos. A clear, surprising or relatable opening stops them; a slow intro, an obvious ad look, or something irrelevant to them does not.
- swiped_at_frame: if they stopped, the frame number where they got bored or annoyed and swiped away. 0 = watched to the end. Long setups, a product that only appears at the end, unreadable text, and a hard sell all lose people.
- liked: would they tap like. shared: would they actually send it to a friend or repost it (rare: only if it's funny, useful or says something about them).
- tapped_through: would they tap the link, profile or "Learn more" to look at the product? Only if they're curious enough to leave the feed. Most people don't.
- after_tap: if they tapped, once they see the product: "try it" (sign up / download / buy now), "maybe later", or "not for me". If they didn't tap: "didn't tap".

Be realistic, not polite:
- People can't skip back to understand a confusing video; they just leave. Paid ads ("Sponsored") start with less trust. A creator they follow gets more patience, but a forced or fake-sounding promo loses that trust.
- Use each persona's details: age and what they care about decide what's relevant; budget and mindset decide whether they'd pay; patience decides how long they give it; what they use now sets the bar to switch.

For each persona also return:
- objection_category: the single best match for why they swiped or didn't try it ("unclear value" if the video didn't make the product clear; "not for me" if it's irrelevant to them). For people who'd try it: "none".
- objection: one sentence, pointing at something specific in the video (a frame, a line, the length...).
- would_change_mind: the one specific change to the video that would have kept or won them.
- quote: the comment they'd write (or think) under the video, short, in their own voice and slang for their age. No marketing speak, no hashtags.
${DECISION_STEPS}
(Here, first_glance is what they notice in the FIRST frame.)

Return one result per persona, using their exact persona_id, with first_glance and thought before the decisions.`;

const PLACEMENT_TEXT = {
  organic: "Posted by the brand's own account (a normal post, not an ad).",
  creator: "Posted by a creator as a paid partnership (marked as a paid partnership / #ad).",
  ad: "Shown as a paid ad, marked 'Sponsored', with a button like 'Learn more'.",
} as const;

export type VideoEvalInput = {
  settings: VideoSettings;
  profile: ProductProfile;
  personas: VideoPersona[];
  store: BlobStore;
  framesPrefix: string;
  onProgress: (done: number, total: number) => void;
};

export async function evaluateVideo(input: VideoEvalInput): Promise<{ verdicts: VideoVerdict[]; costs: CallCost[] }> {
  const content = await buildContent(input);
  const batches: VideoPersona[][] = [];
  for (let i = 0; i < input.personas.length; i += BATCH_SIZE) batches.push(input.personas.slice(i, i + BATCH_SIZE));
  const verdicts: VideoVerdict[] = [];
  const costs: CallCost[] = [];
  let done = 0;
  const runBatch = async (batch: VideoPersona[], index: number) => {
    const r = await evaluateBatch(content, batch, `video batch ${index + 1}`, input.settings.beats.length);
    verdicts.push(...r.verdicts);
    costs.push(...r.costs);
    done += batch.length;
    input.onProgress(done, input.personas.length);
  };
  // The first batch alone fills the cache, then the rest in parallel.
  if (batches.length) await runBatch(batches[0], 0);
  for (let i = 1; i < batches.length; i += PARALLEL) {
    await Promise.all(batches.slice(i, i + PARALLEL).map((b, j) => runBatch(b, i + j)));
  }
  return { verdicts, costs };
}

async function buildContent(input: VideoEvalInput): Promise<Anthropic.ContentBlockParam[]> {
  const { settings } = input;
  const n = settings.beats.length;
  const blocks: Anthropic.ContentBlockParam[] = [
    { type: "text", text: `=== THE VIDEO: ${Math.round(settings.duration)} seconds on ${settings.platform}, shown as ${n} frames in order ===` },
  ];
  for (const [i, b] of settings.beats.entries()) {
    const data = await input.store.get(`${input.framesPrefix}/${b.file}`).catch(() => null);
    blocks.push({ type: "text", text: `Frame ${i + 1} of ${n} at ${b.t.toFixed(1)}s:` });
    if (data) blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") } });
  }
  const frameList = settings.beats.map((b, i) => `${i + 1}. ${b.t.toFixed(1)}s: ${b.shows}${b.text ? ` On-screen text: "${b.text}"` : ""}`).join("\n");
  blocks.push({
    type: "text",
    text:
      `=== FRAME NOTES (checked by the founder) ===\n${frameList}\n\n` +
      `=== WHAT'S SAID (voiceover / dialogue, typed by the founder) ===\n${settings.script || "(not given: judge only what you can see)"}\n\n` +
      `=== CAPTION ===\n${settings.caption || "(none)"}\n\n` +
      `=== HOW IT'S POSTED ===\n${PLACEMENT_TEXT[settings.placement]}` +
      (settings.creator?.handle ? ` Account: ${settings.creator.handle}.` : "") +
      `\n\n=== THE PRODUCT IT PROMOTES ===\n${profileToText(input.profile)}`,
    cache_control: { type: "ephemeral" },
  });
  return blocks;
}

async function evaluateBatch(content: Anthropic.ContentBlockParam[], batch: VideoPersona[], label: string, frames: number) {
  const costs: CallCost[] = [];
  const byId = new Map(batch.map((p) => [p.id, p]));
  const found = new Map<string, VideoVerdict>();
  for (let attempt = 1; attempt <= 2 && found.size < batch.length; attempt++) {
    const todo = batch.filter((p) => !found.has(p.id));
    try {
      const response = await anthropic.messages.parse({
        model: HAIKU,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        output_config: { effort: "low", format: zodOutputFormat(BatchSchema) },
        messages: [{ role: "user", content: [...content, { type: "text", text: `Personas (${todo.length}):\n${todo.map(describeVideoPersona).join("\n")}` }] }],
      });
      costs.push(costOfCall(attempt === 1 ? label : `${label} retry`, response.model, response.usage));
      assertNotRefused(response.stop_reason, label);
      for (const r of response.parsed_output?.results ?? []) {
        const p = byId.get(r.persona_id);
        if (!p || found.has(r.persona_id)) continue;
        found.set(r.persona_id, normalizeVideo(r, p, frames));
      }
    } catch (err) {
      console.error(`[${label}] attempt ${attempt} failed:`, (err as Error).message);
      if (attempt === 2) throw err;
    }
  }
  if (found.size < batch.length) console.warn(`[${label}] ${batch.length - found.size} viewers had no answer; skipped.`);
  return { verdicts: [...found.values()], costs };
}
