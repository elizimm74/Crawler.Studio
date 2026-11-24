"use client";
// The small sticky "table of contents" on the left of the dark section (04 Research ...),
// highlighting the part you're reading.
import { useEffect, useState } from "react";

export default function Toc({ label, items }: { label: string; items: { id: string; n: string; title: string }[] }) {
  const [on, setOn] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setOn(vis.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label={label} className="toc sticky top-28 hidden lg:block">
      <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">{label}</p>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} className={on === i.id ? "on" : ""}>
          <span className="n">{i.n}</span> {i.title}
        </a>
      ))}
    </nav>
  );
}
