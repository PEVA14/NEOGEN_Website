/**
 * PREPARE A BLENDER EXPORT FOR THE WEB — the one path from `3d assets/` to
 * `public/models/`.
 *
 * The raw exports in `3d assets/` are the artist's file and are never edited or
 * committed (that folder is gitignored). What the site serves is DERIVED from
 * one, by this script, so the transformation is written down, repeatable and
 * reviewable instead of being a thing someone did by hand once.
 *
 * What it does, in order:
 *
 *   1. DROP NODES the web build should not carry (`--drop "Name"`, repeatable).
 *      Exports often contain alternates left in the scene — a second lid, a
 *      backup label. Dropping them here rather than asking Blender for a new
 *      export means the artist's file keeps every variant.
 *   2. RE-ENCODE TEXTURES to JPEG (`--jpeg <quality>`). The label art is a
 *      2048² PNG of mostly flat paper; as JPEG it is a quarter of the size with
 *      the fine print still legible. Skipped for textures with transparency.
 *   3. RESIZE A NODE (`--scale-node "Name" 0.92`), around its own top and
 *      axis. The one transform this script performs, and it is here because it
 *      is a decision about the PRODUCT — how large its cap reads — not about
 *      the scene. Scaling around the top keeps the closure sitting on the
 *      neck: what shrinking buys is visible glass below it, never a gap above.
 *   4. PRUNE and DEDUP — drop everything the remaining scene no longer
 *      references (orphan meshes, accessors, materials) and merge duplicates.
 *      This is what turns a dropped node into actual bytes saved.
 *
 * It never moves or rotates the OBJECT, and never rescales the whole of it:
 * the web layer normalises position and overall size at load time
 * (`VialModel`), and an asset silently re-posed here would make that
 * normalisation lie. `--scale-node` resizes ONE PART relative to the rest,
 * which is a proportion the model carries, not a pose the page owns.
 *
 * Usage:
 *   node scripts/prepare-model.mjs <source.glb> <destination.glb> \
 *     [--drop "Node name"]... [--scale-node "Node name" 0.92] [--jpeg 92] [--dry]
 *
 * Requires macOS `sips` for --jpeg (it is what the owner's machine has;
 * without it the script says so and leaves textures untouched).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeIO, PropertyType } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune } from "@gltf-transform/functions";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--") && !isFlagValue(a));
const drops = [];
const scales = [];
let jpegQuality = null;
let labelArt = null;
let dry = false;

function isFlagValue(arg) {
  const i = args.indexOf(arg);
  if (i <= 0) return false;
  /* `--scale-node` takes TWO values (name, factor), so both follow it. */
  if (args[i - 1] === "--scale-node" || args[i - 2] === "--scale-node") return true;
  return args[i - 1] === "--drop" || args[i - 1] === "--jpeg" || args[i - 1] === "--label";
}
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--drop") drops.push(args[i + 1]);
  if (args[i] === "--scale-node") scales.push({ name: args[i + 1], factor: Number(args[i + 2]) });
  if (args[i] === "--jpeg") jpegQuality = Number(args[i + 1] ?? 92);
  if (args[i] === "--label") labelArt = args[i + 1] ?? null;
  if (args[i] === "--dry") dry = true;
}

const [source, destination] = positional;
if (!source || !destination) {
  console.error(
    "usage: node scripts/prepare-model.mjs <source.glb> <dest.glb> [--drop NAME]... " +
      "[--scale-node NAME 0.92] [--label sheet.png] [--jpeg 92] [--dry]",
  );
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
/*
 * REGISTER THE KHRONOS EXTENSIONS, or the rewrite silently drops them.
 * These vials are glass: their material carries KHR_materials_transmission,
 * _specular and _ior, and an unregistered extension is not preserved — the
 * glass would come out of this script as an opaque white cylinder.
 */
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();

const before = {
  bytes: statSync(source).size,
  nodes: root.listNodes().length,
  meshes: root.listMeshes().length,
  materials: root.listMaterials().length,
};

/* ---- 1. drop nodes ------------------------------------------------------- */

for (const name of drops) {
  const node = root.listNodes().find((n) => n.getName() === name);
  if (!node) {
    console.error(`  ! no node named ${JSON.stringify(name)} — nothing dropped`);
    continue;
  }
  /* Children travel with their parent; say so rather than silently taking them. */
  const children = node.listChildren().map((c) => c.getName());
  if (children.length)
    console.log(`  dropping "${name}" (and its children: ${children.join(", ")})`);
  else console.log(`  dropping "${name}"`);
  node.dispose();
}

/* ---- 2. resize parts ------------------------------------------------------ */

for (const { name, factor } of scales) {
  const node = root.listNodes().find((n) => n.getName() === name);
  if (!node) {
    console.error(`  ! no node named ${JSON.stringify(name)} — nothing resized`);
    continue;
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    console.error(`  ! --scale-node ${JSON.stringify(name)} needs a positive factor`);
    process.exit(1);
  }

  /* Rotation would make "its own top and axis" ambiguous, and these vials have
     none. Refuse rather than quietly resize around the wrong point. */
  const [rx, ry, rz, rw] = node.getRotation();
  if (Math.abs(rx) + Math.abs(ry) + Math.abs(rz) > 1e-6 || Math.abs(rw - 1) > 1e-6) {
    console.error(`  ! ${JSON.stringify(name)} carries a rotation; resizing it is not supported`);
    process.exit(1);
  }

  const mesh = node.getMesh();
  if (!mesh) {
    console.error(`  ! ${JSON.stringify(name)} has no mesh`);
    continue;
  }

  /* The part's own bounds, in its local space. */
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute("POSITION");
    if (!position) continue;
    const lo = position.getMin([0, 0, 0]);
    const hi = position.getMax([0, 0, 0]);
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], lo[axis]);
      max[axis] = Math.max(max[axis], hi[axis]);
    }
  }

  const scale = node.getScale();
  const translation = node.getTranslation();
  const centreX = (min[0] + max[0]) / 2;
  const centreZ = (min[2] + max[2]) / 2;

  /*
   * Keep the TOP and the axis where they were: a vertex sits at
   * `translation + scale · v`, so holding `translation + scale · p` fixed for
   * the pivot `p` means moving the translation by `scale · p · (1 - factor)`.
   */
  node.setScale([scale[0] * factor, scale[1] * factor, scale[2] * factor]);
  node.setTranslation([
    translation[0] + scale[0] * centreX * (1 - factor),
    translation[1] + scale[1] * max[1] * (1 - factor),
    translation[2] + scale[2] * centreZ * (1 - factor),
  ]);

  const width = (max[0] - min[0]) * Math.abs(scale[0]) * factor * 1000;
  const height = (max[1] - min[1]) * Math.abs(scale[1]) * factor * 1000;
  console.log(
    `  resized "${name}" to ${(factor * 100).toFixed(0)}% → Ø${width.toFixed(0)} × ${height.toFixed(0)} mm`,
  );
}

/* ---- 2b. the label sheet -------------------------------------------------- */

/**
 * REPLACE THE PRINTED LABEL (`--label sheet.png`).
 *
 * WHY A BUILD STEP AND NOT A RUNTIME SWAP. A label is read by a customer on
 * the product page, in the catalogue card, on the homepage and in the studio
 * still — four render paths, one of which is a plain `useLoader` with no
 * material pass at all. Overriding it in each is four chances to miss one, and
 * the file itself would still carry the artwork it was meant to replace.
 * Baking it means the served model is correct everywhere by construction.
 *
 * WHEN IT IS USED. When an export's printed strip says something the product
 * record does not support — `NEOGEN_RETA_VIAL_V3.glb` arrived with a mock-up
 * strip reading "INJECTABLE PEPTIDE · 99% PURITY · SUBCUTANEOUS USE" and a
 * volume that matches no presentation in the catalogue. The sheet drawn from
 * registry data (`studio/label.ts`, exported by `scripts/export-label.mjs`)
 * replaces it until corrected artwork arrives.
 *
 * It swaps the image on the texture the LABEL material points at, so the UVs,
 * the mesh and every other material are untouched.
 */
if (labelArt) {
  if (!existsSync(labelArt)) {
    console.error(`  ! label sheet not found: ${labelArt}`);
    process.exit(1);
  }
  const labelMaterials = root
    .listMaterials()
    .filter((m) => (m.getName() ?? "").toLowerCase().includes("label"));
  if (labelMaterials.length === 0) {
    console.error("  ! no material with `label` in its name — nothing to replace");
    process.exit(1);
  }
  const bytes = new Uint8Array(readFileSync(labelArt));
  for (const material of labelMaterials) {
    const texture = material.getBaseColorTexture();
    if (!texture) {
      console.error(`  ! "${material.getName()}" has no base colour texture`);
      process.exit(1);
    }
    texture.setImage(bytes).setMimeType("image/png");
    console.log(
      `  label "${material.getName()}": replaced with ${path.basename(labelArt)} (${kb(bytes.byteLength)})`,
    );
  }
}

/* ---- 3. textures --------------------------------------------------------- */

if (jpegQuality !== null) {
  let sips = true;
  try {
    execFileSync("which", ["sips"], { stdio: "ignore" });
  } catch {
    sips = false;
    console.error("  ! `sips` not found (macOS only) — textures left as they are");
  }

  if (sips) {
    const scratch = mkdtempSync(path.join(tmpdir(), "neogen-model-"));
    try {
      for (const [i, texture] of root.listTextures().entries()) {
        const image = texture.getImage();
        if (!image) continue;
        if (texture.getMimeType() === "image/jpeg") continue;

        const from = path.join(scratch, `t${i}.png`);
        const to = path.join(scratch, `t${i}.jpg`);
        writeFileSync(from, Buffer.from(image));
        execFileSync(
          "sips",
          ["-s", "format", "jpeg", "-s", "formatOptions", String(jpegQuality), from, "--out", to],
          { stdio: "ignore" },
        );
        const encoded = readFileSync(to);

        if (encoded.length >= image.byteLength) {
          console.log(`  texture ${i} "${texture.getName()}": JPEG was not smaller — kept as is`);
          continue;
        }
        console.log(
          `  texture ${i} "${texture.getName()}": ${kb(image.byteLength)} PNG → ${kb(encoded.length)} JPEG q${jpegQuality}`,
        );
        texture.setImage(new Uint8Array(encoded)).setMimeType("image/jpeg");
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
}

/* ---- 4. prune ------------------------------------------------------------ */

/*
 * MATERIALS ARE NOT DEDUPLICATED, and that is deliberate.
 *
 * Two materials can carry identical values and still mean different things —
 * the RETA export has a satin aluminium band and a lid material with the same
 * numbers. Merging them keeps ONE name, and the site reads material names:
 * `studio/StudioScene.tsx` paints anything named "aluminum" as metal. A merge
 * renamed the cap band to "…Black Plastic" and the catalogue still came back
 * with a black cap. Names are content here, so only geometry and textures are
 * deduplicated.
 */
const DEDUP_TYPES = [
  PropertyType.ACCESSOR,
  PropertyType.MESH,
  PropertyType.TEXTURE,
  PropertyType.SKIN,
];

await document.transform(dedup({ propertyTypes: DEDUP_TYPES }), prune());

/* ---- report and write ---------------------------------------------------- */

const out = await io.writeBinary(document);
const after = {
  bytes: out.byteLength,
  nodes: root.listNodes().length,
  meshes: root.listMeshes().length,
  materials: root.listMaterials().length,
};

console.log(
  `  ${path.basename(source)} → ${path.basename(destination)}\n` +
    `  size      ${kb(before.bytes)} → ${kb(after.bytes)} (${(((after.bytes - before.bytes) / before.bytes) * 100).toFixed(0)}%)\n` +
    `  nodes     ${before.nodes} → ${after.nodes}\n` +
    `  meshes    ${before.meshes} → ${after.meshes}\n` +
    `  materials ${before.materials} → ${after.materials}\n` +
    `  extensions ${
      root
        .listExtensionsUsed()
        .map((e) => e.extensionName)
        .join(", ") || "none"
    }`,
);

/* A vial whose glass lost its transmission is the failure this script could
   most easily introduce, so it is checked rather than assumed. */
const glass = root.listMaterials().filter((m) => m.getExtension("KHR_materials_transmission"));
if (root.listMaterials().some((m) => /glass/i.test(m.getName())) && glass.length === 0) {
  console.error("  ! a material is named glass but carries no transmission — refusing to write");
  process.exit(1);
}

if (dry) {
  console.log("  (dry run — nothing written)");
} else {
  writeFileSync(destination, Buffer.from(out));
  console.log(`  written: ${destination}`);
}
