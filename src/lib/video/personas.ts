// Simulated VIEWERS for video tests. Same people-builder as websites (varied, built in code from
// the audience, free), plus how they meet the video: scrolling a feed, following the account or not.
// 3 crowds (samples) so the report shows an honest range instead of one lucky number.
import { generatePersonas, makeRandom } from "../personas";
import { describeMind, simulateMind } from "../mind";
import type { Audience } from "../types";
import type { Placement, Platform, VideoPersona } from "./types";

export const SAMPLES = 3;

// ASSUMPTIONS (starting guesses): how many viewers already follow the posting account,
// and how patient people are in a fast feed. Teens skim faster.
const FOLLOW_SHARE: Record<Placement, number> = { organic: 0.25, creator: 0.35, ad: 0 };
const PATIENCE = {
  low: "low: thumb already moving, gives a video about a second",
  medium: "medium: gives it a few seconds if the start is interesting",
  high: "high: watches to the end when it's relevant to them",
};

export function generateVideoPersonas(audience: Audience, placement: Placement, platform: Platform, perSample: number, seed: number): VideoPersona[] {
  const all: VideoPersona[] = [];
  for (let s = 0; s < SAMPLES; s++) {
    const sampleSeed = seed + s * 7919;
    const rand = makeRandom(sampleSeed ^ 0x2c1b3c6d);
    for (const p of generatePersonas(audience, perSample, sampleSeed)) {
      const follows = rand() < FOLLOW_SHARE[placement];
      const r = rand();
      const low = p.age < 18 ? 0.5 : 0.35;
      const arrivedFrom = placement === "ad" ? `a sponsored post in their ${platform} feed` : follows ? `their ${platform} feed (follows the account)` : `their ${platform} For You feed`;
      all.push({
        ...p,
        id: `S${s + 1}-${p.id}`,
        device: platform === "YouTube" && rand() < 0.4 ? "laptop" : "phone",
        arrivedFrom,
        patience: r < low ? PATIENCE.low : r < low + 0.4 ? PATIENCE.medium : PATIENCE.high,
        sample: s,
        follows,
        mind: simulateMind({ ...p, arrivedFrom }, rand),
      });
    }
  }
  return all;
}

export function describeVideoPersona(p: VideoPersona): string {
  const parts = [
    `${p.id}: ${p.age}yo ${p.gender}`,
    `${p.area} ${p.country}`,
    p.occupation,
    `${p.budget} budget`,
    p.mindset,
    `tech comfort ${p.techComfort}`,
    `currently uses: ${p.currentSolution}`,
    `watching on a ${p.device}`,
    `sees it in ${p.arrivedFrom}`,
    `patience ${p.patience}`,
    ...describeMind(p.mind ?? {}),
  ];
  if (p.role) parts.push(`role ${p.role} at a ${p.companySize}-person ${p.industry} company`);
  return parts.join(", ");
}
