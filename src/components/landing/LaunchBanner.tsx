// The launch offer, in one line (home hero + pricing). Text follows the real state from the database:
// before Dec 5 it says when it starts, during launch week it counts the spots left, and once the
// week is over or the spots are gone it disappears (no fake urgency).
import { LAUNCH_OFFER } from "@/lib/plans";
import type { LaunchState } from "@/lib/launch";

export default function LaunchBanner({ state, className = "" }: { state: LaunchState; className?: string }) {
  if (state.phase === "over" || state.left <= 0) return null;
  const n = LAUNCH_OFFER.freeCustomers.toLocaleString("en-US");
  return (
    <p className={`launch-pill ${className}`} role="note">
      <span className="launch-dot" aria-hidden />
      <span>
        <strong>{LAUNCH_OFFER.name}{state.phase === "soon" ? " starts Dec 5" : ""}:</strong> the first {LAUNCH_OFFER.spots} signups get a free {n}-customer test
        {state.phase === "on" ? <span className="launch-left"> · {state.left} left</span> : "."}
      </span>
    </p>
  );
}
