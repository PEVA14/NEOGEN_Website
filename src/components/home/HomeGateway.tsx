import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/primitives";
import { AreaIcon, SpecimenPlate } from "@/components/ui";

import styles from "./HomeGateway.module.css";

import type { WorldId } from "@/config/worlds";
import type { ProductImage } from "@/content/media";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface GatewayCopy {
  index: string;
  label: string;
  title: string;
  lede: string;
  aside: string;
  products: { name: string; body: string; facts: string; from: string };
  research: {
    name: string;
    body: string;
    profiles: string;
    references: string;
    areas: string;
    latest: string;
  };
  areas: { name: string; body: string; all: string; count: string };
  search: {
    name: string;
    label: string;
    placeholder: string;
    submit: string;
    try: string;
    byStrength: string;
    index: string;
  };
  worlds: { name: string; body: string };
  quality: { name: string; body: string };
}

export interface GatewayData {
  counts: {
    products: number;
    presentations: number;
    areas: number;
    profiles: number;
    references: number;
  };
  lowestPrice: string | null;
  /** The object the products door is shown by: a real studio still, or none. */
  productsImage: ProductImage | null;
  /** When no still exists, the door falls back to the drawn product object. */
  productsFallback: { name: string; range: string; areaId: DiscoveryAreaId | null } | null;
  areas: readonly { id: DiscoveryAreaId; label: string; count: number; href: string }[];
  worlds: readonly {
    world: WorldId;
    label: string;
    name: string;
    range: string;
    href: string;
    price: string | null;
    image: ProductImage | null;
  }[];
  /** Real searches to try: each area's entry compound, straight to its results. */
  suggestions: readonly { label: string; href: string }[];
  /** The catalogue's most common strengths, as searches ("10 mg"). */
  strengths: readonly { label: string; href: string }[];
  recentReferences: readonly { title: string; publication: string | null; year: number | null }[];
  links: {
    catalog: string;
    /** In-page anchor of the area shelf. */
    areas: string;
    research: string;
    explorer: string | null;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/**
 * THE GATEWAY — the store opening up after the brand introduction.
 *
 * Doors into what NEOGEN actually has, sized by what they hold: the catalogue
 * and the research lead as two large doors, then the areas, a live search and
 * the three signature worlds. A sixth door, the documentation explorer,
 * appears only once a public document exists — it 404s until then, so the
 * door is absent rather than broken.
 *
 * NOT A MEGA-MENU. Each door shows the thing it opens onto, in its own
 * register: the catalogue by a real product and its lowest price; the
 * research as a charcoal reading room with its counts and latest citations;
 * the areas as a coloured directory, eight doors of their own; the search
 * with real compounds to try; the worlds as three small stages, each with its
 * product standing in it. Every figure is counted from a registry.
 *
 * Each door sizes itself by its OWN width (container queries), not the
 * viewport's: a door is full width on a large phone, half width on a tablet
 * and a third on a desktop, and it has to compose well in all three.
 *
 * Atlas is V2 and has no door.
 */
export function HomeGateway({ copy, data }: { copy: GatewayCopy; data: GatewayData }) {
  const { counts } = data;
  /*
   * The sixth door is the documentation explorer, and only once a public
   * document exists: it 404s until then. The references are not a door of
   * their own — the research door already counts them and shows the latest.
   */
  const quality = data.links.explorer
    ? { href: data.links.explorer, name: copy.quality.name, body: copy.quality.body }
    : null;

  return (
    <section className={styles.gateway} aria-labelledby="gateway-title">
      <Container width="full">
        <header className={styles.head}>
          <p className={styles.index}>
            {copy.index} <span>/ {copy.label}</span>
          </p>
          <h2 id="gateway-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.lede}>{copy.lede}</p>
          <p className={styles.aside} aria-hidden="true">
            {copy.aside}
          </p>
        </header>

        <div className={styles.board} data-doors={quality ? 6 : 5}>
          {/* 1 — THE CATALOGUE, shown by a product. */}
          <Link href={data.links.catalog} className={`${styles.door} ${styles.products}`}>
            <span className={styles.doorText}>
              <span className={styles.doorName}>{copy.products.name}</span>
              <span className={styles.doorBody}>{copy.products.body}</span>
              <span className={styles.facts}>
                {fill(copy.products.facts, {
                  products: counts.products,
                  presentations: counts.presentations,
                })}
              </span>
              {data.lowestPrice ? (
                <span className={styles.price}>
                  <span className={styles.from}>{copy.products.from} </span>
                  {data.lowestPrice}
                </span>
              ) : null}
              <span className={styles.go} aria-hidden="true">
                →
              </span>
            </span>
            <span className={styles.productsMedia} aria-hidden="true">
              {data.productsImage ? (
                <Image
                  src={data.productsImage.src}
                  alt=""
                  width={data.productsImage.width}
                  height={data.productsImage.height}
                  sizes="(min-width: 64rem) 28rem, 60vw"
                  className={styles.productsImage}
                />
              ) : data.productsFallback ? (
                <SpecimenPlate
                  areaId={data.productsFallback.areaId}
                  world={null}
                  name={data.productsFallback.name}
                  annotation={data.productsFallback.range}
                  size="stage"
                  bare
                />
              ) : null}
            </span>
          </Link>

          {/* 2 — THE RESEARCH: a reading room, shown by what it cites. */}
          <Link href={data.links.research} className={`${styles.door} ${styles.research}`}>
            <span className={styles.researchGrid}>
              <span className={styles.researchMain}>
                <span className={styles.doorName}>{copy.research.name}</span>
                <span className={styles.doorBody}>{copy.research.body}</span>
                <span className={styles.figures}>
                  {(
                    [
                      [counts.profiles, copy.research.profiles],
                      [counts.references, copy.research.references],
                      [counts.areas, copy.research.areas],
                    ] as const
                  ).map(([value, label]) => (
                    <span key={label} className={styles.figure}>
                      <span className={styles.figureValue}>{pad(value)}</span>
                      <span className={styles.figureLabel}>{label}</span>
                    </span>
                  ))}
                </span>
              </span>
              {data.recentReferences.length > 0 ? (
                <span className={styles.bibliography}>
                  <span className={styles.bibliographyLabel}>{copy.research.latest}</span>
                  {data.recentReferences.map((ref, i) => (
                    <span key={ref.title} className={styles.citation}>
                      <span className={styles.citationIndex} aria-hidden="true">
                        [{pad(i + 1)}]
                      </span>
                      <span className={styles.citationMeta}>
                        {[ref.publication, ref.year].filter(Boolean).join(" · ")}
                      </span>
                      <span className={styles.citationTitle}>{ref.title}</span>
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            <span className={styles.go} aria-hidden="true">
              →
            </span>
          </Link>

          {/* 3 — THE AREAS: a coloured directory, eight doors of its own. */}
          <nav
            className={`${styles.door} ${styles.small} ${styles.areas}`}
            aria-labelledby="gateway-areas"
          >
            <span className={styles.doorHead}>
              <span id="gateway-areas" className={styles.doorName}>
                {copy.areas.name}
              </span>
              <Link href={data.links.areas} className={styles.doorAction}>
                {copy.areas.all} <span aria-hidden="true">↓</span>
              </Link>
            </span>
            <ul className={styles.areaList}>
              {data.areas.map((area) => (
                <li key={area.id} data-area={area.id}>
                  <Link href={area.href} className={styles.area}>
                    <AreaIcon id={area.id} className={styles.areaIcon} />
                    <span className={styles.areaName}>{area.label}</span>
                    <span className={styles.areaCount}>
                      <span aria-hidden="true">{pad(area.count)}</span>
                      <span className={styles.srOnly}>
                        {fill(copy.areas.count, { n: area.count })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 4 — SEARCH. A plain GET form into the catalogue: it works before
              hydration and without JavaScript, and the catalogue reads `?q=`.
              Under it, real compounds to try — each area's entry product. */}
          <div className={`${styles.door} ${styles.small} ${styles.search}`}>
            <span className={styles.doorName} aria-hidden="true">
              {copy.search.name}
            </span>
            <search className={styles.searchWrap}>
              <form action={data.links.catalog} method="get" className={styles.searchForm}>
                <label htmlFor="gateway-search" className={styles.srOnly}>
                  {copy.search.label}
                </label>
                <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="M15.5 15.5 21 21" />
                </svg>
                <input
                  id="gateway-search"
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder={copy.search.placeholder}
                  className={styles.searchInput}
                />
                <button type="submit" className={styles.searchSubmit}>
                  {copy.search.submit}
                </button>
              </form>
            </search>
            {/* Two fixed shapes, never a ragged wrap: compounds as one rail
                that scrolls sideways, strengths as one measuring scale. */}
            {(
              [
                [copy.search.try, data.suggestions, "rail"],
                [copy.search.byStrength, data.strengths, "scale"],
              ] as const
            ).map(([label, items, shape]) =>
              items.length > 0 ? (
                <div key={label} className={styles.suggestions}>
                  <span className={styles.suggestionsLabel}>{label}</span>
                  <span className={shape === "rail" ? styles.rail : styles.scale}>
                    {items.map((item) => (
                      <Link key={item.href} href={item.href} className={styles.suggestion}>
                        {item.label}
                      </Link>
                    ))}
                  </span>
                </div>
              ) : null,
            )}
            <span className={styles.searchIndex}>
              {fill(copy.search.index, {
                products: counts.products,
                presentations: counts.presentations,
              })}
            </span>
          </div>

          {/* 5 — THE SIGNATURE WORLDS: three small stages, each with its product. */}
          <div className={`${styles.door} ${styles.small} ${styles.worlds}`}>
            <span className={styles.doorHead}>
              <span className={styles.doorName}>{copy.worlds.name}</span>
              <span className={styles.doorBody}>{copy.worlds.body}</span>
            </span>
            <ul className={styles.worldList}>
              {data.worlds.map((world) => (
                <li key={world.world}>
                  <Link href={world.href} className={styles.world} data-world={world.world}>
                    <span className={styles.worldObject} aria-hidden="true">
                      {world.image ? (
                        <Image
                          src={world.image.src}
                          alt=""
                          width={world.image.width}
                          height={world.image.height}
                          sizes="10rem"
                          className={styles.worldStill}
                        />
                      ) : (
                        <SpecimenPlate
                          areaId={null}
                          world={world.world}
                          name={world.name}
                          annotation={world.range}
                          size="stage"
                          bare
                        />
                      )}
                    </span>
                    <span className={styles.worldName}>{world.label}</span>
                    {world.price ? <span className={styles.worldPrice}>{world.price}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 6 — THE DOCUMENTATION EXPLORER, once a public document exists. */}
          {quality ? (
            <Link href={quality.href} className={`${styles.door} ${styles.small} ${styles.refs}`}>
              <span className={styles.doorName}>{quality.name}</span>
              <span className={styles.doorBody}>{quality.body}</span>
              <span className={styles.go} aria-hidden="true">
                →
              </span>
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
