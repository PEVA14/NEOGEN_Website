import { Section } from "@/components/primitives";
import { getWorld } from "@/config/worlds";
import { mediaForWorld } from "@/content";

import { MomentCommerce, type MomentCommerceProps } from "./MomentCommerce";
import { RetaStage } from "./RetaStage";
import styles from "./RetaExperience.module.css";

/** One labelled fact beside the vial. */
export interface RetaFact {
  label: string;
  title: string;
  body?: string;
  /** Presentations with their own prices, when the fact is the ladder. */
  ladder?: readonly { label: string; price: string | null }[];
}

export interface RetaExperienceCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  lede: string;
  /** Two facts either side of the vial: [left, right]. */
  facts: readonly [readonly RetaFact[], readonly RetaFact[]];
  /** Where the scene resolves: the price and one action. */
  commerce?: MomentCommerceProps;
  vialAlt: string;
  loadingLabel: string;
  staticLabel: string;
}

/**
 * RETA — the first product world, as a scene you scroll INTO.
 *
 * It used to be a 300vh pinned track whose copy beats swapped over a fixed
 * canvas. Owner direction (2026-09-18): no sticking. It is now an ordinary
 * section: the world's environment full bleed, the vial standing in the
 * middle, labelled facts on either side and the price at its foot. The drama
 * is in the arrival — as the section scrolls through the viewport the vial
 * rises, grows and swings round to face the reader, the light blooms behind
 * it and the columns slide in (`RetaStage`, `choreography.ts`, and CSS view
 * timelines here). Nothing waits on the scroll: every fact is readable in
 * the server HTML and at rest.
 *
 * The copy is plain on purpose: what it is, how it is sold, the packaging and
 * what gets published, each a label and a sentence — figures from the
 * registry, no mechanism or effect.
 *
 * `data-world="reta"` scopes the palette (CONVENTIONS §3).
 */
export function RetaExperience({ copy }: { copy: RetaExperienceCopy }) {
  const world = getWorld("reta");
  const media = mediaForWorld("reta");
  const [left, right] = copy.facts;

  const fact = (item: RetaFact, n: number) => {
    return (
      <div key={item.label} className={styles.fact}>
        <p className={styles.factLabel}>
          <span className={styles.factIndex}>{String(n).padStart(2, "0")}</span> {item.label}
        </p>
        <h3 className={styles.factTitle}>{item.title}</h3>
        {item.body ? <p className={styles.factBody}>{item.body}</p> : null}
        {item.ladder ? (
          <ul className={styles.ladder}>
            {item.ladder.map((step) => (
              <li key={step.label} className={styles.step}>
                <span className={styles.stepLabel}>{step.label}</span>
                {step.price ? <span className={styles.stepPrice}>{step.price}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <Section
      mode="impact"
      world={world.id}
      padded={false}
      id="reta"
      aria-labelledby="reta-title"
      className={styles.section}
    >
      <RetaStage
        modelPath={media.model}
        environment={world.environment}
        poster={media.poster}
        posterAlt={copy.vialAlt}
        loadingLabel={copy.loadingLabel}
        staticLabel={copy.staticLabel}
      >
        <header className={styles.head}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h2 id="reta-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
          <p className={styles.lede}>{copy.lede}</p>
        </header>

        <div className={`${styles.column} ${styles.left}`}>
          {left.map((item, i) => fact(item, i + 1))}
        </div>
        <div className={styles.vialSpace} aria-hidden="true" />
        <div className={`${styles.column} ${styles.right}`}>
          {right.map((item, i) => fact(item, left.length + i + 1))}
        </div>

        {copy.commerce ? (
          <div className={styles.foot}>
            <MomentCommerce {...copy.commerce} />
          </div>
        ) : null}
      </RetaStage>
    </Section>
  );
}
