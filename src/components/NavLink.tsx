"use client";
// A link in the top navigation that knows when you're ON its page: it gets aria-current="page"
// (screen readers say "current page") and the glass nav shows it as a soft green pill.
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const path = usePathname() ?? "";
  const here = path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={here ? "page" : undefined} className={`btn btn-text nav-link text-sm ${className}`}>
      {children}
    </Link>
  );
}
