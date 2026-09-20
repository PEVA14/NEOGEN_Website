"use client";

import dynamic from "next/dynamic";
import { Suspense, useRef, type ReactNode } from "react";

import { getWorld, type WorldId } from "@/config/worlds";
import { useSectionProgress } from "@/hooks/useSectionProgress";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { useVialStage } from "./useVialStage";

/**
 * Same dynamic import as every other stage, so the three.js chunk is shared
 * and a page that mounts two moments still downloads it once.
 */
const RetaCanvas = dynamic(() => import("./RetaCanvas"), { ssr: false });

/**
 * A PRODUCT, LIVE, INSIDE A SECTION OF TYPE — the GLOW and GHK-Cu moments.
 *
 * The homepage's flagship sections used to show the drawn silhouette while
 * RETA alone got the real object. Now that GLOW and GHK-Cu have their own
 * vials, each section shows its own product in its own world: the amber one
 * lit from within, the copper one on its plinth.
 *
 * WHAT MAKES THIS SAFE TO ADD TWICE. Stages arbitrate for a single WebGL
 * context (`useVialStage`): whichever is most on screen holds it, and the
 * others render the static plate. Scrolling the homepage therefore hands one
 * canvas from the RETA scene to GLOW to GHK-Cu rather than running three. The
 * GLB is fetched only once its section is close, and never at all for a reader
 * who does not scroll that far.
 *
 * THE FALLBACK IS THE SECTION'S OWN DRAWING, passed as children: the same
 * `SpecimenPlate` that was there before. It paints first, covers the load,
 * and is what a reader without WebGL keeps — so nothing here is load-bearing
 * for understanding the product.
 */
export function MomentStage({
  world,
  modelPath,
  label,
  className,
  children,
}: {
  world: WorldId;
  /** Null when the product has no model; the plate then stands alone. */
  modelPath: string | null;
  /** Accessible name for the live object. */
  label: string;
  className?: string;
  /** The static plate: first paint, loading state, and no-WebGL fallback. */
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, palette, canRender3D } = useVialStage(box, { modelPath });
  const progress = useSectionProgress(box, { mode: "through" });
  const environment = getWorld(world).environment;

  return (
    <div
      ref={box}
      className={className}
      data-tier={tier}
      /* Cinematic tier: `motion.css` neutralises anything under this attribute
         for a reader who prefers reduced motion (CONVENTIONS §4). */
      data-motion="cinematic"
      role="img"
      aria-label={label}
    >
      {canRender3D && modelPath && palette ? (
        <CanvasErrorBoundary fallback={children}>
          <Suspense fallback={children}>
            <RetaCanvas
              modelPath={modelPath}
              environment={environment}
              palette={palette}
              progress={progress}
              reducedMotion={reducedMotion}
              tier={tier}
              variant="moment"
              /*
               * The canvas COVERS the stage box rather than being laid out by
               * it. A renderer container sized by percentages inside a centred
               * box resolves against a canvas's intrinsic 300 × 150 and comes
               * out squashed; absolute over a box with a known aspect is
               * deterministic at every viewport.
               */
              fill
            />
          </Suspense>
        </CanvasErrorBoundary>
      ) : (
        children
      )}
    </div>
  );
}
