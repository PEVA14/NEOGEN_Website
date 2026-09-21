import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StudioView } from "@/components/experience/studio/StudioView";
import { productMedia } from "@/content/media";
import { presentationRange, publishedProducts } from "@/data/catalog";

import type { Metadata } from "next";

/**
 * THE PRODUCT STUDIO — development only.
 *
 * Renders a product's real GLB as a studio photograph so its frame can be
 * captured to a static commerce image (`scripts/capture-studio.mjs`). It is a
 * tool, not a page: a real 404 in production, never indexed, never linked.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** The three flagships on their own rigs, plus one generic product (neutral rig). */
const PROTOTYPES = ["reta", "glow", "ghk-cu", "semaglutide"];

export async function generateStaticParams() {
  if (process.env.NODE_ENV === "production") return [];
  return PROTOTYPES.map((slug) => ({ slug }));
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  if (process.env.NODE_ENV === "production" || !PROTOTYPES.includes(slug)) notFound();
  const product = publishedProducts.find((p) => p.slug === slug);
  if (!product) notFound();
  return (
    <main style={{ background: "#05070c", minHeight: "100vh", padding: "24px 0" }}>
      <Suspense>
        <StudioView
          slug={slug}
          label={{ name: product.name, line: presentationRange(product) }}
          model={productMedia(slug).model}
        />
      </Suspense>
    </main>
  );
}
