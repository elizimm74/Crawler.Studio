"use client";
// The hero's URL box. It never drops the address: it goes to /onboarding?url=..., which checks the
// site (real, public, reachable), previews it and guesses the category before anything runs.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow } from "@/components/landing/UrlForm";

// `sample`: also show "See a sample report" right next to the button (the site's strongest trust asset).
export default function HeroForm({ cta = "Run simulation", id = "hero-url", sample = false }: { cta?: string; id?: string; sample?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim().replace(/^https?:\/\//i, "");
    // Quick check here; the full check (is it public and reachable?) happens on the next screen.
    if (!/^[^\s/]+\.[^\s/]{2,}/.test(v)) {
      setProblem("Enter a website address, like yourwebsite.com");
      return;
    }
    setProblem(null);
    setBusy(true);
    router.push(`/onboarding?url=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className={`flex flex-col gap-2 ${sample ? "lg:flex-row" : "sm:flex-row"}`}>
        <label htmlFor={id} className="sr-only">
          Your website address
        </label>
        <input
          id={id}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (problem) setProblem(null);
          }}
          placeholder="https://yourwebsite.com"
          className="field h-14 flex-1 text-base"
          inputMode="url"
          autoComplete="url"
          aria-invalid={Boolean(problem)}
          aria-describedby={problem ? `${id}-error` : undefined}
        />
        <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary h-14 px-6 text-base">
          {busy ? "Opening…" : cta}
          {!busy && <Arrow />}
        </button>
        {sample && (
          <Link href="/example" className="btn btn-secondary h-14 px-6 text-base">
            See a sample report
          </Link>
        )}
      </div>
      {problem && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-fg">
          {problem}
        </p>
      )}
    </form>
  );
}
