import { Mono } from "@/components/typography";

import styles from "./AreaComposition.module.css";

import type { AreaComposition as Composition } from "@/domain/discovery/composition";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface AreaCompositionCopy {
  compounds: string;
  presentations: string;
  forms: string;
  flagships: string;
  shared: string;
  sellable: string;
}

/**
 * WHAT THE AREA HOLDS — six counted figures, and nothing else.
 *
 * This section exists because the page went straight from "what this area is
 * about" to a list of compounds, and never said what the area IS as a holding.
 * A reader deciding whether to spend time here wants scale and shape: how many
 * compounds, across how many presentations and dosing forms, how much of it
 * overlaps other departments, how much of it can actually be bought today.
 *
 * NOTHING HERE IS WRITTEN — every figure is counted at build time by
 * `areaComposition`. There is deliberately no purity figure, no certificate
 * count, no mechanism and no pathway: those are claims about regulated
 * products, and NEOGEN states them only from approved sources, in the area
 * context section, which stays absent until such sources exist.
 *
 * A zero is shown, not hidden. An area with no flagship and no overlap is a
 * real shape, and printing "00" says so more honestly than dropping the row.
 */
export function AreaComposition({
  composition,
  areaId,
  copy,
}: {
  composition: Composition;
  areaId: DiscoveryAreaId;
  copy: AreaCompositionCopy;
}) {
  const figures: { key: keyof AreaCompositionCopy; value: number }[] = [
    { key: "compounds", value: composition.compounds },
    { key: "presentations", value: composition.presentations },
    { key: "forms", value: composition.forms },
    { key: "flagships", value: composition.flagships },
    { key: "shared", value: composition.shared },
    { key: "sellable", value: composition.sellable },
  ];

  return (
    <dl className={styles.grid} data-area={areaId}>
      {figures.map((figure) => (
        <div key={figure.key} className={styles.cell}>
          <dt className={styles.label}>
            <Mono size="2xs">{copy[figure.key]}</Mono>
          </dt>
          <dd className={styles.value}>{String(figure.value).padStart(2, "0")}</dd>
        </div>
      ))}
    </dl>
  );
}
