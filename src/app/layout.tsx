// The frame around every page: <html>, <body>, the top bar and the footer.
import NavScroll from "@/components/NavScroll";
import NavLink from "@/components/NavLink";
import PressFeedback from "@/components/PressFeedback";
import ScrollScrub from "@/components/landing/motion/ScrollScrub";
import SmoothScroll from "@/components/landing/motion/SmoothScroll";
import AutoReveal from "@/components/AutoReveal";
import CalmToggle from "@/components/CalmToggle";
import type { Metadata } from "next";
import Link from "next/link";
import PhoneMenu from "@/components/PhoneMenu";
import FirstTouch from "@/components/FirstTouch";
import "./globals.css";
import { APP_NAME, SITE_URL } from "@/lib/config";
import { currentUser } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import Mark from "@/components/Mark";

// Runs before the page is drawn: should the landing intro play? Once per tab,
// and never for people who turned off animations. (See src/components/landing/Intro.tsx.)
// The opening claw animation plays once per tab on laptops/desktops only. Phones skip it: phone
// visitors decide in seconds, and Crawler's own simulated customers flagged ~2s of blank screen.
// 2026-11-23 overhaul: the claw intro is OFF (it held the hero back ~2.8s; the brief asks for no
// unnecessary animation). Intro.tsx is kept, so it can come back by restoring the old condition here.
const INTRO_SCRIPT = `try{var d=document.documentElement,c=localStorage.getItem("crawler-calm")==="1";if(c)d.dataset.calm="1";d.dataset.intro="skip"}catch(e){document.documentElement.dataset.intro="skip"}`;

// Build every page fresh for each visitor, so the header always shows
// whether THIS person is signed in.
export const dynamic = "force-dynamic";

const DESCRIPTION =
  "AI customer simulations for your website, store or app. See what makes people buy, what makes them leave, and what to fix before launch. Simulated buying intent, not real purchases.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Crawler: AI customer simulations for your website", template: "%s · Crawler" },
  description: DESCRIPTION,
  // The card people see when the link is shared (X, iMessage, Slack...).
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: "Would your customers actually buy? Crawler",
    description: DESCRIPTION,
    images: [{ url: "/api/og/home", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Would your customers actually buy? Crawler", description: DESCRIPTION, images: ["/api/og/home"] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    // suppressHydrationWarning: the intro script below adds data-intro to <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      {/* flex column: the footer stays at the bottom even on short pages */}
      <body className="flex min-h-screen flex-col">
        {/* home page only: blue claws scratch a white page open */}
        <FirstTouch />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-bg focus:p-4">
          Skip to content
        </a>
        {/* a floating glass nav pill (it tightens up once you scroll: NavScroll) */}
        <NavScroll />
        {/* soft, slow wheel scrolling + things gently rising in as you scroll, on every page */}
        <SmoothScroll />
        <AutoReveal />
        <PressFeedback />
        <ScrollScrub />
        <header className="site-header sticky top-3 z-40 px-3 sm:top-4 sm:px-4">
          <div className="nav-pill mx-auto flex h-14 max-w-[64rem] items-center justify-between gap-4 pl-5 pr-2">
            <Logo />
            <nav className="flex items-center gap-1 text-sm" aria-label="Main">
              {user ? (
                <>
                  <NavLink href="/example" className="hidden md:inline-flex">
                    Sample report
                  </NavLink>
                  <NavLink href="/science" className="hidden md:inline-flex">
                    Science
                  </NavLink>
                  <NavLink href="/pricing" className="hidden sm:inline-flex">
                    Pricing
                  </NavLink>
                  <NavLink href="/dashboard">Dashboard</NavLink>
                  <NavLink href="/tests" className="hidden sm:inline-flex">
                    My tests
                  </NavLink>
                  <form action="/auth/signout" method="post" className="hidden sm:block">
                    <button className="btn btn-text text-sm">Sign out</button>
                  </form>
                  <Link href="/onboarding" className="btn btn-primary ml-1 h-10 px-5 text-sm">
                    New test
                  </Link>
                </>
              ) : AUTH_ENABLED ? (
                <>
                  <NavLink href="/example" className="hidden md:inline-flex">
                    Sample report
                  </NavLink>
                  <NavLink href="/science" className="hidden md:inline-flex">
                    Science
                  </NavLink>
                  <NavLink href="/pricing" className="hidden sm:inline-flex">
                    Pricing
                  </NavLink>
                  <NavLink href="/signin">Sign in</NavLink>
                  <Link href="/signup" className="btn btn-primary ml-1 h-10 px-5 text-sm">
                    Start free
                  </Link>
                </>
              ) : (
                <>
                  <NavLink href="/example" className="hidden md:inline-flex">
                    Sample report
                  </NavLink>
                  <NavLink href="/science" className="hidden md:inline-flex">
                    Science
                  </NavLink>
                  <NavLink href="/pricing" className="hidden sm:inline-flex">
                    Pricing
                  </NavLink>
                  <Link href="/onboarding" className="btn btn-primary ml-1 h-10 px-5 text-sm">
                    Start free
                  </Link>
                </>
              )}
              <PhoneMenu signedIn={Boolean(user)} accounts={AUTH_ENABLED} />
            </nav>
          </div>
        </header>

        <main id="main" className="page page-enter flex-1 pb-24 pt-12 sm:pt-16">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="home-wide flex flex-col gap-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
            <Logo small />
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
              {user && (
                <Link href="/?home=1" className="hover:text-fg">
                  Home page
                </Link>
              )}
              <Link href="/example" className="hover:text-fg">
                Example report
              </Link>
              <Link href="/pricing" className="hover:text-fg">
                Pricing
              </Link>
              <Link href="/tools/paywall-checker" className="hover:text-fg">
                Free paywall checker
              </Link>
              <Link href="/science" className="hover:text-fg">
                The science
              </Link>
              <Link href="/accuracy" className="hover:text-fg">
                Accuracy
              </Link>
              <Link href="/case-studies" className="hover:text-fg">
                Case studies
              </Link>
            </nav>
            <CalmToggle />
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

// "crawler" with the claw-scratch logo in front.
function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center gap-2 font-medium tracking-tight text-fg ${small ? "text-sm" : "text-[17px]"}`}>
      {/* the scratch mark (white, black border) + the wordmark: Crawler's brand lockup */}
      <span className={`logo-tile ${small ? "is-small" : ""}`} aria-hidden>
        <Mark size={small ? 26 : 36} />
      </span>
      <span className="logo-word">{APP_NAME.toLowerCase()}</span>
    </Link>
  );
}

// NavLink (src/components/NavLink.tsx) marks the page you're on.
