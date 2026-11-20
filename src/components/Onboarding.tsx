"use client";
// The questions asked BEFORE every test (and as first-run onboarding). Two calm steps:
//   1. What are you launching?  four big tiles; picking one moves on by itself
//   2. Where is it? (the link, or "you'll add screenshots next") + who it's for (optional)
// Fewer, bigger questions = more people reach their result. Everything but the link is optional.
// It's the first thing new visitors see (the home page button), no account needed.
// The answers are saved on the account (Supabase "user metadata"), which also marks
// onboarding as done. Signed-out visitors sign up at the end (on the way to the test).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { Arrow } from "@/components/landing/UrlForm";

type Kind = "website" | "app" | "game" | "store" | "video";
const needsUrl = (k: Kind) => k === "website" || k === "store";
const WHO = ["Students", "Founders", "Parents", "Small businesses", "Developers", "Everyone"];

export default function Onboarding({ startUrl, startKind = "website", mind, preset }: { startUrl: string; startKind?: Kind; mind?: string; preset?: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(startKind);
  const [url, setUrl] = useState(startUrl);
  const [what, setWhat] = useState("");
  const when = ""; // launch timing is no longer asked (fewer questions)
  const [who, setWho] = useState("");
  const [whoText, setWhoText] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(startUrl ? 2 : 1); // a link from the home page skips to step 2

  const audience = whoText.trim() || who; // their own words win over the chip
  const canNext = !needsUrl(kind) || url.trim().length > 3;

  async function finish() {
    setBusy(true);
    const answers = { kind, url: needsUrl(kind) ? url : "", what, when, who: audience };
    if (AUTH_ENABLED) {
      // Signed in: save the answers + "onboarded" on the account now.
      // Signed out: keep them in this tab; the test page saves them right after sign-up.
      const { data } = await supabaseBrowser().auth.getUser();
      if (data.user) {
        await supabaseBrowser().auth.updateUser({ data: { onboarded: true, onboarding: answers } }).catch(() => null);
      } else {
        try {
          sessionStorage.setItem("crawler-onboarding", JSON.stringify(answers));
        } catch {
          // storage blocked: the answers just aren't saved to the account
        }
      }
    }
    // Website: the analysis starts right away. App: next you upload screenshots.
    const params = new URLSearchParams(
      kind === "video" ? { kind: "video" } : kind === "app" ? { kind: "app" } : kind === "game" ? { kind: "app", type: "game" } : kind === "store" ? { url: url.trim(), type: "store" } : { url: url.trim() },
    );
    if (audience) params.set("for", audience);
    if (what.trim()) params.set("what", what.trim());
    if (mind) params.set("mind", mind); // from the dashboard: "Test with this mind"
    if (preset) params.set("preset", preset);
    router.push(`/app?${params}`); // signed out → sign-up first, then the test starts
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (canNext) void finish();
  }

  const choose = (k: Kind) => {
    setKind(k);
    setStep(2);
  };
  const current = KINDS.find((k) => k.id === kind)!;

  return (
    <div className="mx-auto max-w-5xl">
      {/* progress: two thin bars */}
      <div className="mx-auto flex max-w-xs gap-2" aria-label={`Step ${step} of 2`}>
        {[1, 2].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>

      {step === 1 ? (
        <section className="mt-12 text-center" aria-labelledby="ob-q1">
          <p className="t-label">step 1 of 2 · takes about a minute</p>
          <h1 id="ob-q1" className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            What are you launching?
          </h1>
          <div className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="What are you launching?">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                onClick={() => choose(k.id)}
                className={`ob-tile group flex min-h-44 flex-col justify-between rounded-2xl border p-5 transition-all duration-200 ${
                  kind === k.id ? "border-accent bg-white/[0.06]" : "border-line bg-white/[0.025] hover:-translate-y-0.5 hover:border-line-strong hover:bg-white/[0.05]"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-fg">{k.icon}</span>
                <span>
                  <span className="block text-lg font-medium">{k.name}</span>
                  <span className="mt-1 block min-h-10 text-sm text-muted">{k.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <form onSubmit={next} className="mx-auto mt-12 max-w-xl" aria-labelledby="ob-q2">
          <button type="button" onClick={() => setStep(1)} className="btn btn-text -ml-3 h-10 text-sm">
            ← {current.name}
          </button>
          <p className="t-label mt-4">step 2 of 2</p>
          <h1 id="ob-q2" className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {needsUrl(kind) ? (kind === "store" ? "Where's your store?" : "Where does it live?") : kind === "video" ? "Let's see your video." : kind === "game" ? "Let's see your game." : "Let's see your app."}
          </h1>

          {needsUrl(kind) ? (
            <div className="relative mt-8">
              <label htmlFor="ob-url" className="sr-only">
                {kind === "store" ? "Your store's address" : "Your website's address"}
              </label>
              <span className="field-prefix pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-mono text-sm" aria-hidden>
                https://
              </span>
              <input
                id="ob-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={kind === "store" ? "yourstore.com" : "yourstartup.com"}
                className="field h-16 rounded-2xl pl-24 text-lg"
                inputMode="url"
                autoFocus
              />
            </div>
          ) : (
            <p className="mt-6 text-lg text-muted">
              {kind === "video"
                ? "Next you'll drop in your TikTok, Reel, Short or ad. Simulated viewers decide when they'd swipe, and whether they'd tap through to your product."
                : kind === "game"
                ? "Next you'll drop in screenshots of the first minutes and the shop or game-pass offer, in order. Crawler never logs into your game."
                : "Next you'll drop in screenshots of your onboarding and paywall, in order."}
            </p>
          )}

          <fieldset className="mt-10">
            <legend className="text-sm font-medium">
              Who is it for? <span className="font-normal text-faint">optional</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {WHO.map((w) => (
                <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(who === w ? "" : w)} className="chip">
                  {w}
                </button>
              ))}
            </div>
            <input
              value={whoText}
              onChange={(e) => setWhoText(e.target.value)}
              placeholder="or in your words, e.g. college students who cook on a budget"
              className="field mt-3"
              aria-label="Describe who it is for"
            />
            <input
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder={kind === "game" ? "What is it? e.g. an obby game for teens" : kind === "store" ? "What do you sell? e.g. streetwear" : "What is it? e.g. a meal planner for busy parents"}
              className="field mt-3"
              aria-label="What is it"
            />
          </fieldset>

          <button type="submit" disabled={!canNext || busy} className="btn btn-primary mt-10 h-14 w-full text-base">
            {busy ? "Starting…" : kind === "video" ? "Next: add the video" : !needsUrl(kind) ? "Next: add screenshots" : kind === "store" ? "Test my store" : "Test my site"}
            {!busy && <Arrow />}
          </button>
          <p className="mt-4 text-center text-xs text-faint">Free first test · simulated customers show buying intent, not real purchases.</p>
        </form>
      )}
    </div>
  );
}

const ICON = (d: string) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const KINDS: { id: Kind; name: string; hint: string; icon: React.ReactNode }[] = [
  { id: "app", name: "Mobile app", hint: "Onboarding + paywall", icon: ICON("M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2") },
  { id: "game", name: "Game", hint: "Roblox or mobile: first minutes + shop", icon: ICON("M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.3 1.9L15 14H9l-1.7 1.9A3 3 0 0 1 2 14v-1a4 4 0 0 1 4-4zM8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01") },
  { id: "website", name: "Website", hint: "Landing page, pricing, signup", icon: ICON("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z") },
  { id: "store", name: "Online store", hint: "Product page → cart", icon: ICON("M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8zM9 8V6a3 3 0 0 1 6 0v2") },
  { id: "video", name: "Video or ad", hint: "TikTok, Reels, Shorts, creator deals", icon: ICON("M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM10 9v6l5-3z") },
];
