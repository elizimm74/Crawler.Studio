"use client";
// SCROLL ANIMATIONS FOR EVERY PAGE, with one small helper (mounted once in layout.tsx).
// It looks for the main building blocks on the page (headings, cards, tiles, tables, FAQ rows...)
// and lets each one gently fade and rise in the first time it scrolls into view.
//   - Only blocks that are still BELOW the screen when the page opens get the effect, so nothing
//     you can already see blinks or disappears.
//   - Blocks that scroll in together come in one after another (a small stagger).
//   - New content that shows up later (dashboard tabs, a finished report) is picked up too.
//   - Off for "reduce motion" (system setting) and the footer's "Calmer motion" switch.
// It uses the CSS `translate` property (not `transform`), so hover lifts on cards still work.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BLOCKS = [
  "h2",
  ".head14",
  ".statement14",
  ".tile14",
  ".bento14-cell",
  ".card",
  ".card-raised",
  ".paper:not(.bleed)",
  ".fl-panel",
  ".fl-tile",
  ".gpanel",
  "details",
  "table",
  "figure",
  ".rp",
  ".honest14",
  ".final14",
  ".pack-card",
  ".lock-panel",
  "#custom",
  "[data-reveal]",
].join(",");

// never animate these (or anything inside them): they have their own motion or must stay put
const SKIP = "header, nav, .dash-rail, .fl-rail, .reveal, .sim, .field14, .lab-seq, [data-no-reveal]";

export default function AutoReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.calm) return;
    const main = document.getElementById("main");
    if (!main || !("IntersectionObserver" in window)) return;

    let queue: HTMLElement[] = [];
    let flush = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          queue.push(e.target as HTMLElement);
        }
        // everything that arrived in this frame comes in one after another
        cancelAnimationFrame(flush);
        flush = requestAnimationFrame(() => {
          queue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          queue.forEach((el, k) => {
            el.style.transitionDelay = `${Math.min(k, 6) * 70}ms`; // a short stagger, so a row reads left to right
            el.classList.add("ar-in");
            // once it has risen in, drop the delay so hover/press effects react instantly
            window.setTimeout(() => (el.style.transitionDelay = ""), 1200);
          });
          queue = [];
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const scan = () => {
      const fold = window.innerHeight;
      const picked: HTMLElement[] = [];
      for (const el of main.querySelectorAll<HTMLElement>(BLOCKS)) {
        if (el.dataset.ar) continue;
        el.dataset.ar = "1";
        if (el.closest(SKIP)) continue;
        if (picked.some((p) => p.contains(el))) continue; // the bigger block already moves it
        if (el.getBoundingClientRect().top < fold) continue; // already on screen: leave it alone
        picked.push(el);
        el.classList.add("ar");
        io.observe(el);
      }
    };

    // wait one frame so the new page has laid out
    const first = requestAnimationFrame(scan);
    let t = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(scan, 120);
    });
    mo.observe(main, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(flush);
      clearTimeout(t);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
