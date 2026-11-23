"use client";
// The menu on phones: on small screens the top bar only has room for one button, so every other
// link (Example, Pricing, My tests, Sign out...) lives in here. Closes itself when you pick a page.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PhoneMenu({ signedIn, accounts }: { signedIn: boolean; accounts: boolean }) {
  const box = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (box.current) box.current.open = false; // a new page: close the menu
  }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      const d = box.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const links: [string, string][] = [
    ["/example", "Example report"],
    ["/pricing", "Pricing"],
    ["/science", "The science"],
    ...(signedIn ? ([["/dashboard", "Dashboard"], ["/tests", "My tests"]] as [string, string][]) : []),
    ...(!signedIn && accounts ? ([["/signin", "Sign in"]] as [string, string][]) : []),
  ];
  return (
    <details ref={box} className="phone-menu relative md:hidden">
      <summary className="btn btn-ghost h-11 w-11 cursor-pointer list-none p-0" aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="absolute right-0 top-12 z-50 flex w-56 flex-col rounded-xl border border-line-strong p-2 shadow-2xl" style={{ background: "#101116" }}>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-subtle" aria-current={path === href ? "page" : undefined}>
            {label}
          </Link>
        ))}
        {signedIn && (
          <form action="/auth/signout" method="post" className="mt-1 border-t border-line pt-1">
            <button className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-muted hover:bg-subtle">Sign out</button>
          </form>
        )}
      </div>
    </details>
  );
}
