import { useId } from "react";

import styles from "./AreaCap.module.css";

/**
 * THE AREA'S CAP — the top of a NEOGEN vial, capped in the area's own colour.
 *
 * An area tile is a door, not a product page, so it does not need the whole
 * object: the flip-off cap, the crimp band, the neck and the shoulder of the
 * glass, rising from the tile's lower edge, say "a shelf of these" in the
 * area's hue. The profile is the V4 crimp-top's (`reta-v7.glb`), the same one
 * `SpecimenPlate` draws whole: a broad cap (0.87 × the body), a narrower band
 * (0.67), a short neck and a short shoulder. The colour is
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
        d="M33 44 L87 44 L87 53 C 87 61 102 60 102 68 L102 96 L18 96 L18 68 C 18 60 33 61 33 53 Z"
        fill={`url(#${id("glass")})`}
        stroke="var(--glass-edge)"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <rect x="24" y="71" width="3" height="25" fill="#fff" opacity="0.7" />

      {/* Crimp band, rolled under the lip. */}
      <rect x="32" y="36" width="56" height="12" fill={`url(#${id("collar")})`} />
      <rect x="32" y="45.5" width="56" height="1.2" fill="#000" opacity="0.18" />

      {/* Flip-off cap: a broad disc with a rounded top edge. */}
      <path
        d="M23.5 38 L23.5 16 Q23.5 12 27.5 12 L92.5 12 Q96.5 12 96.5 16 L96.5 38 Z"
        fill={`url(#${id("metal")})`}
      />
      <path d="M27 12.8 L93 12.8" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.4" />
      <rect x="23.5" y="35.5" width="73" height="2.5" fill="#000" opacity="0.18" />
    </svg>
  );
}
