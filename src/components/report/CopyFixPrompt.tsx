"use client";
// "Copy fix prompt": copies a ready-to-paste prompt (built by src/lib/fixPrompt.ts from this report's
// top-ranked fixes) for an AI builder like Lovable, Cursor, Claude, ChatGPT or Rork. Preview shows it first.
import { useMemo, useState } from "react";
import { buildFixPrompt, type PromptInput } from "@/lib/fixPrompt";

export default function CopyFixPrompt({ input }: { input: PromptInput }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const text = useMemo(() => buildFixPrompt(input), [input]);
  if (!input.fixes.length) return null;
  const n = Math.min(input.topN ?? 3, input.fixes.length);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / no permission: select the text so the person can copy it themselves.
      setOpen(true);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="card mt-6 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Fix it with AI</p>
          <p className="mt-1 text-sm text-muted">
            Copies a prompt with the top {n} fix{n === 1 ? "" : "es"} for Lovable, Cursor, Claude, ChatGPT or Rork.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setOpen(!open)} className="btn btn-ghost h-11 px-4 text-sm" aria-expanded={open}>
            {open ? "Hide" : "Preview"}
          </button>
          <button type="button" onClick={copy} className="btn btn-primary h-11 px-5 text-sm" aria-live="polite" data-done={copied || undefined}>
            <span key={copied ? "done" : "idle"} className={copied ? "pop-ok" : undefined}>{copied ? "Copied ✓" : "Copy fix prompt"}</span>
          </button>
        </div>
      </div>
      {open && (
        <textarea
          readOnly
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          className="field mt-4 h-72 w-full resize-y font-mono text-xs leading-relaxed"
          aria-label="Fix prompt to copy"
        />
      )}
    </div>
  );
}
