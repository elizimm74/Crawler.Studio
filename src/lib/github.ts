// SERVER ONLY. "Import from GitHub": the Crawler GitHub App.
// People install the app on the repos THEY choose; Crawler can then list those repos and find each
// one's live website (the repo's "website" field, or its latest successful deployment, e.g. Vercel).
// Permissions the app needs (read-only): Metadata, Deployments. It never reads or changes code.
//
// Env (all optional: without them the feature is hidden):
//   GITHUB_APP_SLUG          e.g. "crawler-studio"  (github.com/apps/<slug>)
//   GITHUB_APP_ID            the App ID number
//   GITHUB_APP_PRIVATE_KEY   the .pem private key (newlines may be written as \n)
//   GITHUB_APP_CLIENT_ID / GITHUB_APP_CLIENT_SECRET   to confirm who installed it (OAuth during install)
// No npm package: GitHub's API with fetch, and the app's sign-in token made with Node's crypto.
import crypto from "crypto";

const API = "https://api.github.com";
const env = (k: string) => process.env[k]?.trim() || "";

export const githubEnabled = () =>
  Boolean(env("GITHUB_APP_SLUG") && env("GITHUB_APP_ID") && env("GITHUB_APP_PRIVATE_KEY") && env("GITHUB_APP_CLIENT_ID") && env("GITHUB_APP_CLIENT_SECRET"));

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

// A 9-minute token that proves "this request comes from the Crawler app" (GitHub's rule: max 10 min).
export function appJwt(now = Math.floor(Date.now() / 1000)): string {
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: env("GITHUB_APP_ID") }));
  const key = env("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const sig = crypto.createSign("RSA-SHA256").update(`${head}.${body}`).sign(key);
  return `${head}.${body}.${b64url(sig)}`;
}

async function gh<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${token}`, "User-Agent": "crawler-studio", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

// A 1-hour token for ONE installation (only the repos that person picked).
export async function installationToken(installationId: number): Promise<string> {
  const d = await gh<{ token: string }>(`/app/installations/${installationId}/access_tokens`, appJwt(), { method: "POST" });
  return d.token;
}

// ---------- install flow: prove the installation belongs to the signed-in person ----------
// The "state" we send to GitHub and get back: who started it + when, signed so it can't be forged.
export function signState(userId: string, now = Date.now()): string {
  const payload = `${userId}.${now}`;
  const mac = crypto.createHmac("sha256", env("GITHUB_APP_CLIENT_SECRET") || "dev").update(payload).digest("hex").slice(0, 32);
  return `${payload}.${mac}`;
}
export function verifyState(state: string | null, userId: string, now = Date.now()): boolean {
  if (!state) return false;
  const [uid, ts, mac] = state.split(".");
  if (uid !== userId || !ts || !mac || now - Number(ts) > 15 * 60_000 || Number(ts) > now + 60_000) return false;
  const want = crypto.createHmac("sha256", env("GITHUB_APP_CLIENT_SECRET") || "dev").update(`${uid}.${ts}`).digest("hex").slice(0, 32);
  return mac.length === want.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want));
}

export const installUrl = (state: string) => `https://github.com/apps/${encodeURIComponent(env("GITHUB_APP_SLUG"))}/installations/new?state=${encodeURIComponent(state)}`;

// GitHub sends back a one-time "code" (OAuth during install). Swap it for a user token and check
// that this GitHub user really can see the installation. Returns the GitHub account it's on.
export async function confirmInstallation(code: string, installationId: number): Promise<{ account: string } | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env("GITHUB_APP_CLIENT_ID"), client_secret: env("GITHUB_APP_CLIENT_SECRET"), code }),
    signal: AbortSignal.timeout(10_000),
  });
  const tok = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!tok.access_token) return null;
  const list = await gh<{ installations: { id: number; account: { login: string } }[] }>("/user/installations?per_page=100", tok.access_token);
  const found = list.installations.find((i) => i.id === installationId);
  return found ? { account: found.account.login } : null;
}

// ---------- repos + their live website ----------
export type RepoInfo = {
  id: number;
  fullName: string;
  private: boolean;
  homepage: string | null;
  liveUrl: string | null;
  source: "website field" | "deployment" | null;
  updatedAt: string;
  // NOT-YET-LIVE versions: the latest successful PREVIEW deployment per branch (Vercel, Netlify...),
  // so a change can be tested before it's merged. Newest first, max 3.
  previews: Preview[];
};
export type Preview = { branch: string; url: string; at: string };

type GhRepo = { id: number; full_name: string; private: boolean; homepage: string | null; updated_at: string };
type GhDeployment = { id: number; environment: string; statuses_url: string; ref: string; created_at: string };
type GhStatus = { state: string; environment_url?: string; target_url?: string };

// The repo's "website" field if it's a real web address, else the latest successful PRODUCTION
// deployment's address (Vercel, Netlify and others report it to GitHub), else nothing.
export function pickLiveUrl(homepage: string | null, deployUrls: string[]): { url: string | null; source: RepoInfo["source"] } {
  const ok = (u: string | null | undefined) => {
    if (!u) return null;
    try {
      const x = new URL(/^https?:\/\//.test(u) ? u : `https://${u}`);
      return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null;
    } catch {
      return null;
    }
  };
  const home = ok(homepage?.trim());
  if (home && !/github\.(com|io)\/?$/.test(new URL(home).hostname)) return { url: home, source: "website field" };
  const dep = deployUrls.map(ok).find(Boolean);
  return dep ? { url: dep, source: "deployment" } : { url: null, source: null };
}

export async function listRepos(installationId: number): Promise<RepoInfo[]> {
  const token = await installationToken(installationId);
  const { repositories } = await gh<{ repositories: GhRepo[] }>("/installation/repositories?per_page=100", token);
  const repos = repositories.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 30);
  return Promise.all(
    repos.map(async (r, i) => {
      let deployUrls: string[] = [];
      if (!r.homepage) {
        try {
          const deps = await gh<GhDeployment[]>(`/repos/${r.full_name}/deployments?per_page=5&environment=Production`, token);
          for (const d of deps.slice(0, 3)) {
            const st = await gh<GhStatus[]>(d.statuses_url + "?per_page=5", token);
            const good = st.find((s) => s.state === "success" && (s.environment_url || s.target_url));
            if (good) deployUrls = [good.environment_url || good.target_url!];
            if (deployUrls.length) break;
          }
        } catch {
          // no deployments permission or none made: just no address
        }
      }
      const live = pickLiveUrl(r.homepage, deployUrls);
      const previews = i < PREVIEW_REPOS ? await listPreviews(r.full_name, token).catch(() => []) : [];
      return { id: r.id, fullName: r.full_name, private: r.private, homepage: r.homepage, liveUrl: live.url, source: live.source, updatedAt: r.updated_at, previews };
    }),
  );
}

// Previews are looked up for the most recently updated repos only (each costs a few GitHub calls).
const PREVIEW_REPOS = 8;

// Picks the newest successful preview per branch from deployments (newest first). Pure, benched.
export function pickPreviews(items: { env: string; branch: string; url: string | null; at: string }[], max = 3): Preview[] {
  const seen = new Set<string>();
  const out: Preview[] = [];
  for (const d of [...items].sort((a, b) => b.at.localeCompare(a.at))) {
    if (/^production$/i.test(d.env) || !d.url || seen.has(d.branch)) continue;
    try {
      const u = new URL(d.url);
      if (u.protocol !== "https:") continue;
    } catch {
      continue;
    }
    seen.add(d.branch);
    out.push({ branch: d.branch, url: d.url, at: d.at });
    if (out.length >= max) break;
  }
  return out;
}

async function listPreviews(fullName: string, token: string): Promise<Preview[]> {
  const deps = await gh<GhDeployment[]>(`/repos/${fullName}/deployments?per_page=15`, token);
  const candidates = deps.filter((d) => !/^production$/i.test(d.environment)).slice(0, 6);
  const items = await Promise.all(
    candidates.map(async (d) => {
      const st = await gh<GhStatus[]>(d.statuses_url + "?per_page=5", token).catch(() => [] as GhStatus[]);
      const good = st.find((x) => x.state === "success" && (x.environment_url || x.target_url));
      return { env: d.environment, branch: d.ref, url: good ? good.environment_url || good.target_url! : null, at: d.created_at };
    }),
  );
  return pickPreviews(items);
}
