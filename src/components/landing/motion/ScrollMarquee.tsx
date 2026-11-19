"use client";
// Giant type that drifts sideways forever. Scroll and it speeds up; scroll the other way
// and it turns around. Alternating words are outlined and solid. Stops when off screen.
import { LOGO_PATHS, LOGO_TRANSFORM } from "../../Mark";
import { useEffect, useRef } from "react";

const COPIES = 3;

export default function ScrollMarquee({ items, label }: { items: string[]; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = track.current;
    const w = wrap.current;
    if (!t || !w || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = 0;
    let dir = -1;
    let speed = 0; // extra speed from scrolling
    let lastY = window.scrollY;
    let last = performance.now();
    let raf = 0;
    let visible = false;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? -1 : 1;
      speed += (Math.abs(dy) / Math.max(dt, 0.001) - speed) * 0.08;
      const unit = t.scrollWidth / COPIES;
      x += dir * (70 + speed * 0.45) * dt;
      if (x <= -unit) x += unit;
      if (x > 0) x -= unit;
      t.style.transform = `translate3d(${x}px,0,0)`;
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        last = performance.now();
        lastY = window.scrollY;
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(w);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrap} className="bleed select-none overflow-hidden py-6" role="group" aria-label={label}>
      <p className="sr-only">{items.join(", ")}</p>
      <div ref={track} className="flex w-max items-center whitespace-nowrap" aria-hidden>
        {Array.from({ length: COPIES }).flatMap((_, c) =>
          items.map((word, i) => (
            <span key={`${c}-${i}`} className="flex items-center">
              <span className={`marquee-word ${i % 2 ? "is-solid" : ""}`}>{word}</span>
              <svg className="mx-[3vw] h-[6vw] w-[6vw] shrink-0 text-accent" viewBox="0 0 120 120" fill="currentColor">
                <g transform={LOGO_TRANSFORM}>
                  {LOGO_PATHS.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
              </svg>
            </span>
          )),
        )}
      </div>
    </div>
  );
}
