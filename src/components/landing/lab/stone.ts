// CONCRETE (2026-11-26, founder: "make the background from the washed gray to concrete"; was the
// washed-gray stone from the founder's photo, 2026-11-25): a soft, cloudy warm-gray surface like brushed
// suede or concrete. Made in code with an SVG noise filter (no photo file to license or download):
// big soft clouds + a fine grain, mapped to the photo's tones (average #8b8a82, range ~#777 to #9f9f9f). Concrete now: average ~#a9a7a0, soft mottling + sand grain + tiny dark pores, no cracks..
// Used as the background of EVERY page (globals.css v21 has a COPY of this data URL as --stone:
// if you change the filter, regenerate it there too) and as the plate that CRACKS OPEN to
// (the crack plate that used to cover the animations was removed in v22).

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='720'><filter id='f' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.006' numOctaves='4' seed='4' stitchTiles='stitch' result='c'/><feColorMatrix in='c' type='matrix' values='0.18 0 0 0 0.585  0.18 0 0 0 0.577  0.18 0 0 0 0.55  0 0 0 0 1' result='g'/><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='9' stitchTiles='stitch' result='n'/><feColorMatrix in='n' type='matrix' values='1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1' result='gn'/><feComposite in='g' in2='gn' operator='arithmetic' k1='0' k2='1' k3='0.2' k4='-0.1' result='g2'/><feTurbulence type='fractalNoise' baseFrequency='0.32' numOctaves='2' seed='21' stitchTiles='stitch' result='p'/><feColorMatrix in='p' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.17' result='pa'/><feComponentTransfer in='pa' result='pores'><feFuncA type='discrete' tableValues='0 0 0 0 0 0 0 0.35 0.55'/></feComponentTransfer><feComposite in='pores' in2='g2' operator='over'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`;

/** The stone texture as a data URL (a seamless 720px tile). */
export const STONE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
/** The stone's average colour, for places the texture can't go (e.g. before it has loaded). */
export const STONE = "#a9a7a0";
