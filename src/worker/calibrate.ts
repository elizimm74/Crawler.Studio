// CALIBRATION in the worker (engine v2). No AI calls, so it's free.
//
// calibrateJob: a founder added the real conversion rate of a finished test.
//   1. take that test's crowd (each person's say-vs-do probability, saved in the report)
//   2. log the calibration (predicted vs real) in calibration_runs, superseding older ones for that test
//   3. refit the GLOBAL calibration on every usable result and redo leave-one-out accuracy for all of them
//   4. save calibration_state (read by every new test, and by the public /accuracy page)
//
// calibrationFor: which calibration a NEW test should use (this site's own, else the global one, else none).
import type { Ctx, Job } from "./jobs";
import { followThrough, meanShifted, UNCALIBRATED_SD } from "../lib/intent";
import { fitGlobal, fitSiteDelta, leaveOneOut, MIN_FOR_GLOBAL, MIN_VISITORS, summarizeAccuracy, type CalRow } from "../lib/calibration";
import { NO_CALIBRATION, type CalibrationUsed } from "../lib/aggregate";
import { ENGINE_VERSION } from "../lib/personas";
import type { Goal, Persona, Verdict } from "../lib/types";

type SavedRun = {
  kind?: string;
  engine?: number;
  profile?: { goal?: Goal };
  personas?: Persona[];
  verdicts?: Verdict[];
  stats?: { total?: number; buy?: number; behavior?: { p?: number[]; predicted?: { rate: number } } };
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 200);
  }
};

// The crowd's per-person probabilities BEFORE calibration. Saved by engine v2; recomputed for older runs.
export function crowdProbabilities(run: SavedRun): number[] {
  const saved = run.stats?.behavior?.p;
  if (saved?.length) return saved;
  const goal = run.profile?.goal ?? "sign up";
  const byId = new Map((run.personas ?? []).map((p) => [p.id, p]));
  return (run.verdicts ?? []).flatMap((v) => {
    const p = byId.get(v.personaId);
    return p ? [followThrough(p, v, goal).p] : [];
  });
}

export async function calibrateJob(job: Job, ctx: Ctx) {
  const { db } = ctx;
  const { data: test, error } = await db.from("tests").select("id, user_id, url, data, total, score").eq("id", job.ref_id).single();
  if (error || !test) throw new Error(`test ${job.ref_id} not found`);
  const { data: actual } = await db.from("test_actuals").select("real_pct, visitors, period_days").eq("test_id", job.ref_id).single();
  if (!actual) throw new Error(`no real result for test ${job.ref_id}`);

  const run = (test.data ?? {}) as SavedRun;
  const kind = run.kind === "app" || run.kind === "video" ? run.kind : "website";
  // Only website/store crowds have per-person say-vs-do probabilities so far; apps and videos are
  // logged (stated vs real) but don't feed the fit.
  const ps = kind === "website" ? crowdProbabilities(run) : [];
  const real = Number(actual.real_pct) / 100;
  const total = test.total ?? run.stats?.total ?? 0;
  const engine = run.engine ?? 1;
  const shown = run.stats?.behavior?.predicted?.rate;

  await db.from("calibration_runs").update({ superseded: true }).eq("test_id", job.ref_id).eq("superseded", false);
  const { error: insErr } = await db.from("calibration_runs").insert({
    test_id: test.id,
    user_id: test.user_id,
    host: host(test.url),
    engine,
    kind,
    goal: run.profile?.goal ?? null,
    simulated: total,
    stated_pct: total ? round((Number(test.score ?? 0) / total) * 100) : null,
    raw_pct: ps.length ? round(meanShifted(ps, 0) * 100) : null,
    shown_pct: shown !== undefined ? round(shown * 100) : null,
    real_pct: Number(actual.real_pct),
    visitors: actual.visitors,
    period_days: actual.period_days,
    site_delta: ps.length ? round(fitSiteDelta(ps, real), 4) : null,
    p: ps.length ? ps : null,
  });
  if (insErr) throw new Error(`couldn't log calibration: ${insErr.message}`);
  await refit(ctx);
  ctx.log("calibrated", { test: job.ref_id, real: actual.real_pct, visitors: actual.visitors });
}

// Refit the global calibration + leave-one-out accuracy over every current result.
export async function refit(ctx: Ctx) {
  const { db } = ctx;
  const { data: rows, error } = await db
    .from("calibration_runs")
    .select("id, user_id, p, real_pct, visitors, engine, excluded")
    .eq("superseded", false);
  if (error) throw new Error(`couldn't read calibrations: ${error.message}`);
  const all: CalRow[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    user: r.user_id ?? `deleted-${r.id}`,
    ps: Array.isArray(r.p) ? (r.p as number[]) : [],
    real: Number(r.real_pct) / 100,
    visitors: r.visitors,
    usable: !r.excluded && r.engine === ENGINE_VERSION,
  }));
  const usable = all.filter((r) => r.usable && r.ps.length);
  const fit = fitGlobal(usable);
  const loo = leaveOneOut(usable);
  const used = new Set(usable.filter((r) => (r.visitors ?? 0) >= MIN_VISITORS).map((r) => r.id));

  for (const l of loo) {
    await db
      .from("calibration_runs")
      .update({ loo_pct: round(l.predicted * 100), error_pp: round(l.errorPp), within_margin: l.within, used_in_fit: used.has(l.id) })
      .eq("id", Number(l.id));
  }
  // The published accuracy only counts results with enough real visitors to be meaningful.
  const accuracy = summarizeAccuracy(loo.filter((l) => used.has(l.id)));
  const { error: stErr } = await db
    .from("calibration_state")
    .update({ engine: ENGINE_VERSION, delta: round(fit.delta, 4), sd: round(fit.sd, 4), n: fit.n, users: fit.users, accuracy, fitted_at: new Date().toISOString() })
    .eq("id", 1);
  if (stErr) throw new Error(`couldn't save calibration: ${stErr.message}`);
}

// Which calibration a new test uses. Order: this account's own real result for the same site
// (enough visitors), else the global fit once 5+ results back it, else none (research priors only).
export async function calibrationFor(ctx: Ctx, userId: string, url: string): Promise<CalibrationUsed> {
  try {
    const { data: site } = await ctx.db
      .from("calibration_runs")
      .select("site_delta, visitors, real_pct")
      .eq("user_id", userId)
      .eq("host", host(url))
      .eq("superseded", false)
      .eq("excluded", false)
      .eq("engine", ENGINE_VERSION)
      .gte("visitors", MIN_VISITORS)
      .not("site_delta", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const s = site?.[0];
    if (s) {
      return {
        source: "site",
        delta: Number(s.site_delta),
        sd: 0.35, // ASSUMPTION: one site's own result still leaves some week-to-week noise
        n: 1,
        note: `Calibrated to the real result you added for ${host(url)} (${Number(s.real_pct)}% from ${Number(s.visitors).toLocaleString("en-US")} visitors).`,
      };
    }
    const { data: st } = await ctx.db.from("calibration_state").select("delta, sd, n, engine").eq("id", 1).single();
    if (st && st.engine === ENGINE_VERSION && st.n >= MIN_FOR_GLOBAL) {
      return {
        source: "global",
        delta: Number(st.delta),
        sd: Number(st.sd),
        n: st.n,
        note: `Calibrated on ${st.n} real results founders added (each predicted without its own result, see the Accuracy page).`,
      };
    }
  } catch (err) {
    ctx.log("calibration lookup failed", { error: (err as Error).message });
  }
  return { ...NO_CALIBRATION, sd: UNCALIBRATED_SD };
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
