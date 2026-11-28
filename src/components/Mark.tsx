// The Crawler logo (v4, 2026-11-26, founder: "set the scratch as the main logo and icon and add a
// black border"): the THREE CLAW SCRATCHES from the hero decoration (src/components/Claws.tsx),
// tilted 16deg, filled white with a thick BLACK BORDER so they read on the concrete page AND on
// black. The border is drawn with paint-order="stroke": the stroke sits behind the fill, so only
// its outer half shows and the scratches keep their shape.
// The old claw-C (v3) paths are kept below as LOGO_PATHS for the moving banner divider.
export const SCRATCH_PATHS = [
  "M28 6 C 50 60, 58 140, 40 214 C 86 142, 80 58, 28 6 Z",
  "M80 0 C 102 60, 110 146, 92 224 C 136 148, 130 56, 80 0 Z",
  "M132 14 C 150 66, 156 140, 140 206 C 180 140, 176 64, 132 14 Z",
];
export const SCRATCH_TRANSFORM = "rotate(16 92 115)";
// a square box around the tilted scratches (measured in a browser) + room for the border
export const SCRATCH_VIEWBOX = "-25.6 -10.3 264 264"; // tight around the bare scratches (no outline)

// The OLD Crawler logo (v3, 2026-11-19, founder's pick "A1"): a letter C made of three wavy claw
// scratches. Each scratch is thick in the middle, sharp at both ends, with a small wiggle, and
// they're staggered so it reads as claws, not a crescent. The paths were generated once by the
// claw() function in public/brand/logo-options/claw-c.html (option A1) and pasted here.
// It draws in the current text color: `className="text-white"` = white logo.

export const LOGO_PATHS = [
  "M92.6,93.8L89.6,97.4L86.1,100.6L82.2,103.5L77.9,105.9L73.4,107.7L68.6,108.9L63.8,109.5L58.8,109.5L54.0,109.0L49.2,108.2L44.4,107.0L39.7,105.6L35.0,104.0L30.3,101.9L25.8,99.4L21.6,96.3L17.9,92.5L14.8,88.2L12.6,83.5L11.0,78.5L10.2,73.4L9.8,68.3L9.7,63.2L9.8,58.2L10.1,53.3L10.5,48.3L11.2,43.2L12.5,38.2L14.3,33.3L16.9,28.7L20.2,24.6L24.2,21.1L28.6,18.3L33.3,16.1L38.1,14.4L42.9,13.1L47.7,12.0L52.6,11.2L57.4,10.7L62.3,10.5L67.2,10.9L72.0,11.8L76.7,13.3L81.1,15.5L85.1,18.2L88.8,21.3L92.1,24.7L94.9,28.6L94.9,28.6L91.3,25.7L87.5,23.0L83.6,20.7L79.5,18.8L75.2,17.3L70.8,16.5L66.4,16.2L62.0,16.5L57.8,17.1L53.6,18.0L49.5,19.1L45.6,20.3L41.6,21.7L37.6,23.3L33.8,25.3L30.3,27.7L27.1,30.7L24.5,34.2L22.6,38.1L21.3,42.2L20.5,46.4L20.2,50.6L20.0,54.6L19.8,58.6L19.7,62.6L19.6,66.6L19.7,70.8L20.2,75.0L21.2,79.2L22.8,83.2L25.2,86.9L28.1,90.1L31.5,92.8L35.1,95.1L39.0,97.0L42.8,98.6L46.7,100.1L50.7,101.4L54.8,102.6L59.0,103.6L63.3,104.1L67.8,104.1L72.2,103.6L76.6,102.5L80.8,100.9L84.9,98.8L88.8,96.4L92.6,93.8Z",
  "M75.5,89.1L73.1,91.0L70.5,92.5L67.7,93.7L64.7,94.5L61.7,94.9L58.6,94.9L55.6,94.6L52.5,94.1L49.5,93.4L46.6,92.5L43.6,91.6L40.6,90.4L37.7,89.1L34.8,87.5L32.0,85.5L29.5,83.2L27.4,80.6L25.7,77.7L24.5,74.5L23.7,71.2L23.4,67.9L23.4,64.5L23.7,61.3L24.0,58.1L24.5,55.0L24.9,51.8L25.5,48.7L26.1,45.5L27.1,42.3L28.4,39.3L30.0,36.3L32.1,33.7L34.6,31.4L37.4,29.5L40.4,28.1L43.5,27.0L46.7,26.2L49.9,25.7L53.0,25.4L56.1,25.3L59.2,25.3L62.3,25.4L65.3,25.8L68.2,26.5L71.1,27.5L73.8,28.9L76.3,30.6L78.5,32.6L78.5,32.6L75.7,31.6L73.0,30.6L70.3,30.0L67.5,29.7L64.7,29.6L62.0,29.8L59.3,30.2L56.7,30.6L54.2,31.1L51.7,31.7L49.1,32.4L46.6,33.2L44.2,34.3L41.9,35.6L39.8,37.3L38.0,39.2L36.5,41.5L35.5,43.9L34.7,46.4L34.2,49.0L33.9,51.5L33.6,53.9L33.4,56.2L33.0,58.6L32.7,61.0L32.3,63.4L32.1,66.0L32.1,68.6L32.5,71.2L33.2,73.8L34.4,76.2L35.9,78.3L37.8,80.2L39.9,81.9L42.1,83.3L44.4,84.6L46.6,85.7L48.9,86.8L51.3,87.9L53.7,88.9L56.2,89.8L58.8,90.5L61.5,91.0L64.3,91.2L67.1,91.1L69.9,90.7L72.7,89.9L75.5,89.1Z",
  "M63.3,78.7L61.9,79.5L60.5,79.9L58.9,80.1L57.4,80.1L55.9,80.0L54.3,79.7L52.8,79.4L51.3,78.9L49.8,78.4L48.3,77.8L46.7,77.2L45.2,76.4L43.7,75.6L42.2,74.6L40.9,73.4L39.7,72.0L38.7,70.5L38.0,68.9L37.5,67.2L37.2,65.4L37.2,63.6L37.3,61.9L37.6,60.1L37.9,58.5L38.3,56.8L38.7,55.2L39.2,53.6L39.6,52.0L40.1,50.4L40.6,48.8L41.3,47.2L42.1,45.7L43.1,44.3L44.3,43.0L45.7,41.9L47.2,41.0L48.8,40.3L50.5,39.8L52.1,39.5L53.8,39.4L55.5,39.4L57.1,39.4L58.7,39.6L60.2,39.8L61.7,40.1L63.2,40.5L64.6,41.1L65.9,41.9L65.9,41.9L64.4,42.1L62.9,42.3L61.5,42.5L60.2,42.7L58.9,43.0L57.7,43.3L56.4,43.6L55.2,44.0L54.0,44.3L52.8,44.8L51.7,45.4L50.6,46.1L49.7,47.0L48.9,47.9L48.2,49.0L47.7,50.2L47.4,51.4L47.1,52.6L47.0,53.7L46.8,54.9L46.7,55.9L46.5,57.0L46.2,58.0L45.9,59.0L45.6,60.1L45.2,61.2L45.0,62.4L44.8,63.6L44.8,64.8L44.9,66.1L45.3,67.3L45.9,68.4L46.6,69.4L47.4,70.3L48.4,71.1L49.3,71.9L50.3,72.5L51.3,73.2L52.3,73.9L53.3,74.6L54.3,75.3L55.4,76.0L56.6,76.6L57.8,77.2L59.1,77.7L60.4,78.1L61.8,78.4L63.3,78.7Z",
];
export const LOGO_TRANSFORM = "rotate(-18 60 60)";
/** @deprecated old name, kept so older imports keep working */
export const LOGO_SCRATCHES = LOGO_PATHS;

// LOGO v5 (2026-11-27, founder: "fill in the logo"): the three scratches are now SOLID, one colour,
// no outline. Near-black on light backgrounds (default); pass fill="#ffffff" on dark ones.
// (The stroke in the same colour just keeps the shapes as bold as the outlined version was.)
export const LOGO_INK = "#0b0b0a";
export default function Mark({
  size = 24,
  className = "",
  fill = LOGO_INK,
}: {
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg width={size} height={size} viewBox={SCRATCH_VIEWBOX} className={className} aria-hidden>
      <g transform={SCRATCH_TRANSFORM} fill={fill}>
        {SCRATCH_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
