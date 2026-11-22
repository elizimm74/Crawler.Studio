// POST /api/tests { crawlId, audience, profile, explore?, credentials?, ownsProduct? } -> { testId }
// Checks the input, encrypts any test-account login, then start_test()
// checks your plan's limit and queues the job, all in one transaction.
import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/supabase/api";
import { encryptJson } from "@/lib/crypto";
import { normalizeUrl } from "@/lib/normalizeUrl";
import type { Audience, Credentials, ExploreSettings, ProductProfile } from "@/lib/types";
import type { AppAnalysis, AppSettings } from "@/lib/app/types";
import { cleanAppSettings } from "@/lib/app/validate";
import type { VideoAnalysis, VideoSettings } from "@/lib/video/types";
import { cleanVideoSettings } from "@/lib/video/validate";
import { TEST_SIZES } from "@/lib/plans";
import { cleanAudience, cleanProfile } from "@/lib/audience";

// Only a REQUEST: start_test() decides the real size (free: 25 or 100; paid: 100/250/500/1,000 if it
// fits in this month's simulated customers). Anything else becomes 100.
const sizeOf = (n: unknown) => ((TEST_SIZES as readonly number[]).includes(Number(n)) ? Number(n) : 100);

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = (await req.json().catch(() => null)) as {
    crawlId?: string;
    audience?: Audience;
    profile?: ProductProfile;
    explore?: ExploreSettings;
    credentials?: Credentials;
    ownsProduct?: boolean;
    app?: Partial<AppSettings>; // app tests: the confirmed screens + paywall facts
    video?: Partial<VideoSettings>; // video tests: the confirmed frames, placement, account stats
    retestOf?: string; // re-test: repeat this earlier test with the same customers
    count?: number; // the test size the person picked (paid plans)
  } | null;
  // Never trust the browser: known options only, short text, short lists (every customer reads these).
  const profile = cleanProfile(body?.profile);
  const audience = cleanAudience(body?.audience);
  if (!body?.crawlId || typeof body.crawlId !== "string" || !audience || !profile) return jsonError("Missing the analysis, audience or product profile.");
  body.profile = profile; // productType is checked inside cleanProfile (it selects a fixed prompt sentence)
  body.audience = audience;
  let size = sizeOf(body.count);

  // ---------- App test ----------
  if (body.app) {
    // Only the screen files of YOUR saved analysis are accepted (RLS: own rows only).
    const { data: row } = await auth.supabase.from("crawls").select("data").eq("id", body.crawlId).maybeSingle();
    const analysis = row?.data as AppAnalysis | undefined;
    if (analysis?.kind !== "app") return jsonError("That app analysis was not found. Upload your screens again.");
    const app = cleanAppSettings(body.app, analysis.input.screens, analysis.input.screensB);
    if (!app.sources.length) return jsonError("Pick at least one place people find your app.");
    const settings = { kind: "app", profile: body.profile, audience: body.audience, app, count: size };
    return startTest(auth.supabase, body.crawlId, settings, null);
  }

  // ---------- Video test ----------
  if (body.video) {
    const { data: row } = await auth.supabase.from("crawls").select("data").eq("id", body.crawlId).maybeSingle();
    const analysis = row?.data as VideoAnalysis | undefined;
    if (analysis?.kind !== "video") return jsonError("That video analysis was not found. Upload your video again.");
    const video = cleanVideoSettings(body.video, analysis.input);
    const settings = { kind: "video", profile: body.profile, audience: body.audience, video, count: size };
    return startTest(auth.supabase, body.crawlId, settings, null);
  }

  // "Try the product" settings.
  let explore: ExploreSettings | undefined;
  let secret: string | null = null;
  if (body.explore?.enabled) {
    const e = body.explore;
    if (!["public", "account", "preview"].includes(e.access)) return jsonError("Unknown access mode.");
    if (e.access !== "public" && !body.ownsProduct) {
      return jsonError("Test accounts and preview links are only for your own product. Please confirm it's yours.");
    }
    const startUrl = normalizeUrl(e.startUrl);
    if (e.access === "preview" && !startUrl) return jsonError("Please paste your preview link.");
    if (e.access === "account") {
      if (!body.credentials?.email || !body.credentials?.password) {
        return jsonError("Please enter the test account's email and password.");
      }
      try {
        // Encrypted before it touches the database; the worker erases it after reading.
        secret = encryptJson({ email: body.credentials.email, password: body.credentials.password });
      } catch (err) {
        return jsonError((err as Error).message, 500);
      }
    }
    explore = {
      enabled: true,
      task: (e.task || body.profile.tryTask || "Look around and try the main feature").slice(0, 300),
      access: e.access,
      startUrl: startUrl ?? "",
      reputation: Boolean(e.reputation),
    };
  }

  // A re-test: same audience + same seed as the test it repeats, so the SAME customers come back.
  let retest: { seed: number; compareTo: string } | null = null;
  if (body.retestOf) {
    const { data: prev } = await auth.supabase.from("tests").select("id, status, total, data").eq("id", body.retestOf).maybeSingle();
    const prevRun = prev?.data as { seed?: number; audience?: Audience; kind?: string } | null;
    if (!prev || prev.status !== "done" || !prevRun?.audience || typeof prevRun.seed !== "number" || prevRun.kind === "app" || prevRun.kind === "video") {
      return jsonError("That earlier test can't be repeated. Start a normal test instead.");
    }
    body.audience = prevRun.audience;
    retest = { seed: prevRun.seed, compareTo: prev.id };
    // Same size as before too, so the same customers come back (the comparison matches them one by one).
    if ((TEST_SIZES as readonly number[]).includes(prev.total)) size = prev.total;
  }

  const settings = { profile: body.profile, audience: body.audience, explore, count: size, ...(retest ?? {}) };
  return startTest(auth.supabase, body.crawlId, settings, secret);
}

// start_test checks your plan's limit and queues the job, in one transaction.
async function startTest(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  crawlId: string,
  settings: object,
  secret: string | null,
) {
  const { data, error } = await supabase!.rpc("start_test", {
    p_crawl_id: crawlId,
    p_settings: settings,
    p_secret: secret,
  });
  if (error) {
    if (error.message.includes("LIMIT_REACHED")) {
      return NextResponse.json(
        { error: "That's more simulated customers than your plan has left. Pick a smaller test, or upgrade on the Pricing page.", limitReached: true },
        { status: 402 },
      );
    }
    if (error.message.includes("PLAN_NO_ADS")) {
      return NextResponse.json(
        { error: "Video, ad and creator tests come with the Growth and Scale plans. See the Pricing page.", limitReached: true },
        { status: 402 },
      );
    }
    return jsonError(error.message);
  }
  return NextResponse.json({ testId: data as string });
}
