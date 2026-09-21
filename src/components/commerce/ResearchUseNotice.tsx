import Link from "next/link";

import { Body, Mono } from "@/components/typography";

import styles from "./ResearchUseNotice.module.css";

export interface ResearchUseCopy {
  /** The mono label — "USO EXCLUSIVO EN INVESTIGACIÓN". */
  label: string;
  /** One sentence stating the condition. Never a paragraph. */
  statement: string;
  /** Link to the note that explains it in full. */
  readMore: string;
}

/**
 * THE RESEARCH-USE CONDITION, as one component.
 *
 * WHY ONE COMPONENT AND NOT A LINE OF COPY PER PAGE. Because the condition has
 * to be identical everywhere it appears. A catalogue that words it one way, a
 * product page another and a checkout a third is not emphasis, it is drift —
 * and on the one statement where the site's honesty is most visible, drift
 * reads as carelessness about exactly the thing being claimed.
 *
 * TWO REGISTERS, AND NO THIRD.
 *   `line`  — a single mono row. The default, and what commerce surfaces get:
 *             the product page's foot, the bag, the catalogue masthead. Quiet
 *             Mode, present without interrupting.
 *   `panel` — the condition set apart, with a rule. For the two pages whose
 *             subject IS the condition: the peptide guide and the FAQ.
 *
 * WHAT IT MUST NEVER BECOME. The owner's original instruction (Q32) was that
 * the research line be restrained and not prominent; the later brief asks for
 * the condition to be emphasised. Both are satisfied by presence and
 * repetition at decision points rather than by volume: this component does not
 * shout, does not use the error colour, is never a modal and is never a wall
 * of disclaimer text. A site that argues with its customer about its own
 * legitimacy has already lost the argument.
 */
export function ResearchUseNotice({
  copy,
  href,
  variant = "line",
  className,
}: {
  copy: ResearchUseCopy;
  /** The editorial note. Omitted where the notice sits on that note itself. */
  href?: string;
  variant?: "line" | "panel";
  className?: string;
}) {
  if (variant === "panel") {
    return (
      <aside className={[styles.panel, className].filter(Boolean).join(" ")}>
        <Mono size="2xs" className={styles.label}>
          {copy.label}
        </Mono>
        <Body size="sm" className={styles.statement}>
          {copy.statement}
        </Body>
        {href ? (
          <Link href={href} className={styles.link}>
            <Mono size="2xs">{copy.readMore}</Mono>
          </Link>
        ) : null}
      </aside>
    );
  }

  return (
    <p className={[styles.line, className].filter(Boolean).join(" ")}>
      <Mono size="2xs" className={styles.lineLabel}>
        {copy.label}
      </Mono>
      <Mono size="2xs" className={styles.lineText}>
        {copy.statement}
        {href ? (
          <>
            {" "}
            <Link href={href} className={styles.link}>
              {copy.readMore}
            </Link>
          </>
        ) : null}
      </Mono>
    </p>
  );
}
