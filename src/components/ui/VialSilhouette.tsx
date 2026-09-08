import { cn } from "@/lib/cn";

interface VialSilhouetteProps {
  /** Accessible name, or omit for a purely decorative instance. */
  label?: string;
  className?: string;
}

/**
 * A diagrammatic vial, drawn from the real model's proportions
 * (~0.152 wide × 0.314 tall in the GLB).
 *
 * DELIBERATELY NOT A PRODUCT PHOTOGRAPH. No product imagery exists yet, and
 * generating something photographic would be inventing an asset. This reads as
 * a technical drawing — which is honest about being a placeholder, and sits
 * comfortably in a laboratory system rather than looking like a broken image.
 *
 * Used both as the 3D fallback and as the product-card media, so a real asset
 * later replaces one component in two places.
 */
export function VialSilhouette({ label, className }: VialSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 152 314"
      className={cn(className)}
      preserveAspectRatio="xMidYMid meet"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <rect x="34" y="4" width="84" height="28" rx="0" fill="currentColor" opacity="0.55" />
      <rect x="46" y="32" width="60" height="14" fill="currentColor" opacity="0.4" />
      <path
        d="M28 46 h96 a10 10 0 0 1 10 10 v244 a10 10 0 0 1 -10 10 h-96 a10 10 0 0 1 -10 -10 v-244 a10 10 0 0 1 10 -10 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
      />
      {/* Label band — where the product identity would sit. */}
      <rect x="26" y="120" width="100" height="96" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
