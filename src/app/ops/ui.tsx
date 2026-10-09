import Link from "next/link";

import styles from "./ops.module.css";

import type { Tone } from "./lifecycle";

/**
 * THE CONSOLE'S FEW SHARED PIECES — server components, no client code.
 *
 * Deliberately small: a page header that says what the page is for, a state
 * indicator, a section, an empty state, and a line that says what an action
 * does. Everything else is the stylesheet.
 */

/** Where you are, what the page is for, and what you can do from here. */
export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  actions,
  reference = false,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** The title is an identifier (an order number): set it in mono. */
  reference?: boolean;
}) {
  return (
    <header className={styles.pageHead}>
      <div className={styles.pageHeadText}>
        {back ? (
          <Link href={back.href} className={`${styles.backLink} ${styles.noPrint}`}>
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={reference ? styles.reference : styles.title}>{title}</h1>
        {description ? <p className={styles.pageDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={`${styles.actions} ${styles.noPrint}`}>{actions}</div> : null}
    </header>
  );
}

/**
 * A state, as a coloured dot and its words. The words carry the meaning; the
 * dot only lets the eye find the ones that matter. `label` names the axis for
 * a screen reader ("Pago: Pagado").
 */
export function State({
  tone,
  label,
  children,
  strong = false,
}: {
  tone: Tone;
  label?: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <span className={styles.state} data-tone={tone} data-strong={strong ? "true" : undefined}>
      <span className={styles.stateDot} aria-hidden="true" />
      {label ? <span className="sr-only">{label}: </span> : null}
      {children}
    </span>
  );
}

/** A titled section of a page. `description` says what it is for, when that is not obvious. */
export function Section({
  id,
  title,
  description,
  aside,
  children,
  tone,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <section id={id} className={styles.panel} data-tone={tone} aria-labelledby={`${id}-title`}>
      <header className={styles.panelHead}>
        <h2 id={`${id}-title`} className={styles.panelTitle}>
          {title}
        </h2>
        {aside}
      </header>
      {description ? <p className={styles.panelDescription}>{description}</p> : null}
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

/** What this is, why it is empty, whether that is normal, and what to do next. */
export function EmptyState({
  title,
  children,
  action,
  compact = false,
}: {
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={styles.emptyState} data-compact={compact ? "true" : undefined}>
      {title ? <p className={styles.emptyTitle}>{title}</p> : null}
      {children ? <div className={styles.emptyBody}>{children}</div> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

/**
 * WHAT AN ACTION DOES — reversible or not, money, customer, stock — in one
 * quiet line beside it. A consequence that matters more is marked `strong`.
 */
export function Effects({
  items,
}: {
  items: readonly (string | { text: string; strong: true })[];
}) {
  return (
    <ul className={styles.effects}>
      {items.map((item) => {
        const text = typeof item === "string" ? item : item.text;
        return (
          <li key={text} data-strong={typeof item === "string" ? undefined : "true"}>
            {text}
          </li>
        );
      })}
    </ul>
  );
}

/** A small count beside a label. */
export function Count({ n, alert = false }: { n: number; alert?: boolean }) {
  return (
    <span className={styles.count} data-alert={alert && n > 0 ? "true" : undefined}>
      {n}
    </span>
  );
}
