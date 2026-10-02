import Image from "next/image";
import { ViewTransition } from "react";

import { names, type Specimen, type StageStandIn } from "./specimens";

import styles from "./SpecimenLayers.module.css";
import "./vial-transition.css";

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
            /* Found by the card on tap: where a world's light starts. */
            data-specimen=""
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
 * THE LIVE VIAL'S FIRST FRAME, STANDING IN FOR IT.
 *
 * On a flagship page the set is not a studio sweep but the world itself, so
 * only the object is drawn — and not the catalogue's photograph of it but the
 * product page's own: its canvas, photographed as the first frame draws it
 * (`StageStandIn`). Placed by its box in the media frame, it is that frame to
 * the pixel, so when the canvas has drawn (`live`) and the stand-in dissolves,
 * nothing changes but that the vial begins to turn.
 *
 * THE FLIGHT. The element is the vial's UPRIGHT box, turned to the lean; the
 * photograph inside it is turned back by the same angle, so at rest the two
 * cancel exactly. A view transition snapshots an element without its own
 * transform and animates that transform from the card's — so the vial leaves
 * the card upright and takes the lean as it lands.
 */
export function StageSpecimen({
  slug,
  stage,
  live,
  onShare,
}: {
  slug: string;
  stage: StageStandIn;
  live: boolean;
  onShare?: (instance: unknown) => void;
}) {
  const { crop, centre, upright, lean } = stage;
  const left = centre.x - upright.w / 2;
  const top = centre.y - upright.h / 2;
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
          left: pct(left),
          top: pct(top),
          width: pct(upright.w),
          height: pct(upright.h),
          rotate: `${lean}deg`,
        }}
      >
        <span
          className={styles.stagePhoto}
          style={{
            left: pct((crop.x - left) / upright.w),
            top: pct((crop.y - top) / upright.h),
            width: pct(crop.w / upright.w),
            height: pct(crop.h / upright.h),
            transformOrigin: `${pct((centre.x - crop.x) / crop.w)} ${pct((centre.y - crop.y) / crop.h)}`,
            rotate: `${-lean}deg`,
          }}
        >
          <Image src={stage.src} alt="" fill sizes={stageSizes(stage)} priority />
        </span>
      </span>
    </ViewTransition>
  );
}

/**
 * `sizes` for a stand-in: its share of the media frame, which is 34rem wide at
 * most beside the commerce column and 26rem at most above it (ProductStage).
 */
export function stageSizes(stage: StageStandIn): string {
  return scaleSizes("(min-width: 64rem) 34rem, 26rem", stage.crop.w);
}

/** Scale every length in a `sizes` string by the cut-out's share of the frame. */
export function scaleSizes(sizes: string, share: number): string {
  return sizes.replace(/(\d+(?:\.\d+)?)(rem|vw|px)/g, (_, n: string, unit: string) => {
    const scaled = Number(n) * share;
    return `${unit === "px" ? Math.ceil(scaled) : scaled.toFixed(2)}${unit}`;
  });
}
