// THE DECISION PATH: the five steps every simulated customer thinks through, in order, before
// deciding. These are the engine's REAL steps (DECISION_STEPS in src/lib/mind.ts). The example
// customer's thoughts under each step are made up to show how it reads.
const STEPS = [
  { n: "01", title: "First glance", what: "What they notice first, on their device, in the time their patience allows.", ex: "Big headline, no price anywhere." },
  { n: "02", title: "Need", what: "Does this solve their need, given why they came? No real need, rarely a buy.", ex: "I do plan dinners every Sunday…" },
  { n: "03", title: "Dealbreaker", what: "Is their one dealbreaker on the page? If so, they leave or stay a maybe.", ex: "Hidden price. That's my dealbreaker." },
  { n: "04", title: "Trust", what: "Is the thing that wins them over actually there? Past bad experiences look harder.", ex: "No reviews, no real people." },
  { n: "05", title: "Decide", what: "One or two sentences of reasoning in their own voice, then yes, maybe or no.", ex: "“Too vague. Not paying for a mystery.” → No" },
];

export default function DecisionPath() {
  return (
    <div className="decision-path">
      <ol className="grid gap-3 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.n} className="glass-tile relative flex flex-col p-5" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="font-mono text-xs text-[#000000]">{s.n}</span>
            <p className="mt-2 text-[17px] tracking-tight">{s.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-faint">{s.what}</p>
            <p className="mt-auto border-t border-line pt-3 text-[12.5px] italic text-faint">{s.ex}</p>
            {i < STEPS.length - 1 && <span className="path-arrow hidden md:block" aria-hidden />}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-faint">The five steps are the engine&apos;s real instructions. The example thoughts are made up.</p>
    </div>
  );
}
