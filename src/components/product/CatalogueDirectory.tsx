import Link from "next/link";

import { DirectoryLens } from "@/components/home/DirectoryLens";
import { AreaIcon } from "@/components/ui/AreaIcon";
import { SPECIMEN_NAVIGATION } from "@/components/vial-transition/PageTransition";

import styles from "./CatalogueDirectory.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface DirectoryEntry {
  slug: string;
  name: string;
  /** "5 mg – 30 mg". */
  range: string;
  /** Lowest presentation price, formatted; null where none is set. */
  price: string | null;
  href: string;
  world: WorldId | null;
  /** Its first catalogue area: the lens's plate takes that area's ground. */
  area: DiscoveryAreaId | null;
  /** The product this page is about: marked in its place, not linked. */
  current: boolean;
}

export interface DirectoryGroup {
  id: string;
  /** The catalogue area the group is; null for the category fallback. */
  area: DiscoveryAreaId | null;
  name: string;
  href: string;
  entries: readonly DirectoryEntry[];
}

export interface CatalogueDirectoryCopy {
  /** "este compuesto". */
  current: string;
  /** "{n} productos", for the count's accessible name. */
  count: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * THE SPECIMEN IN ITS PLACE — where this product sits in the catalogue.
 *
 * What the related products are, said as what they are: the other products
 * filed in the same catalogue area, A to Z, with this one marked where it
 * falls — not three picks dressed as recommendations. An area groups what is
 * studied in the same context; the section's lede says plainly that sharing
 * one implies no similar effect, combination or substitute. The laboratory
 * materials follow as their own group, listed, never paired with a procedure.
 *
 * It is the homepage directory's register (`ClosingShelf`) at the scale of one
 * area, with the same lens: pointing at a name raises its vial beside the
 * column, and choosing it sends that vial on to its page — the catalogue's
 * specimen flight (`DirectoryLens` `travel`). On a phone the names are a
 * plain, tall-rowed list; the product page they open sets its vial down on
 * its own bench, as it does from any link.
 */
export function CatalogueDirectory({
  groups,
  copy,
}: {
  groups: readonly DirectoryGroup[];
  copy: CatalogueDirectoryCopy;
}) {
  return (
    <DirectoryLens className={styles.directory} travel>
      {groups.map((group) => (
        <section
          key={group.id}
          className={styles.group}
          data-area={group.area ?? undefined}
          data-long={group.entries.length > 8 ? "true" : undefined}
          data-lens-column=""
          aria-labelledby={`directory-${group.id}`}
        >
          <h3 id={`directory-${group.id}`} className={styles.head}>
            <Link prefetch={false} href={group.href} className={styles.headLink}>
              {group.area ? <AreaIcon id={group.area} className={styles.icon} /> : null}
              <span className={styles.name}>{group.name}</span>
              <span className={styles.count}>
                <span aria-hidden="true">{pad(group.entries.length)}</span>
                <span className={styles.srOnly}>
                  {copy.count.replace("{n}", String(group.entries.length))}
                </span>
              </span>
            </Link>
          </h3>
          <ul className={styles.entries}>
            {group.entries.map((entry) => (
              <li key={entry.slug} className={styles.entry}>
                {entry.current ? (
                  <span className={styles.row} data-current="" aria-current="page">
                    <span className={styles.entryName}>
                      <span className={styles.here} aria-hidden="true" />
                      {entry.name}
                    </span>
                    <span className={styles.entryMeta}>{copy.current}</span>
                  </span>
                ) : (
                  <Link
                    prefetch={false}
                    href={entry.href}
                    className={styles.row}
                    {...(entry.area
                      ? {
                          "data-lens-slug": entry.slug,
                          "data-lens-name": entry.name,
                          "data-lens-range": entry.range,
                          "data-lens-area": entry.area,
                          "data-lens-world": entry.world ?? undefined,
                        }
                      : {})}
                    /* A drawn vial can fly from the lens; a flagship's world
                       opens on its own terms. */
                    transitionTypes={entry.world || !entry.area ? undefined : [SPECIMEN_NAVIGATION]}
                  >
                    <span className={styles.entryName}>
                      {entry.world ? (
                        <span
                          className={styles.worldDot}
                          data-world-tint={entry.world}
                          aria-hidden="true"
                        />
                      ) : null}
                      {entry.name}
                    </span>
                    {entry.price ? <span className={styles.entryMeta}>{entry.price}</span> : null}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </DirectoryLens>
  );
}
