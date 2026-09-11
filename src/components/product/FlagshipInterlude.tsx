import { Container, Section } from "@/components/primitives";
import { Display, Mono } from "@/components/typography";

import styles from "./FlagshipInterlude.module.css";

import type { WorldId } from "@/config/worlds";

/**
 * THE FLAGSHIP INTERLUDE — one Experience beat inside the Quiet spine.
 *
 * The Design Bible's rhythm is Quiet → Impact → Quiet → Impact. A flagship
 * product page used to open in its world and then stay on paper for the rest
 * of the page, so RETA, GLOW and GHK-Cu diverged for one screen and were
 * identical below it. This beat returns to the world once, between trust and
 * reference material, so the page keeps its character all the way down.
 *
 * CONTENT RULE. The statement is the world's art-direction line ("the
 * environment becomes light") — brand language about the ENVIRONMENT, never a
 * claim about the compound. The facts beside it are catalogue facts. No new
 * sentence about the product is introduced here.
 *
 * Compact on purpose: no full-viewport height, no scroll track, no motion. It
 * is a change of material, not a cinematic sequence.
 */
export function FlagshipInterlude({
  world,
  eyebrow,
  statement,
  facts,
  titleId,
}: {
  world: WorldId;
  eyebrow: string;
  statement: string;
  facts: readonly { key: string; value: string }[];
  titleId: string;
}) {
  return (
    <Section
      mode="impact"
      world={world}
      atmosphere
      aria-labelledby={titleId}
      className={styles.section}
    >
      <Container width="full">
        <div className={styles.layout} data-world-layout={world}>
          <div className={styles.statementBlock}>
            <Mono size="2xs" className={styles.eyebrow}>
              {eyebrow}
            </Mono>
            <Display id={titleId} as="h2" size="5xl" className={styles.statement}>
              {statement}
            </Display>
          </div>
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.key} className={styles.fact}>
                <Mono as="dt" size="2xs" className={styles.factKey}>
                  {fact.key}
                </Mono>
                <dd className={styles.factValue}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}
