// The founder's "pulse": turns database events into short Slack messages, and builds the
// daily report with revenue, records and streaks. Pure functions (no database), so the bench
// can check them; postSlack() is the only part that talks to the internet.
//
// Where the events come from: database triggers (migration 0016) write rows into ops_events;
// the worker (src/worker/pulse.ts) reads them and calls these functions.
import { PLANS, planName } from "./plans";

export type OpsEvent = { id: number; kind: string; data: Record<string, unknown>; created_at: string };

// $1,234 or $12.50 (cents in, dollars out)
export const usd = (cents: unknown) => {
  const c = Number(cents) || 0;
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
};
const num = (n: unknown) => (Number(n) || 0).toLocaleString("en-US");
const who = (d: Record<string, unknown>) => (d.email ? String(d.email) : "someone");
const plan = (p: unknown) => planName(String(p ?? ""));
const day = (iso: unknown) =>
  iso ? new Date(String(iso)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "the end of the month";

// Round numbers worth celebrating. Returns the biggest one crossed going from `before` to `after`.
export function crossed(before: number, after: number, marks: number[]): number | null {
  const hit = marks.filter((m) => before < m && after >= m);
  return hit.length ? hit[hit.length - 1] : null;
}
const MONEY_MARKS = [100, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 1_000_000].map((d) => d * 100);
const USER_MARKS = [10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000];
const MRR_MARKS = [100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000].map((d) => d * 100);
const price = (id: unknown) => (PLANS.find((p) => p.id === id)?.priceUsd ?? (id === "launch" ? 19 : id === "studio" ? 49 : 0)) * 100;

// One event -> one Slack message (or null to skip it).
export function formatEvent(e: OpsEvent): string | null {
  const d = e.data ?? {};
  const lines: string[] = [];
  switch (e.kind) {
    case "payment": {
      const amount = Number(d.amount) || 0;
      const today = Number(d.today) || 0;
      const best = Number(d.best_before) || 0;
      const all = Number(d.all_time) || 0;
      const allBefore = Number(d.all_time_before) || 0;
      lines.push(`:moneybag: *${usd(amount)}* from ${who(d)} (${plan(d.plan)})`);
      lines.push(`Today ${usd(today)} · MRR ${usd(d.mrr)} · All-time ${usd(all)}`);
      if (allBefore === 0 && amount > 0) lines.push(":tada: *Your first ever payment!*");
      else if (best > 0 && today > best && today - amount <= best) lines.push(`:trophy: *New record day!* Beat your best of ${usd(best)}.`);
      const mark = crossed(allBefore, all, MONEY_MARKS);
      if (mark && allBefore > 0) lines.push(`:rocket: You just passed *${usd(mark)}* all-time.`);
      break;
    }
    case "sub_new": {
      const mrr = Number(d.mrr) || 0;
      lines.push(`:large_green_circle: New *${plan(d.plan)}* subscriber: ${who(d)}`);
      lines.push(`MRR now ${usd(mrr)} · ${num(d.subscribers)} paying`);
      const mark = crossed(mrr - price(d.plan), mrr, MRR_MARKS);
      if (mark) lines.push(`:rocket: MRR passed *${usd(mark)}*!`);
      break;
    }
    case "sub_recovered":
      lines.push(`:white_check_mark: Payment fixed: ${who(d)} is back on ${plan(d.plan)}. MRR ${usd(d.mrr)}`);
      break;
    case "payment_failed":
      lines.push(`:warning: Payment failed: ${who(d)} (${plan(d.plan)}). Stripe is retrying their card; they can't start new tests until it works.`);
      break;
    case "cancel_scheduled":
      lines.push(`:large_orange_circle: ${who(d)} cancelled ${plan(d.plan)}. Active until ${day(d.until)}.`);
      break;
    case "cancel_undone":
      lines.push(`:leftwards_arrow_with_hook: ${who(d)} changed their mind: ${plan(d.plan)} continues.`);
      break;
    case "sub_ended":
      lines.push(`:red_circle: ${plan(d.plan)} ended for ${who(d)}. MRR now ${usd(d.mrr)} · ${num(d.subscribers)} paying`);
      break;
    case "plan_changed":
      lines.push(`:arrows_counterclockwise: ${who(d)} moved from ${plan(d.from)} to ${plan(d.plan)}. MRR ${usd(d.mrr)}`);
      break;
    case "signup": {
      const total = Number(d.total) || 0;
      lines.push(`:wave: New sign-up: ${who(d)} · ${num(total)} accounts`);
      const mark = crossed(total - 1, total, USER_MARKS);
      if (mark) lines.push(`:dart: *${num(mark)} accounts!*`);
      break;
    }
    case "waitlist": {
      const total = Number(d.total) || 0;
      lines.push(`:memo: Waitlist: ${d.name ? String(d.name) : "someone"} joined · ${num(total)} on the list`);
      const mark = crossed(total - 1, total, USER_MARKS);
      if (mark) lines.push(`:dart: *${num(mark)} people on the waitlist!*`);
      break;
    }
    case "test_failed":
      lines.push(`:hammer_and_wrench: A test failed (${String(d.url ?? "")}): ${String(d.error || "no reason saved")}`);
      break;
    case "analysis_failed":
      lines.push(`:hammer_and_wrench: An analysis failed (${String(d.url ?? "")}): ${String(d.error || "no reason saved")}`);
      break;
    default:
      return null;
  }
  return lines.join("\n");
}

// What ops_digest() returns (migration 0016). Money in cents.
export type Digest = {
  day: string;
  revenue: number; payments: number; best_revenue_before: number;
  revenue_week: number; revenue_month: number; revenue_all: number;
  mrr: number; subscribers: Record<string, number> | null;
  failing_payments: number; cancelling: number;
  signups: number; best_signups_before: number; users: number;
  waitlist_new: number; waitlist: number;
  tests: number; best_tests_before: number; customers: number; customers_all: number;
  failed: number; ai_cost: number; sale_streak: number;
};

// Today's records: only counted when there WAS an earlier best to beat (day one isn't a "record").
export function records(d: Digest): string[] {
  const out: string[] = [];
  if (d.revenue > 0 && d.best_revenue_before > 0 && d.revenue > d.best_revenue_before) out.push(`best revenue day ever (${usd(d.revenue)})`);
  if (d.signups > 0 && d.best_signups_before > 0 && d.signups > d.best_signups_before) out.push(`most sign-ups in a day (${num(d.signups)})`);
  if (d.tests > 0 && d.best_tests_before > 0 && d.tests > d.best_tests_before) out.push(`most tests in a day (${num(d.tests)})`);
  return out;
}

export function formatDigest(d: Digest): string {
  const date = new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const subs = Object.entries(d.subscribers ?? {})
    .sort((a, b) => price(b[0]) - price(a[0]))
    .map(([id, n]) => `${n} ${plan(id)}`)
    .join(", ");
  const aiCents = Math.round(Number(d.ai_cost) * 100);
  const lines = [
    `:bar_chart: *Crawler daily report · ${date}*`,
    "",
    `*Revenue today: ${usd(d.revenue)}*${d.payments ? ` (${num(d.payments)} payment${d.payments === 1 ? "" : "s"})` : ""}`,
    `This week ${usd(d.revenue_week)} · This month ${usd(d.revenue_month)} · All-time ${usd(d.revenue_all)}`,
    `MRR ${usd(d.mrr)}${subs ? ` · ${subs}` : " · no paying subscribers yet"}`,
    `AI cost today ${usd(aiCents)} · Profit today about ${usd(d.revenue - aiCents)} (before Stripe, hosting and other costs)`,
    "",
    `Sign-ups ${num(d.signups)} · ${num(d.users)} accounts · Waitlist ${num(d.waitlist)}${d.waitlist_new ? ` (+${num(d.waitlist_new)})` : ""}`,
    `Tests ${num(d.tests)} · ${num(d.customers)} simulated customers (${num(d.customers_all)} all-time)`,
  ];
  const recs = records(d);
  if (recs.length) lines.push("", `:trophy: *Record:* ${recs.join(" · ")}`);
  if (d.sale_streak >= 2) lines.push(`:fire: ${num(d.sale_streak)}-day sales streak`);
  const watch: string[] = [];
  if (d.failing_payments) watch.push(`${num(d.failing_payments)} failing payment${d.failing_payments === 1 ? "" : "s"}`);
  if (d.cancelling) watch.push(`${num(d.cancelling)} cancelling at month end`);
  if (d.failed) watch.push(`${num(d.failed)} failed test${d.failed === 1 ? "" : "s"}`);
  if (watch.length) lines.push(`:eyes: Watch: ${watch.join(" · ")}`);
  return lines.join("\n");
}

// Post one message to the founder's Slack channel (an "incoming webhook" URL, kept secret in env).
// Returns false if it didn't go through, so the caller can try again later. Never throws.
export async function postSlack(text: string, url = process.env.SLACK_WEBHOOK_URL): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
