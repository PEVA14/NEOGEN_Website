import styles from "./SimpleEffects.module.css";

import type { PublicSimpleEffects } from "@/content/effects";

/**
 * SIMPLE EFFECTS, AS A CUSTOMER WOULD SEE THEM — tags, then one sentence.
 *
 * One component for every surface (catalogue card, PDP, Vista rápida, the
 * record head) and for the console's preview, so what the owner approves is
 * what renders, in the same styles. Each surface passes its `variant`; the
 * component carries no copy of its own and renders nothing without content.
 *
 * Owner-authored and editorial (`content/effects`): never a scientific
 * statement, which is why it sits ABOVE the sourced layers and never inside
 * them.
 */
export function SimpleEffects({
  effects,
  variant,
  className,
}: {
  effects: PublicSimpleEffects | null | undefined;
  variant: "card" | "pdp" | "quick" | "record";
  className?: string;
}) {
  if (!effects || (!effects.description && effects.tags.length === 0)) return null;
  return (
    <span className={[styles.effects, className].filter(Boolean).join(" ")} data-variant={variant}>
      {effects.tags.length > 0 ? (
        <span className={styles.tags}>{effects.tags.join(" · ")}</span>
      ) : null}
      {effects.description ? (
        <span className={styles.description}>{effects.description}</span>
      ) : null}
    </span>
  );
}
