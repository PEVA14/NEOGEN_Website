"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { NEUTRAL_RIG, RETA_RIG, type StudioRig } from "./rig";

import type { StudioLabel } from "./label";

const StudioScene = dynamic(() => import("./StudioScene"), { ssr: false });

/** The canonical NEOGEN container (owner, 2026-09-18): RETA's real vial. */
const CONTAINER = "/models/reta.glb";

/**
 * Flagships have their own rig; every other product is the neutral rig on the
 * canonical container, wearing its registry label.
 */
const FLAGSHIPS: Record<string, StudioRig> = {
  reta: RETA_RIG,
};

/**
 * The studio's viewfinder — development only.
 *
 * A fixed 4:5 frame (the catalogue's product frame) at a known pixel size, so
 * a capture is deterministic. `?yaw=`, `?exp=`, `?fov=`, `?cy=` and `?cz=`
 * override the rig while iterating; the committed rig is what ships.
 */
export function StudioView({ slug, label }: { slug: string; label: StudioLabel }) {
  const params = useSearchParams();
  const flagship = FLAGSHIPS[slug];
  const entry = {
    model: CONTAINER,
    rig: flagship ?? NEUTRAL_RIG,
    // A flagship's model carries its own printed label.
    label: flagship ? null : label,
  };
  // The label is drawn in the site's face: wait for it, or the capture sets
  // the type in a fallback font.
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    void document.fonts.ready.then(() => setFonts(true));
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

  if (!fonts) return null;
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
