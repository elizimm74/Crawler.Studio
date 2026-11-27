"use client";
// PHONES ONLY: a "Run simulation" bar at the bottom of the screen, within thumb reach.
// It appears once the hero's URL box has scrolled out of view and hides again while the final URL
// box (bottom of the page) is visible, so there's never two of them on screen. Tapping it glides back
// to the hero box and puts the cursor in it (the phone keyboard opens), one tap from typing a URL.
// It is rendered straight into <body> (a "portal"): inside <main>, the page's entrance animation
// would trap position:fixed and the bar would never reach the bottom of the screen.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function StickyRun() {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const hero = document.getElementById("hero-url");
    const final = document.getElementById("final-url");
    if (!hero) return;
    let heroGone = false;
    let finalHere = false;
    const update = () => setShow(heroGone && !finalHere);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroGone = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === final) finalHere = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    if (final) io.observe(final);
    return () => io.disconnect();
  }, []);

  function go() {
    const input = document.getElementById("hero-url") as HTMLInputElement | null;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    // focus after the glide starts (focusing first would jump the page on iOS)
    window.setTimeout(() => input.focus({ preventScroll: true }), 350);
  }

  if (!ready) return null;
  return createPortal(
    <div className="sticky-run md:hidden" data-show={show ? "1" : undefined} aria-hidden={!show}>
      <button type="button" onClick={go} tabIndex={show ? 0 : -1} className="btn btn-primary h-14 w-full text-base">
        Run simulation · free
      </button>
    </div>,
    document.body,
  );
}
