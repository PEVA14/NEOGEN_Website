import {
  BATCH_1_FLAGSHIP_PROFILES as BATCH_1,
  BATCH_2_INCRETIN_PROFILES as BATCH_2,
  BATCH_3_METABOLIC_PROFILES as BATCH_3,
} from "@/content/review";

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
  coskun2018: "ref-2018-coskun-ly3298176",
  surpass2: "ref-2021-frias-surpass-2",
  surmount1: "ref-2022-jastreboff-surmount-1",
  lau: "ref-2015-lau-semaglutide-discovery",
  step1: "ref-2021-wilding-step-1",
  cagrilintide: "ref-2021-lau-cagrilintide-phase2",
  zimmermann: "ref-2022-zimmermann-bi456906",
  sanyalMash: "ref-2024-sanyal-survodutide-mash",
  glory2: "ref-2026-gao-mazdutide-glory-2",
  mazdutideT2d: "ref-2026-zhu-mazdutide-t2d",
  falutz: "ref-2007-falutz-tesamorelin",
  cox: "ref-2015-cox-aod9604",
  ngZucker: "ref-2000-ng-aod9604-zucker",
  heffernan: "ref-2001-heffernan-aod9604-mice",
  neelakantan: "ref-2018-neelakantan-nnmt-inhibitors",
  roberti: "ref-2021-roberti-nnmt",
  billon: "ref-2023-billon-slu-pp-332",
  kolonin: "ref-2004-kolonin-adipose-ablation",
  barnhart: "ref-2011-barnhart-adipotide-monkeys",
  longo: "ref-2016-longo-carnitine-transport",
  carnitineMeta: "ref-2016-pooyandjoo-carnitine-meta",
} as const;

/** A technical note: what the citations on a page actually studied. */
const note = (id: string, es: string, en: string, status: ContentStatus) => ({
  id,
  text: { es, en },
  provenance: {
    class: "derived-copy" as const,
    status,
    derivedFrom: ["scientific-source" as const],
  },
});

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

  /* ---- Tirzepatide -------------------------------------------------------- */
  tirzepatide: {
    slug: "tirzepatide",
    summary: null,
    mechanismNotes: [
      sci(
        "tirzepatide-mechanism-receptors",
        "La tirzepatida (LY3298176) es un péptido modificado con un ácido graso, con actividad agonista dual en los receptores del polipéptido insulinotrópico dependiente de glucosa (GIP) y del péptido similar al glucagón tipo 1 (GLP-1). In vitro activó la señalización de ambos receptores.",
        "Tirzepatide (LY3298176) is a fatty-acid-modified peptide with dual agonist activity at the glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptors. In vitro it activated signalling at both receptors.",
        [REF.coskun2018],
        BATCH_2,
      ),
      sci(
        "tirzepatide-mechanism-mice",
        "En ratones produjo secreción de insulina dependiente de glucosa y mejor tolerancia a la glucosa actuando sobre ambos receptores; de forma prolongada redujo el peso corporal y la ingesta de alimento, con un efecto mayor que el de un agonista sólo de GLP-1.",
        "In mice it produced glucose-dependent insulin secretion and improved glucose tolerance by acting at both receptors; over time it reduced body weight and food intake, with a greater effect than a GLP-1 receptor agonist alone.",
        [REF.coskun2018],
        BATCH_2,
      ),
    ],
    researchContext: [
      sci(
        "tirzepatide-research-surmount-1",
        "Ensayo de fase 3 (SURMOUNT-1) en 2,539 adultos con obesidad, o con IMC de 27 o más y al menos una complicación relacionada con el peso, sin diabetes: a 72 semanas el cambio medio de peso fue de −15.0 %, −19.5 % y −20.9 % según el grupo asignado, frente a −3.1 % con placebo.",
        "Phase 3 trial (SURMOUNT-1) in 2,539 adults with obesity, or a BMI of 27 or more plus at least one weight-related complication, without diabetes: at 72 weeks the mean weight change was −15.0%, −19.5% and −20.9% across the assigned groups, versus −3.1% with placebo.",
        [REF.surmount1],
        BATCH_2,
      ),
      sci(
        "tirzepatide-research-surpass-2",
        "Ensayo de fase 3 abierto (SURPASS-2) en 1,879 personas con diabetes tipo 2, con semaglutida como comparador activo: a 40 semanas la HbA1c bajó entre 2.01 y 2.30 puntos porcentuales según el grupo, frente a 1.86 con semaglutida, y la reducción de peso fue mayor (diferencia estimada de 1.9 a 5.5 kg).",
        "Open-label phase 3 trial (SURPASS-2) in 1,879 people with type 2 diabetes, with semaglutide as the active comparator: at 40 weeks HbA1c fell by 2.01 to 2.30 percentage points across groups, versus 1.86 with semaglutide, and weight reduction was greater (estimated difference 1.9 to 5.5 kg).",
        [REF.surpass2],
        BATCH_2,
      ),
      sci(
        "tirzepatide-research-adverse-events",
        "Eventos adversos reportados: principalmente gastrointestinales y en su mayoría leves a moderados, concentrados en el periodo inicial de los ensayos. En SURPASS-2 se reportó náusea en 17–22 %, diarrea en 13–16 % y vómito en 6–10 %, con eventos adversos graves en 5–7 %.",
        "Reported adverse events were mainly gastrointestinal and mostly mild to moderate, concentrated in the early part of the trials. SURPASS-2 reported nausea in 17–22%, diarrhoea in 13–16% and vomiting in 6–10%, with serious adverse events in 5–7%.",
        [REF.surpass2, REF.surmount1],
        BATCH_2,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.coskun2018, REF.surmount1, REF.surpass2],
    technicalNotes: [],
    functions: [
      { id: "incretin-glucagon-receptors", statement: "tirzepatide-mechanism-receptors" },
      { id: "energy-balance", statement: "tirzepatide-mechanism-mice" },
      { id: "glycemic-control", statement: "tirzepatide-research-surpass-2" },
    ],
  },

  /* ---- Semaglutide -------------------------------------------------------- */
  semaglutide: {
    slug: "semaglutide",
    summary: null,
    mechanismNotes: [
      sci(
        "semaglutide-mechanism-molecule",
        "La semaglutida es un análogo del GLP-1 con dos sustituciones de aminoácidos respecto al GLP-1 humano (Aib8, Arg34) y derivatizado en la lisina 26. La modificación con ácido graso aumenta su afinidad por la albúmina; su afinidad por el receptor de GLP-1 es de 0.38 nM, tres veces menor que la de liraglutida.",
        "Semaglutide is a GLP-1 analogue with two amino-acid substitutions relative to human GLP-1 (Aib8, Arg34), derivatised at lysine 26. The fatty-acid modification raises its albumin affinity; its GLP-1 receptor affinity is 0.38 nM, three-fold lower than liraglutide's.",
        [REF.lau],
        BATCH_2,
      ),
      sci(
        "semaglutide-mechanism-pk",
        "En minicerdos la vida media en plasma fue de 46.1 horas y el tiempo medio de residencia de 63.6 horas.",
        "In mini-pigs the plasma half-life was 46.1 hours, with a mean residence time of 63.6 hours.",
        [REF.lau],
        BATCH_2,
      ),
    ],
    researchContext: [
      sci(
        "semaglutide-research-step-1",
        "Ensayo de fase 3 (STEP 1) en 1,961 adultos con sobrepeso u obesidad, sin diabetes: a 68 semanas el cambio medio de peso fue de −14.9 % frente a −2.4 % con placebo; 86.4 % alcanzó una reducción de 5 % o más y 50.5 % de 15 % o más.",
        "Phase 3 trial (STEP 1) in 1,961 adults with overweight or obesity, without diabetes: at 68 weeks the mean weight change was −14.9% versus −2.4% with placebo; 86.4% reached a reduction of 5% or more and 50.5% of 15% or more.",
        [REF.step1],
        BATCH_2,
      ),
      sci(
        "semaglutide-research-surpass-2",
        "Como comparador activo en diabetes tipo 2 (SURPASS-2, 1,879 personas), la HbA1c bajó 1.86 puntos porcentuales a 40 semanas.",
        "As the active comparator in type 2 diabetes (SURPASS-2, 1,879 people), HbA1c fell by 1.86 percentage points at 40 weeks.",
        [REF.surpass2],
        BATCH_2,
      ),
      sci(
        "semaglutide-research-adverse-events",
        "Eventos adversos reportados en STEP 1: náusea y diarrea fueron los más comunes, típicamente transitorios y de intensidad leve a moderada; 4.5 % suspendió por eventos gastrointestinales, frente a 0.8 % con placebo.",
        "Adverse events reported in STEP 1: nausea and diarrhoea were the most common, typically transient and mild to moderate; 4.5% discontinued because of gastrointestinal events, versus 0.8% with placebo.",
        [REF.step1],
        BATCH_2,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.lau, REF.step1, REF.surpass2],
    technicalNotes: [],
    functions: [
      { id: "incretin-glucagon-receptors", statement: "semaglutide-mechanism-molecule" },
      { id: "energy-balance", statement: "semaglutide-research-step-1" },
      { id: "glycemic-control", statement: "semaglutide-research-surpass-2" },
    ],
  },

  /* ---- Cagrilintide ------------------------------------------------------- */
  cagrilintide: {
    slug: "cagrilintide",
    summary: null,
    mechanismNotes: [
      sci(
        "cagrilintide-mechanism-amylin",
        "La cagrilintida es un análogo de amilina de acción prolongada. La amilina natural es una hormona pancreática que induce saciedad.",
        "Cagrilintide is a long-acting amylin analogue. Natural amylin is a pancreatic hormone that induces satiety.",
        [REF.cagrilintide],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "cagrilintide-research-phase2",
        "Ensayo de fase 2 de búsqueda de intervalo en 906 adultos sin diabetes, con IMC de 30 o más —o de 27 o más con hipertensión o dislipidemia—, en diez países: a 26 semanas la reducción media de peso fue de 6.0 % a 10.8 % según el grupo, frente a 3.0 % con placebo; en el grupo más alto fue de 10.8 % frente a 9.0 % con liraglutida.",
        "Range-finding phase 2 trial in 906 adults without diabetes, with a BMI of 30 or more — or 27 or more with hypertension or dyslipidaemia — across ten countries: at 26 weeks mean weight reduction ranged from 6.0% to 10.8% across groups, versus 3.0% with placebo; in the highest group it was 10.8% versus 9.0% with liraglutide.",
        [REF.cagrilintide],
        BATCH_3,
      ),
      sci(
        "cagrilintide-research-adverse-events",
        "Eventos adversos reportados: gastrointestinales (náusea, estreñimiento, diarrea) y reacciones en el sitio de aplicación. Los eventos gastrointestinales fueron más frecuentes que con placebo (41–63 % frente a 32 %), principalmente náusea (20–47 % frente a 18 %). El 10 % suspendió el tratamiento, de forma similar entre grupos.",
        "Reported adverse events were gastrointestinal (nausea, constipation, diarrhoea) and application-site reactions. Gastrointestinal events were more common than with placebo (41–63% versus 32%), mainly nausea (20–47% versus 18%). Ten per cent discontinued treatment, similarly across groups.",
        [REF.cagrilintide],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.cagrilintide],
    technicalNotes: [],
    functions: [
      { id: "amylin-signalling", statement: "cagrilintide-mechanism-amylin" },
      { id: "energy-balance", statement: "cagrilintide-research-phase2" },
    ],
  },

  /* ---- Survodutide -------------------------------------------------------- */
  survodutide: {
    slug: "survodutide",
    summary: null,
    mechanismNotes: [
      sci(
        "survodutide-mechanism-dual",
        "La survodutida (BI 456906) es un péptido acilado con agonismo dual en el receptor de glucagón (GCGR) y el del GLP-1. Su diseño parte de la oxintomodulina, un péptido intestinal que activa ambos receptores.",
        "Survodutide (BI 456906) is an acylated peptide with dual agonism at the glucagon receptor (GCGR) and the GLP-1 receptor. Its design starts from oxyntomodulin, a gut peptide that activates both receptors.",
        [REF.zimmermann],
        BATCH_3,
      ),
      sci(
        "survodutide-mechanism-preclinical",
        "En ratones redujo el peso corporal más que un agonista de GLP-1 solo; los autores atribuyen la diferencia a un mayor gasto energético sumado a una menor ingesta de alimento, y verificaron la activación de ambos receptores con pruebas de tolerancia a la glucosa, ingesta y vaciamiento gástrico.",
        "In mice it reduced body weight more than a GLP-1 receptor agonist alone; the authors attribute the difference to increased energy expenditure alongside reduced food intake, and confirmed engagement of both receptors with glucose tolerance, food intake and gastric emptying tests.",
        [REF.zimmermann],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "survodutide-research-mash",
        "Ensayo de fase 2 de 48 semanas en 293 adultos con esteatohepatitis metabólica (MASH) confirmada por biopsia y fibrosis F1–F3: la mejoría histológica de MASH sin empeoramiento de la fibrosis ocurrió en 47 %, 62 % y 43 % de los grupos con survodutida, frente a 14 % con placebo; la grasa hepática bajó al menos 30 % en 63 % de los participantes.",
        "48-week phase 2 trial in 293 adults with biopsy-confirmed metabolic dysfunction-associated steatohepatitis (MASH) and F1–F3 fibrosis: histological improvement in MASH without worsening of fibrosis occurred in 47%, 62% and 43% of the survodutide groups, versus 14% with placebo; liver fat fell by at least 30% in 63% of participants.",
        [REF.sanyalMash],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.zimmermann, REF.sanyalMash],
    technicalNotes: [],
    functions: [
      { id: "incretin-glucagon-receptors", statement: "survodutide-mechanism-dual" },
      { id: "energy-balance", statement: "survodutide-mechanism-preclinical" },
      { id: "hepatic-fat", statement: "survodutide-research-mash" },
    ],
  },

  /* ---- Mazdutide ---------------------------------------------------------- */
  mazdutide: {
    slug: "mazdutide",
    summary: null,
    mechanismNotes: [
      sci(
        "mazdutide-mechanism-dual",
        "La mazdutida es un agonista dual del receptor de glucagón (GCGR) y del receptor de GLP-1.",
        "Mazdutide is a dual agonist of the glucagon receptor (GCGR) and the GLP-1 receptor.",
        [REF.mazdutideT2d],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "mazdutide-research-glory-2",
        "Ensayo aleatorizado (GLORY-2) en 461 adultos chinos con obesidad moderada a grave: a 60 semanas el cambio medio de peso fue de −16.65 % frente a −1.50 % con placebo, y 84.3 % alcanzó una reducción de 5 % o más, frente a 33.1 %.",
        "Randomised trial (GLORY-2) in 461 Chinese adults with moderate to severe obesity: at 60 weeks the mean weight change was −16.65% versus −1.50% with placebo, and 84.3% reached a reduction of 5% or more, versus 33.1%.",
        [REF.glory2],
        BATCH_3,
      ),
      sci(
        "mazdutide-research-t2d",
        "Ensayo de fase 3 en 320 adultos chinos con diabetes tipo 2 no controlada con dieta y ejercicio: a 24 semanas la HbA1c bajó 1.57 y 2.15 puntos porcentuales según el grupo, frente a 0.14 con placebo, y el peso bajó 5.61 % y 7.81 %, frente a 1.26 %.",
        "Phase 3 trial in 320 Chinese adults with type 2 diabetes inadequately controlled by diet and exercise: at 24 weeks HbA1c fell by 1.57 and 2.15 percentage points across groups, versus 0.14 with placebo, and weight fell by 5.61% and 7.81%, versus 1.26%.",
        [REF.mazdutideT2d],
        BATCH_3,
      ),
      sci(
        "mazdutide-research-adverse-events",
        "Eventos adversos en GLORY-2: vómito (53.1 % frente a 1.3 % con placebo), náusea (46.9 % frente a 3.2 %) y diarrea (39.4 % frente a 6.5 %), en su mayoría leves a moderados; 2.9 % suspendió el tratamiento por eventos adversos, frente a 0 % con placebo.",
        "Adverse events in GLORY-2: vomiting (53.1% versus 1.3% with placebo), nausea (46.9% versus 3.2%) and diarrhoea (39.4% versus 6.5%), mostly mild to moderate; 2.9% discontinued because of adverse events, versus 0% with placebo.",
        [REF.glory2],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.glory2, REF.mazdutideT2d],
    technicalNotes: [],
    functions: [
      { id: "incretin-glucagon-receptors", statement: "mazdutide-mechanism-dual" },
      { id: "energy-balance", statement: "mazdutide-research-glory-2" },
      { id: "glycemic-control", statement: "mazdutide-research-t2d" },
    ],
  },

  /* ---- Tesamorelin -------------------------------------------------------- */
  tesamorelin: {
    slug: "tesamorelin",
    summary: null,
    mechanismNotes: [
      sci(
        "tesamorelin-mechanism-ghrh",
        "La tesamorelina es un análogo del factor liberador de hormona de crecimiento (GHRH). En el ensayo citado el IGF-I aumentó 81 % respecto al inicio, el marcador que refleja la activación de ese eje.",
        "Tesamorelin is a growth hormone-releasing factor (GHRH) analogue. In the trial cited, IGF-I rose 81% from baseline, the marker that reflects activation of that axis.",
        [REF.falutz],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "tesamorelin-research-visceral",
        "Ensayo aleatorizado en 412 personas con VIH y acumulación de grasa abdominal: a 26 semanas el tejido adiposo visceral medido por tomografía bajó 15.2 % con tesamorelina y subió 5.0 % con placebo; los triglicéridos bajaron 50 mg/dL y subieron 9 mg/dL, respectivamente.",
        "Randomised trial in 412 people with HIV and abdominal fat accumulation: at 26 weeks visceral adipose tissue measured by computed tomography fell 15.2% with tesamorelin and rose 5.0% with placebo; triglycerides fell by 50 mg/dL and rose by 9 mg/dL respectively.",
        [REF.falutz],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.falutz],
    technicalNotes: [
      note(
        "tesamorelin-note-population",
        "La literatura citada estudia una población específica: personas con VIH y lipodistrofia en tratamiento antirretroviral.",
        "The literature cited studies one specific population: people with HIV and lipodystrophy on antiretroviral therapy.",
        BATCH_3,
      ),
    ],
    functions: [
      { id: "growth-hormone-axis", statement: "tesamorelin-mechanism-ghrh" },
      { id: "visceral-adipose-tissue", statement: "tesamorelin-research-visceral" },
    ],
  },

  /* ---- AOD9604 ------------------------------------------------------------ */
  aod9604: {
    slug: "aod9604",
    summary: null,
    mechanismNotes: [
      sci(
        "aod9604-mechanism-identity",
        "AOD9604 es un péptido formado por el fragmento C-terminal de la hormona de crecimiento humana (aminoácidos 177–191) con una tirosina añadida en el extremo N. Se describe como un imitador de las propiedades lipolíticas de la hormona de crecimiento; la Agencia Mundial Antidopaje lo tiene prohibido.",
        "AOD9604 is a peptide made of the C-terminal fragment of human growth hormone (amino acids 177–191) with a tyrosine added at the N-terminus. It is described as mimicking growth hormone's lipolytic properties; the World Anti-Doping Agency bans it.",
        [REF.cox],
        BATCH_3,
      ),
      sci(
        "aod9604-mechanism-beta3",
        "En ratones obesos, tanto la hormona de crecimiento humana como AOD9604 redujeron peso y grasa corporal en 14 días, con un aumento de la expresión de ARN del receptor β3-adrenérgico —el principal receptor lipolítico del adipocito— hasta niveles comparables a los de ratones delgados. En ratones sin ese receptor el efecto sobre el peso no se produjo.",
        "In obese mice, both human growth hormone and AOD9604 reduced body weight and fat over 14 days, with β3-adrenergic receptor RNA expression — the adipocyte's main lipolytic receptor — rising to levels comparable to lean mice. In mice lacking that receptor the weight effect did not occur.",
        [REF.heffernan],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "aod9604-research-zucker",
        "En ratas Zucker obesas, un tratamiento oral durante 19 días redujo en más de 50 % el aumento de peso corporal frente al control (15.8 g contra 35.6 g), con mayor actividad lipolítica en el tejido adiposo y, a diferencia de la hormona de crecimiento completa, sin efecto adverso sobre la sensibilidad a la insulina medida con pinza euglucémica.",
        "In obese Zucker rats, oral treatment over 19 days reduced body-weight gain by more than 50% versus control (15.8 g against 35.6 g), with increased lipolytic activity in adipose tissue and, unlike intact growth hormone, no adverse effect on insulin sensitivity measured by euglycaemic clamp.",
        [REF.ngZucker],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.cox, REF.ngZucker, REF.heffernan],
    technicalNotes: [
      note(
        "aod9604-note-models",
        "Toda la evidencia citada es preclínica: ratas Zucker obesas y ratones, incluidos ratones sin el receptor β3-adrenérgico.",
        "Every finding cited is preclinical: obese Zucker rats and mice, including mice lacking the β3-adrenergic receptor.",
        BATCH_3,
      ),
    ],
    functions: [
      { id: "lipolysis", statement: "aod9604-mechanism-beta3" },
      { id: "growth-hormone-axis", statement: "aod9604-mechanism-identity" },
    ],
  },

  /* ---- hGH fragment 176-191 ----------------------------------------------- */
  "hgh-fragment-176-191": {
    slug: "hgh-fragment-176-191",
    summary: null,
    mechanismNotes: [
      sci(
        "hgh-fragment-mechanism-domain",
        "El dominio lipolítico de la hormona de crecimiento humana está en su extremo C-terminal. El análogo sintético estudiado en la literatura, AOD9604, consiste en los aminoácidos 177–191 con una tirosina añadida en el extremo N.",
        "The lipolytic domain of human growth hormone sits at its C-terminus. The synthetic analogue studied in the literature, AOD9604, consists of amino acids 177–191 with a tyrosine added at the N-terminus.",
        [REF.cox],
        BATCH_3,
      ),
      sci(
        "hgh-fragment-mechanism-lipolysis",
        "En modelos animales, ese dominio sintético redujo el aumento de peso y aumentó la actividad lipolítica del tejido adiposo, con un efecto que depende del receptor β3-adrenérgico del adipocito.",
        "In animal models, that synthetic domain reduced weight gain and increased adipose tissue lipolytic activity, with an effect that depends on the adipocyte's β3-adrenergic receptor.",
        [REF.ngZucker, REF.heffernan],
        BATCH_3,
      ),
    ],
    researchContext: [],
    areasOfInvestigation: [],
    keyReferences: [REF.cox, REF.ngZucker, REF.heffernan],
    technicalNotes: [
      note(
        "hgh-fragment-note-analogue",
        "Las fuentes citadas estudian AOD9604, el análogo sintético de este dominio, no el fragmento 176–191 por separado.",
        "The sources cited study AOD9604, the synthetic analogue of this domain, rather than the 176–191 fragment on its own.",
        BATCH_3,
      ),
    ],
    functions: [{ id: "lipolysis", statement: "hgh-fragment-mechanism-lipolysis" }],
  },

  /* ---- 5-amino-1MQ -------------------------------------------------------- */
  "5-amino-1mq": {
    slug: "5-amino-1mq",
    summary: null,
    mechanismNotes: [
      sci(
        "5-amino-1mq-mechanism-nnmt",
        "5-amino-1MQ es un inhibidor de la nicotinamida N-metiltransferasa (NNMT), una enzima citosólica que metila la nicotinamida y que se sitúa entre el metabolismo celular y la regulación epigenética.",
        "5-amino-1MQ is an inhibitor of nicotinamide N-methyltransferase (NNMT), a cytosolic enzyme that methylates nicotinamide and sits between cellular metabolism and epigenetic regulation.",
        [REF.neelakantan, REF.roberti],
        BATCH_3,
      ),
      sci(
        "5-amino-1mq-mechanism-selectivity",
        "Los análogos de metilquinolinio con una amina primaria mostraron alta permeabilidad de membrana y selectividad: no inhibieron otras metiltransferasas dependientes de SAM ni las enzimas de la vía de recuperación del NAD+. En adipocitos cultivados redujeron el 1-metilnicotinamida intracelular, el producto de la reacción de NNMT.",
        "Methylquinolinium analogues with a primary amine showed high membrane permeability and selectivity: they did not inhibit other SAM-dependent methyltransferases or the enzymes of the NAD+ salvage pathway. In cultured adipocytes they reduced intracellular 1-methylnicotinamide, the product of the NNMT reaction.",
        [REF.neelakantan],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "5-amino-1mq-research-mice",
        "En ratones con obesidad inducida por una dieta alta en grasa, un inhibidor potente de NNMT revirtió medidas de obesidad y lípidos plasmáticos; es el estudio que propuso NNMT como diana contra la obesidad.",
        "In mice with high-fat-diet-induced obesity, a potent NNMT inhibitor reversed obesity measures and plasma lipids; this is the study that proposed NNMT as an anti-obesity target.",
        [REF.neelakantan],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.neelakantan, REF.roberti],
    technicalNotes: [
      note(
        "5-amino-1mq-note-models",
        "La evidencia citada es de adipocitos cultivados y ratones; no se cita ningún ensayo en humanos.",
        "The evidence cited is from cultured adipocytes and mice; no human trial is cited.",
        BATCH_3,
      ),
    ],
    functions: [
      { id: "nnmt-nad-metabolism", statement: "5-amino-1mq-mechanism-nnmt" },
      { id: "energy-balance", statement: "5-amino-1mq-research-mice" },
    ],
  },

  /* ---- SLU-PP-332 --------------------------------------------------------- */
  "slu-pp-332": {
    slug: "slu-pp-332",
    summary: null,
    mechanismNotes: [
      sci(
        "slu-pp-332-mechanism-err",
        "SLU-PP-332 es un agonista sintético de los tres receptores relacionados con el receptor de estrógeno (ERRα, β y γ), con la mayor potencia en ERRα. Estos receptores nucleares huérfanos participan en la capacidad de ejercicio del músculo esquelético.",
        "SLU-PP-332 is a synthetic agonist of all three estrogen-related receptors (ERRα, β and γ), with the highest potency at ERRα. These orphan nuclear receptors take part in skeletal muscle exercise capacity.",
        [REF.billon],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "slu-pp-332-research-muscle",
        "En una línea celular de músculo esquelético aumentó la función mitocondrial y la respiración celular. En ratones aumentó las fibras oxidativas de tipo IIa y la resistencia al ejercicio, e indujo un programa genético de ejercicio aeróbico dependiente de ERRα; sin ERRα el efecto sobre la resistencia no se produjo.",
        "In a skeletal muscle cell line it increased mitochondrial function and cellular respiration. In mice it increased type IIa oxidative fibres and exercise endurance, and induced an ERRα-dependent acute aerobic exercise gene programme; without ERRα the endurance effect did not occur.",
        [REF.billon],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.billon],
    technicalNotes: [
      note(
        "slu-pp-332-note-models",
        "La evidencia citada es de una línea celular y de ratones; no se cita ningún ensayo en humanos.",
        "The evidence cited is from a cell line and mice; no human trial is cited.",
        BATCH_3,
      ),
    ],
    functions: [
      { id: "mitochondrial-fatty-acid-oxidation", statement: "slu-pp-332-research-muscle" },
    ],
  },

  /* ---- Adipotide / FTTP --------------------------------------------------- */
  "adipotide-fttp": {
    slug: "adipotide-fttp",
    summary: null,
    mechanismNotes: [
      sci(
        "adipotide-mechanism-prohibitin",
        "Adipotide es un peptidomimético dirigido: un motivo peptídico (secuencia CKGGRAKDC) que se une a la prohibitina —una proteína de membrana que los autores establecen como marcador vascular del tejido adiposo— acoplado a un péptido proapoptótico. Dirigirlo a la vasculatura del tejido adiposo blanco provoca la ablación de ese tejido.",
        "Adipotide is a ligand-directed peptidomimetic: a peptide motif (sequence CKGGRAKDC) that binds prohibitin — a membrane protein the authors establish as a vascular marker of adipose tissue — coupled to a pro-apoptotic peptide. Directing it at white adipose tissue vasculature causes ablation of that tissue.",
        [REF.kolonin],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "adipotide-research-mice",
        "En ratones, la inducción dirigida de apoptosis en la vasculatura del tejido adiposo produjo resorción del tejido adiposo blanco establecido y normalización del metabolismo, con reversión de la obesidad y sin efectos adversos detectados en ese estudio.",
        "In mice, targeted induction of apoptosis in adipose tissue vasculature produced resorption of established white adipose tissue and normalisation of metabolism, reversing obesity with no adverse effects detected in that study.",
        [REF.kolonin],
        BATCH_3,
      ),
      sci(
        "adipotide-research-monkeys",
        "En monos obesos del Viejo Mundo produjo apoptosis dirigida en los vasos del tejido adiposo blanco, pérdida de peso y mejor resistencia a la insulina, confirmadas por resonancia magnética y absorciometría. En los valores evaluados como óptimos, los monos de tres especies mostraron cambios predecibles y reversibles en la función del túbulo proximal renal.",
        "In obese Old World monkeys it produced targeted apoptosis in white adipose tissue vessels, weight loss and improved insulin resistance, confirmed by magnetic resonance imaging and absorptiometry. At the levels assessed as optimal, monkeys from three species showed predictable and reversible changes in renal proximal tubule function.",
        [REF.barnhart],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.kolonin, REF.barnhart],
    technicalNotes: [
      note(
        "adipotide-note-models",
        "La evidencia citada es de ratones y de primates no humanos; no se cita ningún ensayo en humanos.",
        "The evidence cited is from mice and non-human primates; no human trial is cited.",
        BATCH_3,
      ),
    ],
    functions: [{ id: "adipose-vasculature", statement: "adipotide-mechanism-prohibitin" }],
  },

  /* ---- L-carnitine -------------------------------------------------------- */
  "l-carnitine": {
    slug: "l-carnitine",
    summary: null,
    mechanismNotes: [
      sci(
        "l-carnitine-mechanism-transport",
        "La carnitina es esencial para transferir ácidos grasos de cadena larga a través de la membrana mitocondrial interna, el paso previo a su β-oxidación. Se obtiene de la dieta —carne y lácteos— o la sintetiza el organismo, y las células la acumulan mediante OCTN2, un transportador de cationes orgánicos de alta afinidad específico para carnitina.",
        "Carnitine is essential for transferring long-chain fatty acids across the inner mitochondrial membrane, the step before their β-oxidation. It comes from the diet — meat and dairy — or is synthesised by the body, and cells accumulate it through OCTN2, a high-affinity organic cation transporter specific to carnitine.",
        [REF.longo],
        BATCH_3,
      ),
      sci(
        "l-carnitine-mechanism-deficiency",
        "Los defectos del transportador OCTN2 causan deficiencia primaria de carnitina, con menor acumulación intracelular, mayores pérdidas urinarias y niveles séricos bajos; es la condición que define el papel fisiológico de la molécula.",
        "Defects in the OCTN2 transporter cause primary carnitine deficiency, with reduced intracellular accumulation, increased urinary losses and low serum levels; this is the condition that defines the molecule's physiological role.",
        [REF.longo],
        BATCH_3,
      ),
    ],
    researchContext: [
      sci(
        "l-carnitine-research-meta",
        "Un metaanálisis de nueve ensayos aleatorizados (911 participantes en total) encontró que quienes recibieron carnitina perdieron más peso que el grupo control: diferencia media de 1.33 kg (IC 95 %: 0.57–2.09) y de 0.47 kg/m² de índice de masa corporal. La magnitud disminuyó al prolongarse el consumo.",
        "A meta-analysis of nine randomised trials (911 participants in total) found that those who received carnitine lost more weight than controls: mean difference 1.33 kg (95% CI 0.57–2.09) and 0.47 kg/m² of body-mass index. The magnitude decreased as consumption continued over time.",
        [REF.carnitineMeta],
        BATCH_3,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.longo, REF.carnitineMeta],
    technicalNotes: [],
    functions: [
      {
        id: "mitochondrial-fatty-acid-oxidation",
        statement: "l-carnitine-mechanism-transport",
      },
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
