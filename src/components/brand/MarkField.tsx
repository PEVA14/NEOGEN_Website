import { LivingLayer } from "./LivingLayer";
import type { InkOptions } from "./livingInk";
import styles from "./MarkField.module.css";
import { NeogenMark } from "./NeogenMark";

/**
 * THE MARK AS ARCHITECTURE — a large, cropped NEOGEN mark (or fragment)
 * behind a section's content.
 *
 * The field fills its section (which must be `position: relative` and
 * `isolation: isolate`), clips to it, sits behind everything in it, and never
 * takes the pointer. The caller places the mark by its HUB, in the section's
 * own coordinates, and sizes it by height — so a composition reads as "the
 * hub is here, at this scale", and cropping follows from where the section
 * ends:
 *
 *   --hub-x, --hub-y   where the hub's centre sits (any length or %)
 *   --mark-h           the mark's height
 *   --mark-tone        its colour — at this size, LOW CONTRAST, opaque
 *                      (a mix, never an alpha: the parts overlap)
 *
 * Brand, never data: it is decorative (`aria-hidden`), sits in the page's
 * non-data regions only, and is too large and too faint to read as a
 * diagram. `assemble="gather"` lets the reader's scroll draw it together.
 */
export function MarkField({
  name,
  className,
  arms,
  hub,
  assemble,
  ink,
}: {
  /** Which composition this is — a hook for its styles and for tests. */
  name: string;
  className?: string;
  arms?: readonly number[];
  hub?: boolean;
  assemble?: "gather";
  /** The mark as Living Ink (`livingInk.ts`) — macro fields only. */
  ink?: Omit<InkOptions, "arms">;
}) {
  return (
    <div
      className={[styles.field, className].filter(Boolean).join(" ")}
      data-mark-field={name}
      aria-hidden="true"
    >
      {ink && !assemble ? null : (
        <NeogenMark
          className={[styles.mark, ink ? styles.parts : ""].join(" ")}
          arms={arms}
          hub={hub}
          assemble={assemble}
        />
      )}
      {ink ? (
        <LivingLayer
          rest={ink.rest}
          disturb={ink.disturb}
          episodes={ink.episodes}
          arms={arms}
          handover={Boolean(assemble)}
        />
      ) : null}
    </div>
  );
}
