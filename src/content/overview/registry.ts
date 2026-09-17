import { BATCH_1_FLAGSHIP_PROFILES as BATCH_1 } from "@/content/review";

import type { ContentStatus } from "@/content/lifecycle";
import type { ProductOverview, SourcedStatement } from "./types";

/**
 * PRODUCT OVERVIEWS — keyed by slug.
 *
 * Every statement in `researchContext`, `areasOfInvestigation` and
 * `mechanismNotes` needs reference ids that exist in `content/references` and
 * are approved there. Statements say what a source reports, in the source's
 * own terms: the mechanism it describes, the model it used (cell, animal,
 * human trial), the figure it published, and the adverse events and evidence
 * limits it states. They never say what a compound will do for a reader.
 *
 * Nothing here renders until its batch is approved in `content/review.ts`.
 */

const sci = (
  id: string,
  es: string,
  en: string,
  references: readonly string[],
  status: ContentStatus,
): SourcedStatement => ({
  id,
  text: { es, en },
  references,
  provenance: { class: "scientific-source", status },
});

const REF = {
  coskun: "ref-2022-coskun-ly3437943",
  jastreboff: "ref-2023-jastreboff-retatrutide-obesity",
  rosenstock: "ref-2023-rosenstock-retatrutide-t2d",
  pickart2015: "ref-2015-pickart-ghk-skin",
  pickart2018: "ref-2018-pickart-ghk-cu-gene-data",
  vasireddi: "ref-2025-vasireddi-bpc157-review",
  goldstein: "ref-2012-goldstein-thymosin-b4",
  malinda: "ref-1999-malinda-thymosin-b4-wound",
  bicer: "ref-2026-bicer-bpc157-tb500-achilles",
  tewari: "ref-2026-tewari-peptide-supplements",
} as const;

/* A limit that applies to BPC-157, TB-500 and GHK-Cu alike. */
const tewariLimit = (id: string) =>
  sci(
    id,
    "Una revisión de alcance de 2026 sobre péptidos en medicina deportiva (incluidos BPC-157, TB-500 y GHK-Cu) encontró que el 67 % de las publicaciones usó modelos animales, que los estudios en humanos son pocos y en su mayoría sin controles robustos, y que los beneficios musculoesqueléticos que se les atribuyen no están respaldados por los ensayos en humanos actuales.",
    "A 2026 scoping review of peptides in sports medicine (including BPC-157, TB-500 and GHK-Cu) found that 67% of publications used animal models, that human studies are few and mostly lack robust controls, and that the musculoskeletal benefits claimed for them remain unsubstantiated by current human trials.",
    [REF.tewari],
    BATCH_1,
  );

export const OVERVIEWS: Readonly<Record<string, ProductOverview>> = {
  /* ---- RETA — retatrutide ------------------------------------------------- */
  reta: {
    slug: "reta",
    summary: null,
    mechanismNotes: [
      sci(
        "reta-mechanism-receptors",
        "Retatrutide (LY3437943) es un péptido agonista de tres receptores: el de glucagón, el del polipéptido insulinotrópico dependiente de glucosa (GIP) y el del péptido similar al glucagón tipo 1 (GLP-1). In vitro, su actividad es equilibrada en los receptores de glucagón y GLP-1, y mayor en el de GIP.",
        "Retatrutide (LY3437943) is a single peptide with agonist activity at three receptors: glucagon, glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1). In vitro, its activity is balanced at the glucagon and GLP-1 receptors and greater at the GIP receptor.",
        [REF.coskun],
        BATCH_1,
      ),
      sci(
        "reta-mechanism-energy",
        "En ratones con obesidad, la reducción de peso corporal combinó dos vías que describen los autores: menor ingesta calórica, atribuida a los receptores GIP y GLP-1, y mayor gasto energético, atribuido al receptor de glucagón.",
        "In obese mice, body-weight reduction combined two routes the authors describe: lower calorie intake driven by the GIP and GLP-1 receptors, and higher energy expenditure driven by the glucagon receptor.",
        [REF.coskun],
        BATCH_1,
      ),
    ],
    researchContext: [
      sci(
        "reta-research-obesity-phase2",
        "Ensayo de fase 2 en 338 adultos con obesidad, o con sobrepeso y al menos una condición relacionada con el peso: a 48 semanas, el cambio medio de peso corporal fue de −8.7 % a −24.2 % según el grupo asignado, frente a −2.1 % con placebo.",
        "Phase 2 trial in 338 adults with obesity, or overweight plus at least one weight-related condition: at 48 weeks, mean body-weight change ranged from −8.7% to −24.2% across the assigned groups, versus −2.1% with placebo.",
        [REF.jastreboff],
        BATCH_1,
      ),
      sci(
        "reta-research-t2d-phase2",
        "Ensayo de fase 2 en 281 adultos con diabetes tipo 2: a 24 semanas la HbA1c bajó hasta 2.02 puntos porcentuales, frente a 0.01 con placebo, y a 36 semanas el peso corporal bajó hasta 16.94 %.",
        "Phase 2 trial in 281 adults with type 2 diabetes: at 24 weeks HbA1c fell by up to 2.02 percentage points, versus 0.01 with placebo, and at 36 weeks body weight fell by up to 16.94%.",
        [REF.rosenstock],
        BATCH_1,
      ),
      sci(
        "reta-research-adverse-events",
        "Eventos adversos reportados: principalmente gastrointestinales (náusea, diarrea, vómito, estreñimiento) y en su mayoría leves a moderados. El ensayo de obesidad también registró un aumento del ritmo cardiaco que alcanzó su máximo a las 24 semanas y después disminuyó.",
        "Reported adverse events were mainly gastrointestinal (nausea, diarrhoea, vomiting, constipation) and mostly mild to moderate. The obesity trial also recorded increases in heart rate that peaked at 24 weeks and declined thereafter.",
        [REF.jastreboff, REF.rosenstock],
        BATCH_1,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.coskun, REF.jastreboff, REF.rosenstock],
    technicalNotes: [],
    functions: [
      { id: "incretin-glucagon-receptors", statement: "reta-mechanism-receptors" },
      { id: "energy-balance", statement: "reta-mechanism-energy" },
      { id: "glycemic-control", statement: "reta-research-t2d-phase2" },
    ],
  },

  /* ---- GHK-Cu ------------------------------------------------------------- */
  "ghk-cu": {
    slug: "ghk-cu",
    summary: null,
    mechanismNotes: [
      sci(
        "ghk-cu-mechanism-identity",
        "GHK (glicil-L-histidil-L-lisina) es un tripéptido presente en plasma, saliva y orina humanos, cuya concentración disminuye con la edad. Se propone que actúa como complejo con cobre (Cu²⁺).",
        "GHK (glycyl-L-histidyl-L-lysine) is a tripeptide present in human plasma, saliva and urine, and its level declines with age. It is proposed to act as a complex with copper (Cu²⁺).",
        [REF.pickart2015],
        BATCH_1,
      ),
      sci(
        "ghk-cu-mechanism-matrix",
        "Estimula tanto la síntesis como la degradación de colágeno y glucosaminoglucanos, modula la actividad de las metaloproteinasas y de sus inhibidores, y atrae células inmunes y endoteliales al sitio de una lesión.",
        "It stimulates both the synthesis and the breakdown of collagen and glycosaminoglycans, modulates the activity of metalloproteinases and their inhibitors, and attracts immune and endothelial cells to the site of an injury.",
        [REF.pickart2015],
        BATCH_1,
      ),
      sci(
        "ghk-cu-mechanism-genes",
        "Según datos de expresión génica, GHK puede aumentar o disminuir la expresión de al menos 4,000 genes humanos; los autores lo proponen como explicación de la variedad de vías en las que participa.",
        "Gene-expression data indicate GHK can up- or down-regulate at least 4,000 human genes; the authors propose this as the explanation for the range of pathways it takes part in.",
        [REF.pickart2015, REF.pickart2018],
        BATCH_1,
      ),
    ],
    researchContext: [
      sci(
        "ghk-cu-research-tissue",
        "Se ha estudiado en reparación de piel, tejido conectivo pulmonar, hueso, hígado y mucosa gástrica, con cicatrización sistémica descrita en ratas, ratones y cerdos.",
        "It has been studied in the repair of skin, lung connective tissue, bone, liver and stomach lining, with systemic wound healing described in rats, mice and pigs.",
        [REF.pickart2018, REF.pickart2015],
        BATCH_1,
      ),
      sci(
        "ghk-cu-research-topical",
        "En productos cosméticos tópicos se ha estudiado en firmeza, elasticidad y densidad de la piel, líneas finas, fotodaño e hiperpigmentación.",
        "In topical cosmetic products it has been studied for skin firmness, elasticity and density, fine lines, photodamage and hyperpigmentation.",
        [REF.pickart2015],
        BATCH_1,
      ),
      tewariLimit("ghk-cu-research-evidence-limit"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.pickart2015, REF.pickart2018, REF.tewari],
    technicalNotes: [],
    functions: [
      { id: "extracellular-matrix", statement: "ghk-cu-mechanism-matrix" },
      { id: "cell-migration-angiogenesis", statement: "ghk-cu-mechanism-matrix" },
      { id: "wound-healing", statement: "ghk-cu-research-tissue" },
      { id: "gene-expression", statement: "ghk-cu-mechanism-genes" },
      { id: "dermal-structure", statement: "ghk-cu-research-topical" },
    ],
  },

  /* ---- BPC-157 ------------------------------------------------------------ */
  bpc157: {
    slug: "bpc157",
    summary: null,
    mechanismNotes: [
      sci(
        "bpc157-mechanism-pathways",
        "BPC-157 (compuesto de protección corporal 157) se describe como un péptido gástrico que favorece la integridad de la mucosa. Los estudios revisados sugieren que aumenta la expresión del receptor de hormona de crecimiento y de vías de crecimiento celular y angiogénesis, y que reduce citocinas inflamatorias.",
        "BPC-157 (body protection compound-157) is described as a gastric peptide that promotes mucosal integrity. The studies reviewed suggest it increases growth hormone receptor expression and pathways of cell growth and angiogenesis, and reduces inflammatory cytokines.",
        [REF.vasireddi],
        BATCH_1,
      ),
      sci(
        "bpc157-mechanism-metabolism",
        "Se metaboliza en el hígado, con una vida media menor a 30 minutos, y se elimina por los riñones.",
        "It is metabolised in the liver, with a half-life of less than 30 minutes, and cleared by the kidneys.",
        [REF.vasireddi],
        BATCH_1,
      ),
    ],
    researchContext: [
      sci(
        "bpc157-research-systematic-review",
        "Revisión sistemática de 2025: de 36 estudios incluidos, 35 fueron preclínicos y uno clínico. En modelos preclínicos mejoró resultados funcionales, estructurales y biomecánicos en lesiones de músculo, tendón, ligamento y hueso.",
        "2025 systematic review: of 36 included studies, 35 were preclinical and one clinical. In preclinical models it improved functional, structural and biomechanical outcomes in muscle, tendon, ligament and bone injuries.",
        [REF.vasireddi],
        BATCH_1,
      ),
      sci(
        "bpc157-research-safety-status",
        "Los estudios preclínicos de seguridad no mostraron efectos adversos en varios sistemas de órganos; la revisión no encontró datos de seguridad clínica. No cuenta con aprobación de la FDA de Estados Unidos y su uso está prohibido en el deporte profesional.",
        "Preclinical safety studies showed no adverse effects across several organ systems; the review found no clinical safety data. It lacks approval from the US FDA and its use is banned in professional sports.",
        [REF.vasireddi],
        BATCH_1,
      ),
      sci(
        "bpc157-research-achilles",
        "En un estudio exploratorio en ratas con reparación del tendón de Aquiles, BPC-157 se asoció con mejores parámetros histopatológicos y de organización de la matriz extracelular, aunque sin significancia estadística en la puntuación histopatológica total.",
        "In an exploratory rat study of Achilles tendon repair, BPC-157 was associated with improved histopathological parameters and extracellular-matrix organisation, without reaching statistical significance on the total histopathology score.",
        [REF.bicer],
        BATCH_1,
      ),
      tewariLimit("bpc157-research-evidence-limit"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.vasireddi, REF.bicer, REF.tewari],
    technicalNotes: [],
    functions: [
      { id: "cell-migration-angiogenesis", statement: "bpc157-mechanism-pathways" },
      { id: "musculoskeletal-repair", statement: "bpc157-research-systematic-review" },
      { id: "extracellular-matrix", statement: "bpc157-research-achilles" },
    ],
  },

  /* ---- TB-500 ------------------------------------------------------------- */
  tb500: {
    slug: "tb500",
    summary: null,
    mechanismNotes: [
      sci(
        "tb500-mechanism-identity",
        "TB-500 se describe en la literatura como una forma sintética de la timosina β4 (Tβ4), un péptido natural de bajo peso molecular.",
        "TB-500 is described in the literature as a synthetic form of thymosin β4 (Tβ4), a naturally occurring low-molecular-weight peptide.",
        [REF.bicer, REF.goldstein],
        BATCH_1,
      ),
      sci(
        "tb500-mechanism-actin",
        "Tras una lesión, la Tβ4 es liberada por plaquetas, macrófagos y otras células. Se une a la actina y promueve la migración celular, incluida la de células madre y progenitoras que forman nuevos vasos sanguíneos, y reduce el número de miofibroblastos en heridas, lo que se asocia con menos cicatriz y fibrosis.",
        "After injury, Tβ4 is released by platelets, macrophages and other cells. It binds actin and promotes cell migration, including of the stem and progenitor cells that form new blood vessels, and decreases myofibroblasts in wounds, which is associated with less scarring and fibrosis.",
        [REF.goldstein],
        BATCH_1,
      ),
    ],
    researchContext: [
      sci(
        "tb500-research-wound-model",
        "En un modelo de herida de espesor total en rata, la Tβ4 aumentó la reepitelización 42 % sobre el control a los 4 días y hasta 61 % a los 7 días, con mayor depósito de colágeno y angiogénesis.",
        "In a rat full-thickness wound model, Tβ4 increased re-epithelialisation by 42% over controls at 4 days and by up to 61% at 7 days, with increased collagen deposition and angiogenesis.",
        [REF.malinda],
        BATCH_1,
      ),
      sci(
        "tb500-research-achilles",
        "En un estudio exploratorio en ratas con reparación del tendón de Aquiles, TB-500 se asoció con mejor arquitectura del tendón y organización del colágeno, y mostró una ventaja biomecánica significativa a las cuatro semanas.",
        "In an exploratory rat study of Achilles tendon repair, TB-500 was associated with improved tendon architecture and collagen organisation, and showed a significant biomechanical advantage at four weeks.",
        [REF.bicer],
        BATCH_1,
      ),
      sci(
        "tb500-research-tissues",
        "Una revisión de 2012 describe su investigación en piel, ojo, corazón y sistema nervioso central, con ensayos clínicos en curso o proyectados en heridas dérmicas, lesiones de córnea y reparación de tejido tras isquemia.",
        "A 2012 review describes research in skin, eye, heart and central nervous system, with ongoing or projected clinical trials in dermal wounds, corneal injuries and tissue repair after ischaemia.",
        [REF.goldstein],
        BATCH_1,
      ),
      tewariLimit("tb500-research-evidence-limit"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.goldstein, REF.malinda, REF.bicer, REF.tewari],
    technicalNotes: [],
    functions: [
      { id: "cell-migration-angiogenesis", statement: "tb500-mechanism-actin" },
      { id: "wound-healing", statement: "tb500-research-wound-model" },
      { id: "musculoskeletal-repair", statement: "tb500-research-achilles" },
      { id: "extracellular-matrix", statement: "tb500-research-achilles" },
    ],
  },

  /* ---- GLOW — GHK-Cu + TB-500 + BPC-157 ----------------------------------- */
  glow: {
    slug: "glow",
    summary: null,
    mechanismNotes: [
      sci(
        "glow-mechanism-components",
        "GLOW reúne tres compuestos con líneas de investigación propias: GHK-Cu, estudiado en síntesis de colágeno y reparación de la piel; BPC-157, estudiado en modelos preclínicos de lesión musculoesquelética; y TB-500, descrito como forma sintética de la timosina β4, que se une a la actina y promueve la migración celular.",
        "GLOW brings together three compounds with separate lines of research: GHK-Cu, studied in collagen synthesis and skin repair; BPC-157, studied in preclinical models of musculoskeletal injury; and TB-500, described as a synthetic form of thymosin β4, which binds actin and promotes cell migration.",
        [REF.pickart2015, REF.vasireddi, REF.bicer, REF.goldstein],
        BATCH_1,
      ),
    ],
    researchContext: [
      sci(
        "glow-research-combination",
        "Un estudio exploratorio en ratas con reparación del tendón de Aquiles combinó BPC-157 y TB-500: la combinación no aportó beneficios adicionales frente a cada compuesto por separado. El estudio no incluyó GHK-Cu.",
        "An exploratory rat study of Achilles tendon repair combined BPC-157 and TB-500: the combination conferred no additional benefit over either compound alone. The study did not include GHK-Cu.",
        [REF.bicer],
        BATCH_1,
      ),
      tewariLimit("glow-research-evidence-limit"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.pickart2015, REF.vasireddi, REF.goldstein, REF.bicer, REF.tewari],
    technicalNotes: [],
    functions: [
      { id: "extracellular-matrix", statement: "glow-mechanism-components" },
      { id: "cell-migration-angiogenesis", statement: "glow-mechanism-components" },
      { id: "musculoskeletal-repair", statement: "glow-research-combination" },
    ],
  },
};
