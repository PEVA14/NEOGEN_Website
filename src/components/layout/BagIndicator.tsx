"use client";

import Link from "next/link";

import { Mono } from "@/components/typography";
import { useBag } from "@/domain/bag";

/**
 * `[ BAG: N ]` — live.
 *
 * A client island of one element, so adding a product moves the header
 * immediately without the rest of the header leaving the server.
 *
 * WHY IT RENDERS `0` BEFORE HYDRATION RATHER THAN A SPINNER. The server cannot
 * know this browser's bag, so the prerendered markup says zero. Showing a
 * placeholder instead would replace one brief inaccuracy with a permanent
 * visual wobble on every page load, and the count is a secondary readout, not
 * a page's content.
 */
export function BagIndicator({
  href,
  label,
  ariaLabel,
  className,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  /** The header's own link class — styling stays with the header. */
  className?: string;
}) {
  const { bag, hydrated } = useBag();

  return (
    <Link href={href} aria-label={`${ariaLabel}: ${bag.count}`} className={className}>
      <Mono size="2xs" className="tracking-(--tracking-label)">
        [ {label}: <span data-bag-count={hydrated ? "live" : "pending"}>{bag.count}</span> ]
      </Mono>
    </Link>
  );
}
