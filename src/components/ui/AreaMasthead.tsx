import { Container } from "@/components/primitives";
import { Mono } from "@/components/typography";

import styles from "./AreaMasthead.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface AreaFact {
  key: string;
  value: string;
  /** `text` sets the value in mono at reading size, for lists of names. */
  kind?: "figure" | "text";
}

/**
 * AN AREA'S MASTHEAD — the department's front door.
 *
 * PHASE 12. An area page opened with the same `SectionHeader` every Quiet
 * section on the site uses, so eight departments arrived looking like eight
 * subsections of one page. An area is a place a customer chose to enter; it
 * should look like arriving somewhere.
 *
 * IT IS THE AREA'S OWN MATERIAL. The ground is `--area-deep` — the inverted
 * register added in Phase 12 — so metabolic arrives cold and blue, recovery
 * warm, longevity mineral. The tone is the only thing that changes between
 * the eight; the composition is one composition, which is what keeps them a
 * system rather than eight designs.
 *
 * EVERY FACT IS FROM THE REGISTRY: how many compounds are filed here, the
 * cheapest way in, and which compounds a reader will recognise. Nothing is
 * asserted about what the area's compounds do — that framing stays in the
 * research line, which is the careful sentence the dictionary already holds.
 */
export function AreaMasthead({
  areaId,
  index,
  eyebrow,
  short,
  framing,
  body,
  facts,
  titleId,
}: {
  areaId: DiscoveryAreaId;
  index: string;
  eyebrow: string;
  /** The commercial name, set large — "Metabolismo". */
  short: string;
  /** The research framing, in mono beneath it. */
  framing: string;
  body: string;
  facts: readonly AreaFact[];
  titleId: string;
}) {
  return (
    <header className={styles.masthead} data-area={areaId}>
      <div className={styles.ground} aria-hidden="true" />
      <div className={styles.register} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <Container width="full" className={styles.inner}>
        <Mono size="2xs" className={styles.eyebrow}>
          {index} — {eyebrow}
        </Mono>

        <h1 id={titleId} className={styles.name}>
          {short}
        </h1>

        <Mono size="2xs" className={styles.framing}>
          {framing}
        </Mono>

        <p className={styles.body}>{body}</p>

        {facts.length > 0 ? (
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.key} className={styles.fact}>
                <Mono as="dt" size="2xs" className={styles.factKey}>
                  {fact.key}
                </Mono>
                <dd className={styles.factValue} data-kind={fact.kind ?? "figure"}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Container>
    </header>
  );
}
