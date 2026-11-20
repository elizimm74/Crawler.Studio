"use client";
// The frame around every report: a soft glow behind the top, and a sticky glass nav that jumps to
// each section and lights up the one you're reading (scroll-spy via IntersectionObserver).
// Sections are found by their id, so each report just puts an id on its sections.
import { useEffect, useState } from "react";

export type NavSection = { id: string; label: string };

export default function ReportShell({ sections, children, wide = false }: { sections: NavSection[]; children: React.ReactNode; wide?: boolean }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    if (!els.length) return;
    // the section that crosses the line 30% from the top of the screen is the one you're reading
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const go = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm");
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className={`report report-stage mx-auto ${wide ? "max-w-5xl" : "max-w-4xl"}`}>
      <nav aria-label="Report sections" className="sticky top-[4.75rem] z-30 mb-8 flex justify-center">
        <div className="rnav max-w-full">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => go(e, s.id)} aria-current={active === s.id ? "true" : undefined}>
              {s.label}
            </a>
          ))}
        </div>
      </nav>
      <div className="space-y-12 sm:space-y-14">{children}</div>
    </div>
  );
}
