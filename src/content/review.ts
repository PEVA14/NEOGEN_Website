import type { ContentStatus } from "@/content/lifecycle";

/**
 * REVIEW BATCHES — one switch per batch of sourced content.
 *
 * A batch is written against its sources and then read by the owner. Until
 * the owner has read it, nothing in it renders: `publicOverview` and
 * `isPublicReference` both require `approved`. Approving a batch is changing
 * its one status here, not editing every record.
 */

/**
 * Batch 1 — flagship compound profiles: retatrutide (RETA), GHK-Cu, BPC-157,
 * TB-500 and the GLOW blend. Drafted 2026-09-16. Every reference's metadata
 * and every quoted figure was read from the source's abstract via Europe PMC.
 *
 * APPROVED BY THE OWNER, 2026-09-17. It now renders: the overview section and
 * citation rail on those five product pages, the Research Hub's reference
 * index, the Atlas result cards, and the research-function question.
 */
export const BATCH_1_FLAGSHIP_PROFILES: ContentStatus = "approved";

/**
 * Batch 2 — the incretin compounds: tirzepatide and semaglutide. Drafted
 * 2026-09-17, same method: every reference's metadata and every quoted figure
 * read from the source's own abstract via Europe PMC.
 *
 * APPROVED BY THE OWNER, 2026-09-17. SURPASS-2 is now cited from both
 * profiles — tirzepatide as the trial arm, semaglutide as the comparator — so
 * the Research Hub shows one record read from both ends.
 */
export const BATCH_2_INCRETIN_PROFILES: ContentStatus = "approved";

/**
 * Batch 3 — the rest of the metabolic line: cagrilintide, survodutide,
 * mazdutide, tesamorelin, AOD9604, the hGH lipolytic fragment, 5-amino-1MQ,
 * SLU-PP-332, adipotide and L-carnitine. Drafted 2026-09-17, same method.
 *
 * NOT covered, for lack of literature rather than for lack of trying: Lemon
 * Bottle and the two Lipo-C blends. A search returned no primary study of
 * either preparation, and a profile assembled from its components would be
 * NEOGEN's inference rather than a published finding.
 */
export const BATCH_3_METABOLIC_PROFILES: ContentStatus = "owner-review";
