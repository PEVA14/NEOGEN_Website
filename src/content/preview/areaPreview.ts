import "server-only";

import { ISSUERS } from "@/data/quality";
import { entryOrder } from "@/domain/discovery";

import type { AreaOverview } from "@/content/areas";
import type { QualityDocument } from "@/content/documents";
import type { ContentProvenance } from "@/content/lifecycle";
import type { ProductOverview, SourcedStatement } from "@/content/overview";
import type { Reference } from "@/content/references";
import type { AreaResearchDeps } from "@/content/research";
import type { Product } from "@/data/catalog";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { Lot } from "@/data/quality";
import type { QualityRegistries } from "@/domain/quality";

/**
 * DESIGN PREVIEW FIXTURES — SAMPLE DATA, NEVER PUBLISHED.
 *
 * The context, research and evidence sections of an area page render only
 * from approved sources and accepted documents, and today there are none. This
 * module exists so the owner can SEE those sections before real material
 * arrives, on a development-only route (`…/area/<slug>/vista-previa`) that is a
 * real 404 in production.
 *
 * WHAT MAKES THIS SAFE:
 *
 *   - nothing here is written into a real registry. Every fixture is passed to
 *     the SAME functions the live page calls, through their injectable
 *     registries (`publicAreaOverview`, `areaResearch`, `publicEvidenceIndex`);
 *   - every visible string carries `[MUESTRA FICTICIA]` / `[FICTIONAL SAMPLE]`,
 *     every URL is on `example.org` (reserved for documentation, RFC 2606), and
 *     every report id says MUESTRA-FICTICIA;
 *   - no text states a finding, an outcome or a mechanism — each sentence says
 *     only what KIND of approved sentence will appear in its place;
 *   - `check:output` fails the build if the preview route or either marker
 *     phrase appears in anything production emits.
 */

export const PREVIEW_PHRASES = ["MUESTRA FICTICIA", "FICTIONAL SAMPLE"] as const;

const approved = (cls: ContentProvenance["class"]): ContentProvenance => ({
  class: cls,
  status: "approved",
});

const SAMPLE_URL = "https://example.org/neogen/muestra-ficticia";

function reference(n: number, sourceType: Reference["sourceType"]): Reference {
  const id = String(n).padStart(2, "0");
  return {
    id: `muestra-ficticia-ref-${id}`,
    title: `[MUESTRA FICTICIA · FICTIONAL SAMPLE] Referencia de diseño ${id}`,
    authors: ["Autora de muestra", "Autor de muestra", "Equipo de muestra", "Revisor de muestra"],
    publication: "Publicación de muestra",
    year: 2025,
    doi: null,
    pmid: null,
    url: `${SAMPLE_URL}/referencia-${id}`,
    sourceType,
    status: "approved",
  };
}

const REFERENCES_FX: readonly Reference[] = [
  reference(1, "journal-article"),
  reference(2, "review-article"),
  reference(3, "preprint"),
  reference(4, "dataset"),
];
const [R1, R2, R3, R4] = REFERENCES_FX.map((r) => r.id);

function statement(id: string, references: string[], es: string, en: string): SourcedStatement {
  return {
    id,
    text: { es: `[MUESTRA FICTICIA] ${es}`, en: `[FICTIONAL SAMPLE] ${en}` },
    references,
    provenance: approved("scientific-source"),
  };
}

export interface AreaPreviewSources {
  areaOverviews: Readonly<Partial<Record<DiscoveryAreaId, AreaOverview>>>;
  research: AreaResearchDeps;
  quality: QualityRegistries;
}

/** Sample sources for one area, built around its real entry compounds. */
export function areaPreviewSources(
  area: DiscoveryAreaId,
  items: readonly Product[],
): AreaPreviewSources {
  const [a, b = a, c = b] = entryOrder(items);

  const overviews: Record<string, ProductOverview> = {
    [a.slug]: {
      slug: a.slug,
      /* Shows the card reveal's description slot — the first thing a card
         shows once a real summary is approved. */
      summary: {
        id: "fx-a-summary",
        text: {
          es: "[MUESTRA FICTICIA] Aquí aparecerá el resumen aprobado del producto, en dos o tres líneas, sobre su tarjeta y su ficha.",
          en: "[FICTIONAL SAMPLE] The product's approved summary will appear here, in two or three lines, on its card and its page.",
        },
        provenance: approved("business-decision"),
      },
      researchContext: [
        statement(
          "fx-a-context",
          [R1, R2],
          "Aquí aparecerá por qué se estudia este compuesto, con sus citas.",
          "Why this compound is studied will appear here, with its citations.",
        ),
      ],
      areasOfInvestigation: [],
      mechanismNotes: [],
      keyReferences: [R1],
      technicalNotes: [],
    },
  };
  if (b.slug !== a.slug) {
    overviews[b.slug] = {
      slug: b.slug,
      summary: null,
      researchContext: [],
      areasOfInvestigation: [],
      mechanismNotes: [
        statement(
          "fx-b-mechanism",
          [R3],
          "Aquí aparecerá una vía descrita por la fuente citada.",
          "A pathway described by the cited source will appear here.",
        ),
      ],
      keyReferences: [],
      technicalNotes: [],
    };
  }

  const areaOverviews: Partial<Record<DiscoveryAreaId, AreaOverview>> = {
    [area]: {
      area,
      summary: {
        id: "fx-area-summary",
        text: {
          es: "[MUESTRA FICTICIA] Aquí aparecerá la descripción aprobada del área.",
          en: "[FICTIONAL SAMPLE] The approved description of this area will appear here.",
        },
        provenance: approved("business-decision"),
      },
      themes: [
        statement(
          "fx-theme-1",
          [R1],
          "Aquí aparecerá un tema de investigación del área, redactado contra la referencia citada.",
          "A research theme for this area, written against the cited reference, will appear here.",
        ),
        statement(
          "fx-theme-2",
          [R4, R2],
          "Un segundo tema aparecerá aquí con sus propias citas.",
          "A second theme will appear here with its own citations.",
        ),
      ],
      pathways: [
        statement(
          "fx-pathway-1",
          [R2],
          "Aquí aparecerá una vía biológica tal como la nombra la fuente publicada.",
          "A biological pathway, as the published source names it, will appear here.",
        ),
      ],
      keyReferences: [R1],
    },
  };

  const lastVariant = a.variants[a.variants.length - 1];
  const lots: Lot[] = [
    {
      id: "LOTE-MUESTRA-FICTICIA-01",
      slug: a.slug,
      variantId: lastVariant.id,
      internalReference: "INTERNO-MUESTRA",
      supplierBatchReference: null,
      manufacturedOn: "2026-06-01",
      receivedOn: "2026-07-01",
      expiresOn: "2028-06-01",
      retestOn: null,
      status: "in-stock",
      publicVisibility: true,
    },
  ];

  const doc = (
    overrides: Partial<QualityDocument> & Pick<QualityDocument, "id" | "type" | "issuer" | "scope">,
  ): QualityDocument => ({
    file: null,
    reportId: null,
    reportUrl: `${SAMPLE_URL}/documento`,
    issuedOn: "2026-08-01",
    visibility: "public",
    status: "approved",
    ...overrides,
  });

  const documents: QualityDocument[] = [
    doc({
      id: "fx-coa",
      type: "coa",
      issuer: "neogen",
      scope: { level: "variant", slug: a.slug, variantId: a.variants[0].id },
    }),
    doc({
      id: "fx-lot-coa",
      type: "lot-coa",
      issuer: "neogen",
      scope: { level: "lot", lotId: lots[0].id },
      issuedOn: "2026-07-15",
    }),
    doc({
      id: "fx-third-party",
      type: "third-party-analysis",
      issuer: "janoshik",
      reportId: "MUESTRA-FICTICIA-0001",
      reportUrl: `${SAMPLE_URL}/informe-0001`,
      scope: { level: "variant", slug: b.slug, variantId: b.variants[0].id },
      issuedOn: "2026-08-20",
    }),
    doc({
      id: "fx-technical",
      type: "technical-document",
      issuer: "neogen",
      scope: { level: "product", slug: c.slug },
      issuedOn: "2026-05-10",
    }),
  ];

  return {
    areaOverviews,
    research: { overviews, areaOverviews, references: REFERENCES_FX },
    quality: { documents, lots, issuers: ISSUERS },
  };
}
