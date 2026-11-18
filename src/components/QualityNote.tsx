// A short, honest note at the end of a report: how varied the customers' answers were,
// and any warning from the answer checks (src/lib/quality.ts). Older runs have no data: shows nothing.
import type { Quality } from "@/lib/quality";

export default function QualityNote({ quality }: { quality?: Quality }) {
  if (!quality) return null;
  return (
    <div className="card p-5 text-sm">
      <p className="t-label">answer check</p>
      <p className="mt-2">
        {quality.answers} answers · {quality.uniqueQuotesPct}% unique quotes · {quality.uniqueReasonsPct}% unique reasons
        {quality.thoughtful ? ` · ${quality.thoughtful} with their reasoning` : ""}
      </p>
      {quality.flags.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {quality.flags.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted">No warning signs: the crowd gave varied, specific answers.</p>
      )}
    </div>
  );
}
