"use client";
// HOME HERO v10 "photo + glass" (2026-11-28, from the founder's mockup): a full-screen nature photo,
// the giant bold "crawler" wordmark in white, one line saying what it does, a frosted-glass URL box,
// and one example simulated customer floating on glass. Everything on it is TRUE: the free test is 25
// simulated customers, sign-up is needed, and the floating customer is labelled as an example.
//
// Photos: our own public-domain / CC0 photos in public/nature (docs/photo-credits.md). No people on
// purpose (a real face reads as a real customer). To preview the others: /?home=1&scene=ridge
// (scenes: hills, ridge, valley, grass). Change DEFAULT_SCENE to switch the live one.
import { useEffect, useState } from "react";
import Link from "next/link";
import HeroForm from "@/components/landing/home/HeroForm";
import LaunchBanner from "@/components/landing/LaunchBanner";
import type { LaunchState } from "@/lib/launch";

export const SCENES = {
  // the founder's picture (a lone astronaut in a pink flower field), widened for computers by blending in
  // more of the same field; phones get the original tall picture. Source/licence: see docs/photo-credits.md.
  astronaut: { src: "/hero/astronaut-wide.webp", phone: "/hero/astronaut-tall.webp", label: "Astronaut in a flower field", pos: "70% 50%" },
  hills: { src: "/nature/peak.webp", label: "Green hills", pos: "50% 60%" },
  ridge: { src: "/nature/ridge.webp", label: "Mountain meadow", pos: "50% 70%" },
  valley: { src: "/nature/valley.webp", label: "Alpine valley", pos: "50% 75%" },
  grass: { src: "/nature/grass.webp", label: "Soft grass", pos: "50% 40%" },
} as const;
export type Scene = keyof typeof SCENES;
export const DEFAULT_SCENE: Scene = "astronaut";

export default function PhotoHero({ launch, starter, proof }: { launch: LaunchState; starter: number; proof: { tests: number; sites: number } | null }) {
  const [scene, setScene] = useState<Scene>(DEFAULT_SCENE);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("scene");
    if (s && s in SCENES) setScene(s as Scene);
  }, []);
  const photo: { src: string; pos: string; phone?: string } = SCENES[scene];

  return (
    <section className="hero27 photo-hero" data-scene={scene} aria-labelledby="hero-title">
      {/* the photo + a soft dark wash so white text always reads */}
      <picture>
        {photo.phone && <source media="(max-width: 767px)" srcSet={photo.phone} />}
        <img src={photo.src} alt="" aria-hidden className="ph-photo" style={{ objectPosition: photo.pos }} fetchPriority="high" />
      </picture>
      <div className="ph-wash" aria-hidden />

      <div className="ph-inner home-wide">
        <LaunchBanner state={launch} className="ph-pill rise d1" />
        <h1 id="hero-title" className="ph-title rise d1">
          <span className="wordmark21 ph-word">crawler</span>
          <span className="sr-only">: </span>
          <span className="ph-sub">Your website, tested by simulated customers before you launch.</span>
        </h1>

        <div className="ph-form rise d2">
          <HeroForm cta="Run simulation" sample />
        </div>
        <p className="ph-small rise d3">
          Free · {starter} simulated customers · no card · results in a few minutes
          {proof ? ` · ${proof.tests.toLocaleString("en-US")} simulations run` : ""}
        </p>
        <Link href="/onboarding" className="ph-link rise d3">
          Testing an app, game or ad instead? Start here →
        </Link>
      </div>

      {/* one example simulated customer (made up, and labelled so) */}
      <aside className="ph-card float-b" aria-label="An example simulated customer">
        <p className="ph-card-head">
          <i aria-hidden /> 45 · nurse · budget tight
        </p>
        <p className="ph-card-verdict">Decision: wouldn&apos;t buy</p>
        <p className="ph-card-quote">&ldquo;Shipping cost only shows at the last step. I don&apos;t trust the total.&rdquo;</p>
        <p className="ph-card-note">example customer · demo data</p>
      </aside>

      <a href="#how" className="ph-scroll" aria-label="Scroll to see how it works">
        Scroll to see how it works
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
