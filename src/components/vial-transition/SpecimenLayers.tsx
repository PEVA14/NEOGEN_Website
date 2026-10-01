import Image from "next/image";
import { ViewTransition } from "react";

import { names, type Specimen } from "./specimens";

import styles from "./SpecimenLayers.module.css";
import "./vial-transition.css";

/*
 * The 3D presenter's own geometry (`VialModel`, `choreography.ts#PRESENTER`),
 * restated so the still can land exactly where the live object will appear.
 * If the presenter changes, these move with it — see README, "Before
 * productionizing".
 */
/** `FIT_IN_PANEL`: the object's length as a fraction of the media frame height. */
const PRESENTER_FIT = 0.62;
/** `rotationZ: -0.26` rad — the diagonal, cap resting to the right. */
const PRESENTER_LEAN_DEG = (0.26 * 180) / Math.PI;
/*
 * MEASURED, not derived: where the live RETA object actually lands relative to
 * the geometry above (label centroid, 1440×900, reduced motion so it is still).
 * The 3D object sits ~2.7% right and ~2.6% low of the frame centre and reads a
 * little larger — perspective, and the object's front surface being nearer the
 * camera than its axis. It is ALSO ~8% wider for its length, which no nudge can
 * fix: the still comes from the studio rig and the live object from the
 * presenter's, and they are different lenses. See README.
 */
const STAGE_NUDGE = { x: 0.027, y: 0.026, scale: 1.04 };

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/** How much closer the product page frames the specimen than the card does. */
const PLATE_MAGNIFICATION = 1.16;

/**
 * A STUDIO STILL AS TWO LAYERS: the set, and the object standing in it.
 *
 * At rest this is indistinguishable from the single still it replaces (checked
 * by the capture script). What the split buys is that the two can LEAVE
 * separately: the object is named as its own view-transition participant, so on
 * the way to the product page it lifts off the set and travels, and the set —
 * with the reflection and the shadow the object cast on it — stays behind with
 * the page it belongs to. The set does NOT travel: when it did, set and object
 * moved together at one scale and the flight read as a photograph being
 * enlarged, which is the one thing this must not look like.
 *
 * `card`  fills whatever box the card gives it, cropped exactly as the card's
 *         `object-fit: cover` photograph was (the flagship card's stage is not
 *         4:5), so the two layers stay registered at every card shape.
 * `plate` the product page's 4:5 frame.
 */
export function SpecimenLayers({
  slug,
  specimen,
  alt,
  variant,
  sizes,
  priority = false,
  world = false,
  named = true,
}: {
  slug: string;
  specimen: Specimen;
  alt: string;
  variant: "card" | "plate";
  /**
   * Whether this copy carries the transition names right now. A card that can
   * appear twice on a page (the strip and the grid) names itself only while it
   * is the ARMED card — see `armed.ts`. The boundaries stay mounted either way;
   * an unnamed one is `auto`, which never pairs with anything.
   */
  named?: boolean;
  /**
   * A flagship card: its stage is paired with the product page's world, which
   * opens out of it. The set itself still does not travel.
   */
  world?: boolean;
  /** `sizes` for the FRAME; the cut-out's is derived from its share of it. */
  sizes: string;
  priority?: boolean;
}) {
  const { box, object } = specimen;
  /*
   * MAGNIFICATION. On the product page the same still is framed closer: the
   * object grows more than its frame does, around its own centre, and the set
   * is cropped by the frame. That — not a bigger picture — is what "examined
   * more closely" means. The card is the 1x view.
   */
  const magnify = variant === "plate" ? PLATE_MAGNIFICATION : 1;
  const originX = object.x + object.w / 2;
  const originY = object.y + object.h / 2;
  const frame = (
    <span className={styles.frame} data-variant={variant}>
      <span
        className={styles.fit}
        style={
          magnify === 1
            ? undefined
            : { scale: String(magnify), transformOrigin: `${pct(originX)} ${pct(originY)}` }
        }
      >
        <Image
          src={specimen.ground}
          alt=""
          fill
          sizes={sizes}
          className={styles.ground}
          priority={priority}
        />
        <ViewTransition
          name={named ? names.specimen(slug) : "auto"}
          share="vt-specimen"
          default="none"
        >
          <span
            className={styles.specimen}
            style={{
              left: pct(box.x),
              top: pct(box.y),
              width: pct(box.w),
              height: pct(box.h),
            }}
          >
            <Image
              src={specimen.specimen}
              alt={alt}
              fill
              sizes={scaleSizes(sizes, box.w)}
              className={styles.cutout}
              priority={priority}
            />
          </span>
        </ViewTransition>
      </span>
    </span>
  );
  if (!world) return frame;
  /*
   * The world's pair is an EMPTY proxy over the card's stage, not the stage
   * itself. A named element is cut out of its page's snapshot, so naming the
   * stage left a hole in the card that the opening circle then had to cover
   * from its first frame — it started larger than the card, over its
   * neighbours. With a proxy the card stays whole, and the circle can start
   * inside the card's own dark stage, where it is invisible, and grow out.
   */
  return (
    <>
      {frame}
      <ViewTransition name={named ? names.world(slug) : "auto"} share="vt-world" default="none">
        <span className={styles.worldProxy} aria-hidden="true" />
      </ViewTransition>
    </>
  );
}

/**
 * THE SAME OBJECT, PLACED WHERE THE LIVE 3D ONE WILL STAND.
 *
 * On a flagship page the set is not a studio sweep but the world itself, so
 * only the object is drawn — centred in the media frame, at the presenter's
 * size, on the presenter's lean. The flight therefore ends with the object
 * already at the pose the 3D model takes, and the lean is part of the flight:
 * the specimen is picked up upright off the card and tilted for examination.
 *
 * It stays as the stand-in while the canvas boots, then dissolves once the
 * canvas has drawn (`live`).
 */
export function StageSpecimen({
  slug,
  specimen,
  live,
  onShare,
}: {
  slug: string;
  specimen: Specimen;
  live: boolean;
  onShare?: (instance: unknown) => void;
}) {
  const { box, object } = specimen;
  // The object's centre inside the cut-out's (padded) box.
  const cx = (object.x + object.w / 2 - box.x) / box.w;
  const cy = (object.y + object.h / 2 - box.y) / box.h;
  return (
    <ViewTransition
      name={names.specimen(slug)}
      share="vt-specimen"
      default="none"
      onShare={onShare}
    >
      <span
        className={styles.stageSpecimen}
        /* The stage's canvas layer is already the object's accessible image
           (role="img", named after the product); this stand-in is its picture,
           and announcing both would say the product twice. */
        aria-hidden="true"
        data-live={live ? "" : undefined}
        style={{
          left: `calc(50% + ${pct(STAGE_NUDGE.x)})`,
          top: `calc(50% + ${pct(STAGE_NUDGE.y)})`,
          height: pct((box.h * PRESENTER_FIT * STAGE_NUDGE.scale) / object.h),
          aspectRatio: `${box.width} / ${box.height}`,
          transformOrigin: `${pct(cx)} ${pct(cy)}`,
          transform: `translate(${pct(-cx)}, ${pct(-cy)}) rotate(${PRESENTER_LEAN_DEG.toFixed(3)}deg)`,
        }}
      >
        <Image
          src={specimen.specimen}
          alt=""
          fill
          sizes={STAGE_SPECIMEN_SIZES}
          className={styles.cutout}
          priority
        />
      </span>
    </ViewTransition>
  );
}

/** `sizes` for the cut-out on a flagship stage. */
export const STAGE_SPECIMEN_SIZES = "(min-width: 64rem) 16rem, 45vw";

/** Scale every length in a `sizes` string by the cut-out's share of the frame. */
export function scaleSizes(sizes: string, share: number): string {
  return sizes.replace(/(\d+(?:\.\d+)?)(rem|vw|px)/g, (_, n: string, unit: string) => {
    const scaled = Number(n) * share;
    return `${unit === "px" ? Math.ceil(scaled) : scaled.toFixed(2)}${unit}`;
  });
}
