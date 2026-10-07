import { fold } from "@/content/lifecycle";

import { blankEntry, effectFindings } from "./rules";

import type { Finding } from "./rules";
import type { EffectTag, SimpleEffectsEntry, SimpleEffectsFile } from "./types";

/**
 * IMPORT AND EXPORT — model-agnostic, so any drafting tool (a spreadsheet, a
 * person, an AI model) can fill the layer, and nothing it produces can
 * publish itself.
 *
 * EXPORT writes every published product, filled or not, as CSV (spreadsheet
 * friendly, UTF-8 with a BOM so Excel reads accents) or JSON (the same rows).
 *
 * IMPORT reads either back, and is a PLAN before it is a change:
 *
 *   - a row whose wording or tags differ from what is stored becomes a DRAFT,
 *     marked `source: "import"` — whatever status the file claims. An import
 *     never approves;
 *   - a row identical to what is stored is left untouched, so re-importing an
 *     export keeps an approved entry approved (the only way approval survives
 *     an import is that nothing was changed);
 *   - a row with an empty description and no tags changes nothing;
 *   - any structural error (unknown product, duplicate row, unknown tag, tags
 *     that disagree between languages) refuses the WHOLE import. Nothing is
 *     half-applied. Warnings about the wording are shown in the plan and never
 *     refuse a row.
 */

export const CSV_COLUMNS = [
  "slug",
  "name",
  "status",
  "tags_es",
  "tags_en",
  "description_es",
  "description_en",
  "notes",
  "updated_at",
] as const;

export interface TransferRow {
  slug: string;
  name: string;
  status: string;
  tags_es: string;
  tags_en: string;
  description_es: string;
  description_en: string;
  notes: string;
  updated_at: string;
}

/** Tags in a cell: "APETITO | PESO". Also accepts "·" and "," as separators. */
const TAG_SEPARATOR = " | ";
const splitTags = (cell: string) =>
  cell
    .split(/[|·,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

export function exportRows(
  file: SimpleEffectsFile,
  products: readonly { slug: string; name: string }[],
): TransferRow[] {
  const labels = new Map(file.vocabulary.map((t) => [t.id, t.label]));
  return products.map(({ slug, name }) => {
    const e = file.entries[slug];
    const tags = (locale: "es" | "en") =>
      (e?.tags ?? []).map((id) => labels.get(id)?.[locale] ?? id).join(TAG_SEPARATOR);
    return {
      slug,
      name,
      status: e?.status ?? "",
      tags_es: tags("es"),
      tags_en: tags("en"),
      description_es: e?.description.es ?? "",
      description_en: e?.description.en ?? "",
      notes: e?.notes ?? "",
      updated_at: e?.updatedAt ?? "",
    };
  });
}

/* ---------------------------------------------------------------- CSV */

const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(rows: readonly TransferRow[]): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...rows.map((r) => CSV_COLUMNS.map((c) => cell(r[c])).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** RFC 4180: quoted fields, doubled quotes, line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/* ------------------------------------------------------------- reading */

export type ReadResult =
  | { ok: true; format: "csv" | "json"; rows: Partial<TransferRow>[] }
  | { ok: false; problem: string };

/** CSV or JSON, detected by the first character. */
export function readTransfer(text: string): ReadResult {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) return { ok: false, problem: "empty" };
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return { ok: false, problem: "json_invalid" };
    }
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { rows?: unknown }).rows)
        ? (data as { rows: unknown[] }).rows
        : null;
    if (!list) return { ok: false, problem: "json_shape" };
    if (!list.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
      return { ok: false, problem: "json_shape" };
    }
    const rows = (list as Record<string, unknown>[]).map((r) =>
      Object.fromEntries(
        CSV_COLUMNS.filter((c) => r[c] !== undefined).map((c) => [c, String(r[c] ?? "")]),
      ),
    );
    return { ok: true, format: "json", rows };
  }
  const table = parseCsv(trimmed);
  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  if (!header.includes("slug")) return { ok: false, problem: "csv_no_slug" };
  const unknown = header.filter((h) => !(CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) return { ok: false, problem: `csv_unknown_columns:${unknown.join(",")}` };
  const rows = table
    .slice(1)
    .map((r) =>
      Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])),
    ) as Partial<TransferRow>[];
  return { ok: true, format: "csv", rows };
}

/* ------------------------------------------------------------ planning */

export type PlanKind = "new" | "changed" | "unchanged" | "empty" | "error";

export interface PlanRow {
  line: number;
  slug: string;
  name: string;
  kind: PlanKind;
  errors: readonly string[];
  findings: readonly Finding[];
  notes: readonly string[];
  /** The entry as it will be stored — only for "new" and "changed". */
  next?: SimpleEffectsEntry;
}

export interface ImportPlan {
  ok: boolean;
  rows: readonly PlanRow[];
  counts: Record<PlanKind, number>;
}

function resolveTags(
  cellEs: string,
  cellEn: string,
  vocabulary: readonly EffectTag[],
): { ids: string[]; errors: string[] } {
  const errors: string[] = [];
  const byLabel = (locale: "es" | "en") =>
    new Map(vocabulary.map((t) => [fold(t.label[locale]), t.id] as const));
  const read = (cellText: string, locale: "es" | "en") => {
    const map = byLabel(locale);
    const ids = vocabulary.map((t) => t.id);
    return splitTags(cellText).map((label) => {
      const id = map.get(fold(label)) ?? (ids.includes(fold(label)) ? fold(label) : null);
      if (!id) errors.push(`unknown_tag:${locale}:${label}`);
      return id;
    });
  };
  const es = read(cellEs, "es").filter((x): x is string => x !== null);
  const en = read(cellEn, "en").filter((x): x is string => x !== null);
  if (es.length && en.length && [...es].sort().join() !== [...en].sort().join()) {
    errors.push("tags_disagree");
  }
  return { ids: es.length ? es : en, errors };
}

export function planImport(
  rows: readonly Partial<TransferRow>[],
  file: SimpleEffectsFile,
  products: readonly { slug: string; name: string }[],
  { operator, now }: { operator: string; now: string },
): ImportPlan {
  const known = new Map(products.map((p) => [p.slug, p.name]));
  const seen = new Set<string>();
  const planned: PlanRow[] = rows.map((r, i) => {
    const line = i + 2;
    const slug = (r.slug ?? "").trim();
    const errors: string[] = [];
    const notes: string[] = [];
    const name = known.get(slug) ?? "";
    if (!slug) errors.push("missing_slug");
    else if (!known.has(slug)) errors.push("unknown_product");
    if (slug && seen.has(slug)) errors.push("duplicate_row");
    seen.add(slug);
    if (r.name && name && fold(r.name.trim()) !== fold(name)) notes.push("name_differs");

    const description = {
      es: (r.description_es ?? "").trim(),
      en: (r.description_en ?? "").trim(),
    };
    const { ids, errors: tagErrors } = resolveTags(
      r.tags_es ?? "",
      r.tags_en ?? "",
      file.vocabulary,
    );
    errors.push(...tagErrors);
    const current = file.entries[slug];
    const findings = effectFindings({ tags: ids, description }, file.vocabulary);
    /* Structural findings only (an unknown tag). Warnings about the wording
       travel with the row to the plan and never refuse it. */
    for (const f of findings) if (f.level === "error") errors.push(`${f.code}:${f.detail ?? ""}`);

    if (errors.length) return { line, slug, name, kind: "error", errors, findings, notes };
    if (!description.es && !description.en && ids.length === 0) {
      return { line, slug, name, kind: "empty", errors, findings, notes };
    }
    const same =
      current &&
      current.tags.join("|") === ids.join("|") &&
      current.description.es === description.es &&
      current.description.en === description.en;
    if (same) {
      if (r.notes !== undefined && r.notes.trim() !== current.notes) {
        notes.push("notes_ignored_on_unchanged");
      }
      return { line, slug, name, kind: "unchanged", errors, findings, notes };
    }
    if (r.status && r.status !== "draft") notes.push(`status_${r.status}_imported_as_draft`);
    const base = current ?? blankEntry(slug);
    const next: SimpleEffectsEntry = {
      ...base,
      status: "draft",
      tags: ids,
      description,
      notes: r.notes !== undefined ? r.notes.trim() : base.notes,
      source: "import",
      revision: base.revision + 1,
      updatedAt: now,
      updatedBy: `${operator} (import)`,
    };
    return {
      line,
      slug,
      name,
      kind: current ? "changed" : "new",
      errors,
      findings,
      notes,
      next,
    };
  });
  const counts = { new: 0, changed: 0, unchanged: 0, empty: 0, error: 0 } as Record<
    PlanKind,
    number
  >;
  for (const p of planned) counts[p.kind] += 1;
  return { ok: counts.error === 0, rows: planned, counts };
}

/** Apply a plan that has no errors. Returns the new file; never mutates. */
export function applyPlan(file: SimpleEffectsFile, plan: ImportPlan): SimpleEffectsFile {
  if (!plan.ok) throw new Error("refusing to apply an import plan with errors");
  const entries = { ...file.entries };
  for (const row of plan.rows) if (row.next) entries[row.slug] = row.next;
  return { ...file, entries };
}
