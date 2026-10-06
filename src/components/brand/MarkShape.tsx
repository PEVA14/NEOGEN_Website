import { MARK_ARMS, MARK_BOX, MARK_HUB } from "./markGeometry";

/**
 * The NEOGEN mark as static SVG shapes, for drawings that are themselves SVG
 * (`SpecimenPlate`'s label): the same measured geometry as `NeogenMark`, with
 * no motion and no wrapper, in the artwork's own units (`MARK_BOX`). Place it
 * with a transform; it takes the `fill` of the group it is drawn in.
 */
export function MarkShape() {
  return (
    <>
      <path d={MARK_HUB.d} />
      {MARK_ARMS.map((arm) => (
        <g key={arm.angle}>
          <path d={arm.inner} />
          <path d={arm.outer} />
          <path d={arm.node.d} />
        </g>
      ))}
    </>
  );
}

/** Scale that draws the mark `width` units wide. */
export const markScale = (width: number) => width / MARK_BOX.width;
