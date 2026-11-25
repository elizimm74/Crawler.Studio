"use client";
// A big statement whose words light up one by one as you scroll through it.
// *word* = an accent word. Words start pale and end solid. The lighting follows the scroll with a
// short lag (like klad.design's scrubbed text): it eases along and settles when you stop.
// `bare`: use only your own className (no default heading style), e.g. for the home statement.
import { useEffect, useMemo, useRef } from "react";

export default function Manifesto({ text, className = "", bare = false }: { text: string; className?: string; bare?: boolean }) {
  const box = useRef<HTMLParagraphElement>(null);
  const words = useMemo(() => {
    let emph = false;
    return text.split(/\s+/).map((tok) => {
      if (tok.startsWith("*")) emph = true;
      const w = { w: tok.replace(/\*/g, ""), emph };
      if (/\*[.,!?]*$/.test(tok)) emph = false;
      return w;
    });
  }, [text]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const spans = [...el.querySelectorAll<HTMLElement>("[data-w]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spans.forEach((s) => (s.style.opacity = "1"));
      return;
    }
    let raf = 0;
    let shown = -1; // the lighting we show, chasing the scroll position
    let last = 0;
    const target = () => {
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      return Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.45 + r.height))); // 0 as it enters, 1 as it leaves the middle
    };
    const paint = (p: number) => {
      const t = p * (spans.length + 4);
      spans.forEach((s, i) => (s.style.opacity = String(0.16 + 0.84 * Math.min(1, Math.max(0, t - i)))));
    };
    const update = (now: number) => {
      const goal = target();
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const calm = Boolean(document.documentElement.dataset.calm);
      shown = shown < 0 || calm ? goal : shown + (goal - shown) * (1 - Math.exp(-5 * dt));
      paint(shown);
      raf = Math.abs(goal - shown) > 0.0005 ? requestAnimationFrame(update) : 0;
    };
    const onScroll = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(update);
    };
    shown = target();
    paint(shown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [words]);

  return (
    <p ref={box} className={bare ? className : `t-chunk mx-auto max-w-5xl text-balance ${className}`}>
      {words.map((w, i) => (
        <span key={i} data-w className={w.emph ? "text-accent" : ""} style={{ opacity: 1 }}>
          {w.w}{" "}
        </span>
      ))}
    </p>
  );
}
