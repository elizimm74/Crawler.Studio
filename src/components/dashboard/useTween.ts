"use client";
// A number that glides to its new value (counts up on first show, re-counts when you change an
// input). Instant for "reduce motion" and for the footer's "Calmer motion" switch.
import { useEffect, useRef, useState } from "react";

const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm");

export function useTween(target: number, ms = 900): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (still()) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const cur = a + (target - a) * (1 - Math.pow(1 - p, 3)); // ease-out
      from.current = cur;
      setValue(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}
