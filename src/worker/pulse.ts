// The founder's pulse, run inside the worker (it's always on):
//   - every 20s: post new events (payments, subscribers, sign-ups, failures...) to Slack
//   - once a day at DIGEST_HOUR (default 21 = 9pm) in DIGEST_TZ: post the daily report
// Does nothing unless SLACK_WEBHOOK_URL is set. A message that Slack refuses is retried later;
// events older than a day are dropped quietly (so turning Slack on later doesn't flood your phone).
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDigest, formatEvent, postSlack, type Digest, type OpsEvent } from "../lib/ops";

const EVENT_MS = 20_000;
const DIGEST_CHECK_MS = 60_000;
const MAX_AGE_MS = 24 * 3600_000;

// "2026-11-22" and the hour (0-23) right now in the founder's time zone.
export function localNow(tz: string, now = new Date()): { date: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function startPulse(db: SupabaseClient, log: (msg: string, extra?: Record<string, unknown>) => void) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    log("pulse off (no SLACK_WEBHOOK_URL)");
    return;
  }
  const tz = process.env.DIGEST_TZ || "America/New_York";
  const hour = Math.min(23, Math.max(0, Number(process.env.DIGEST_HOUR ?? 21)));
  const skip = new Set((process.env.SLACK_SKIP ?? "").split(",").map((s) => s.trim()).filter(Boolean)); // e.g. "signup,waitlist"
  // so "today" in the database matches yours (awaited via .then: Supabase requests only send when awaited)
  db.from("ops_state").upsert({ key: "tz", value: tz }).then(({ error }) => error && log("pulse: saving time zone failed", { error: error.message }));

  let busy = false;
  async function events() {
    if (busy) return;
    busy = true;
    try {
      const { data, error } = await db.rpc("ops_claim_events", { p_limit: 20 });
      if (error) return log("pulse: claim failed", { error: error.message });
      for (const e of (data ?? []) as OpsEvent[]) {
        if (skip.has(e.kind) || Date.now() - new Date(e.created_at).getTime() > MAX_AGE_MS) continue;
        const text = formatEvent(e);
        if (text && !(await postSlack(text))) {
          await db.rpc("ops_unclaim_event", { p_id: e.id }); // try again next round
          log("pulse: Slack refused a message, will retry", { kind: e.kind });
          break;
        }
      }
    } catch (err) {
      log("pulse: events error", { error: (err as Error).message });
    } finally {
      busy = false;
    }
  }

  async function digest() {
    try {
      const now = localNow(tz);
      if (now.hour < hour) return;
      const { data: mine } = await db.rpc("ops_claim_digest", { p_day: now.date });
      if (!mine) return; // already posted today (or another worker is doing it)
      const { data, error } = await db.rpc("ops_digest", { p_day: now.date });
      if (error || !data) return log("pulse: digest failed", { error: error?.message });
      if (!(await postSlack(formatDigest(data as Digest)))) log("pulse: Slack refused the daily report");
    } catch (err) {
      log("pulse: digest error", { error: (err as Error).message });
    }
  }

  setInterval(events, EVENT_MS).unref();
  setInterval(digest, DIGEST_CHECK_MS).unref();
  void events();
  log("pulse on", { tz, digestHour: hour, skip: [...skip] });
}
