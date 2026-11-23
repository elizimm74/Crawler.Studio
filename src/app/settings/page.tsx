// /settings: account, plan & usage, security, and deleting the account. Private (middleware).
// Everything shown comes from the person's own login and my_plan() (the same numbers the database
// uses to allow tests), so it always matches the pricing page and the dashboard.
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { planName } from "@/lib/plans";
import { subscriptionLine, type PlanData } from "@/lib/dashboard";
import ManageBilling from "@/components/ManageBilling";
import { DeleteAccount, PasswordForm, SignOutEverywhere } from "@/components/settings/SettingsForms";

export const metadata = { title: "Settings", robots: { index: false } };

export default async function Settings() {
  if (!AUTH_ENABLED) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">Settings</h1>
        <p className="card mt-8 p-6 text-muted">Accounts are switched off, so there are no settings yet.</p>
      </div>
    );
  }
  const user = await currentUser();
  if (!user) redirect("/signin?next=/settings");
  const { data } = await (await supabaseServer()).rpc("my_plan");
  const plan = (data as PlanData | null) ?? null;
  const providers = [...new Set((user.identities ?? []).map((i) => i.provider))];
  const subLine = subscriptionLine(plan?.subscription ?? null);
  const n = (x: number) => x.toLocaleString("en-US");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="t-label">settings</p>
        <h1 className="t-h1 mt-3">Settings</h1>
      </div>

      <Section title="Account">
        <Row k="Email" v={user.email ?? "hidden by Apple"} />
        <Row k="Sign-in methods" v={providers.map((p) => (p === "email" ? "Email + password" : p[0].toUpperCase() + p.slice(1))).join(", ") || "Email"} />
        <Row k="Member since" v={new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
      </Section>

      <Section title="Plan and usage">
        <Row k="Plan" v={plan?.unlimited ? "Admin (no limits)" : planName(plan?.subscription?.plan ?? plan?.plan ?? "free")} />
        {subLine && <Row k="Billing" v={subLine.text} warn={subLine.warn} />}
        {plan?.monthly ? (
          <>
            <Row k="Simulated customers this month" v={`${n(plan.monthly.used)} used · ${n(plan.monthly.left)} of ${n(plan.monthly.allowance)} left`} />
            {plan.monthly.resets && <Row k="Resets on" v={new Date(plan.monthly.resets).toLocaleDateString("en-US", { month: "long", day: "numeric" })} />}
          </>
        ) : plan && !plan.unlimited ? (
          <>
            <Row k="Free tests" v={`${plan.used} used · ${Math.max(0, plan.left)} left`} />
            <Row k="Customers per test" v={`${plan.customers}${plan.customers < 100 ? ` (100 after ${plan.referrals.needed} verified invites: ${plan.referrals.count} so far)` : ""}`} />
          </>
        ) : null}
        <Row k="Video and ad tests" v={plan?.ads || plan?.unlimited ? "Included" : "Not on this plan (Growth and up)"} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/pricing" className="btn btn-secondary h-11 px-4 text-sm">
            {plan?.monthly ? "Change plan" : "See plans"}
          </Link>
          {plan?.billing && <ManageBilling className="btn btn-ghost h-11 px-4 text-sm" label="Manage billing (card, invoices, cancel)" />}
        </div>
      </Section>

      <Section title="Notifications">
        <p className="text-sm text-muted">
          Crawler doesn&apos;t send product or marketing emails, so there is nothing to switch off. You only get account emails you ask for
          (confirm your email, reset your password) and Stripe&apos;s receipts if you pay.
        </p>
      </Section>

      <Section title="Security">
        <PasswordForm hasPassword={providers.includes("email")} />
        <div className="border-t border-line pt-5">
          <SignOutEverywhere />
        </div>
      </Section>

      <Section title="Delete account" danger>
        <DeleteAccount />
      </Section>
    </div>
  );
}

function Section({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={`card p-6 sm:p-8 ${danger ? "border-line-strong" : ""}`} aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`} className="text-lg font-medium">
        {title}
      </h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Row({ k, v, warn = false }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line pb-3 last:border-0 sm:flex-row sm:justify-between sm:gap-6">
      <span className="text-sm text-faint">{k}</span>
      <span className={`text-sm sm:text-right ${warn ? "font-medium text-fg" : ""}`}>{v}</span>
    </div>
  );
}
