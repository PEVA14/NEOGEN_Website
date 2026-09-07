import type { WorldId } from "@/config/worlds";
import type { Locale } from "@/i18n/config";

/**
 * Research/editorial content MODEL only. Contains ZERO content.
 *
 * Research is core brand infrastructure, not a blog. Articles may relate to
 * products, but that relationship must never imply a therapeutic, efficacy or
 * safety claim. See docs/NEOGEN_MVP_SCOPE.md.
 */

export interface ArticleAuthor {
  name: string;
  /** Dictionary key for the role. Never invent credentials. */
  roleKey: string | null;
}

export interface Article {
  slug: string;
  locale: Locale;
  title: string;
  /** One-sentence editorial standfirst. */
  summary: string;
  /** ISO 8601 date string. */
  publishedAt: string;
  updatedAt: string | null;
  author: ArticleAuthor | null;

  /** Optional world association for the article's Experience Mode header. */
  world: WorldId | null;

  coverImage: { src: string; alt: string; width: number; height: number } | null;

  /** Slugs of products this article relates to — association, not endorsement. */
  relatedProductSlugs: string[];

  /**
   * Body content.
   * TODO(research-phase): choose the authoring format (MDX vs structured
   * blocks). Deliberately typed as `never[]` so no content can be added before
   * that decision is made.
   */
  body: never[];
}
