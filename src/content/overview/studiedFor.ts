import { BATCH_7_PLAIN_SUMMARIES as BATCH_7 } from "@/content/review";

import type { StudiedFor, StudiedForConcept, StudiedForScope } from "./types";

/**
 * WHAT EACH COMPOUND IS STUDIED FOR, IN PLAIN LANGUAGE — keyed by slug.
 *
 * Written 2026-10-06 (comprehension pass) from the approved statements in
 * `registry.ts` and nothing else: no model knowledge, no outside source, no
 * statement that is still under review. Read each entry as
 *
 *   the sentence, in both languages, then
 *   its concepts: [the words the sentence uses, the exact words of the
 *   statement they restate], per language, and which statement that is.
 *
 * The checks (`plainLanguage.ts`, `npm run check:content`) refuse a sentence
 * that uses a word outside its concepts and a closed framing list, a concept
 * whose quote is not in its statement, a statement that does not render,
 * marketing language, dosing language, and an ES/EN pair whose numbers differ.
 *
 * HOW THEY ARE WRITTEN.
 *
 *   - "Studied for", never "for". What research examined — never what a
 *     reader will get, and never who should use it.
 *   - What was studied, and in what, first; what the compound is, after.
 *     The catalogue card clamps the sentence to three or four lines, so the
 *     opening has to answer the question on its own — and the model ("in
 *     rats", "in clinical trials") comes before the topic, so the clamp can
 *     shorten a sentence but never strengthen it.
 *   - Plain words for technical ones only where the plain word means the
 *     same thing (HbA1c → blood sugar; steatohepatitis → a fatty, inflamed
 *     liver). Where no plain word is as precise, the technical one stays.
 *   - Nothing stronger than the statement. "Studied for its effect on body
 *     weight", not "reduces weight", even where the trial reports a reduction.
 *
 * NOT HERE, and why:
 *
 *   - Batch 6 (owner review): PE-22-28, DSIP, Follistatin 344, HMG,
 *     Gonadorelin, Pinealon, Vesugen, Cortagen, Cardiogen, Cartalax.
 *   - No approved literature: Crystagen, SNAP-8, Adamax (both), Lipo-C (both),
 *     Lemon Bottle, Relaxation PM, SUPER Human Blend, Healthy Hair Skin Nails
 *     Blend.
 *   - Supplies, not compounds: sterile, bacteriostatic and amino-acid water.
 */

const c = (
  statement: string,
  es: readonly [says: string, quote: string],
  en: readonly [says: string, quote: string],
): StudiedForConcept => ({
  statement,
  says: { es: es[0], en: en[0] },
  quote: { es: es[1], en: en[1] },
});

const plain = (
  slug: string,
  scope: StudiedForScope,
  text: { es: string; en: string },
  concepts: readonly StudiedForConcept[],
): StudiedFor => ({
  id: `${slug}-studied-for`,
  text,
  scope,
  concepts,
  provenance: { class: "derived-copy", status: BATCH_7, derivedFrom: ["scientific-source"] },
});

/* Shared phrasings, written once so the same idea reads the same everywhere. */
const ES_GHRH = "la hormona que estimula la liberación de hormona de crecimiento";
const EN_GHRH = "the hormone that triggers growth hormone release";

/** The BPC-157 + TB-500 blends: one literature, two strengths. */
const bpcTb = (slug: string) =>
  plain(
    slug,
    "general",
    {
      es: "Combina BPC-157 y TB-500; el estudio que combinó ambos, en ratas con reparación de tendón, no encontró beneficio adicional frente a cada uno por separado.",
      en: "Combines BPC-157 and TB-500; the study that combined both, in rats with tendon repair, found no added benefit over either alone.",
    },
    [
      c(
        `${slug}-mechanism-components`,
        ["Combina", "combina dos compuestos"],
        ["Combines", "combines two compounds"],
      ),
      c(`${slug}-mechanism-components`, ["BPC-157", "BPC-157"], ["BPC-157", "BPC-157"]),
      c(`${slug}-mechanism-components`, ["TB-500", "TB-500"], ["TB-500", "TB-500"]),
      c(
        `${slug}-research-combination`,
        ["el estudio que combinó ambos", "El estudio que combina ambos compuestos"],
        ["the study that combined both", "The study that combines both compounds"],
      ),
      c(
        `${slug}-research-combination`,
        ["en ratas con reparación de tendón", "en ratas con reparación del tendón de Aquiles"],
        ["in rats with tendon repair", "in rats with Achilles tendon repair"],
      ),
      c(
        `${slug}-research-combination`,
        [
          "no encontró beneficio adicional frente a cada uno por separado",
          "no aportó beneficios adicionales frente a cada compuesto por separado",
        ],
        [
          "found no added benefit over either alone",
          "conferred no additional benefit over either compound alone",
        ],
      ),
    ],
  );

export const STUDIED_FOR: Readonly<Record<string, StudiedFor>> = {
  /* ---- Metabolism ---------------------------------------------------------- */
  semaglutide: plain(
    "semaglutide",
    "specific",
    {
      es: "Se ha estudiado en ensayos clínicos por sus efectos en el peso corporal de adultos con sobrepeso u obesidad y en el azúcar en sangre en la diabetes tipo 2.",
      en: "Studied in clinical trials for its effects on body weight in adults with overweight or obesity, and on blood sugar in type 2 diabetes.",
    },
    [
      c(
        "semaglutide-research-step-1",
        ["ensayos clínicos", "Ensayo de fase 3"],
        ["clinical trials", "Phase 3 trial"],
      ),
      c(
        "semaglutide-research-step-1",
        ["peso corporal", "cambio medio de peso"],
        ["body weight", "mean weight change"],
      ),
      c(
        "semaglutide-research-step-1",
        ["adultos con sobrepeso u obesidad", "adultos con sobrepeso u obesidad"],
        ["adults with overweight or obesity", "adults with overweight or obesity"],
      ),
      c("semaglutide-research-surpass-2", ["azúcar en sangre", "HbA1c"], ["blood sugar", "HbA1c"]),
      c(
        "semaglutide-research-surpass-2",
        ["diabetes tipo 2", "diabetes tipo 2"],
        ["type 2 diabetes", "type 2 diabetes"],
      ),
    ],
  ),

  tirzepatide: plain(
    "tirzepatide",
    "specific",
    {
      es: "Se ha estudiado en ensayos clínicos por sus efectos en el peso corporal de adultos con obesidad y en el azúcar en sangre en la diabetes tipo 2; actúa sobre dos receptores.",
      en: "Studied in clinical trials for its effects on body weight in adults with obesity and on blood sugar in type 2 diabetes; it acts on two receptors.",
    },
    [
      c(
        "tirzepatide-mechanism-receptors",
        ["actúa sobre dos receptores", "actividad agonista dual"],
        ["acts on two receptors", "dual agonist activity"],
      ),
      c(
        "tirzepatide-research-surmount-1",
        ["ensayos clínicos", "Ensayo de fase 3"],
        ["clinical trials", "Phase 3 trial"],
      ),
      c(
        "tirzepatide-research-surmount-1",
        ["peso corporal", "cambio medio de peso"],
        ["body weight", "mean weight change"],
      ),
      c(
        "tirzepatide-research-surmount-1",
        ["adultos con obesidad", "adultos con obesidad"],
        ["adults with obesity", "adults with obesity"],
      ),
      c("tirzepatide-research-surpass-2", ["azúcar en sangre", "HbA1c"], ["blood sugar", "HbA1c"]),
      c(
        "tirzepatide-research-surpass-2",
        ["diabetes tipo 2", "diabetes tipo 2"],
        ["type 2 diabetes", "type 2 diabetes"],
      ),
    ],
  ),

  reta: plain(
    "reta",
    "specific",
    {
      es: "Se ha estudiado en ensayos clínicos por sus efectos en el peso corporal de adultos con obesidad y en el azúcar en sangre en la diabetes tipo 2; actúa sobre tres receptores.",
      en: "Studied in clinical trials for its effects on body weight in adults with obesity and on blood sugar in type 2 diabetes; it acts on three receptors.",
    },
    [
      c(
        "reta-mechanism-receptors",
        ["actúa sobre tres receptores", "agonista de tres receptores"],
        ["acts on three receptors", "agonist activity at three receptors"],
      ),
      c(
        "reta-research-obesity-phase2",
        ["ensayos clínicos", "Ensayo de fase 2"],
        ["clinical trials", "Phase 2 trial"],
      ),
      c(
        "reta-research-obesity-phase2",
        ["peso corporal", "peso corporal"],
        ["body weight", "body-weight change"],
      ),
      c(
        "reta-research-obesity-phase2",
        ["adultos con obesidad", "adultos con obesidad"],
        ["adults with obesity", "adults with obesity"],
      ),
      c("reta-research-t2d-phase2", ["azúcar en sangre", "HbA1c"], ["blood sugar", "HbA1c"]),
      c(
        "reta-research-t2d-phase2",
        ["diabetes tipo 2", "diabetes tipo 2"],
        ["type 2 diabetes", "type 2 diabetes"],
      ),
    ],
  ),

  cagrilintide: plain(
    "cagrilintide",
    "specific",
    {
      es: "Se ha estudiado en un ensayo clínico por su efecto en el peso corporal; es una versión de acción prolongada de la amilina, hormona pancreática que induce saciedad.",
      en: "Studied in a clinical trial for its effect on body weight; a long-acting version of amylin, a pancreatic hormone that induces fullness.",
    },
    [
      c(
        "cagrilintide-mechanism-amylin",
        [
          "Una versión de acción prolongada de la amilina",
          "análogo de amilina de acción prolongada",
        ],
        ["A long-acting version of amylin", "long-acting amylin analogue"],
      ),
      c(
        "cagrilintide-mechanism-amylin",
        ["hormona pancreática que induce saciedad", "hormona pancreática que induce saciedad"],
        ["a pancreatic hormone that induces fullness", "pancreatic hormone that induces satiety"],
      ),
      c(
        "cagrilintide-research-phase2",
        ["un ensayo clínico", "Ensayo de fase 2"],
        ["a clinical trial", "phase 2 trial"],
      ),
      c(
        "cagrilintide-research-phase2",
        ["peso corporal", "reducción media de peso"],
        ["body weight", "mean weight reduction"],
      ),
    ],
  ),

  survodutide: plain(
    "survodutide",
    "specific",
    {
      es: "Se ha estudiado en un ensayo clínico en adultos con hígado graso e inflamado (MASH) y, en ratones, en relación con el peso corporal; actúa sobre dos receptores.",
      en: "Studied in a clinical trial in adults with a fatty, inflamed liver (MASH) and, in mice, for body weight; it acts on two receptors.",
    },
    [
      c(
        "survodutide-mechanism-dual",
        ["actúa sobre dos receptores", "agonismo dual"],
        ["acts on two receptors", "dual agonism"],
      ),
      c(
        "survodutide-research-mash",
        ["un ensayo clínico", "Ensayo de fase 2"],
        ["a clinical trial", "phase 2 trial"],
      ),
      c(
        "survodutide-research-mash",
        ["adultos con hígado graso e inflamado (MASH)", "esteatohepatitis metabólica (MASH)"],
        ["adults with a fatty, inflamed liver (MASH)", "steatohepatitis (MASH)"],
      ),
      c("survodutide-mechanism-preclinical", ["en ratones", "En ratones"], ["in mice", "In mice"]),
      c(
        "survodutide-mechanism-preclinical",
        ["peso corporal", "peso corporal"],
        ["body weight", "body weight"],
      ),
    ],
  ),

  mazdutide: plain(
    "mazdutide",
    "specific",
    {
      es: "Se ha estudiado en ensayos clínicos por sus efectos en el peso corporal de adultos con obesidad y en el azúcar en sangre en la diabetes tipo 2; actúa sobre dos receptores.",
      en: "Studied in clinical trials for its effects on body weight in adults with obesity and on blood sugar in type 2 diabetes; it acts on two receptors.",
    },
    [
      c(
        "mazdutide-mechanism-dual",
        ["actúa sobre dos receptores", "agonista dual"],
        ["acts on two receptors", "dual agonist"],
      ),
      c(
        "mazdutide-research-glory-2",
        ["ensayos clínicos", "Ensayo aleatorizado"],
        ["clinical trials", "Randomised trial"],
      ),
      c(
        "mazdutide-research-glory-2",
        ["peso corporal", "cambio medio de peso"],
        ["body weight", "mean weight change"],
      ),
      c(
        "mazdutide-research-glory-2",
        ["adultos con obesidad", "adultos chinos con obesidad moderada a grave"],
        ["adults with obesity", "adults with moderate to severe obesity"],
      ),
      c("mazdutide-research-t2d", ["azúcar en sangre", "HbA1c"], ["blood sugar", "HbA1c"]),
      c(
        "mazdutide-research-t2d",
        ["diabetes tipo 2", "diabetes tipo 2"],
        ["type 2 diabetes", "type 2 diabetes"],
      ),
    ],
  ),

  tesamorelin: plain(
    "tesamorelin",
    "specific",
    {
      es: `Se ha estudiado en un ensayo clínico en personas con VIH por su efecto en la grasa abdominal profunda (visceral); es una versión de ${ES_GHRH}.`,
      en: `Studied in a clinical trial in people with HIV for its effect on deep abdominal (visceral) fat; a version of ${EN_GHRH}.`,
    },
    [
      c(
        "tesamorelin-mechanism-ghrh",
        [
          `Una versión de ${ES_GHRH}`,
          "análogo del factor liberador de hormona de crecimiento (GHRH)",
        ],
        [`A version of ${EN_GHRH}`, "growth hormone-releasing factor (GHRH) analogue"],
      ),
      c(
        "tesamorelin-research-visceral",
        ["un ensayo clínico", "Ensayo aleatorizado"],
        ["a clinical trial", "Randomised trial"],
      ),
      c(
        "tesamorelin-research-visceral",
        ["personas con VIH", "personas con VIH"],
        ["people with HIV", "people with HIV"],
      ),
      c(
        "tesamorelin-research-visceral",
        ["grasa abdominal profunda (visceral)", "tejido adiposo visceral"],
        ["deep abdominal (visceral) fat", "visceral adipose tissue"],
      ),
    ],
  ),

  aod9604: plain(
    "aod9604",
    "specific",
    {
      es: "Se ha estudiado en ratones y ratas obesos por sus efectos en el peso corporal y la degradación de grasa; es un fragmento modificado de la hormona de crecimiento.",
      en: "Studied in obese mice and rats for its effects on body weight and fat breakdown; a modified fragment of growth hormone.",
    },
    [
      c(
        "aod9604-mechanism-identity",
        [
          "Un fragmento modificado de la hormona de crecimiento",
          "fragmento C-terminal de la hormona de crecimiento humana (aminoácidos 177–191) con una tirosina añadida",
        ],
        [
          "A modified fragment of growth hormone",
          "C-terminal fragment of human growth hormone (amino acids 177–191) with a tyrosine added",
        ],
      ),
      c("aod9604-mechanism-beta3", ["ratones", "En ratones obesos"], ["mice", "In obese mice"]),
      c("aod9604-mechanism-beta3", ["obesos", "ratones obesos"], ["obese", "obese mice"]),
      c(
        "aod9604-research-zucker",
        ["ratas", "En ratas Zucker obesas"],
        ["rats", "In obese Zucker rats"],
      ),
      c(
        "aod9604-mechanism-beta3",
        ["peso corporal", "redujeron peso y grasa corporal"],
        ["body weight", "reduced body weight and fat"],
      ),
      c(
        "aod9604-research-zucker",
        ["degradación de grasa", "actividad lipolítica"],
        ["fat breakdown", "lipolytic activity"],
      ),
    ],
  ),

  "hgh-fragment-176-191": plain(
    "hgh-fragment-176-191",
    "general",
    {
      es: "Basado en la región de la hormona de crecimiento ligada a la degradación de grasa, estudiado en animales a través de su análogo sintético, AOD9604, por sus efectos en el aumento de peso.",
      en: "Based on the region of growth hormone linked to fat breakdown, studied in animals through its synthetic analogue, AOD9604, for effects on weight gain.",
    },
    [
      c(
        "hgh-fragment-mechanism-domain",
        [
          "Basado en la región de la hormona de crecimiento ligada a la degradación de grasa",
          "dominio lipolítico de la hormona de crecimiento humana",
        ],
        [
          "Based on the region of growth hormone linked to fat breakdown",
          "lipolytic domain of human growth hormone",
        ],
      ),
      c(
        "hgh-fragment-mechanism-lipolysis",
        ["en animales", "En modelos animales"],
        ["in animals", "In animal models"],
      ),
      c(
        "hgh-fragment-mechanism-domain",
        [
          "a través de su análogo sintético, AOD9604",
          "El análogo sintético estudiado en la literatura, AOD9604",
        ],
        [
          "through its synthetic analogue, AOD9604",
          "The synthetic analogue studied in the literature, AOD9604",
        ],
      ),
      c(
        "hgh-fragment-mechanism-lipolysis",
        ["aumento de peso", "redujo el aumento de peso"],
        ["weight gain", "reduced weight gain"],
      ),
    ],
  ),

  "5-amino-1mq": plain(
    "5-amino-1mq",
    "general",
    {
      es: "Bloquea la NNMT, una enzima del metabolismo celular; los inhibidores de esta enzima se estudiaron en células de grasa y en ratones con obesidad inducida por la dieta.",
      en: "Blocks NNMT, an enzyme of cell metabolism; inhibitors of this enzyme were studied in fat cells and in mice with diet-induced obesity.",
    },
    [
      c(
        "5-amino-1mq-mechanism-nnmt",
        ["Bloquea la NNMT", "inhibidor de la nicotinamida N-metiltransferasa (NNMT)"],
        ["Blocks NNMT", "inhibitor of nicotinamide N-methyltransferase (NNMT)"],
      ),
      c(
        "5-amino-1mq-mechanism-nnmt",
        ["una enzima del metabolismo celular", "el metabolismo celular"],
        ["an enzyme of cell metabolism", "cellular metabolism"],
      ),
      c(
        "5-amino-1mq-mechanism-selectivity",
        ["los inhibidores de esta enzima", "Los análogos de metilquinolinio"],
        ["inhibitors of this enzyme", "Methylquinolinium analogues"],
      ),
      c(
        "5-amino-1mq-mechanism-selectivity",
        ["en células de grasa", "En adipocitos cultivados"],
        ["in fat cells", "In cultured adipocytes"],
      ),
      c(
        "5-amino-1mq-research-mice",
        [
          "en ratones con obesidad inducida por la dieta",
          "En ratones con obesidad inducida por una dieta alta en grasa",
        ],
        ["in mice with diet-induced obesity", "In mice with high-fat-diet-induced obesity"],
      ),
    ],
  ),

  "slu-pp-332": plain(
    "slu-pp-332",
    "general",
    {
      es: "Activa receptores que participan en la capacidad de ejercicio del músculo; estudiado en células musculares y ratones por sus efectos en la función mitocondrial y la resistencia al ejercicio.",
      en: "Activates receptors involved in muscle exercise capacity; studied in muscle cells and mice for its effects on mitochondrial function and exercise endurance.",
    },
    [
      c(
        "slu-pp-332-mechanism-err",
        ["Activa receptores", "agonista sintético"],
        ["Activates receptors", "synthetic agonist"],
      ),
      c(
        "slu-pp-332-mechanism-err",
        [
          "que participan en la capacidad de ejercicio del músculo",
          "participan en la capacidad de ejercicio del músculo esquelético",
        ],
        ["involved in muscle exercise capacity", "take part in skeletal muscle exercise capacity"],
      ),
      c(
        "slu-pp-332-research-muscle",
        ["células musculares", "línea celular de músculo esquelético"],
        ["muscle cells", "skeletal muscle cell line"],
      ),
      c("slu-pp-332-research-muscle", ["ratones", "En ratones"], ["mice", "In mice"]),
      c(
        "slu-pp-332-research-muscle",
        ["función mitocondrial", "función mitocondrial"],
        ["mitochondrial function", "mitochondrial function"],
      ),
      c(
        "slu-pp-332-research-muscle",
        ["resistencia al ejercicio", "resistencia al ejercicio"],
        ["exercise endurance", "exercise endurance"],
      ),
    ],
  ),

  "adipotide-fttp": plain(
    "adipotide-fttp",
    "specific",
    {
      es: "Se ha estudiado en ratones y monos obesos por sus efectos en la grasa corporal y el peso corporal; está diseñado para dirigirse a los vasos sanguíneos del tejido graso.",
      en: "Studied in obese mice and monkeys for its effects on body fat and body weight; it is designed to target the blood vessels of fat tissue.",
    },
    [
      c(
        "adipotide-mechanism-prohibitin",
        [
          "Diseñado para dirigirse a los vasos sanguíneos del tejido graso",
          "Dirigirlo a la vasculatura del tejido adiposo blanco",
        ],
        [
          "Designed to target the blood vessels of fat tissue",
          "Directing it at white adipose tissue vasculature",
        ],
      ),
      c("adipotide-research-mice", ["ratones", "En ratones"], ["mice", "In mice"]),
      c(
        "adipotide-research-monkeys",
        ["monos", "monos obesos"],
        ["monkeys", "obese Old World monkeys"],
      ),
      c(
        "adipotide-research-monkeys",
        ["obesos", "monos obesos"],
        ["obese", "obese Old World monkeys"],
      ),
      c(
        "adipotide-research-mice",
        ["grasa corporal", "resorción del tejido adiposo blanco"],
        ["body fat", "resorption of established white adipose tissue"],
      ),
      c(
        "adipotide-research-monkeys",
        ["peso corporal", "pérdida de peso"],
        ["body weight", "weight loss"],
      ),
    ],
  ),

  "l-carnitine": plain(
    "l-carnitine",
    "specific",
    {
      es: "Un análisis combinado de nueve ensayos clínicos examinó su efecto en el peso corporal; transporta ácidos grasos al interior de las mitocondrias para su degradación.",
      en: "A combined analysis of nine clinical trials examined its effect on body weight; it carries fatty acids into mitochondria to be broken down.",
    },
    [
      c(
        "l-carnitine-mechanism-transport",
        [
          "Transporta ácidos grasos al interior de las mitocondrias para su degradación",
          "transferir ácidos grasos de cadena larga a través de la membrana mitocondrial interna, el paso previo a su β-oxidación",
        ],
        [
          "Carries fatty acids into mitochondria to be broken down",
          "transferring long-chain fatty acids across the inner mitochondrial membrane, the step before their β-oxidation",
        ],
      ),
      c(
        "l-carnitine-research-meta",
        [
          "un análisis combinado de nueve ensayos clínicos",
          "metaanálisis de nueve ensayos aleatorizados",
        ],
        ["a combined analysis of nine clinical trials", "meta-analysis of nine randomised trials"],
      ),
      c(
        "l-carnitine-research-meta",
        ["peso corporal", "perdieron más peso"],
        ["body weight", "lost more weight"],
      ),
    ],
  ),

  "b12-methylcobalamin": plain(
    "b12-methylcobalamin",
    "specific",
    {
      es: "La vitamina B12, estudiada por su papel en el metabolismo celular, en particular en la síntesis de ADN, y en la deficiencia de B12.",
      en: "Vitamin B12, studied for its role in cellular metabolism, particularly in DNA synthesis, and in B12 deficiency.",
    },
    [
      c("b12-mechanism-cofactor", ["vitamina B12", "vitamina B12"], ["Vitamin B12", "Vitamin B12"]),
      c(
        "b12-mechanism-cofactor",
        [
          "metabolismo celular, en particular en la síntesis de ADN",
          "metabolismo celular, en particular en la síntesis de ADN",
        ],
        [
          "cellular metabolism, particularly in DNA synthesis",
          "cellular metabolism, particularly in DNA synthesis",
        ],
      ),
      c(
        "b12-research-deficiency",
        ["deficiencia de B12", "deficiencia clínica de B12"],
        ["B12 deficiency", "B12 deficiency"],
      ),
    ],
  ),

  /* ---- Recovery and skin --------------------------------------------------- */
  bpc157: plain(
    "bpc157",
    "specific",
    {
      es: "Se ha estudiado sobre todo en modelos animales de lesión de músculo, tendón, ligamento y hueso; los estudios en humanos son pocos.",
      en: "Studied mostly in animal models of muscle, tendon, ligament and bone injury; human studies are few.",
    },
    [
      c(
        "bpc157-research-systematic-review",
        ["sobre todo", "35 fueron preclínicos"],
        ["mostly", "35 were preclinical"],
      ),
      c(
        "bpc157-research-evidence-limit",
        ["modelos animales", "modelos animales"],
        ["animal models", "animal models"],
      ),
      c(
        "bpc157-research-systematic-review",
        [
          "lesión de músculo, tendón, ligamento y hueso",
          "lesiones de músculo, tendón, ligamento y hueso",
        ],
        ["muscle, tendon, ligament and bone injury", "muscle, tendon, ligament and bone injuries"],
      ),
      c(
        "bpc157-research-evidence-limit",
        ["los estudios en humanos son pocos", "los estudios en humanos son pocos"],
        ["human studies are few", "human studies are few"],
      ),
    ],
  ),

  tb500: plain(
    "tb500",
    "specific",
    {
      es: "Se ha estudiado sobre todo en modelos animales de cicatrización de heridas y reparación de tendón; es una forma sintética de la timosina beta-4, con pocos estudios en humanos.",
      en: "Studied mostly in animal models of wound healing and tendon repair; a synthetic form of thymosin beta-4, with few human studies.",
    },
    [
      c(
        "tb500-mechanism-identity",
        ["Una forma sintética de la timosina beta-4", "forma sintética de la timosina β4"],
        ["A synthetic form of thymosin beta-4", "synthetic form of thymosin β4"],
      ),
      c(
        "tb500-research-evidence-limit",
        ["sobre todo", "el 67 % de las publicaciones usó modelos animales"],
        ["mostly", "67% of publications used animal models"],
      ),
      c(
        "tb500-research-evidence-limit",
        ["modelos animales", "modelos animales"],
        ["animal models", "animal models"],
      ),
      c(
        "tb500-research-wound-model",
        ["cicatrización de heridas", "modelo de herida"],
        ["wound healing", "wound model"],
      ),
      c(
        "tb500-research-achilles",
        ["reparación de tendón", "reparación del tendón de Aquiles"],
        ["tendon repair", "Achilles tendon repair"],
      ),
      c(
        "tb500-research-evidence-limit",
        ["con pocos estudios en humanos", "los estudios en humanos son pocos"],
        ["with few human studies", "human studies are few"],
      ),
    ],
  ),

  "bpc-5mg-tb-5mg": bpcTb("bpc-5mg-tb-5mg"),
  "bpc-10mg-tb-10mg": bpcTb("bpc-10mg-tb-10mg"),

  glow: plain(
    "glow",
    "general",
    {
      es: "Combina tres compuestos con líneas de investigación propias: GHK-Cu en colágeno y reparación de la piel, BPC-157 en modelos de laboratorio de lesión musculoesquelética y TB-500 en movimiento celular.",
      en: "Combines three compounds with separate lines of research: GHK-Cu in collagen and skin repair, BPC-157 in laboratory models of musculoskeletal injury, and TB-500 in cell movement.",
    },
    [
      c(
        "glow-mechanism-components",
        [
          "Combina tres compuestos con líneas de investigación propias",
          "reúne tres compuestos con líneas de investigación propias",
        ],
        [
          "Combines three compounds with separate lines of research",
          "brings together three compounds with separate lines of research",
        ],
      ),
      c("glow-mechanism-components", ["GHK-Cu", "GHK-Cu"], ["GHK-Cu", "GHK-Cu"]),
      c(
        "glow-mechanism-components",
        ["colágeno y reparación de la piel", "síntesis de colágeno y reparación de la piel"],
        ["collagen and skin repair", "collagen synthesis and skin repair"],
      ),
      c("glow-mechanism-components", ["BPC-157", "BPC-157"], ["BPC-157", "BPC-157"]),
      c(
        "glow-mechanism-components",
        [
          "modelos de laboratorio de lesión musculoesquelética",
          "modelos preclínicos de lesión musculoesquelética",
        ],
        [
          "laboratory models of musculoskeletal injury",
          "preclinical models of musculoskeletal injury",
        ],
      ),
      c("glow-mechanism-components", ["TB-500", "TB-500"], ["TB-500", "TB-500"]),
      c(
        "glow-mechanism-components",
        ["movimiento celular", "promueve la migración celular"],
        ["cell movement", "promotes cell migration"],
      ),
    ],
  ),

  klow: plain(
    "klow",
    "general",
    {
      es: "Combina cuatro compuestos con literatura propia: BPC-157 en modelos de laboratorio de lesión musculoesquelética, GHK-Cu en reparación de la piel, TB-500 en movimiento celular y KPV en inflamación.",
      en: "Combines four compounds with separate literature: BPC-157 in laboratory models of musculoskeletal injury, GHK-Cu in skin repair, TB-500 in cell movement and KPV in inflammation.",
    },
    [
      c(
        "klow-mechanism-components",
        [
          "Combina cuatro compuestos con literatura propia",
          "reúne cuatro compuestos con literatura propia",
        ],
        [
          "Combines four compounds with separate literature",
          "brings together four compounds with their own literature",
        ],
      ),
      c("klow-mechanism-components", ["BPC-157", "BPC-157"], ["BPC-157", "BPC-157"]),
      c(
        "klow-mechanism-components",
        [
          "modelos de laboratorio de lesión musculoesquelética",
          "modelos preclínicos de lesión musculoesquelética",
        ],
        [
          "laboratory models of musculoskeletal injury",
          "preclinical models of musculoskeletal injury",
        ],
      ),
      c("klow-mechanism-components", ["GHK-Cu", "GHK-Cu"], ["GHK-Cu", "GHK-Cu"]),
      c(
        "klow-mechanism-components",
        ["reparación de la piel", "reparación de la piel"],
        ["skin repair", "skin repair"],
      ),
      c("klow-mechanism-components", ["TB-500", "TB-500"], ["TB-500", "TB-500"]),
      c(
        "klow-mechanism-components",
        ["movimiento celular", "promueve la migración celular"],
        ["cell movement", "promotes cell migration"],
      ),
      c("klow-mechanism-components", ["KPV", "KPV"], ["KPV", "KPV"]),
      c(
        "klow-mechanism-components",
        ["inflamación", "reduce la señalización inflamatoria"],
        ["inflammation", "reduces inflammatory signalling"],
      ),
    ],
  ),

  "ghk-cu": plain(
    "ghk-cu",
    "specific",
    {
      es: "Se ha estudiado en reparación de piel y tejidos, cicatrización en animales y productos cosméticos para la piel; es un péptido que se une al cobre, presente de forma natural en la sangre humana.",
      en: "Studied in skin and tissue repair, wound healing in animals and cosmetic skin products; a copper-binding peptide naturally present in human blood.",
    },
    [
      c(
        "ghk-cu-mechanism-identity",
        ["Un péptido que se une al cobre", "complejo con cobre"],
        ["A copper-binding peptide", "complex with copper"],
      ),
      c(
        "ghk-cu-mechanism-identity",
        [
          "presente de forma natural en la sangre humana",
          "presente en plasma, saliva y orina humanos",
        ],
        ["naturally present in human blood", "present in human plasma, saliva and urine"],
      ),
      c(
        "ghk-cu-research-tissue",
        ["reparación de piel y tejidos", "reparación de piel, tejido conectivo pulmonar, hueso"],
        ["skin and tissue repair", "repair of skin, lung connective tissue, bone"],
      ),
      c(
        "ghk-cu-research-tissue",
        [
          "cicatrización en animales",
          "cicatrización sistémica descrita en ratas, ratones y cerdos",
        ],
        ["wound healing in animals", "wound healing described in rats, mice and pigs"],
      ),
      c(
        "ghk-cu-research-topical",
        ["productos cosméticos para la piel", "productos cosméticos tópicos"],
        ["cosmetic skin products", "topical cosmetic products"],
      ),
    ],
  ),

  "ahk-cu": plain(
    "ahk-cu",
    "general",
    {
      es: "Un péptido unido a cobre, estudiado en laboratorio en folículos pilosos humanos, donde estimuló su crecimiento en longitud.",
      en: "A copper-bound peptide studied in the laboratory on human hair follicles, where it stimulated their growth in length.",
    },
    [
      c(
        "ahk-cu-mechanism-tripeptide-copper",
        [
          "Un péptido unido a cobre",
          "complejo del tripéptido L-alanil-L-histidil-L-lisina con cobre",
        ],
        [
          "A copper-bound peptide",
          "complex of the tripeptide L-alanyl-L-histidyl-L-lysine with copper",
        ],
      ),
      c(
        "ahk-cu-research-hair-follicle",
        ["en laboratorio", "ex vivo"],
        ["in the laboratory", "ex vivo"],
      ),
      c(
        "ahk-cu-research-hair-follicle",
        ["folículos pilosos humanos", "folículos pilosos humanos"],
        ["human hair follicles", "human hair follicles"],
      ),
      c(
        "ahk-cu-research-hair-follicle",
        ["estimuló su crecimiento en longitud", "estimuló su elongación"],
        ["stimulated their growth in length", "stimulated their elongation"],
      ),
    ],
  ),

  "thymosin-alpha-1": plain(
    "thymosin-alpha-1",
    "specific",
    {
      es: "Se ha estudiado en un ensayo clínico en pacientes con sepsis grave; es una hormona producida por el timo, descrita como moduladora del sistema inmunitario.",
      en: "Studied in a clinical trial in patients with severe sepsis; a hormone produced by the thymus, described as modulating the immune system.",
    },
    [
      c(
        "thymosin-alpha-1-mechanism-identity",
        ["Una hormona producida por el timo", "hormona peptídica producida por el timo"],
        ["A hormone produced by the thymus", "peptide hormone produced by the thymus"],
      ),
      c(
        "thymosin-alpha-1-mechanism-identity",
        ["descrita como moduladora del sistema inmunitario", "propiedades inmunomoduladoras"],
        ["described as modulating the immune system", "immunomodulatory"],
      ),
      c(
        "thymosin-alpha-1-research-etass",
        ["un ensayo clínico", "Ensayo aleatorizado y controlado"],
        ["a clinical trial", "Randomised controlled trial"],
      ),
      c(
        "thymosin-alpha-1-research-etass",
        ["pacientes con sepsis grave", "pacientes con sepsis grave"],
        ["patients with severe sepsis", "patients with severe sepsis"],
      ),
    ],
  ),

  thymalin: plain(
    "thymalin",
    "general",
    {
      es: "Un extracto de timo descrito como modulador del sistema inmunitario; el estudio citado usó modelado molecular y trabajo de expresión génica para buscar cómo actúa.",
      en: "A thymus extract described as modulating the immune system; the study cited used molecular modelling and gene-activity work to look for how it acts.",
    },
    [
      c(
        "thymalin-mechanism-dipeptides",
        ["Un extracto de timo", "extracto polipeptídico de timo"],
        ["A thymus extract", "polypeptide extract of thymus"],
      ),
      c(
        "thymalin-mechanism-dipeptides",
        ["descrito como modulador del sistema inmunitario", "preparación inmunomoduladora"],
        ["described as modulating the immune system", "immunomodulatory preparation"],
      ),
      c(
        "thymalin-research-mechanism-study",
        [
          "el estudio citado usó modelado molecular y trabajo de expresión génica",
          "El estudio citado es de modelado molecular y expresión génica",
        ],
        [
          "the study cited used molecular modelling and gene-activity work",
          "The study cited is molecular modelling and gene expression work",
        ],
      ),
      c(
        "thymalin-research-mechanism-study",
        ["para buscar cómo actúa", "identificar un posible mecanismo"],
        ["to look for how it acts", "identify a possible mechanism"],
      ),
    ],
  ),

  kpv: plain(
    "kpv",
    "specific",
    {
      es: "Se ha estudiado en células intestinales e inmunes humanas y en ratones con colitis (inflamación del intestino) por su actividad antiinflamatoria; es un fragmento de la hormona α-MSH.",
      en: "Studied in human gut and immune cells and in mice with colitis (bowel inflammation) for anti-inflammatory activity; a fragment of the hormone α-MSH.",
    },
    [
      c(
        "kpv-mechanism-pept1",
        [
          "un fragmento de la hormona α-MSH",
          "tripéptido (Lys-Pro-Val) que corresponde al extremo C-terminal de la hormona α-MSH",
        ],
        [
          "a fragment of the hormone α-MSH",
          "tripeptide (Lys-Pro-Val) corresponding to the C-terminus of the α-MSH hormone",
        ],
      ),
      c(
        "kpv-research-cells",
        [
          "en células intestinales e inmunes humanas",
          "células epiteliales intestinales humanas y linfocitos T",
        ],
        ["in human gut and immune cells", "human intestinal epithelial cells and T cells"],
      ),
      c(
        "kpv-research-colitis",
        ["en ratones con colitis (inflamación del intestino)", "dos modelos murinos de colitis"],
        ["in mice with colitis (bowel inflammation)", "two murine colitis models"],
      ),
      c(
        "kpv-research-colitis",
        ["actividad antiinflamatoria", "actividad antiinflamatoria"],
        ["anti-inflammatory activity", "anti-inflammatory activity"],
      ),
    ],
  ),

  "ara-290": plain(
    "ara-290",
    "specific",
    {
      es: "Se ha estudiado en modelos de lesión tisular y en pacientes con pérdida de fibras nerviosas pequeñas; deriva de la eritropoyetina (EPO) y activa su vía protectora de tejidos, no la producción de glóbulos rojos.",
      en: "Studied in tissue-injury models and in patients with small nerve fibre loss; derived from erythropoietin (EPO), it activates its tissue-protecting route, not red blood cell production.",
    },
    [
      c(
        "ara-290-mechanism-helix-b",
        [
          "deriva de la eritropoyetina (EPO)",
          "derivado de la cara acuosa de la hélice B de la eritropoyetina (EPO)",
        ],
        [
          "derived from erythropoietin (EPO)",
          "derived from the aqueous face of helix B of erythropoietin (EPO)",
        ],
      ),
      c(
        "ara-290-mechanism-helix-b",
        [
          "activa su vía protectora de tejidos, no la producción de glóbulos rojos",
          "activa esa segunda vía sin la acción eritropoyética",
        ],
        [
          "activates its tissue-protecting route, not red blood cell production",
          "activates that second route without the erythropoietic action",
        ],
      ),
      c(
        "ara-290-research-preclinical",
        ["modelos de lesión tisular", "protector de tejidos in vivo en varios modelos"],
        ["tissue-injury models", "tissue-protective in vivo across several models"],
      ),
      c(
        "ara-290-research-sarcoidosis",
        [
          "pacientes con pérdida de fibras nerviosas pequeñas",
          "pacientes con pérdida documentada de fibras nerviosas pequeñas",
        ],
        ["patients with small nerve fibre loss", "small nerve fibre loss"],
      ),
    ],
  ),

  "ll-37": plain(
    "ll-37",
    "specific",
    {
      es: "Se ha estudiado en heridas de la piel humana, donde los niveles de la proteína de la que proviene aumentan tras una herida y son bajos en úlceras crónicas; es un péptido antimicrobiano natural.",
      en: "Studied in human skin wounds, where levels of the protein it comes from rise after injury and are low in chronic ulcers; a natural antimicrobial peptide.",
    },
    [
      c(
        "ll-37-mechanism-identity",
        [
          "un péptido antimicrobiano natural",
          "proteína catelicidina antimicrobiana humana y componente del sistema inmunitario innato",
        ],
        [
          "a natural antimicrobial peptide",
          "human cathelicidin antimicrobial protein and a component of the innate immune system",
        ],
      ),
      c(
        "ll-37-research-reepithelialisation",
        ["heridas de la piel humana", "En piel humana"],
        ["human skin wounds", "In human skin"],
      ),
      c(
        "ll-37-mechanism-identity",
        ["los niveles de la proteína de la que proviene", "fragmento C-terminal de hCAP18"],
        ["levels of the protein it comes from", "C-terminal fragment of hCAP18"],
      ),
      c(
        "ll-37-research-reepithelialisation",
        ["aumentan tras una herida", "aumentan al producirse una herida"],
        ["rise after injury", "rise when a wound occurs"],
      ),
      c(
        "ll-37-research-reepithelialisation",
        ["son bajos en úlceras crónicas", "En úlceras crónicas los niveles son bajos"],
        ["are low in chronic ulcers", "In chronic ulcers levels are low"],
      ),
    ],
  ),

  "melanotan-1": plain(
    "melanotan-1",
    "specific",
    {
      es: "Se ha estudiado, como afamelanotida, en ensayos clínicos en la protoporfiria eritropoyética, una enfermedad en la que la luz causa reacciones dolorosas en la piel.",
      en: "Studied, as afamelanotide, in clinical trials in erythropoietic protoporphyria, a disease in which light causes painful skin reactions.",
    },
    [
      c(
        "melanotan-1-mechanism-msh-analogue",
        ["como afamelanotida", "La afamelanotida"],
        ["as afamelanotide", "Afamelanotide"],
      ),
      c(
        "melanotan-1-research-epp",
        ["ensayos clínicos", "Dos ensayos multicéntricos, aleatorizados"],
        ["clinical trials", "Two multicentre, randomised"],
      ),
      c(
        "melanotan-1-research-epp",
        ["protoporfiria eritropoyética", "protoporfiria eritropoyética"],
        ["erythropoietic protoporphyria", "erythropoietic protoporphyria"],
      ),
      c(
        "melanotan-1-research-epp",
        [
          "una enfermedad en la que la luz causa reacciones dolorosas en la piel",
          "una fotodermatosis grave con fototoxicidad aguda",
        ],
        [
          "a disease in which light causes painful skin reactions",
          "a severe photodermatosis with acute phototoxicity",
        ],
      ),
    ],
  ),

  "melanotan-2": plain(
    "melanotan-2",
    "general",
    {
      es: "Un péptido sintético no autorizado, descrito como estimulante de la pigmentación de la piel; la fuente citada es un reporte de caso que documenta cambios en la boca.",
      en: "An unlicensed synthetic peptide described as stimulating skin pigmentation; the source cited is a case report documenting changes inside the mouth.",
    },
    [
      c(
        "melanotan-2-mechanism-mc1r",
        ["Un péptido sintético no autorizado", "péptido sintético no autorizado"],
        ["An unlicensed synthetic peptide", "unlicensed synthetic peptide"],
      ),
      c(
        "melanotan-2-mechanism-mc1r",
        [
          "descrito como estimulante de la pigmentación de la piel",
          "estimulando la producción de eumelanina, con pigmentación",
        ],
        [
          "described as stimulating skin pigmentation",
          "stimulating eumelanin production, with pigmentation",
        ],
      ),
      c(
        "melanotan-2-research-case-report",
        ["la fuente citada es un reporte de caso", "La fuente citada es un reporte de caso"],
        ["the source cited is a case report", "The source cited is a case report"],
      ),
      c(
        "melanotan-2-research-case-report",
        ["que documenta cambios en la boca", "documenta cambios en la mucosa oral"],
        ["documenting changes inside the mouth", "documenting changes in the oral mucosa"],
      ),
    ],
  ),

  /* ---- Growth -------------------------------------------------------------- */
  "cjc-1295-with-dac": plain(
    "cjc-1295-with-dac",
    "specific",
    {
      es: `Se ha estudiado en ensayos clínicos en adultos sanos, con liberación prolongada de hormona de crecimiento; es una versión de acción prolongada de ${ES_GHRH}.`,
      en: `Studied in clinical trials in healthy adults, with prolonged growth hormone release; a long-acting version of ${EN_GHRH}.`,
    },
    [
      c(
        "cjc-1295-dac-mechanism-albumin",
        [
          `Una versión de acción prolongada de ${ES_GHRH}`,
          "análogo de acción prolongada de la GHRH",
        ],
        [`A long-acting version of ${EN_GHRH}`, "long-acting GHRH analogue"],
      ),
      c(
        "cjc-1295-dac-research-healthy-adults",
        ["ensayos clínicos", "Dos ensayos aleatorizados"],
        ["clinical trials", "Two randomised"],
      ),
      c(
        "cjc-1295-dac-research-healthy-adults",
        ["adultos sanos", "adultos sanos"],
        ["healthy adults", "healthy adults"],
      ),
      c(
        "cjc-1295-dac-research-healthy-adults",
        [
          "liberación prolongada de hormona de crecimiento",
          "estimulación prolongada de la secreción de hormona de crecimiento",
        ],
        ["prolonged growth hormone release", "prolonged stimulation of growth hormone"],
      ),
    ],
  ),

  "cjc-1295-without-dac": plain(
    "cjc-1295-without-dac",
    "general",
    {
      es: `Una versión de ${ES_GHRH}, en su forma sin DAC; una revisión la distingue de la forma con DAC, de acción prolongada.`,
      en: `A version of ${EN_GHRH}, in the form without DAC; a review distinguishes it from the form with DAC, whose action is prolonged.`,
    },
    [
      c(
        "cjc-1295-nodac-mechanism-ghrh",
        [`Una versión de ${ES_GHRH}`, "análogos de GHRH"],
        [`A version of ${EN_GHRH}`, "GHRH analogues"],
      ),
      c(
        "cjc-1295-nodac-mechanism-ghrh",
        ["en su forma sin DAC", "CJC-1295 sin DAC"],
        ["in the form without DAC", "CJC-1295 without DAC"],
      ),
      c(
        "cjc-1295-nodac-mechanism-ghrh",
        [
          "una revisión la distingue de la forma con DAC",
          "La revisión citada distingue CJC-1295 con complejo de afinidad por fármaco (DAC) de CJC-1295 sin DAC",
        ],
        [
          "a review distinguishes it from the form with DAC",
          "The review cited distinguishes CJC-1295 with a Drug Affinity Complex (DAC) from CJC-1295 without DAC",
        ],
      ),
      c(
        "cjc-1295-nodac-mechanism-ghrh",
        ["de acción prolongada", "prolonga la acción de la forma con DAC"],
        ["whose action is prolonged", "prolongs the action of the DAC form"],
      ),
    ],
  ),

  "cjc-1295-without-dac-ipamorelin": plain(
    "cjc-1295-without-dac-ipamorelin",
    "general",
    {
      es: "Combina CJC-1295 e ipamorelina, dos compuestos que actúan sobre el sistema de la hormona de crecimiento por rutas distintas.",
      en: "Combines CJC-1295 and ipamorelin, two compounds that act on the growth hormone system through different routes.",
    },
    [
      c(
        "cjc-ipa-mechanism-two-routes",
        ["Combina", "combina dos compuestos"],
        ["Combines", "combines two compounds"],
      ),
      c("cjc-ipa-mechanism-two-routes", ["CJC-1295", "CJC-1295"], ["CJC-1295", "CJC-1295"]),
      c(
        "cjc-ipa-mechanism-two-routes",
        ["ipamorelina", "la ipamorelina"],
        ["ipamorelin", "ipamorelin"],
      ),
      c(
        "cjc-ipa-mechanism-two-routes",
        [
          "dos compuestos que actúan sobre el sistema de la hormona de crecimiento por rutas distintas",
          "actúan por rutas distintas del mismo eje",
        ],
        [
          "two compounds that act on the growth hormone system through different routes",
          "acting through different routes of the same axis",
        ],
      ),
    ],
  ),

  sermorelin: plain(
    "sermorelin",
    "general",
    {
      es: `Una versión de ${ES_GHRH} (GHRH); una revisión la agrupa con la tesamorelina y las dos formas de CJC-1295.`,
      en: `A version of ${EN_GHRH} (GHRH); a review groups it with tesamorelin and the two forms of CJC-1295.`,
    },
    [
      c(
        "sermorelin-mechanism-ghrh",
        [
          `Una versión de ${ES_GHRH} (GHRH)`,
          "análogo de la hormona liberadora de hormona de crecimiento (GHRH)",
        ],
        [`A version of ${EN_GHRH} (GHRH)`, "analogue of growth hormone-releasing hormone (GHRH)"],
      ),
      c(
        "sermorelin-mechanism-ghrh",
        [
          "una revisión la agrupa con la tesamorelina y las dos formas de CJC-1295",
          "la agrupa con la tesamorelina y las dos formas de CJC-1295",
        ],
        [
          "a review groups it with tesamorelin and the two forms of CJC-1295",
          "groups it with tesamorelin and the two forms of CJC-1295",
        ],
      ),
    ],
  ),

  ipamorelin: plain(
    "ipamorelin",
    "general",
    {
      es: "Un péptido pequeño que, en estudios de laboratorio, liberó hormona de crecimiento de células hipofisarias de rata.",
      en: "A small peptide that, in laboratory studies, released growth hormone from rat pituitary cells.",
    },
    [
      c(
        "ipamorelin-mechanism-pentapeptide",
        ["Un péptido pequeño", "pentapéptido"],
        ["A small peptide", "pentapeptide"],
      ),
      c(
        "ipamorelin-mechanism-pentapeptide",
        ["en estudios de laboratorio", "In vitro"],
        ["in laboratory studies", "In vitro"],
      ),
      c(
        "ipamorelin-mechanism-pentapeptide",
        [
          "liberó hormona de crecimiento de células hipofisarias de rata",
          "liberó hormona de crecimiento de células hipofisarias de rata",
        ],
        [
          "released growth hormone from rat pituitary cells",
          "released growth hormone from rat pituitary cells",
        ],
      ),
    ],
  ),

  "ghrp-2-acetate": plain(
    "ghrp-2-acetate",
    "specific",
    {
      es: "Un péptido que estimula la liberación de hormona de crecimiento, usado en endocrinología clínica como prueba de la función hipofisaria y estudiado en personas con obesidad.",
      en: "A peptide that triggers growth hormone release, used in clinical endocrinology as a test of pituitary function and studied in people with obesity.",
    },
    [
      c(
        "ghrp-2-mechanism-secretagogue",
        [
          "Un péptido que estimula la liberación de hormona de crecimiento",
          "péptidos liberadores de hormona de crecimiento",
        ],
        ["A peptide that triggers growth hormone release", "growth hormone-releasing peptide"],
      ),
      c(
        "ghrp-2-research-clinical-test",
        [
          "usado en endocrinología clínica como prueba",
          "En endocrinología clínica se usa como prueba de estímulo",
        ],
        [
          "used in clinical endocrinology as a test",
          "In clinical endocrinology it is used as a stimulation test",
        ],
      ),
      c(
        "ghrp-2-research-clinical-test",
        ["función hipofisaria", "la función hipofisaria"],
        ["pituitary function", "pituitary function"],
      ),
      c(
        "ghrp-2-research-clinical-test",
        ["personas con obesidad", "pacientes con obesidad"],
        ["people with obesity", "patients with obesity"],
      ),
    ],
  ),

  "ghrp-6-acetate": plain(
    "ghrp-6-acetate",
    "general",
    {
      es: "Se ha estudiado en ratas tras un infarto por sus efectos en la estructura y la función de bombeo del corazón; es un péptido que estimula la liberación de hormona de crecimiento.",
      en: "Studied in rats after a heart attack for its effects on the heart's structure and pumping; a peptide that triggers growth hormone release.",
    },
    [
      c(
        "ghrp-6-mechanism-hexapeptide",
        [
          "Un péptido que estimula la liberación de hormona de crecimiento",
          "hexapéptido secretagogo de hormona de crecimiento",
        ],
        [
          "A peptide that triggers growth hormone release",
          "growth hormone secretagogue hexapeptide",
        ],
      ),
      c("ghrp-6-research-infarct", ["en ratas", "en ratas"], ["in rats", "in rats"]),
      c(
        "ghrp-6-research-infarct",
        ["tras un infarto", "modelo de infarto de miocardio"],
        ["after a heart attack", "myocardial infarction model"],
      ),
      c(
        "ghrp-6-research-infarct",
        [
          "la estructura y la función de bombeo del corazón",
          "remodelado ventricular y la función sistólica",
        ],
        ["the heart's structure and pumping", "ventricular remodelling and systolic function"],
      ),
    ],
  ),

  "hexarelin-acetate": plain(
    "hexarelin-acetate",
    "general",
    {
      es: "Un compuesto que estimula la liberación de hormona de crecimiento por el receptor de ghrelina; una revisión lo agrupa con GHRP-2, GHRP-6 e ipamorelina.",
      en: "A compound that triggers growth hormone release through the ghrelin receptor; a review groups it with GHRP-2, GHRP-6 and ipamorelin.",
    },
    [
      c(
        "hexarelin-mechanism-secretagogue",
        [
          "estimula la liberación de hormona de crecimiento",
          "secretagogo de hormona de crecimiento",
        ],
        ["triggers growth hormone release", "growth hormone secretagogue"],
      ),
      c(
        "hexarelin-mechanism-secretagogue",
        ["por el receptor de ghrelina", "actúan por el receptor de ghrelina"],
        ["through the ghrelin receptor", "act through the ghrelin receptor"],
      ),
      c(
        "hexarelin-mechanism-secretagogue",
        [
          "una revisión lo agrupa con GHRP-2, GHRP-6 e ipamorelina",
          "la agrupa con GHRP-2, GHRP-6 e ipamorelina",
        ],
        [
          "a review groups it with GHRP-2, GHRP-6 and ipamorelin",
          "groups it with GHRP-2, GHRP-6 and ipamorelin",
        ],
      ),
    ],
  ),

  mgf: plain(
    "mgf",
    "general",
    {
      es: "Se ha estudiado en cartílago dañado por lesión o por osteoartritis; es una forma del factor de crecimiento IGF-1 que responde a la carga mecánica.",
      en: "Studied in cartilage damaged by injury or by osteoarthritis; a form of the growth factor IGF-1 that responds to mechanical load.",
    },
    [
      c(
        "mgf-mechanism-isoform",
        [
          "Una forma del factor de crecimiento IGF-1",
          "isoforma del factor de crecimiento similar a la insulina 1 (IGF-1)",
        ],
        ["A form of the growth factor IGF-1", "isoform of insulin-like growth factor 1 (IGF-1)"],
      ),
      c(
        "mgf-mechanism-isoform",
        ["que responde a la carga mecánica", "sensible a estímulos mecánicos"],
        ["that responds to mechanical load", "mechanically sensitive"],
      ),
      c(
        "mgf-research-cartilage",
        [
          "cartílago dañado por lesión o por osteoartritis",
          "cartílago dañado por trauma o por enfermedades degenerativas como la osteoartritis",
        ],
        [
          "cartilage damaged by injury or by osteoarthritis",
          "cartilage damaged by trauma or by degenerative disease such as osteoarthritis",
        ],
      ),
    ],
  ),

  "peg-mgf": plain(
    "peg-mgf",
    "general",
    {
      es: "Una forma modificada (pegilada) del factor de crecimiento mecánico, una versión del factor de crecimiento IGF-1; una revisión la nombra entre los análogos de IGF-1 que circulan como compuestos de investigación.",
      en: "A modified (pegylated) form of mechano growth factor, a version of the growth factor IGF-1; a review names it among the IGF-1 analogues circulating as research compounds.",
    },
    [
      c(
        "peg-mgf-mechanism-pegylated",
        [
          "Una forma modificada (pegilada) del factor de crecimiento mecánico",
          "factor de crecimiento mecánico pegilado",
        ],
        ["A modified (pegylated) form of mechano growth factor", "pegylated mechano growth factor"],
      ),
      c(
        "peg-mgf-mechanism-pegylated",
        ["una versión del factor de crecimiento IGF-1", "isoforma del IGF-1"],
        ["a version of the growth factor IGF-1", "isoform of IGF-1"],
      ),
      c(
        "peg-mgf-mechanism-pegylated",
        [
          "una revisión la nombra entre los análogos de IGF-1 que circulan como compuestos de investigación",
          "entre los análogos de IGF-1 que circulan como compuestos de investigación",
        ],
        [
          "a review names it among the IGF-1 analogues circulating as research compounds",
          "among the IGF-1 analogues circulating as research compounds",
        ],
      ),
    ],
  ),

  "igf-1lr3": plain(
    "igf-1lr3",
    "general",
    {
      es: "Se ha usado en células musculares y ratones en investigación sobre la pérdida de músculo asociada al cáncer; es una versión del factor de crecimiento IGF-1.",
      en: "Used in muscle cells and mice in research on muscle wasting linked to cancer; a version of the growth factor IGF-1.",
    },
    [
      c(
        "igf-1lr3-mechanism-analogue",
        [
          "Una versión del factor de crecimiento IGF-1",
          "análogo del factor de crecimiento similar a la insulina 1",
        ],
        ["A version of the growth factor IGF-1", "analogue of insulin-like growth factor 1"],
      ),
      c(
        "igf-1lr3-research-cachexia-model",
        ["células musculares y ratones", "células musculares C2C12 y en un modelo murino"],
        ["muscle cells and mice", "C2C12 muscle cells and in a murine model"],
      ),
      c(
        "igf-1lr3-research-cachexia-model",
        ["pérdida de músculo asociada al cáncer", "caquexia asociada a cáncer"],
        ["muscle wasting linked to cancer", "cancer-associated cachexia"],
      ),
    ],
  ),

  "gdf-8": plain(
    "gdf-8",
    "general",
    {
      es: "Se ha estudiado en ratones por su papel en la regulación de la masa muscular; también llamado miostatina, es una proteína que se produce en el músculo esquelético.",
      en: "Studied in mice for its role in regulating muscle mass; also called myostatin, a protein made in skeletal muscle.",
    },
    [
      c(
        "gdf-8-mechanism-identity",
        ["También llamado miostatina", "también llamado miostatina"],
        ["Also called myostatin", "also called myostatin"],
      ),
      c(
        "gdf-8-mechanism-identity",
        [
          "una proteína que se produce en el músculo esquelético",
          "se expresa específicamente en músculo esquelético",
        ],
        [
          "a protein made in skeletal muscle",
          "expressed specifically in developing and adult skeletal muscle",
        ],
      ),
      c(
        "gdf-8-research-knockout",
        ["regulación de la masa muscular", "su papel regulador de la masa muscular"],
        ["regulating muscle mass", "its role in regulating muscle mass"],
      ),
      c("gdf-8-research-knockout", ["en ratones", "en el ratón"], ["in mice", "in the mouse"]),
    ],
  ),

  "ace-031": plain(
    "ace-031",
    "general",
    {
      es: "Se ha estudiado en titís, un primate no humano, por sus efectos en la masa y la fuerza muscular; es una proteína que atrapa la miostatina y señales relacionadas.",
      en: "Studied in marmosets, a non-human primate, for its effects on muscle mass and strength; a protein that traps myostatin and related signals.",
    },
    [
      c(
        "ace-031-mechanism-actriib",
        [
          "Una proteína que atrapa la miostatina y señales relacionadas",
          "secuestra ligandos de ActRIIB, entre ellos la miostatina",
        ],
        [
          "A protein that traps myostatin and related signals",
          "sequesters ActRIIB ligands, among them myostatin",
        ],
      ),
      c(
        "ace-031-research-marmoset",
        ["en titís, un primate no humano", "En el tití común, un primate no humano"],
        ["in marmosets, a non-human primate", "In the common marmoset, a non-human primate"],
      ),
      c(
        "ace-031-research-marmoset",
        ["masa y la fuerza muscular", "la masa y la fuerza muscular"],
        ["muscle mass and strength", "muscle mass and strength"],
      ),
    ],
  ),

  /* ---- Hormonal ------------------------------------------------------------ */
  hcg: plain(
    "hcg",
    "specific",
    {
      es: "Una hormona usada clínicamente para estimular las glándulas reproductivas; una revisión sistemática evaluó su eficacia y seguridad en la infertilidad masculina.",
      en: "A hormone used clinically to stimulate the reproductive glands; a systematic review assessed its effectiveness and safety in male infertility.",
    },
    [
      c(
        "hcg-mechanism-gonadotropin",
        [
          "Una hormona usada clínicamente para estimular las glándulas reproductivas",
          "gonadotropina usada clínicamente para estimular la función gonadal",
        ],
        [
          "A hormone used clinically to stimulate the reproductive glands",
          "gonadotropin used clinically to stimulate gonadal function",
        ],
      ),
      c(
        "hcg-research-systematic-review",
        [
          "una revisión sistemática evaluó su eficacia y seguridad en la infertilidad masculina",
          "evaluó su eficacia y seguridad en infertilidad masculina",
        ],
        [
          "a systematic review assessed its effectiveness and safety in male infertility",
          "assessed its efficacy and safety in male infertility",
        ],
      ),
    ],
  ),

  "kisspeptin-10": plain(
    "kisspeptin-10",
    "specific",
    {
      es: "La forma más corta y plenamente activa de la kisspeptina, una señal que estimula las hormonas reproductivas; estudiada en hombres sanos, donde estimuló la hormona luteinizante (LH).",
      en: "The shortest fully active form of kisspeptin, a signal that drives reproductive hormones; studied in healthy men, where it stimulated luteinising hormone (LH).",
    },
    [
      c(
        "kisspeptin-10-mechanism-gnrh",
        [
          "La forma más corta y plenamente activa de la kisspeptina",
          "secuencia mínima con actividad intrínseca completa",
        ],
        [
          "The shortest fully active form of kisspeptin",
          "minimal sequence with full intrinsic bioactivity",
        ],
      ),
      c(
        "kisspeptin-10-mechanism-gnrh",
        [
          "una señal que estimula las hormonas reproductivas",
          "estimulan la GnRH y con ella la secreción de gonadotropinas",
        ],
        [
          "a signal that drives reproductive hormones",
          "stimulate GnRH and thereby gonadotropin secretion",
        ],
      ),
      c(
        "kisspeptin-10-research-men",
        ["en hombres sanos", "En hombres sanos"],
        ["in healthy men", "In healthy men"],
      ),
      c(
        "kisspeptin-10-research-men",
        ["estimuló la hormona luteinizante (LH)", "estimulador potente de la LH"],
        ["stimulated luteinising hormone (LH)", "potent stimulator of LH"],
      ),
    ],
  ),

  pt141: plain(
    "pt141",
    "specific",
    {
      es: "Se ha estudiado en ensayos clínicos en mujeres premenopáusicas con deseo sexual bajo (trastorno del deseo sexual hipoactivo); es la bremelanotida, un péptido de la familia de las melanocortinas.",
      en: "Studied in clinical trials in premenopausal women with low sexual desire (hypoactive sexual desire disorder); bremelanotide, a peptide of the melanocortin family.",
    },
    [
      c(
        "pt141-mechanism-melanocortin",
        ["la bremelanotida", "PT-141 es la bremelanotida"],
        ["bremelanotide", "PT-141 is bremelanotide"],
      ),
      c(
        "pt141-mechanism-melanocortin",
        [
          "un péptido de la familia de las melanocortinas",
          "un péptido de la familia de las melanocortinas",
        ],
        ["a peptide of the melanocortin family", "a peptide of the melanocortin family"],
      ),
      c(
        "pt141-research-reconnect",
        ["ensayos clínicos", "ensayos de fase 3"],
        ["clinical trials", "phase 3 trials"],
      ),
      c(
        "pt141-research-reconnect",
        [
          "mujeres premenopáusicas con deseo sexual bajo (trastorno del deseo sexual hipoactivo)",
          "mujeres premenopáusicas con trastorno del deseo sexual hipoactivo",
        ],
        [
          "premenopausal women with low sexual desire (hypoactive sexual desire disorder)",
          "premenopausal women with hypoactive sexual desire disorder",
        ],
      ),
    ],
  ),

  "oxytocin-acetate": plain(
    "oxytocin-acetate",
    "specific",
    {
      es: "Se ha estudiado en cerca de 25,000 publicaciones por su papel en la reproducción y en conductas sociales y emocionales, en animales y humanos.",
      en: "Studied in close to 25,000 publications for its role in reproduction and in social and emotional behaviour, in animals and humans.",
    },
    [
      c(
        "oxytocin-research-literature",
        ["cerca de 25,000 publicaciones", "cerca de 25,000 publicaciones"],
        ["close to 25,000 publications", "close to 25,000 publications"],
      ),
      c(
        "oxytocin-research-literature",
        [
          "la reproducción y en conductas sociales y emocionales",
          "en la reproducción y en conductas sociales y emocionales",
        ],
        [
          "reproduction and in social and emotional behaviour",
          "in reproduction and in social and emotional behaviours",
        ],
      ),
      c(
        "oxytocin-research-literature",
        ["en animales y humanos", "estudios animales y humanos"],
        ["in animals and humans", "animal and human studies"],
      ),
    ],
  ),

  vip: plain(
    "vip",
    "specific",
    {
      es: "Un péptido de señalización nerviosa descrito como modulador potente de las respuestas inmunitarias; una revisión recorre cinco décadas de su estudio en sepsis.",
      en: "A nerve-signalling peptide described as a strong modulator of immune responses; a review covers five decades of its study in sepsis.",
    },
    [
      c(
        "vip-mechanism-neuropeptide",
        ["Un péptido de señalización nerviosa", "neuropéptido"],
        ["A nerve-signalling peptide", "neuropeptide"],
      ),
      c(
        "vip-mechanism-neuropeptide",
        [
          "descrito como modulador potente de las respuestas inmunitarias",
          "se describe como modulador potente de las respuestas inmunitarias",
        ],
        [
          "described as a strong modulator of immune responses",
          "described as a potent modulator of immune responses",
        ],
      ),
      c(
        "vip-research-sepsis-review",
        [
          "una revisión recorre cinco décadas de su estudio en sepsis",
          "recorre cinco décadas de investigación en sepsis",
        ],
        [
          "a review covers five decades of its study in sepsis",
          "covers five decades of sepsis research",
        ],
      ),
    ],
  ),

  /* ---- Longevity ----------------------------------------------------------- */
  nad: plain(
    "nad",
    "specific",
    {
      es: "Una coenzima en el centro del metabolismo energético; una revisión examina su papel en la reparación del ADN, el envejecimiento celular y la función inmunitaria en el contexto del envejecimiento.",
      en: "A coenzyme at the centre of energy metabolism; a review examines its role in DNA repair, cell ageing and immune function in the context of ageing.",
    },
    [
      c(
        "nad-mechanism-coenzyme",
        [
          "Una coenzima en el centro del metabolismo energético",
          "en el centro del metabolismo energético",
        ],
        ["A coenzyme at the centre of energy metabolism", "at the centre of energy metabolism"],
      ),
      c(
        "nad-research-ageing",
        ["una revisión", "La revisión citada"],
        ["a review", "The review cited"],
      ),
      c(
        "nad-research-ageing",
        ["reparación del ADN", "reparación de ADN"],
        ["DNA repair", "DNA repair"],
      ),
      c(
        "nad-research-ageing",
        ["envejecimiento celular", "senescencia celular"],
        ["cell ageing", "cellular senescence"],
      ),
      c(
        "nad-research-ageing",
        ["función inmunitaria", "función de las células inmunes"],
        ["immune function", "immune cell function"],
      ),
      c(
        "nad-research-ageing",
        ["en el contexto del envejecimiento", "en el contexto del envejecimiento"],
        ["in the context of ageing", "in the context of ageing"],
      ),
    ],
  ),

  "mots-c": plain(
    "mots-c",
    "general",
    {
      es: "Un péptido pequeño codificado en el ADN mitocondrial; el trabajo que lo describió reporta un papel en la sensibilidad a la insulina y el equilibrio metabólico.",
      en: "A small peptide encoded in mitochondrial DNA; the work that described it reports a role in insulin sensitivity and metabolic balance.",
    },
    [
      c(
        "mots-c-mechanism-mitochondrial",
        ["Un péptido pequeño", "péptido de 16 aminoácidos"],
        ["A small peptide", "16-amino-acid peptide"],
      ),
      c(
        "mots-c-mechanism-mitochondrial",
        ["codificado en el ADN mitocondrial", "del ADN mitocondrial"],
        ["encoded in mitochondrial DNA", "of mitochondrial DNA"],
      ),
      c(
        "mots-c-research-metabolic",
        ["el trabajo que lo describió", "El trabajo que lo describió"],
        ["the work that described it", "The work that described it"],
      ),
      c(
        "mots-c-research-metabolic",
        ["sensibilidad a la insulina", "sensibilidad a la insulina"],
        ["insulin sensitivity", "insulin sensitivity"],
      ),
      c(
        "mots-c-research-metabolic",
        ["equilibrio metabólico", "homeostasis metabólica"],
        ["metabolic balance", "metabolic homeostasis"],
      ),
    ],
  ),

  humanin: plain(
    "humanin",
    "general",
    {
      es: "Se ha estudiado en ratas con cambios cerebrales y déficit cognitivo causados por amiloide beta; es un péptido codificado en el ADN mitocondrial.",
      en: "Studied in rats with brain changes and cognitive deficits caused by amyloid beta; a peptide encoded in mitochondrial DNA.",
    },
    [
      c(
        "humanin-mechanism-mitochondrial",
        [
          "Un péptido codificado en el ADN mitocondrial",
          "codificado por un marco de lectura corto del ADN mitocondrial",
        ],
        [
          "A peptide encoded in mitochondrial DNA",
          "encoded by a short open reading frame in mitochondrial DNA",
        ],
      ),
      c("humanin-research-rat-model", ["en ratas", "En ratas"], ["in rats", "In rats"]),
      c(
        "humanin-research-rat-model",
        [
          "cambios cerebrales y déficit cognitivo causados por amiloide beta",
          "cambios patológicos y déficit cognitivo inducidos por amiloide β",
        ],
        [
          "brain changes and cognitive deficits caused by amyloid beta",
          "amyloid β-induced pathological changes and cognitive deficits",
        ],
      ),
    ],
  ),

  "ss-31": plain(
    "ss-31",
    "general",
    {
      es: "Descrito como protector de la cardiolipina, una molécula de grasa de la membrana mitocondrial interna; revisado en investigación sobre restaurar la producción de energía celular en enfermedades asociadas a la edad.",
      en: "Described as protecting cardiolipin, a fat molecule of the inner mitochondrial membrane; reviewed in research on restoring cell energy production in age-related disease.",
    },
    [
      c(
        "ss-31-mechanism-cardiolipin",
        ["Descrito como protector de la cardiolipina", "compuesto protector de la cardiolipina"],
        ["Described as protecting cardiolipin", "cardiolipin-protective compound"],
      ),
      c(
        "ss-31-mechanism-cardiolipin",
        [
          "una molécula de grasa de la membrana mitocondrial interna",
          "fosfolípido exclusivo de la membrana mitocondrial interna",
        ],
        [
          "a fat molecule of the inner mitochondrial membrane",
          "phospholipid found only on the inner mitochondrial membrane",
        ],
      ),
      c(
        "ss-31-research-bioenergetics",
        ["revisado", "La revisión citada"],
        ["reviewed", "The review cited"],
      ),
      c(
        "ss-31-research-bioenergetics",
        [
          "restaurar la producción de energía celular",
          "restauración de la bioenergética mitocondrial",
        ],
        ["restoring cell energy production", "restoring mitochondrial bioenergetics"],
      ),
      c(
        "ss-31-research-bioenergetics",
        ["enfermedades asociadas a la edad", "enfermedades asociadas a la edad"],
        ["age-related disease", "age-associated disease"],
      ),
    ],
  ),

  "fox04-dir": plain(
    "fox04-dir",
    "general",
    {
      es: "Un péptido diseñado para eliminar células senescentes, que deterioran la función del tejido; investigado para restaurar la salud del tejido tras daño tóxico y en el envejecimiento.",
      en: "A peptide designed to remove senescent cells, which impair tissue function; investigated for restoring tissue health after toxic damage and in ageing.",
    },
    [
      c(
        "foxo4-mechanism-p53",
        ["Un péptido diseñado", "péptido FOXO4 fue diseñado"],
        ["A peptide designed", "FOXO4 peptide was designed"],
      ),
      c(
        "foxo4-research-senescence",
        ["para eliminar células senescentes", "apoptosis dirigida de esas células"],
        ["to remove senescent cells", "targeted apoptosis of those cells"],
      ),
      c(
        "foxo4-research-senescence",
        [
          "que deterioran la función del tejido",
          "las células senescentes deterioran la función del tejido",
        ],
        ["which impair tissue function", "senescent cells impairing tissue function"],
      ),
      c(
        "foxo4-research-senescence",
        ["restaurar la salud del tejido", "homeostasis del tejido puede además restaurarse"],
        ["restoring tissue health", "tissue homeostasis can also be restored"],
      ),
      c(
        "foxo4-research-senescence",
        [
          "tras daño tóxico y en el envejecimiento",
          "tras daño por quimioterapia y en el envejecimiento",
        ],
        ["after toxic damage and in ageing", "after chemotoxic damage and in ageing"],
      ),
    ],
  ),

  glutathione: plain(
    "glutathione",
    "specific",
    {
      es: "Una molécula que producen las células y que las protege del daño oxidativo y de compuestos tóxicos; la revisión citada describe cómo se produce, cómo se regula y cómo se mide.",
      en: "A molecule made by cells that protects them from oxidative damage and toxic compounds; the review cited covers how it is made, regulated and measured.",
    },
    [
      c(
        "glutathione-mechanism-thiol",
        [
          "Una molécula que producen las células",
          "compuesto tiólico de bajo peso molecular más abundante que sintetizan las células",
        ],
        [
          "A molecule made by cells",
          "most abundant low-molecular-weight thiol compound synthesised in cells",
        ],
      ),
      c(
        "glutathione-mechanism-thiol",
        [
          "que las protege del daño oxidativo y de compuestos tóxicos",
          "protegiéndolas del daño oxidativo y de la toxicidad de electrófilos xenobióticos",
        ],
        [
          "protects them from oxidative damage and toxic compounds",
          "protecting them from oxidative damage and from the toxicity of xenobiotic electrophiles",
        ],
      ),
      c(
        "glutathione-research-overview",
        [
          "la revisión citada describe cómo se produce, cómo se regula y cómo se mide",
          "los métodos para medir el estado de glutatión en las células, su síntesis y su regulación",
        ],
        [
          "the review cited covers how it is made, regulated and measured",
          "the methods for assessing glutathione status in cells, its synthesis and regulation",
        ],
      ),
    ],
  ),

  epithalon: plain(
    "epithalon",
    "general",
    {
      es: "Un péptido situado en la biología del telómero (los extremos de los cromosomas) en una revisión de péptidos en la investigación del envejecimiento, que lo cuenta entre los no aprobados.",
      en: "A peptide placed under telomere biology (the ends of chromosomes) in a review of peptides in ageing research, which counts it among the non-approved ones.",
    },
    [
      c(
        "epithalon-mechanism-telomere",
        ["Un péptido", "nueve péptidos revisados"],
        ["A peptide", "nine peptides reviewed"],
      ),
      c(
        "epithalon-mechanism-telomere",
        [
          "situado en la biología del telómero (los extremos de los cromosomas)",
          "lo sitúa en la biología del telómero",
        ],
        [
          "placed under telomere biology (the ends of chromosomes)",
          "places it in telomere biology",
        ],
      ),
      c(
        "epithalon-mechanism-telomere",
        [
          "una revisión de péptidos en la investigación del envejecimiento",
          "péptidos revisados en gerontología",
        ],
        ["a review of peptides in ageing research", "peptides reviewed in gerontology"],
      ),
      c(
        "epithalon-research-review-limits",
        ["lo cuenta entre los no aprobados", "los no aprobados"],
        ["counts it among the non-approved ones", "non-approved ones"],
      ),
    ],
  ),

  /* ---- Neuro --------------------------------------------------------------- */
  melatonin: plain(
    "melatonin",
    "specific",
    {
      es: "Una molécula que la glándula pineal produce de noche, estudiada como la señal que transmite la información del ritmo día-noche.",
      en: "A molecule made at night by the pineal gland, studied as the signal that carries day-night rhythm information.",
    },
    [
      c(
        "melatonin-mechanism-hormone",
        ["Una molécula", "es una molécula"],
        ["A molecule", "is a molecule"],
      ),
      c(
        "melatonin-mechanism-hormone",
        ["glándula pineal", "glándula pineal"],
        ["pineal gland", "pineal gland"],
      ),
      c(
        "melatonin-research-circadian",
        ["produce de noche", "se produce siempre durante la noche"],
        ["made at night", "always produced during the night"],
      ),
      c(
        "melatonin-research-circadian",
        [
          "la señal que transmite la información del ritmo día-noche",
          "la señal que transmite la información temporal del ritmo día-noche",
        ],
        [
          "the signal that carries day-night rhythm information",
          "the signal that carries the temporal information of the day-night rhythm",
        ],
      ),
    ],
  ),

  cerebrolysin: plain(
    "cerebrolysin",
    "specific",
    {
      es: "Se ha estudiado como complemento en pacientes con ictus sometidos a extracción del coágulo, en un análisis que sus autores llaman generador de hipótesis; se describe como protectora del sistema nervioso.",
      en: "Studied as an add-on in stroke patients undergoing clot removal, in an analysis its authors call hypothesis-generating; described as a nerve-protecting agent.",
    },
    [
      c(
        "cerebrolysin-mechanism-multimodal",
        ["se describe como protectora del sistema nervioso", "agente neuroprotector multimodal"],
        ["Described as a nerve-protecting agent", "multimodal neuroprotective agent"],
      ),
      c(
        "cerebrolysin-research-thrombectomy",
        ["como complemento", "cerebrolisina adyuvante"],
        ["as an add-on", "adjunctive Cerebrolysin"],
      ),
      c(
        "cerebrolysin-research-thrombectomy",
        [
          "pacientes con ictus sometidos a extracción del coágulo",
          "pacientes seleccionados con trombectomía endovascular por ictus",
        ],
        [
          "stroke patients undergoing clot removal",
          "patients undergoing endovascular thrombectomy for stroke",
        ],
      ),
      c(
        "cerebrolysin-research-thrombectomy",
        [
          "en un análisis que sus autores llaman generador de hipótesis",
          "describen el análisis como generador de hipótesis",
        ],
        [
          "in an analysis its authors call hypothesis-generating",
          "describe the analysis as hypothesis-generating",
        ],
      ),
    ],
  ),

  "p21-p021": plain(
    "p21-p021",
    "general",
    {
      es: "Se ha estudiado en modelos de laboratorio y animales del trastorno por deficiencia de CDKL5, un trastorno cerebral epiléptico grave; imita al CNTF, una proteína que sostiene a las neuronas.",
      en: "Studied in laboratory and animal models of CDKL5 deficiency disorder, a severe epileptic brain disorder; it mimics CNTF, a nerve-supporting protein.",
    },
    [
      c(
        "p021-mechanism-cntf-mimetic",
        [
          "Imita al CNTF, una proteína que sostiene a las neuronas",
          "mimético peptídico de molécula pequeña del factor neurotrófico ciliar (CNTF)",
        ],
        [
          "Mimics CNTF, a nerve-supporting protein",
          "small-molecule peptide mimetic of ciliary neurotrophic factor (CNTF)",
        ],
      ),
      c(
        "p021-research-cdkl5",
        ["modelos de laboratorio y animales", "modelos in vitro e in vivo"],
        ["laboratory and animal models", "in vitro and in vivo models"],
      ),
      c(
        "p021-research-cdkl5",
        [
          "trastorno por deficiencia de CDKL5, un trastorno cerebral epiléptico grave",
          "trastorno por deficiencia de CDKL5, una encefalopatía epiléptica grave",
        ],
        [
          "CDKL5 deficiency disorder, a severe epileptic brain disorder",
          "CDKL5 deficiency disorder, a severe epileptic encephalopathy",
        ],
      ),
    ],
  ),

  dihexa: plain(
    "dihexa",
    "general",
    {
      es: "Se ha estudiado en ratas en un modelo de la enfermedad de Huntington; es un compuesto derivado de la angiotensina IV al que se atribuyen propiedades neuroprotectoras y cognitivas.",
      en: "Studied in rats in a model of Huntington's disease; a compound derived from angiotensin IV with attributed nerve-protecting and cognitive properties.",
    },
    [
      c(
        "dihexa-mechanism-angiotensin-iv",
        ["derivado de la angiotensina IV", "análogo de la angiotensina IV"],
        ["derived from angiotensin IV", "angiotensin IV analogue"],
      ),
      c(
        "dihexa-mechanism-angiotensin-iv",
        [
          "al que se atribuyen propiedades neuroprotectoras y cognitivas",
          "al que se han atribuido propiedades neuroprotectoras y procognitivas",
        ],
        [
          "with attributed nerve-protecting and cognitive properties",
          "neuroprotective and procognitive properties have been attributed",
        ],
      ),
      c(
        "dihexa-research-huntington-model",
        ["en ratas", "Se estudió en ratas"],
        ["in rats", "studied in rats"],
      ),
      c(
        "dihexa-research-huntington-model",
        [
          "un modelo de la enfermedad de Huntington",
          "un modelo que imita la patología de la enfermedad de Huntington",
        ],
        ["a model of Huntington's disease", "a model that mimics Huntington's disease pathology"],
      ),
    ],
  ),

  selank: plain(
    "selank",
    "general",
    {
      es: "Se ha estudiado en ratas en un modelo de abstinencia de morfina; es una versión de la tuftsina, un péptido de origen inmunológico.",
      en: "Studied in rats in a model of morphine withdrawal; a version of tuftsin, a peptide of immune origin.",
    },
    [
      c(
        "selank-mechanism-tuftsin",
        ["Una versión de la tuftsina", "análogo peptídico de la tuftsina"],
        ["A version of tuftsin", "peptide analogue of tuftsin"],
      ),
      c(
        "selank-mechanism-tuftsin",
        ["un péptido de origen inmunológico", "tetrapéptido de origen inmunológico"],
        ["a peptide of immune origin", "tetrapeptide of immunological origin"],
      ),
      c("selank-research-rats", ["en ratas", "En ratas"], ["in rats", "In rats"]),
      c(
        "selank-research-rats",
        ["un modelo de abstinencia de morfina", "modelo de abstinencia de morfina"],
        ["a model of morphine withdrawal", "morphine withdrawal model"],
      ),
    ],
  ),

  semax: plain(
    "semax",
    "general",
    {
      es: "Se ha estudiado en tejido cerebral de rata y revisado en relación con la enfermedad de Alzheimer; es una versión de un fragmento de la hormona ACTH.",
      en: "Studied in rat brain tissue and reviewed in relation to Alzheimer's disease; a version of a fragment of the hormone ACTH.",
    },
    [
      c(
        "semax-mechanism-acth-analogue",
        ["Una versión de un fragmento de la hormona ACTH", "análogo del fragmento ACTH(4-10)"],
        ["A version of a fragment of the hormone ACTH", "analogue of the ACTH(4-10) fragment"],
      ),
      c(
        "semax-mechanism-acth-analogue",
        ["tejido cerebral de rata", "rebanadas de cerebro de rata"],
        ["rat brain tissue", "rat brain slices"],
      ),
      c(
        "semax-research-review",
        ["revisado", "Una revisión de 2025"],
        ["reviewed", "A 2025 review"],
      ),
      c(
        "semax-research-review",
        ["la enfermedad de Alzheimer", "la enfermedad de Alzheimer"],
        ["Alzheimer's disease", "Alzheimer's disease"],
      ),
    ],
  ),

  "selank-semax": plain(
    "selank-semax",
    "general",
    {
      es: "Combina dos péptidos con literatura propia: Selank, una versión de la tuftsina, y Semax, una versión de un fragmento de la hormona ACTH.",
      en: "Combines two peptides with separate literature: Selank, a version of tuftsin, and Semax, a version of a fragment of the hormone ACTH.",
    },
    [
      c(
        "selank-semax-mechanism-components",
        [
          "Combina dos péptidos con literatura propia",
          "combina dos péptidos con literatura propia",
        ],
        [
          "Combines two peptides with separate literature",
          "combines two peptides with their own literature",
        ],
      ),
      c(
        "selank-semax-mechanism-components",
        ["Selank, una versión de la tuftsina", "Selank, análogo de la tuftsina"],
        ["Selank, a version of tuftsin", "Selank, a tuftsin analogue"],
      ),
      c(
        "selank-semax-mechanism-components",
        [
          "Semax, una versión de un fragmento de la hormona ACTH",
          "Semax, análogo del fragmento ACTH(4-10)",
        ],
        [
          "Semax, a version of a fragment of the hormone ACTH",
          "Semax, an analogue of the ACTH(4-10) fragment",
        ],
      ),
    ],
  ),

  /* ---- Unfiled ------------------------------------------------------------- */
  dermorphin: plain(
    "dermorphin",
    "general",
    {
      es: "Se ha estudiado en ratas, en investigación sobre el paro respiratorio causado por cantidades altas de fentanilo; es un compuesto que actúa sobre receptores opioides.",
      en: "Studied in rats, in research on the breathing arrest caused by high amounts of fentanyl; an opioid-receptor compound.",
    },
    [
      c(
        "dermorphin-mechanism-mu-opioid",
        ["que actúa sobre receptores opioides", "actúa sobre receptores opioides μ"],
        ["opioid-receptor", "μ-opioid receptors"],
      ),
      c("dermorphin-mechanism-mu-opioid", ["en ratas", "en ratas"], ["in rats", "in rats"]),
      c(
        "dermorphin-research-apnoea-model",
        [
          "el paro respiratorio causado por cantidades altas de fentanilo",
          "una cantidad alta de fentanilo desencadena una apnea sostenida",
        ],
        [
          "the breathing arrest caused by high amounts of fentanyl",
          "a high amount of fentanyl triggers a sustained apnoea",
        ],
      ),
    ],
  ),
};
