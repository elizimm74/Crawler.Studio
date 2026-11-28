# GitHub: sign in + import (setup, ~10 minutes on a computer)

Two separate things. Sign-in never touches anyone's code; the import app only sees repo names and deployment addresses.

## 1. "Continue with GitHub" (sign in)
1. github.com → Settings → Developer settings → **OAuth Apps** → New OAuth App.
   - Application name: `Crawler`
   - Homepage URL: `https://crawler.studio`
   - Authorization callback URL: `https://txoimqedwfsuxoqiguop.supabase.co/auth/v1/callback`
2. Create → copy the **Client ID**, then "Generate a new client secret" and copy it (don't paste it in chat).
3. Supabase dashboard → Authentication → Sign In / Providers → **GitHub** → enable, paste Client ID + Secret → Save.
4. Vercel → Environment Variables: add `NEXT_PUBLIC_GITHUB_LOGIN` = `1` (the button stays hidden without it, so
   nobody hits "provider is not enabled"). Redeploy.
5. Test: crawler.studio/signin → Continue with GitHub.

## 2. "Import from GitHub" (the Crawler GitHub App)
1. github.com → Settings → Developer settings → **GitHub Apps** → New GitHub App.
   - GitHub App name: `Crawler Studio` (the URL slug it shows, e.g. `crawler-studio`, is GITHUB_APP_SLUG)
   - Homepage URL: `https://crawler.studio`
   - Callback URL: `https://crawler.studio/api/github/setup` (click "Add Callback URL" to also add
     `https://crawler-for-vercel.vercel.app/api/github/setup` and `http://localhost:3000/api/github/setup`)
   - Tick **Request user authorization (OAuth) during installation** (this is how Crawler checks the install is really yours)
   - Setup URL: leave empty (the callback above is used), tick "Redirect on update"
   - Webhook: **untick Active** (not needed yet)
   - Repository permissions: **Metadata: Read-only**, **Deployments: Read-only**. Nothing else.
   - Where can it be installed: **Any account**
2. Create. On the app page copy the **App ID** and **Client ID**, generate a **client secret**, and at the bottom **Generate a private key** (a .pem file downloads).
3. Vercel → crawler-for-vercel → Settings → Environment Variables (Production):
   - `GITHUB_APP_SLUG` = the slug
   - `GITHUB_APP_ID` = the App ID
   - `GITHUB_APP_CLIENT_ID` = the app's Client ID
   - `GITHUB_APP_CLIENT_SECRET` = the app's client secret
   - `GITHUB_APP_PRIVATE_KEY` = the whole .pem file contents (paste it as is)
   - `SUPABASE_SECRET_KEY` must also be there (already needed for Stripe): the setup step saves the connection with it
4. Redeploy (upload the zip). The "Import from GitHub" button appears in onboarding and Settings → GitHub.
5. Test: onboarding → Import from GitHub → pick a repo on GitHub → back on Crawler → "Pick from GitHub" → Use.

Database: migration `0022_github.sql` must be applied (Claude does this when you approve it in Supabase).

## What's next (not built yet): automatic tests on pull requests
Turn on the app's webhook (`/api/github/webhook`, secret in `GITHUB_WEBHOOK_SECRET`), add "Pull requests: write" + "Deployment statuses" events, and per repo an "auto-test previews" switch with a monthly cap. When Vercel reports a preview deployment, Crawler runs a test on it with the repo's saved customer mind and comments "34/100 would sign up (+3 vs main) · top fix: …" on the pull request. Needs: a server-only way to start a test for a user, chaining analyze → test in the worker without the review step, and posting the comment from the worker.
