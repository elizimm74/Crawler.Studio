// 03 / BEHAVIORAL PATTERNS — a different picture from 01: a network that organises itself.
// Driven by `s` (0..4 = scroll progress through the four stages) and `t` (seconds, gentle drift only).
//   s = 0      one glowing particle in the middle of fine circular orbits (the starting state)
//   0 → 1      SIGNAL DETECTION       particles spiral out of the centre; thin lines link related
//                                     ones (the same kind of objection); small clusters appear
//   1 → 2      PATTERN RECOGNITION    they gather into five groups, one per objection type
//                                     (the engine's real categories: price, trust, unclear value,
//                                     signup friction, happy with what they use)
//   2 → 3      CUSTOMER SEGMENTATION  they regroup into three segments: respond positively (lime),
//                                     need more information (cobalt), unlikely to convert (grey)
//   3 → 4      ACTIONABLE INSIGHTS    the three biggest patterns line up as neat rows of dots, each
//                                     with the kind of fix Crawler would suggest (EXAMPLES)
// Sizes follow Crawler's demo run (made-up data) and are shown without numbers.
import {
  COBALT,
  COBALT_SOFT,
  GREY,
  LIME,
  WHITE,
  clamp01,
  dotSprite,
  draw,
  easeInOut,
  frame,
  glowSprite,
  label,
  mix,
  rng,
  seedDisc,
  smooth,
  stageWeight,
  type SceneFactory,
} from "./kit";

// the engine's objection categories (src/lib/types.ts), with demo-like shares
const TYPES = [
  { name: "Price", short: "Price", share: 0.26 },
  { name: "Trust", short: "Trust", share: 0.22 },
  { name: "Unclear value", short: "Value", share: 0.2 },
  { name: "Signup friction", short: "Friction", share: 0.18 },
  { name: "Happy with current", short: "Current tool", share: 0.14 },
];
const INSIGHTS = [
  { name: "Price sensitivity", fix: "Show the price before the signup" },
  { name: "Trust concerns", fix: "Put real proof next to the button" },
  { name: "Unclear product value", fix: "Say what it does in one line" },
];
const SEGMENTS = ["Respond positively", "Need more information", "Unlikely to convert"];
const SEG_COLORS = [LIME, COBALT_SOFT, "#a3a9b4"];

type P = {
  type: number;
  seg: number;
  order: number;
  dl: number;
  ph: number;
  size: number;
  x1: number; // signal position
  y1: number;
  x2: number; // pattern cluster position
  y2: number;
  x3: number; // segment position
  y3: number;
  x4: number; // insight row position (or its faint background spot)
  y4: number;
  inRow: boolean;
};

export const patternsScene: SceneFactory = (w, h, shares) => {
  const { mobile, cx, cy, R } = frame(w, h);
  const N = mobile ? 140 : 250;
  const r = rng(23);
  const xs = mobile ? 1 : 1.22; // a little wider than tall on desktop

  // ---- who is who
  const typeOf: number[] = [];
  TYPES.forEach((t, k) => {
    const n = k === TYPES.length - 1 ? N - typeOf.length : Math.round(t.share * N);
    for (let i = 0; i < n; i++) typeOf.push(k);
  });
  const segOf: number[] = Array.from({ length: N }, (_, i) => {
    const u = (i + 0.5) / N;
    return u < shares.buy ? 0 : u < shares.buy + shares.maybe ? 1 : 2;
  });
  // shuffle the segments so they don't line up with the types
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [segOf[i], segOf[j]] = [segOf[j], segOf[i]];
  }

  // ---- layouts
  const seedAng = TYPES.map((_, k) => (k / TYPES.length) * Math.PI * 2 - Math.PI / 2 + 0.35);
  const clusterAt = seedAng.map((a) => [cx + Math.cos(a) * R * 0.74 * xs, cy + Math.sin(a) * R * 0.74] as const);
  // segments as a triangle around a small hub ("your audience"), joined by spokes: a different
  // picture from 01's row of three groups. The bottom one sits far enough down for its own size.
  const sp3 = mobile ? 3.6 : 5.4;
  const segCount = [0, 0, 0];
  segOf.forEach((k) => segCount[k]++);
  const r3 = segCount.map((n) => sp3 * Math.sqrt(n) + 12);
  const segAt = mobile
    ? [
        [cx - R * 0.56, cy - R * 0.5],
        [cx + R * 0.56, cy - R * 0.42],
        [cx, cy + R * 0.74],
      ]
    : [
        [cx - R * 0.82, cy - R * 0.36],
        [cx + R * 0.78, cy - R * 0.3],
        [cx + R * 0.04, cy + Math.max(R * 0.5, r3[2] + 46)],
      ];
  const sp2 = mobile ? 3.4 : 5.2;
  const g = mobile ? 4.6 : 7; // dot pitch in the insight rows
  const rowY = INSIGHTS.map((_, k) => cy + (k - 1) * R * (mobile ? 0.62 : 0.44));
  const x0 = mobile ? Math.max(24, cx - R * 1.05) : cx - R * 1.02;

  const n2 = TYPES.map(() => 0);
  const n3 = [0, 0, 0];
  const ps: P[] = [];
  for (let i = 0; i < N; i++) {
    const type = typeOf[i];
    const seg = segOf[i];
    // stage 1: scattered, loosely pulled towards its kind
    const a = r() * Math.PI * 2;
    const u = Math.sqrt(r());
    const rx = cx + Math.cos(a) * u * R * 1.02 * xs;
    const ry = cy + Math.sin(a) * u * R * 0.95;
    const sa = seedAng[type];
    const sx = cx + Math.cos(sa) * R * 0.55 * xs + (r() - 0.5) * R * 0.5;
    const sy = cy + Math.sin(sa) * R * 0.55 + (r() - 0.5) * R * 0.5;
    const [dx2, dy2] = seedDisc(n2[type]++, sp2);
    const [dx3, dy3] = seedDisc(n3[seg]++, sp3);
    ps.push({
      type,
      seg,
      order: r(),
      dl: r(),
      ph: r() * Math.PI * 2,
      size: (mobile ? 1.2 : 1.45) + r() * (mobile ? 0.7 : 0.9),
      x1: mix(rx, sx, 0.42),
      y1: mix(ry, sy, 0.42),
      x2: clusterAt[type][0] + dx2,
      y2: clusterAt[type][1] + dy2,
      x3: segAt[seg][0] + dx3,
      y3: segAt[seg][1] + dy3,
      x4: 0,
      y4: 0,
      inRow: type < INSIGHTS.length,
    });
  }
  const r2 = n2.map((n) => sp2 * Math.sqrt(n) + 6);

  // stage 4: rows of dots, sorted by segment so each row reads lime -> cobalt -> grey
  let maxCols = 0;
  INSIGHTS.forEach((_, k) => {
    const members = ps.filter((p) => p.type === k).sort((a, b) => a.seg - b.seg);
    members.forEach((p, idx) => {
      p.x4 = x0 + Math.floor(idx / 2) * g;
      p.y4 = rowY[k] + (idx % 2) * g - g / 2;
    });
    maxCols = Math.max(maxCols, Math.ceil(members.length / 2));
  });
  for (const p of ps) {
    if (p.inRow) continue;
    p.x4 = p.x1; // the rest stay behind as faint dust
    p.y4 = p.y1;
  }
  const textX = mobile ? x0 : x0 + maxCols * g + 26;
  const ruleW = mobile ? w - x0 * 2 : R * 2.15;

  // ---- links between related particles: each joins its 2 nearest of the same kind
  const edges: [number, number][] = [];
  const seen = new Set<number>();
  for (let i = 0; i < N; i++) {
    const best: [number, number][] = [];
    for (let j = 0; j < N; j++) {
      if (j === i || ps[j].type !== ps[i].type) continue;
      const d = (ps[j].x1 - ps[i].x1) ** 2 + (ps[j].y1 - ps[i].y1) ** 2;
      best.push([d, j]);
    }
    best.sort((a, b) => a[0] - b[0]);
    for (const [, j] of best.slice(0, 2)) {
      const key = Math.min(i, j) * N + Math.max(i, j);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }

  const sprites = {
    white: dotSprite(WHITE),
    seg: [dotSprite(LIME), dotSprite(COBALT), dotSprite(GREY)],
    glowC: glowSprite(COBALT),
    glowW: glowSprite(WHITE),
  };
  const PX = new Float32Array(N);
  const PY = new Float32Array(N);
  const PE = new Float32Array(N); // how far each one has emerged (0..1)

  return (ctx, s, t) => {
    const W2 = stageWeight(s, 2);
    const W3 = stageWeight(s, 3);
    const W4 = stageWeight(s, 4);
    const W1 = smooth(s / 0.35);

    // ---- fine circular orbits with tick marks, and the glowing origin (fade as patterns form)
    const orbA = 0.13 * (1 - W2);
    if (orbA > 0.01) {
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 1;
      ctx.globalAlpha = orbA;
      const radii = [0.24, 0.45, 0.67, 0.9].map((k) => k * R);
      for (const rr of radii) {
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      const outer = radii[radii.length - 1];
      ctx.beginPath();
      for (let k = 0; k < 72; k++) {
        const a = (k / 72) * Math.PI * 2;
        const len = k % 6 === 0 ? 8 : 3;
        ctx.moveTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.lineTo(cx + Math.cos(a) * (outer + len), cy + Math.sin(a) * (outer + len));
      }
      ctx.stroke();
      radii.forEach((rr, k) => {
        const a = t * (0.3 - k * 0.06) * (k % 2 ? -1 : 1) + k;
        draw(ctx, sprites.glowC, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 8, orbA * 5);
      });
    }
    const originA = 1 - W2;
    if (originA > 0.01) {
      const pulse = 1 + Math.sin(t * 2) * 0.08;
      draw(ctx, sprites.glowC, cx, cy, (mobile ? 34 : 46) * pulse, originA * (0.85 - 0.35 * W1));
      draw(ctx, sprites.glowW, cx, cy, 7, originA);
    }

    // ---- positions this frame
    for (let i = 0; i < N; i++) {
      const p = ps[i];
      const e = smooth((s - p.order * 0.72) / 0.26);
      PE[i] = e;
      // stage 1: spiral out from the centre
      const turn = (1 - e) * 1.4;
      const ox = p.x1 - cx;
      const oy = p.y1 - cy;
      let x = cx + (ox * Math.cos(turn) - oy * Math.sin(turn)) * e;
      let y = cy + (ox * Math.sin(turn) + oy * Math.cos(turn)) * e;
      const w2 = s > 1 ? stageWeight(s, 2, p.dl) : 0;
      const w3 = s > 2 ? stageWeight(s, 3, p.dl) : 0;
      const w4 = s > 3 ? stageWeight(s, 4, p.dl) : 0;
      if (w2 > 0) {
        x = mix(x, p.x2, w2);
        y = mix(y, p.y2, w2);
      }
      if (w3 > 0) {
        x = mix(x, p.x3, w3);
        y = mix(y, p.y3, w3);
      }
      if (w4 > 0) {
        x = mix(x, p.x4, w4);
        y = mix(y, p.y4, w4);
      }
      const still = p.inRow ? w4 : 0; // rows settle completely still, everything else breathes
      PX[i] = x + Math.sin(t * 0.9 + p.ph) * 1.6 * (1 - still);
      PY[i] = y + Math.cos(t * 0.7 + p.ph) * 1.6 * (1 - still);
    }

    // ---- links (white while signals appear, cobalt once patterns form; gone by segmentation)
    const linkA = 1 - W3;
    if (linkA > 0.01) {
      ctx.lineWidth = 0.7;
      for (const [color, a] of [
        [WHITE, 0.16 * (1 - W2)],
        [COBALT_SOFT, 0.34 * W2],
      ] as const) {
        if (a * linkA <= 0.005) continue;
        ctx.strokeStyle = color;
        ctx.globalAlpha = a * linkA;
        ctx.beginPath();
        for (const [i, j] of edges) {
          if (PE[i] < 0.95 || PE[j] < 0.95) continue;
          ctx.moveTo(PX[i], PY[i]);
          ctx.lineTo(PX[j], PY[j]);
        }
        ctx.stroke();
      }
    }

    // ---- segment outlines + spokes to the hub (stage 3)
    const segA = W3 * (1 - W4);
    if (segA > 0.01) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = WHITE;
      ctx.globalAlpha = segA * 0.14;
      ctx.beginPath();
      segAt.forEach(([sx, sy], k) => {
        const d = Math.hypot(sx - cx, sy - cy) || 1;
        const grow = easeInOut(clamp01((s - 2.25) / 0.5));
        const ex = cx + ((sx - cx) * (d - r3[k] - 4) * grow) / d;
        const ey = cy + ((sy - cy) * (d - r3[k] - 4) * grow) / d;
        ctx.moveTo(cx + ((sx - cx) * 10) / d, cy + ((sy - cy) * 10) / d);
        ctx.lineTo(ex, ey);
      });
      ctx.stroke();
      ctx.globalAlpha = segA * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.stroke();
      draw(ctx, sprites.glowW, cx, cy, 3, segA * 0.9);
      if (!mobile) label(ctx, "Your audience", cx, cy + 20, WHITE, segA * 0.45, { align: "center", size: 8.5 });
      ctx.setLineDash([2, 4]);
      segAt.forEach(([sx, sy], k) => {
        ctx.globalAlpha = segA * 0.55;
        ctx.strokeStyle = SEG_COLORS[k];
        ctx.beginPath();
        ctx.arc(sx, sy, r3[k] * (0.9 + 0.1 * W3), 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      segAt.forEach(([sx, sy], k) => {
        const top = sy - r3[k] - 14;
        if (mobile) {
          const words = SEGMENTS[k].split(" ");
          const cut = k === 1 ? 2 : 1;
          label(ctx, words.slice(0, cut).join(" "), sx, top - 12, SEG_COLORS[k], segA, { align: "center", size: 9, weight: 600 });
          label(ctx, words.slice(cut).join(" "), sx, top, SEG_COLORS[k], segA, { align: "center", size: 9, weight: 600 });
        } else {
          label(ctx, SEGMENTS[k], sx, top, SEG_COLORS[k], segA, { align: "center", size: 10, weight: 600 });
        }
      });
    }

    // ---- the particles
    for (let i = 0; i < N; i++) {
      const p = ps[i];
      const e = PE[i];
      if (e <= 0.005) continue;
      const w3 = s > 2 ? stageWeight(s, 3, p.dl) : 0;
      const w4 = s > 3 ? stageWeight(s, 4, p.dl) : 0;
      let alpha = e * 0.9;
      if (!p.inRow) alpha *= 1 - 0.85 * w4; // background dust in the last stage
      const rad = p.size * 1.7;
      draw(ctx, sprites.white, PX[i], PY[i], rad, alpha * (1 - w3));
      draw(ctx, sprites.seg[p.seg], PX[i], PY[i], rad, alpha * w3);
      if (e < 1) draw(ctx, sprites.glowC, PX[i], PY[i], 12, e * (1 - e) * 2.4);
    }

    // ---- pattern names next to their groups (stage 2)
    const typeA = W2 * (1 - W3);
    if (typeA > 0.01) {
      clusterAt.forEach(([x, y], k) => {
        if (mobile) {
          // phones: a short name centred under each group, kept on screen
          label(ctx, TYPES[k].short, x, y + r2[k] + 10, WHITE, typeA * 0.78, { align: "center", size: 8.5, weight: 600, fit: w });
          return;
        }
        const a = seedAng[k];
        const d = r2[k] + 16;
        const lx = x + Math.cos(a) * d;
        const ly = y + Math.sin(a) * d;
        const align: CanvasTextAlign = Math.cos(a) > 0.35 ? "left" : Math.cos(a) < -0.35 ? "right" : "center";
        label(ctx, TYPES[k].name, lx, ly, WHITE, typeA * 0.78, { align, size: 10, weight: 600, fit: w });
      });
    }

    // ---- insight rows (stage 4)
    if (W4 > 0.01) {
      const reveal = easeInOut(clamp01((s - 3.2) / 0.6));
      label(ctx, "Example insights", x0, rowY[0] - g - (mobile ? 34 : 46), WHITE, W4 * 0.42, { size: 9 });
      INSIGHTS.forEach((ins, k) => {
        const y = rowY[k];
        label(ctx, `0${k + 1}`, x0, y - g - 14, COBALT_SOFT, W4, { size: 10, weight: 600 });
        label(ctx, ins.name, x0 + (mobile ? 22 : 26), y - g - 14, WHITE, W4 * 0.92, { size: 10, weight: 600 });
        const ty = mobile ? y + g + 14 : y + 1;
        label(ctx, "→", textX, ty, LIME, W4 * reveal, { size: mobile ? 12 : 13, upper: false, spacing: 0 });
        label(ctx, ins.fix, textX + (mobile ? 16 : 20), ty, WHITE, W4 * reveal * 0.78, { size: mobile ? 12 : 13.5, upper: false, spacing: 0, weight: 400 });
        ctx.globalAlpha = W4 * 0.09;
        ctx.fillStyle = WHITE;
        ctx.fillRect(x0, y + g + (mobile ? 26 : 14), ruleW * reveal, 1);
      });
    }
    ctx.globalAlpha = 1;
  };
};
