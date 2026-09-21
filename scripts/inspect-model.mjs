/**
 * READ A .glb AND SAY WHAT IS ACTUALLY IN IT.
 *
 *   node scripts/inspect-model.mjs public/models/reta-v2.glb ["3d assets/x.glb"]...
 *
 * Written because a GLB is opaque until something tells you otherwise, and the
 * questions that matter for this site are not the ones a viewer answers:
 *
 *   How many triangles am I shipping, and in which part?
 *   Does the glass still carry KHR_materials_transmission? (Without it the
 *     vial renders as a white cylinder — the failure mode of any re-export.)
 *   How big is the label texture, which is nearly all of the file size?
 *   Where does each part sit IN MILLIMETRES — and do two of them overlap,
 *     which is how a stray second lid hides inside an export?
 *
 * It parses the container and the glTF JSON chunk directly: no dependency, no
 * WebGL, no Blender. It reads only; nothing is written.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/* ---- container ----------------------------------------------------------- */

function readGlb(file) {
  const buf = readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error(`${file}: not a GLB`);
  const total = buf.readUInt32LE(8);
  let offset = 12;
  let json = null;
  while (offset < total) {
    const length = buf.readUInt32LE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (type.startsWith("JSON"))
      json = JSON.parse(buf.subarray(offset + 8, offset + 8 + length).toString("utf8"));
    offset += 8 + length + ((4 - (length % 4)) % 4);
  }
  return { json, bytes: buf.length };
}

/* ---- transforms ---------------------------------------------------------- */

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1)
    for (let col = 0; col < 4; col += 1)
      for (let k = 0; k < 4; k += 1) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return out;
}

/** A node's local matrix, from either `matrix` or translation/rotation/scale. */
function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

const apply = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

/* ---- report -------------------------------------------------------------- */

const mm = (metres) => (metres * 1000).toFixed(1);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

function inspect(file) {
  const { json: g, bytes } = readGlb(file);
  console.log(
    `\n${"=".repeat(72)}\n${path.basename(file)}  ${kb(bytes)}  — ${g.asset?.generator ?? "unknown exporter"}`,
  );

  const scene = g.scenes?.[g.scene ?? 0];
  if (!scene?.nodes?.length) {
    console.log(
      "  EMPTY SCENE — this file contains no objects. The export failed or\n" +
        "  nothing was selected when it was written.",
    );
    return;
  }

  const extensions = g.extensionsUsed ?? [];
  console.log(`  extensions: ${extensions.join(", ") || "none"}`);

  /* --- parts, in world space --- */
  const parts = [];
  let triangles = 0;
  let vertices = 0;

  const walk = (index, parentMatrix, depth) => {
    const node = g.nodes[index];
    const world = multiply(parentMatrix, localMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = g.meshes[node.mesh];
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      const materials = [];
      let partTris = 0;
      for (const primitive of mesh.primitives) {
        const position = g.accessors[primitive.attributes.POSITION];
        const count =
          primitive.indices !== undefined
            ? g.accessors[primitive.indices].count / 3
            : position.count / 3;
        partTris += count;
        vertices += position.count;
        materials.push({
          name:
            primitive.material !== undefined
              ? (g.materials[primitive.material].name ?? `material ${primitive.material}`)
              : "(none)",
          tris: Math.round(count),
          /*
           * WHETHER THIS PART CAN CARRY A LABEL AT ALL.
           *
           * A mesh with no TEXCOORD_0 has no UVs, and a texture cannot be
           * applied to it — not the printed sheet, not the drawn one. It is
           * invisible in a render (the band just comes out blank paper) and
           * cost an afternoon to diagnose once, so it is reported here.
           */
          uv: primitive.attributes.TEXCOORD_0 !== undefined,
        });
        if (!position.min) continue;
        for (let corner = 0; corner < 8; corner += 1) {
          const p = apply(world, [
            corner & 1 ? position.max[0] : position.min[0],
            corner & 2 ? position.max[1] : position.min[1],
            corner & 4 ? position.max[2] : position.min[2],
          ]);
          for (let axis = 0; axis < 3; axis += 1) {
            min[axis] = Math.min(min[axis], p[axis]);
            max[axis] = Math.max(max[axis], p[axis]);
          }
        }
      }
      triangles += partTris;
      parts.push({
        name: node.name ?? `node ${index}`,
        depth,
        tris: Math.round(partTris),
        materials,
        min,
        max,
      });
    }
    for (const child of node.children ?? []) walk(child, world, depth + 1);
  };
  for (const root of scene.nodes) walk(root, IDENTITY, 0);

  const all = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const part of parts)
    for (let axis = 0; axis < 3; axis += 1) {
      all.min[axis] = Math.min(all.min[axis], part.min[axis]);
      all.max[axis] = Math.max(all.max[axis], part.max[axis]);
    }

  console.log(
    `  ${parts.length} part(s), ${triangles.toLocaleString("en-US")} triangles, ` +
      `${vertices.toLocaleString("en-US")} vertices, ${(g.materials ?? []).length} materials`,
  );
  console.log(
    `  overall size ${mm(all.max[0] - all.min[0])} × ${mm(all.max[1] - all.min[1])} × ` +
      `${mm(all.max[2] - all.min[2])} mm (the web layer recentres and rescales, so the\n` +
      `  origin offset does not matter — only the proportions do)`,
  );

  console.log("\n  PARTS");
  for (const part of parts) {
    const radius = Math.max(part.max[0] - part.min[0], part.max[2] - part.min[2]) / 2;
    console.log(
      `    ${"  ".repeat(part.depth)}${part.name}\n` +
        `    ${"  ".repeat(part.depth)}  y ${mm(part.min[1])}…${mm(part.max[1])} mm, Ø ${mm(radius * 2)} mm, ${part.tris.toLocaleString("en-US")} tris`,
    );
    for (const m of part.materials)
      console.log(
        `    ${"  ".repeat(part.depth)}  · ${m.tris.toLocaleString("en-US")} tris → ${m.name}` +
          (m.uv ? "" : "  [no UVs — cannot take a texture]"),
      );
  }

  /*
   * PARTS THAT OCCUPY THE SAME SPACE. Two solids sharing most of their height
   * is not a design — it is an alternate somebody left in the scene, and it is
   * invisible in a thumbnail. This is what caught the second lid in
   * NEOGEN_RETA_VIAL_V2.
   */
  const clashes = [];
  for (let i = 0; i < parts.length; i += 1)
    for (let j = i + 1; j < parts.length; j += 1) {
      const a = parts[i];
      const b = parts[j];
      const overlapY = Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]);
      const shorter = Math.min(a.max[1] - a.min[1], b.max[1] - b.min[1]);
      /* Ignore a part fully inside another (a label on a body is not a clash). */
      const nested =
        (a.min[1] >= b.min[1] && a.max[1] <= b.max[1]) ||
        (b.min[1] >= a.min[1] && b.max[1] <= a.max[1]);
      if (overlapY > shorter * 0.5 && !nested)
        clashes.push(`${a.name} ↔ ${b.name}: ${mm(overlapY)} mm of shared height`);
    }
  if (clashes.length) {
    console.log(
      "\n  PARTS SHARING SPACE — a closure sitting over a neck is normal;\n" +
        "  two closures sharing space is not:",
    );
    for (const clash of clashes) console.log(`    ! ${clash}`);
  }

  /* --- materials --- */
  console.log("\n  MATERIALS");
  for (const material of g.materials ?? []) {
    const pbr = material.pbrMetallicRoughness ?? {};
    const bits = [];
    if (pbr.baseColorFactor)
      bits.push(
        `base ${pbr.baseColorFactor
          .slice(0, 3)
          .map((v) => v.toFixed(2))
          .join("/")}`,
      );
    bits.push(`metal ${pbr.metallicFactor ?? 1}`, `rough ${pbr.roughnessFactor ?? 1}`);
    const transmission = material.extensions?.KHR_materials_transmission?.transmissionFactor;
    if (transmission) bits.push(`TRANSMISSION ${transmission}`);
    if (material.extensions?.KHR_materials_ior)
      bits.push(`ior ${material.extensions.KHR_materials_ior.ior.toFixed(2)}`);
    if (pbr.baseColorTexture) bits.push("baseColor texture");
    console.log(`    ${material.name ?? "(unnamed)"} — ${bits.join(", ")}`);
  }

  const glass = (g.materials ?? []).filter((m) => /glass/i.test(m.name ?? ""));
  const glassWithTransmission = glass.filter((m) => m.extensions?.KHR_materials_transmission);
  if (glass.length && !glassWithTransmission.length) {
    console.log(
      "\n  ! A material is named glass but carries no transmission. It will render\n" +
        "    as an opaque cylinder. Re-export with the extension, or re-run\n" +
        "    scripts/prepare-model.mjs (which registers the Khronos extensions).",
    );
  }

  /* --- textures: nearly all of the file size --- */
  if ((g.images ?? []).length) {
    console.log("\n  TEXTURES");
    for (const [i, image] of g.images.entries()) {
      const view = image.bufferView !== undefined ? g.bufferViews[image.bufferView] : null;
      const size = view ? view.byteLength : 0;
      console.log(
        `    ${i}: ${image.name ?? "(unnamed)"} — ${image.mimeType ?? "?"}, ${kb(size)}` +
          `${size / bytes > 0.3 ? `  (${((size / bytes) * 100).toFixed(0)}% of the file)` : ""}`,
      );
    }
  }
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: node scripts/inspect-model.mjs <file.glb>...");
  process.exit(1);
}
for (const file of files) inspect(file);
console.log("");
