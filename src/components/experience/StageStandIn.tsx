"use client";

import { useState, type CSSProperties } from "react";

import shots from "./homeStandIns.json";
import styles from "./StageStandIn.module.css";

/** The homepage's 3D stages, as `data-home-stage` names them. */
export type HomeStage = "hero" | "reta" | "glow" | "ghk-cu";

/**
 * One photograph of a stage's first frame (`scripts/capture-home.mjs`): the
 * shared canvas alone, in reduced motion, cropped to the vial.
 *
 * Where it goes is stored as the canvas places the vial, so it holds at any
 * box size: the vial's size and its own offsets follow the canvas HEIGHT (the
 * lens is fixed vertically), and the track's horizontal offset follows its
 * WIDTH. So the crop's top-left is `(50% + anchorX·W + x·H, 50% + y·H)` and its
 * size `w·H × h·H`.
 */
interface Shot {
  src: string;
  width: number;
  height: number;
  /** The track's horizontal offset, as a share of the canvas width. */
  anchorX: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The model it was photographed from (`check:media`). */
  model: string;
}

/** Per stage: the shot for each tier, or null where there is none. */
type Entry = { full: Shot | null; compact: Shot | null };

const SHOTS = shots as Partial<Record<HomeStage, Entry>>;

/** Whether `stage` has a stand-in photographed for at least one tier. */
export function hasStandIn(stage: HomeStage): boolean {
  const entry = SHOTS[stage];
  return Boolean(entry && (entry.full || entry.compact));
}

/**
 * THE VIAL BEFORE IT IS LIVE (owner, 2026-10-01: "I don't like that the
 * models take a while to load … add a non-3d render while it loads").
 *
 * A photograph of the frame the stage's canvas draws first, standing exactly
 * where that frame will be, from the first paint — so the section is complete
 * at once and the live vial, fading in over it, replaces it unseen. Hidden
 * once the canvas has drawn here and faded in (`live`), for good.
 *
 * Not the earlier placeholders (a drawn vial or the section's plate, which
 * the owner turned down on 2026-09-30): this is the vial itself, in its pose.
 */
export function StageStandIn({
  stage,
  live,
  priority = false,
}: {
  stage: HomeStage;
  /** The canvas has drawn this stage (and is fading in over this). */
  live: boolean;
  /** The hero's: fetched first, as the page's largest picture. */
  priority?: boolean;
}) {
  /*
   * FOR THE FIRST ARRIVAL ONLY (owner, 2026-10-01: scrolling back up, "you see
   * two renders and it looks glitchy"). The photograph is the stage's FIRST
   * frame — the hero at the top of the page, a moment at its held pose. Coming
   * back, the live vial returns in the pose of the scroll position it is met
   * at — the hero turned and moved along its arc — and fading it in over the
   * photograph showed two vials. Once the canvas has drawn here the photograph
   * stays away; a stage handed the canvas back draws at once, usually before
   * it is in view (`SharedCanvas` draws off screen until the stage is
   * revealed, then only on screen).
   *
   * (A copy of the canvas's last frame stood in on returns for a day; read
   * back from WebGL, Safari drew it overexposed through the glass. Not kept.)
   */
  const [seen, setSeen] = useState(false);
  if (live && !seen) setSeen(true);

  const entry = SHOTS[stage];
  if (!entry || (!entry.full && !entry.compact)) return null;
  const { full, compact } = entry;
  const base = full ?? compact!;

  const place = (shot: Shot | null, tier: "full" | "compact") =>
    shot
      ? {
          [`--${tier}-ax`]: shot.anchorX,
          [`--${tier}-x`]: shot.x,
          [`--${tier}-y`]: shot.y,
          [`--${tier}-w`]: shot.w,
          [`--${tier}-h`]: shot.h,
        }
      : {};
  const style = { ...place(full, "full"), ...place(compact, "compact") } as CSSProperties;

  return (
    <div
      className={styles.frame}
      data-live={live || seen ? "" : undefined}
      data-full={full ? "" : undefined}
      data-compact={compact ? "" : undefined}
      aria-hidden="true"
    >
      <picture>
        {compact && full && compact.src !== full.src ? (
          <source media="(max-width: 47.99rem)" srcSet={compact.src} />
        ) : null}
        {/* Placed by the canvas's geometry, not laid out: a plain img. */}
        <img
          className={styles.shot}
          src={base.src}
          width={base.width}
          height={base.height}
          alt=""
          style={style}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      </picture>
    </div>
  );
}
