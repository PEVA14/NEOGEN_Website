import { notFound } from "next/navigation";

/**
 * NO SLUG IS VALID, and the framework — not this component — is what says so.
 *
 * Calling `notFound()` from a dynamically rendered segment renders the 404 page
 * but answers **HTTP 200**: a soft 404, which search engines index as a real
 * page. An empty param list plus `dynamicParams = false` makes every slug
 * genuinely unmatched instead, so the framework's own handling returns a true
 * 404 status.
 *
 * When articles exist, `generateStaticParams` returns them and this stops being
 * a closed door without any other change.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

/**
 * ARTICLE ROUTE — reserved, and deliberately unreachable.
 *
 * NO ARTICLES EXIST. This route previously rendered a shell that echoed the
 * requested slug as a heading, which meant every URL under /investigacion/
 * resolved to a page that looked like an article and contained none. A shell
 * that answers 200 to any slug is a fake integration that appears
 * production-ready — the exact thing the project rules forbid.
 *
 * So every slug is a 404 until there is something to serve. The route stays
 * registered because two decisions made here are worth keeping:
 *
 *   1. Long-form reading uses `Prose` inside `Container width="prose"`, capped
 *      at `--container-prose`. Editorial measure is first-class from the start.
 *   2. TODO(research-phase): choose the authoring format — MDX versus
 *      structured blocks — BEFORE any content is written. `Article["body"]` is
 *      typed `never[]` until that decision is made, so nothing can be authored
 *      against a format we have not chosen.
 */
export default async function ArticlePage() {
  // Unreachable while `generateStaticParams` is empty. Kept explicit so the
  // route cannot start serving a blank page if that ever changes by accident.
  notFound();
}
