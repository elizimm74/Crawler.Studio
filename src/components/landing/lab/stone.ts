// "WASHED GRAY" STONE (founder's photo, 2026-11-25): a soft, cloudy warm-gray surface like brushed
// suede or concrete. Made in code with an SVG noise filter (no photo file to license or download):
// big soft clouds + a fine grain, mapped to the photo's tones (average #8b8a82, range ~#777 to #9f9f9f).
// Used as the background of EVERY page (globals.css v21 has a COPY of this data URL as --stone:
// if you change the filter, regenerate it there too) and as the plate that CRACKS OPEN to
// reveal each animation as you scroll (crack.ts draws it on a canvas).

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='720'><filter id='f' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.0125' numOctaves='7' seed='7' stitchTiles='stitch' result='c'/><feComponentTransfer in='c' result='cc'><feFuncR type='table' tableValues='0 0.14 0.4 0.68 0.86 0.95 1'/></feComponentTransfer><feColorMatrix in='cc' type='matrix' values='0.13 0 0 0 0.44  0.135 0 0 0 0.431  0.145 0 0 0 0.396  0 0 0 0 1' result='g'/><feTurbulence type='fractalNoise' baseFrequency='0.5 0.045' numOctaves='2' seed='5' stitchTiles='stitch' result='s'/><feColorMatrix in='s' type='matrix' values='1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1' result='gs'/><feComposite in='g' in2='gs' operator='arithmetic' k1='0' k2='1' k3='0.07' k4='-0.035' result='g2'/><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='3' stitchTiles='stitch' result='n'/><feColorMatrix in='n' type='matrix' values='1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1' result='gn'/><feComposite in='g2' in2='gn' operator='arithmetic' k1='0' k2='1' k3='0.1' k4='-0.05'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`;

/** The stone texture as a data URL (a seamless 720px tile). */
export const STONE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
/** The stone's average colour, for places the texture can't go (e.g. before it has loaded). */
export const STONE = "#8b8a82";
