// /example: a full sample report with MADE-UP data, no sign-up needed.
// The best way for a visitor to see what they'd get. Clearly labeled as an example.
import Link from "next/link";
import Report from "@/components/Report";
import AppReport from "@/components/app/AppReport";
import { Arrow } from "@/components/landing/UrlForm";
import { exampleAppRun, exampleWebsiteRun } from "@/lib/example";

export const metadata = {
  title: "Sample report (demo data)",
  alternates: { canonical: "/example" },
  description: "See a full Crawler report for a pretend website and a pretend app: score, drop-off, ranked fixes and rewritten copy.",
};

export default async function Example({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const app = kind === "app";
  // The client components only need the counted results, so drop the raw per-customer lists.
  const website = { ...exampleWebsiteRun(), personas: [], verdicts: [] };
  const appRun = { ...exampleAppRun(), personas: [], verdicts: [] };

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="t-label">example report · made-up data</p>
          <p className="mt-1 text-sm text-muted">
            This is a pretend {app ? "meal-planning app (MealMate, our own drawings)" : "meal-planning site"}. Your report looks like this, with your real screens, prices and customers.
          </p>
        </div>
        <Link href={app ? "/onboarding?kind=app" : "/#hero-url"} className="btn btn-primary h-11 shrink-0 px-5">
          Run simulation <Arrow />
        </Link>
      </div>
      <nav className="flex gap-2" aria-label="Example type">
        <Link href="/example" aria-current={!app ? "page" : undefined} className={`chip ${!app ? "" : "opacity-70"}`} aria-pressed={!app}>
          Website test
        </Link>
        <Link href="/example?kind=app" aria-current={app ? "page" : undefined} className={`chip ${app ? "" : "opacity-70"}`} aria-pressed={app}>
          App test (onboarding + paywall)
        </Link>
      </nav>

      {app ? <AppReport run={appRun} demo /> : <Report run={website} demo />}

      <div className="paper bleed py-16 text-center">
        <div className="page">
          <h2 className="t-h1">Your turn.</h2>
          <p className="t-lead mx-auto mt-4 max-w-md">Your first simulation is free: 25 customers, no card.</p>
          <Link href={app ? "/onboarding?kind=app" : "/#hero-url"} className="btn btn-primary mt-8 h-14 px-8 text-base">
            Run simulation <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );
}
