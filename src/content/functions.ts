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
 */
export type ResearchFunctionId =
  | "incretin-glucagon-receptors"
  | "amylin-signalling"
  | "energy-balance"
  | "glycemic-control"
  | "hepatic-fat"
  | "visceral-adipose-tissue"
  | "lipolysis"
  | "growth-hormone-axis"
  | "nnmt-nad-metabolism"
  | "mitochondrial-fatty-acid-oxidation"
  | "adipose-vasculature"
  | "extracellular-matrix"
  | "cell-migration-angiogenesis"
  | "wound-healing"
  | "musculoskeletal-repair"
  | "gene-expression"
  | "dermal-structure"
  | "immune-modulation"
  | "inflammatory-signalling"
  | "innate-repair-receptor"
  | "antimicrobial-activity"
  | "hair-follicle";

export interface ResearchFunction {
  id: ResearchFunctionId;
  label: LocalizedText;
  hint: LocalizedText;
}

export const RESEARCH_FUNCTIONS: readonly ResearchFunction[] = [
  {
    id: "incretin-glucagon-receptors",
    label: { es: "Receptores de incretinas y glucagón", en: "Incretin and glucagon receptors" },
    hint: {
      es: "Agonismo en receptores GLP-1, GIP o glucagón; la ficha de cada compuesto dice en cuáles.",
      en: "Agonism at GLP-1, GIP or glucagon receptors; each compound's profile says which.",
    },
  },
  {
    id: "amylin-signalling",
    label: { es: "Señalización de amilina", en: "Amylin signalling" },
    hint: {
      es: "Análogos de amilina y los circuitos de saciedad que describen las fuentes.",
      en: "Amylin analogues and the satiety circuits the sources describe.",
    },
  },
  {
    id: "energy-balance",
    label: { es: "Balance energético", en: "Energy balance" },
    hint: {
      es: "Ingesta calórica y gasto energético en modelos de investigación.",
      en: "Calorie intake and energy expenditure in research models.",
    },
  },
  {
    id: "glycemic-control",
    label: { es: "Control glucémico", en: "Glycaemic control" },
    hint: {
      es: "HbA1c y metabolismo de la glucosa en ensayos clínicos.",
      en: "HbA1c and glucose metabolism in clinical trials.",
    },
  },
  {
    id: "hepatic-fat",
    label: { es: "Grasa hepática", en: "Liver fat" },
    hint: {
      es: "Esteatosis y fibrosis hepática medidas en ensayos clínicos.",
      en: "Hepatic steatosis and fibrosis measured in clinical trials.",
    },
  },
  {
    id: "visceral-adipose-tissue",
    label: { es: "Tejido adiposo visceral", en: "Visceral adipose tissue" },
    hint: {
      es: "Medición de grasa visceral en estudios clínicos.",
      en: "Visceral fat as measured in clinical studies.",
    },
  },
  {
    id: "lipolysis",
    label: { es: "Lipólisis", en: "Lipolysis" },
    hint: {
      es: "Movilización de lípidos en tejido adiposo, en modelos celulares y animales.",
      en: "Lipid mobilisation in adipose tissue, in cell and animal models.",
    },
  },
  {
    id: "growth-hormone-axis",
    label: { es: "Eje GHRH y hormona de crecimiento", en: "GHRH and growth hormone axis" },
    hint: {
      es: "Liberación de hormona de crecimiento e IGF-I descrita en la literatura.",
      en: "Growth hormone release and IGF-I as the literature describes them.",
    },
  },
  {
    id: "nnmt-nad-metabolism",
    label: { es: "NNMT y metabolismo del NAD+", en: "NNMT and NAD+ metabolism" },
    hint: {
      es: "Metilación de nicotinamida y las vías de NAD+ en el adipocito.",
      en: "Nicotinamide methylation and NAD+ pathways in the adipocyte.",
    },
  },
  {
    id: "mitochondrial-fatty-acid-oxidation",
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
    label: { es: "Vasculatura del tejido adiposo", en: "Adipose tissue vasculature" },
    hint: {
      es: "Vasos sanguíneos del tejido adiposo blanco como diana de estudio.",
      en: "White adipose tissue blood vessels as a study target.",
    },
  },
  {
    id: "extracellular-matrix",
    label: { es: "Matriz extracelular y colágeno", en: "Extracellular matrix and collagen" },
    hint: {
      es: "Síntesis, degradación y organización del colágeno.",
      en: "Collagen synthesis, breakdown and organisation.",
    },
  },
  {
    id: "cell-migration-angiogenesis",
    label: { es: "Migración celular y angiogénesis", en: "Cell migration and angiogenesis" },
    hint: {
      es: "Formación de vasos y movimiento de células hacia una lesión.",
      en: "New vessel formation and cell movement toward an injury.",
    },
  },
  {
    id: "wound-healing",
    label: { es: "Cicatrización de heridas", en: "Wound healing" },
    hint: {
      es: "Reepitelización y reparación de tejido en modelos animales.",
      en: "Re-epithelialisation and tissue repair in animal models.",
    },
  },
  {
    id: "musculoskeletal-repair",
    label: { es: "Reparación musculoesquelética", en: "Musculoskeletal repair" },
    hint: {
      es: "Tendón, ligamento, músculo y hueso en modelos preclínicos.",
      en: "Tendon, ligament, muscle and bone in preclinical models.",
    },
  },
  {
    id: "gene-expression",
    label: { es: "Expresión génica", en: "Gene expression" },
    hint: {
      es: "Regulación de la expresión de genes humanos.",
      en: "Regulation of human gene expression.",
    },
  },
  {
    id: "immune-modulation",
    label: { es: "Modulación inmunitaria", en: "Immune modulation" },
    hint: {
      es: "Diferenciación de linfocitos T y actividad de células dendríticas y macrófagos.",
      en: "T-cell differentiation and dendritic cell and macrophage activity.",
    },
  },
  {
    id: "inflammatory-signalling",
    label: { es: "Señalización inflamatoria", en: "Inflammatory signalling" },
    hint: {
      es: "Vías como NF-κB y las citocinas que describen las fuentes.",
      en: "Pathways such as NF-κB and the cytokines the sources describe.",
    },
  },
  {
    id: "innate-repair-receptor",
    label: { es: "Receptor de reparación innata", en: "Innate repair receptor" },
    hint: {
      es: "Protección de tejidos por la vía del receptor de EPO con CD131.",
      en: "Tissue protection through the EPO receptor–CD131 pathway.",
    },
  },
  {
    id: "antimicrobial-activity",
    label: { es: "Actividad antimicrobiana", en: "Antimicrobial activity" },
    hint: {
      es: "Péptidos de defensa del huésped y su acción sobre microorganismos.",
      en: "Host defence peptides and their action on microorganisms.",
    },
  },
  {
    id: "hair-follicle",
    label: { es: "Folículo piloso", en: "Hair follicle" },
    hint: {
      es: "Células de la papila dérmica y crecimiento del folículo en estudios ex vivo.",
      en: "Dermal papilla cells and follicle growth in ex vivo studies.",
    },
  },
  {
    id: "dermal-structure",
    label: { es: "Estructura de la piel", en: "Skin structure" },
    hint: {
      es: "Firmeza, elasticidad y densidad de la piel en estudios tópicos.",
      en: "Skin firmness, elasticity and density in topical studies.",
    },
  },
];

export const RESEARCH_FUNCTION_IDS: readonly ResearchFunctionId[] = RESEARCH_FUNCTIONS.map(
  (f) => f.id,
);

export function getResearchFunction(id: string): ResearchFunction | undefined {
  return RESEARCH_FUNCTIONS.find((f) => f.id === id);
}
