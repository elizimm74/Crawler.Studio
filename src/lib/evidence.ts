// ENGINE v2, part 4: FORCE EVIDENCE. Every decision must point at an exact page element.
// The AI copies the words it reacted to; this file checks IN CODE that those words really are on
// the crawled pages (or the explorer's screens). Quotes that aren't found are kept but marked
// unverified, and the report counts how many decisions are backed by real page text.
import type { Crawl, Evidence, EvidenceKind, Journey } from "./types";

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[^a-z0-9$€£%.,/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// The searchable text of everything a customer could have seen.
export function evidenceHaystack(crawl: Pick<Crawl, "pages">, journey?: Journey): string {
  const parts = crawl.pages.map((p) => `${p.title}\n${p.text}\n${p.signals.pricesSeen.join(" ")}`);
  for (const s of journey?.steps ?? []) parts.push(s.observation);
  return norm(parts.join("\n"));
}

// true = found (all of it, or at least 80% of its words in order-insensitive chunks for longer quotes);
// false = not found; null = can't be checked (something missing, or a picture).
export function verifyEvidence(kind: EvidenceKind, text: string, haystack: string): boolean | null {
  if (kind === "missing" || kind === "image") return null;
  const t = norm(text.replace(/^missing:\s*/i, ""));
  if (t.length < 2) return false;
  if (haystack.includes(t)) return true;
  // long quotes: allow small differences (cut words, different spacing) by checking 4-word chunks
  const words = t.split(" ");
  if (words.length < 6) return false;
  let hit = 0;
  let chunks = 0;
  for (let i = 0; i + 4 <= words.length; i += 2) {
    chunks++;
    if (haystack.includes(words.slice(i, i + 4).join(" "))) hit++;
  }
  return chunks > 0 && hit / chunks >= 0.8;
}

export function makeEvidence(kind: EvidenceKind, text: string, step: Evidence["step"], haystack: string): Evidence {
  const clean = text.trim().slice(0, 200);
  const isMissing = kind === "missing" || /^missing:/i.test(clean);
  const k: EvidenceKind = isMissing ? "missing" : kind;
  return { kind: k, text: clean.replace(/^missing:\s*/i, ""), step, verified: verifyEvidence(k, clean, haystack) };
}

export type EvidenceCount = { kind: EvidenceKind; text: string; count: number; verified: boolean | null };

// The page elements cited most, merged by their normalized words.
export function topEvidence(list: (Evidence | undefined)[], max = 5): EvidenceCount[] {
  const by = new Map<string, EvidenceCount>();
  for (const e of list) {
    if (!e || !e.text) continue;
    if (e.verified === false) continue; // unverified quotes never become "the reason"
    const key = `${e.kind}|${norm(e.text)}`;
    const cur = by.get(key) ?? { kind: e.kind, text: e.text, count: 0, verified: e.verified };
    cur.count++;
    by.set(key, cur);
  }
  return [...by.values()].sort((a, b) => b.count - a.count).slice(0, max);
}
