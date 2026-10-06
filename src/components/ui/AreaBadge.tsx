"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./AreaBadge.module.css";
import { AreaSignet } from "./AreaSignet";

import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * AN AREA BADGE — a product's area as one large signet beside its name
 * (owner, 2026-10-05: "have the symbol be much bigger and whenever you
 * hover/tap over it it shows the category's name").
 *
 * At rest the symbol alone, on its plate. Pointing at it, focusing it or
 * tapping it slides the area's name out of the plate to its left, in the
 * area's text colour, and the symbol makes its gesture (`area-symbols.css`).
 * It is the link to the area: with a mouse or the keyboard one click goes;
 * on a touch screen the first tap shows the name and the second follows it,
 * so a finger is never sent somewhere it has not read.
 *
 * The name is always the link's accessible name, whether or not it is shown.
 */
export function AreaBadge({
  id,
  label,
  href,
  className,
}: {
  id: DiscoveryAreaId;
  label: string;
  href: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Link
      href={href}
      className={[styles.badge, className].filter(Boolean).join(" ")}
      data-area={id}
      data-symbol-host=""
      data-open={open ? "true" : undefined}
      aria-label={label}
      onClick={(event) => {
        if (open || !window.matchMedia("(hover: none)").matches) return;
        event.preventDefault();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
    >
      <span className={styles.label} aria-hidden="true">
        <span className={styles.labelText}>{label}</span>
        <span className={styles.go}>→</span>
      </span>
      <AreaSignet id={id} size="lg" tone="plate" className={styles.signet} />
    </Link>
  );
}
