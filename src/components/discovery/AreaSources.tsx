import Link from "next/link";

import { CitationRail, type CitationRailCopy } from "@/components/research/CitationRail";
import { Mono } from "@/components/typography";

import styles from "./AreaSources.module.css";

import type { PublicAreaOverview } from "@/content/areas";
import type { Reference } from "@/content/references";

/**
 * THE AREA'S SOURCED SECTIONS — context and research.
 *
 * Both render only from records that passed the Phase 11 content rules, and
 * both are omitted by the page when those records do not exist. Neither has an
 * empty state: an area with no approved context shows no context heading, and
 * an area whose compounds cite nothing shows no research heading. There is no
 * "0 references", no "research coming soon".
 */

export interface AreaContextCopy {
  themes: string;
  pathways: string;
}

/**
 * AREA CONTEXT — sourced statements beside the citations they rest on.
 *
 * The left column is the area's publishable statements, grouped as themes and
 * pathways, each ending in the numbers of its references; the right column is
 * the citation rail those numbers point into. The same composition the product
 * overview uses, so a reader learns one way to read a sourced sentence.
 */
export function AreaContext({
  overview,
  copy,
  citations,
}: {
  overview: PublicAreaOverview;
  copy: AreaContextCopy;
  citations: CitationRailCopy;
}) {
  const references = uniqueReferences([
    ...overview.themes.flatMap((s) => s.references),
    ...overview.pathways.flatMap((s) => s.references),
    ...overview.keyReferences,
  ]);
  const number = (id: string) =>
    String(references.findIndex((r) => r.id === id) + 1).padStart(2, "0");

  return (
    <div className={styles.split}>
      <div className={styles.statements}>
        {overview.summary ? <p className={styles.summary}>{overview.summary}</p> : null}
        {(
          [
            [copy.themes, overview.themes],
            [copy.pathways, overview.pathways],
          ] as const
        ).map(([heading, statements]) =>
          statements.length > 0 ? (
            <div key={heading} className={styles.group}>
              <Mono size="2xs" className={styles.groupLabel}>
                {heading}
              </Mono>
              {statements.map((statement) => (
                <p key={statement.id} className={styles.statement}>
                  {statement.text}{" "}
                  <Mono size="2xs" className={styles.cite}>
                    [{statement.references.map((r) => number(r.id)).join(", ")}]
                  </Mono>
                </p>
              ))}
            </div>
          ) : null,
        )}
      </div>
      <div className={styles.rail}>
        <CitationRail references={references} copy={citations} />
      </div>
    </div>
  );
}

export interface AreaResearchCopy {
  references: string;
  citingCompounds: string;
}

/**
 * RESEARCH CONNECTION — how much of the literature this area touches.
 *
 * Two figures that are counts of things that exist — public references, and
 * the area's compounds whose overviews cite them — then the compounds as links
 * and the references as a rail. A compound appears here only if its own public
 * overview cites one of these references; being filed in the area is not
 * enough.
 */
export function AreaResearch({
  references,
  compounds,
  copy,
  citations,
}: {
  references: readonly Reference[];
  compounds: readonly { slug: string; name: string; href: string }[];
  copy: AreaResearchCopy;
  citations: CitationRailCopy;
}) {
  return (
    <div className={styles.split}>
      <div className={styles.statements}>
        <dl className={styles.figures}>
          <div className={styles.figure}>
            <Mono as="dt" size="2xs" className={styles.groupLabel}>
              {copy.references}
            </Mono>
            <dd className={styles.figureValue}>{String(references.length).padStart(2, "0")}</dd>
          </div>
          {compounds.length > 0 ? (
            <div className={styles.figure}>
              <Mono as="dt" size="2xs" className={styles.groupLabel}>
                {copy.citingCompounds}
              </Mono>
              <dd className={styles.figureValue}>{String(compounds.length).padStart(2, "0")}</dd>
            </div>
          ) : null}
        </dl>
        {compounds.length > 0 ? (
          <ul className={styles.compounds}>
            {compounds.map((compound) => (
              <li key={compound.slug}>
                <Link href={compound.href} className={styles.compound}>
                  {compound.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className={styles.rail}>
        <CitationRail references={references} copy={citations} />
      </div>
    </div>
  );
}

function uniqueReferences(list: readonly Reference[]): Reference[] {
  const seen = new Set<string>();
  return list.filter((ref) => {
    if (seen.has(ref.id)) return false;
    seen.add(ref.id);
    return true;
  });
}
