import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/primitives";
import { SpecimenPlate } from "@/components/ui";
import { specimenFor } from "@/components/vial-transition/specimens";

import { WorldResponse } from "./WorldResponse";

import styles from "./WorldBand.module.css";

import type { WorldId } from "@/config/worlds";
import type { ProductImage } from "@/content/media";

export interface WorldPanel {
  world: WorldId;
  /** The world's brand name — "RETA". */
  brand: string;
  /** "Precisión". */
  worldLabel: string;
  tagline: string;
  name: string;
  href: string;
  range: string;
  price: string | null;
  /** A studio still of the product's model, when one exists. */
  image: ProductImage | null;
}

/**
 * THREE WORLDS — the flagships as the page's first product interruption.
 *
 * The neutral store gives way to the three product environments: each panel
 * is its world's own void and light, the product object standing in it, the
 * world's name at poster scale, and the commerce — range, entry price, one
 * action — on the panel's foot. A panel is one link: the whole world opens
 * onto its product page.
 *
 * The media is what exists and nothing more. RETA stands as its approved
 * studio still; a world without one stands as the drawn product object on its
 * own world stage. The panel's ground is the world palette either way, so the
 * three read as one set.
 *
 * On a phone the panels become a swiped row: three tall worlds stacked were a
 * screen and a half each of scroll before the store began.
 */
export function WorldBand({
  copy,
  panels,
}: {
  copy: {
    index: string;
    label: string;
    title: string;
    lede: string;
    action: string;
    actionHref: string;
    from: string;
  };
  panels: readonly WorldPanel[];
}) {
  if (panels.length === 0) return null;
  return (
    <section className={styles.band} data-surface="dark" aria-labelledby="worlds-title">
      <Container width="full">
        <header className={styles.head}>
          <p className={styles.index}>
            {copy.index} <span>/ {copy.label}</span>
          </p>
          <h2 id="worlds-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.lede}>{copy.lede}</p>
          <Link href={copy.actionHref} className={styles.action}>
            {copy.action} <span aria-hidden="true">→</span>
          </Link>
        </header>

        <WorldResponse>
          <ul className={styles.panels} data-world-shelf="">
            {panels.map((panel) => {
              /* The studio still split into set and object, when one exists. */
              const sp = specimenFor(panel.world);
              return (
                <li key={panel.world} className={styles.item}>
                  <Link
                    href={panel.href}
                    className={styles.panel}
                    data-world={panel.world}
                    data-world-panel=""
                  >
                    <span className={styles.media} aria-hidden="true">
                      {sp ? (
                        /* The studio still in its two layers — set and object —
                       so each world can act on its object alone. */
                        <span className={styles.frame}>
                          <Image
                            src={sp.ground}
                            alt=""
                            fill
                            sizes="(min-width: 64rem) 24rem, 70vw"
                            loading="eager"
                            className={styles.ground}
                          />
                          <span className={styles.dim} />
                          <span className={styles.behind} />
                          <span className={styles.sheen} />
                          <span className={styles.shadow} />
                          <span
                            className={styles.specimen}
                            style={{
                              left: `${sp.box.x * 100}%`,
                              top: `${sp.box.y * 100}%`,
                              width: `${sp.box.w * 100}%`,
                              height: `${sp.box.h * 100}%`,
                            }}
                          >
                            <Image
                              src={sp.specimen}
                              alt=""
                              fill
                              sizes="(min-width: 64rem) 10rem, 30vw"
                              loading="eager"
                              className={styles.cutout}
                            />
                          </span>
                          {/* RETA's calibration: brackets that close on the object. */}
                          <span
                            className={styles.calib}
                            style={{
                              ["--ox" as string]: sp.object.x,
                              ["--oy" as string]: sp.object.y,
                              ["--ow" as string]: sp.object.w,
                              ["--oh" as string]: sp.object.h,
                            }}
                          >
                            <span data-c="tl" />
                            <span data-c="tr" />
                            <span data-c="bl" />
                            <span data-c="br" />
                            <span className={styles.scan} />
                          </span>
                        </span>
                      ) : panel.image ? (
                        <Image
                          src={panel.image.src}
                          alt=""
                          width={panel.image.width}
                          height={panel.image.height}
                          sizes="(min-width: 64rem) 30rem, 84vw"
                          className={styles.still}
                        />
                      ) : (
                        <span className={styles.object}>
                          <SpecimenPlate
                            areaId={null}
                            world={panel.world}
                            name={panel.name}
                            annotation={panel.range}
                            size="stage"
                            bare
                          />
                        </span>
                      )}
                    </span>

                    <span className={styles.top}>
                      <span className={styles.worldLabel}>{panel.worldLabel}</span>
                      <span className={styles.brand}>{panel.brand}</span>
                      <span className={styles.tagline}>{panel.tagline}</span>
                    </span>

                    <span className={styles.foot}>
                      <span className={styles.name}>{panel.name}</span>
                      <span className={styles.range}>{panel.range}</span>
                      {panel.price ? (
                        <span className={styles.price}>
                          <span className={styles.from}>{copy.from} </span>
                          {panel.price}
                        </span>
                      ) : null}
                      <span className={styles.go} aria-hidden="true">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </WorldResponse>
      </Container>
    </section>
  );
}
