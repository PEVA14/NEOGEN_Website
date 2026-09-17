import "server-only";

import { RESEARCH_FUNCTIONS, type ResearchFunctionId } from "@/content/functions";
import { publicFunctions } from "@/content/overview";
import { publishedProducts } from "@/data/catalog";

/**
 * The research functions Atlas may OFFER: those with at least one published
 * product whose tag is backed by an approved, sourced statement. With no
 * approved overview, this is empty and the question is not asked.
 */
export function offeredResearchFunctions(): readonly {
  id: ResearchFunctionId;
  compounds: number;
}[] {
  return RESEARCH_FUNCTIONS.map((fn) => ({
    id: fn.id,
    compounds: publishedProducts.filter((p) => publicFunctions(p.slug).includes(fn.id)).length,
  })).filter((fn) => fn.compounds > 0);
}
