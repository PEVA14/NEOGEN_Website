import Link from "next/link";

import { Container, Section } from "@/components/primitives";
import { Mono } from "@/components/typography";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { getWorld } from "@/config/worlds";

import { MomentStage } from "./MomentStage";

import { MomentCommerce, type MomentCommerceProps } from "./MomentCommerce";
import styles from "./GlowMoment.module.css";

/** GLOW's own copy: the blend, set out as what it contains. */
export interface GlowMomentCopy {
  /** The product's GLB, when one is declared for it. */
  model: string | null;
  eyebrow: string;
  title: string;
  /** The product's registry name: "GLOW Peptide Series". */
  name: string;
  lede: string;
  /** The blend's parts, from its printed composition. Absent for a single compound. */
  blend?: {
    label: string;
    parts: readonly {
      name: string;
      /** "50 mg". */
      amount: string;
      /** "71 % de la mezcla". */
      share: string;
      /** 0–100, for the spectrum bar. */
      percent: number;
      /** The same compound sold on its own, when the catalogue has it. */
      alone?: { label: string; href: string; price: string | null; from: string };
    }[];
  };
  presentation: { label: string; items: readonly string[] };
  product: MomentCommerceProps;
}

/**
 * GLOW — "the environment becomes light", and what that light is made of.
 *
 * Owner direction (2026-09-19): make it clear. GLOW is a BLEND, so that is
 * what the section says first: its three peptides, as a spectrum — one bar in
 * proportion to their milligrams, each part named with its amount and share,
 * and each linked to the product that sells it alone. Then the presentation
 * (pack, price per vial) and the price. Every figure is registry data; nothing
 * describes an effect or a use.
 *
 * Still not a second RETA. RETA's subject is an object and it arrives in 3D;
 * GLOW's subject is light, so the mechanism stays luminance: the bloom behind
 * the vial ignites on a view() timeline and the spectrum fills as it does. The
 * resolved, fully lit state is the default — reduced motion and browsers
 * without scroll timelines simply get it.
 */
export function GlowMoment({ copy }: { copy: GlowMomentCopy }) {
  const world = getWorld("glow");

  return (
    <Section
      mode="impact"
      world={world.id}
      padded={false}
      id="glow"
      aria-labelledby="glow-title"
      className={styles.section}
    >
      <div className={styles.viewport}>
        <Container width="full" className={styles.content}>
          <div className={styles.stage}>
            <div className={styles.copy}>
              <Mono size="2xs" className={styles.eyebrow}>
                {copy.eyebrow}
              </Mono>
              <h2 id="glow-title" className={styles.title}>
                {copy.title}
              </h2>
              <p className={styles.name}>{copy.name}</p>
              <p className={styles.lede}>{copy.lede}</p>

              {copy.blend ? (
                <div className={styles.blend}>
                  <p className={styles.label}>{copy.blend.label}</p>
                  {/* The spectrum: the light split into its parts, to scale. */}
                  <div className={styles.spectrum} aria-hidden="true">
                    {copy.blend.parts.map((part, i) => (
                      <span
                        key={part.name}
                        className={styles.band}
                        data-part={i}
                        style={{ flexGrow: part.percent }}
                      />
                    ))}
                  </div>
                  <ul className={styles.parts}>
                    {copy.blend.parts.map((part, i) => (
                      <li key={part.name} className={styles.part}>
                        <span className={styles.swatch} data-part={i} aria-hidden="true" />
                        <span className={styles.partName}>{part.name}</span>
                        <span className={styles.partAmount}>{part.amount}</span>
                        <span className={styles.partShare}>{part.share}</span>
                        {part.alone ? (
                          <Link prefetch={false} href={part.alone.href} className={styles.alone}>
                            {part.alone.label}
                            {part.alone.price ? (
                              <span className={styles.alonePrice}>
                                {" "}
                                · {part.alone.from} {part.alone.price}
                              </span>
                            ) : null}{" "}
                            <span aria-hidden="true">→</span>
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={styles.presentation}>
                <p className={styles.label}>{copy.presentation.label}</p>
                <p className={styles.presentationItems}>
                  {copy.presentation.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </p>
              </div>
            </div>

            {/* The object, in its own light. The bloom is the product's world;
                the vial is the product — live where the model exists, and the
                drawn plate everywhere else. */}
            <div className={styles.object}>
              <div className={styles.lights} aria-hidden="true">
                <div className={styles.bloom} data-motion="cinematic" />
                <div className={styles.halo} data-motion="cinematic" />
              </div>
              <MomentStage
                world="glow"
                modelPath={copy.model}
                label={copy.product.name}
                className={styles.stage}
              >
                <SpecimenPlate
                  areaId={null}
                  world="glow"
                  name={copy.product.name}
                  annotation={copy.product.range ?? undefined}
                  size="stage"
                  bare
                />
              </MomentStage>
            </div>
          </div>

          <MomentCommerce {...copy.product} showName={false} />
        </Container>
      </div>
    </Section>
  );
}
