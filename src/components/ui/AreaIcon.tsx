import type { ReactNode } from "react";

import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * AREA SYMBOLS — one drawn mark per discovery area.
 *
 * They tell eight doors apart at a glance, in the same structural line
 * language as the hub marks: 32-unit grid, 1.5 stroke, round caps, no fills
 * beyond a dot. Each is an abstract CATALOGUE sign — a cycle, a link, a cell,
 * a rising step — never an organ, a body or an effect, so no symbol says what
 * a product in the area does. Decorative: always `aria-hidden`, and the
 * area's name is always set beside it as text.
 */
const PATHS: Record<DiscoveryAreaId, ReactNode> = {
  /* Metabolismo — a closed cycle. */
  metabolic: (
    <>
      <path d="M24.5 11.5A10 10 0 0 0 7 12" />
      <path d="M7.5 20.5A10 10 0 0 0 25 20" />
      <path d="M24.5 6.5v5h-5" />
      <path d="M7.5 25.5v-5h5" />
    </>
  ),
  /* Recuperación — two links joined. */
  recovery: (
    <>
      <rect x="4.5" y="11" width="14" height="10" rx="5" />
      <rect x="13.5" y="11" width="14" height="10" rx="5" />
    </>
  ),
  /* Longevidad y función celular — a cell: membrane and nucleus. */
  longevity: (
    <>
      <circle cx="16" cy="16" r="11" />
      <circle cx="18.5" cy="14" r="3.5" />
      <circle cx="11" cy="20" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  /* Desarrollo y rendimiento — three rising steps. */
  growth: (
    <>
      <path d="M5 26h22" />
      <path d="M8 26v-6h5v6" />
      <path d="M13.5 26V14h5v12" />
      <path d="M19 26V7h5v19" />
    </>
  ),
  /* Piel — layers. */
  skin: (
    <>
      <path d="M4 10c4-3 8 3 12 0s8 3 12 0" />
      <path d="M4 16c4-3 8 3 12 0s8 3 12 0" />
      <path d="M4 22c4-3 8 3 12 0s8 3 12 0" />
    </>
  ),
  /* Neuro y sueño — a small network. */
  neuro: (
    <>
      <path d="M9 9l7 7m0 0l7-5m-7 5l-4 9m4-9l8 7" />
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="23" cy="11" r="2.5" />
      <circle cx="12" cy="25" r="2.5" />
      <circle cx="24" cy="23" r="2.5" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  /* Hormonal y reproductivo — a ring structure. */
  hormonal: (
    <>
      <path d="M16 5l9.5 5.5v11L16 27l-9.5-5.5v-11z" />
      <path d="M16 10.5l4.8 2.75v5.5L16 21.5l-4.8-2.75v-5.5z" />
    </>
  ),
  /* Materiales — a laboratory flask. */
  materials: (
    <>
      <path d="M12.5 5h7" />
      <path d="M13.5 5v8l-7 11.5A1.5 1.5 0 0 0 7.8 27h16.4a1.5 1.5 0 0 0 1.3-2.5L18.5 13V5" />
      <path d="M10 20h12" />
    </>
  ),
};

export function AreaIcon({ id, className }: { id: DiscoveryAreaId; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[id]}
    </svg>
  );
}
