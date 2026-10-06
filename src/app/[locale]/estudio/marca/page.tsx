import { notFound } from "next/navigation";

import { InkLab } from "@/components/brand/InkLab";

import type { Metadata } from "next";

/**
 * THE MARK'S MATERIAL LAB — development only (Living Ink, 2026-10-05). A
 * neutral test bench for the material: the candidate strengths side by side,
 * the generic techniques it was compared with (and rejected), and the
 * connection catching. A real 404 in production, never indexed or linked.
 */
/* Rendered per request, so a production build emits no page for it. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MarkLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <InkLab />;
}
