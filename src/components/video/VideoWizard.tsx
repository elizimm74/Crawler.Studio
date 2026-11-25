"use client";
// Video tests on /app?kind=video:
//   1. Video     drop in the TikTok / Reel / Short / ad; pick where it's posted and who posts it
//   2. Review    check what we read off each frame, add what's said + the account's usual views
//   3. Audience  who sees it (for a creator: who follows them)
//   4. Launch
// The video NEVER leaves the browser: we pull ~12 still frames out of it here (a hidden <video> +
// a canvas), shrink them to JPEGs and upload only those. The AI can't watch video or hear sound.
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AudiencePicker from "@/components/AudiencePicker";
import Working from "@/components/Working";
import { MyMindsCards, SaveMind } from "@/components/dashboard/minds";
import { SizePicker, canPickSize, StarterNote, fitSize, usePlan, AdsGate } from "@/components/dashboard/usePlan";
import { Arrow } from "@/components/landing/UrlForm";
import { Chevron, ErrorNote, Heading, Nav, PRESET_HINT, PresetCard, Stepper, Summary, waitForCrawl } from "@/components/wizard";
import { DEFAULT_AUDIENCE, PRESETS } from "@/lib/presets";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { frameTimes } from "@/lib/video/frames";
import { median, parseViews } from "@/lib/video/aggregate";
import { PLACEMENT_LABEL, PLACEMENTS, PLATFORMS, type CreatorStats, type Placement, type Platform, type VideoBeat } from "@/lib/video/types";
import type { Audience, ProductProfile } from "@/lib/types";

const LABELS = ["Video", "Review", "Audience", "Launch"] as const;
type Frame = { t: number; blob: Blob; preview: string };
type Beat = VideoBeat & { image: string };

const PLACEMENT_HINT: Record<Placement, string> = {
  organic: "Posted on your own account",
  creator: "You pay an influencer to post it",
  ad: "Shown as Sponsored with a button",
};

export default function VideoWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = usePlan();
  const [size, setSize] = useState(100); // paid plans pick 100 / 250 / 500 / 1,000
  const viewers = canPickSize(plan, true) ? fitSize(plan, size, true) : (plan?.customers ?? 100);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [duration, setDuration] = useState(0);
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [placement, setPlacement] = useState<Placement>("organic");
  const [busy, setBusy] = useState<null | "extracting" | "uploading" | "reading" | "starting">(null);
  const [error, setError] = useState<string | null>(null);
  const [crawlId, setCrawlId] = useState<string | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [hook, setHook] = useState("");
  const [productAt, setProductAt] = useState(-1);
  const [profile, setProfile] = useState<ProductProfile | null>(null);
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [viewsText, setViewsText] = useState("");
  const [viewsSource, setViewsSource] = useState<CreatorStats["source"]>("entered");
  const [lookup, setLookup] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [suggested, setSuggested] = useState<Audience | null>(null);
  const [audience, setAudience] = useState<Audience>(DEFAULT_AUDIENCE);
  const [presetName, setPresetName] = useState("AI suggestion");

  const recentViews = useMemo(() => parseViews(viewsText), [viewsText]);
  const usual = median(recentViews);

  // Pull the frames out as soon as a video is dropped in.
  async function pick(f: File) {
    setError(null);
    setFile(f);
    setFrames([]);
    setBusy("extracting");
    try {
      const { frames: got, duration: d } = await extractFrames(f);
      setFrames(got);
      setDuration(d);
    } catch (err) {
      setError((err as Error).message);
      setFile(null);
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    if (frames.length < 2) return;
    setError(null);
    setBusy("uploading");
    try {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Please sign in first.");
      const batch = randomId();
      const names = await Promise.all(
        frames.map(async (fr, i) => {
          const name = `${i + 1}.jpg`;
          const { error: e } = await supabase.storage.from("screenshots").upload(`${data.user!.id}/uploads/${batch}/${name}`, fr.blob, { contentType: "image/jpeg", upsert: true });
          if (e) throw new Error(`Upload failed: ${e.message}`);
          return name;
        }),
      );
      setBusy("reading");
      const res = await fetch("/api/video-crawls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch, frames: names, times: frames.map((f) => f.t), duration: Math.round(duration * 10) / 10, platform }),
      });
      const started = await res.json();
      if (!res.ok) throw new Error(started.error);
      const d = await waitForCrawl(started.crawlId);
      setCrawlId(started.crawlId);
      // Show the local previews (instant) instead of re-downloading the uploads.
      setBeats(d.beats.map((b: Beat, i: number) => ({ ...b, image: frames[i]?.preview ?? b.image })));
      setHook(d.hook ?? "");
      setProductAt(d.productFirstSeen ?? -1);
      const forParam = params.get("for");
      const what = params.get("what");
      setProfile({ ...d.profile, ...(forParam ? { whoItsFor: forParam } : {}), ...(what && !d.profile.whatItIs ? { whatItIs: what } : {}) });
      if (d.audience) {
        setSuggested(d.audience);
        setAudience(d.audience);
        setPresetName("AI suggestion");
      } else {
        setPresetName("Gen Z creators");
        setAudience(PRESETS["Gen Z creators"] ?? DEFAULT_AUDIENCE);
        setError(`We couldn't read everything automatically (${d.suggestError}). Please fill it in below.`);
      }
      setStep(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function findYouTube() {
    setLookup("Looking up…");
    try {
      const res = await fetch(`/api/creators/youtube?handle=${encodeURIComponent(handle)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setHandle(d.handle);
      if (d.followers !== null) setFollowers(String(d.followers));
      setViewsText(d.recentViews.join(", "));
      setViewsSource("youtube");
      setLookup(`Found ${d.title}: ${d.recentViews.length} recent videos.`);
    } catch (err) {
      setLookup((err as Error).message);
    }
  }

  async function launch() {
    if (!crawlId || !profile) return;
    setBusy("starting");
    setError(null);
    try {
      const creator: CreatorStats | null = recentViews.length
        ? { handle, platform, followers: followers ? Number(followers.replace(/[^\d]/g, "")) || null : null, recentViews, source: viewsSource }
        : null;
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: fitSize(plan, size, true), // only a request: the database checks it against the plan
          crawlId,
          audience,
          profile,
          video: {
            platform,
            placement,
            beats: beats.map(({ file, t, shows, text }) => ({ file, t, shows, text })),
            script,
            caption,
            creator,
            price: placement !== "organic" && Number(price) > 0 ? Number(price) : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/run/${data.testId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const setBeat = (i: number, patch: Partial<Beat>) => setBeats((all) => all.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const late = productAt > 3;

  // Starter / free plans don't include video and ad tests: say so before any upload.
  if (plan && !plan.ads && !plan.unlimited) {
    return (
      <div className="mx-auto max-w-2xl">
        <AdsGate plan={plan} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <Stepper step={step} canGoTo={(i) => i === 0 || Boolean(crawlId)} onGo={setStep} labels={LABELS} />

      {/* ---------- 1. Video ---------- */}
      {step === 0 &&
        (busy === "uploading" || busy === "reading" ? (
          <Working
            kind="phone"
            label={`${busy === "uploading" ? "uploading" : "reading"} ${frames.length} frames`}
            title="Watching your video…"
            expectSeconds={25}
            lines={["Uploading the frames", "Reading every frame", "Finding the hook", "Working out who it's for"]}
          />
        ) : (
          <section className="space-y-10">
            <Heading n={1} title="Drop in your video" sub="A TikTok, Reel, Short or ad, before you post it or pay for it. Your video stays on your device: we only send still frames." />
            <VideoDrop file={file} frames={frames} busy={busy === "extracting"} onPick={pick} duration={duration} />

            <div className="grid gap-8 md:grid-cols-2">
              <fieldset>
                <legend className="field-label">Where it goes</legend>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button key={p} type="button" aria-pressed={platform === p} onClick={() => setPlatform(p)} className="chip">
                      {p}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="field-label">Who posts it</legend>
                <div className="grid gap-2" role="radiogroup">
                  {PLACEMENTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={placement === p}
                      onClick={() => setPlacement(p)}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${placement === p ? "border-accent bg-subtle" : "border-line hover:border-line-strong"}`}
                    >
                      <span>
                        <span className="block text-sm font-medium">{PLACEMENT_LABEL[p]}</span>
                        <span className="block text-xs text-muted">{PLACEMENT_HINT[p]}</span>
                      </span>
                      <span className={`h-4 w-4 shrink-0 rounded-full border ${placement === p ? "border-accent bg-accent" : "border-line-strong"}`} aria-hidden />
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <ErrorNote error={error} />
            <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
              <span className="text-sm text-muted">{frames.length ? `${frames.length} frames from ${duration.toFixed(1)}s` : "No video yet"}</span>
              <button onClick={analyze} disabled={frames.length < 2 || busy !== null} className="btn btn-primary h-12 px-6">
                Read my video <Arrow />
              </button>
            </div>
          </section>
        ))}

      {/* ---------- 2. Review ---------- */}
      {step === 1 && profile && (
        <section className="space-y-10">
          <Heading n={2} title="Check what we saw" sub="Viewers see exactly this. Fix anything off, and type what's said: we can't hear the audio." />

          <div className="dash-panel rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="t-label">the hook · first 2 seconds</p>
              {productAt >= 0 ? (
                <span className={`rounded-full border px-3 py-1 text-xs ${late ? "border-line-strong text-fg" : "border-line text-muted"}`}>
                  product shows at {productAt.toFixed(1)}s{late ? " · people who swipe earlier never see it" : ""}
                </span>
              ) : (
                <span className="rounded-full border border-line-strong px-3 py-1 text-xs">the product never clearly shows</span>
              )}
            </div>
            <textarea value={hook} onChange={(e) => setHook(e.target.value)} rows={2} className="field mt-3 text-lg" aria-label="What the first seconds promise" />
          </div>

          <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3">
            {beats.map((b, i) => (
              <li key={b.file} className="w-44 shrink-0 snap-start">
                <div className="relative overflow-hidden rounded-xl border border-line bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image} alt={`Frame ${i + 1}`} className="aspect-[9/16] w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">{b.t.toFixed(1)}s</span>
                </div>
                <label className="sr-only" htmlFor={`shows-${i}`}>
                  Frame {i + 1}: what&apos;s on screen
                </label>
                <textarea id={`shows-${i}`} value={b.shows} onChange={(e) => setBeat(i, { shows: e.target.value })} rows={3} className="field mt-2 text-xs" placeholder="What's on screen" />
                <input value={b.text} onChange={(e) => setBeat(i, { text: e.target.value })} className="field mt-1 h-9 text-xs" placeholder="On-screen text" aria-label={`Frame ${i + 1} on-screen text`} />
              </li>
            ))}
          </ol>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card space-y-3 p-5">
              <label htmlFor="script" className="field-label">
                What&apos;s said <span className="font-normal text-faint">voiceover or dialogue, optional</span>
              </label>
              <textarea id="script" value={script} onChange={(e) => setScript(e.target.value)} rows={5} className="field text-sm" placeholder="POV: you just found out your app has 0 users…" />
              <label htmlFor="caption" className="field-label">
                Caption <span className="font-normal text-faint">optional</span>
              </label>
              <input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="field text-sm" />
            </div>
            <div className="card space-y-3 p-5">
              <label htmlFor="what" className="field-label">
                What it promotes
              </label>
              <input id="what" value={profile.whatItIs} onChange={(e) => setProfile({ ...profile, whatItIs: e.target.value })} className="field text-sm" />
              <label htmlFor="promise" className="field-label">
                The main promise
              </label>
              <input id="promise" value={profile.mainPromise} onChange={(e) => setProfile({ ...profile, mainPromise: e.target.value })} className="field text-sm" />
              <label htmlFor="who" className="field-label">
                Who it&apos;s for
              </label>
              <input id="who" value={profile.whoItsFor} onChange={(e) => setProfile({ ...profile, whoItsFor: e.target.value })} className="field text-sm" />
            </div>
          </div>

          {/* The account's usual views: what turns the test into a view range + deal check */}
          <div className="dash-panel space-y-5 rounded-2xl p-5 sm:p-6">
            <div>
              <p className="t-label">view range + deal check · optional</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{placement === "creator" ? "The creator's usual views" : "Your account's usual views"}</h3>
              <p className="mt-1 text-sm text-muted">
                Paste the views of their last 5–15 videos. We use the middle one (the median), so one viral hit doesn&apos;t skew it.
                {platform.startsWith("YouTube") ? " For YouTube we can look them up." : " TikTok and Instagram don't let apps read this, so copy it from the profile."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={handle} onChange={(e) => setHandle(e.target.value)} className="field" placeholder="@handle" aria-label="Account handle" />
              {platform.startsWith("YouTube") && (
                <button type="button" onClick={findYouTube} disabled={handle.length < 3} className="btn btn-secondary h-12 px-5 text-sm">
                  Look up on YouTube
                </button>
              )}
            </div>
            {lookup && <p className="text-sm text-muted" role="status">{lookup}</p>}
            <textarea
              value={viewsText}
              onChange={(e) => (setViewsText(e.target.value), setViewsSource("entered"))}
              rows={2}
              className="field font-mono text-sm"
              placeholder="12k, 8.4k, 31k, 9,800, 15k, 1.2M"
              aria-label="Recent video views"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="videos" value={recentViews.length ? String(recentViews.length) : "—"} />
              <Stat label="usual views (median)" value={usual ? compact(usual) : "—"} />
              <div>
                <label htmlFor="followers" className="t-label">
                  followers
                </label>
                <input id="followers" value={followers} onChange={(e) => setFollowers(e.target.value)} inputMode="numeric" className="field mt-1 h-11 text-sm" placeholder="optional" />
              </div>
            </div>
            {placement !== "organic" && (
              <div className="border-t border-line pt-5">
                <label htmlFor="price" className="field-label">
                  {placement === "creator" ? "What the creator charges for this post" : "Your ad budget for this video"}
                </label>
                <div className="relative max-w-xs">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">$</span>
                  <input id="price" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="field pl-8" placeholder="250" />
                </div>
              </div>
            )}
          </div>

          <ErrorNote error={error} />
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Looks right" />
        </section>
      )}

      {/* ---------- 3. Audience ---------- */}
      {step === 2 && (
        <section className="space-y-8">
          <Heading n={3} title={placement === "creator" ? "Who follows this creator?" : "Who sees it?"} sub="Pick the crowd whose feed this lands in." />
          <div className="grid gap-2 sm:grid-cols-2">
            {suggested && <PresetCard name="AI suggestion" hint="Based on your video" tag="auto" active={presetName === "AI suggestion"} onClick={() => (setAudience(suggested), setPresetName("AI suggestion"))} />}
            <MyMindsCards presetName={presetName} onPick={(name, a) => (setAudience(a), setPresetName(name))} />
            {Object.entries(PRESETS).map(([name, preset]) => (
              <PresetCard key={name} name={name} hint={PRESET_HINT[name] ?? ""} tag={`${preset.ageMin}–${preset.ageMax}`} active={presetName === name} onClick={() => (setAudience(preset), setPresetName(name))} />
            ))}
          </div>
          <details className="card group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
              <span className="font-medium">Fine-tune the audience</span>
              <Chevron />
            </summary>
            <div className="border-t border-line p-6">
              <AudiencePicker audience={audience} onChange={(a) => (setAudience(a), setPresetName("Custom"))} suggested={suggested} />
            </div>
          </details>
          <SaveMind audience={audience} />
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next" />
        </section>
      )}

      {/* ---------- 4. Launch ---------- */}
      {step === 3 && profile && (
        <section className="space-y-8">
          <Heading n={4} title="Ready to roll" sub={`${viewers} viewers, 3 different crowds, so you get an honest range instead of one lucky number.`} />
          <dl className="card grid divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <Summary label="Video" value={`${duration.toFixed(0)}s · ${frames.length || beats.length} frames`} />
            <Summary label="Where" value={`${platform} · ${PLACEMENT_LABEL[placement]}`} />
            <Summary label="Audience" value={`${viewers} × 3 · ${presetName}`} />
            <Summary label="View range" value={usual ? `from ${compact(usual)} usual` : "add views to see it"} />
          </dl>
          <SizePicker plan={plan} value={fitSize(plan, size, true)} onChange={setSize} video />
          <StarterNote plan={plan} />
          <ErrorNote error={error} />
          <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
            <button onClick={() => setStep(2)} className="btn btn-text">
              Back
            </button>
            <button onClick={launch} disabled={busy !== null} aria-busy={busy !== null} className="btn btn-primary h-12 px-8">
              {busy === "starting" ? "Starting…" : "Run the test"}
              {busy !== "starting" && <Arrow />}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- the drop box + the filmstrip of extracted frames ----------
function VideoDrop({ file, frames, busy, onPick, duration }: { file: File | null; frames: Frame[]; busy: boolean; onPick: (f: File) => void; duration: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    const f = list && [...list].find((x) => x.type.startsWith("video/"));
    if (f) onPick(f);
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => (e.preventDefault(), setOver(false), take(e.dataTransfer.files))}
        className={`relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-150 ${over ? "border-accent bg-subtle" : "border-line-strong hover:border-fg"}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-subtle" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 4.5v15l12-7.5z" />
          </svg>
        </span>
        <span className="font-medium">{busy ? "Pulling out frames…" : file ? file.name : "Drop your video here"}</span>
        <span className="text-sm text-muted">{file && !busy ? `${duration.toFixed(1)}s · click to swap` : "or click to choose · MP4, MOV or WebM"}</span>
        {busy && <span className="scan-beam" style={{ left: 0, width: "100%" }} aria-hidden />}
      </button>
      <input ref={input} type="file" accept="video/*" className="sr-only" onChange={(e) => (take(e.target.files), (e.target.value = ""))} />
      {frames.length > 0 && (
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Frames we'll show the viewers">
          {frames.map((f, i) => (
            <li key={i} className="w-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt={`Frame at ${f.t}s`} className="frame-in aspect-[9/16] w-full rounded-lg border border-line object-cover" style={{ animationDelay: `${i * 45}ms` }} />
              <span className="mt-1 block text-center font-mono text-[10px] text-faint">{f.t.toFixed(1)}s</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="t-label">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

// ---------- helpers ----------

export function compact(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n));
}

// Load the video in a hidden player, jump to each moment, and draw it to a canvas.
// Max 1024px on the long side as JPEG: enough for the AI, small to upload.
async function extractFrames(file: File): Promise<{ frames: Frame[]; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Your browser can't open this video. Export it as MP4 (H.264) and try again."));
      setTimeout(() => reject(new Error("The video took too long to open. Try a shorter or smaller file.")), 20000);
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Couldn't read the video's length.");
    if (duration > 600) throw new Error("Videos can be up to 10 minutes long.");
    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d")!;
    const frames: Frame[] = [];
    for (const t of frameTimes(duration)) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(t, duration - 0.05);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't grab a frame."))), "image/jpeg", 0.82));
      frames.push({ t, blob, preview: URL.createObjectURL(blob) });
    }
    return { frames, duration };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function randomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => chars[b % chars.length]).join("");
}
