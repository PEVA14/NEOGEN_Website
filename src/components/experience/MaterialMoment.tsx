import { Container, Section } from "@/components/primitives";
import { Body, Display, Mono } from "@/components/typography";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { getWorld } from "@/config/worlds";

import { MomentCommerce } from "./MomentCommerce";

import type { WorldMomentCopy } from "./GlowMoment";
import styles from "./MaterialMoment.module.css";

/**
 * GHK-Cu — "the environment becomes material."
 *
 * A THIRD MECHANISM, not a third variation. RETA choreographs an object; GLOW
 * grows light; this section is about SURFACE — weight, texture, physical depth.
 *
 * So the composition itself is the material: horizontal strata that separate at
 * different rates as you scroll, a denser grid, heavier type, and an oxidised
 * copper surface built from layered gradients rather than imagery. Depth comes
 * from parallax between the bands, which is a spatial relationship — the one
 * thing the motion rules say movement is allowed to communicate.
 *
 * No product render is invented here. There is no GHK-Cu GLB and no GHK-Cu
 * photography; the section works because its subject is the material, not the
 * vial.
 *
 * TODO(assets): a GHK-Cu GLB drops into `.specimen` as a foreground layer
 * without disturbing the strata behind it.
 */
export function MaterialMoment({ copy }: { copy: WorldMomentCopy }) {
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
          <Mono size="2xs" className={styles.eyebrow}>
            {copy.eyebrow}
          </Mono>

          <div className={styles.layout}>
            <div className={styles.statementBlock}>
              <Display id="ghk-cu-title" as="h2" size="5xl" className={styles.statement}>
                {copy.statement}
              </Display>
              <Body size="lg" className={styles.body}>
                {copy.body}
              </Body>
            </div>

            {/*
             * The product, on a copper-lit plinth. It replaces the abstract
             * "core sample" that stood in for a missing asset: the object is
             * GHK-Cu's own vial, with its copper cap and collar, and the
             * material is the light it stands in.
             */}
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

          <MomentCommerce {...copy.product} />
        </Container>
      </div>
    </Section>
  );
}
