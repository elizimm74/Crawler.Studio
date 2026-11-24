"use client";
// A "reaction": the thing inside leans a few degrees toward the mouse, like a card you can pick up.
// Desktop mice only; off for touch screens, reduced motion and "Calmer motion".
import { useRef } from "react";

export default function Tilt({ children, max = 4, className = "" }: { children: React.ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const ok = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !document.documentElement.dataset.calm;
  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      onPointerMove={(e) => {
        if (!ok() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.transform = `perspective(1400px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateY(-4px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}
