/**
 * Minimal class name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: with CSS custom properties as the
 * token layer, components resolve conflicts through semantic props rather than
 * by overriding utilities, so there is nothing to merge. Revisit only if real
 * conflicts appear.
 */
export type ClassValue = string | number | null | undefined | false;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
