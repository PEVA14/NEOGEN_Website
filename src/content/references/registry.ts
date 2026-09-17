import { BATCH_1_FLAGSHIP_PROFILES as BATCH_1 } from "@/content/review";

import type { Reference } from "./types";

/**
 * THE REFERENCE REGISTRY.
 *
 * Adding one means reading the source and copying its metadata from the
 * source — the journal page, PubMed, Europe PMC, the DOI resolver — never from
 * a secondary list, a search snippet, or memory. `npm run check:content`
 * validates every record's identifiers, and an approved record with no DOI,
 * PMID or URL fails. A reference renders only when a published statement
 * cites it (`content/research.ts`).
 */
export const REFERENCES: readonly Reference[] = [
  /* ---- Batch 1: retatrutide ---------------------------------------------- */
  {
    id: "ref-2022-coskun-ly3437943",
    title:
      "LY3437943, a novel triple glucagon, GIP, and GLP-1 receptor agonist for glycemic control and weight loss: From discovery to clinical proof of concept",
    authors: [
      "Coskun T",
      "Urva S",
      "Roell WC",
      "Qu H",
      "Loghin C",
      "Moyers JS",
      "O'Farrell LS",
      "Briere DA",
      "Sloop KW",
      "Thomas MK",
      "Pirro V",
      "Wainscott DB",
      "Willard FS",
      "Abernathy M",
      "Morford L",
      "Du Y",
      "Benson C",
      "Gimeno RE",
      "Haupt A",
      "Milicevic Z",
    ],
    publication: "Cell Metabolism",
    year: 2022,
    doi: "10.1016/j.cmet.2022.07.013",
    pmid: "35985340",
    url: null,
    sourceType: "journal-article",
    status: BATCH_1,
  },
  {
    id: "ref-2023-jastreboff-retatrutide-obesity",
    title: "Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial",
    authors: [
      "Jastreboff AM",
      "Kaplan LM",
      "Frías JP",
      "Wu Q",
      "Du Y",
      "Gurbuz S",
      "Coskun T",
      "Haupt A",
      "Milicevic Z",
      "Hartman ML",
      "Retatrutide Phase 2 Obesity Trial Investigators",
    ],
    publication: "The New England Journal of Medicine",
    year: 2023,
    doi: "10.1056/NEJMoa2301972",
    pmid: "37366315",
    url: null,
    sourceType: "journal-article",
    status: BATCH_1,
  },
  {
    id: "ref-2023-rosenstock-retatrutide-t2d",
    title:
      "Retatrutide, a GIP, GLP-1 and glucagon receptor agonist, for people with type 2 diabetes: a randomised, double-blind, placebo and active-controlled, parallel-group, phase 2 trial conducted in the USA",
    authors: [
      "Rosenstock J",
      "Frias J",
      "Jastreboff AM",
      "Du Y",
      "Lou J",
      "Gurbuz S",
      "Thomas MK",
      "Hartman ML",
      "Haupt A",
      "Milicevic Z",
      "Coskun T",
    ],
    publication: "The Lancet",
    year: 2023,
    doi: "10.1016/S0140-6736(23)01053-X",
    pmid: "37385280",
    url: null,
    sourceType: "journal-article",
    status: BATCH_1,
  },

  /* ---- Batch 1: GHK-Cu --------------------------------------------------- */
  {
    id: "ref-2015-pickart-ghk-skin",
    title: "GHK Peptide as a Natural Modulator of Multiple Cellular Pathways in Skin Regeneration",
    authors: ["Pickart L", "Vasquez-Soltero JM", "Margolina A"],
    publication: "BioMed Research International",
    year: 2015,
    doi: "10.1155/2015/648108",
    pmid: "26236730",
    url: null,
    sourceType: "review-article",
    status: BATCH_1,
  },
  {
    id: "ref-2018-pickart-ghk-cu-gene-data",
    title:
      "Regenerative and Protective Actions of the GHK-Cu Peptide in the Light of the New Gene Data",
    authors: ["Pickart L", "Margolina A"],
    publication: "International Journal of Molecular Sciences",
    year: 2018,
    doi: "10.3390/ijms19071987",
    pmid: "29986520",
    url: null,
    sourceType: "review-article",
    status: BATCH_1,
  },

  /* ---- Batch 1: BPC-157 and TB-500 --------------------------------------- */
  {
    id: "ref-2025-vasireddi-bpc157-review",
    title: "Emerging Use of BPC-157 in Orthopaedic Sports Medicine: A Systematic Review",
    authors: [
      "Vasireddi N",
      "Hahamyan H",
      "Salata MJ",
      "Karns M",
      "Calcei JG",
      "Voos JE",
      "Apostolakos JM",
    ],
    publication: "HSS Journal",
    year: 2025,
    doi: "10.1177/15563316251355551",
    pmid: "40756949",
    url: null,
    sourceType: "review-article",
    status: BATCH_1,
  },
  {
    id: "ref-2012-goldstein-thymosin-b4",
    title:
      "Thymosin β4: a multi-functional regenerative peptide. Basic properties and clinical applications",
    authors: ["Goldstein AL", "Hannappel E", "Sosne G", "Kleinman HK"],
    publication: "Expert Opinion on Biological Therapy",
    year: 2012,
    doi: "10.1517/14712598.2012.634793",
    pmid: "22074294",
    url: null,
    sourceType: "review-article",
    status: BATCH_1,
  },
  {
    id: "ref-1999-malinda-thymosin-b4-wound",
    title: "Thymosin beta4 accelerates wound healing",
    authors: [
      "Malinda KM",
      "Sidhu GS",
      "Mani H",
      "Banaudha K",
      "Maheshwari RK",
      "Goldstein AL",
      "Kleinman HK",
    ],
    publication: "The Journal of Investigative Dermatology",
    year: 1999,
    doi: "10.1046/j.1523-1747.1999.00708.x",
    pmid: "10469335",
    url: null,
    sourceType: "journal-article",
    status: BATCH_1,
  },
  {
    id: "ref-2026-bicer-bpc157-tb500-achilles",
    title:
      "Effects of BPC-157 and TB-500 on Achilles tendon healing in rats: A histopathological and biomechanical study",
    authors: [
      "Biçer O",
      "Adanir O",
      "Güleryüz Y",
      "Balci EC",
      "Dinçel YM",
      "Yenigün MY",
      "Aydin C",
      "Bayrak BY",
    ],
    publication: "Joint Diseases and Related Surgery",
    year: 2026,
    doi: "10.52312/jdrs.2026.2951",
    pmid: "42542926",
    url: null,
    sourceType: "journal-article",
    status: BATCH_1,
  },

  /* ---- Batch 1: shared --------------------------------------------------- */
  {
    id: "ref-2026-tewari-peptide-supplements",
    title: "Peptide Supplements and Their Therapeutic Applications in Sports Medicine",
    authors: ["Tewari K", "Liu TP", "Im C", "Hamad C", "Petrigliano F", "Cheung EC", "Kremen TJ"],
    publication: "The American Journal of Sports Medicine",
    year: 2026,
    doi: "10.1177/03635465261464420",
    pmid: "42578445",
    url: null,
    sourceType: "review-article",
    status: BATCH_1,
  },
];
