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
 * Lengths and membership are NOT expressed here: structured outputs do not
 * support string-length constraints, and "is this slug one of the fourteen I
 * was given" is not something a schema can know. `validateAtlasGeneration`
 * enforces both, after parsing.
 */
export const atlasGenerationSchema = z.object({
  /** A short title for this reader's map. */
  title: z.string(),
  /** Two to four sentences framing the map in catalogue terms. */
  summary: z.string(),
  /** One entry per selected area, in the reader's order. */
  areas: z.array(
    z.object({
      areaId: z.string(),
      rationale: z.string(),
    }),
  ),
  /** The compounds this map leads with — slugs from the candidate list only. */
  compounds: z.array(
    z.object({
      slug: z.string(),
      role: z.enum(["core", "complement"]),
      rationale: z.string(),
    }),
  ),
  /** Where to go next — destination ids from the provided list only. */
  path: z.array(
    z.object({
      destinationId: z.string(),
      note: z.string(),
    }),
  ),
  /** Short considerations about reading the map. Never health guidance. */
  notes: z.array(z.string()),
  /**
   * The reader's note touched personal or health matters. The page answers
   * with fixed, owner-approved copy — the model never writes that notice.
   */
  contextMentionsHealth: z.boolean(),
});

export type AtlasGeneration = z.infer<typeof atlasGenerationSchema>;
