import {
  BufferAttribute,
  CanvasTexture,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Matrix4,
  type Mesh,
  type MeshStandardMaterial,
} from "three";

/**
 * THE CAP'S FINISH — turned aluminium, not chrome.
 *
 * A real crimp seal is stamped from aluminium sheet and spun onto the vial. It
 * is never a mirror: the skirt carries fine circumferential lines from the
 * spinning, the crown carries the same lines as concentric rings, and the whole
 * surface has a faint uneven grain where the sheet was drawn. Under a studio
 * light that reads as a SATIN band with a soft edge, broken very slightly along
 * its length — which is what separates metal from a render of metal.
 *
 * Every export so far ships the cap as one flat value (V4: roughness 0.095,
 * an exporter default that made a mirror) and with NO UVs, so it cannot take a
 * texture as delivered. This gives it both, at load time:
 *
 *   1. UVs from the cap's own shape — `u` around the axis, `v` along the
 *      profile, running down the skirt and then in across the crown. One set
 *      of horizontal lines in the texture therefore becomes rings on the skirt
 *      AND concentric rings on the top, the way a spun part actually looks.
 *   2. A roughness map: the lines, a low-frequency mottle and a fine grain.
 *   3. A normal map from the same lines, so the highlight edge is broken by
 *      real relief rather than only dimmed.
 *
 * Owned by web code, as CLAUDE.md puts lighting and materials: a re-exported
 * cap picks this up without anything being baked into the file.
 */

/** How far the relief tilts the surface. Enough to break a highlight, no more. */
const RELIEF = 0.1;

const SIZE = 512;

/**
 * The roughness map's average. The map is stored centred below white so its
 * variation has room above as well as below; the base roughness is divided by
 * this so the value a caller passes is the value the cap averages.
 */
const MAP_MEAN = 0.8;

/** A deterministic PRNG, so every render of the cap is the same cap. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One row value per texel row — the spun lines. Varying only in `v` is what
 * makes them rings; a line that also varied in `u` would streak radially
 * across the crown.
 */
function lines(rand: () => number): Float32Array {
  const row = new Float32Array(SIZE);
  for (let y = 0; y < SIZE; y += 1) row[y] = rand() * 2 - 1;
  // Two passes of a narrow blur: tool marks have width, not single-texel noise.
  for (let pass = 0; pass < 2; pass += 1) {
    const copy = row.slice();
    for (let y = 0; y < SIZE; y += 1) {
      row[y] = (copy[(y + SIZE - 1) % SIZE] + copy[y] * 2 + copy[(y + 1) % SIZE]) / 4;
    }
  }
  // A few deeper marks, as a real spinning tool leaves.
  for (let i = 0; i < 14; i += 1) row[Math.floor(rand() * SIZE)] += (rand() < 0.5 ? -1 : 1) * 1.4;
  return row;
}

/** Smooth tileable value noise — the mottle of drawn sheet. */
function mottle(rand: () => number, cells: number): (x: number, y: number) => number {
  const grid = Array.from({ length: cells * cells }, () => rand() * 2 - 1);
  const at = (i: number, j: number) => grid[((j + cells) % cells) * cells + ((i + cells) % cells)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x / SIZE) * cells;
    const fy = (y / SIZE) * cells;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = smooth(fx - i);
    const ty = smooth(fy - j);
    const top = at(i, j) * (1 - tx) + at(i + 1, j) * tx;
    const bottom = at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

let cached: { roughness: CanvasTexture; normal: CanvasTexture } | null = null;

/** The two maps, drawn once per page and shared by every cap. */
function finishMaps(): { roughness: CanvasTexture; normal: CanvasTexture } {
  if (cached) return cached;
  const rand = random(0x0a1c);
  const row = lines(rand);
  const coarse = mottle(rand, 6);
  const fine = mottle(rand, 48);

  const rough = document.createElement("canvas");
  const bump = document.createElement("canvas");
  rough.width = bump.width = SIZE;
  rough.height = bump.height = SIZE;
  const r = rough.getContext("2d")!.createImageData(SIZE, SIZE);
  const n = bump.getContext("2d")!.createImageData(SIZE, SIZE);

  for (let y = 0; y < SIZE; y += 1) {
    // The relief's slope along `v`: the lines are ridges, their normal tilts
    // up on one flank and down on the other.
    const slope = (row[(y + 1) % SIZE] - row[(y + SIZE - 1) % SIZE]) / 2;
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4;
      /*
       * Roughness is a MULTIPLIER of `material.roughness` (three reads the
       * green channel). Lines ±10%, mottle ±8%, grain ±4% around MAP_MEAN:
       * each alone is invisible, together they are "not a mirror".
       */
      const value =
        MAP_MEAN + row[y] * 0.1 + coarse(x, y) * 0.08 + fine(x, y) * 0.04 + (rand() - 0.5) * 0.03;
      const g = Math.max(0, Math.min(255, Math.round(value * 255)));
      r.data[i] = g;
      r.data[i + 1] = g;
      r.data[i + 2] = g;
      r.data[i + 3] = 255;

      // Tangent-space normal: tilt in `v` only, from the lines. Grain in the
      // normal as well made the band ripple; it lives in roughness alone.
      const ny = slope * 0.9;
      n.data[i] = 128;
      n.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      n.data[i + 2] = 255;
      n.data[i + 3] = 255;
    }
  }
  rough.getContext("2d")!.putImageData(r, 0, 0);
  bump.getContext("2d")!.putImageData(n, 0, 0);

  const texture = (canvas: HTMLCanvasElement) => {
    const t = new CanvasTexture(canvas);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    // Many lines down the height of a cap, once around it.
    t.repeat.set(1, 3);
    return t;
  };
  cached = { roughness: texture(rough), normal: texture(bump) };
  return cached;
}

/**
 * Cylindrical UVs, unwrapped along the cap's profile.
 *
 * Non-indexed first, so a triangle straddling the seam (where the angle wraps
 * from 1 back to 0) can be given its own copy of the seam vertex instead of
 * squeezing the whole texture into one sliver.
 */
function spunUvs(source: BufferGeometry, toModel: Matrix4): BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  /*
   * MEASURED UPRIGHT. The V4 cap's vertices are stored lying on their side
   * (Z-up, from Maya) and stood up by the node's rotation. Measuring the raw
   * vertices put the "axis" through the front of the skirt, and the rings came
   * out as a fingerprint on the cap's face. So the UVs are computed on a copy
   * of the positions in the model's own upright frame; the geometry itself is
   * not moved.
   */
  const upright = geometry.clone().applyMatrix4(toModel);
  upright.computeBoundingBox();
  const box = upright.boundingBox!;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  const height = box.max.y - box.min.y;
  /* Skirt height plus crown radius: the whole profile, top edge to centre. */
  const profile = height + radius;

  const position = upright.getAttribute("position") as BufferAttribute;
  const uv = new Float32Array(position.count * 2);
  const p = new Vector2();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let t = 0; t < position.count; t += 3) {
    /*
     * WHICH SURFACE, per triangle. A face that looks up or down is the crown
     * (or the underside): its rings are measured by distance from the axis.
     * Everything else is skirt, and its rings by HEIGHT ALONE — measuring the
     * skirt's radius too made every line follow the mesh's facets, and the
     * cap came out crinkled like foil.
     */
    a.fromBufferAttribute(position, t);
    b.fromBufferAttribute(position, t + 1);
    c.fromBufferAttribute(position, t + 2);
    const facing = Math.abs(b.sub(a).cross(c.sub(a)).normalize().y);
    for (let k = t; k < t + 3; k += 1) {
      p.set(position.getX(k) - cx, position.getZ(k) - cz);
      uv[k * 2] = Math.atan2(p.y, p.x) / (2 * Math.PI) + 0.5;
      uv[k * 2 + 1] =
        facing > 0.7 ? (radius - p.length()) / profile : (box.max.y - position.getY(k)) / profile;
    }
  }
  for (let t = 0; t < position.count; t += 3) {
    const us = [uv[t * 2], uv[t * 2 + 2], uv[t * 2 + 4]];
    if (Math.max(...us) - Math.min(...us) > 0.5) {
      for (let k = 0; k < 3; k += 1) if (us[k] < 0.5) uv[(t + k) * 2] += 1;
    }
  }
  upright.dispose();
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

/**
 * Give a cap mesh its finish. The geometry is REPLACED, not edited: the loaded
 * glTF is cached for the page, and the other render paths share it.
 */
export function finishCap(
  mesh: Mesh,
  material: MeshStandardMaterial,
  /* The average the cap should have. Satin sits around 0.3–0.45: lower reads
     as chrome, higher as painted grey. Each render path's lighting sets it. */
  roughness: number,
): void {
  /* Rotation and scale only — where the model sits in the scene is irrelevant. */
  mesh.updateWorldMatrix(true, false);
  mesh.geometry = spunUvs(mesh.geometry, mesh.matrixWorld);
  const maps = finishMaps();
  material.roughness = Math.min(1, roughness / MAP_MEAN);
  material.roughnessMap = maps.roughness;
  material.normalMap = maps.normal;
  material.normalScale.set(RELIEF, RELIEF);
  material.needsUpdate = true;
}
