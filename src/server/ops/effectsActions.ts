"use server";

import { redirect } from "next/navigation";

import { applyBulkStatus, applyEdit, blankEntry, tagIdFrom } from "@/content/effects/rules";
import { applyPlan, planImport, readTransfer } from "@/content/effects/transfer";
import { EFFECT_STATUSES } from "@/content/effects/types";
import { publishedProducts } from "@/data/catalog";
import { EffectsStoreError, updateEffects } from "@/server/effects/store";

import { OPS_PATH, requireOperator } from "./auth";

import type { ImportPlan } from "@/content/effects/transfer";
import type { EffectStatus } from "@/content/effects/types";

/**
 * SIMPLE EFFECTS — the console's actions. Each one is a public endpoint and
 * is treated as one: the operator's session is checked again, every field is
 * read against a closed list, and the rules in `content/effects` decide what
 * is legal. The page only offers; this refuses.
 *
 * Nothing here can touch the scientific record. The only file these actions
 * write is `simple-effects.json`, through `server/effects/store`.
 */

const BASE = `${OPS_PATH}/contenido/efectos`;

const field = (form: FormData, name: string): string => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

const oneOf = <T extends string>(value: string, allowed: readonly T[]): T | null =>
  (allowed as readonly string[]).includes(value) ? (value as T) : null;

const products = () => publishedProducts.map((p) => ({ slug: p.slug, name: p.name }));

const storeCode = (error: unknown) =>
  error instanceof EffectsStoreError ? error.code : "invalid_input";

/* --------------------------------------------------------------- an entry */

export async function saveEffectAction(form: FormData): Promise<void> {
  const operator = await requireOperator();
  const slug = field(form, "slug");
  if (!publishedProducts.some((p) => p.slug === slug)) {
    redirect(`${BASE}?error=unknown_product`);
  }
  const here = `${BASE}/${encodeURIComponent(slug)}`;
  const status = oneOf<EffectStatus>(field(form, "status"), EFFECT_STATUSES);
  const revision = Number(field(form, "revision"));
  if (!status || !Number.isInteger(revision)) {
    redirect(`${here}?error=invalid_input`);
  }
  const tags = form.getAll("tags").filter((t): t is string => typeof t === "string");

  let outcome: string;
  try {
    outcome = await updateEffects((file) => {
      const known = new Set(file.vocabulary.map((t) => t.id));
      const result = applyEdit(
        file.entries[slug] ?? blankEntry(slug),
        {
          tags: tags.filter((t) => known.has(t)),
          description: {
            es: field(form, "description_es").slice(0, 1000),
            en: field(form, "description_en").slice(0, 1000),
          },
          notes: field(form, "notes").slice(0, 4000),
          status,
        },
        file.vocabulary,
        { operator, now: new Date().toISOString(), revision },
      );
      if (!result.ok) {
        const blockers = result.blockers?.length ? `&b=${result.blockers.join(",")}` : "";
        return { file: null, result: `error=${result.reason}${blockers}` };
      }
      return {
        file: { ...file, entries: { ...file.entries, [slug]: result.entry } },
        result: "ok=effects_saved",
      };
    });
  } catch (error) {
    outcome = `error=${storeCode(error)}`;
  }
  redirect(`${here}?${outcome}`);
}

/* ------------------------------------------------------------------ bulk */

/**
 * Approve, or return to draft, every selected entry — one explicit owner
 * decision. Each entry passes the same structural gate as a single save; one
 * that fails it is left untouched and named back on the list. Only the
 * status changes.
 */
export async function bulkStatusAction(form: FormData): Promise<void> {
  const operator = await requireOperator();
  const known = new Set(publishedProducts.map((p) => p.slug));
  const slugs = form
    .getAll("slug")
    .filter((s): s is string => typeof s === "string" && known.has(s))
    .slice(0, 500);
  const status = oneOf<EffectStatus>(field(form, "status"), ["approved", "draft"]);

  // Return to the same view the owner was looking at.
  const back = new URLSearchParams();
  const vista = field(form, "vista");
  const q = field(form, "q").slice(0, 120);
  if (vista) back.set("vista", vista);
  if (q) back.set("q", q);

  if (!status) {
    back.set("error", "invalid_input");
  } else if (slugs.length === 0) {
    back.set("error", "bulk_empty");
  } else {
    try {
      const result = await updateEffects((file) => {
        const r = applyBulkStatus(file, slugs, status, {
          operator,
          now: new Date().toISOString(),
        });
        return { file: r.changed.length ? r.file : null, result: r };
      });
      back.set("ok", status === "approved" ? "effects_bulk_approved" : "effects_bulk_draft");
      back.set("n", String(result.changed.length));
      if (result.unchanged.length) back.set("u", String(result.unchanged.length));
      if (result.skipped.length) back.set("skip", result.skipped.map((x) => x.slug).join(","));
    } catch (error) {
      back.set("error", storeCode(error));
    }
  }
  redirect(`${BASE}?${back.toString()}`);
}

/* --------------------------------------------------------------- import */

export interface ImportState {
  text: string;
  problem: string | null;
  plan: ImportPlan | null;
  applied: { new: number; changed: number } | null;
}

/**
 * Plan an import, or — with `apply=1` — plan it again and apply it. The plan
 * is always recomputed from the text on the server: a confirmed plan is never
 * trusted from the browser.
 */
export async function importAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  const operator = await requireOperator();
  const text = field(form, "text").slice(0, 2_000_000);
  const apply = field(form, "apply") === "1";
  const read = readTransfer(text);
  if (!read.ok) return { text, problem: read.problem, plan: null, applied: null };
  try {
    return await updateEffects<ImportState>((file) => {
      const plan = planImport(read.rows, file, products(), {
        operator,
        now: new Date().toISOString(),
      });
      if (!apply || !plan.ok) {
        return { file: null, result: { text, problem: null, plan, applied: null } };
      }
      return {
        file: applyPlan(file, plan),
        result: {
          text: "",
          problem: null,
          plan,
          applied: { new: plan.counts.new, changed: plan.counts.changed },
        },
      };
    });
  } catch (error) {
    return { text, problem: storeCode(error), plan: null, applied: null };
  }
}

/* ------------------------------------------------------------ vocabulary */

const TAGS = `${BASE}/etiquetas`;

export async function addTagAction(form: FormData): Promise<void> {
  await requireOperator();
  const es = field(form, "es").trim().slice(0, 40);
  const en = field(form, "en").trim().slice(0, 40);
  const id = tagIdFrom(es);
  if (!es || !en || !id) redirect(`${TAGS}?error=tag_invalid`);
  let outcome: string;
  try {
    outcome = await updateEffects((file) => {
      if (file.vocabulary.some((t) => t.id === id))
        return { file: null, result: "error=tag_exists" };
      return {
        file: { ...file, vocabulary: [...file.vocabulary, { id, label: { es, en } }] },
        result: "ok=tag_added",
      };
    });
  } catch (error) {
    outcome = `error=${storeCode(error)}`;
  }
  redirect(`${TAGS}?${outcome}`);
}

/** Relabel a tag. Its id — what entries point at — never changes. */
export async function updateTagAction(form: FormData): Promise<void> {
  await requireOperator();
  const id = field(form, "id");
  const es = field(form, "es").trim().slice(0, 40);
  const en = field(form, "en").trim().slice(0, 40);
  if (!es || !en) redirect(`${TAGS}?error=tag_invalid`);
  let outcome: string;
  try {
    outcome = await updateEffects((file) => {
      if (!file.vocabulary.some((t) => t.id === id)) {
        return { file: null, result: "error=invalid_input" };
      }
      return {
        file: {
          ...file,
          vocabulary: file.vocabulary.map((t) => (t.id === id ? { id, label: { es, en } } : t)),
        },
        result: "ok=tag_updated",
      };
    });
  } catch (error) {
    outcome = `error=${storeCode(error)}`;
  }
  redirect(`${TAGS}?${outcome}`);
}

export async function deleteTagAction(form: FormData): Promise<void> {
  await requireOperator();
  const id = field(form, "id");
  let outcome: string;
  try {
    outcome = await updateEffects((file) => {
      if (Object.values(file.entries).some((e) => e.tags.includes(id))) {
        return { file: null, result: "error=tag_in_use" };
      }
      return {
        file: { ...file, vocabulary: file.vocabulary.filter((t) => t.id !== id) },
        result: "ok=tag_deleted",
      };
    });
  } catch (error) {
    outcome = `error=${storeCode(error)}`;
  }
  redirect(`${TAGS}?${outcome}`);
}
