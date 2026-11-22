# The launch waitlist

People type their name and email on the landing page (`index.html`, live on GitHub Pages). On launch
day you run one command and everyone gets the launch email.

## How it works (plain English)

1. **The page** (`index.html`) has a form. It sends the name and email to a tiny function in our
   Supabase database called `join_waitlist`. No server of ours is involved, so it works on GitHub Pages.
2. **The list** is the table `waitlist` in Supabase. Nobody can read it from a browser (not even by
   guessing): it has row-level security with no policies. The only things a visitor can do are *join*,
   *unsubscribe* and ask *how many people are on the list*.
3. **Unsubscribe:** every email has a link to `unsubscribe.html?t=<secret token>`. The page shows a
   button first (so email scanners that open links don't unsubscribe people by accident). Someone who
   unsubscribed stays unsubscribed even if another person types their email again.
4. **Launch day:** `npm run waitlist:send` emails everyone who hasn't unsubscribed and hasn't already
   got it. It records who it emailed, so running it twice never sends twice to the same person.

## See your list

Supabase dashboard > project **crawler** > Table Editor > `waitlist`. You can download it as a CSV
there. Columns: name, email, when they joined, whether they unsubscribed, whether they got the launch email.

## Send the launch email (when you launch)

You need an email service. We use **Resend** (resend.com, free for a small list). It needs three things
that only you (or a parent/guardian, since you're under 18) can set up:

1. A Resend account and an **API key**.
2. A **domain you own** that you verify in Resend (so email comes from e.g. `hello@yourdomain.com`
   and doesn't land in spam). Without a verified domain Resend only lets you email yourself.
3. A **postal address** for the email footer. Commercial email rules (e.g. CAN-SPAM in the US) require
   one, plus a working unsubscribe link (we have that). A PO box works.

Put these in `.env.local` (never commit it; see `.env.example`):

```
RESEND_API_KEY=...
MAIL_FROM="Crawler <hello@yourdomain.com>"
MAIL_ADDRESS="Your name or company, PO Box 123, City, State ZIP"
SUPABASE_SECRET_KEY=...        (you already have this for the worker)
NEXT_PUBLIC_SUPABASE_URL=...   (already there)
```

Then, in this order:

```bash
npm run waitlist:send
```
A **dry run**: prints how many people would get the email. Sends nothing.

```bash
npm run waitlist:send -- --test you@yourmail.com
```
Sends ONE test copy to you, so you can see how it looks.

```bash
npm run waitlist:send -- --send
```
Sends for real. Edit the wording first in `scripts/send-launch-email.cjs` (the `message` function and
`SUBJECT`). Keep it honest: the customers are simulated.

Set `LAUNCH_URL` in `.env.local` to the real product address before you send (the "Try Crawler" button
goes there). It defaults to https://crawler.studio.

## Good to know

- **Be honest in the sign-up text.** The page says: one email at launch and the odd update, unsubscribe
  any time, never sold. Only promise what you'll do. If you want to email them more often than that,
  change the sentence on the page first.
- **Privacy:** we store name, email, join date. People in some places (e.g. the EU/UK) have extra rights
  (to see or delete their data). If someone asks to be removed, delete their row in the Table Editor.
  Before a big launch, add a short privacy page and get a parent/guardian or adult to read it over.
- **Spam guard:** a hidden field catches simple bots, and the database refuses more than 300 sign-ups an
  hour overall. It can't stop a determined person from typing someone else's email: that person gets one
  launch email with an unsubscribe link, and the email says why they're getting it.
- **If a sign-up fails** the page shows the reason (bad email, too many people at once, no connection).
- The Supabase **URL and publishable key inside `index.html` are public by design**. They can only call
  the three functions above. Never put the secret key in any `.html` file.
