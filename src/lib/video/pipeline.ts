// Runs one VIDEO test from start to finish (the worker calls this):
//   viewers (code, 3 crowds) -> watch the frames (Haiku) -> count (code)
//   -> view range + deal check (code, only with the account's real numbers) -> fixes + hooks (Sonnet)
import { logRunCost } from "../cost";
import type { BlobStore } from "../blobs";
import type { Audience, CallCost, ProductProfile } from "../types";
import { answerQuality, type Quality } from "../quality";
import { generateVideoPersonas, SAMPLES } from "./personas";
import { evaluateVideo } from "./evaluate";
import { aggregateVideo, estimateViews, type VideoStats, type ViewEstimate } from "./aggregate";
import { writeVideoAdvice, type VideoAdvice } from "./report";
import type { VideoPersona, VideoSettings, VideoVerdict } from "./types";

export type VideoRun = {
  kind: "video";
  id: string;
  userId?: string;
  crawlId: string;
  url: string; // "video://{batch}"
  createdAt: string;
  profile: ProductProfile;
  audience: Audience;
  settings: VideoSettings;
  framesPrefix: string; // "{userId}/uploads/{batch}"
  seed: number;
  status: "running" | "done" | "error";
  stage: string;
  progress: { done: number; total: number };
  error?: string;
  personas: VideoPersona[];
  verdicts: VideoVerdict[];
  stats?: VideoStats;
  views?: ViewEstimate | null;
  quality?: Quality;
  advice?: VideoAdvice;
  costs: CallCost[];
  totalCostUsd?: number;
};

export type VideoRunInput = {
  id: string;
  userId?: string;
  crawlId: string;
  url: string;
  framesPrefix: string;
  settings: VideoSettings;
  profile: ProductProfile;
  audience: Audience;
  perSample: number;
  seed?: number;
};

export async function runVideoTest(input: VideoRunInput, hooks: { store: BlobStore; onChange: (run: VideoRun) => void }): Promise<VideoRun> {
  const seed = input.seed ?? Math.floor(Math.random() * 1e9);
  const personas = generateVideoPersonas(input.audience, input.settings.placement, input.settings.platform, input.perSample, seed);
  const run: VideoRun = {
    kind: "video",
    id: input.id,
    userId: input.userId,
    crawlId: input.crawlId,
    url: input.url,
    createdAt: new Date().toISOString(),
    profile: input.profile,
    audience: input.audience,
    settings: input.settings,
    framesPrefix: input.framesPrefix,
    seed,
    status: "running",
    stage: "Viewers are scrolling into your video",
    progress: { done: 0, total: personas.length },
    personas,
    verdicts: [],
    costs: [],
  };
  const changed = () => hooks.onChange(run);
  changed();
  try {
    const { verdicts, costs } = await evaluateVideo({
      settings: input.settings,
      profile: input.profile,
      personas,
      store: hooks.store,
      framesPrefix: input.framesPrefix,
      onProgress: (done, total) => {
        run.progress = { done, total };
        changed();
      },
    });
    run.verdicts = verdicts;
    run.costs.push(...costs);

    run.stage = "Crunching the numbers";
    changed();
    run.stats = aggregateVideo(input.settings.beats, input.settings.duration, personas, verdicts, SAMPLES);
    run.views = estimateViews(run.stats.signal, input.settings.creator);
    run.quality = answerQuality(verdicts.map((v) => ({ quote: v.quote, objection: v.objection, verdict: v.afterTap })));

    run.stage = "Writing your fixes";
    changed();
    const { advice, cost } = await writeVideoAdvice(input.settings, input.profile, run.stats);
    run.advice = advice;
    run.costs.push(cost);
    run.totalCostUsd = logRunCost(run.id, run.costs);
    run.status = "done";
    run.stage = "Done";
  } catch (err) {
    run.status = "error";
    run.error = (err as Error).message;
    console.error(`[video run ${run.id}] failed:`, err);
    if (run.costs.length) run.totalCostUsd = logRunCost(run.id, run.costs);
  }
  return run;
}
