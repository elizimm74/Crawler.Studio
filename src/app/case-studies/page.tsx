// /case-studies: real founders who tested with Crawler (with their permission). Reads src/lib/caseStudies.ts.
import Link from "next/link";
import { publishedCaseStudies } from "@/lib/caseStudies";

export const metadata = {
  title: "Founder case studies",
  description: "Real founders testing their products with Crawler's simulated customers.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudies() {
  const list = publishedCaseStudies();
  return (
    <div className="mx-auto max-w-5xl py-12 sm:py-16">
      <p className="eyebrow14">Founder case studies</p>
      <h1 className="h2-14 mt-4 max-w-2xl">Real founders. Real products.</h1>
      <p className="mt-4 max-w-xl text-muted">Founders who agreed to share their story and run their product through Crawler. Their numbers are their own, and we say so.</p>
      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {list.map((c) => (
          <li key={c.slug}>
            <Link href={`/case-studies/${c.slug}`} className="cs-card group block">
              <div className="cs-card-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photo} alt={c.photoAlt} loading="lazy" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.icon} alt="" aria-hidden className="cs-card-icon" />
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                  {c.product} · {c.kind}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {c.founder}, {c.age}
                </h2>
                <p className="mt-2 text-sm text-muted">{c.summary}</p>
                <p className="mt-4 text-sm font-medium underline-offset-4 group-hover:underline">Read the case study →</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
