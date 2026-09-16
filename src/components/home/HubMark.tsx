import styles from "./NeogenHub.module.css";

import type { ReactNode } from "react";
import type { HubId } from "@/server/hub";

/**
 * THE FIVE MARKS — drawn structure, not a pictogram set.
 *
 * There is no icon library in this project and that is deliberate: the whole
 * codebase contains two inline SVGs, and the Design Bible never mentions
 * iconography. So these are not borrowed glyphs. Each one draws the STRUCTURE
 * of the thing it leads to, in the same geometric language as the specimen
 * plate's datum lines and the area board's gauge — hairlines, ticks, dots.
 *
 * WHAT THEY MAY NOT BE. `quality` is a document tied to one presentation, and
 * emphatically NOT a seal, badge, shield or checkmark: that section's own copy
 * reads "where no document exists, no seal appears", and a tick there would
 * manufacture exactly the certification signal the site refuses to imply.
 * Nothing here suggests testing, approval, or a claim of any kind.
 *
 * They are decorative and `aria-hidden`: every row already carries its name,
 * its descriptor and its action in text.
 */
const MARKS: Record<HubId, ReactNode> = {
  /** The presentation ladder — every compound is a stack of strengths. */
  catalog: (
    <>
      <line data-part="" x1="7" y1="9" x2="23" y2="9" />
      <line data-part="" x1="7" y1="15" x2="18" y2="15" />
      <line data-part="" x1="7" y1="21" x2="21" y2="21" />
      <line data-part="" x1="7" y1="27" x2="14" y2="27" />
    </>
  ),

  /** Eight dots: literally the eight public discovery areas. */
  areas: (
    <>
      <circle data-part="" cx="8" cy="12" r="1.8" />
      <circle data-part="" cx="15" cy="12" r="1.8" />
      <circle data-part="" cx="22" cy="12" r="1.8" />
      <circle data-part="" cx="29" cy="12" r="1.8" />
      <circle data-part="" cx="8" cy="21" r="1.8" />
      <circle data-part="" cx="15" cy="21" r="1.8" />
      <circle data-part="" cx="22" cy="21" r="1.8" />
      <circle data-part="" cx="29" cy="21" r="1.8" />
    </>
  ),

  /** Three rings — the three compounds that have an environment of their own. */
  worlds: (
    <>
      <circle data-part="" cx="10" cy="16" r="5.5" />
      <circle data-part="" cx="16" cy="16" r="5.5" />
      <circle data-part="" cx="22" cy="16" r="5.5" />
    </>
  ),

  /** An index: a spine and its entries. */
  research: (
    <>
      <line data-part="" x1="8" y1="7" x2="8" y2="25" />
      <line data-part="" x1="13" y1="10" x2="25" y2="10" />
      <line data-part="" x1="13" y1="16" x2="20" y2="16" />
      <line data-part="" x1="13" y1="22" x2="24" y2="22" />
    </>
  ),

  /**
   * A document, joined to ONE presentation — the evidence rule itself: an
   * analysis names the exact presentation it examined, and nothing wider.
   */
  quality: (
    <>
      <rect data-part="" x="5" y="7" width="11" height="18" />
      <line data-part="" x1="8" y1="12" x2="13" y2="12" />
      <line data-part="" x1="8" y1="16" x2="12" y2="16" />
      <line data-part="link" x1="16" y1="20" x2="24" y2="20" />
      <rect data-part="" x="24" y="16" width="4" height="8" />
    </>
  ),
};

/** One mark per destination. Decorative; the row carries the real name. */
export function HubMark({ id }: { id: HubId }) {
  return (
    <span className={styles.mark} data-mark={id} aria-hidden="true">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        // Stroke is in viewBox units, so it scales with the mark. At 3.5rem
        // 1.75 rendered chunky; this holds the hairline character.
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {MARKS[id]}
      </svg>
    </span>
  );
}
