import Link from "next/link";
import { Fragment } from "react";

import type { Constituent } from "./composition";

/**
 * THE BLEND, READ AS ITS PARTS — the composition line under GLOW's name.
 *
 * The same text the page always printed ("GHK-CU 50mg + TB-500 10mg +
 * BPC-157 10mg"), verbatim, but each part is now what it is: a product NEOGEN
 * sells, linked to its own page when the catalogue has exactly one product of
 * that name. Set in GLOW's light: a faint shine round the type
 * (`glow.module.css`), which brightens on the part pointed at or focused.
 */
export function GlowConstituents({
  parts,
  className,
  hrefFor,
  linkLabel,
}: {
  parts: readonly Constituent[];
  className?: string;
  /** The localized product URL for a slug. */
  hrefFor: Record<string, string>;
  /** "Ver producto" — appended for assistive technology only. */
  linkLabel: string;
}) {
  return (
    <p className={className} data-glow-composition="">
      {parts.map((part, index) => {
        const text = `${part.name} ${part.mg}mg`;
        const href = part.slug ? hrefFor[part.slug] : undefined;
        return (
          <Fragment key={part.name}>
            {index > 0 ? <span aria-hidden="true"> + </span> : null}
            {href ? (
              <Link href={href} data-constituent={index}>
                {text}
                <span className="sr-only"> — {linkLabel}</span>
              </Link>
            ) : (
              <span data-constituent={index}>{text}</span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}
