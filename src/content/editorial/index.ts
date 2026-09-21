import { isPublicReference, REFERENCES } from "@/content/references";

import { ARTICLES } from "./registry";

import type { Article, ArticleBlock, ArticleTopic } from "./types";

export { ARTICLES } from "./registry";
export type {
  Article,
  ArticleBlock,
  ArticleStatus,
  ArticleTopic,
  EditorialClass,
  HeadingBlock,
  ListBlock,
  NoteBlock,
  ParagraphBlock,
  TermsBlock,
} from "./types";

/**
 * EDITORIAL — the publication gate.
 *
 * Two independent conditions, the same architecture as every other content
 * module here: the ARTICLE must be approved, and each BLOCK must be able to
 * stand up on its own. A `sourced` block with no approved public reference
 * behind it is dropped, and an article whose body empties out is not published
 * at all rather than rendering as a title over nothing.
 *
 * Reserved slugs are guarded here too. Notes live at `/investigacion/<slug>`,
 * beside the documentation explorer and the reference index, so a note called
 * "calidad" would quietly take over an existing page. The route generates
 * exactly what these functions return, so a collision fails the gate instead
 * of shipping.
 */

/** Slugs under `/investigacion` that belong to something other than a note. */
export const RESERVED_ARTICLE_SLUGS: readonly string[] = ["calidad", "referencias", "notas"];

/** A block renders when its class does not require evidence it does not have. */
export function isPublishableBlock(block: ArticleBlock): boolean {
  if (block.editorialClass !== "sourced") return true;
  const ids = block.references ?? [];
  if (ids.length === 0) return false;
  return ids.every((id) => {
    const reference = REFERENCES.find((r) => r.id === id);
    return reference !== undefined && isPublicReference(reference);
  });
}

/** The article as a reader gets it: approved, with unsupported blocks removed. */
export function publicArticle(slug: string): Article | undefined {
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article || article.status !== "approved") return undefined;
  if (RESERVED_ARTICLE_SLUGS.includes(article.slug)) return undefined;
  const body = article.body.filter(isPublishableBlock);
  if (body.length === 0) return undefined;
  return { ...article, body };
}

/**
 * Every published note, newest first.
 *
 * Ties break on REGISTRY ORDER, which is the editorial sequence: four notes
 * approved on the same day should read in the order they were meant to be
 * read, starting with the one that defines the word. Sorting them
 * alphabetically put "how to read a certificate of analysis" in front of
 * "what is a peptide", which is exactly backwards for a first-time reader —
 * and any tie-break is needed anyway, because a list that reshuffles between
 * builds makes the sitemap noisy for no reason.
 */
export function publicArticles(): readonly Article[] {
  const order = new Map(ARTICLES.map((a, index) => [a.slug, index]));
  return ARTICLES.map((a) => publicArticle(a.slug))
    .filter((a): a is Article => a !== undefined)
    .sort((a, b) =>
      a.publishedOn === b.publishedOn
        ? (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0)
        : b.publishedOn.localeCompare(a.publishedOn),
    );
}

export function articlesByTopic(topic: ArticleTopic): readonly Article[] {
  return publicArticles().filter((a) => a.topic === topic);
}

/**
 * Notes to read next, for the foot of an article.
 *
 * Same topic first, then the rest — so a reader who has just finished the COA
 * note is offered the documentation ones before the vocabulary ones, and the
 * rail is never empty while any other note exists.
 */
export function relatedArticles(slug: string, limit = 3): readonly Article[] {
  const current = publicArticle(slug);
  if (!current) return [];
  const others = publicArticles().filter((a) => a.slug !== slug);
  const sameTopic = others.filter((a) => a.topic === current.topic);
  const rest = others.filter((a) => a.topic !== current.topic);
  return [...sameTopic, ...rest].slice(0, limit);
}

/** Does the editorial section exist at all? Drives the nav and the sitemap. */
export function hasArticles(): boolean {
  return publicArticles().length > 0;
}
