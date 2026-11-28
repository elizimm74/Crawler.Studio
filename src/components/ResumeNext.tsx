"use client";
// On the dashboard: if this person was in the middle of something when they signed up (e.g. testing
// a website they typed during onboarding), carry on there instead of leaving them on the dashboard.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { takePendingNext } from "@/lib/pendingNext";

export default function ResumeNext() {
  const router = useRouter();
  useEffect(() => {
    const next = takePendingNext();
    if (next && !next.startsWith("/dashboard")) router.replace(next);
  }, [router]);
  return null;
}
