// VIDEO TESTS, step 1: read the frames (one cheap Haiku call).
//   - describe every frame (what's on screen + on-screen text)
//   - what the first seconds promise (the hook) and when the product first shows
//   - the product the video promotes + a guess at who it's for
// The founder checks and corrects all of it on the Review step.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, assertNotRefused, HAIKU, requireApiKey } from "../ai";
import { costOfCall } from "../cost";
import { AudienceFields, AUDIENCE_INSTRUCTIONS, toAudience } from "../suggest";
import type { BlobStore } from "../blobs";
import type { Audience, CallCost, ProductProfile } from "../types";
import type { VideoBeat, VideoInput } from "./types";

const ReadSchema = z.object({
  frames: z.array(z.object({ n: z.number(), shows: z.string(), text: z.string() })),
  hook: z.string(),
  product_first_frame: z.number(),
  whatItIs: z.string(),
  whoItsFor: z.string(),
  mainPromise: z.string(),
  proof: z.array(z.string()),
  friction: z.array(z.string()),
  ...AudienceFields,
});

export type VideoReading = { beats: VideoBeat[]; hook: string; productFirstSeen: number; profile: ProductProfile; audience: Audience; costs: CallCost[] };

export async function readVideo(input: VideoInput, files: { store: BlobStore; prefix: string }): Promise<VideoReading> {
  requireApiKey();
  const content: Anthropic.ContentBlockParam[] = [];
  for (const [i, f] of input.frames.entries()) {
    const data = await files.store.get(`${files.prefix}/${f}`);
    if (!data) throw new Error(`Couldn't open frame ${i + 1}. Please upload the video again.`);
    content.push({ type: "text", text: `Frame ${i + 1} at ${input.times[i]?.toFixed(1)}s:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") } });
  }
  content.push({
    type: "text",
    text:
      `These are ${input.frames.length} still frames, in order, from a ${Math.round(input.duration)}-second short video for ${input.platform}. ` +
      `It promotes a product. You can't hear the audio.\n\n` +
      `PART 1, for EVERY frame (n = 1, 2, ...): shows = one plain sentence about what's on screen; ` +
      `text = on-screen text or captions copied exactly ("" if none).\n` +
      `PART 2: hook = what the first 1-2 seconds promise or tease, in plain words. ` +
      `product_first_frame = the frame number where the product, app or brand first appears (0 if it never does).\n` +
      `PART 3, the product the video promotes, only from what the frames show: whatItIs, whoItsFor, mainPromise (one sentence each); ` +
      `proof = ratings, numbers, reviews or testimonials shown; friction = things in the video that could make viewers doubt or skip ` +
      `(e.g. "product only appears at the end", "no price", "text too small to read").\n` +
      `PART 4: the most likely target customer. Fill in every field.\n${AUDIENCE_INSTRUCTIONS}`,
  });
  const res = await anthropic.messages.parse({
    model: HAIKU,
    max_tokens: 6000,
    output_config: { effort: "low", format: zodOutputFormat(ReadSchema) },
    messages: [{ role: "user", content }],
  });
  const costs = [costOfCall("read video", res.model, res.usage)];
  assertNotRefused(res.stop_reason, "read video");
  const r = res.parsed_output;
  if (!r) throw new Error("The video reading came back in the wrong format.");

  // Our frame order and times are the truth; match the AI's notes by number.
  const beats: VideoBeat[] = input.frames.map((file, i) => {
    const f = r.frames.find((x) => Math.round(x.n) === i + 1) ?? (r.frames.length === input.frames.length ? r.frames[i] : undefined);
    return { file, t: input.times[i] ?? 0, shows: f?.shows ?? "", text: f?.text ?? "" };
  });
  const pf = Math.round(r.product_first_frame);
  const profile: ProductProfile = {
    goal: "sign up",
    whatItIs: r.whatItIs,
    whoItsFor: r.whoItsFor,
    mainPromise: r.mainPromise,
    prices: [],
    proof: r.proof,
    friction: r.friction,
    tryTask: "",
  };
  return {
    beats,
    hook: r.hook,
    productFirstSeen: pf >= 1 && pf <= input.frames.length ? (input.times[pf - 1] ?? -1) : -1,
    profile,
    audience: toAudience(r),
    costs,
  };
}
