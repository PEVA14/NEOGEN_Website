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
  | "energy-balance"
  | "glycemic-control"
  | "extracellular-matrix"
  | "cell-migration-angiogenesis"
  | "wound-healing"
  | "musculoskeletal-repair"
  | "gene-expression"
  | "dermal-structure";

export interface ResearchFunction {
  id: ResearchFunctionId;
  label: LocalizedText;
  hint: LocalizedText;
}

export const RESEARCH_FUNCTIONS: readonly ResearchFunction[] = [
  {
    id: "incretin-glucagon-receptors",
    label: { es: "Receptores GLP-1, GIP y glucagón", en: "GLP-1, GIP and glucagon receptors" },
    hint: {
      es: "Agonismo de receptores de incretinas y de glucagón.",
      en: "Agonism at incretin and glucagon receptors.",
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
