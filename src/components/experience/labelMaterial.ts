import { MeshPhysicalMaterial, type MeshStandardMaterial } from "three";

/**
 * THE LABEL — identified by what it is, not by what it is called.
 *
 * A label is the one part of a vial that is opaque, not metal, and carries
 * printed artwork. That definition holds for every export so far: the NEOGEN
 * jars name theirs "NEOGEN - Label Paper", the V4 crimp-top arrived as
 * `aiStandardSurface3SG`, and the jar's "Lid - Internal Paper" is paper with
 * no artwork, so it is correctly left out. Matching on the name alone missed
 * V4 entirely — the same lesson the cap taught when it was matched by name.
 */
export function isLabelMaterial(material: MeshStandardMaterial): boolean {
  if (material.name.toLowerCase().includes("label")) return true;
  const glass = material instanceof MeshPhysicalMaterial && material.transmission > 0;
  return material.map !== null && !glass && material.metalness <= 0.5;
}

/**
 * KEEP THE LABEL OUT OF WHAT THE GLASS SEES THROUGH.
 *
 * three.js renders transmissive glass by first drawing every OPAQUE object
 * into an off-screen image and then sampling it with a refraction offset. The
 * label is opaque, so it is in that image — and where the glass is bare, at
 * the vial's edges, the refraction bends the view sideways and picks up a
 * flipped, squeezed copy of the printed label: mirrored text and a second blue
 * band floating inside the glass wall. The jar never showed it because its
 * label went all the way round; V4's covers ~126° of the front and leaves
 * clear glass at the sides for the ghost to appear in.
 *
 * Transparent objects are not drawn into that image, so marking the label
 * transparent — at full opacity, still writing depth — removes it from the
 * refraction without changing how the label itself looks. The cost: seen
 * through the glass from behind, the back of the label is hidden rather than
 * visible. That is a rear view nobody photographs, against a ghost everybody
 * sees on the front.
 */
export function keepOutOfRefraction(material: MeshStandardMaterial): void {
  material.transparent = true;
  material.opacity = 1;
  material.depthWrite = true;
}
