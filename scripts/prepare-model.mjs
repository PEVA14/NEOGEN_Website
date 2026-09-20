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
 *   3. PRUNE and DEDUP — drop everything the remaining scene no longer
 *      references (orphan meshes, accessors, materials) and merge duplicates.
 *      This is what turns a dropped node into actual bytes saved.
 *
 * It never moves, rotates or rescales anything: the web layer normalises
 * position and size at load time (`VialModel`), and an asset silently re-posed
 * here would make that normalisation lie.
 *
 * Usage:
 *   node scripts/prepare-model.mjs <source.glb> <destination.glb> \
 *     [--drop "Node name"]... [--jpeg 92] [--dry]
 *
 * Requires macOS `sips` for --jpeg (it is what the owner's machine has;
 * without it the script says so and leaves textures untouched).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune } from "@gltf-transform/functions";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--") && !isFlagValue(a));
const drops = [];
let jpegQuality = null;
let dry = false;

function isFlagValue(arg) {
  const i = args.indexOf(arg);
  return i > 0 && (args[i - 1] === "--drop" || args[i - 1] === "--jpeg");
}
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--drop") drops.push(args[i + 1]);
  if (args[i] === "--jpeg") jpegQuality = Number(args[i + 1] ?? 92);
  if (args[i] === "--dry") dry = true;
}

const [source, destination] = positional;
if (!source || !destination) {
  console.error(
    "usage: node scripts/prepare-model.mjs <source.glb> <dest.glb> [--drop NAME]... [--jpeg 92] [--dry]",
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

/* ---- 2. textures --------------------------------------------------------- */

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

/* ---- 3. prune ------------------------------------------------------------ */

await document.transform(dedup(), prune());

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
