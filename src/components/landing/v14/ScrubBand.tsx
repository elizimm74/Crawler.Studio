// A GIANT SLIDING BAND of the things that stop customers buying (the blockers Crawler reports).
// Two rows slide sideways in opposite directions as you scroll past, with a lag (ScrollScrub sets
// --p), and two faint "echo" copies trail behind when you scroll fast (--v / --va): the
// speed-up / slow-down feel of klad.design, with Crawler's own words. Styles: globals.css "v20".
// Screen readers get one plain sentence instead of the repeated decorative text.

const ROW_A = ["Price hidden", "No proof", "Too many steps", "Signup wall", "Unclear value"];
const ROW_B = ["Slow first screen", "Hidden shipping", "Vague headline", "Paywall shock", "Nothing to trust"];

export default function ScrubBand() {
  return (
    <section className="scrub-band" data-scrub="pass" data-lag="1" aria-label="What stops customers from buying">
      <p className="sr-only">Common reasons customers leave: {[...ROW_A, ...ROW_B].join(", ")}. Crawler finds them before launch.</p>
      <Row words={ROW_A} dir="l" />
      <Row words={ROW_B} dir="r" />
    </section>
  );
}

function Row({ words, dir }: { words: string[]; dir: "l" | "r" }) {
  // the line twice in a row, so it's always wider than the screen while it slides
  const line = (
    <span className="scrub-line">
      {[...words, ...words].map((w, i) => (
        <span key={i} className="scrub-word">
          {w}
          <i aria-hidden />
        </span>
      ))}
    </span>
  );
  return (
    <div className={`scrub-row is-${dir}`} aria-hidden>
      <div className="scrub-echo e2">{line}</div>
      <div className="scrub-echo e1">{line}</div>
      <div className="scrub-main">{line}</div>
    </div>
  );
}
