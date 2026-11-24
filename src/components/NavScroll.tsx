"use client";
// Tells the CSS when the page has been scrolled, so the floating nav pill can tighten up
// (a little smaller, a bit more solid). Nothing else; no layout jumps.
import { useEffect } from "react";

export default function NavScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const on = () => {
      const s = window.scrollY > 24 ? "1" : "";
      if ((root.dataset.scrolled ?? "") !== s) s ? (root.dataset.scrolled = s) : delete root.dataset.scrolled;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return null;
}
