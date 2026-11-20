// Long onboarding flows (Cal AI-style, 30+ screens) are read in chunks, because one AI request can
// hold only so many images. Pure helpers (no AI), so the bench can check them.
export const MAX_SCREENS = 100; // the AI accepts at most 100 images per request; A + B together stay under it
export const MAX_SCREENS_B = 5;
export const MAX_SCREENS_A = MAX_SCREENS - MAX_SCREENS_B;
export const SINGLE_CALL_MAX = 15; // up to this many screens (A + B) are read in one call, like before
export const CHUNK = 12; // screens labelled per call for longer flows

export function chunkList<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// A spread-out sample (start, middle, end) for the product-profile call: the profile doesn't need
// all 90 screens. Keeps the order, never repeats a screen.
export function sampleSpread<T>(items: T[], want = 14): T[] {
  if (items.length <= want) return items;
  const head = Math.ceil(want * 0.5);
  const tail = Math.floor(want * 0.3);
  const mid = want - head - tail;
  const pick = new Set<number>();
  for (let i = 0; i < head; i++) pick.add(i);
  for (let i = 0; i < tail; i++) pick.add(items.length - 1 - i);
  for (let i = 1; i <= mid; i++) pick.add(Math.round(head + ((items.length - head - tail) * i) / (mid + 1)));
  return [...pick].sort((a, b) => a - b).map((i) => items[i]);
}
