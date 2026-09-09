import { Section } from "@/components/primitives";
import { Body, Display, Eyebrow, Mono } from "@/components/typography";
import { getWorld } from "@/config/worlds";
import { mediaForWorld } from "@/content";

import { RetaStage } from "./RetaStage";
import styles from "./RetaExperience.module.css";

export interface RetaBeat {
  eyebrow?: string;
  statement: string;
  body?: string;
  /** Technical annotations. Key/value pairs — never invented product data. */
  annotations?: { key: string; value: string }[];
}

export interface RetaExperienceCopy {
  beats: RetaBeat[];
  vialAlt: string;
  loadingLabel: string;
  staticLabel: string;
  /** Accessible name for the sequence position readout. */
  progressLabel: string;
}

/**
 * RETA Experience — the first product world, as a pinned scroll composition.
 *
 * "The environment becomes precision." The section carries `data-world="reta"`,
 * the only sanctioned scope for a world (CONVENTIONS §3): surfaces, ink,
 * borders and `--accent` flip inside this element and nowhere else.
 *
 * This stays a Server Component — only the stage crosses the client boundary,
 * so every heading, sentence and annotation is in the HTML whether or not any
 * 3D ever loads.
 *
 * `padded={false}` because a pinned full-viewport composition owns its own
 * vertical rhythm; section padding would add dead scroll before the pin.
 */
export function RetaExperience({ copy }: { copy: RetaExperienceCopy }) {
  const world = getWorld("reta");
  const media = mediaForWorld("reta");

  return (
    <Section
      mode="impact"
      world={world.id}
      padded={false}
      id="reta"
      aria-labelledby="reta-title"
      // NOTE: no `overflow-hidden` here. An overflow-clipping ancestor becomes
      // the containing block for `position: sticky` and would break the pin.
    >
      {/*
       * Without JavaScript, `data-beat` is still in the server-rendered HTML,
       * so a `:not([data-beat])` selector could never restore the hidden beats.
       * This releases the pin and lays every beat out in flow instead, so a
       * sighted visitor with JS disabled gets all three — not one of three.
       */}
      <noscript>
        <style>{`
          .${styles.track} { block-size: auto; }
          .${styles.viewport} { position: static; block-size: auto; min-block-size: 100dvh; }
          .${styles.overlay} { display: flex; flex-direction: column; justify-content: center;
                               gap: var(--space-2xl); padding-block: var(--space-4xl); }
          .${styles.beat} { grid-column: auto; grid-row: auto; align-self: auto;
                            opacity: 1; transform: none; pointer-events: auto; }
          .${styles.readout} { display: none; }
        `}</style>
      </noscript>

      <RetaStage
        modelPath={media.model}
        environment={world.environment}
        poster={media.poster}
        posterAlt={copy.vialAlt}
        loadingLabel={copy.loadingLabel}
        staticLabel={copy.staticLabel}
        beatCount={copy.beats.length}
      >
        {copy.beats.map((beat, index) => (
          <div key={beat.statement} className={styles.beat} data-beat-index={index}>
            {beat.eyebrow ? <Eyebrow>{beat.eyebrow}</Eyebrow> : null}

            <Display
              // Only the first beat carries the section's heading identity;
              // the rest are peers, so heading order stays correct.
              as={index === 0 ? "h2" : "p"}
              id={index === 0 ? "reta-title" : undefined}
              size="4xl"
              className={styles.statement}
            >
              {beat.statement}
            </Display>

            {beat.body ? <Body size="lg">{beat.body}</Body> : null}

            {beat.annotations ? (
              <dl className={styles.annotations}>
                {beat.annotations.map((item) => (
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
            ) : null}
          </div>
        ))}

        {/* Position in the sequence. Decorative reinforcement of scroll state —
            the copy itself is never gated behind it. */}
        <div className={styles.readout} aria-hidden="true">
          <Mono size="2xs">{copy.progressLabel}</Mono>
          <span className={styles.readoutTrack}>
            <span className={styles.readoutFill} />
          </span>
        </div>
      </RetaStage>
    </Section>
  );
}
