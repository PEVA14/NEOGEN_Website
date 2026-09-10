import type { DiscoveryAreaId, DiscoveryAssignment } from "./types";

/**
 * DISCOVERY ASSIGNMENTS — OWNER-CONFIRMED, 2026-09-10.
 *
 * The owner reviewed all 91 proposed pairs across the 85 published compounds
 * and approved every one; none were rejected and none were added. That review
 * is what makes these public: `isPublic()` admits them, so the area routes
 * exist, the areas appear in the sitemap and the catalogue filter, and each
 * product's PDP shows its area instead of its supplier category.
 *
 * WHAT AN ASSIGNMENT STILL IS. A merchandising decision: this is where the
 * owner wants a compound to appear in the shop. It is NOT a scientific
 * classification and asserts nothing about what any compound does. The
 * factual axis is `ProductType`, which remains separate and is still
 * `compound` for everything nobody has confirmed.
 *
 * UPGRADING TO A SOURCE. `owner-confirmed` is the weaker of the two public
 * provenances. As the reference registry is built, an assignment should move
 * to `{ kind: "source", referenceIds: [...] }`, which cites literature rather
 * than resting on one person's judgement. The shape already supports it and
 * `check:catalog` requires a non-empty citation list.
 *
 * TWO COMPOUNDS ARE DELIBERATELY UNASSIGNED — see the bottom of this file.
 */

/** Owner review of 2026-09-10. One date because it was one sitting. */
const CONFIRMED_ON = "2026-09-10";

const confirmed = (...areas: DiscoveryAreaId[]): DiscoveryAssignment[] =>
  areas.map((area) => ({
    area,
    provenance: { kind: "owner-confirmed", confirmedOn: CONFIRMED_ON },
  }));

export const ASSIGNMENTS: Readonly<Record<string, readonly DiscoveryAssignment[]>> = {
  /* --- Metabolic ----------------------------------------------------------- */
  "5-amino-1mq": confirmed("metabolic"),
  "adipotide-fttp": confirmed("metabolic"),
  aod9604: confirmed("metabolic"),
  cagrilintide: confirmed("metabolic"),
  "hgh-fragment-176-191": confirmed("metabolic", "growth"),
  "l-carnitine": confirmed("metabolic"),
  "lemon-bottle": confirmed("metabolic"),
  "lipo-c-with-b12": confirmed("metabolic"),
  "lipo-c-without-b12": confirmed("metabolic"),
  mazdutide: confirmed("metabolic"),
  reta: confirmed("metabolic"),
  semaglutide: confirmed("metabolic"),
  "slu-pp-332": confirmed("metabolic"),
  survodutide: confirmed("metabolic"),
  tesamorelin: confirmed("metabolic", "growth"),
  tirzepatide: confirmed("metabolic"),

  /* --- Recovery & Repair --------------------------------------------------- */
  "ahk-cu": confirmed("recovery", "skin"),
  "ara-290": confirmed("recovery"),
  "bpc-10mg-tb-10mg": confirmed("recovery"),
  "bpc-5mg-tb-5mg": confirmed("recovery"),
  bpc157: confirmed("recovery"),
  cartalax: confirmed("recovery"),
  "ghk-cu": confirmed("recovery", "skin"),
  glow: confirmed("recovery", "skin"),
  klow: confirmed("recovery", "skin"),
  kpv: confirmed("recovery"),
  "ll-37": confirmed("recovery"),
  tb500: confirmed("recovery"),
  thymalin: confirmed("recovery", "longevity"),
  "thymosin-alpha-1": confirmed("recovery"),
  vesugen: confirmed("recovery"),

  /* --- Longevity & Cellular ------------------------------------------------ */
  cardiogen: confirmed("longevity"),
  cortagen: confirmed("longevity"),
  crystagen: confirmed("longevity"),
  epithalon: confirmed("longevity"),
  "fox04-dir": confirmed("longevity"),
  glutathione: confirmed("longevity"),
  humanin: confirmed("longevity"),
  "mots-c": confirmed("longevity"),
  nad: confirmed("longevity"),
  pinealon: confirmed("longevity", "neuro"),
  "ss-31": confirmed("longevity"),
  "super-human-blend": confirmed("longevity"),

  /* --- Growth & Performance ------------------------------------------------ */
  "ace-031": confirmed("growth"),
  "cjc-1295-with-dac": confirmed("growth"),
  "cjc-1295-without-dac": confirmed("growth"),
  "cjc-1295-without-dac-ipamorelin": confirmed("growth"),
  "follistatin-344": confirmed("growth"),
  "gdf-8": confirmed("growth"),
  "ghrp-2-acetate": confirmed("growth"),
  "ghrp-6-acetate": confirmed("growth"),
  "hexarelin-acetate": confirmed("growth"),
  "igf-1lr3": confirmed("growth"),
  ipamorelin: confirmed("growth"),
  mgf: confirmed("growth"),
  "peg-mgf": confirmed("growth"),
  sermorelin: confirmed("growth"),

  /* --- Skin & Aesthetics --------------------------------------------------- */
  "healthy-hair-skin-nails-blend": confirmed("skin"),
  "melanotan-1": confirmed("skin"),
  "melanotan-2": confirmed("skin"),
  "snap-8": confirmed("skin"),

  /* --- Neuro & Sleep ------------------------------------------------------- */
  "adamax-with-adamantane": confirmed("neuro"),
  "adamax-without-adamantane": confirmed("neuro"),
  cerebrolysin: confirmed("neuro"),
  dihexa: confirmed("neuro"),
  dsip: confirmed("neuro"),
  melatonin: confirmed("neuro"),
  "p21-p021": confirmed("neuro"),
  "pe-22-28": confirmed("neuro"),
  "relaxation-pm": confirmed("neuro"),
  selank: confirmed("neuro"),
  "selank-semax": confirmed("neuro"),
  semax: confirmed("neuro"),

  /* --- Hormonal & Reproductive --------------------------------------------- */
  "gonadorelin-acetate": confirmed("hormonal"),
  hcg: confirmed("hormonal"),
  hmg: confirmed("hormonal"),
  "kisspeptin-10": confirmed("hormonal"),
  "oxytocin-acetate": confirmed("hormonal"),
  pt141: confirmed("hormonal"),
  vip: confirmed("hormonal"),

  /* --- Research Materials -------------------------------------------------- */
  "aa-water": confirmed("materials"),
  "bac-water": confirmed("materials"),
  "sterile-water": confirmed("materials"),
  /*
   * DELIBERATELY UNASSIGNED — reviewed and left out.
   *
   *   dermorphin            — commonly grouped under analgesia research, which
   *                           is not one of the eight areas and is the framing
   *                           most likely to read as a therapeutic promise.
   *   b12-methylcobalamin   — a vitamin; it would fit "materials" only if that
   *                           area widened beyond solvents.
   *
   * Both stay reachable by search, price, product type and the catalogue. A
   * product with no area is a supported state, not a gap to fill.
   */
};
