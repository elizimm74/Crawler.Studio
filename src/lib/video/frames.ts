// Which moments of a video become still frames for the simulated viewers.
// Pure (no browser), so the bench can check it. The first seconds decide whether people
// stop scrolling, so the start is sampled densely; the rest is spread evenly.
//   - always a frame at 0.3s (what people see first; 0.0 is often black)
//   - then 1.5s and 3s (the hook)
//   - then evenly to just before the end, 6 to 12 frames in total (more for longer videos)
//   - long videos (YouTube) are sampled over their first 3 minutes only: viewers decide there
export const MAX_FRAMES = 12;
export const MAX_SAMPLED_SECONDS = 180;

export function frameTimes(duration: number): number[] {
  const d = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (d < 0.6) return [0, Math.max(0.1, Math.round((d / 2) * 10) / 10)];
  const span = Math.min(d, MAX_SAMPLED_SECONDS);
  const total = Math.max(2, Math.min(MAX_FRAMES, Math.round(span / 3) + 4));
  const early = [0.3, 1.5, 3].filter((t) => t < span - 0.4);
  const rest = total - early.length;
  const from = early.length ? early[early.length - 1] : 0.3;
  const to = Math.max(from, span - 0.4);
  const times = [...early];
  for (let i = 1; i <= rest; i++) times.push(from + ((to - from) * i) / rest);
  // tidy: one decimal, strictly increasing, unique
  const out: number[] = [];
  for (const t of times.map((x) => Math.round(x * 10) / 10)) if (!out.length || t > out[out.length - 1]) out.push(t);
  return out.length >= 2 ? out : [0, Math.round((d / 2) * 10) / 10];
}
