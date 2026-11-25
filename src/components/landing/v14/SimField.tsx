"use client";
// "HOW A SIMULATION WORKS" — a particle animation drawn on a <canvas> (no library).
// Inspired by the idea on aaru.com (a dot population that becomes a 3D field), rebuilt for Crawler
// with our own steps, colours and DEMO data (the made-up MealMate run: 100 simulated customers).
//   1. Pick your customers   — a dot grid; exactly 100 dots light up (one per simulated customer)
//   2. Give each one a mind  — they lift into a 3D cloud, coloured by mindset
//   3. Send them to your site — the camera tilts; every customer streams up into a sketch of a site
//   4. See who buys, and why — they land in three groups: would buy / maybe / left (demo counts)
// Each dot moves between "poses" (one per step) with a little stagger, so it feels organic.
// SCROLL-DRIVEN: the animation stays pinned on screen (CSS sticky) while you scroll through a tall
// "track"; how far you've scrolled picks the step, and each change fades slowly into the next.
// The arrows still work: they scroll the page to that step, so scroll and step never disagree.
// A small "crawler" status chip on the stage says what Crawler is doing in each step.
// Reduced motion / "Calmer motion": not pinned, no animation loop; arrows show still pictures.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CrowdPoint } from "@/lib/homeDemo";
import Mark from "@/components/Mark";

type V3 = [number, number, number];
const GREEN = "#3e4a6e";
const DEEP = "#000000"; // darker green for the "would buy" number (readable text on white)
const MAYBE = "#8f8e87"; // "maybe" = light green (one brand green, in shades)
const GREY = "#c9d1cb";
// mindsets in step 2: shades of the brand green plus ink and grey, so the field stays on-brand
const MIND_COLORS = ["#3e4a6e", "#9f9f9f", "#cacaca", "#17221b", "#a3ada6"];

// Crawler's own words for each step. `status` is the little live chip on the stage.
const STEPS = [
  {
    title: "Crawler builds your crowd",
    body: "From the audience you pick, Crawler samples 100 simulated customers: different ages, budgets and devices. Never 100 copies of one person.",
    status: "Sampling 100 customers",
  },
  {
    title: "Every customer gets a mind",
    body: "A budget, a mindset, a dealbreaker and a reason they clicked, rolled in code from public research. So each one reacts differently.",
    status: "Giving each one a mind",
  },
  {
    title: "They visit your website",
    body: "Crawler's browser reads your page, pricing and signup once. Every customer judges it on a phone or laptop and decides as they go.",
    status: "Visiting",
  },
  {
    title: "You get the why, and the fix",
    body: "Counted in code, not guessed: who would buy, who might, who left, the reason each one gave, and the fix that wins the most back.",
    status: "Report ready",
  },
] as const;
const FADE_MS = 2300; // how long one step takes to melt into the next (slow on purpose)

// a tiny seeded random, so the picture is identical on every load
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Dot = { poses: V3[]; chosen: boolean; color1: string; color3: string; delay: number; seed: number; page: V3 };

function build(crowd: CrowdPoint[]): { dots: Dot[]; minds: string[]; counts: { buy: number; maybe: number; no: number } } {
  const r = rng(11);
  // 1) the grid (world units: x -1.6..1.6, y -0.8..0.8)
  const S = 0.075;
  const grid: [number, number][] = [];
  for (let y = -0.8; y <= 0.8001; y += S) for (let x = -1.6; x <= 1.6001; x += S) grid.push([x, y]);
  // the 100 grid points nearest the middle become the simulated customers
  const order = grid.map((g, i) => ({ i, d: g[0] * g[0] + (g[1] * 1.15) ** 2 })).sort((a, b) => a.d - b.d);
  const chosenIdx = new Set(order.slice(0, crowd.length).map((o) => o.i));
  const minds = [...new Set(crowd.map((c) => c.mindset))];
  // verdict groups for step 4 (sorted so each group packs together)
  const counts = { buy: 0, maybe: 0, no: 0 };
  crowd.forEach((c) => counts[c.v]++);
  const groupX = { buy: -0.95, maybe: 0, no: 0.95 } as const;
  const groupN = { buy: 0, maybe: 0, no: 0 };
  let ci = 0;
  const dots: Dot[] = grid.map(([gx, gy], i) => {
    const chosen = chosenIdx.has(i);
    const p0: V3 = [gx, gy, 0];
    if (!chosen) {
      // background: a loose cloud, then a wide floor disc (the "market")
      const a = r() * Math.PI * 2;
      const u = Math.sqrt(r());
      const cloud: V3 = [(r() - 0.5) * 3.4, (r() - 0.5) * 1.8, (r() - 0.5) * 2.2];
      const floor: V3 = [Math.cos(a) * u * 2.1, -0.42 + (r() - 0.5) * 0.04, Math.sin(a) * u * 1.5];
      return { poses: [p0, cloud, floor, floor], chosen, color1: "", color3: "", delay: r() * 0.35, seed: r() * 100, page: [0, 0, 0] };
    }
    const c = crowd[ci++];
    // cloud: a sphere around the middle
    const th = r() * Math.PI * 2;
    const ph = Math.acos(2 * r() - 1);
    const rad = 0.18 + Math.cbrt(r()) * 0.32;
    const cloud: V3 = [Math.sin(ph) * Math.cos(th) * rad, Math.cos(ph) * rad * 0.9, Math.sin(ph) * Math.sin(th) * rad];
    // visit: a tight inner disc on the floor
    const a = r() * Math.PI * 2;
    const u = Math.sqrt(r()) * 0.42;
    const visit: V3 = [Math.cos(a) * u, -0.4, Math.sin(a) * u * 0.8];
    // outcome: a sunflower spiral inside their verdict group
    const k = ++groupN[c.v];
    const ga = k * 2.39996;
    const gr = 0.06 * Math.sqrt(k);
    const out: V3 = [groupX[c.v] + Math.cos(ga) * gr, -0.4, Math.sin(ga) * gr * 0.8];
    // where on the floating site this customer "lands" during step 3
    const page: V3 = [(r() - 0.5) * 0.8, 0.3 + r() * 0.26, 0.35];
    return {
      poses: [p0, cloud, visit, out],
      chosen,
      color1: MIND_COLORS[Math.max(0, minds.indexOf(c.mindset)) % MIND_COLORS.length],
      color3: c.v === "buy" ? DEEP : c.v === "maybe" ? MAYBE : GREY,
      delay: r() * 0.35,
      seed: r() * 100,
      page,
    };
  });
  return { dots, minds, counts };
}

type Props = { crowd: CrowdPoint[]; host?: string; topFix?: string; winBack?: number };

export default function SimField({ crowd, host = "yoursite.com", topFix, winBack }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // pinned = scroll-driven. Turned off for reduced motion / Calmer motion (set in the effect below).
  const [pinned, setPinned] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const state = useRef({ from: 0, to: 0, start: 0, visible: false, still: false });
  const data = useRef<ReturnType<typeof build> | null>(null);
  const redraw = useRef<(() => void) | null>(null);
  if (!data.current) data.current = build(crowd);
  const { minds, counts } = data.current;

  const go = useCallback((n: number, byHand = false) => {
    const s = state.current;
    s.from = s.to;
    s.to = (n + STEPS.length) % STEPS.length;
    s.start = performance.now();
    setStep(s.to);
    if (byHand) setAuto(false);
  }, []);

  // autoplay only when NOT scroll-driven (the scroll moves the steps otherwise)
  useEffect(() => {
    if (!auto || pinned) return;
    const t = setInterval(() => state.current.visible && !state.current.still && go(state.current.to + 1), 4800);
    return () => clearInterval(t);
  }, [auto, go, pinned]);

  // SCROLL -> STEP: how far through the tall track you are picks the step (0..3)
  useEffect(() => {
    if (!pinned) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = track.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(0.9999, Math.max(0, -el.getBoundingClientRect().top / total));
      const n = Math.floor(p * STEPS.length);
      if (n !== state.current.to) go(n);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pinned, go]);

  // the arrows: when pinned, glide the page to the middle of that step's stretch of the track
  const jump = (n: number) => {
    const el = track.current;
    if (!pinned || !el) return go(n, true);
    const k = Math.max(0, Math.min(STEPS.length - 1, n));
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + total * ((k + 0.5) / STEPS.length);
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const el = canvas.current!;
    const box = wrap.current!;
    const ctx = el.getContext("2d")!;
    const s = state.current;
    s.still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || Boolean(document.documentElement.dataset.calm);
    if (s.still) setPinned(false);
    let W = 0, H = 0, dpr = 1, raf = 0;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = box.clientWidth;
      H = box.clientHeight;
      el.width = W * dpr;
      el.height = H * dpr;
      el.style.width = `${W}px`;
      el.style.height = `${H}px`;
      if (s.still) draw(performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (e.isIntersecting && !s.still) loop();
    }, { threshold: 0.15 });
    io.observe(box);

    const dots = data.current!.dots;
    const cnt = data.current!.counts;
    // camera: tilt (look down at the floor) and a slow turn, per step
    const TILT = [0, 0.12, 0.62, 0.7];
    const TURN = [0, 0.35, 0.12, 0];

    function draw(now: number) {
      const T = s.still ? 1 : Math.min(1, (now - s.start) / FADE_MS);
      const from = s.still ? s.to : s.from;
      const to = s.to;
      const time = now / 1000;
      const tilt = mix(TILT[from], TILT[to], ease(T));
      const turn = mix(TURN[from], TURN[to], ease(T)) + (s.still ? 0 : Math.sin(time * 0.12) * 0.08 * (to === 1 ? 1 : 0.4));
      const U = Math.min(W / 3.4, H / 1.9);
      const cx = W / 2;
      const cy = H * (to >= 2 ? 0.52 : 0.47);
      const F = 3.2;
      const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(turn), sr = Math.sin(turn);
      const project = (p: V3) => {
        // turn around the vertical axis, then tilt toward the floor
        const x1 = p[0] * cr - p[2] * sr;
        const z1 = p[0] * sr + p[2] * cr;
        const y2 = p[1] * ct + z1 * st;
        const z2 = -p[1] * st + z1 * ct;
        const k = F / (F + z2);
        return { x: cx + x1 * k * U, y: cy - y2 * k * U, k };
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const showPage = (to === 2 ? ease(T) : from === 2 ? 1 - ease(T) : 0) * 1;
      // the floating website sketch (step 3)
      if (showPage > 0.01) {
        const c = [[-0.5, 0.62, 0.35], [0.5, 0.62, 0.35], [0.5, 0.22, 0.35], [-0.5, 0.22, 0.35]].map((q) => project(q as V3));
        ctx.globalAlpha = showPage;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(12,32,20,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        c.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        const lerp2 = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
        const at = (u: number, v: number) => lerp2(lerp2(c[0], c[1], u), lerp2(c[3], c[2], u), v);
        const bar = (u0: number, u1: number, v: number, w: number, col: string) => {
          const a = at(u0, v), b = at(u1, v);
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        };
        bar(0.07, 0.3, 0.12, 3, "rgba(12,32,20,0.55)");
        bar(0.07, 0.75, 0.32, 6, "rgba(12,32,20,0.16)");
        bar(0.07, 0.55, 0.46, 4, "rgba(12,32,20,0.12)");
        bar(0.07, 0.3, 0.64, 9, GREEN);
        bar(0.07, 0.28, 0.86, 4, "rgba(12,32,20,0.1)");
        bar(0.38, 0.6, 0.86, 4, "rgba(12,32,20,0.1)");
        bar(0.69, 0.92, 0.86, 4, "rgba(12,32,20,0.1)");
        ctx.globalAlpha = 1;
      }

      // dots
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const lt = s.still ? 1 : ease(Math.max(0, Math.min(1, (T - d.delay * 0.6) / 0.8)));
        const a = d.poses[from], b = d.poses[to];
        const wob = s.still ? 0 : 0.012;
        const p: V3 = [
          mix(a[0], b[0], lt) + Math.sin(time * 0.9 + d.seed) * wob * (to === 1 ? 2 : 1),
          mix(a[1], b[1], lt) + Math.cos(time * 0.8 + d.seed) * wob * (to === 1 ? 2 : 0.4),
          mix(a[2], b[2], lt),
        ];
        const q = project(p);
        if (q.k <= 0) continue;
        let color: string, size: number, alpha: number;
        if (!d.chosen) {
          color = "#17221b";
          size = 1.35 * q.k;
          const al = [0.2, 0.13, 0.26, 0.08];
          alpha = mix(al[from], al[to], lt);
        } else {
          const col = [GREEN, d.color1, GREEN, d.color3];
          color = lt < 0.5 ? col[from] : col[to];
          size = 2.6 * q.k;
          alpha = 0.95;
          // step 3: a trail from each customer up to the site, with a light running along it
          if (to === 2 && lt > 0.6) {
            const tq = project(d.page);
            const trail = Math.min(1, (lt - 0.6) / 0.4);
            ctx.globalAlpha = 0.16 * trail;
            ctx.strokeStyle = GREEN;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(q.x, q.y);
            ctx.lineTo(tq.x, tq.y);
            ctx.stroke();
            const run = (time * 0.45 + d.seed) % 1;
            ctx.globalAlpha = 0.85 * trail;
            ctx.fillStyle = GREEN;
            ctx.beginPath();
            ctx.arc(mix(q.x, tq.x, run), mix(q.y, tq.y, run), 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // step 4: the group labels under each cluster (demo counts)
      if (to === 3) {
        const al = ease(Math.max(0, (T - 0.45) / 0.55));
        const labels: [number, string, number, string][] = [
          [-0.95, "would buy", cnt.buy, GREEN],
          [0, "maybe", cnt.maybe, "#868686"],
          [0.95, "left", cnt.no, "#68736b"],
        ];
        ctx.globalAlpha = al;
        ctx.textAlign = "center";
        for (const [x, word, n, col] of labels) {
          const q = project([x, -0.4, 0.62]);
          ctx.fillStyle = col;
          ctx.font = `600 ${Math.round(Math.max(18, U * 0.17))}px Geist, system-ui, sans-serif`;
          ctx.fillText(String(n), q.x, q.y);
          ctx.fillStyle = "#68736b";
          ctx.font = `500 ${Math.round(Math.max(11, U * 0.075))}px Geist, system-ui, sans-serif`;
          ctx.fillText(word, q.x, q.y + Math.max(16, U * 0.11));
        }
        ctx.globalAlpha = 1;
      }
    }

    function loop() {
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        draw(now);
        if (s.visible) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    redraw.current = () => draw(performance.now());
    resize();
    if (s.still) draw(performance.now());
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // still mode: redraw when the step changes (no loop is running)
  useEffect(() => {
    if (state.current.still) redraw.current?.();
  }, [step]);

  const status = step === 2 ? `Visiting ${host}` : STEPS[step].status;
  const last = step === STEPS.length - 1;
  return (
    <div ref={track} className={pinned ? "field14-track" : undefined}>
      <div className={pinned ? "field14-pin" : undefined}>
        <div className="field14">
          <div ref={wrap} className="field14-stage">
            <canvas ref={canvas} aria-hidden />
            {/* what Crawler is doing right now (demo) */}
            <div className="field14-chip" aria-hidden>
              <span className="logo-tile is-small">
                <Mark size={13} className="text-white" />
              </span>
              <span className="font-medium text-fg">crawler</span>
              <span className="text-faint">·</span>
              <span key={step} className="field14-fade inline-flex items-center gap-1.5 text-muted">
                <i className={`field14-dot ${last ? "is-done" : ""}`} />
                {status}
              </span>
            </div>
          </div>
          <div className="field14-card" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div key={step} className="field14-fade min-w-0">
                <p className="text-[12px] font-medium text-faint">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h3 className="mt-1 text-lg font-medium tracking-tight">{STEPS[step].title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{STEPS[step].body}</p>
                {step === 1 && (
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                    {minds.map((m, k) => (
                      <span key={m} className="inline-flex items-center gap-1.5 capitalize">
                        <i className="h-2 w-2 rounded-full" style={{ background: MIND_COLORS[k % MIND_COLORS.length] }} /> {m}
                      </span>
                    ))}
                  </p>
                )}
                {last && (
                  <p className="mt-3 text-[12px] text-faint">
                    {counts.buy} would buy · {counts.maybe} maybe · {counts.no} left
                    {topFix ? ` · Fix #1: ${topFix}${winBack ? ` (+${winBack})` : ""}` : ""}. Demo data from a made-up site.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="field14-btn" aria-label="Previous step" disabled={pinned && step === 0} onClick={() => jump(step - 1)}>
                  ←
                </button>
                <button type="button" className="field14-btn is-next" aria-label="Next step" disabled={pinned && last} onClick={() => jump(step + 1)}>
                  →
                </button>
              </div>
            </div>
            <div className="field14-progress" aria-hidden>
              {STEPS.map((_, k) => (
                <i key={k} className={k === step ? "is-on" : k < step ? "is-done" : ""} />
              ))}
            </div>
          </div>
        </div>
        {pinned && (
          <p className={`field14-hint ${last ? "is-gone" : ""}`} aria-hidden>
            Keep scrolling <span>↓</span>
          </p>
        )}
      </div>
    </div>
  );
}
