"use client";
// SCROLL-SCRUBBED MOTION (the "speeds up and slows down" feel of klad.design, written by hand: no GSAP).
// Any element with data-scrub gets a CSS variable --p (0 -> 1) that follows the scroll position,
// but with a LAG: it chases the real position and eases in, so things speed up when you start
// scrolling and coast to a stop after you stop. CSS turns --p into movement (see globals.css "v20").
//   data-scrub="pass"   0 when the element's top reaches the bottom of the screen, 1 when its bottom leaves the top
//   data-scrub="enter"  0 when it starts to appear, 1 when its middle reaches the middle of the screen
//   data-scrub="leave"  0 where it sits when the page opens, 1 when it has scrolled off the top
//   data-lag="1"        seconds of lag (default 1; smaller = tighter)
// The same elements also get --v / --va: the scroll SPEED (smoothed, -1..1 and 0..1), used for the
// faint "echo" copies that trail behind big text when you scroll fast.
// Reduced motion / "Calmer motion": nothing moves (the CSS ignores --p), and this loop doesn't run.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
// frame-rate independent "chase": move a share of the remaining distance each frame
const damp = (from: number, to: number, lambda: number, dt: number) => from + (to - from) * (1 - Math.exp(-lambda * dt));

function progress(el: HTMLElement, mode: string, vh: number): number {
  const r = el.getBoundingClientRect();
  if (mode === "leave") return clamp01(window.scrollY / Math.max(1, r.bottom + window.scrollY));
  if (mode === "enter") return clamp01((vh - r.top) / Math.max(1, vh / 2 + r.height / 2));
  return clamp01((vh - r.top) / Math.max(1, vh + r.height)); // "pass"
}

export default function ScrollScrub() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type Item = { el: HTMLElement; mode: string; lambda: number; shown: number };
    let items: Item[] = [];
    const collect = () => {
      const vh = window.innerHeight;
      items = [...document.querySelectorAll<HTMLElement>("[data-scrub]")].map((el) => {
        const mode = el.dataset.scrub || "pass";
        const lag = Math.max(0.15, Number(el.dataset.lag ?? 1) || 1);
        const now = progress(el, mode, vh);
        el.style.setProperty("--p", now.toFixed(4)); // start where it is: no jump on load
        return { el, mode, lambda: 4 / lag, shown: now }; // lambda 4/s ≈ 98% caught up after `lag` seconds
      });
    };
    collect();
    if (!items.length) return;

    let raf = 0;
    let last = 0;
    let lastY = window.scrollY;
    let speed = 0; // px per second, smoothed

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const calm = Boolean(root.dataset.calm);
      const vh = window.innerHeight;
      const y = window.scrollY;
      speed = damp(speed, (y - lastY) / dt, 6, dt);
      lastY = y;
      const v = Math.max(-1, Math.min(1, speed / 2500));
      let busy = Math.abs(speed) > 4;
      for (const it of items) {
        const target = progress(it.el, it.mode, vh);
        it.shown = calm ? target : damp(it.shown, target, it.lambda, dt);
        if (Math.abs(target - it.shown) > 0.0004) busy = true;
        it.el.style.setProperty("--p", it.shown.toFixed(4));
        it.el.style.setProperty("--v", v.toFixed(3));
        it.el.style.setProperty("--va", Math.abs(v).toFixed(3));
      }
      raf = busy ? requestAnimationFrame(tick) : 0; // sleeps when everything has settled
    };
    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      collect();
      wake();
    };

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
