import { Container, Section } from "@/components/primitives";
import { Body, Display, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui/TextLink";
import { getWorld } from "@/config/worlds";
import { mediaForWorld } from "@/content";

import { HeroStage } from "./HeroStage";
import styles from "./Hero.module.css";

export interface HeroCopy {
  eyebrow: string;
  title: string;
  lede: string;
  cta: string;
  ctaHref: string;
  scrollCue: string;
  /** Verifiable facts only — no promises, no claims. */
  meta: readonly string[];
  vialAlt: string;
  loadingLabel: string;
  staticLabel: string;
}

/**
 * HERO — Experience Mode, brand-first.
 *
 * Dark and full-viewport, but NOT a RETA product hero: the section carries no
 * `data-world`, the wordmark is NEOGEN, and the copy is about the system rather
 * than the compound. RETA appears as the system's first manifestation.
 *
 * The composition is deliberately not "copy left, product right". The wordmark
 * runs across the full width BEHIND the canvas, and the vial — oversized,
 * tilted, cropped by the frame — passes in front of it. That overlap is the
 * whole idea: the product occupies the same space as the typography instead of
 * sitting in a column beside it.
 */
export function Hero({ copy }: { copy: HeroCopy }) {
  const world = getWorld("reta");
  /* The object is the RETA product's asset, resolved through the media layer.
     The world supplies the lighting rig; it no longer owns the file. */
  const media = mediaForWorld("reta");

  return (
    <Section
      mode="impact"
      surface="dark"
      padded={false}
      aria-labelledby="hero-title"
      className={styles.section}
    >
      <div className={styles.viewport}>
        {/*
         * Layer 0 — the structure. Four hairlines on the column positions, so
         * the poster has a visible grid for the product to cross. This is the
         * laboratory register the composition is built on, not decoration:
         * without it the wordmark and vial float in undefined space.
         */}
        <div className={styles.grid} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        {/*
         * Layer 1 — the wordmark, behind the canvas. Oversized and cropped by
         * BOTH edges: it is a graphic element, not a heading to be read left to
         * right, and letting it run off the frame is what makes the viewport
         * read as a crop of something larger.
         */}
        <div className={styles.wordmarkLayer} aria-hidden="true">
          <span className={styles.wordmark}>{copy.title}</span>
        </div>

        {/* Layer 2 — the product, overlapping the wordmark. */}
        <HeroStage
          modelPath={media.model}
          environment={world.environment}
          poster={media.poster}
          posterAlt={copy.vialAlt}
          loadingLabel={copy.loadingLabel}
          staticLabel={copy.staticLabel}
        />

        {/* Layer 3 — the readable copy, above everything. */}
        <Container width="full" className={styles.copyLayer}>
          <div className={styles.opening}>
            <Mono size="2xs" className={styles.eyebrow}>
              {copy.eyebrow}
            </Mono>
            {/* The accessible heading. Visually hidden text would duplicate the
                wordmark, so the h1 IS the wordmark's text, placed here for
                document order and marked up properly. */}
            <Display id="hero-title" as="h1" size="6xl" className={styles.srTitle}>
              {copy.title}
            </Display>
          </div>

          <div className={styles.statement}>
            <Body size="lg" className={styles.lede}>
              {copy.lede}
            </Body>
            <TextLink href={copy.ctaHref}>{copy.cta}</TextLink>
          </div>

          <div className={styles.foot}>
            <div className={styles.meta}>
              {copy.meta.map((item) => (
                <Mono key={item} size="2xs" className={styles.metaItem}>
                  {item}
                </Mono>
              ))}
            </div>

            <div className={styles.scrollCue}>
              <span className={styles.scrollCueLine} data-motion="decorative" aria-hidden="true" />
              <Mono size="2xs" className={styles.metaItem}>
                {copy.scrollCue}
              </Mono>
            </div>
          </div>
        </Container>
      </div>
    </Section>
  );
}
