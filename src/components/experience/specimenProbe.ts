import { Box3, Matrix4, Mesh, Vector3, type Camera, type Group, type Object3D } from "three";

/**
 * THE SPECIMEN, MEASURED THROUGH THE LENS (flagship idea #4, RETA first).
 *
 * The product page can put its live vial under inspection
 * (`product/SpecimenInspection`). What it draws then — the specimen's extent
 * read off the frame's scales, and the label's reading carried on an index
 * that follows the label round — is placed from THIS: the actual model,
 * posed for this frame, projected through the scene's own camera. Nothing is
 * a viewport offset or a guess, so it holds at every screen size, through a
 * resize, and as the vial turns and pitches.
 *
 * Positions are fractions of the CANVAS (x of its width, y of its height,
 * from the top left); the page converts them to its frame.
 */
export interface SpecimenReading {
  /** The silhouette's extent: its leftmost, rightmost, top and bottom. */
  left: number;
  right: number;
  top: number;
  bottom: number;
  /**
   * The front of the label — where it faces when the vial is at rest — and
   * how squarely it faces the lens now: 1 square on, 0 edge on, below 0
   * turned away.
   */
  label: { x: number; y: number; facing: number } | null;
}

/**
 * The line between the scene and the page. The page LISTENS (a writer, and
 * whether it wants readings); the scene CONNECTS (a way to ask it for a
 * frame — under reduced motion the loop only draws on demand). Both sides
 * talk through these methods, never by reaching into each other's state.
 */
export interface SpecimenProbe {
  /** Whether anyone wants a reading this frame: nothing is measured if not. */
  listening(): boolean;
  /** The scene's report for this frame. */
  report(reading: SpecimenReading): void;
  /** The page: its writer, or null to stop listening. */
  listen(write: ((reading: SpecimenReading) => void) | null): void;
  /** The scene: how to ask it for a frame, or null when it goes. */
  connect(invalidate: (() => void) | null): void;
  /** Asks the scene for a frame, if one is connected. */
  invalidate(): void;
}

export function createProbe(): SpecimenProbe {
  let writer: ((reading: SpecimenReading) => void) | null = null;
  let frame: (() => void) | null = null;
  return {
    listening: () => writer !== null,
    report: (reading) => writer?.(reading),
    listen: (write) => {
      writer = write;
      frame?.();
    },
    connect: (invalidate) => {
      frame = invalidate;
    },
    invalidate: () => frame?.(),
  };
}

/** One part of the model as a cylinder on the vial's axis: end circles. */
interface Part {
  y0: number;
  y1: number;
  cx: number;
  cz: number;
  r: number;
}

/** The model's geometry, in the posed group's own space. Measured once. */
export interface SpecimenGeometry {
  /** Points round the rims of every part: their hull is the silhouette. */
  rims: Vector3[];
  /** The label's front point and its outward normal, if it has one. */
  label: { point: Vector3; normal: Vector3 } | null;
}

const RIM_SAMPLES = 24;

/**
 * Reads the parts of the model `group` holds — each mesh's box in the group's
 * space (the vial is a set of cylinders on one axis: glass, cap, label) —
 * and the label's front, where its box is deepest towards the lens at rest.
 */
export function measureSpecimen(group: Group, label: Object3D | null): SpecimenGeometry {
  group.updateWorldMatrix(true, true);
  const toGroup = new Matrix4().copy(group.matrixWorld).invert();
  const rel = new Matrix4();

  const boxOf = (mesh: Mesh) => {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return null;
    rel.multiplyMatrices(toGroup, mesh.matrixWorld);
    return box.clone().applyMatrix4(rel);
  };

  const parts: Part[] = [];
  let labelBox: Box3 | null = null;
  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const box = boxOf(child);
    if (!box || box.isEmpty()) return;
    if (child === label) labelBox = box;
    parts.push({
      y0: box.min.y,
      y1: box.max.y,
      cx: (box.min.x + box.max.x) / 2,
      cz: (box.min.z + box.max.z) / 2,
      r: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2,
    });
  });

  const rims: Vector3[] = [];
  for (const part of parts) {
    for (let i = 0; i < RIM_SAMPLES; i++) {
      const a = (i / RIM_SAMPLES) * Math.PI * 2;
      const x = part.cx + Math.cos(a) * part.r;
      const z = part.cz + Math.sin(a) * part.r;
      rims.push(new Vector3(x, part.y0, z), new Vector3(x, part.y1, z));
    }
  }

  const front = labelBox as Box3 | null;
  return {
    rims,
    label: front
      ? {
          point: new Vector3(
            (front.min.x + front.max.x) / 2,
            (front.min.y + front.max.y) / 2,
            front.max.z,
          ),
          normal: new Vector3(0, 0, 1),
        }
      : null,
  };
}

const v = new Vector3();
const n = new Vector3();
const eye = new Vector3();

/** Where the specimen stands this frame, as the canvas sees it. */
export function readSpecimen(
  group: Group,
  camera: Camera,
  geometry: SpecimenGeometry,
): SpecimenReading {
  group.updateWorldMatrix(true, false);
  const toCanvas = (point: Vector3) => {
    v.copy(point).applyMatrix4(group.matrixWorld).project(camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  };

  let left = 1;
  let right = 0;
  let top = 1;
  let bottom = 0;
  for (const point of geometry.rims) {
    const p = toCanvas(point);
    left = Math.min(left, p.x);
    right = Math.max(right, p.x);
    top = Math.min(top, p.y);
    bottom = Math.max(bottom, p.y);
  }

  let label: SpecimenReading["label"] = null;
  if (geometry.label) {
    const p = toCanvas(geometry.label.point);
    const world = v.copy(geometry.label.point).applyMatrix4(group.matrixWorld);
    n.copy(geometry.label.normal).transformDirection(group.matrixWorld);
    camera.getWorldPosition(eye);
    const facing = n.dot(eye.sub(world).normalize());
    label = { x: p.x, y: p.y, facing };
  }

  return { left, right, top, bottom, label };
}
