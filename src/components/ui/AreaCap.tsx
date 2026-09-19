import { useId } from "react";

import styles from "./AreaCap.module.css";

/**
 * THE AREA'S CAP — the top of a NEOGEN vial, capped in the area's own colour.
 *
 * An area tile is a door, not a product page, so it does not need the whole
 * object: the cap, the collar and the shoulder of the glass, rising from the
 * tile's lower edge, say "a shelf of these" in the area's hue. The colour is
 * read from `--area-hue` (`areas.css`) on the nearest `[data-area]`, so one
 * drawing serves all eight areas. Decorative: the tile carries the name.
 *
 * viewBox 120 × 96, drawn to be cropped at the bottom.
 */
export function AreaCap({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const id = (part: string) => `${uid}-${part}`;

  return (
    <svg
      viewBox="0 0 120 96"
      className={`${styles.cap} ${className ?? ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The cap: a coloured metal cylinder, lit from the upper left. */}
        <linearGradient id={id("metal")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--cap-dark)" />
          <stop offset="0.28" stopColor="var(--cap-light)" />
          <stop offset="0.56" stopColor="var(--cap-base)" />
          <stop offset="1" stopColor="var(--cap-dark)" />
        </linearGradient>
        <linearGradient id={id("collar")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--collar-dark)" />
          <stop offset="0.3" stopColor="var(--collar-light)" />
          <stop offset="1" stopColor="var(--collar-dark)" />
        </linearGradient>
        {/* Clear glass: darker at the silhouette, clear through the middle. */}
        <linearGradient id={id("glass")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--glass-edge)" stopOpacity="0.5" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.82" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--glass-edge)" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Glass: neck and shoulder, running off the bottom edge. */}
      <path
        d="M44 52 L76 52 L76 60 C 76 68 100 68 100 80 L100 96 L20 96 L20 80 C 20 68 44 68 44 60 Z"
        fill={`url(#${id("glass")})`}
        stroke="var(--glass-edge)"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <rect x="26" y="74" width="3" height="22" fill="#fff" opacity="0.7" />

      {/* Collar and cap. */}
      <rect x="40" y="44" width="40" height="9" fill={`url(#${id("collar")})`} />
      <rect x="34" y="12" width="52" height="33" rx="1.5" fill={`url(#${id("metal")})`} />
      <rect x="34" y="12" width="52" height="2.5" fill="#fff" opacity="0.35" />
      <rect x="34" y="42" width="52" height="3" fill="#000" opacity="0.18" />
    </svg>
  );
}
