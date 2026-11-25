// THE CRACKING PLATE (founder, 2026-11-25: "washed gray background with cracks in it, unveiling
// the things as you scroll"). Each lab animation starts hidden under a plate of the gray stone.
// As the animation scrolls into view, cracks run out from a point near the centre (c 0 -> 0.55),
// then the pieces break apart and fall away (0.55 -> 1), unveiling the animation underneath.
// Everything is a function of c, so scrolling back up closes the plate again.
// Shards = wedges between neighbouring cracks, so the pieces really match the crack lines.
import { clamp01, easeInOut, rng } from "./kit";

type Pt = [number, number];
type Ray = { pts: Pt[]; len: number[]; total: number; branches: { at: number; pts: Pt[] }[] };

export type Plate = (ctx: CanvasRenderingContext2D, c: number, tex: CanvasPattern | null, offX: number, offY: number) => void;

export function makePlate(w: number, h: number, mobile: boolean): Plate {
  const r = rng(91);
  const ox = mobile ? w * 0.5 : w * 0.55;
  const oy = h * (mobile ? 0.55 : 0.52);
  const far = Math.hypot(w, h) * 1.1;
  const step = mobile ? 34 : 52;

  // jagged cracks from the origin out past the edges
  const n = mobile ? 7 : 9;
  const angles = Array.from({ length: n }, (_, i) => ((i + 0.15 + r() * 0.7) / n) * Math.PI * 2);
  const rays: Ray[] = angles.map((a0) => {
    const pts: Pt[] = [[ox, oy]];
    let a = a0;
    let x = ox;
    let y = oy;
    while (x > -40 && x < w + 40 && y > -40 && y < h + 40) {
      a += (r() - 0.5) * 0.55;
      a = a0 + Math.max(-0.35, Math.min(0.35, a - a0)); // wander, but keep heading outwards
      const l = step * (0.55 + r() * 0.9);
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      pts.push([x, y]);
    }
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    // a few hairline side cracks
    const branches: Ray["branches"] = [];
    for (let i = 1; i < pts.length - 1; i++) {
      if (r() > 0.45) continue;
      let ba = a0 + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6);
      let bx = pts[i][0];
      let by = pts[i][1];
      const bp: Pt[] = [[bx, by]];
      const segs = 1 + Math.floor(r() * 3);
      for (let k = 0; k < segs; k++) {
        ba += (r() - 0.5) * 0.6;
        const l = step * (0.3 + r() * 0.5);
        bx += Math.cos(ba) * l;
        by += Math.sin(ba) * l;
        bp.push([bx, by]);
      }
      branches.push({ at: len[i], pts: bp });
    }
    return { pts, len, total: len[len.length - 1], branches };
  });
  const longest = Math.max(...rays.map((q) => q.total));

  // shards: origin -> crack i -> far arc -> crack i+1 back to origin
  const shards = rays.map((ray, i) => {
    const next = rays[(i + 1) % n];
    const a1 = angles[i];
    let a2 = angles[(i + 1) % n];
    if (a2 <= a1) a2 += Math.PI * 2;
    const poly: Pt[] = [...ray.pts];
    for (let k = 0; k <= 4; k++) {
      const a = a1 + ((a2 - a1) * k) / 4;
      poly.push([ox + Math.cos(a) * far, oy + Math.sin(a) * far]);
    }
    for (let k = next.pts.length - 1; k >= 0; k--) poly.push(next.pts[k]);
    const mid = (a1 + a2) / 2;
    return { poly, dx: Math.cos(mid), dy: Math.sin(mid), spin: (r() - 0.5) * 0.22, delay: r() * 0.25 };
  });

  // a crack line drawn up to a length (so it "runs")
  const trace = (ctx: CanvasRenderingContext2D, ray: { pts: Pt[]; len: number[] }, upto: number) => {
    ctx.moveTo(ray.pts[0][0], ray.pts[0][1]);
    for (let i = 1; i < ray.pts.length; i++) {
      if (ray.len[i] <= upto) {
        ctx.lineTo(ray.pts[i][0], ray.pts[i][1]);
        continue;
      }
      const t = (upto - ray.len[i - 1]) / Math.max(1, ray.len[i] - ray.len[i - 1]);
      ctx.lineTo(ray.pts[i - 1][0] + (ray.pts[i][0] - ray.pts[i - 1][0]) * t, ray.pts[i - 1][1] + (ray.pts[i][1] - ray.pts[i - 1][1]) * t);
      break;
    }
  };
  const branchLens = rays.map((q) => q.branches.map((b) => {
    const len = [0];
    for (let i = 1; i < b.pts.length; i++) len.push(len[i - 1] + Math.hypot(b.pts[i][0] - b.pts[i - 1][0], b.pts[i][1] - b.pts[i - 1][1]));
    return len;
  }));

  const strokeCracks = (ctx: CanvasRenderingContext2D, run: number, alpha: number) => {
    // dark crack + a lighter lip under it, like a real split in stone
    for (const [color, width, dy] of [
      ["rgba(255,255,255,0.3)", 1.2, 1.2],
      ["rgba(24,23,21,0.9)", 2, 0],
    ] as const) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.save();
      ctx.translate(0, dy);
      rays.forEach((ray, i) => {
        trace(ctx, ray, run);
        ray.branches.forEach((b, k) => {
          if (run <= b.at) return;
          trace(ctx, { pts: b.pts, len: branchLens[i][k] }, (run - b.at) * 0.8);
        });
      });
      ctx.stroke();
      ctx.restore();
    }
  };

  return (ctx, c, tex, offX, offY) => {
    if (c >= 1) return;
    const run = easeInOut(clamp01(c / 0.55)) * longest;
    const open = clamp01((c - 0.55) / 0.45);
    const fill = tex ?? "#8b8a82";
    if (tex) tex.setTransform(new DOMMatrix([1, 0, 0, 1, offX, offY]));

    if (open <= 0) {
      // whole plate + cracks running across it
      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
      if (run > 0) strokeCracks(ctx, run, 1);
      return;
    }
    // the pieces break away: each moves out along its middle, turns a little and fades
    for (const s of shards) {
      const u = easeInOut(clamp01((open - s.delay * 0.6) / 0.75));
      const d = u * u * far * 0.55;
      const alpha = 1 - u * u;
      if (alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ox + s.dx * d, oy + s.dy * d + u * u * 60);
      ctx.rotate(s.spin * u);
      ctx.translate(-ox, -oy);
      ctx.beginPath();
      s.poly.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      // a thin shadow edge, so each piece reads as a slab
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 18 * u;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(28,27,25,0.7)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
}
