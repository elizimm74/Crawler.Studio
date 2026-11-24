// NATURE PHOTOS: real landscape and macro photos behind the drawn Crawler windows, the hero,
// the final call to action and the dashboard banner (the look of aaru.com/simulation, with our
// own free-licence photos, NOT theirs).
// Every photo is public domain or CC0 from Wikimedia Commons: free for commercial use, no credit
// required. Sources + licences: docs/photo-credits.md. Files: public/nature/*.webp (resized, ~40-200 KB).
// No people on purpose: a real face would look like a real customer, and our customers are simulated.

const PHOTOS = {
  ridge: { src: "/nature/ridge.webp", pos: "50% 55%" }, // meadow, clouds and snowy peaks (public domain)
  peak: { src: "/nature/peak.webp", pos: "50% 45%" }, // green mountain ridge with a small lake (public domain)
  valley: { src: "/nature/valley.webp", pos: "50% 60%" }, // alpine valley meadow at dusk (CC0)
  leaf: { src: "/nature/leaf.webp", pos: "50% 50%" }, // backlit green leaf, macro (CC0)
  grass: { src: "/nature/grass.webp", pos: "50% 50%" }, // flowering grass, soft focus (CC0)
} as const;

export type NatureKind = keyof typeof PHOTOS;

export default function Nature({ kind = "ridge", className = "", position }: { kind?: NatureKind; className?: string; position?: string }) {
  const p = PHOTOS[kind];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a decorative, pre-sized background photo
    <img
      src={p.src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={`nature pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`}
      style={{ objectPosition: position ?? p.pos }}
    />
  );
}
