import { normaliseText } from "./screen";
import {
  ATLAS_MAX_IN_MIND,
  ATLAS_MAX_PRIORITIES,
  ATLAS_MAX_TOPICS,
  ATLAS_NAME_MAX,
  ATLAS_NOTE_MAX,
  atlasBudgets,
  atlasExperienceLevels,
  atlasForms,
  atlasHistories,
  atlasHorizons,
  atlasIntents,
  atlasPriorities,
  atlasSizes,
  atlasStyles,
  atlasTimings,
  type AtlasProfile,
} from "./types";

import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THE QUESTIONNAIRE → A STRUCTURED PROFILE.
 *
 * The body of `POST /api/atlas` is untrusted. Every answer is checked against
 * a closed vocabulary and anything unexpected is REJECTED rather than coerced.
 *
 * This file decides only what is a well-formed answer. It makes no judgement
 * about what an answer may be USED for — including whether the free-text note
 * may be read by a model. That is the policy's job (`policy.ts`), so the
 * profile stays a faithful record of what the visitor said.
 */

export type AtlasProfileResult =
  { ok: true; profile: AtlasProfile } | { ok: false; issues: readonly string[] };

export interface AtlasProfileVocabulary {
  topics: readonly DiscoveryAreaId[];
  /** Published product slugs. */
  products: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAtlasProfile(
  input: unknown,
  vocabulary: AtlasProfileVocabulary,
): AtlasProfileResult {
  if (!isRecord(input)) return { ok: false, issues: ["body must be an object"] };
  const issues: string[] = [];

  const list = (key: string, allowed: readonly string[], max: number, min = 0): string[] => {
    const value = input[key];
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === "string") ||
      value.length < min ||
      value.length > max ||
      new Set(value).size !== value.length
    ) {
      issues.push(`${key} must list ${min}–${max} distinct values`);
      return [];
    }
    const unknown = value.find((v) => !allowed.includes(v));
    if (unknown !== undefined) issues.push(`${key}: unknown value ${unknown}`);
    return value;
  };

  const one = <T extends string>(key: string, allowed: readonly T[]): T => {
    const value = input[key];
    if (typeof value !== "string" || !allowed.includes(value as T)) {
      issues.push(`${key} is not recognised`);
    }
    return value as T;
  };

  const text = (key: string, max: number): string => {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.length > max * 4) {
      issues.push(`${key} must be a short string`);
      return "";
    }
    return normaliseText(value, max);
  };

  const topics = list("topics", vocabulary.topics, ATLAS_MAX_TOPICS, 1);
  const intent = one("intent", atlasIntents);
  const inMind = list("inMind", vocabulary.products, ATLAS_MAX_IN_MIND);
  const firstName = text("firstName", ATLAS_NAME_MAX);
  const experience = one("experience", atlasExperienceLevels);
  const history = one("history", atlasHistories);
  const priorities = list("priorities", atlasPriorities, ATLAS_MAX_PRIORITIES);
  const style = one("style", atlasStyles);
  const forms = list("forms", atlasForms, atlasForms.length);
  const size = one("size", atlasSizes);
  if (typeof input.includeSupplies !== "boolean") issues.push("includeSupplies must be a boolean");
  const budget = one("budget", atlasBudgets);
  const horizon = one("horizon", atlasHorizons);
  const timing = one("timing", atlasTimings);
  const note = text("note", ATLAS_NOTE_MAX);

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    profile: {
      topics: topics as DiscoveryAreaId[],
      intent,
      inMind,
      firstName,
      experience,
      history,
      priorities: priorities as AtlasProfile["priorities"],
      style,
      forms: forms as AtlasProfile["forms"],
      size,
      includeSupplies: input.includeSupplies as boolean,
      budget,
      horizon,
      timing,
      note,
    },
  };
}
