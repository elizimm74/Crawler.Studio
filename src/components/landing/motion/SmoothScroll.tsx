"use client";
// Inertial ("buttery") scrolling for EVERY page (mounted once in layout.tsx), in the spirit of Lenis (lenis.dev), written
// by hand so it needs no extra package.
//   - The mouse wheel / trackpad moves a TARGET position; the page eases toward it every frame.
//   - ONLY on desktop-style pointers (mouse / trackpad). Phones and tablets keep their own native
//     momentum scrolling. Anyone who asked for reduced motion keeps normal scrolling.
//   - Keyboard (space, page down, arrows), scrollbar dragging and find-in-page keep the browser's
//     own SMOOTH scrolling (CSS scroll-behavior); we only switch it off while our own glide runs,
//     so the two never fight.
//   - Scrollable boxes inside the page, text fields and pinch-zoom are left alone.
//   - Links like <a href="#features"> glide to their spot and stop just below the floating nav.
//   - It never locks or "snaps" the page: stop scrolling and it stops.
import { useEffect } from "react";

// How fast the page catches up with the wheel (a smooth deceleration). Lower = slower and softer.
const EASE = 5;
// Pages that ask for it (the home page: <div data-soft-scroll>) glide a little softer, and each wheel
// notch moves a bit less, so you can watch the animations (soft, but never sluggish).
const SOFT_EASE = 3.6;
const SOFT_STEP = 0.9;
const isSoft = () => document.querySelector("[data-soft-scroll]") !== null;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function canScrollInside(start: EventTarget | null, deltaY: number): boolean {
  let el = start instanceof HTMLElement ? start : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.dataset.smoothPrevent !== undefined || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const root = document.documentElement;
    const before = root.style.scrollBehavior;
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
    // Where a jump to a section should stop: its own scroll-margin, else just below the floating nav.
    const offsetFor = (el: Element) => {
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const nav = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 64;
      return Math.max(margin, nav + 16);
    };

    let target = window.scrollY;
    let current = window.scrollY;
    let moving = false;
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt * (isSoft() ? SOFT_EASE : EASE))); // frame-rate independent easing
      if (Math.abs(target - current) < 0.4) {
        current = target;
        moving = false;
      }
      window.scrollTo(0, current);
      if (moving) raf = requestAnimationFrame(tick);
      else root.style.scrollBehavior = before; // glide finished: keyboard scrolling is smooth again
    };
    const go = () => {
      if (moving) return;
      moving = true;
      root.style.scrollBehavior = "auto"; // while WE glide, the browser mustn't animate each step too
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (root.dataset.calm) return; // "Calmer motion" switch in the footer: use normal scrolling
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (canScrollInside(e.target, e.deltaY)) return;
      e.preventDefault();
      if (!moving) target = current = window.scrollY;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + e.deltaY * unit * (isSoft() ? SOFT_STEP : 1), 0, maxScroll());
      go();
    };
    // Something else scrolled the page (keyboard, scrollbar, find-in-page): follow it.
    const onScroll = () => {
      if (!moving && Math.abs(window.scrollY - current) > 1) target = current = window.scrollY;
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (id && !el) return;
      e.preventDefault();
      if (!moving) target = current = window.scrollY;
      target = clamp(el ? el.getBoundingClientRect().top + window.scrollY - offsetFor(el) : 0, 0, maxScroll());
      const oldUrl = window.location.href;
      history.replaceState(null, "", id ? `#${id}` : window.location.pathname);
      // replaceState is silent, so tell the page the #hash changed (e.g. the pricing page opens its
      // "Need more Crawlers?" form when the address says #custom)
      if (window.location.href !== oldUrl) window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: oldUrl, newURL: window.location.href }));
      go();
    };

    // Any OTHER way of scrolling (keyboard, grabbing the scrollbar) instantly ends our glide and
    // hands control back to the browser, so the two never fight over the page.
    const stop = () => {
      if (!moving) return;
      moving = false;
      cancelAnimationFrame(raf);
      target = current = window.scrollY;
      root.style.scrollBehavior = before;
    };
    const SCROLL_KEYS = ["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp", " ", "Spacebar"];
    const onKey = (e: KeyboardEvent) => SCROLL_KEYS.includes(e.key) && stop();

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("pointerdown", stop, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("pointerdown", stop);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      root.style.scrollBehavior = before;
    };
  }, []);
  return null;
}
