// The "reading your site / screens" visual: an outline of a page (or a phone) with a scan line
// sweeping down it. As each step of the checklist finishes, a bracket "locks on" to that part of
// the page. Pure SVG + CSS (no library); the scan line stops for reduced / calmer motion.
const BLOCKS = {
  // x, y, w, h in a 320x400 box: a landing page (hero, features, pricing, signup)
  page: [
    [24, 54, 200, 22],
    [24, 86, 150, 10],
    [24, 112, 80, 26],
    [24, 166, 84, 70],
    [118, 166, 84, 70],
    [212, 166, 84, 70],
    [24, 262, 272, 54],
    [24, 330, 130, 40],
  ],
  // a phone: title, image, two lines, button
  phone: [
    [104, 60, 112, 14],
    [96, 92, 128, 128],
    [104, 238, 112, 10],
    [114, 256, 92, 10],
    [100, 330, 120, 30],
  ],
} as const;

export default function ScanPage({ kind = "page", locked }: { kind?: "page" | "phone"; locked: number }) {
  const blocks = BLOCKS[kind];
  const frame = kind === "page" ? { x: 8, y: 8, w: 304, h: 384, r: 14 } : { x: 84, y: 20, w: 152, h: 364, r: 26 };
  return (
    <div className="relative" aria-hidden>
      <svg viewBox="0 0 320 400" className="h-auto w-full">
        {/* the frame */}
        <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={frame.r} fill="rgb(255 255 255 / 0.025)" stroke="rgb(255 255 255 / 0.14)" />
        {kind === "page" && (
          <g fill="rgb(255 255 255 / 0.25)">
            <circle cx="24" cy="28" r="3.5" />
            <circle cx="36" cy="28" r="3.5" />
            <circle cx="48" cy="28" r="3.5" />
            <rect x="70" y="22" width="190" height="12" rx="6" fill="rgb(255 255 255 / 0.06)" />
          </g>
        )}
        {/* the skeleton blocks; locked ones turn solid with corner brackets */}
        {blocks.map(([x, y, w, h], i) => {
          const on = i < locked;
          return (
            <g key={i} className="scan-block" style={{ opacity: on ? 1 : 0.55 }}>
              <rect x={x} y={y} width={w} height={h} rx="4" fill={on ? "rgb(56 103 255 / 0.28)" : "rgb(255 255 255 / 0.07)"} />
              {on && (
                <g stroke="#f5f6f8" strokeWidth="1.5" fill="none" className="scan-lock">
                  <path d={`M${x - 4} ${y + 6}V${y - 4}H${x + 6}`} />
                  <path d={`M${x + w - 6} ${y - 4}H${x + w + 4}V${y + 6}`} />
                  <path d={`M${x - 4} ${y + h - 6}V${y + h + 4}H${x + 6}`} />
                  <path d={`M${x + w - 6} ${y + h + 4}H${x + w + 4}V${y + h - 6}`} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {/* the moving scan line (CSS animation) */}
      <div className="scan-beam" style={{ left: `${(frame.x / 320) * 100}%`, width: `${(frame.w / 320) * 100}%` }} />
    </div>
  );
}
