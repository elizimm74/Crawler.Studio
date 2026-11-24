"use client";
// WASHED COLOUR CHANGES (like aaru.com): each home section names two soft tints in `data-wash`
// ("base highlight"). Whichever section is in the middle of the screen sets the page colour, and a
// fixed layer behind everything fades to it (CSS transition, 1.4s). The tints are very pale on
// purpose: strong colours would look cheap; green stays the only strong colour on the site.
// Calm / reduced motion: the colour still changes, just without the slow fade.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function WashScroll() {
  // rendered into <body> through a portal: <main> has an entrance animation (a transform), and a
  // transformed parent would pin position:fixed to itself instead of to the screen
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-wash]"));
    const set = (el: HTMLElement) => {
      const [base, glow] = (el.dataset.wash || "").split(" ");
      if (base) root.style.setProperty("--wash", base);
      if (glow) root.style.setProperty("--wash-glow", glow);
    };
    if (sections[0]) set(sections[0]);
    root.classList.add("washed");
    // a thin band across the middle of the screen decides which section "owns" the colour
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && set(e.target as HTMLElement)), {
      rootMargin: "-45% 0px -45% 0px",
    });
    sections.forEach((s) => io.observe(s));
    return () => {
      io.disconnect();
      root.classList.remove("washed");
    };
  }, []);

  if (!ready) return null;
  return createPortal(
    <div className="wash-layer" aria-hidden>
      <span className="wash-glow wash-glow-a" />
      <span className="wash-glow wash-glow-b" />
    </div>,
    document.body,
  );
}
