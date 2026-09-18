import Link from "next/link";

import styles from "./ScienceBand.module.css";

/**
 * SCIENCE ELEVATES COMMERCE — the evidence, counted, in one band.
 *
 * The homepage used to explain the documentation model in four rows that each
 * said "no public document". True, and it made the store look empty. This
 * states what DOES exist — sourced profiles, public references, research
 * areas — as three counted figures, and hands the reader to the research
 * index. Every number is read from the registries by the page.
 */
export function ScienceBand({
  index,
  label,
  title,
  lede,
  stats,
  actions,
}: {
  index: string;
  label: string;
  title: string;
  lede: string;
  stats: readonly { value: number; label: string }[];
  actions: readonly { href: string; label: string }[];
}) {
  return (
    <section className={styles.band} aria-labelledby="science-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>
            {index} / {label}
          </p>
          <h2 id="science-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.lede}>{lede}</p>
          <div className={styles.actions}>
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className={styles.action}>
                {action.label} <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
        <dl className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <dt className={styles.statLabel}>{stat.label}</dt>
              <dd className={styles.statValue}>{String(stat.value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
