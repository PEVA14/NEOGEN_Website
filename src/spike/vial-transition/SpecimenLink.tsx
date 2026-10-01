"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { arm, useArmed } from "./armed";
import { markIncoming } from "./incoming";
import { SpecimenLayers } from "./SpecimenLayers";
import { SPECIMEN_NAVIGATION } from "./SpikePage";
import { specimenFor } from "./specimens";
import { warmDestination } from "./warm";

/**
 * SPIKE — a flagship in the catalogue masthead's strip, as a transition source.
 *
 * On a phone the strip is the first RETA, GLOW or GHK-Cu a visitor sees, well
 * before the grid; if only grid cards travelled, the natural tap never did
 * (owner, 2026-09-29). This is the strip's link with the grid card's
 * behaviour: the still split into set and object, the world paired with the
 * product page's, the destination's pictures warmed once it has been on
 * screen or a pointer settles, and — because the grid shows the same product —
 * names carried only once it is tapped (`armed.ts`).
 *
 * Renders the media itself and takes the strip's copy as `children`, so the
 * strip's markup and styles are unchanged around it.
 */
export function SpecimenLink({
  slug,
  href,
  className,
  mediaClassName,
  world,
  alt,
  sizes,
  children,
}: {
  slug: string;
  href: string;
  className: string;
  mediaClassName: string;
  world: string;
  alt: string;
  sizes: string;
  children: ReactNode;
}) {
  const key = `strip:${slug}`;
  const armed = useArmed(key);
  const media = useRef<HTMLSpanElement>(null);
  const specimen = specimenFor(slug);
  const warm = () => warmDestination(slug, true);

  // As the grid card: warm once the strip has been on screen for a moment.
  useEffect(() => {
    const node = media.current;
    if (!node) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (!entry?.isIntersecting) return;
        timer = window.setTimeout(() => {
          warmDestination(slug, true);
          observer.disconnect();
        }, 400);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [slug]);

  if (!specimen) return null;
  return (
    <Link
      href={href}
      className={className}
      data-world={world}
      onPointerEnter={warm}
      onFocus={warm}
      onPointerDown={warm}
      onClick={() => {
        arm(key);
        const r = media.current?.getBoundingClientRect();
        markIncoming(slug, r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null);
      }}
      transitionTypes={[SPECIMEN_NAVIGATION]}
    >
      {/* Positioned, so the world's proxy covers exactly this stage. */}
      <span ref={media} className={mediaClassName} style={{ position: "relative" }}>
        <SpecimenLayers
          slug={slug}
          specimen={specimen}
          alt={alt}
          variant="card"
          sizes={sizes}
          priority
          world
          named={armed}
        />
      </span>
      {children}
    </Link>
  );
}
