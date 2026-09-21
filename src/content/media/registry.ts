import type { ProductMedia } from "./types";

/**
 * THE MEDIA REGISTRY — every declared asset, keyed by product slug.
 *
 * A file in `public/` does nothing until it is named here. That indirection is
 * the point: it keeps alt text mandatory, keeps intrinsic dimensions next to
 * the path where a validator can check both, and means one entry lights a
 * product up across the card, the product page and its social card at once.
 *
 * SPARSE ON PURPOSE. A product with no entry is not an error and not a gap in
 * the data — it is a product that has not been photographed. `productMedia()`
 * fills in the empty shape, so no component has to know the difference.
 *
 * See `public/images/README.md` for where the files go.
 */
export const MEDIA: Readonly<Record<string, Partial<ProductMedia>>> = {
  /*
   * RETA — the third-generation vial (owner export, 2026-09-21).
   *
   * `reta-v3.glb` supersedes `reta-v2.glb`, which superseded `reta.glb`. The
   * filename carries the version because models are served with a one-year
   * immutable cache — a changed file under the old name would never be fetched.
   *
   * V3 SETTLES IN BLENDER WHAT THE BUILD WAS DOING BY HAND: it carries ONE
   * closure, so the `--drop` of the interpenetrating autosampler lid is gone,
   * and its cap is already Ø112.0 mm against the Ø113.2 mm that
   * `--scale-node … 0.92` was producing, so that flag is gone too. Its label
   * band is taller and lower on the body, which is why the printing reads
   * larger.
   *
   * ITS PRINTED LABEL IS A MOCK-UP, AND IT IS NOT PUBLISHABLE COPY. The strip
   * reads "RETATRUTIDE · 10 ML · INJECTABLE PEPTIDE ● 99% PURITY ·
   * SUBCUTANEOUS USE". Two of those lines are routes of administration for
   * human use, the purity figure is analytical evidence that exists for no
   * product here, and the volume matches no presentation — this product sells
   * 5–60 MG in packs of ten.
   *
   * It ships anyway, on purpose: the owner is designing the packaging and
   * asked to see the artwork in place while it is still a draft (2026-09-21).
   * THE SITE IS NOT PUBLIC — no domain, no processor, classification review
   * outstanding — so nobody is reading it but the owner.
   *
   * It is declared in `DEMO_ARTWORK` below, which is what keeps it from
   * becoming permanent by inattention: `check:media` names it on every run,
   * and it is a launch blocker in `PROJECT_STATE.md` §6. One command puts a
   * compliant label on the same geometry when the draft is settled —
   * `public/models/README.md`, "the printed strip, replaced".
   *
   * `reta-v2.glb` STAYS: it is the canonical container every non-flagship
   * product is rendered on, and the label geometry `studio/label.ts` is
   * measured against.
   *
   * There is no photograph and no rendered poster, so the viewer falls back to
   * the diagrammatic silhouette while it loads and for anyone without WebGL.
   *
   * TODO(assets): capture `poster.jpg` from the live scene once its lighting
   * is signed off. A poster that disagrees with the canvas is worse than none,
   * which is why this is null rather than a rough render.
   */
  reta: {
    model: "/models/reta-v3.glb",
    /*
     * THE STUDIO STILL (prototype, 2026-09-18, awaiting owner approval).
     *
     * The real GLB — its geometry and its own RETA label — rendered by the
     * studio rig (`components/experience/studio/rig.ts`, RETA_RIG) and captured
     * at 1600×2000 from `/es/estudio/reta`. A render, not a photograph: it is
     * the catalogue card's image and never the product's `primary`.
     *
     * VERSIONED FILENAME, re-captured on the third-generation vial
     * (2026-09-21). Images carry a one-year immutable cache and the optimizer
     * keys on the URL, so re-rendering into the old name leaves every visitor —
     * and the local dev server — looking at the previous picture.
     */
    studio: {
      src: "/images/products/reta/studio-v4.jpg",
      alt: "Vial RETA de NEOGEN: render de estudio del modelo 3D, etiqueta al frente, sobre fondo azul oscuro.",
      width: 1600,
      height: 2000,
    },
  },

  /*
   * SEMAGLUTIDE — the NEUTRAL studio prototype (2026-09-18, awaiting owner
   * approval; not yet propagated).
   *
   * No model of its own: it ships in the canonical NEOGEN container, whose
   * real geometry is `reta-v2.glb` (owner, 2026-09-18). Rendered by NEUTRAL_RIG
   * with a label drawn from its registry name and presentation range in the
   * real RETA label's layout (`components/experience/studio/label.ts`).
   *
   * v5 (2026-09-20): the drawn label now prints the brand LOCKUP — the mark and
   * NEOGEN / PEPTIDES, from `public/branding/` — where it used to set the word
   * "NEOGEN" in the site's face, at a size the still can actually carry. The flagships already carried the lockup in
   * their baked artwork; this is what closes the gap for every product that
   * wears a generated label.
   */
  semaglutide: {
    studio: {
      src: "/images/products/semaglutide/studio-v5.jpg",
      alt: "Vial de Semaglutide de NEOGEN: render de estudio del envase NEOGEN, etiqueta al frente, sobre fondo neutro.",
      width: 1600,
      height: 2000,
    },
  },

  /*
   * GHK-Cu — its own vial (owner export, 2026-09-19).
   *
   * The same container as RETA, carrying the printed GHK-Cu label, so the
   * product page now opens on the real object inside the copper world rather
   * than on the world alone. No photograph and no studio still yet: the
   * silhouette covers the load and the no-WebGL case, as it does for RETA.
   */
  "ghk-cu": {
    model: "/models/ghk-cu.glb",
    /* Its own vial on the copper rig (GHK_RIG): a neutral key so the label
       stays true, and copper laid down the right edge of the glass. */
    studio: {
      src: "/images/products/ghk-cu/studio-v2.jpg",
      alt: "Vial GHK-Cu de NEOGEN: render de estudio del modelo 3D, etiqueta al frente, sobre fondo cobre oscuro.",
      width: 1600,
      height: 2000,
    },
  },

  /*
   * GLOW — its own vial (owner export, 2026-09-20).
   *
   * The same container and the same printed-label geometry as RETA and GHK-Cu,
   * carrying the GLOW artwork, inside the amber world.
   *
   * All three flagships now ship a model. Every other product still resolves to
   * the world or the silhouette, which stays the correct answer for a product
   * nobody has modelled or photographed — see the note on Semaglutide above.
   */
  glow: {
    model: "/models/glow.glb",
    /* Its own vial on the amber rig (GLOW_RIG): the pool behind the glass lights
       it from behind, and the cap takes the world's gold. */
    studio: {
      src: "/images/products/glow/studio-v2.jpg",
      alt: "Vial GLOW de NEOGEN: render de estudio del modelo 3D, etiqueta al frente, sobre fondo ámbar oscuro.",
      width: 1600,
      height: 2000,
    },
  },
};

/**
 * ARTWORK THAT IS A DRAFT, AND MUST NOT GO PUBLIC AS IT IS.
 *
 * A printed label is read by a customer, so what it says is content and is
 * held to the same rule as any other public sentence. A model can nevertheless
 * be useful with draft artwork on it — the owner is designing the packaging
 * and needs to see it in place — so the file ships and the debt is DECLARED
 * rather than remembered.
 *
 * `check:media` prints every entry here on every run, and §6 of
 * `PROJECT_STATE.md` carries it as a launch blocker. An empty list is the
 * normal state; an entry is a promise to come back.
 */
export const DEMO_ARTWORK: readonly { model: string; says: string; why: string }[] = [
  {
    model: "/models/reta-v3.glb",
    says: "RETATRUTIDE · 10 ML · INJECTABLE PEPTIDE ● 99% PURITY · SUBCUTANEOUS USE",
    why:
      "Routes of administration for human use, a purity figure no analysis supports, " +
      "and a volume matching no presentation (this product sells 5-60 MG). Owner is " +
      "iterating on the packaging (2026-09-21); replace the strip before the site is " +
      "public - `prepare-model.mjs --label`, see public/models/README.md.",
  },
];
