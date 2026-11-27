// The shared frame for the legal pages (/terms, /privacy, /refunds): a title, dates, a short
// "the simple version" box, then numbered sections, all on one readable white sheet.
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

export default function LegalPage({
  label,
  title,
  summary,
  sections,
}: {
  label: string;
  title: string;
  summary: string[];
  sections: LegalSection[];
}) {
  return (
    <div className="legal card mx-auto max-w-3xl px-6 py-10 sm:px-12 sm:py-14">
      <p className="t-label">{label}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted">
        Last updated {LEGAL.updated} · Applies from {LEGAL.effective}
      </p>

      <div className="legal-summary mt-8 rounded-2xl border border-line p-5">
        <p className="text-sm font-semibold">The simple version</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px]">
          {summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">This summary helps you read the page; the full text below is what applies.</p>
      </div>

      <nav aria-label="On this page" className="mt-8 text-sm">
        <ol className="grid gap-1 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted underline-offset-4 hover:text-fg hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="text-xl font-semibold tracking-tight">
              {i + 1}. {s.title}
            </h2>
            <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Questions? Email <a className="underline underline-offset-2" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. See also our{" "}
        <Link className="underline underline-offset-2" href="/terms">Terms</Link>,{" "}
        <Link className="underline underline-offset-2" href="/privacy">Privacy Policy</Link> and{" "}
        <Link className="underline underline-offset-2" href="/refunds">Refund Policy</Link>.
      </p>
    </div>
  );
}
