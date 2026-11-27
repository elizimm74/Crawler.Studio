// /terms: Crawler's Terms of Service (draft, 2026-11-27; see src/lib/legal.ts).
// Written to match how Crawler really works: simulated customers, monthly plans + pay per
// analysis, a free trial preview, users aged 13+ (under 18 with a parent's permission).
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { PACKS, PLANS, PROMO_MONTHS, STARTER_CUSTOMERS } from "@/lib/plans";

export const metadata = {
  title: "Terms of Service",
  description: "The rules for using Crawler: simulated customers, plans, payments, cancelling and what Crawler can and can't promise.",
  alternates: { canonical: "/terms" },
};

const paid = PLANS.filter((p) => p.priceUsd > 0);

export default function Terms() {
  const mail = <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>;
  return (
    <LegalPage
      label="legal"
      title="Terms of Service"
      summary={[
        "Crawler shows how SIMULATED customers react to your website, store, app or ad. It's a strong hint, not a promise of real sales.",
        `You need to be ${LEGAL.minAge} or older. Under 18? A parent or guardian must agree to these terms and handle any payment.`,
        "Only test things you own or have permission to test, and don't use Crawler to break into, overload or copy other sites.",
        "Monthly plans renew every month until you cancel. Cancel any time and keep your plan until the end of the month you paid for.",
        "Pay per analysis is a one-time payment for one test. Refunds are explained on the Refund Policy page.",
      ]}
      sections={[
        {
          id: "agreement",
          title: "Agreeing to these terms",
          body: (
            <>
              <p>
                These terms are an agreement between you and {LEGAL.product} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) about using {LEGAL.domain} and everything on it
                (&ldquo;the service&rdquo;). By creating an account, starting a test or paying, you agree to them and to our{" "}
                <Link href="/privacy">Privacy Policy</Link> and <Link href="/refunds">Refund Policy</Link>. If you don&apos;t agree, please don&apos;t use the service.
              </p>
            </>
          ),
        },
        {
          id: "who",
          title: "Who can use Crawler",
          body: (
            <>
              <p>
                You must be at least {LEGAL.minAge} years old. If you are under 18 (or under the age of majority where you live), you may only use Crawler with
                the permission of a parent or legal guardian, who agrees to these terms on your behalf and is responsible for any purchase.
              </p>
              <p>If you use Crawler for a company or a client, you confirm you&apos;re allowed to accept these terms for them.</p>
            </>
          ),
        },
        {
          id: "what",
          title: "What Crawler is (and isn't)",
          body: (
            <>
              <p>
                Crawler visits the public pages you give it (or reads the screenshots and video frames you upload), creates a crowd of AI-simulated customers
                from the audience you choose, and reports what they would likely do and why. The results are <strong>simulated buying intent, not real
                purchases</strong>. They come from AI models that can be wrong, can miss things and can disagree with real people.
              </p>
              <p>
                Crawler is a decision aid. It isn&apos;t a guarantee of sales, downloads, views or revenue, and it isn&apos;t legal, financial or professional
                advice. You decide what to change in your product, and those decisions are yours. Our <Link href="/science">Science</Link> and{" "}
                <Link href="/accuracy">Accuracy</Link> pages explain what the numbers can and can&apos;t tell you.
              </p>
            </>
          ),
        },
        {
          id: "account",
          title: "Your account",
          body: (
            <>
              <p>
                Keep your sign-in details safe and tell us at {mail} if you think someone else used your account. You&apos;re responsible for what happens in your
                account. Use one account per person: making extra accounts to get more free tests isn&apos;t allowed.
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "Acceptable use",
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>test a site, app or ad you don&apos;t own or don&apos;t have permission to test with Crawler, beyond looking at its public pages like any visitor would;</li>
                <li>give Crawler a test account or private preview link for a product that isn&apos;t yours;</li>
                <li>use Crawler to attack, overload, scrape at scale, or get around the logins, paywalls or bot checks of any site (Crawler never bypasses them);</li>
                <li>upload content you don&apos;t have the rights to, or anything illegal, hateful, sexual involving minors, or that invades someone&apos;s privacy;</li>
                <li>try to get around plan limits, the free-trial lock, or payments, or probe or attack Crawler&apos;s systems;</li>
                <li>copy, resell or build a competing product from Crawler&apos;s reports, prompts or software, except your own results for your own use;</li>
                <li>present simulated results as real customer reviews, testimonials or sales.</li>
              </ul>
              <p>We may pause or close accounts that break these rules, and we may refuse a test that looks harmful.</p>
            </>
          ),
        },
        {
          id: "content",
          title: "Your content and results",
          body: (
            <>
              <p>
                What you give us (addresses, product details, uploads, questions) stays yours. You give us permission to store and process it, including with
                the AI and hosting companies listed in our <Link href="/privacy">Privacy Policy</Link>, only to run Crawler for you, keep it working and safe, and
                improve it. We don&apos;t sell your content.
              </p>
              <p>
                Your reports are yours to use. If you create a share link, anyone with the link can see that test&apos;s headline numbers until you stop
                sharing. Results you add on the Accuracy page may be shown publicly without anything that identifies you or your product.
              </p>
            </>
          ),
        },
        {
          id: "plans",
          title: "Plans, payments and renewal",
          body: (
            <>
              <p>
                <strong>Free trial.</strong> One test with {STARTER_CUSTOMERS} simulated customers, no card needed. Its report is a preview until you pay for any plan
                or analysis, which unlocks it.
              </p>
              <p>
                <strong>Monthly plans</strong> ({paid.map((p) => `${p.name} $${p.priceUsd}`).join(", ")} per month) include a number of Crawlers (simulated customers)
                each billing month. They <strong>renew automatically every month</strong> at the price shown until you cancel. Unused Crawlers don&apos;t carry over
                to the next month. A test that fails on our side doesn&apos;t use any.
              </p>
              <p>
                <strong>Pay per analysis</strong> ({PACKS.map((p) => `${p.crawlers.toLocaleString("en-US")} customers $${p.priceUsd}`).join(", ")}) is a one-time
                payment for one test. It doesn&apos;t renew or expire and doesn&apos;t include Ad Analysis.
              </p>
              <p>
                Prices are in US dollars and may not include taxes that apply where you live. Payments are handled by Stripe. We may change prices for the
                future; if your plan&apos;s price changes we&apos;ll tell you before your next renewal, and you can cancel before it applies. Launch discounts
                apply to the first {PROMO_MONTHS} monthly payments, one per customer.
              </p>
            </>
          ),
        },
        {
          id: "cancel",
          title: "Cancelling and refunds",
          body: (
            <>
              <p>
                Cancel any time from <strong>Manage billing</strong> on your dashboard. You keep your plan until the end of the month you already paid for, and you
                won&apos;t be charged again. Refunds are covered by our <Link href="/refunds">Refund Policy</Link>. You can delete your account any time in
                Settings.
              </p>
            </>
          ),
        },
        {
          id: "third",
          title: "Other companies' services",
          body: (
            <p>
              Crawler relies on other companies (for hosting, AI, payments, email and sign-in). Their services have their own terms. We&apos;re not responsible
              for sites you ask Crawler to test or for the services those sites use.
            </p>
          ),
        },
        {
          id: "ip",
          title: "Crawler's own work",
          body: (
            <p>
              The Crawler name, logo, website, software and the way reports are built belong to us. These terms let you use the service; they don&apos;t give you
              ownership of it. If you send us ideas or feedback, we may use them without owing you anything.
            </p>
          ),
        },
        {
          id: "warranty",
          title: "No guarantees",
          body: (
            <p>
              We work hard to keep Crawler accurate, available and safe, but the service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the
              extent the law allows, we don&apos;t promise it will be error-free, uninterrupted, or that any simulated result will match what real customers do.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limits on our responsibility",
          body: (
            <p>
              To the extent the law allows, we aren&apos;t liable for indirect or consequential losses (such as lost profits, sales or data) from using or relying
              on Crawler, and our total responsibility for any claim is limited to what you paid us in the 12 months before it. Nothing here limits rights you
              have under consumer law that can&apos;t be limited.
            </p>
          ),
        },
        {
          id: "end",
          title: "Ending the agreement",
          body: (
            <p>
              You can stop using Crawler and delete your account any time. We may suspend or close an account that breaks these terms, or stop offering the
              service with reasonable notice; if we stop the service, we&apos;ll refund the unused part of any month or unused paid analysis.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: (
            <p>
              We may update these terms as Crawler changes. We&apos;ll change the date at the top, and for important changes we&apos;ll tell you by email or in the
              app before they apply. Using Crawler after that means you accept the new terms.
              {LEGAL.governingLaw ? ` These terms are governed by the laws of ${LEGAL.governingLaw}.` : ""}
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: <p>Questions about these terms: {mail}.</p>,
        },
      ]}
    />
  );
}
