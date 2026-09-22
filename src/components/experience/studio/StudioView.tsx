"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MEDIA } from "@/content/media/registry";

import { loadBrandArtwork, type StudioLabel } from "./label";
import { GHK_RIG, GLOW_RIG, NEUTRAL_RIG, RETA_RIG, type StudioRig } from "./rig";

const StudioScene = dynamic(() => import("./StudioScene"), { ssr: false });

/**
 * The canonical NEOGEN container (owner, 2026-09-18): RETA's real vial, now the
 * second-generation export. Its label sheet has the same printed strip geometry
 * as the first (x 18, 455px of 2048), which is what `drawLabel` is calibrated
 * to — so the neutral rig's generated labels still land on the same panel.
 */
/*
 * THE CANONICAL CONTAINER IS RETA'S VIAL — whichever one RETA currently ships.
 *
 * The owner's rule (2026-09-18) is that RETA's model IS NEOGEN's physical
 * packaging and every product in that packaging is photographed on it. That
 * used to be a hard-coded path, which silently left generic products on the
 * old jar when RETA moved to the V4 crimp-top. Reading it from the registry
 * keeps the two in step; `reta-v2.glb` is only the fallback.
 *
 * The flagship's PRINTED label never reaches a generic product: a product
 * without artwork of its own always wears the label drawn from its registry
 * data (`label` below), whatever the container prints.
 */
const CONTAINER = MEDIA.reta?.model ?? "/models/reta-v2.glb";

/**
 * Flagships have their own rig; every other product is the neutral rig on the
 * canonical container, wearing its registry label.
 */
const FLAGSHIPS: Record<string, StudioRig> = {
  reta: RETA_RIG,
  glow: GLOW_RIG,
  "ghk-cu": GHK_RIG,
};

/**
 * The studio's viewfinder — development only.
 *
 * A fixed 4:5 frame (the catalogue's product frame) at a known pixel size, so
 * a capture is deterministic. `?yaw=`, `?exp=`, `?fov=`, `?cy=` and `?cz=`
 * override the rig while iterating; the committed rig is what ships.
 */
export function StudioView({
  slug,
  label,
  model,
}: {
  slug: string;
  label: StudioLabel;
  /**
   * The product's OWN model, when the registry declares one. A flagship wears
   * its own printed label, so it must be photographed as itself — rendering
   * every product on the canonical container put RETA's label on GLOW.
   */
  model: string | null;
}) {
  const params = useSearchParams();
  const flagship = FLAGSHIPS[slug];
  /*
   * TWO DEVELOPMENT OVERRIDES, for trying an export before committing to it:
   *
   *   ?model=/models/reta-v7.glb   photograph a file the registry does not
   *                                point at yet
   *   ?label=drawn                 ignore the model's PRINTED label and use
   *                                the one drawn from registry data
   *
   * The second earns its place: a flagship's printed label is artwork that
   * arrives from Blender, and what it says has to be checked against the
   * product record before it reaches a customer. Being able to render the same
   * geometry with the generated label is how a bad strip gets caught — and how
   * the vial can ship while corrected artwork is still being drawn.
   */
  const modelOverride = params.get("model");
  const labelMode = params.get("label");
  const drawnLabel = labelMode === "drawn";
  /* `printed` keeps whatever the GLB prints, even on a product that would
     normally wear a label drawn from its own registry data. */
  const printedLabel = labelMode === "printed";
  const entry = {
    model: modelOverride ?? model ?? CONTAINER,
    rig: flagship ?? NEUTRAL_RIG,
    // A flagship's model carries its own printed label, unless asked otherwise.
    label: printedLabel || (flagship && !drawnLabel) ? null : label,
  };
  /*
   * The label is drawn — in the site's face, over the brand artwork — so both
   * have to be in hand before the scene mounts. Neither can be awaited inside
   * the draw, and a capture that starts first photographs a label set in a
   * fallback font with the lockup missing.
   */
  const [assets, setAssets] = useState(false);
  useEffect(() => {
    void Promise.all([document.fonts.ready, loadBrandArtwork()]).then(() => setAssets(true));
  }, []);
  const rig = useMemo(() => {
    const num = (key: string, fallback: number) => {
      const raw = params.get(key);
      return raw === null || Number.isNaN(Number(raw)) ? fallback : Number(raw);
    };
    const base = entry.rig;
    return {
      ...base,
      yaw: num("yaw", base.yaw),
      exposure: num("exp", base.exposure),
      fov: num("fov", base.fov),
      camera: [base.camera[0], num("cy", base.camera[1]), num("cz", base.camera[2])],
    } satisfies StudioRig;
  }, [entry.rig, params]);

  if (!assets) return null;
  const width = Number(params.get("w") ?? 800);

  return (
    <>
      <div
        style={{
          width,
          aspectRatio: "4 / 5",
          margin: "0 auto",
          background: "#05070c",
        }}
        data-studio-frame=""
      >
        <StudioScene
          modelPath={entry.model}
          rig={rig}
          label={entry.label}
          dpr={Number(params.get("dpr") ?? 2)}
        />
      </div>
      {/* Regenerate the still with one click: the frame is rendered at 2× and
          downloaded as a PNG, then saved as public/images/products/<slug>/studio.jpg. */}
      <button
        type="button"
        onClick={() => {
          const data = window.__studio?.capture();
          if (!data) return;
          const link = document.createElement("a");
          link.href = data;
          link.download = `${slug}-studio.png`;
          link.click();
        }}
        style={{
          display: "block",
          margin: "16px auto 0",
          padding: "12px 20px",
          font: "inherit",
          background: "#faf9f6",
          color: "#111",
          border: 0,
          cursor: "pointer",
        }}
      >
        Capture still ({width * 2}×{Math.round(width * 2.5)})
      </button>
    </>
  );
}
