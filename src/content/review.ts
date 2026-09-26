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
 *
 * APPROVED BY THE OWNER, 2026-09-17. Four of these compounds are preclinical
 * only and each says so in its own technical note; the metabolic area now has
 * a profile on 13 of its 16 products.
 */
export const BATCH_3_METABOLIC_PROFILES: ContentStatus = "approved";

/**
 * Batch 4 — the recovery area: thymosin alpha-1, KPV, ARA-290, LL-37, AHK-Cu,
 * Thymalin, KLOW and the two BPC+TB blends. Drafted 2026-09-17, same method.
 *
 * NOT covered: Vesugen (KED) and Cartalax (AED). The only literature a search
 * returns is review and transport work from a single research group, none of
 * it establishing a finding for these two tripeptides specifically. Citing a
 * review about short peptides in general as if it were about these would be
 * the kind of borrowed authority this content model exists to prevent.
 *
 * APPROVED BY THE OWNER, 2026-09-17.
 */
export const BATCH_4_RECOVERY_PROFILES: ContentStatus = "approved";

/**
 * Batch 5 — the remainder: the growth line, the hormonal line, longevity,
 * neuro, skin, and the two unfiled products. Drafted 2026-09-17, same method.
 *
 * NOT COVERED, and the reason in each case:
 *
 *   Follistatin 344, Gonadorelin, HMG — no source found that states what the
 *     product is and reports a finding for it specifically.
 *   Epithalon's neighbours (Cardiogen, Cortagen, Crystagen, Pinealon,
 *     Vesugen, Cartalax) — the literature is reviews from one research group
 *     that do not establish a finding for the individual tripeptide.
 *   DSIP, PE 22-28, SNAP-8, Adamax (both) — nothing on-point. PE 22-28's
 *     literature is about spadin, a longer peptide, and the relationship
 *     between them needs its own source before it can be stated.
 *   Relaxation PM, SUPER Human Blend, Healthy Hair Skin Nails Blend, Lipo-C
 *     (both), Lemon Bottle — blends with no published study, and for most of
 *     them no declared composition to work from.
 *   Sterile, bacteriostatic and amino-acid water — supplies, not compounds.
 *
 * APPROVED BY THE OWNER, 2026-09-17. With this, 62 of the 85 published
 * products carry a sourced profile and all 35 research functions are offered.
 */
export const BATCH_5_REMAINDER_PROFILES: ContentStatus = "approved";

/**
 * Batch 6 — the recordless audit (2026-09-26): every published product that
 * had no sourced profile, investigated one by one against PubMed and Europe
 * PMC. Every reference's metadata was read from PubMed's own record; every
 * statement was written from the source's abstract (or full text where open)
 * and checked against it sentence by sentence. Batch 5's "not covered" list
 * was wrong for several of these: the literature exists, under the product
 * name or under its sequence.
 *
 * DRAFTED — ten profiles: PE-22-28, DSIP, Follistatin 344, HMG, Gonadorelin,
 * Pinealon, Vesugen, Cortagen, Cardiogen and Cartalax. Mostly cell and animal
 * work; the human evidence (DSIP, HMG, gonadorelin, the Follistatin 344 case
 * series and gene-transfer trial) is kept with its null, weak and
 * contradictory results.
 *
 * NOT DRAFTED, and why:
 *
 *   SNAP-8 — no primary study of the molecule itself. Its only mechanistic
 *     figures trace, through reviews, to the manufacturer's data; every
 *     clinical study tests a formulation with several actives.
 *   Adamax (both) — no literature: "Adamax" in PubMed and Europe PMC is a
 *     machine-learning optimiser. Semax evidence is not Adamax evidence.
 *   Crystagen — one Russian-language abstract, one qualitative sentence, and
 *     no source that states its sequence.
 *   Lipo-C (both), Lemon Bottle — no study of either formulation; ingredient
 *     evidence is not evidence for the mixture.
 *   Relaxation PM, SUPER Human Blend, Healthy Hair Skin Nails Blend — no
 *     declared composition, so not even the identity can be established.
 *   Sterile, bacteriostatic and amino-acid water — supplies, not compounds;
 *     they stay product entries.
 *
 * OWNER REVIEW. Nothing here renders until this is set to "approved".
 */
export const BATCH_6_RECORDLESS_AUDIT: ContentStatus = "owner-review";
