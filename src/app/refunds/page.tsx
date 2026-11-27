// /refunds: Crawler's Refund Policy (draft, 2026-11-27; see src/lib/legal.ts).
// The rules below are DEFAULTS chosen to be fair and simple for a new product; the founder (and the
// parent who owns the Stripe account) can change them. Refunds are issued by hand in Stripe.
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Refund Policy",
  description: "How cancelling and refunds work for Crawler's monthly plans and pay-per-analysis tests.",
  alternates: { canonical: "/refunds" },
};

export default function Refunds() {
  const mail = <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>;
  return (
    <LegalPage
      label="legal"
      title="Refund Policy"
      summary={[
        "Cancel a monthly plan any time: you keep it until the end of the month you paid for, and you're never charged again.",
        "Forgot to cancel? If you haven't run a test since the renewal, ask within 7 days for a full refund of that renewal.",
        "Paid for one analysis and haven't used it? Full refund within 14 days.",
        "A test that fails on our side never uses your Crawlers, so you don't need to ask.",
        `Email ${LEGAL.supportEmail} from your account's email address.`,
      ]}
      sections={[
        {
          id: "cancel",
          title: "Cancelling a monthly plan",
          body: (
            <p>
              Cancel any time from <strong>Manage billing</strong> on your dashboard. Cancelling stops future charges. You keep your plan and its Crawlers until the
              end of the billing month you already paid for. We don&apos;t give partial refunds for the rest of a month you&apos;ve started using.
            </p>
          ),
        },
        {
          id: "renewal",
          title: "Renewal refunds",
          body: (
            <p>
              If your plan renewed and you didn&apos;t mean to keep it, email us within <strong>7 days</strong> of the renewal. If you haven&apos;t started a test
              since that renewal, we&apos;ll refund it in full and cancel the plan.
            </p>
          ),
        },
        {
          id: "first",
          title: "Your first month",
          body: (
            <p>
              If Crawler didn&apos;t work for you in your first month (for example, tests kept failing on our side or your site couldn&apos;t be read), email us
              within <strong>14 days</strong> of your first payment and tell us what happened. We&apos;ll make it right with a refund or extra Crawlers.
            </p>
          ),
        },
        {
          id: "ppa",
          title: "Pay per analysis",
          body: (
            <p>
              A one-time analysis that you haven&apos;t used yet can be refunded in full within <strong>14 days</strong> of buying it. Once its test has run, it
              can&apos;t be refunded, unless the test failed on our side or the report was clearly broken, in which case we&apos;ll give the analysis back or
              refund it.
            </p>
          ),
        },
        {
          id: "failed",
          title: "Failed tests",
          body: (
            <p>
              If a test fails because of a problem on our side, it automatically doesn&apos;t count against your monthly Crawlers, and paid-analysis Crawlers go
              back to your balance. Sites that block automated visitors or don&apos;t load can&apos;t be tested; Crawler stops before using your Crawlers when it
              can tell.
            </p>
          ),
        },
        {
          id: "not",
          title: "What isn't refundable",
          body: (
            <ul>
              <li>Crawlers you already used on tests that ran normally, including when you disagree with the simulated results.</li>
              <li>The unused part of a month after you&apos;ve run tests in it.</li>
              <li>Accounts closed for breaking our <Link href="/terms">Terms</Link>.</li>
            </ul>
          ),
        },
        {
          id: "how",
          title: "How to ask, and how long it takes",
          body: (
            <p>
              Email {mail} from the address on your account, with what you&apos;d like refunded. We answer within 3 business days. Approved refunds go back to the
              original payment method through Stripe and usually show up within 5–10 business days, depending on your bank.
            </p>
          ),
        },
        {
          id: "law",
          title: "Your legal rights",
          body: <p>This policy doesn&apos;t take away any right to a refund you have under the consumer law where you live.</p>,
        },
      ]}
    />
  );
}
