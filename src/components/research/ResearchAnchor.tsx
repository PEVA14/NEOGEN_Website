"use client";

import { useEffect } from "react";

import { writeAnchor, type ResearchAnchorValue } from "./anchorStore";

/**
 * Sets (a record) or clears (the Research overview) the compound being
 * investigated — see `anchorStore.ts`. Renders nothing.
 */
export function ResearchAnchor({ anchor }: { anchor: ResearchAnchorValue | null }) {
  const slug = anchor?.slug ?? null;
  const name = anchor?.name ?? null;
  const href = anchor?.href ?? null;
  useEffect(() => {
    writeAnchor(slug && name && href ? { slug, name, href } : null);
  }, [slug, name, href]);
  return null;
}
