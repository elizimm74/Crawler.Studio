"use client";
// ONE SCROLL-DRIVEN "LAB" ANIMATION (used twice on the home page: 01 Customer simulation and
// 03 Behavioral patterns). How it works, in plain words:
//   - A tall "track" holds a "pin" that is exactly one screen high and sticks to the screen
//     (CSS position: sticky) while you scroll through the track. Nothing hijacks the wheel:
//     the page scrolls normally, we only READ how far through the track you are.
//   - That progress (0..1) becomes the scene's stage value s (0..4). It chases the real scroll
//     with a short ease, so motion speeds up and settles like the rest of the site.
//   - The canvas scene is a pure function of s: scroll back up and it plays backwards.
//   - Each time a new stage starts, its note fades up in the top-right corner (fades DOWN when
//     you're scrolling back), and four tiny ticks fill as you go.
//   - The drawing loop only runs while the track is on screen.
// Reduced motion (system setting) or the footer's "Calmer motion": no pin and no loop; the
// finished picture is drawn once and the four notes are listed under it (the CSS does the
// layout from the very first paint, see globals.css "LAB").
import { useEffect, useRef, useState } from "react";
import { patternsScene } from "./scenePatterns";
import { simulationScene } from "./sceneSimulation";
import type { Mix, Scene } from "./kit";
import { makePlate, type Plate } from "./crack";
import { STONE_URL } from "./stone";

// the stone texture as an image, loaded once and shared by both plates
let stoneImg: HTMLImageElement | null = null;
function stone(): HTMLImageElement {
  if (!stoneImg) {
    stoneImg = new Image();
    stoneImg.src = STONE_URL;
  }
  return stoneImg;
}

export type LabStage = { code: string; title: string; text: string };

const SCENES = { simulation: simulationScene, patterns: patternsScene };
const START = 0.05; // the first 5% of the track shows the starting state
const SPAN = 0.87; // the stages play over the next 87%; the rest holds the final picture

const damp = (from: number, to: number, lambda: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-lambda * dt));

function stillMode() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(document.documentElement.dataset.calm)
  );
}

export default function LabSequence({
  id,
  index,
  name,
  heading,
  hint,
  note,
  scene,
  stages,
  mix,
}: {
  id: string;
  index: string;
  name: string;
  heading: string;
  hint: string;
  note: string;
  scene: keyof typeof SCENES;
  stages: LabStage[];
  mix: Mix;
}) {
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const plateCv = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const [dir, setDir] = useState<"down" | "up">("down");
  const [still, setStill] = useState(false);
  const { buy, maybe, no } = mix;

  // follow the reduced-motion setting and the "Calmer motion" switch (it can change while open)
  useEffect(() => {
    const update = () => setStill(stillMode());
    update();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-calm"],
    });
    return () => {
      mq.removeEventListener("change", update);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = track.current;
    const box = pin.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    const pcv = plateCv.current;
    const pctx = pcv?.getContext("2d");
    if (!el || !box || !cv || !ctx || !pcv || !pctx) return;

    let draw: Scene | null = null;
    let plate: Plate | null = null;
    let tex: CanvasPattern | null = null;
    let lastC = -1;
    const img = stone();
    let w = 0;
    let h = 0;
    let shown = 0;
    let lastStage = -1;
    let raf = 0;
    let last = 0;
    let running = false;

    const target = () => {
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - box.offsetHeight);
      const p = Math.min(1, Math.max(0, -r.top / total));
      return Math.min(1, Math.max(0, (p - START) / SPAN)) * 4;
    };
    const paint = (s: number, t: number) => {
      if (!draw) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, s, t);
      box.style.setProperty("--s", s.toFixed(3));
      const st = s < 0.06 ? 0 : Math.min(stages.length, Math.floor(s) + 1);
      if (st !== lastStage) {
        if (lastStage >= 0) setDir(st > lastStage ? "down" : "up");
        lastStage = st;
        setStage(st);
      }
    };
    // the gray plate over the picture: cracks open as the track scrolls in (c 0 -> 1), closes again
    // when you scroll back. Its texture lines up with the region's background, so it's seamless.
    const paintPlate = (force = false) => {
      if (!plate) return;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const c = still ? 1 : Math.min(1, Math.max(0, (vh - top) / (vh * 0.9)));
      if (!force && Math.abs(c - lastC) < 0.0005) return;
      lastC = c;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pctx.clearRect(0, 0, w, h);
      if (!tex && img.complete && img.naturalWidth) tex = pctx.createPattern(img, "repeat");
      // line the texture up with the page's gray background (it starts at the page's top-left corner)
      const rect = pcv.getBoundingClientRect();
      const page = document.documentElement.getBoundingClientRect();
      plate(pctx, c, tex, page.left - rect.left, page.top - rect.top);
      pcv.style.visibility = c >= 1 ? "hidden" : "visible";
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      h = box.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      pcv.width = cv.width;
      pcv.height = cv.height;
      draw = SCENES[scene](w, h, { buy, maybe, no });
      plate = makePlate(w, h, w < 760);
      tex = null;
      paintPlate(true);
      if (still) paint(4, 0);
      else paint(shown, performance.now() / 1000);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      shown = damp(shown, target(), 7, dt);
      paint(shown, now / 1000);
      paintPlate();
      if (running) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running || still) return;
      running = true;
      last = performance.now();
      shown = target(); // no catch-up sweep when it comes into view
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    if (!img.complete) img.addEventListener("load", () => paintPlate(true), { once: true });
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const io = new IntersectionObserver(
      (entries) => (entries[0].isIntersecting ? start() : stop()),
      { rootMargin: "120px 0px" },
    );
    io.observe(el);
    // the canvas labels use Space Grotesk: redraw once it has loaded
    document.fonts?.ready
      .then(() => (still ? paint(4, 0) : null))
      .catch(() => {});

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, [scene, buy, maybe, no, stages.length, still]);

  const now = stage > 0 ? stages[stage - 1] : null;

  return (
    <section
      id={id}
      className={`lab-seq${still ? " is-still" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div ref={track} className="lab-track">
        <div
          ref={pin}
          className="lab-pin"
          style={{ "--s": 0 } as React.CSSProperties}
        >
          <canvas ref={canvas} className="lab-canvas" aria-hidden />
          <canvas ref={plateCv} className="lab-plate" aria-hidden />
          <div className="lab-head">
            <div className="lab-id">
              <p className="lab-tag">
                {index} / {name}
              </p>
              <h2 id={`${id}-title`} className="lab-h">
                {heading}
              </h2>
            </div>
            <div className="lab-panel" aria-hidden>
              <div className="lab-ticks">
                {stages.map((_, k) => (
                  <i key={k} style={{ "--k": k } as React.CSSProperties} />
                ))}
              </div>
              {now && (
                <div key={stage} className="lab-note" data-dir={dir}>
                  <p className="lab-code">
                    {now.code}
                    <span> / {stages[stages.length - 1].code}</span>
                  </p>
                  <p className="lab-title">{now.title}</p>
                  <p className="lab-text">{now.text}</p>
                </div>
              )}
            </div>
          </div>
          <p
            className="lab-hint"
            data-on={stage === 0 ? "1" : undefined}
            aria-hidden
          >
            {hint}
            <span />
          </p>
          <p className="lab-foot">{note}</p>
        </div>
      </div>
      {/* the four stages as plain text: read by screen readers, and shown under the picture in the still version */}
      <ol className="lab-list">
        {stages.map((st) => (
          <li key={st.code}>
            <p className="lab-code">{st.code}</p>
            <p className="lab-title">{st.title}</p>
            <p className="lab-text">{st.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
