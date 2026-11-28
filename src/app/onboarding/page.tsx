// /onboarding: the first questions (what are you testing? -> website/screens -> what to learn -> about you),
// then the test wizard. The "what are you testing?" tiles show when it opens with no link and no kind
// (the home page's "Get started" button).
// If this account already finished onboarding, skip straight to where they were going.
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import Onboarding from "@/components/Onboarding";
import { safePath } from "@/lib/safePath";

export const metadata = { title: "Start a simulation", description: "Paste your website, pick what you want to learn, and run simulated customers through it.", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; kind?: string; mind?: string; preset?: string; url?: string }> }) {
  const { next, kind, mind, preset, url } = await searchParams;
  // Only allow going back to pages on OUR site.
  const safeNext = safePath(next, "/app"); // only pages on our own site

  const user = await currentUser();
  const onboarded = Boolean(user?.user_metadata?.onboarded);
  // Returning users skip the "about you" step; with a link to follow (and no new URL) they go straight there.
  if (onboarded && next && !url) redirect(safeNext);

  // Came from the landing page's URL box (next = /app?url=...)? Pre-fill that URL.
  // Or straight from the home page hero (?url=...). Never silently dropped.
  const startUrl = (url ?? new URL(safeNext, "http://x").searchParams.get("url") ?? "").slice(0, 2000);
  return <Onboarding startUrl={startUrl} startKind={kind === "app" || kind === "game" ? "app" : kind === "idea" || kind === "video" ? kind : "website"} mind={mind && /^[0-9a-f-]{36}$/.test(mind) ? mind : undefined} preset={preset?.slice(0, 40)} firstTime={!onboarded} choose={!startUrl && !kind && !mind && !preset} />;
}
