// 01 / CUSTOMER SIMULATION — the canvas picture, driven by `s` (0..4 = how far you've scrolled
// through the four stages) and `t` (seconds, only for the gentle always-on drift).
//   s = 0      a few particles circle on fine orbits (the starting state)
//   0 → 1      POPULATION GENERATION   hundreds of particles appear on the orbits
//   1 → 2      BEHAVIORAL VARIATION    each one leaves its orbit and moves its own way:
//                                     fast streaks, stop-start hesitaters, direction changers
//   2 → 3      EXPERIENCE SIMULATION   a sketch of a website fades in; everyone travels to it along
//                                     thin lines; some go through to the button, some hover at
//                                     the edge, some turn around and drift off
//   3 → 4      DECISION MODELING       they settle into three groups: BUY / HESITATE / LEAVE,
//                                     with one thin proportion bar underneath
// Group sizes follow Crawler's demo run (the made-up MealMate example), shown WITHOUT numbers and
// labelled as demo data on the page. Everything is computed from `s`, so scrolling back up simply
// plays it backwards.
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
  stageWeight,
  withAlpha,
  type SceneFactory,
} from "./kit";

type P = {
  order: number; // when it appears in stage 1 (0..1)
  ring: number;
  th: number; // orbit angle
  om: number; // orbit speed
  rr: number; // orbit radius (px)
  kind: number; // 0 fast, 1 hesitant, 2 wanderer
  hx: number;
  hy: number;
  amp: number;
  f1: number;
  f2: number;
  ph1: number;
  ph2: number;
  v: number; // 0 buy, 1 hesitate, 2 leave
  ex: number; // entry point (px)
  ey: number;
  dx: number; // where it meets the site's edge (px)
  dy: number;
  qx: number; // curve control point (px)
  qy: number;
  ox: number; // outcome point (px)
  oy: number;
  jd: number; // journey delay
  dl: number; // stagger
  size: number;
  tint: number; // 0 white, 1 cobalt, 2 lime (before decisions)
  kx: number; // place in its group (px)
  ky: number;
  line: boolean;
};

const ROT = -0.16; // the orbits are tilted a little, like seen from above

export const simulationScene: SceneFactory = (w, h, shares) => {
  const { mobile, cx, cy, R } = frame(w, h);
  const N = mobile ? 230 : 460;
  const r = rng(7);
  const rxf = mobile ? 1.06 : 1.28;
  const ryf = 0.38;
  const cosR = Math.cos(ROT);
  const sinR = Math.sin(ROT);

  // the website sketch (stage 3)
  const sw = mobile ? Math.min(w * 0.5, R * 1.25) : Math.min(320, R * 1.05);
  const sh = sw * 0.66;
  const sx0 = cx - sw / 2;
  const sy0 = cy - sh / 2;
  const ctaX = cx + sw * 0.2;
  const ctaY = cy + sh * 0.24;

  // the three groups (stage 4)
  const gap = mobile ? R * 0.82 : R * 1.02;
  const anchors = [
    [cx - gap, cy - R * 0.06],
    [cx, cy - R * 0.06],
    [cx + gap, cy - R * 0.06],
  ];
  const spacing = mobile ? 3.3 : 5;
  const counts = [0, 0, 0];

  const ps: P[] = [];
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    const v = u < shares.buy ? 0 : u < shares.buy + shares.maybe ? 1 : 2;
    const ring = Math.floor(r() * 3);
    const rr = R * ([0.5, 0.78, 1.04][ring] + (r() - 0.5) * 0.1);
    const kind = r() < 0.3 ? 0 : r() < 0.5 ? 1 : 2;
    const a = r() * Math.PI * 2;
    const uu = Math.sqrt(r());
    // stage 3: an entry point on a wide ring, and where its straight line meets the site's edge
    const ent = r() * Math.PI * 2;
    const ex = cx + Math.cos(ent) * R * (mobile ? 1.05 : 1.45);
    const ey = cy + Math.sin(ent) * R * (mobile ? 1.0 : 0.92);
    const ux = Math.cos(ent);
    const uy = Math.sin(ent);
    const sc = Math.min(sw / 2 / Math.max(1e-3, Math.abs(ux)), sh / 2 / Math.max(1e-3, Math.abs(uy)));
    const dx = cx + ux * sc;
    const dy = cy + uy * sc;
    const bend = (r() - 0.5) * 0.5;
    const qx = (ex + dx) / 2 - (dy - ey) * bend;
    const qy = (ey + dy) / 2 + (dx - ex) * bend;
    // where it ends up after deciding
    let ox: number;
    let oy: number;
    if (v === 0) {
      ox = cx + sw / 2 + R * (mobile ? 0.12 : 0.3) + r() * R * 0.25;
      oy = cy + sh * 0.15 + (r() - 0.5) * R * 0.45;
    } else if (v === 1) {
      ox = dx + ux * (8 + r() * 14);
      oy = dy + uy * (8 + r() * 14);
    } else {
      const turn = (r() - 0.5) * 0.9;
      const ca = Math.cos(turn);
      const sa = Math.sin(turn);
      const k = R * (mobile ? 1.2 : 1.32);
      ox = cx + (ux * ca - uy * sa) * k * (mobile ? 1 : 1.2);
      oy = cy + (ux * sa + uy * ca) * k * 0.68;
    }
    const [gx, gy] = seedDisc(counts[v]++, spacing);
    const tintRoll = r();
    ps.push({
      order: r(),
      ring,
      th: r() * Math.PI * 2,
      om: (0.05 + r() * 0.07) * (r() < 0.5 ? 1 : 1.2),
      rr,
      kind,
      hx: Math.cos(a) * uu,
      hy: Math.sin(a) * uu,
      amp: kind === 0 ? 0.34 : kind === 1 ? 0.16 : 0.26,
      f1: 0.6 + r() * 0.8,
      f2: 0.6 + r() * 0.8,
      ph1: r() * Math.PI * 2,
      ph2: r() * Math.PI * 2,
      v,
      ex,
      ey,
      dx,
      dy,
      qx,
      qy,
      ox,
      oy,
      jd: 0.04 + r() * 0.34,
      dl: r(),
      size: (mobile ? 1.15 : 1.4) + r() * (mobile ? 0.8 : 1),
      tint: tintRoll < 0.12 ? 1 : tintRoll < 0.17 ? 2 : 0,
      kx: anchors[v][0] + gx,
      ky: anchors[v][1] + gy,
      line: i % (mobile ? 4 : 5) === 0,
    });
  }
  const discR = counts.map((c) => spacing * Math.sqrt(c) + 4);

  const sprites = {
    white: dotSprite(WHITE),
    cobalt: dotSprite(COBALT),
    lime: dotSprite(LIME),
    grey: dotSprite(GREY),
    signal: dotSprite(COBALT_SOFT),
    glowC: glowSprite(COBALT),
    glowL: glowSprite(LIME),
  };
  const tintSprite = [sprites.white, sprites.cobalt, sprites.lime];
  const verdictSprite = [sprites.lime, sprites.cobalt, sprites.grey];

  // scratch output for the pose functions (no allocations per frame)
  let X = 0;
  let Y = 0;
  let D = 0; // depth 0 back .. 1 front

  const orbit = (p: P, t: number) => {
    const th = p.th + p.om * t;
    const x = Math.cos(th) * p.rr * rxf;
    const y = Math.sin(th) * p.rr * ryf;
    X = cx + x * cosR - y * sinR;
    Y = cy + x * sinR + y * cosR;
    D = (Math.sin(th) + 1) / 2;
  };
  const behave = (p: P, t: number) => {
    const sp = p.kind === 0 ? 1.25 : p.kind === 1 ? 0.75 : 0.85;
    // hesitaters: their clock nearly stops now and then (stop, start, stop...)
    const tau = p.kind === 1 ? sp * t - (0.95 * Math.sin(1.6 * sp * t)) / 1.6 : sp * t;
    const extra = p.kind === 2 ? 0.35 * p.amp * Math.sin(2.7 * p.f1 * tau + p.ph2) : 0;
    X = cx + (p.hx + p.amp * Math.sin(p.f1 * tau + p.ph1) + extra) * R * (mobile ? 1.0 : 1.25);
    Y = cy + (p.hy + p.amp * Math.sin(p.f2 * tau + p.ph2)) * R * 0.72;
  };
  const journey = (p: P, jp: number, t: number) => {
    if (jp < 0.5) {
      // along its curve, from the entry point to the site's edge
      const u = easeInOut(jp * 2);
      const a = (1 - u) * (1 - u);
      const b = 2 * (1 - u) * u;
      const c = u * u;
      X = a * p.ex + b * p.qx + c * p.dx;
      Y = a * p.ey + b * p.qy + c * p.dy;
      return;
    }
    const b = (jp - 0.5) * 2;
    if (p.v === 0) {
      // through the page to the button, then out the other side
      if (b < 0.5) {
        const u = easeInOut(b * 2);
        X = mix(p.dx, ctaX, u);
        Y = mix(p.dy, ctaY, u);
      } else {
        const u = easeInOut((b - 0.5) * 2);
        X = mix(ctaX, p.ox, u);
        Y = mix(ctaY, p.oy, u);
      }
    } else if (p.v === 1) {
      // hovers at the edge, unsure
      const u = easeInOut(b);
      X = mix(p.dx, p.ox, u) + Math.sin(t * 1.7 + p.ph1) * 4 * u;
      Y = mix(p.dy, p.oy, u) + Math.cos(t * 1.3 + p.ph2) * 4 * u;
    } else {
      // turns around and drifts away
      const u = easeInOut(b);
      X = mix(p.dx, p.ox, u);
      Y = mix(p.dy, p.oy, u);
    }
  };

  return (ctx, s, t) => {
    const W2 = stageWeight(s, 2);
    const W3 = stageWeight(s, 3);
    const W4 = stageWeight(s, 4);

    // ---- fine orbital paths (fade as the crowd leaves them)
    const orbA = 0.14 * (1 - 0.55 * W2) * (1 - W3);
    if (orbA > 0.01) {
      ctx.globalAlpha = orbA;
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 1;
      for (const k of [0.5, 0.78, 1.04]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * k * rxf, R * k * ryf, ROT, 0, Math.PI * 2);
        ctx.stroke();
      }
      // little cobalt markers riding the orbits
      [0.5, 0.78, 1.04].forEach((k, i) => {
        const th = t * (0.22 - i * 0.05) + i * 2.1;
        const x = Math.cos(th) * R * k * rxf;
        const y = Math.sin(th) * R * k * ryf;
        draw(ctx, sprites.glowC, cx + x * cosR - y * sinR, cy + x * sinR + y * cosR, 9, orbA * 4);
      });
    }

    // ---- the website sketch
    const siteA = W3 * (1 - W4);
    if (siteA > 0.01) {
      ctx.globalAlpha = siteA;
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sx0, sy0, sw, sh, 10);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(sx0, sy0 + 20);
      ctx.lineTo(sx0 + sw, sy0 + 20);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(sx0 + 12 + k * 8, sy0 + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(sx0 + 16, sy0 + 36, sw * 0.55, 6);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(sx0 + 16, sy0 + 49, sw * 0.38, 4);
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.strokeRect(sx0 + 16, sy0 + 64, sw * 0.32, sh - 80);
      ctx.fillStyle = COBALT;
      ctx.beginPath();
      ctx.roundRect(ctaX - sw * 0.14, ctaY - 9, sw * 0.28, 18, 9);
      ctx.fill();
      label(ctx, "Your website", sx0 + 42, sy0 + 10.5, WHITE, siteA * 0.5, { size: 8.5 });
    }

    // ---- thin connecting lines into the site, with a signal running along each
    const lineA = W3 * (1 - W4);
    if (lineA > 0.01) {
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.09 * lineA;
      ctx.beginPath();
      for (const p of ps) {
        if (!p.line) continue;
        ctx.moveTo(p.ex, p.ey);
        ctx.quadraticCurveTo(p.qx, p.qy, p.dx, p.dy);
      }
      ctx.stroke();
      for (const p of ps) {
        if (!p.line) continue;
        const u = (t * 0.3 + p.ph1 / (Math.PI * 2)) % 1;
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const c = u * u;
        draw(ctx, sprites.signal, a * p.ex + b * p.qx + c * p.dx, a * p.ey + b * p.qy + c * p.dy, 2.4, lineA * 0.85 * Math.sin(Math.PI * u));
      }
    }

    // ---- appear count (stage 1): a sparse start, then hundreds
    const appearN = 26 + (N + 16 - 26) * easeInOut(clamp01(s / 0.9)); // +16: the last ones finish appearing too

    // ---- motion trails (stage 2)
    const trailA = W2 * (1 - W3);
    if (trailA > 0.01) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = WHITE;
      for (const fast of [true, false]) {
        ctx.globalAlpha = trailA * (fast ? 0.42 : 0.14);
        ctx.beginPath();
        for (const p of ps) {
          if ((p.kind === 0) !== fast) continue;
          const wb = stageWeight(s, 2, p.dl);
          if (wb < 0.9) continue;
          behave(p, t - (fast ? 0.16 : 0.08));
          const px = X;
          const py = Y;
          behave(p, t);
          ctx.moveTo(px, py);
          ctx.lineTo(X, Y);
        }
        ctx.stroke();
      }
    }

    // ---- the particles
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const appear = clamp01((appearN - p.order * N) / 16);
      if (appear <= 0) continue;
      const wb = s > 1 ? stageWeight(s, 2, p.dl) : 0;
      const wc = s > 2 ? stageWeight(s, 3, p.dl) : 0;
      const wd = s > 3 ? stageWeight(s, 4, p.dl) : 0;
      const jp = s > 2 ? clamp01((s - 2 - p.jd * 0.7) / 0.55) : 0;

      let x = 0;
      let y = 0;
      let depth = 0.6;
      if (wc < 1 && wd < 1) {
        orbit(p, t);
        x = X;
        y = Y;
        depth = D;
        if (wb > 0) {
          behave(p, t);
          x = mix(x, X, wb);
          y = mix(y, Y, wb);
          depth = mix(depth, 0.7, wb);
        }
      }
      if (wc > 0 && wd < 1) {
        journey(p, jp, t);
        x = mix(x, X, wc);
        y = mix(y, Y, wc);
        depth = mix(depth, 0.75, wc);
      }
      if (wd > 0) {
        const bx = p.kx + Math.sin(t * 1.1 + p.ph1) * 1.2;
        const by = p.ky + Math.cos(t * 0.9 + p.ph2) * 1.2;
        x = mix(x, bx, wd);
        y = mix(y, by, wd);
        depth = mix(depth, 0.8, wd);
      }

      // colour: its own tint first, then its decision (lime buy / cobalt hesitate / grey leave)
      const vk = Math.max(wc * clamp01((jp - 0.45) * 2.5), wd);
      let alpha = appear * (0.38 + 0.6 * depth);
      if (p.v === 2) alpha *= 1 - 0.45 * vk; // the ones who left fade back
      const rad = p.size * (0.75 + 0.5 * depth) * 1.7;
      draw(ctx, tintSprite[p.tint], x, y, rad, alpha * (1 - vk));
      draw(ctx, verdictSprite[p.v], x, y, rad, alpha * vk);
      // a short cobalt flash as each new profile appears
      if (appear < 1) draw(ctx, sprites.glowC, x, y, 12, appear * (1 - appear) * 2.2);
      // a restrained lime glow on some of the buyers once they've decided
      if (p.v === 0 && i % 3 === 0 && vk > 0.5) draw(ctx, sprites.glowL, x, y, 9, (vk - 0.5) * 0.45);
    }

    // ---- decision groups + one thin proportion bar (stage 4)
    if (W4 > 0.01) {
      const names = ["Buy", "Hesitate", "Leave"];
      const colors = [LIME, COBALT_SOFT, "#a3a9b4"];
      anchors.forEach(([ax, ay], k) => {
        label(ctx, names[k], ax, ay + discR[k] + (mobile ? 16 : 24), colors[k], W4 * 0.95, { align: "center", size: mobile ? 9.5 : 10.5, weight: 600 });
      });
      const bw = mobile ? w - 48 : R * 2.5;
      const bx = cx - bw / 2;
      const by = cy + R * (mobile ? 0.98 : 0.86);
      label(ctx, "Simulated outcome", bx, by - 14, WHITE, W4 * 0.5, { size: 9 });
      label(ctx, "Demo data", bx + bw, by - 14, WHITE, W4 * 0.38, { size: 9, align: "right" });
      const grow = easeInOut(clamp01((s - 3.15) / 0.75));
      let at = bx;
      const fills = [LIME, COBALT, "rgba(255,255,255,0.22)"];
      [shares.buy, shares.maybe, shares.no].forEach((sh, k) => {
        const segW = Math.max(0, sh * bw - 3);
        ctx.globalAlpha = W4;
        ctx.fillStyle = fills[k];
        ctx.fillRect(at, by - 1, segW * grow, 2);
        at += sh * bw;
      });
      // faint base line, so the bar reads as a whole even before it fills
      ctx.globalAlpha = W4 * 0.5;
      ctx.fillStyle = withAlpha(WHITE, 0.08);
      ctx.fillRect(bx, by - 1, bw, 2);
    }
    ctx.globalAlpha = 1;
  };
};
