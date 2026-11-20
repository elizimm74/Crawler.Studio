"use client";
// The end of every report: what to do NEXT, so the report is a starting point, not a dead end.
//   1. Your launch path: test -> fix -> re-test -> send your score -> add real results.
//      Only "test" is shown as done (we can't know if you fixed anything). The rest link to the exact place.
//   2. Keep going: things Crawler can do that fit THIS product (revenue what-if, an ad for it, the same
//      product another way, another customer mind), plus invites / more tests when they're relevant.
// Honest on purpose: no countdowns, no fake scarcity, nothing that says a result is guaranteed.
import Link from "next/link";
import { usePlan } from "@/components/dashboard/usePlan";
import { Icon } from "@/components/dashboard/viz";
import { PLANS, perTestLabel, priceLabel } from "@/lib/plans";

type Kind = "website" | "store" | "app" | "game" | "video";

export default function NextSteps({
  kind,
  fixWins,
  retestHref,
  newVersionHref,
}: {
  kind: Kind;
  fixWins: number; // total simulated customers the top fixes could win back (counted in code)
  retestHref: string; // where "test it again" goes
  newVersionHref: string; // for apps / videos: upload the new version
}) {
  const plan = usePlan();
  const canRetestSame = kind === "website" || kind === "store";
  const steps = [
    { n: 1, title: "Test it", sub: "Done: you have your report", href: null, done: true },
    { n: 2, title: "Fix the top 3", sub: fixWins > 0 ? `could win back ${fixWins}` : "start with the biggest", href: "#fixes", done: false },
    { n: 3, title: canRetestSame ? "Re-test the page" : "Test the new version", sub: canRetestSame ? "same customers, before vs after" : "upload the updated version", href: canRetestSame ? retestHref : newVersionHref, done: false },
    { n: 4, title: "Send your score", sub: "a public scorecard link", href: "#share", done: false },
    { n: 5, title: "Add real results", sub: "teach us how accurate we were", href: "#actual", done: false },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  // Ideas that fit what was just tested.
  const ideas: { href: string; title: string; text: string; icon: string }[] = [];
  ideas.push({ href: "/dashboard#overview", title: "See what it could be worth", text: "Put in your visitors and price: a rough monthly revenue what-if, with and without your fixes.", icon: "chart" });
  if (kind !== "video") ideas.push({ href: "/onboarding?kind=video", title: "Test an ad or creator video", text: "Would simulated viewers stop, watch and tap through to this product? Plus a creator deal check.", icon: "play" });
  if (kind === "video") ideas.push({ href: "/onboarding", title: "Test where the video sends people", text: "Run the landing page or app the video points to, and see if they'd stay.", icon: "cart" });
  if (kind === "website" || kind === "store") ideas.push({ href: "/onboarding?kind=app", title: "Test the mobile app too", text: "Upload onboarding screenshots and see where people quit and what the paywall costs you.", icon: "phone" });
  if (kind === "app" || kind === "game") ideas.push({ href: "/onboarding", title: "Test your website too", text: "Most people see your site before they install. Does it make them want to?", icon: "cart" });
  ideas.push({ href: "/dashboard#minds", title: "Try a different crowd", text: "Save a customer mind (say, students on a budget) and test the same product with them.", icon: "minds" });

  const free = plan && !plan.unlimited && plan.plan === "free";
  const pack = PLANS.find((p) => p.id === "launch")!;

  return (
    <section id="next" className="scroll-mt-32 space-y-4" aria-label="What to do next">
      <div className="gpanel p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-label">your launch path</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Here&apos;s how to turn this into a launch.</h2>
          </div>
          <p className="text-sm tabular-nums text-faint">
            {doneCount} of {steps.length} steps
          </p>
        </div>
        <div className="pathbar mt-5" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}>
          <i style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => {
            const inner = (
              <>
                <span className={`pathdot ${s.done ? "done" : ""}`} aria-hidden>
                  {s.done ? <Icon name="check" className="h-3.5 w-3.5" /> : s.n}
                </span>
                <p className="mt-3 text-sm font-medium">{s.title}</p>
                <p className="mt-0.5 text-xs text-faint">{s.sub}</p>
              </>
            );
            return (
              <li key={s.n}>
                {s.href ? (
                  s.href.startsWith("#") ? (
                    <a href={s.href} className="pathstep h-full">
                      {inner}
                    </a>
                  ) : (
                    <Link href={s.href} className="pathstep h-full">
                      {inner}
                    </Link>
                  )
                ) : (
                  <div className="pathstep h-full">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ideas.map((c) => (
          <Link key={c.title} href={c.href} className="gpanel nextcard">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
              <Icon name={c.icon} className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-2 font-medium">{c.title}</p>
            <p className="text-sm text-muted">{c.text}</p>
            <span className="mt-auto pt-2 text-sm text-faint">
              Open <span className="arrow inline-block">→</span>
            </span>
          </Link>
        ))}
        {free ? (
          <Link href="/dashboard#fixes" className="gpanel nextcard">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
              <Icon name="spark" className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-2 font-medium">Unlock full 100-customer tests</p>
            <p className="text-sm text-muted">
              Invite {plan!.referrals.needed} friends who verify their email ({plan!.referrals.count} of {plan!.referrals.needed} so far).
            </p>
            <span className="mt-auto pt-2 text-sm text-faint">
              Get your link <span className="arrow inline-block">→</span>
            </span>
          </Link>
        ) : (
          <Link href="/pricing" className="gpanel nextcard">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
              <Icon name="bolt" className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-2 font-medium">Keep testing as you fix</p>
            <p className="text-sm text-muted">
              {pack.name}: {pack.tests} tests for {priceLabel(pack)}, one-time ({perTestLabel(pack)}). Nothing renews.
            </p>
            <span className="mt-auto pt-2 text-sm text-faint">
              See packs <span className="arrow inline-block">→</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
