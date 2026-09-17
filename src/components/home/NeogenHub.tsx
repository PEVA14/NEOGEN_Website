"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AtlasMark } from "@/components/atlas/AtlasMark";
import { Container, Section } from "@/components/primitives";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";

import { HubMark } from "./HubMark";
import styles from "./NeogenHub.module.css";

import type { HubData, HubId, HubItem } from "@/server/hub";

export interface NeogenHubCopy {
  /** Section numeral — the hub is the spine's 01. */
  index: string;
  label: string;
  title: string;
  lede: string;
  /** Mono counters under the title. `{n}` is filled from the registry. */
  counts: {
    products: string;
    presentations: string;
    areas: string;
    worlds: string;
  };
  /** One row per destination. */
  rows: Record<HubId, { name: string; descriptor: string; action: string }>;
  /** Mono label over the preview panel. */
  previewLabel: string;
  /** Links inside the research preview. */
  research: { index: string; areas: string; model: string };
  /** The evidence rule, as it is stated everywhere else on the site. */
  quality: { points: readonly string[]; explorer: string };
  /** Visually hidden instruction for the keyboard. */
  keys: string;
  /** The Atlas band between the head and the board. */
  atlas: { label: string; title: string; body: string; action: string };
}

const ORDER: readonly HubId[] = ["catalog", "areas", "worlds", "research", "quality"];

/**
 * THE HUB — the index of everything NEOGEN has, directly under the hero.
 *
 * It is a switchboard, not a grid of navigation cards: five destinations in a
 * column, and one preview panel that answers whichever destination the reader
 * is on. Hovering or focusing a row swaps the panel; the row itself is the
 * link, so the gateway costs one click and one tab stop per destination.
 *
 * IT STAYS ON THE HERO'S GROUND. The same charcoal, the same hairline column
 * grid, the same token remap the hero uses — so the page opens as one dark
 * composition and then resolves into paper at section 02. The hero is
 * atmospheric (an object, lit); the hub is an instrument (rules, figures,
 * plates). The contrast is material, not brightness.
 *
 * EVERYTHING IT SHOWS IS COUNTED, NOT WRITTEN. The figures, the areas, the
 * prices and the plates come from `server/hub`; a destination that cannot
 * render — the documentation explorer, until a public document exists — is
 * simply absent rather than linked.
 *
 * MOBILE IS NOT THIS LAYOUT COLLAPSED. There is no hover to drive a preview,
 * so each destination becomes its own block with its preview already open:
 * the same index, read top to bottom.
 */
export function NeogenHub({ data, copy }: { data: HubData; copy: NeogenHubCopy }) {
  const [active, setActive] = useState<HubId>("catalog");

  const hrefFor: Record<HubId, string> = {
    catalog: data.links.catalog,
    areas: data.links.areas,
    worlds: data.links.catalog,
    research: data.links.research,
    quality: data.links.researchQuality,
  };
  const figureFor: Record<HubId, string | null> = {
    catalog: String(data.counts.products),
    areas: String(data.counts.areas).padStart(2, "0"),
    worlds: String(data.counts.worlds).padStart(2, "0"),
    research: null,
    quality: null,
  };

  const counters = [
    [data.counts.products, copy.counts.products],
    [data.counts.presentations, copy.counts.presentations],
    [data.counts.areas, copy.counts.areas],
    [data.counts.worlds, copy.counts.worlds],
  ] as const;

  return (
    /* The section paints the ground, so the dark runs edge to edge under the
       hero rather than stopping at the container's gutters. */
    <Section mode="quiet" surface="dark" aria-labelledby="hub-title" className={styles.section}>
      <Container width="full">
        <div className={styles.hub}>
          {/* The hero's four hairlines, continued — the register the page is built on. */}
          <div className={styles.rules} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <header className={styles.head}>
            <p className={styles.label}>
              {copy.index} / {copy.label}
            </p>
            <h2 className={styles.title} id="hub-title">
              {copy.title}
            </h2>
            <p className={styles.lede}>{copy.lede}</p>
            <ul className={styles.counters}>
              {counters.map(([value, label]) => (
                <li key={label}>
                  <span className={styles.counterValue}>{String(value).padStart(2, "0")}</span>
                  <span className={styles.counterLabel}>{label}</span>
                </li>
              ))}
            </ul>
          </header>

          {/*
           * ATLAS — the one destination that is a tool rather than a place, so
           * it is not a sixth row: it spans the board as its own band, the
           * first thing under the counters. Its mark is the only one drawn at
           * rest; hovering traces the links in.
           */}
          <Link href={data.links.atlas} className={styles.atlas}>
            <span className={styles.atlasMark}>
              <AtlasMark />
            </span>
            <span className={styles.atlasText}>
              <span className={styles.atlasLabel}>
                NEOGEN Atlas <span className={styles.atlasBadge}>{copy.atlas.label}</span>
              </span>
              <span className={styles.atlasTitle}>{copy.atlas.title}</span>
              <span className={styles.atlasBody}>{copy.atlas.body}</span>
            </span>
            <span className={styles.atlasSteps} aria-hidden="true">
              {data.atlasSteps.map((step, index) => (
                <span key={step} className={styles.atlasStep}>
                  <span className={styles.atlasStepIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </span>
              ))}
            </span>
            <span className={styles.atlasAction}>
              {copy.atlas.action} <span aria-hidden="true">→</span>
            </span>
          </Link>

          <div className={styles.board}>
            <p className={styles.srOnly} id="hub-keys">
              {copy.keys}
            </p>
            <ul className={styles.rows} aria-describedby="hub-keys">
              {ORDER.map((id, index) => (
                <li key={id} className={styles.row} data-active={active === id ? "" : undefined}>
                  <Link
                    href={hrefFor[id]}
                    className={styles.rowLink}
                    onPointerEnter={() => setActive(id)}
                    onFocus={() => setActive(id)}
                  >
                    <span className={styles.rowIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.rowName}>{copy.rows[id].name}</span>
                    {figureFor[id] ? (
                      <span className={styles.rowFigure}>{figureFor[id]}</span>
                    ) : null}
                    <span className={styles.rowDescriptor}>{copy.rows[id].descriptor}</span>
                    <span className={styles.rowAction} aria-hidden="true">
                      {copy.rows[id].action} →
                    </span>

                    {/* Last child on purpose: the mark is absolutely
                        positioned, so it takes no grid cell and cannot push
                        the index out of its column. */}
                    <HubMark id={id} />
                  </Link>

                  {/* On a phone every destination carries its own preview, open. */}
                  <div className={styles.inline}>
                    <Preview id={id} data={data} copy={copy} />
                  </div>
                </li>
              ))}
            </ul>

            {/*
             * The panel is the wide screen's real preview — its plates and area
             * links are meant to be clicked and reached by keyboard. Exactly one
             * copy of a preview is ever in the tree: the inline previews below
             * are `display: none` at this width, and this panel is
             * `display: none` below it. (It was briefly `aria-hidden` with
             * focusable links inside — axe `aria-hidden-focus`, correctly.)
             */}
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p className={styles.panelLabel}>
                  {copy.previewLabel} / {copy.rows[active].name}
                </p>
                {/* The strip stays tight: the active destination's line reads here. */}
                <p className={styles.panelDescriptor}>{copy.rows[active].descriptor}</p>
              </div>
              {/* Keyed, so the panel re-enters when the destination changes. */}
              <div key={active} className={styles.panelBody}>
                <Preview id={active} data={data} copy={copy} />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function Preview({ id, data, copy }: { id: HubId; data: HubData; copy: NeogenHubCopy }) {
  switch (id) {
    case "catalog":
      return <Plates items={data.catalogItems} />;
    case "worlds":
      return <Plates items={data.worldItems} />;
    case "areas":
      return (
        <ul className={styles.areas}>
          {data.areaItems.map((area) => (
            <li key={area.label} data-area={area.areaId ?? undefined}>
              <Link href={area.href ?? "#"} className={styles.areaLink}>
                <span className={styles.areaSwatch} aria-hidden="true" />
                <span className={styles.areaName}>{area.label}</span>
                <span className={styles.areaCount}>{area.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "research":
      return (
        <ul className={styles.list}>
          {[
            { label: copy.research.index, href: data.links.researchIndex },
            { label: copy.research.areas, href: data.links.research },
            { label: copy.research.model, href: data.links.researchQuality },
          ].map((entry) => (
            <li key={entry.label}>
              <Link href={entry.href} className={styles.listLink}>
                {entry.label}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "quality":
      return (
        <div className={styles.rule}>
          <ol className={styles.rulePoints}>
            {copy.quality.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
          {/* Only when the explorer is a page: it 404s until a document exists. */}
          {data.links.explorer ? (
            <Link href={data.links.explorer} className={styles.listLink}>
              {copy.quality.explorer}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      );
  }
}

/** Real specimen plates — the catalogue's own identity, at index scale. */
function Plates({ items }: { items: readonly HubItem[] }): ReactNode {
  return (
    <ul className={styles.plates}>
      {items.map((item) => (
        <li key={item.slug ?? item.label}>
          <Link href={item.href ?? "#"} className={styles.plateLink}>
            <span className={styles.plate}>
              <SpecimenPlate
                areaId={item.areaId}
                world={item.world}
                name={item.label}
                presentations={1}
                size="card"
              />
            </span>
            <span className={styles.plateName}>{item.label}</span>
            {item.meta ? <span className={styles.plateMeta}>{item.meta}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
