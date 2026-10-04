/**
 * A BLEND'S COMPOSITION, AS DATA — GLOW's parts, read as products.
 *
 * Read from the catalogue's own `composition` string, verbatim from the
 * source ("GHK-CU 50mg + TB-500 10mg + BPC-157 10mg"), and nothing else:
 *
 *   name    as the source prints it
 *   mg      the stated mass of that part
 *   slug    the catalogue product of the same name, when exactly one exists
 *           (compared without case, spaces or punctuation, against each
 *           product's name and its slug — "GHK-CU" is the product
 *           "Copper Peptide GHK-Cu", slug `ghk-cu`): a link to a product
 *           NEOGEN sells, not a claim about how the parts relate
 *
 * Plain data, no React, so the page computes it on the server.
 */
export interface Constituent {
  name: string;
  mg: number;
  slug: string | null;
}

const PART = /^(.+?)\s+(\d+(?:\.\d+)?)\s*mg$/i;

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export function blendConstituents(
  composition: string | null,
  catalogue: readonly { slug: string; name: string }[],
): Constituent[] | null {
  if (!composition) return null;
  const parts = composition.split("+").map((part) => PART.exec(part.trim()));
  if (parts.length < 2 || parts.some((part) => part === null)) return null;

  const read = parts.map((part) => ({ name: part![1].trim(), mg: Number(part![2]) }));

  return read.map((part) => {
    const matches = catalogue.filter(
      (product) => key(product.name) === key(part.name) || key(product.slug) === key(part.name),
    );
    return {
      ...part,
      slug: matches.length === 1 ? matches[0].slug : null,
    };
  });
}
