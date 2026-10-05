"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { Constituent } from "./composition";
import styles from "./GlowComposition.module.css";
import { prefersReducedMotion } from "@/lib/reducedMotion";

export interface CompositionPart extends Constituent {
  /** The catalogue product's own name ("GHK-Cu"), when the part is linked. */
  label: string;
  /** Its product page, and its scientific record, when they exist. */
  product: string | null;
  record: string | null;
}

/**
 * GLOW'S COMPOSITION — the page's second moment of impact (flagship idea #5),
 * in the place the flagship interlude holds on the others.
 *
 * The vial, in its own light, beside its parts: each one's name, its stated
 * mass, and the two records NEOGEN has for it (the product, the scientific
 * record). When the section is reached the vial's light comes up, once, and
 * the readings take a faint shine from it. The readings are plain DOM, always
 * present and legible; the light is only ever atmosphere.
 */
export function GlowComposition({
  parts,
  vial,
  eyebrow,
  title,
  titleId,
  productLabel,
  recordLabel,
  totalLabel,
}: {
  parts: readonly CompositionPart[];
  vial: { src: string; width: number; height: number; alt: string };
  eyebrow: string;
  title: string;
  titleId: string;
  productLabel: string;
  recordLabel: string;
  /** "GLOW · 70 mg" — the whole, under its parts. */
  totalLabel: string;
}) {
  const section = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);

  /* Reached: the light comes up, once. Reduced motion: at once, unanimated. */
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const still = prefersReducedMotion();
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLit(true);
        seen.disconnect();
      },
      { threshold: still ? 0 : 0.45 },
    );
    seen.observe(node);
    return () => seen.disconnect();
  }, []);

  return (
    <div ref={section} className={styles.composition} data-lit={lit ? "" : undefined}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      </header>

      <div className={styles.vial}>
        <span className={styles.lamp} aria-hidden="true" />
        <Image
          src={vial.src}
          alt={vial.alt}
          width={vial.width}
          height={vial.height}
          sizes="18rem"
        />
      </div>

      <ol className={styles.parts}>
        {parts.map((part, index) => (
          <li
            key={part.name}
            className={styles.part}
            style={{ "--delay": `${260 + index * 90}ms` } as CSSProperties}
          >
            <span className={styles.name}>{part.label}</span>
            <span className={styles.mass}>
              {part.mg}
              <span className={styles.unit}> mg</span>
            </span>
            <span className={styles.links}>
              {part.product ? <Link href={part.product}>{productLabel}</Link> : null}
              {part.record ? <Link href={part.record}>{recordLabel}</Link> : null}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.total}>{totalLabel}</p>
    </div>
  );
}
