import { Container, Section } from "@/components/primitives";
import { Body, Display, Mono } from "@/components/typography";
import { getWorld } from "@/config/worlds";

import styles from "./GlowMoment.module.css";

export interface WorldMomentCopy {
  eyebrow: string;
  statement: string;
  body: string;
  annotations: { key: string; value: string }[];
  /** Names what the media slot will hold once a real asset exists. */
  mediaLabel: string;
}

/**
 * GLOW — "the environment becomes light."
 *
 * DELIBERATELY NOT A SECOND RETA. RETA's subject is an object, so it earns a
 * scroll-driven WebGL sequence. GLOW's subject is LIGHT ITSELF, so the
 * mechanism here is an environmental luminance transition: the section arrives
 * dark, light grows through it as you scroll, and the typography is revealed by
 * that light rather than sitting beside a product.
 *
 * This needs no 3D asset at all — which is also why it is honest. There is no
 * GLOW GLB and no GLOW photography, and inventing either would be fabricating
 * product imagery. The light is the subject; the vial is not required for the
 * section to work.
 *
 * TODO(assets): when a GLOW GLB exists it drops into `.mediaSlot` as a third
 * layer. Nothing in this layout has to move for that to happen.
 *
 * Motion is CSS-only via a view() timeline, so the resolved state is the
 * default and reduced motion simply gets the fully-lit composition.
 */
export function GlowMoment({ copy }: { copy: WorldMomentCopy }) {
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
        {/* The light. Grows and intensifies with scroll; this is the subject.
            Wrapped in a centring layer because both bodies are deliberately
            wider than the viewport, and an over-constrained absolute box
            resolves to one side instead of staying centred. */}
        <div className={styles.lights} aria-hidden="true">
          <div className={styles.bloom} data-motion="cinematic" />
          <div className={styles.halo} data-motion="cinematic" />
        </div>

        <Container width="full" className={styles.content}>
          <div className={styles.head}>
            <Mono size="2xs" className={styles.eyebrow}>
              {copy.eyebrow}
            </Mono>
            <Mono size="2xs" className={styles.mediaSlot}>
              {copy.mediaLabel}
            </Mono>
          </div>

          <div className={styles.centre}>
            <Display id="glow-title" as="h2" size="5xl" className={styles.statement}>
              {copy.statement}
            </Display>
            <Body size="lg" className={styles.body}>
              {copy.body}
            </Body>
          </div>

          <dl className={styles.annotations}>
            {copy.annotations.map((item) => (
              <div key={item.key} className={styles.annotation}>
                <Mono as="dt" size="2xs" className={styles.annotationKey}>
                  {item.key}
                </Mono>
                <Mono as="dd" size="xs" className={styles.annotationValue}>
                  {item.value}
                </Mono>
              </div>
            ))}
          </dl>
        </Container>
      </div>
    </Section>
  );
}
