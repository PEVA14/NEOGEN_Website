import "server-only";

import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseEffectsFile, serializeEffectsFile } from "@/content/effects/rules";

import type { SimpleEffectsFile } from "@/content/effects/types";

/**
 * WHERE SIMPLE EFFECTS ARE KEPT — a file in the repository.
 *
 * `src/content/effects/simple-effects.json` is the canonical copy. The
 * console reads and writes it on the machine it runs on; git is its history
 * and its review trail (every save is a diff a person can read); the public
 * site reads it at build time. Chosen over the order database on purpose:
 * this is editorial content that ships with the code, it must not depend on
 * commerce infrastructure, and a static site cannot read a database at build
 * time without one being configured.
 *
 * WHAT IT IS NOT: production storage for a hosted editor. A deployed copy of
 * the site is read-only — a save there fails with `read_only` and changes
 * nothing. Editing happens locally (`next dev` or `next start`), then the
 * file is committed. Moving to a database later means implementing these
 * three functions against it and publishing on a rebuild or revalidation;
 * nothing that calls them changes.
 *
 * `NEOGEN_EFFECTS_FILE` points the store elsewhere (the checks and test
 * servers use a scratch copy, so testing never edits the real file).
 */
const DEFAULT_FILE = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "src",
  "content",
  "effects",
  "simple-effects.json",
);

export function effectsFilePath(): string {
  return process.env.NEOGEN_EFFECTS_FILE?.trim() || DEFAULT_FILE;
}

export class EffectsStoreError extends Error {
  constructor(readonly code: "read_only" | "malformed" | "unreadable") {
    super(code);
  }
}

export async function readEffects(): Promise<SimpleEffectsFile> {
  let text: string;
  try {
    /* The path is the editor's, chosen at run time; there is nothing for the
       build to trace through it. */
    text = await readFile(/* turbopackIgnore: true */ effectsFilePath(), "utf8");
  } catch {
    throw new EffectsStoreError("unreadable");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new EffectsStoreError("malformed");
  }
  const parsed = parseEffectsFile(raw);
  if (!parsed.ok) throw new EffectsStoreError("malformed");
  return parsed.file;
}

/* One write at a time in this process: two saves in the same instant must
   not interleave a read and a write. (Revisions catch the cross-tab case.) */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Read, change, write — atomically (a temporary file renamed over the real
 * one, so a crash never leaves half a file). The mutator returns the new
 * file, or null to write nothing.
 */
export function updateEffects<T>(
  mutate: (file: SimpleEffectsFile) => { file: SimpleEffectsFile | null; result: T },
): Promise<T> {
  const run = queue.then(async () => {
    const current = await readEffects();
    const { file, result } = mutate(current);
    if (!file) return result;
    const target = effectsFilePath();
    const temp = `${target}.${randomBytes(4).toString("hex")}.tmp`;
    try {
      await writeFile(/* turbopackIgnore: true */ temp, serializeEffectsFile(file), "utf8");
      await rename(/* turbopackIgnore: true */ temp, target);
    } catch {
      throw new EffectsStoreError("read_only");
    }
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}
