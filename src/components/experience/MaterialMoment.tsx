import Link from "next/link";

import { Container, Section } from "@/components/primitives";
import { Mono } from "@/components/typography";
import { AreaIcon } from "@/components/ui/AreaIcon";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { getWorld } from "@/config/worlds";

import { MomentCommerce, type MomentCommerceProps } from "./MomentCommerce";
import styles from "./MaterialMoment.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

/** GHK-Cu's own copy: its record, as strata. */
export interface MaterialMomentCopy {
  eyebrow: string;
  title: string;
  /** The product's registry name. */
  name: string;
  lede: string;
  presentations: {
    label: string;
    steps: readonly {
      label: string;
      /** 0–100: this step's milligrams against the heaviest, for the block's height. */
      weight: number;
      pack: string | null;
      price: string | null;
      perVial: string | null;
    }[];
  };
  areas?: { label: string; items: readonly { id: DiscoveryAreaId; name: string; href: string }[] };
  usedIn?: { label: string; items: readonly { name: string; body: string; href: string }[] };
  research?: { label: string; body: string; action: string; href: string };
  product: MomentCommerceProps;
}

/**
 * GHK-Cu — "the environment becomes material", and its record in layers.
 *
 * Owner direction (2026-09-19): make it clear. The section led with prose about
 * verdigris and texture. It now sets out the product's record as STRATA —
 * stacked slabs, heaviest first, each one fact: the presentations drawn to
 * scale as weights (the material idea made literal), the areas it is filed
 * under, the blend that contains it, and its sourced profile. Every figure is
 * registry data; nothing describes an effect or a use.
 *
 * Still the third mechanism: RETA choreographs an object, GLOW grows light,
 * GHK-Cu is surface and weight — the parallax strata behind, the slabs
 * settling in on a view() timeline, the copper vial on its plinth. The
 * resolved state is the default; reduced motion simply gets it.
 */
export function MaterialMoment({ copy }: { copy: MaterialMomentCopy }) {
  const world = getWorld("ghk-cu");

  return (
    <Section
      mode="impact"
      world={world.id}
      padded={false}
      id="ghk-cu"
      aria-labelledby="ghk-cu-title"
      className={styles.section}
    >
      <div className={styles.viewport}>
        {/* Strata. Three planes at different depths, separating on scroll. */}
        <div className={styles.strata} aria-hidden="true">
          <span className={`${styles.band} ${styles.bandBack}`} data-motion="cinematic" />
          <span className={`${styles.band} ${styles.bandMid}`} data-motion="cinematic" />
          <span className={`${styles.band} ${styles.bandFront}`} data-motion="cinematic" />
        </div>

        <Container width="full" className={styles.content}>
          <div className={styles.layout}>
            <div className={styles.record}>
              <Mono size="2xs" className={styles.eyebrow}>
                {copy.eyebrow}
              </Mono>
              <h2 id="ghk-cu-title" className={styles.title}>
                {copy.title}
              </h2>
              <p className={styles.name}>{copy.name}</p>
              <p className={styles.lede}>{copy.lede}</p>

              <div className={styles.slabs}>
                {/* The presentations, as weights drawn to scale. */}
                <section className={styles.slab} aria-label={copy.presentations.label}>
                  <p className={styles.slabLabel}>{copy.presentations.label}</p>
                  <ul className={styles.weights}>
                    {copy.presentations.steps.map((step) => (
                      <li key={step.label} className={styles.weight}>
                        <span className={styles.block} aria-hidden="true">
                          <span
                            className={styles.blockFill}
                            style={{ blockSize: `${Math.max(18, step.weight)}%` }}
                          />
                        </span>
                        <span className={styles.weightLabel}>{step.label}</span>
                        {step.pack ? <span className={styles.weightMeta}>{step.pack}</span> : null}
                        {step.price ? (
                          <span className={styles.weightPrice}>{step.price}</span>
                        ) : null}
                        {step.perVial ? (
                          <span className={styles.weightMeta}>{step.perVial}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>

                {copy.areas ? (
                  <section className={styles.slab} aria-label={copy.areas.label}>
                    <p className={styles.slabLabel}>{copy.areas.label}</p>
                    <ul className={styles.chips}>
                      {copy.areas.items.map((area) => (
                        <li key={area.id} data-area={area.id}>
                          <Link href={area.href} className={styles.chip}>
                            <AreaIcon id={area.id} className={styles.chipIcon} />
                            {area.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {copy.usedIn ? (
                  <section className={styles.slab} aria-label={copy.usedIn.label}>
                    <p className={styles.slabLabel}>{copy.usedIn.label}</p>
                    <ul className={styles.links}>
                      {copy.usedIn.items.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className={styles.link}>
                            <span className={styles.linkName}>{item.name}</span>
                            <span className={styles.linkBody}>{item.body}</span>
                            <span className={styles.linkGo} aria-hidden="true">
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {copy.research ? (
                  <section className={styles.slab} aria-label={copy.research.label}>
                    <p className={styles.slabLabel}>{copy.research.label}</p>
                    <Link href={copy.research.href} className={styles.link}>
                      <span className={styles.linkName}>{copy.research.body}</span>
                      <span className={styles.linkBody}>{copy.research.action}</span>
                      <span className={styles.linkGo} aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </section>
                ) : null}
              </div>
            </div>

            {/* The product, on a copper-lit plinth. */}
            <div className={styles.specimen}>
              <div className={styles.object}>
                <SpecimenPlate
                  areaId={null}
                  world="ghk-cu"
                  name={copy.product.name}
                  annotation={copy.product.range ?? undefined}
                  size="stage"
                  bare
                />
              </div>
            </div>
          </div>

          <MomentCommerce {...copy.product} showName={false} />
        </Container>
      </div>
    </Section>
  );
}
