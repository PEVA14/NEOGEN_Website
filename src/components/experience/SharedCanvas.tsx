"use client";

import { Canvas, createPortal as createScenePortal, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Scene, type Material, type Mesh, type Texture } from "three";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import {
  compileScene,
  SceneContents,
  STAGE_CAMERA,
  StageScene,
  stageDpr,
  stageFrameloop,
} from "./RetaCanvas";
import { whenStill } from "./scrollQuiet";
import {
  markDrawn,
  markHostFailed,
  useDrawnStage,
  useKnownScenes,
  type HostedScene,
  type HostRequest,
} from "./stageHostStore";

/**
 * The homepage's one canvas, portalled into `StageHost`'s travelling
 * container. It is never unmounted while the page lives; it shows the scene
 * of whichever stage is active, and nothing (`frameloop="never"`) when none
 * is. Default-exported because it is loaded through `next/dynamic`.
 */
export default function SharedCanvas({
  container,
  active,
}: {
  container: HTMLElement;
  active: HostRequest | null;
}) {
  const [compiledKey, setCompiledKey] = useState<string | null>(null);
  /* The scene whose first frame has been presented — see `RevealWhenSized`. */
  const [firstFrameKey, setFirstFrameKey] = useState<string | null>(null);
  const scene = active?.scene ?? null;
  /* A new scene for a new stage, or when that stage's tier or motion
     preference changes: each is a different pose track and program set. */
  const key = active && scene ? `${active.id}:${scene.tier}:${scene.reducedMotion}` : null;
  const compiled = key !== null && compiledKey === key;
  /* The box the canvas fills, for a phone's pixel budget (`stageDpr`). */
  const box = useBoxSize(container);

  /*
   * PREPARE THE STAGES AHEAD (owner, 2026-09-30). The first visit to GLOW or
   * GHK-Cu still spent ~200–270 ms before its vial replaced the poster:
   * fetching and parsing its model, prefiltering its lighting, compiling its
   * programs (GLOW's glow light makes its own), uploading its label. None of it
   * depends on the section being on screen, so once the canvas has drawn its
   * first scene it prepares every other stage the page has announced, one at
   * a time and only when the main thread is idle — out of sight, in a scene
   * of its own (`WarmUp`). What it leaves behind is what a handover needs:
   * the prepared vial, the reflection map, the compiled programs and the
   * uploaded textures, all kept by this one renderer.
   */
  const known = useKnownScenes();
  const drawnStage = useDrawnStage();
  const activeWarmKey = scene ? warmKey(scene) : null;
  const [prepared, setPrepared] = useState<ReadonlySet<string>>(() => new Set());
  // A scene this canvas has already drawn needs no preparing.
  if (active && drawnStage === active.id && activeWarmKey && !prepared.has(activeWarmKey)) {
    setPrepared(new Set(prepared).add(activeWarmKey));
  }
  const [warming, setWarming] = useState<{ key: string; scene: HostedScene } | null>(null);
  const candidate =
    prepared.size > 0 && !warming
      ? known.find(({ scene: next }) => {
          const nextKey = warmKey(next);
          return !prepared.has(nextKey) && nextKey !== activeWarmKey;
        })
      : undefined;

  useEffect(() => {
    if (!candidate) return;
    const next = { key: warmKey(candidate.scene), scene: candidate.scene };
    /* Only while the page is still (owner, 2026-10-01: "stuttery"): measured,
       a preparation landing mid-scroll cost 50–130 ms. The stage stands in
       with its photograph meanwhile. Then at idle — Safari has no idle
       callback; a short delay is the nearest thing it offers. */
    const idle = (window as { requestIdleCallback?: Window["requestIdleCallback"] })
      .requestIdleCallback;
    let cancelIdle = () => {};
    /* And not while the reader is pointing or scrolling at all (owner,
       2026-10-04): a stage's preparation landing as the pointer crossed Tres
       mundos made the cards stall and the next scroll lag. */
    let cancelAgain = () => {};
    /* Still when the idle moment comes, too — or wait for stillness again. */
    const start = () => {
      cancelAgain = whenStill(() => setWarming(next));
    };
    const cancelQuiet = whenStill(() => {
      if (!idle) {
        const handle = window.setTimeout(start, 500);
        cancelIdle = () => window.clearTimeout(handle);
        return;
      }
      const handle = idle(start, { timeout: 3000 });
      cancelIdle = () => window.cancelIdleCallback(handle);
    });
    return () => {
      cancelQuiet();
      cancelIdle();
      cancelAgain();
    };
  }, [candidate]);

  /* A stage reached while it was still being prepared is simply shown; the
     preparation stops, so the vial is never in two scenes at once. */
  const warmingNow = warming && warming.key !== activeWarmKey ? warming : null;

  return createPortal(
    <CanvasErrorBoundary fallback={<Failed />}>
      <Canvas
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={scene ? stageDpr(scene.variant, scene.tier, box) : [1, 1.5]}
        camera={STAGE_CAMERA}
        frameloop={scene ? stageFrameloop(compiled, scene.reducedMotion) : "never"}
      >
        {active && scene && key ? (
          <Suspense fallback={null}>
            <StageScene
              key={key}
              {...scene}
              compiled={compiled}
              onCompiled={() => setCompiledKey(key)}
              onFirstFrame={() => setFirstFrameKey(key)}
              /* Drawn wherever it is until it has been revealed — so a stage
                 handed the canvas ahead of time, or handed it back, is ready
                 before it is in view — and then only on screen (owner,
                 2026-10-04: scrolling lagged after Tres mundos). RETA takes
                 the canvas while Tres mundos is still being read, and drew
                 its glass every frame out of sight the whole way down. */
              pauseOffscreen={drawnStage === active.id}
            />
          </Suspense>
        ) : null}
        {active && key && firstFrameKey === key ? (
          <RevealWhenSized key={key} container={container} onReady={() => markDrawn(active.id)} />
        ) : null}
        {warmingNow ? (
          <WarmUp
            key={warmingNow.key}
            scene={warmingNow.scene}
            onDone={() => {
              setPrepared((current) => new Set(current).add(warmingNow.key));
              setWarming(null);
            }}
          />
        ) : null}
      </Canvas>
    </CanvasErrorBoundary>,
    container,
  );
}

/**
 * DRAWN ONLY ONCE DRAWN AT THE NEW BOX'S SIZE (owner, 2026-09-30: the GLOW
 * and GHK-Cu vials "look really stretched" before they settle).
 *
 * The canvas is carried into a box of another shape — RETA's wide section to
 * GLOW's narrow one — and the renderer learns the new size a few frames after
 * the move. The new scene's first frame was therefore drawn at the OLD size
 * and stretched by the browser into the new box: GLOW's vial squeezed to half
 * its width on a phone, a quarter on a laptop, for up to seven frames, while
 * it faded in. So the host is told the scene is drawn (which starts the fade)
 * only once the renderer's size is the box's, and one frame has been
 * presented at it.
 */
function RevealWhenSized({ container, onReady }: { container: HTMLElement; onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  const ready = useRef(onReady);
  const done = useRef(false);
  useEffect(() => {
    ready.current = onReady;
  });
  // A frame to look at, under `frameloop="demand"` (reduced motion).
  useEffect(() => invalidate(), [invalidate]);

  useFrame((state) => {
    if (done.current) return;
    const { width, height } = state.size;
    if (
      Math.abs(width - container.clientWidth) > 1 ||
      Math.abs(height - container.clientHeight) > 1
    ) {
      state.invalidate();
      return;
    }
    done.current = true;
    // This frame is drawn at the right size; reveal once it is presented.
    requestAnimationFrame(() => ready.current());
  });
  return null;
}

/** An element's CSS size, kept current. */
function useBoxSize(element: HTMLElement): { width: number; height: number } | null {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setBox((current) =>
        current && Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return box;
}

/** The error boundary's fallback: every stage keeps its poster. */
function Failed() {
  useEffect(() => markHostFailed(), []);
  return null;
}

/** Two stages that would build the same programs and textures share a key. */
function warmKey(scene: HostedScene): string {
  return [scene.modelPath, scene.world, scene.tier, scene.variant, scene.reducedMotion].join("|");
}

/** The texture slots a stage's materials use. */
const TEXTURE_SLOTS = ["map", "roughnessMap", "normalMap", "bumpMap", "metalnessMap"] as const;

/**
 * A stage's scene, built where nothing draws it — a scene of its own, under
 * this canvas's renderer — then compiled, uploaded and let go.
 */
function WarmUp({ scene, onDone }: { scene: HostedScene; onDone: () => void }) {
  const [target] = useState(() => new Scene());
  return createScenePortal(
    <Suspense fallback={null}>
      <SceneContents {...scene} detached />
      <WarmCompile target={target} onDone={onDone} />
    </Suspense>,
    target,
  );
}

/** Runs once the portal's contents (model included) are in `target`. */
function WarmCompile({ target, onDone }: { target: Scene; onDone: () => void }) {
  const get = useThree((state) => state.get);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    let live = true;
    const { gl, camera } = get();
    void compileScene(gl, target, camera).then(() => {
      if (!live) return;
      // Upload every texture now, so the first real frame has none to send.
      target.traverse((object) => {
        const material = (object as Mesh).material as Material | Material[] | undefined;
        for (const each of Array.isArray(material) ? material : material ? [material] : []) {
          for (const slot of TEXTURE_SLOTS) {
            const texture = (each as unknown as Record<string, Texture | null | undefined>)[slot];
            if (texture?.isTexture) gl.initTexture(texture);
          }
        }
      });
      done.current();
    });
    return () => {
      live = false;
    };
  }, [get, target]);

  return null;
}
