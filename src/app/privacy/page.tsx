// /privacy: Crawler's Privacy Policy (draft, 2026-11-27; see src/lib/legal.ts).
// Every item here matches what the code actually collects. If you add tracking, a new service or
// a new form field, update this page (and PROCESSORS in src/lib/legal.ts) the same day.
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL, PROCESSORS } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy",
  description: "What Crawler collects, why, who helps us process it, how long we keep it and how to delete it.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  const mail = <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>;
  return (
    <LegalPage
      label="legal"
      title="Privacy Policy"
      summary={[
        "We collect what's needed to run your tests: your account, what you ask us to test, and the results.",
        "We don't sell your data, we don't show ads, and there are no advertising trackers on Crawler.",
        "An AI company (Anthropic) processes the pages, screenshots and frames of your tests so the simulated customers can react to them.",
        "Payments go through Stripe. We never see your full card number.",
        "You can delete your account, and with it your tests and files, from Settings at any time.",
      ]}
      sections={[
        {
          id: "who",
          title: "Who we are",
          body: (
            <p>
              {LEGAL.product} ({LEGAL.domain}) lets founders test their websites, stores, apps and ads on AI-simulated customers. This policy explains what
              personal information we handle when you use the site. Contact: {mail}.
            </p>
          ),
        },
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <ul>
                <li>
                  <strong>Your account:</strong> your email address, and your name if you sign in with Apple, Google or GitHub. Passwords are stored by our sign-in
                  provider in a scrambled (hashed) form we can&apos;t read.
                </li>
                <li>
                  <strong>Optional sign-up answers:</strong> age range, where you heard about us, your role, your stage and goal. You can skip them.
                </li>
                <li>
                  <strong>What you ask us to test:</strong> web addresses, product details you type, the audience you pick, screenshots and video frames you upload
                  (videos themselves stay on your device: only still frames are uploaded), and the page text and screenshots our crawler captures from public pages.
                </li>
                <li>
                  <strong>Test-account logins</strong> (only if you choose to give one for your own product): encrypted, used once by the test machine, then erased.
                  The AI never sees them.
                </li>
                <li>
                  <strong>Your results:</strong> reports, saved customer audiences, questions you ask about a test, fix statuses and any real results you add.
                </li>
                <li>
                  <strong>Payments:</strong> your plan, amounts, dates and a Stripe customer ID. Card details are handled by Stripe, not us.
                </li>
                <li>
                  <strong>Waitlist:</strong> your name and email if you joined it.
                </li>
                <li>
                  <strong>How you found us:</strong> the link tags (like utm_source) and the website that sent you on your first visit, kept in your browser and
                  saved with your sign-up so we learn which channels work.
                </li>
                <li>
                  <strong>Technical data:</strong> like any website, our hosts receive your IP address, browser type and the pages you request, and keep short-term
                  logs for security and fixing errors.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <ul>
              <li>to run your tests, show your reports and keep your account working;</li>
              <li>to take payments, enforce plan limits and prevent abuse (for example, more than one free trial per person);</li>
              <li>to answer support messages and send account emails (like sign-in links), plus the launch email if you joined the waitlist;</li>
              <li>to understand, in totals, how Crawler is used and which channels bring people, so we can improve it;</li>
              <li>to keep Crawler secure and meet legal duties.</li>
            </ul>
          ),
        },
        {
          id: "ai",
          title: "AI processing",
          body: (
            <p>
              The simulated customers and reports are produced by AI models from Anthropic, accessed through their commercial API. To run a test we send them
              your product details, the page text and screenshots or video frames, and the questions you ask about a test. Under Anthropic&apos;s commercial terms,
              this data isn&apos;t used to train their models. Simulated customers are fictional: they aren&apos;t built from real people&apos;s personal data.
            </p>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>We don&apos;t sell or rent personal information, and we don&apos;t share it for advertising. These companies help run Crawler and only get what they need:</p>
              <div className="overflow-x-auto">
                <table className="legal-table w-full min-w-[32rem] text-left text-sm">
                  <caption className="sr-only">Companies that process data for Crawler</caption>
                  <thead>
                    <tr>
                      <th scope="col">Company</th>
                      <th scope="col">What they do</th>
                      <th scope="col">What they see</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROCESSORS.map((p) => (
                      <tr key={p.name}>
                        <th scope="row">{p.name}</th>
                        <td>{p.does}</td>
                        <td>{p.sees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                We may also share information if the law requires it, to protect people&apos;s safety or our rights, or as part of a sale or merger of Crawler (in
                which case this policy keeps applying to your data).
              </p>
              <p>
                <strong>Things you choose to make public:</strong> a test&apos;s share link shows its headline numbers to anyone with the link until you stop
                sharing. Real results you add may appear on the <Link href="/accuracy">Accuracy</Link> page without anything identifying you.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and browser storage",
          body: (
            <>
              <p>We use only what Crawler needs to work. No advertising or cross-site tracking cookies.</p>
              <ul>
                <li><strong>Sign-in cookies</strong> keep you signed in (up to about 400 days, or until you sign out).</li>
                <li><strong>An invite cookie</strong> remembers a friend&apos;s invite link for 14 days.</li>
                <li><strong>A short-lived cookie</strong> (15 minutes) remembers where to send you back after connecting GitHub.</li>
                <li>
                  <strong>Browser storage</strong> on your own device remembers small things: your first-visit source, unsent onboarding answers, the
                  &ldquo;Calmer motion&rdquo; setting and the numbers you type into the revenue what-if.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "keep",
          title: "How long we keep it",
          body: (
            <ul>
              <li>Your account, tests, reports and files: until you delete them or your account.</li>
              <li>Payment records: as long as tax and accounting rules require (usually several years), even after you delete your account.</li>
              <li>Waitlist entries: until you unsubscribe or ask us to delete them.</li>
              <li>Server logs: kept only briefly by our hosts.</li>
              <li>
                After you delete your account we keep a one-way scrambled fingerprint of your email (not the email itself) so the free trial can&apos;t be claimed
                again with the same address.
              </li>
            </ul>
          ),
        },
        {
          id: "rights",
          title: "Your choices and rights",
          body: (
            <>
              <p>
                You can see and change most of your information in the app. You can <strong>delete your account</strong> in Settings (cancel any active plan
                first), which removes your tests, reports and uploaded files. You can unsubscribe from the waitlist from any email we send.
              </p>
              <p>
                Depending on where you live (for example the EU, UK or California), you may have rights to access, correct, delete, or receive a copy of your
                information, and to object to some uses. Email {mail} and we&apos;ll answer within 30 days. We don&apos;t sell or &ldquo;share&rdquo; personal
                information for targeted advertising.
              </p>
            </>
          ),
        },
        {
          id: "kids",
          title: "Young people",
          body: (
            <p>
              Crawler isn&apos;t for children under {LEGAL.minAge}, and we don&apos;t knowingly collect information from them. If you&apos;re a parent and think
              your child under {LEGAL.minAge} gave us information, email {mail} and we&apos;ll delete it. Teens aged {LEGAL.minAge}–17 may use Crawler only with a
              parent or guardian&apos;s permission. When Crawler simulates customers for products aimed at young people, it never simulates anyone under{" "}
              {LEGAL.minAge}.
            </p>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              Data is encrypted in transit (HTTPS). Each person&apos;s tests and files are locked to their own account in the database, payment and admin actions
              can only be done by our servers, and test-account logins are encrypted and erased after use. No system is perfectly secure; if something goes
              wrong that affects you, we&apos;ll tell you.
            </p>
          ),
        },
        {
          id: "where",
          title: "Where your data is",
          body: <p>Our providers store and process data mainly in the United States. If you use Crawler from elsewhere, your information is transferred there.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: <p>We&apos;ll update the date at the top when this policy changes and tell you by email or in the app about important changes before they apply.</p>,
        },
        {
          id: "contact",
          title: "Contact",
          body: <p>Privacy questions or requests: {mail}.</p>,
        },
      ]}
    />
  );
}
