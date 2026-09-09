import type { WorldId } from "@/config/worlds";

/**
 * DOCUMENTS — the seam a certificate of analysis lands in.
 *
 * The product page and the research hub already render the document
 * ARCHITECTURE: three records per compound, each with a title, a description
 * and a neutral unavailable state. What they could not do is point at a file,
 * because there was nowhere to declare one.
 *
 * A record here is deliberately NOT the copy. Titles and descriptions are
 * localized and live in the dictionaries; a file is a fact and lives here. The
 * two are joined at the render site by their `kind`.
 *
 * WHY `size` AND `format` ARE REQUIRED WHEN A FILE EXISTS. A link that opens a
 * download should say what it is about to hand you. They are read off the real
 * file — never estimated — which is why the type makes them non-optional rather
 * than letting a half-declared file through.
 */
export type DocumentKind = "coa" | "technical-sheet" | "handling-protocol";

export interface DocumentFile {
  /** Path under `public/`. Version the filename when the document changes. */
  href: string;
  /** e.g. "PDF". Shown next to the link. */
  format: string;
  /** Human-readable, read off the real file. e.g. "412 KB". */
  size: string;
  /** ISO date the document was issued. Never inferred from the file mtime. */
  issued: string;
}

/**
 * Every entry is `null`: no document has been produced or verified for any
 * compound. The UI renders its unavailable state from exactly this, so the two
 * cannot disagree.
 */
const DOCUMENTS: Record<WorldId, Record<DocumentKind, DocumentFile | null>> = {
  reta: { coa: null, "technical-sheet": null, "handling-protocol": null },
  glow: { coa: null, "technical-sheet": null, "handling-protocol": null },
  "ghk-cu": { coa: null, "technical-sheet": null, "handling-protocol": null },
};

/** The order records are presented in, matching the dictionary's record list. */
export const documentKinds: readonly DocumentKind[] = [
  "coa",
  "technical-sheet",
  "handling-protocol",
];

export function documentFile(world: WorldId, kind: DocumentKind): DocumentFile | null {
  return DOCUMENTS[world][kind];
}
