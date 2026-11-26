// Sends the LAUNCH EMAIL to everyone on the waitlist. Run it once, on launch day:
//   npm run waitlist:send                       DRY RUN: only prints who would get it (sends nothing)
//   npm run waitlist:send -- --test you@me.com  sends ONE copy to that address (to see how it looks)
//   npm run waitlist:send -- --send             sends to everyone who hasn't unsubscribed or already got it
//
// Safe on purpose:
//   - dry run is the default; --send is required to really send
//   - people who unsubscribed are skipped, and so is anyone who already got the launch email
//     (it writes waitlist.launch_emailed_at after each successful send, so you can re-run after a crash)
//   - every email has the unsubscribe link, and --send refuses to run without a postal address
//     (commercial email rules, e.g. CAN-SPAM, require one)
//   - sends one at a time with a short pause (email services limit how fast you can send)
//
// Needs these in .env.local (never commit it): SUPABASE_SECRET_KEY (the worker already uses it),
// NEXT_PUBLIC_SUPABASE_URL, RESEND_API_KEY, MAIL_FROM (an address on a domain you verified in Resend),
// MAIL_ADDRESS (your postal address for the footer). Optional: WAITLIST_SITE, LAUNCH_URL.
// Full guide: docs/waitlist.md. Uses Resend's HTTP API through fetch (no package to install).

const args = process.argv.slice(2);
const SEND = args.includes("--send");
const testTo = args.includes("--test") ? args[args.indexOf("--test") + 1] : null;
const env = (k) => (process.env[k] || "").trim();

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const SECRET = env("SUPABASE_SECRET_KEY");
const SITE = (env("WAITLIST_SITE") || "https://elizimm74.github.io/Study").replace(/\/$/, ""); // where unsubscribe.html lives
const LAUNCH_URL = env("LAUNCH_URL") || "https://crawler.studio"; // where the "Try Crawler" button goes
const UNSUB_BASE = (env("UNSUBSCRIBE_URL") || (env("WAITLIST_SITE") ? `${SITE}/unsubscribe.html` : `${LAUNCH_URL.replace(/\/$/, "")}/unsubscribe`)); // the unsubscribe page (on crawler.studio by default)
const FROM = env("MAIL_FROM");
const ADDRESS = env("MAIL_ADDRESS");
const RESEND = env("RESEND_API_KEY");

const SUBJECT = "Crawler is live: meet your customers before they meet your website";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The email. Edit the words here. Keep it honest: simulated customers, buying intent, not real purchases.
function message(person) {
  const first = (person.name || "there").split(/\s+/)[0];
  const unsub = `${UNSUB_BASE}?t=${person.token}`;
  const text =
    `Hi ${first},\n\n` +
    `You asked us to tell you when Crawler launched. It's live.\n\n` +
    `Crawler sends simulated customers (up to 30,000 a month) to your website, app, game, store or ad. They tell you what stopped them and what to fix first, in a few minutes.\n\n` +
    `Try it: ${LAUNCH_URL}\n\n` +
    `A reminder of what it is: the customers are simulated, so you get buying intent and reasons, not real purchases. It's a fast first read before you launch.\n\n` +
    `Thanks for being early.\n\n` +
    `---\nYou're getting this because you joined the Crawler launch list. Unsubscribe: ${unsub}\n${ADDRESS}\n`;
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.6">` +
    `<p>Hi ${esc(first)},</p>` +
    `<p>You asked us to tell you when Crawler launched. <strong>It's live.</strong></p>` +
    `<p>Crawler sends simulated customers (up to 30,000 a month) to your website, app, game, store or ad. They tell you what stopped them and what to fix first, in a few minutes.</p>` +
    `<p><a href="${esc(LAUNCH_URL)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Try Crawler</a></p>` +
    `<p style="color:#555;font-size:14px">A reminder of what it is: the customers are simulated, so you get buying intent and reasons, not real purchases. It's a fast first read before you launch.</p>` +
    `<p>Thanks for being early.</p>` +
    `<hr style="border:0;border-top:1px solid #ddd;margin:28px 0 14px" />` +
    `<p style="color:#777;font-size:12px">You're getting this because you joined the Crawler launch list. <a href="${esc(unsub)}" style="color:#777">Unsubscribe</a><br />${esc(ADDRESS)}</p></div>`;
  return { text, html, unsub };
}

async function db(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Database said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

async function sendOne(person, to) {
  const m = message(person);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: SUBJECT, text: m.text, html: m.html, headers: { "List-Unsubscribe": `<${m.unsub}>` } }),
  });
  if (!res.ok) throw new Error(`Resend said ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

(async () => {
  const missing = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SECRET) missing.push("SUPABASE_SECRET_KEY");
  if (SEND || testTo) for (const [k, v] of [["RESEND_API_KEY", RESEND], ["MAIL_FROM", FROM], ["MAIL_ADDRESS", ADDRESS]]) if (!v) missing.push(k);
  if (missing.length) {
    console.error(`Missing in .env.local: ${missing.join(", ")}. See docs/waitlist.md.`);
    process.exit(1);
  }

  if (testTo) {
    await sendOne({ name: "Test", token: "00000000-0000-0000-0000-000000000000" }, testTo);
    console.log(`Sent one test email to ${testTo}. (Its unsubscribe link is a dummy.)`);
    return;
  }

  // Only people who haven't unsubscribed and haven't already got the launch email.
  const people = await db("waitlist?select=id,name,email,token&unsubscribed_at=is.null&launch_emailed_at=is.null&order=created_at.asc");
  console.log(`${people.length} ${people.length === 1 ? "person" : "people"} to email.`);
  if (!SEND) {
    people.slice(0, 20).forEach((p) => console.log(`  would send to: ${p.name} <${p.email}>`));
    if (people.length > 20) console.log(`  ...and ${people.length - 20} more`);
    console.log("\nDRY RUN: nothing was sent. Add --send to send for real.");
    return;
  }

  let sent = 0, failed = 0;
  for (const p of people) {
    try {
      await sendOne(p, p.email);
      await db(`waitlist?id=eq.${p.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ launch_emailed_at: new Date().toISOString() }) });
      sent++;
      console.log(`sent ${sent}/${people.length}: ${p.email}`);
    } catch (err) {
      failed++;
      console.error(`FAILED ${p.email}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 700)); // stay under the email service's speed limit
  }
  console.log(`\nDone. Sent ${sent}, failed ${failed}. Re-run the same command to retry the failed ones.`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
