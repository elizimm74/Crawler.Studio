"use client";
// The questions asked BEFORE every test (and as first-run onboarding). Short and calm:
//   1. Your website: paste it, we CHECK it (real, public, reachable: /api/check-url), show a small
//      preview and GUESS the category (you can change it). No website? Test an app, game or video.
//   2. What do you want to learn? (objectives, several allowed) + who it's for (optional)
//   3. FIRST TIME ONLY: "About you" (age, where you heard of us...). All optional, with Skip.
// Then /app takes over: audience (optional), test size, and a confirm screen before anything is used.
// The URL is never silently dropped: it comes from the home page (?url=) and travels on to /app.
// Signed-out visitors answer everything, then sign up on the way to the test (answers wait in this tab).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { Arrow } from "@/components/landing/UrlForm";
import { AGES, GOALS, HEARD, ROLES, STAGES, firstTouch, type About } from "@/lib/insights";
import { CATEGORIES, type Category } from "@/lib/category";
import { FOCUS, type FocusId } from "@/lib/productTypes";
import { STARTER_CUSTOMERS } from "@/lib/plans";

type Kind = "website" | "app" | "game" | "store" | "video";
const WHO = ["Students", "Founders", "Parents", "Small businesses", "Developers", "Everyone"];
type Check = { ok: true; url: string; host: string; title?: string; category: Category; note?: string } | { ok: false; problem: string };

export default function Onboarding({ startUrl, startKind = "website", mind, preset, firstTime = false }: { startUrl: string; startKind?: Kind; mind?: string; preset?: string; firstTime?: boolean }) {
  const router = useRouter();
  const noSite = startKind === "app" || startKind === "game" || startKind === "video";
  const [kind, setKind] = useState<Kind>(noSite ? startKind : "website");
  const [url, setUrl] = useState(startUrl);
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [category, setCategory] = useState<Category>(startKind === "store" ? "ecommerce" : "other");
  const [focus, setFocus] = useState<FocusId[]>(["buy"]);
  const [what, setWhat] = useState("");
  const [who, setWho] = useState("");
  const [whoText, setWhoText] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [about, setAbout] = useState<About>({});
  const steps = firstTime ? 3 : 2;
  const pick = (k: keyof About, v: string) => setAbout((a) => ({ ...a, [k]: a[k] === v ? undefined : v }));
  const audience = whoText.trim() || who;
  const site = kind === "website" || kind === "store";
  const autoChecked = useRef(false);

  async function runCheck(target = url) {
    if (target.trim().length < 4) return;
    setChecking(true);
    setCheck(null);
    try {
      const res = await fetch("/api/check-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) });
      const data = (await res.json()) as Check;
      setCheck(data);
      if (data.ok) {
        setUrl(data.url.replace(/^https:\/\//, "").replace(/\/$/, ""));
        if (startKind !== "store" || data.category === "clothing") setCategory(data.category);
        if (data.category === "app") setKind("app");
      }
    } catch {
      setCheck({ ok: false, problem: "We couldn't check that address right now. You can still continue." });
    } finally {
      setChecking(false);
    }
  }
  // Came from the home page with a URL? Check it straight away.
  useEffect(() => {
    if (startUrl && !autoChecked.current) {
      autoChecked.current = true;
      void runCheck(startUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "couldn't reach" is allowed through: the real test uses a full browser, which gets into more sites.
  const unreachable = check && !check.ok && /reach|check that address/.test(check.problem);
  const canNext = !site || Boolean(check?.ok) || Boolean(unreachable);

  async function finish(skipAbout = false) {
    setBusy(true);
    const engine = site ? CATEGORIES[category].engine : kind;
    const testKind: Kind = engine === "app" && site ? "app" : site ? (engine as Kind) : kind;
    const finalUrl = check?.ok ? check.url : url.trim();
    const answers = { kind: testKind, url: site ? finalUrl : "", what, when: "", who: audience, category: site ? category : undefined, focus };
    const signup = firstTime ? { ...(skipAbout ? {} : about), ...firstTouch(), kind: testKind } : null;
    if (AUTH_ENABLED) {
      const { data } = await supabaseBrowser().auth.getUser();
      if (data.user) {
        await supabaseBrowser().auth.updateUser({ data: { onboarded: true, onboarding: answers } }).catch(() => null);
        if (signup) await supabaseBrowser().rpc("save_signup_answers", { p: signup }).then(() => null, () => null);
      } else {
        try {
          sessionStorage.setItem("crawler-onboarding", JSON.stringify({ ...answers, signup }));
        } catch {
          // storage blocked: the answers just aren't saved to the account
        }
      }
    }
    const params = new URLSearchParams(
      testKind === "video" ? { kind: "video" } : testKind === "app" ? { kind: "app" } : testKind === "game" ? { kind: "app", type: "game" } : testKind === "store" ? { url: finalUrl, type: "store" } : { url: finalUrl },
    );
    if (audience) params.set("for", audience);
    const whatHint = what.trim() || (category === "clothing" && site ? "A clothing brand" : "");
    if (whatHint) params.set("what", whatHint);
    if (focus.length) params.set("focus", focus.join(","));
    if (mind) params.set("mind", mind);
    if (preset) params.set("preset", preset);
    router.push(`/app?${params}`); // signed out → sign-up first, then the test starts
  }

  const toggleFocus = (id: FocusId) => setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const nextLabel = kind === "video" ? "Next: add the video" : kind === "app" || kind === "game" ? "Next: add screenshots" : "Continue to the test";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mx-auto flex max-w-xs gap-2" aria-label={`Step ${step} of ${steps}`}>
        {Array.from({ length: steps }, (_, i) => i + 1).map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="mt-12" aria-labelledby="ob-q1">
          <p className="t-label">step 1 of {steps}</p>
          <h1 id="ob-q1" className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {site ? "What are we testing?" : kind === "video" ? "Testing a video or ad." : kind === "game" ? "Testing a game." : "Testing a mobile app."}
          </h1>

          {site ? (
            <>
              <form
                className="mt-8 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (check?.ok) setStep(2);
                  else void runCheck();
                }}
              >
                <label htmlFor="ob-url" className="sr-only">
                  Your website address
                </label>
                <div className="relative flex-1">
                  <span className="field-prefix pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm" aria-hidden>
                    https://
                  </span>
                  <input
                    id="ob-url"
                    value={url.replace(/^https?:\/\//i, "")}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setCheck(null);
                    }}
                    placeholder="yourwebsite.com"
                    className="field h-14 pl-20 text-base"
                    inputMode="url"
                    autoComplete="url"
                    autoFocus={!startUrl}
                    aria-describedby="ob-url-status"
                  />
                </div>
                {!check?.ok && (
                  <button type="submit" disabled={checking || url.trim().length < 4} className="btn btn-secondary h-14 px-6">
                    {checking ? "Checking…" : "Check site"}
                  </button>
                )}
              </form>

              <div id="ob-url-status" aria-live="polite" className="mt-4">
                {checking && <p className="text-sm text-muted">Opening {url.replace(/^https?:\/\//, "")}…</p>}
                {check && !check.ok && (
                  <p role="alert" className="rounded-xl border border-line-strong bg-white/[0.03] p-4 text-sm">
                    {check.problem}
                  </p>
                )}
                {check?.ok && (
                  <div className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="t-label">site found</p>
                        <p className="mt-1 truncate text-lg font-medium">{check.title || check.host}</p>
                        <p className="truncate font-mono text-sm text-muted">{check.url.replace(/^https?:\/\//, "")}</p>
                      </div>
                      <button type="button" className="btn btn-text h-10 shrink-0 text-sm" onClick={() => setCheck(null)}>
                        Edit
                      </button>
                    </div>
                    {check.note && <p className="mt-3 text-sm text-muted">{check.note}</p>}
                    <fieldset className="mt-5">
                      <legend className="text-sm font-medium">
                        What kind of site is it? <span className="font-normal text-faint">our guess, change it if it&apos;s wrong</span>
                      </legend>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(Object.keys(CATEGORIES) as Category[])
                          .filter((c) => c !== "app")
                          .map((c) => (
                            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className="chip">
                              {CATEGORIES[c].label}
                            </button>
                          ))}
                      </div>
                      {CATEGORIES[category].engine === "store" && (
                        <p className="mt-3 text-xs text-faint">Store tests open a product page and add it to the cart. They never check out or pay. (Beta)</p>
                      )}
                    </fieldset>
                  </div>
                )}
              </div>

              <button type="button" disabled={!canNext} onClick={() => setStep(2)} className="btn btn-primary mt-8 h-14 w-full text-base">
                {unreachable && !check?.ok ? "Continue anyway" : "Continue"}
                <Arrow />
              </button>
            </>
          ) : (
            <>
              <p className="mt-6 text-lg text-muted">
                {kind === "video"
                  ? "Next you'll drop in your TikTok, Reel, Short or ad. Simulated viewers decide when they'd swipe, and whether they'd tap through."
                  : kind === "game"
                  ? "Next you'll drop in screenshots of the first minutes and the shop or game-pass offer, in order. Crawler never logs into your game."
                  : "Next you'll drop in screenshots of your onboarding and paywall, in order."}
              </p>
              <button type="button" onClick={() => setStep(2)} className="btn btn-primary mt-8 h-14 w-full text-base">
                Continue
                <Arrow />
              </button>
            </>
          )}

          <div className="mt-10 border-t border-line pt-6">
            <p className="text-sm text-muted">{site ? "No website? Test something else:" : "Something else?"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["website", "app", "game", "video"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={k === "website" ? site : kind === k}
                  onClick={() => setKind(k)}
                  className="chip"
                >
                  {k === "website" ? "Website or store" : k === "app" ? "Mobile app (screenshots)" : k === "game" ? "Game (screenshots)" : "Video or ad"}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <form
          className="mt-12"
          aria-labelledby="ob-q2"
          onSubmit={(e) => {
            e.preventDefault();
            if (firstTime) setStep(3);
            else void finish();
          }}
        >
          <button type="button" onClick={() => setStep(1)} className="btn btn-text -ml-3 h-10 text-sm">
            ← Back
          </button>
          <p className="t-label mt-4">step 2 of {steps}</p>
          <h1 id="ob-q2" className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            What do you want to learn?
          </h1>
          <p className="mt-3 text-muted">Pick one or more. Simulated customers pay extra attention to these.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2" role="group" aria-label="What you want to learn">
            {(Object.keys(FOCUS) as FocusId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={focus.includes(id)}
                onClick={() => toggleFocus(id)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors ${
                  focus.includes(id) ? "border-accent bg-accent/10" : "border-line bg-white/[0.02] hover:border-line-strong"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${focus.includes(id) ? "border-accent bg-accent text-white" : "border-line-strong"}`} aria-hidden>
                  {focus.includes(id) && "✓"}
                </span>
                <span className="text-sm font-medium">{FOCUS[id].label}</span>
              </button>
            ))}
          </div>

          <fieldset className="mt-10">
            <legend className="text-sm font-medium">
              Who is it for? <span className="font-normal text-faint">optional, you can fine-tune the audience later</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {WHO.map((w) => (
                <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(who === w ? "" : w)} className="chip">
                  {w}
                </button>
              ))}
            </div>
            <input value={whoText} onChange={(e) => setWhoText(e.target.value.slice(0, 200))} placeholder="or in your words, e.g. college students who cook on a budget" className="field mt-3" aria-label="Describe who it is for" />
            <input
              value={what}
              onChange={(e) => setWhat(e.target.value.slice(0, 200))}
              placeholder={kind === "game" ? "What is it? e.g. an obby game for teens" : category === "clothing" || category === "ecommerce" ? "What do you sell? e.g. streetwear" : "What is it? e.g. a meal planner for busy parents"}
              className="field mt-3"
              aria-label="What is it"
            />
          </fieldset>

          <button type="submit" disabled={busy || focus.length === 0} className="btn btn-primary mt-10 h-14 w-full text-base">
            {busy ? "Starting…" : firstTime ? "Next" : nextLabel}
            {!busy && <Arrow />}
          </button>
          <p className="mt-4 text-center text-xs text-faint">
            Nothing is used yet: you&apos;ll see a summary and confirm before the test runs. Free: 1 test with {STARTER_CUSTOMERS} simulated customers, no card.
          </p>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void finish();
          }}
          className="mt-12"
          aria-labelledby="ob-q3"
        >
          <button type="button" onClick={() => setStep(2)} className="btn btn-text -ml-3 h-10 text-sm">
            ← Back
          </button>
          <p className="t-label mt-4">step 3 of 3 · optional · 10 seconds</p>
          <h1 id="ob-q3" className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Quick, about you.
          </h1>
          <p className="mt-3 text-muted">Tap what fits. It helps us build Crawler for people like you.</p>
          <Choice legend="Your age" options={Object.fromEntries(AGES.map((a) => [a, a]))} value={about.age} onPick={(v) => pick("age", v)} />
          <Choice legend="Where did you hear about Crawler?" options={HEARD} value={about.heard} onPick={(v) => pick("heard", v)} />
          {about.heard === "other" && (
            <input
              value={about.heardOther ?? ""}
              onChange={(e) => setAbout((a) => ({ ...a, heardOther: e.target.value.slice(0, 80) }))}
              placeholder="Where? e.g. a newsletter, a Discord, a podcast"
              className="field mt-3"
              aria-label="Where did you hear about Crawler"
            />
          )}
          <Choice legend="What describes you best?" options={ROLES} value={about.role} onPick={(v) => pick("role", v)} />
          <Choice legend="Where is your product?" options={STAGES} value={about.stage} onPick={(v) => pick("stage", v)} />
          <Choice legend="What do you want most?" options={GOALS} value={about.goal} onPick={(v) => pick("goal", v)} />
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={busy} className="btn btn-primary h-14 flex-1 text-base">
              {busy ? "Starting…" : nextLabel}
              {!busy && <Arrow />}
            </button>
            <button type="button" disabled={busy} onClick={() => void finish(true)} className="btn btn-ghost h-14 px-6 text-base">
              Skip
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-faint">
            Crawler is for people 13 and older. We only look at these answers as totals, never sell them, and never show them publicly.
          </p>
        </form>
      )}
    </div>
  );
}

// One single-choice question as tap-to-pick chips (tap again to unpick).
function Choice({ legend, options, value, onPick }: { legend: string; options: Record<string, string>; value?: string; onPick: (v: string) => void }) {
  return (
    <fieldset className="mt-8">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(options).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onPick(v)} className="chip">
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
