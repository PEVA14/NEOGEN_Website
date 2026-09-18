import { z } from "zod";

/**
 * WHAT THE MODEL IS ALLOWED TO RETURN.
 *
 * Prose and identifiers — nothing else. There is no field for a price, a
 * strength, a presentation, a documentation record, a reference or an
 * availability state, because every one of those is rendered by the page from
 * the registry after generation. A model cannot invent a fact that has nowhere
 * to go.
 *
 * Lengths, counts, membership and budget fit are NOT expressed here —
 * structured outputs cannot express them, and they depend on the policy's
 * constraints for this visitor. `validateAtlasGeneration` enforces them.
 */
const pick = z.object({
  slug: z.string(),
  /** Why this product, connected to what the visitor said. */
  why: z.string(),
  /**
   * Which of THIS product's approved statements to put forward, by id, from
   * its `evidence` column. The page prints the statement and its references
   * from the registry; the model never writes a finding.
   */
  evidence: z.array(z.string()),
});

export const atlasGenerationSchema = z.object({
  /** A short, personal headline for the result. */
  headline: z.string(),
  /** Two or three direct sentences: what Atlas suggests, and the reasoning in brief. */
  summary: z.string(),
  /** What Atlas understood about the visitor, in plain words. */
  aboutYou: z.string(),
  /** Where to start — slugs from the candidate list only. */
  start: z.array(pick),
  /** Worth adding or considering next — candidates or offered supplies. */
  more: z.array(pick),
  /** One entry per topic the visitor chose, in their order. */
  topics: z.array(z.object({ areaId: z.string(), note: z.string() })),
  /** What to look at next — destination ids from the provided list only. */
  nextSteps: z.array(z.object({ destinationId: z.string(), note: z.string() })),
  /** Short practical pointers about choosing and buying. Never health guidance. */
  tips: z.array(z.string()),
  /**
   * The visitor's note touched personal or health matters. The page answers
   * with fixed, owner-approved copy — the model never writes that notice.
   */
  contextMentionsHealth: z.boolean(),
});

export type AtlasGeneration = z.infer<typeof atlasGenerationSchema>;
