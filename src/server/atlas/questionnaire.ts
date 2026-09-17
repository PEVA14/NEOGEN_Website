import "server-only";

import { RESEARCH_FUNCTIONS, RESEARCH_FUNCTION_GROUPS } from "@/content/functions";
import { ATLAS_QUESTIONNAIRE } from "@/content/atlas/questionnaire";
import { isPublishable, publishedProducts } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import {
  atlasExperienceLevels,
  atlasForms,
  atlasHistories,
  atlasHorizons,
  atlasIntents,
  atlasPriorities,
  atlasSizes,
  atlasStyles,
  atlasTimings,
  buildQuestionnaireView,
  type AtlasOptionResolver,
  type AtlasProfileVocabularies,
  type AtlasQuestionnaireView,
} from "@/domain/atlas";
import { localeTags, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

import { offeredResearchFunctions } from "./functions";

/**
 * THE QUESTIONNAIRE, RESOLVED ON THE SERVER.
 *
 * One function builds the view the page renders AND the view the API route
 * validates against, from the same content file and the same registries. There
 * is no second description of the questionnaire anywhere: the browser cannot
 * be asked a question the server will not accept, and an answer the browser
 * accepted cannot be rejected for a different reason.
 *
 * REGISTRY OPTIONS ARE READ HERE, NEVER AUTHORED. Areas bring their own name,
 * framing, compound count and entry price; products bring their name and
 * areas; research functions bring their label and how many compounds carry an
 * approved, sourced tag. Questionnaire content names the registry and nothing
 * else.
 */

/** The closed vocabularies the policy recognises, for role mapping. */
export const ATLAS_VOCABULARIES: AtlasProfileVocabularies = {
  intents: atlasIntents,
  experience: atlasExperienceLevels,
  histories: atlasHistories,
  priorities: atlasPriorities,
  styles: atlasStyles,
  forms: atlasForms,
  sizes: atlasSizes,
  horizons: atlasHorizons,
  timings: atlasTimings,
};

export async function atlasQuestionnaireView(locale: Locale): Promise<AtlasQuestionnaireView> {
  const dict = await getDictionary(locale);
  const tag = localeTags[locale];
  const areas = publicAreas();
  const productsByArea = new Map(
    areas.map((area) => [area.id, productsInArea(area.id).filter(isPublishable)]),
  );
  const prices = await getPrices(
    [...productsByArea.values()].flat().flatMap((p) => p.variants.map((v) => v.id)),
  );

  const areaOptions = areas.map((area) => {
    const products = productsByArea.get(area.id) ?? [];
    const amounts = products
      .flatMap((p) => p.variants.map((v) => prices.get(v.id)?.amount))
      .filter((amount): amount is number => typeof amount === "number");
    const copy = dict.discovery.areas[area.id];
    return {
      id: area.id,
      label: copy.short,
      hint: null,
      meta: {
        area: area.id,
        framing: copy.title,
        body: copy.body,
        compounds: products.length,
        ...(amounts.length > 0
          ? { entryPrice: formatPrice({ amount: Math.min(...amounts), currency: "MXN" }, tag) }
          : {}),
      },
    };
  });

  const productOptions = publishedProducts
    .map((product) => ({
      id: product.slug,
      label: product.name,
      hint: null,
      meta: { areas: publicAreasFor(product.slug).map((area) => area.id) },
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  /* In group order, so the renderer's sections follow the vocabulary's own. */
  const offered = offeredResearchFunctions();
  const functionOptions = RESEARCH_FUNCTION_GROUPS.flatMap((group) =>
    RESEARCH_FUNCTIONS.filter((fn) => fn.group === group.id).flatMap((fn) => {
      const row = offered.find((o) => o.id === fn.id);
      if (!row) return [];
      return [
        {
          id: fn.id,
          label: fn.label[locale],
          hint: fn.hint[locale],
          meta: {
            compounds: row.compounds,
            group: group.id,
            groupLabel: group.label[locale],
          },
        },
      ];
    }),
  );

  const resolve: AtlasOptionResolver = (registry) =>
    registry === "discovery-areas"
      ? areaOptions
      : registry === "published-products"
        ? productOptions
        : functionOptions;

  return buildQuestionnaireView(ATLAS_QUESTIONNAIRE, locale, resolve);
}
