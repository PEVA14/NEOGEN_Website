import type { LocalizedText } from "@/content/lifecycle";

/**
 * RESEARCH FUNCTIONS — what a compound is studied FOR, named as the literature
 * names it: a receptor, a pathway, a tissue process.
 *
 * This is a vocabulary, not a claim. A function is attached to a product only
 * inside that product's overview, and only by pointing at one of its sourced
 * statements (`ProductOverview.functions`). The tag is public exactly when
 * that statement is — approved, reference-backed and free of forbidden terms —
 * so a function can never appear on a product before its source does.
 *
 * WHAT DOES NOT BELONG HERE: outcomes a person wants for themselves (weight,
 * appetite, muscle, sexual function, mood). Those are goals, not mechanisms,
 * and matching a person's goal to an unapproved compound is individual
 * treatment selection. Labels name what is studied, never what a reader gets.
 *
 * GROUPS exist for one reason: the list is long enough that a flat set of
 * checkboxes stopped being readable. They order the Atlas question and nothing
 * else — no group carries meaning a function does not.
 */
export type ResearchFunctionGroup =
  "metabolic" | "tissue-repair" | "neuro-endocrine" | "immune" | "cellular";

export const RESEARCH_FUNCTION_GROUPS: readonly {
  id: ResearchFunctionGroup;
  label: LocalizedText;
}[] = [
  { id: "metabolic", label: { es: "Metabolismo", en: "Metabolism" } },
  { id: "tissue-repair", label: { es: "Tejidos y reparación", en: "Tissue and repair" } },
  {
    id: "neuro-endocrine",
    label: { es: "Sistema nervioso y endocrino", en: "Nervous and endocrine systems" },
  },
  { id: "immune", label: { es: "Inmunidad e inflamación", en: "Immunity and inflammation" } },
  { id: "cellular", label: { es: "Biología celular", en: "Cell biology" } },
];

export type ResearchFunctionId =
  /* metabolic */
  | "incretin-glucagon-receptors"
  | "amylin-signalling"
  | "energy-balance"
  | "glycemic-control"
  | "hepatic-fat"
  | "visceral-adipose-tissue"
  | "lipolysis"
  | "nnmt-nad-metabolism"
  | "mitochondrial-fatty-acid-oxidation"
  | "adipose-vasculature"
  | "one-carbon-metabolism"
  /* tissue and repair */
  | "extracellular-matrix"
  | "cell-migration-angiogenesis"
  | "wound-healing"
  | "musculoskeletal-repair"
  | "muscle-mass-regulation"
  | "igf-1-signalling"
  | "innate-repair-receptor"
  | "dermal-structure"
  | "hair-follicle"
  /* nervous and endocrine */
  | "growth-hormone-axis"
  | "reproductive-axis"
  | "melanocortin-receptors"
  | "neuroendocrine-signalling"
  | "circadian-regulation"
  | "neuroprotection"
  | "opioid-receptors"
  /* immunity */
  | "immune-modulation"
  | "inflammatory-signalling"
  | "antimicrobial-activity"
  /* cell biology */
  | "gene-expression"
  | "cellular-senescence"
  | "telomere-biology"
  | "mitochondrial-bioenergetics"
  | "redox-balance";

export interface ResearchFunction {
  id: ResearchFunctionId;
  group: ResearchFunctionGroup;
  label: LocalizedText;
  hint: LocalizedText;
}

export const RESEARCH_FUNCTIONS: readonly ResearchFunction[] = [
  /* ---- Metabolism -------------------------------------------------------- */
  {
    id: "incretin-glucagon-receptors",
    group: "metabolic",
    label: { es: "Receptores de incretinas y glucagón", en: "Incretin and glucagon receptors" },
    hint: {
      es: "Agonismo en receptores GLP-1, GIP o glucagón; la ficha de cada compuesto dice en cuáles.",
      en: "Agonism at GLP-1, GIP or glucagon receptors; each compound's profile says which.",
    },
  },
  {
    id: "amylin-signalling",
    group: "metabolic",
    label: { es: "Señalización de amilina", en: "Amylin signalling" },
    hint: {
      es: "Análogos de amilina y los circuitos de saciedad que describen las fuentes.",
      en: "Amylin analogues and the satiety circuits the sources describe.",
    },
  },
  {
    id: "energy-balance",
    group: "metabolic",
    label: { es: "Balance energético", en: "Energy balance" },
    hint: {
      es: "Ingesta calórica y gasto energético en modelos de investigación.",
      en: "Calorie intake and energy expenditure in research models.",
    },
  },
  {
    id: "glycemic-control",
    group: "metabolic",
    label: { es: "Control glucémico", en: "Glycaemic control" },
    hint: {
      es: "HbA1c y metabolismo de la glucosa en ensayos clínicos.",
      en: "HbA1c and glucose metabolism in clinical trials.",
    },
  },
  {
    id: "hepatic-fat",
    group: "metabolic",
    label: { es: "Grasa hepática", en: "Liver fat" },
    hint: {
      es: "Esteatosis y fibrosis hepática medidas en ensayos clínicos.",
      en: "Hepatic steatosis and fibrosis measured in clinical trials.",
    },
  },
  {
    id: "visceral-adipose-tissue",
    group: "metabolic",
    label: { es: "Tejido adiposo visceral", en: "Visceral adipose tissue" },
    hint: {
      es: "Medición de grasa visceral en estudios clínicos.",
      en: "Visceral fat as measured in clinical studies.",
    },
  },
  {
    id: "lipolysis",
    group: "metabolic",
    label: { es: "Lipólisis", en: "Lipolysis" },
    hint: {
      es: "Movilización de lípidos en tejido adiposo, en modelos celulares y animales.",
      en: "Lipid mobilisation in adipose tissue, in cell and animal models.",
    },
  },
  {
    id: "nnmt-nad-metabolism",
    group: "metabolic",
    label: { es: "NNMT y metabolismo del NAD+", en: "NNMT and NAD+ metabolism" },
    hint: {
      es: "Metilación de nicotinamida y las vías de NAD+ en el adipocito.",
      en: "Nicotinamide methylation and NAD+ pathways in the adipocyte.",
    },
  },
  {
    id: "mitochondrial-fatty-acid-oxidation",
    group: "metabolic",
    label: {
      es: "Mitocondria y oxidación de ácidos grasos",
      en: "Mitochondria and fatty-acid oxidation",
    },
    hint: {
      es: "Transporte de ácidos grasos, β-oxidación y función mitocondrial.",
      en: "Fatty-acid transport, β-oxidation and mitochondrial function.",
    },
  },
  {
    id: "adipose-vasculature",
    group: "metabolic",
    label: { es: "Vasculatura del tejido adiposo", en: "Adipose tissue vasculature" },
    hint: {
      es: "Vasos sanguíneos del tejido adiposo blanco como diana de estudio.",
      en: "White adipose tissue blood vessels as a study target.",
    },
  },
  {
    id: "one-carbon-metabolism",
    group: "metabolic",
    label: { es: "Metabolismo de un carbono", en: "One-carbon metabolism" },
    hint: {
      es: "Metilación, síntesis de ADN y cofactores como la cobalamina.",
      en: "Methylation, DNA synthesis and cofactors such as cobalamin.",
    },
  },

  /* ---- Tissue and repair ------------------------------------------------- */
  {
    id: "extracellular-matrix",
    group: "tissue-repair",
    label: { es: "Matriz extracelular y colágeno", en: "Extracellular matrix and collagen" },
    hint: {
      es: "Síntesis, degradación y organización del colágeno.",
      en: "Collagen synthesis, breakdown and organisation.",
    },
  },
  {
    id: "cell-migration-angiogenesis",
    group: "tissue-repair",
    label: { es: "Migración celular y angiogénesis", en: "Cell migration and angiogenesis" },
    hint: {
      es: "Formación de vasos y movimiento de células hacia una lesión.",
      en: "New vessel formation and cell movement toward an injury.",
    },
  },
  {
    id: "wound-healing",
    group: "tissue-repair",
    label: { es: "Cicatrización de heridas", en: "Wound healing" },
    hint: {
      es: "Reepitelización y reparación de tejido en modelos animales y humanos.",
      en: "Re-epithelialisation and tissue repair in animal and human models.",
    },
  },
  {
    id: "musculoskeletal-repair",
    group: "tissue-repair",
    label: { es: "Reparación musculoesquelética", en: "Musculoskeletal repair" },
    hint: {
      es: "Tendón, ligamento, músculo y hueso en modelos preclínicos.",
      en: "Tendon, ligament, muscle and bone in preclinical models.",
    },
  },
  {
    id: "muscle-mass-regulation",
    group: "tissue-repair",
    label: { es: "Regulación de masa muscular", en: "Muscle mass regulation" },
    hint: {
      es: "Miostatina, activinas y la vía del receptor ActRIIB.",
      en: "Myostatin, activins and the ActRIIB receptor pathway.",
    },
  },
  {
    id: "igf-1-signalling",
    group: "tissue-repair",
    label: { es: "Señalización de IGF-1", en: "IGF-1 signalling" },
    hint: {
      es: "Isoformas y análogos del factor de crecimiento similar a la insulina 1.",
      en: "Isoforms and analogues of insulin-like growth factor 1.",
    },
  },
  {
    id: "innate-repair-receptor",
    group: "tissue-repair",
    label: { es: "Receptor de reparación innata", en: "Innate repair receptor" },
    hint: {
      es: "Protección de tejidos por la vía del receptor de EPO con CD131.",
      en: "Tissue protection through the EPO receptor–CD131 pathway.",
    },
  },
  {
    id: "dermal-structure",
    group: "tissue-repair",
    label: { es: "Estructura de la piel", en: "Skin structure" },
    hint: {
      es: "Firmeza, elasticidad y densidad de la piel en estudios tópicos.",
      en: "Skin firmness, elasticity and density in topical studies.",
    },
  },
  {
    id: "hair-follicle",
    group: "tissue-repair",
    label: { es: "Folículo piloso", en: "Hair follicle" },
    hint: {
      es: "Células de la papila dérmica y crecimiento del folículo en estudios ex vivo.",
      en: "Dermal papilla cells and follicle growth in ex vivo studies.",
    },
  },

  /* ---- Nervous and endocrine systems ------------------------------------- */
  {
    id: "growth-hormone-axis",
    group: "neuro-endocrine",
    label: { es: "Eje GHRH y hormona de crecimiento", en: "GHRH and growth hormone axis" },
    hint: {
      es: "Liberación de hormona de crecimiento e IGF-I descrita en la literatura.",
      en: "Growth hormone release and IGF-I as the literature describes them.",
    },
  },
  {
    id: "reproductive-axis",
    group: "neuro-endocrine",
    label: { es: "Eje reproductivo", en: "Reproductive axis" },
    hint: {
      es: "GnRH, LH y FSH en estudios clínicos del eje hipotálamo-hipófisis-gonadal.",
      en: "GnRH, LH and FSH in clinical studies of the hypothalamic-pituitary-gonadal axis.",
    },
  },
  {
    id: "melanocortin-receptors",
    group: "neuro-endocrine",
    label: { es: "Receptores de melanocortina", en: "Melanocortin receptors" },
    hint: {
      es: "Agonismo en receptores MC1R a MC5R y lo que cada fuente midió.",
      en: "Agonism at the MC1R–MC5R receptors and what each source measured.",
    },
  },
  {
    id: "neuroendocrine-signalling",
    group: "neuro-endocrine",
    label: { es: "Señalización neuroendocrina", en: "Neuroendocrine signalling" },
    hint: {
      es: "Neuropéptidos como la oxitocina y el VIP, y sus receptores.",
      en: "Neuropeptides such as oxytocin and VIP, and their receptors.",
    },
  },
  {
    id: "circadian-regulation",
    group: "neuro-endocrine",
    label: { es: "Regulación circadiana", en: "Circadian regulation" },
    hint: {
      es: "Ritmo día-noche y la señal hormonal que lo transmite.",
      en: "The day-night rhythm and the hormonal signal that carries it.",
    },
  },
  {
    id: "neuroprotection",
    group: "neuro-endocrine",
    label: { es: "Neuroprotección", en: "Neuroprotection" },
    hint: {
      es: "Protección neuronal y plasticidad en modelos celulares, animales y clínicos.",
      en: "Neuronal protection and plasticity in cell, animal and clinical models.",
    },
  },
  {
    id: "opioid-receptors",
    group: "neuro-endocrine",
    label: { es: "Receptores opioides", en: "Opioid receptors" },
    hint: {
      es: "Agonismo en receptores μ, δ o κ. Vocabulario farmacológico, no de uso.",
      en: "Agonism at the μ, δ or κ receptors. Pharmacology, not use.",
    },
  },

  /* ---- Immunity and inflammation ----------------------------------------- */
  {
    id: "immune-modulation",
    group: "immune",
    label: { es: "Modulación inmunitaria", en: "Immune modulation" },
    hint: {
      es: "Diferenciación de linfocitos T y actividad de células dendríticas y macrófagos.",
      en: "T-cell differentiation and dendritic cell and macrophage activity.",
    },
  },
  {
    id: "inflammatory-signalling",
    group: "immune",
    label: { es: "Señalización inflamatoria", en: "Inflammatory signalling" },
    hint: {
      es: "Vías como NF-κB y las citocinas que describen las fuentes.",
      en: "Pathways such as NF-κB and the cytokines the sources describe.",
    },
  },
  {
    id: "antimicrobial-activity",
    group: "immune",
    label: { es: "Actividad antimicrobiana", en: "Antimicrobial activity" },
    hint: {
      es: "Péptidos de defensa del huésped y su acción sobre microorganismos.",
      en: "Host defence peptides and their action on microorganisms.",
    },
  },

  /* ---- Cell biology ------------------------------------------------------ */
  {
    id: "gene-expression",
    group: "cellular",
    label: { es: "Expresión génica", en: "Gene expression" },
    hint: {
      es: "Regulación de la expresión de genes humanos.",
      en: "Regulation of human gene expression.",
    },
  },
  {
    id: "cellular-senescence",
    group: "cellular",
    label: { es: "Senescencia celular", en: "Cellular senescence" },
    hint: {
      es: "Células senescentes y su eliminación selectiva en modelos animales.",
      en: "Senescent cells and their selective clearance in animal models.",
    },
  },
  {
    id: "telomere-biology",
    group: "cellular",
    label: { es: "Biología del telómero", en: "Telomere biology" },
    hint: {
      es: "Telomerasa y longitud telomérica, según la literatura que lo estudia.",
      en: "Telomerase and telomere length, as the literature studying it reports.",
    },
  },
  {
    id: "mitochondrial-bioenergetics",
    group: "cellular",
    label: { es: "Bioenergética mitocondrial", en: "Mitochondrial bioenergetics" },
    hint: {
      es: "Cardiolipina, cadena respiratoria y péptidos codificados en la mitocondria.",
      en: "Cardiolipin, the respiratory chain and mitochondrially encoded peptides.",
    },
  },
  {
    id: "redox-balance",
    group: "cellular",
    label: { es: "Balance redox", en: "Redox balance" },
    hint: {
      es: "Glutatión, tioles y la defensa de la célula frente a oxidantes.",
      en: "Glutathione, thiols and the cell's defence against oxidants.",
    },
  },
];

export const RESEARCH_FUNCTION_IDS: readonly ResearchFunctionId[] = RESEARCH_FUNCTIONS.map(
  (f) => f.id,
);

export function getResearchFunction(id: string): ResearchFunction | undefined {
  return RESEARCH_FUNCTIONS.find((f) => f.id === id);
}
