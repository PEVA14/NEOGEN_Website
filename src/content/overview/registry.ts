import {
  BATCH_1_FLAGSHIP_PROFILES as BATCH_1,
  BATCH_2_INCRETIN_PROFILES as BATCH_2,
  BATCH_3_METABOLIC_PROFILES as BATCH_3,
  BATCH_4_RECOVERY_PROFILES as BATCH_4,
  BATCH_5_REMAINDER_PROFILES as BATCH_5,
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
  simonova: "ref-2025-simonova-thymosin-alpha-1",
  etass: "ref-2013-wu-etass",
  dalmasso: "ref-2008-dalmasso-kpv-pept1",
  kannengiesser: "ref-2008-kannengiesser-kpv-ibd",
  brines: "ref-2008-brines-helix-b-peptides",
  dahan: "ref-2013-dahan-ara290-sarcoidosis",
  heilborn: "ref-2003-heilborn-ll37-reepithelialisation",
  pyo: "ref-2007-pyo-ahk-cu-hair",
  linkova: "ref-2023-linkova-thymalin-dipeptides",
  ghAxis: "ref-2026-dominikowski-gh-igf1-peptides",
  raun: "ref-1998-raun-ipamorelin",
  teichman: "ref-2006-teichman-cjc-1295",
  timms: "ref-2019-timms-cjc-1295-detection",
  ohara: "ref-2017-ohara-ghrp-2-test",
  wangGhrp6: "ref-2026-wang-ghrp-6-infarct",
  liuMgf: "ref-2023-liu-mechano-growth-factor",
  levolger: "ref-2019-levolger-alk4-5-cachexia",
  mcpherron: "ref-1997-mcpherron-gdf-8",
  cadena: "ref-2026-cadena-ace-031-marmoset",
  george: "ref-2011-george-kisspeptin-10",
  kingsberg: "ref-2019-kingsberg-bremelanotide",
  mc4r: "ref-2026-feng-mc4r-modulators",
  jurek: "ref-2018-jurek-oxytocin-receptor",
  shoaib: "ref-2025-shoaib-hcg-male-infertility",
  dawlaty: "ref-2026-dawlaty-vip-pacap-sepsis",
  covarrubias: "ref-2021-covarrubias-nad-ageing",
  motsC: "ref-2015-lee-mots-c",
  chaiHumanin: "ref-2014-chai-humanin-alzheimer",
  szeto: "ref-2014-szeto-cardiolipin",
  baar: "ref-2017-baar-foxo4-senescence",
  forman: "ref-2009-forman-glutathione",
  mavrych: "ref-2026-mavrych-gerontology-peptides",
  melatonin: "ref-2018-cipolla-neto-melatonin",
  kolbaev: "ref-2025-kolbaev-semax-calcium",
  radchenko: "ref-2025-radchenko-semax-review",
  selank: "ref-2022-konstantinopolsky-selank",
  cerebrolysin: "ref-2026-staszewski-cerebrolysin-evt",
  wellsDihexa: "ref-2024-wells-dihexa-huntington",
  mottolese: "ref-2024-mottolese-p021-cntf-mimetic",
  afamelanotide: "ref-2015-langendonk-afamelanotide",
  bonchev: "ref-2026-bonchev-melanotan-ii",
  greenB12: "ref-2017-green-b12-deficiency",
  dermorphin: "ref-2026-zhuang-dermorphin-fentanyl",
} as const;

/**
 * The GH-IGF-1 line shares one limits statement, because one 2026 review
 * covers the whole family and says the same thing about all of it.
 */
const ghAxisLimit = (id: string) =>
  sci(
    id,
    "Una revisión narrativa de 2026 agrupa estos péptidos como compuestos no regulados vendidos como «research compounds», sin aprobación regulatoria para indicaciones de físico o rendimiento, y con incertidumbre sobre la composición real de los productos. Los efectos adversos que enumera incluyen alteraciones endocrinas y metabólicas (elevaciones de prolactina y cortisol, cambios de apetito, disglucemia), retención de líquidos, síntomas musculoesqueléticos y reacciones en el sitio de aplicación.",
    'A 2026 narrative review groups these peptides as unregulated compounds sold as "research compounds", without regulatory approval for physique- or performance-related indications, and with uncertainty about what the products actually contain. The adverse effects it lists include endocrine and metabolic disturbances (prolactin and cortisol elevations, appetite changes, dysglycaemia), fluid retention, musculoskeletal symptoms and application-site reactions.',
    [REF.ghAxis],
    BATCH_5,
  );

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

/**
 * The BPC-157 + TB-500 blends: same two components, different strengths, and
 * one shared literature. Written once so the two products cannot drift apart.
 */
const bpcTbBlend = (slug: string): ProductOverview => ({
  slug,
  summary: null,
  mechanismNotes: [
    sci(
      `${slug}-mechanism-components`,
      "Esta presentación combina dos compuestos con literatura propia: BPC-157, descrito como un péptido gástrico que favorece la integridad de la mucosa y que en estudios revisados aumenta vías de crecimiento celular y angiogénesis, y TB-500, descrito como una forma sintética de la timosina β4, que se une a la actina y promueve la migración celular.",
      "This presentation combines two compounds with their own literature: BPC-157, described as a gastric peptide that promotes mucosal integrity and which, in the studies reviewed, increases cell-growth and angiogenesis pathways, and TB-500, described as a synthetic form of thymosin β4, which binds actin and promotes cell migration.",
      [REF.vasireddi, REF.goldstein, REF.bicer],
      BATCH_4,
    ),
  ],
  researchContext: [
    sci(
      `${slug}-research-combination`,
      "El estudio que combina ambos compuestos —exploratorio, en ratas con reparación del tendón de Aquiles— encontró que la combinación no aportó beneficios adicionales frente a cada compuesto por separado. Los autores plantean como hipótesis que ambos converjan en vías comunes, y señalan que requiere confirmación experimental.",
      "The study that combines both compounds — exploratory, in rats with Achilles tendon repair — found that the combination conferred no additional benefit over either compound alone. The authors hypothesise that both converge on shared pathways, and note that this requires experimental confirmation.",
      [REF.bicer],
      BATCH_4,
    ),
    tewariLimit(`${slug}-research-evidence-limit`),
  ],
  areasOfInvestigation: [],
  keyReferences: [REF.vasireddi, REF.goldstein, REF.bicer, REF.tewari],
  technicalNotes: [
    note(
      `${slug}-note-blend`,
      "No se cita literatura sobre esta presentación combinada: las fuentes estudian cada componente, y una de ellas los estudia juntos en un modelo animal.",
      "No literature about this combined presentation is cited: the sources study each component, and one of them studies them together in an animal model.",
      BATCH_4,
    ),
  ],
  functions: [
    { id: "musculoskeletal-repair", statement: `${slug}-research-combination` },
    { id: "cell-migration-angiogenesis", statement: `${slug}-mechanism-components` },
  ],
});

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

  /* ---- Sermorelin --------------------------------------------------------- */
  sermorelin: {
    slug: "sermorelin",
    summary: null,
    mechanismNotes: [
      sci(
        "sermorelin-mechanism-ghrh",
        "La sermorelina es un análogo de la hormona liberadora de hormona de crecimiento (GHRH). La revisión citada la agrupa con la tesamorelina y las dos formas de CJC-1295 como análogos de GHRH, frente a los secretagogos que actúan por el receptor de ghrelina.",
        "Sermorelin is an analogue of growth hormone-releasing hormone (GHRH). The review cited groups it with tesamorelin and the two forms of CJC-1295 as GHRH analogues, as distinct from the secretagogues that act through the ghrelin receptor.",
        [REF.ghAxis],
        BATCH_5,
      ),
    ],
    researchContext: [ghAxisLimit("sermorelin-research-limits")],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis],
    technicalNotes: [],
    functions: [{ id: "growth-hormone-axis", statement: "sermorelin-mechanism-ghrh" }],
  },

  /* ---- CJC-1295 with DAC -------------------------------------------------- */
  "cjc-1295-with-dac": {
    slug: "cjc-1295-with-dac",
    summary: null,
    mechanismNotes: [
      sci(
        "cjc-1295-dac-mechanism-albumin",
        "CJC-1295 es un análogo de acción prolongada de la GHRH. Incorpora un grupo maleimido en el extremo C que le permite unirse de forma covalente a proteínas del plasma como la albúmina; esos conjugados tienen una vida media mucho mayor que el péptido libre y, según la fuente, estimulan la producción de hormona de crecimiento durante más de seis días en humanos.",
        "CJC-1295 is a long-acting GHRH analogue. It carries a maleimido group at its C-terminus that lets it bind covalently to plasma proteins such as albumin; those conjugates have a much longer half-life than the free peptide and, per the source, stimulate growth hormone production for more than six days in humans.",
        [REF.timms],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "cjc-1295-dac-research-healthy-adults",
        "Dos ensayos aleatorizados, doble ciego y controlados con placebo, de 28 y 49 días, en adultos sanos de 21 a 61 años, evaluaron su perfil farmacocinético, sus efectos farmacodinámicos y su seguridad: se observó estimulación prolongada de la secreción de hormona de crecimiento y de IGF-I.",
        "Two randomised, double-blind, placebo-controlled trials of 28 and 49 days in healthy adults aged 21 to 61 assessed its pharmacokinetic profile, pharmacodynamic effects and safety: prolonged stimulation of growth hormone and IGF-I secretion was observed.",
        [REF.teichman],
        BATCH_5,
      ),
      ghAxisLimit("cjc-1295-dac-research-limits"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.teichman, REF.timms, REF.ghAxis],
    technicalNotes: [],
    functions: [{ id: "growth-hormone-axis", statement: "cjc-1295-dac-mechanism-albumin" }],
  },

  /* ---- CJC-1295 without DAC ---------------------------------------------- */
  "cjc-1295-without-dac": {
    slug: "cjc-1295-without-dac",
    summary: null,
    mechanismNotes: [
      sci(
        "cjc-1295-nodac-mechanism-ghrh",
        "La revisión citada distingue CJC-1295 con complejo de afinidad por fármaco (DAC) de CJC-1295 sin DAC, y agrupa ambas como análogos de GHRH. Es la unión covalente a la albúmina la que prolonga la acción de la forma con DAC.",
        "The review cited distinguishes CJC-1295 with a Drug Affinity Complex (DAC) from CJC-1295 without DAC, and groups both as GHRH analogues. It is covalent binding to albumin that prolongs the action of the DAC form.",
        [REF.ghAxis, REF.timms],
        BATCH_5,
      ),
    ],
    researchContext: [ghAxisLimit("cjc-1295-nodac-research-limits")],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis, REF.timms],
    technicalNotes: [
      note(
        "cjc-1295-nodac-note-literature",
        "El ensayo en adultos sanos que se cita en la ficha de CJC-1295 con DAC estudió esa forma. Para la forma sin DAC no se cita un ensayo propio.",
        "The healthy-adult trial cited on the CJC-1295 with DAC page studied that form. No trial of the form without DAC is cited here.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "growth-hormone-axis", statement: "cjc-1295-nodac-mechanism-ghrh" }],
  },

  /* ---- CJC-1295 without DAC + Ipamorelin --------------------------------- */
  "cjc-1295-without-dac-ipamorelin": {
    slug: "cjc-1295-without-dac-ipamorelin",
    summary: null,
    mechanismNotes: [
      sci(
        "cjc-ipa-mechanism-two-routes",
        "Esta presentación combina dos compuestos que actúan por rutas distintas del mismo eje: CJC-1295, análogo de GHRH, y la ipamorelina, un secretagogo selectivo de hormona de crecimiento del grupo que actúa por el receptor de ghrelina.",
        "This presentation combines two compounds acting through different routes of the same axis: CJC-1295, a GHRH analogue, and ipamorelin, a selective growth hormone secretagogue from the group that acts through the ghrelin receptor.",
        [REF.ghAxis, REF.raun],
        BATCH_5,
      ),
    ],
    researchContext: [ghAxisLimit("cjc-ipa-research-limits")],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis, REF.raun, REF.teichman],
    technicalNotes: [
      note(
        "cjc-ipa-note-blend",
        "No se cita literatura sobre esta combinación: las fuentes estudian cada componente por separado.",
        "No literature about this combination is cited: the sources study each component separately.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "growth-hormone-axis", statement: "cjc-ipa-mechanism-two-routes" }],
  },

  /* ---- Ipamorelin --------------------------------------------------------- */
  ipamorelin: {
    slug: "ipamorelin",
    summary: null,
    mechanismNotes: [
      sci(
        "ipamorelin-mechanism-pentapeptide",
        "La ipamorelina es un pentapéptido (Aib-His-D-2-Nal-D-Phe-Lys-NH2) identificado en una serie de compuestos que carecen del dipéptido central Ala-Trp del GHRP-1. In vitro liberó hormona de crecimiento de células hipofisarias de rata con potencia y eficacia similares a las del GHRP-6.",
        "Ipamorelin is a pentapeptide (Aib-His-D-2-Nal-D-Phe-Lys-NH2) identified within a series of compounds lacking the central Ala-Trp dipeptide of GHRP-1. In vitro it released growth hormone from rat pituitary cells with potency and efficacy similar to GHRP-6.",
        [REF.raun],
        BATCH_5,
      ),
    ],
    researchContext: [ghAxisLimit("ipamorelin-research-limits")],
    areasOfInvestigation: [],
    keyReferences: [REF.raun, REF.ghAxis],
    technicalNotes: [],
    functions: [{ id: "growth-hormone-axis", statement: "ipamorelin-mechanism-pentapeptide" }],
  },

  /* ---- GHRP-2 ------------------------------------------------------------- */
  "ghrp-2-acetate": {
    slug: "ghrp-2-acetate",
    summary: null,
    mechanismNotes: [
      sci(
        "ghrp-2-mechanism-secretagogue",
        "El GHRP-2 es un secretagogo de hormona de crecimiento de la familia de los péptidos liberadores de hormona de crecimiento (GHRP), que actúan por el receptor de ghrelina y no por el de GHRH.",
        "GHRP-2 is a growth hormone secretagogue from the growth hormone-releasing peptide (GHRP) family, which act through the ghrelin receptor rather than the GHRH receptor.",
        [REF.ghAxis],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "ghrp-2-research-clinical-test",
        "En endocrinología clínica se usa como prueba de estímulo: la respuesta de hormona de crecimiento al GHRP-2 se mide para evaluar la función hipofisaria. El estudio citado la aplicó antes y después de una gastrectomía en manga en pacientes con obesidad.",
        "In clinical endocrinology it is used as a stimulation test: the growth hormone response to GHRP-2 is measured to assess pituitary function. The study cited applied it before and after sleeve gastrectomy in patients with obesity.",
        [REF.ohara],
        BATCH_5,
      ),
      ghAxisLimit("ghrp-2-research-limits"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis, REF.ohara],
    technicalNotes: [],
    functions: [{ id: "growth-hormone-axis", statement: "ghrp-2-mechanism-secretagogue" }],
  },

  /* ---- GHRP-6 ------------------------------------------------------------- */
  "ghrp-6-acetate": {
    slug: "ghrp-6-acetate",
    summary: null,
    mechanismNotes: [
      sci(
        "ghrp-6-mechanism-hexapeptide",
        "El GHRP-6 es un hexapéptido secretagogo de hormona de crecimiento. Es el compuesto de referencia con el que se comparó la potencia de la ipamorelina in vitro.",
        "GHRP-6 is a growth hormone secretagogue hexapeptide. It is the reference compound against which ipamorelin's in vitro potency was compared.",
        [REF.wangGhrp6, REF.raun],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "ghrp-6-research-infarct",
        "En un modelo de infarto de miocardio sin reperfusión en ratas, con adelgazamiento y dilatación de la pared ventricular izquierda, el tratamiento posquirúrgico con GHRP-6 se estudió frente a ratas infartadas con solución salina y ratas sanas; los autores describen efectos cardioprotectores sobre el remodelado ventricular y la función sistólica.",
        "In a non-reperfusion myocardial infarction model in rats, with left ventricular wall thinning and ballooning, post-surgical GHRP-6 treatment was studied against saline-treated infarcted rats and healthy rats; the authors describe cardioprotective effects on ventricular remodelling and systolic function.",
        [REF.wangGhrp6],
        BATCH_5,
      ),
      ghAxisLimit("ghrp-6-research-limits"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.wangGhrp6, REF.ghAxis],
    technicalNotes: [],
    functions: [{ id: "growth-hormone-axis", statement: "ghrp-6-mechanism-hexapeptide" }],
  },

  /* ---- Hexarelin ---------------------------------------------------------- */
  "hexarelin-acetate": {
    slug: "hexarelin-acetate",
    summary: null,
    mechanismNotes: [
      sci(
        "hexarelin-mechanism-secretagogue",
        "La hexarelina es un secretagogo de hormona de crecimiento; la revisión citada la agrupa con GHRP-2, GHRP-6 e ipamorelina, es decir, con los que actúan por el receptor de ghrelina.",
        "Hexarelin is a growth hormone secretagogue; the review cited groups it with GHRP-2, GHRP-6 and ipamorelin — those that act through the ghrelin receptor.",
        [REF.ghAxis],
        BATCH_5,
      ),
    ],
    researchContext: [ghAxisLimit("hexarelin-research-limits")],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis],
    technicalNotes: [],
    functions: [{ id: "growth-hormone-axis", statement: "hexarelin-mechanism-secretagogue" }],
  },

  /* ---- MGF ---------------------------------------------------------------- */
  mgf: {
    slug: "mgf",
    summary: null,
    mechanismNotes: [
      sci(
        "mgf-mechanism-isoform",
        "El factor de crecimiento mecánico (MGF) es una isoforma del factor de crecimiento similar a la insulina 1 (IGF-1) y se describe como un factor de crecimiento sensible a estímulos mecánicos, con un papel señalado en el sistema esquelético.",
        "Mechano growth factor (MGF) is an isoform of insulin-like growth factor 1 (IGF-1), described as a mechanically sensitive growth factor with an indicated role in the skeletal system.",
        [REF.liuMgf],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "mgf-research-cartilage",
        "En la cavidad articular el MGF se expresa de forma elevada en los condrocitos, especialmente en cartílago dañado por trauma o por enfermedades degenerativas como la osteoartritis; la revisión citada recoge ese trabajo.",
        "In the joint cavity MGF is highly expressed in chondrocytes, especially in cartilage damaged by trauma or by degenerative disease such as osteoarthritis; the review cited gathers that work.",
        [REF.liuMgf],
        BATCH_5,
      ),
      ghAxisLimit("mgf-research-limits"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.liuMgf, REF.ghAxis],
    technicalNotes: [],
    functions: [{ id: "igf-1-signalling", statement: "mgf-mechanism-isoform" }],
  },

  /* ---- PEG-MGF ------------------------------------------------------------ */
  "peg-mgf": {
    slug: "peg-mgf",
    summary: null,
    mechanismNotes: [
      sci(
        "peg-mgf-mechanism-pegylated",
        "La revisión citada nombra el factor de crecimiento mecánico pegilado (PEG-MGF) entre los análogos de IGF-1 que circulan como compuestos de investigación, junto con IGF-1 Long R3. El MGF del que parte es una isoforma del IGF-1 sensible a estímulos mecánicos.",
        "The review cited names pegylated mechano growth factor (PEG-MGF) among the IGF-1 analogues circulating as research compounds, alongside IGF-1 Long R3. The MGF it derives from is a mechanically sensitive isoform of IGF-1.",
        [REF.ghAxis, REF.liuMgf],
        BATCH_5,
      ),
    ],
    researchContext: [ghAxisLimit("peg-mgf-research-limits")],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis, REF.liuMgf],
    technicalNotes: [
      note(
        "peg-mgf-note-literature",
        "No se cita un estudio de la forma pegilada en particular: la fuente que la nombra la clasifica, y el trabajo experimental citado es sobre MGF.",
        "No study of the pegylated form specifically is cited: the source that names it classifies it, and the experimental work cited is on MGF.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "igf-1-signalling", statement: "peg-mgf-mechanism-pegylated" }],
  },

  /* ---- IGF-1 LR3 ---------------------------------------------------------- */
  "igf-1lr3": {
    slug: "igf-1lr3",
    summary: null,
    mechanismNotes: [
      sci(
        "igf-1lr3-mechanism-analogue",
        "IGF-1 Long R3 (LR3) es un análogo del factor de crecimiento similar a la insulina 1; la revisión citada lo agrupa con PEG-MGF entre los análogos de IGF-1 que circulan como compuestos de investigación.",
        "IGF-1 Long R3 (LR3) is an analogue of insulin-like growth factor 1; the review cited groups it with PEG-MGF among the IGF-1 analogues circulating as research compounds.",
        [REF.ghAxis],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "igf-1lr3-research-cachexia-model",
        "En un estudio sobre caquexia asociada a cáncer, LR3 IGF-I se usó en células musculares C2C12 y en un modelo murino para explorar si sumaba efecto a los bloqueadores del receptor ALK4/5 frente a la pérdida de masa muscular.",
        "In a study of cancer-associated cachexia, LR3 IGF-I was used in C2C12 muscle cells and in a murine model to explore whether it added to ALK4/5 receptor blockers against muscle wasting.",
        [REF.levolger],
        BATCH_5,
      ),
      ghAxisLimit("igf-1lr3-research-limits"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.ghAxis, REF.levolger],
    technicalNotes: [],
    functions: [{ id: "igf-1-signalling", statement: "igf-1lr3-mechanism-analogue" }],
  },

  /* ---- GDF-8 (myostatin) -------------------------------------------------- */
  "gdf-8": {
    slug: "gdf-8",
    summary: null,
    mechanismNotes: [
      sci(
        "gdf-8-mechanism-identity",
        "El GDF-8 (factor de crecimiento y diferenciación 8, también llamado miostatina) es un miembro de la superfamilia del TGF-β que se expresa específicamente en músculo esquelético en desarrollo y adulto.",
        "GDF-8 (growth/differentiation factor 8, also called myostatin) is a member of the TGF-β superfamily expressed specifically in developing and adult skeletal muscle.",
        [REF.mcpherron],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "gdf-8-research-knockout",
        "El trabajo que lo identificó mostró que su expresión empieza en el miotomo de los somitas durante la embriogénesis temprana y continúa en muchos músculos del animal adulto; es el estudio que estableció su papel regulador de la masa muscular en el ratón.",
        "The work that identified it showed expression beginning in the myotome compartment of developing somites in early embryogenesis and continuing in many muscles of the adult animal; it is the study that established its role in regulating muscle mass in the mouse.",
        [REF.mcpherron],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.mcpherron],
    technicalNotes: [
      note(
        "gdf-8-note-direction",
        "La literatura citada estudia la miostatina como regulador endógeno: la masa muscular aumenta cuando su señalización se BLOQUEA, que es lo que persiguen los inhibidores del receptor ActRIIB.",
        "The literature cited studies myostatin as an endogenous regulator: muscle mass increases when its signalling is BLOCKED, which is what ActRIIB receptor inhibitors pursue.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "muscle-mass-regulation", statement: "gdf-8-mechanism-identity" }],
  },

  /* ---- ACE-031 ------------------------------------------------------------ */
  "ace-031": {
    slug: "ace-031",
    summary: null,
    mechanismNotes: [
      sci(
        "ace-031-mechanism-actriib",
        "ACE-031 es una proteína terapéutica formada por el dominio extracelular del receptor de activina tipo IIB (ActRIIB) unido a una fracción Fc. Actúa como receptor soluble que secuestra ligandos de ActRIIB, entre ellos la miostatina y la activina A.",
        "ACE-031 is a therapeutic protein consisting of the extracellular domain of the activin receptor type IIB (ActRIIB) fused to an Fc portion. It acts as a soluble receptor that sequesters ActRIIB ligands, among them myostatin and activin A.",
        [REF.cadena, REF.mcpherron],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "ace-031-research-marmoset",
        "En el tití común, un primate no humano, ACE-031 aumentó la masa y la fuerza muscular; los autores presentan el modelo como un paso intermedio entre los resultados en ratón y una posible aplicación en miopatías crónicas humanas.",
        "In the common marmoset, a non-human primate, ACE-031 increased muscle mass and strength; the authors present the model as a step between mouse results and possible application in human chronic myopathies.",
        [REF.cadena],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.cadena, REF.mcpherron],
    technicalNotes: [
      note(
        "ace-031-note-models",
        "La evidencia citada es de ratón y de primate no humano; no se cita ningún ensayo en humanos.",
        "The evidence cited is from mice and a non-human primate; no human trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "muscle-mass-regulation", statement: "ace-031-mechanism-actriib" }],
  },

  /* ---- Kisspeptin-10 ------------------------------------------------------ */
  "kisspeptin-10": {
    slug: "kisspeptin-10",
    summary: null,
    mechanismNotes: [
      sci(
        "kisspeptin-10-mechanism-gnrh",
        "Las kisspeptinas estimulan la GnRH y con ella la secreción de gonadotropinas. La kisspeptina-10 es la secuencia mínima con actividad intrínseca completa.",
        "Kisspeptins stimulate GnRH and thereby gonadotropin secretion. Kisspeptin-10 is the minimal sequence with full intrinsic bioactivity.",
        [REF.george],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "kisspeptin-10-research-men",
        "En hombres sanos se estudió su efecto sobre la hormona luteinizante: los autores reportan que la kisspeptina-10 es un estimulador potente de la LH y que aumenta el número de pulsos de LH por hora, consistente con un aumento de la pulsatilidad de GnRH.",
        "In healthy men its effect on luteinising hormone was studied: the authors report kisspeptin-10 is a potent stimulator of LH and increases the number of LH pulses per hour, consistent with increased GnRH pulsatility.",
        [REF.george],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.george],
    technicalNotes: [],
    functions: [{ id: "reproductive-axis", statement: "kisspeptin-10-mechanism-gnrh" }],
  },

  /* ---- PT-141 (bremelanotide) -------------------------------------------- */
  pt141: {
    slug: "pt141",
    summary: null,
    mechanismNotes: [
      sci(
        "pt141-mechanism-melanocortin",
        "PT-141 es la bremelanotida, un péptido de la familia de las melanocortinas. Los receptores de esta familia, entre ellos el MC4R, son diana de desarrollo farmacológico documentado.",
        "PT-141 is bremelanotide, a peptide of the melanocortin family. The receptors of this family, MC4R among them, are a documented target of drug development.",
        [REF.kingsberg, REF.mc4r],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "pt141-research-reconnect",
        "Dos ensayos de fase 3 idénticos, aleatorizados, doble ciego y controlados con placebo (RECONNECT) evaluaron su seguridad y eficacia en mujeres premenopáusicas con trastorno del deseo sexual hipoactivo, con 24 semanas de tratamiento y asignación 1:1.",
        "Two identical randomised, double-blind, placebo-controlled phase 3 trials (RECONNECT) evaluated its safety and efficacy in premenopausal women with hypoactive sexual desire disorder, over 24 weeks of treatment with 1:1 allocation.",
        [REF.kingsberg],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.kingsberg, REF.mc4r],
    technicalNotes: [
      note(
        "pt141-note-population",
        "La literatura citada estudia una indicación y una población clínicas concretas, evaluadas con instrumentos clínicos.",
        "The literature cited studies one specific clinical indication and population, assessed with clinical instruments.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "melanocortin-receptors", statement: "pt141-mechanism-melanocortin" }],
  },

  /* ---- Oxytocin ----------------------------------------------------------- */
  "oxytocin-acetate": {
    slug: "oxytocin-acetate",
    summary: null,
    mechanismNotes: [
      sci(
        "oxytocin-mechanism-receptor",
        "La oxitocina actúa por su receptor (OXTR), expresado en el cerebro y en tejidos periféricos, acoplado a cascadas de señalización intracelular. La revisión citada recorre su expresión, su liberación y esas cascadas.",
        "Oxytocin acts through its receptor (OXTR), expressed in the brain and in peripheral tissues and coupled to intracellular signalling cascades. The review cited covers its expression, its release and those cascades.",
        [REF.jurek],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "oxytocin-research-literature",
        "Es un sistema con una literatura enorme: la revisión citada parte de cerca de 25,000 publicaciones desde 1930 y describe papeles centrales de la oxitocina y su receptor en la reproducción y en conductas sociales y emocionales, en estudios animales y humanos.",
        "It is a system with an enormous literature: the review cited draws on close to 25,000 publications since 1930 and describes central roles for oxytocin and its receptor in reproduction and in social and emotional behaviours, across animal and human studies.",
        [REF.jurek],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.jurek],
    technicalNotes: [],
    functions: [{ id: "neuroendocrine-signalling", statement: "oxytocin-mechanism-receptor" }],
  },

  /* ---- HCG ---------------------------------------------------------------- */
  hcg: {
    slug: "hcg",
    summary: null,
    mechanismNotes: [
      sci(
        "hcg-mechanism-gonadotropin",
        "La gonadotropina coriónica humana (HCG) es una gonadotropina usada clínicamente para estimular la función gonadal; la revisión citada la evalúa sola o combinada en infertilidad masculina.",
        "Human chorionic gonadotropin (HCG) is a gonadotropin used clinically to stimulate gonadal function; the review cited evaluates it alone or in combination in male infertility.",
        [REF.shoaib],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "hcg-research-systematic-review",
        "Una revisión sistemática de bases de datos (Embase, MEDLINE y el registro Cochrane CENTRAL) evaluó su eficacia y seguridad en infertilidad masculina, incluyendo oligospermia, varicocele, testiculopatía grave e hipogonadismo hipogonadotrópico, y parte de que no hay consenso sobre su valor en esa indicación.",
        "A systematic review of databases (Embase, MEDLINE and the Cochrane CENTRAL register) assessed its efficacy and safety in male infertility, including oligospermia, varicocele, severe testiculopathy and hypogonadotropic hypogonadism, starting from the absence of consensus on its value there.",
        [REF.shoaib],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.shoaib],
    technicalNotes: [],
    functions: [{ id: "reproductive-axis", statement: "hcg-mechanism-gonadotropin" }],
  },

  /* ---- VIP ---------------------------------------------------------------- */
  vip: {
    slug: "vip",
    summary: null,
    mechanismNotes: [
      sci(
        "vip-mechanism-neuropeptide",
        "El péptido intestinal vasoactivo (VIP) es un neuropéptido que, junto con el PACAP, se describe como modulador potente de las respuestas inmunitarias.",
        "Vasoactive intestinal peptide (VIP) is a neuropeptide which, together with PACAP, is described as a potent modulator of immune responses.",
        [REF.dawlaty],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "vip-research-sepsis-review",
        "La revisión citada recorre cinco décadas de investigación en sepsis y describe papeles complejos: protectores o permisivos según el momento, el compartimento tisular y el contexto inflamatorio. Los estudios de los años ochenta observaron que los niveles de VIP aumentan durante la endotoxemia.",
        "The review cited covers five decades of sepsis research and describes complex roles: protective or permissive depending on timing, tissue compartment and inflammatory context. Studies in the 1980s observed that VIP levels rise during endotoxaemia.",
        [REF.dawlaty],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.dawlaty],
    technicalNotes: [],
    functions: [
      { id: "neuroendocrine-signalling", statement: "vip-mechanism-neuropeptide" },
      { id: "immune-modulation", statement: "vip-research-sepsis-review" },
    ],
  },

  /* ---- NAD+ --------------------------------------------------------------- */
  nad: {
    slug: "nad",
    summary: null,
    mechanismNotes: [
      sci(
        "nad-mechanism-coenzyme",
        "El NAD+ (dinucleótido de nicotinamida y adenina) es una coenzima de reacciones redox, lo que lo sitúa en el centro del metabolismo energético, y además un cofactor esencial de enzimas no redox como las sirtuinas, CD38 y las poli(ADP-ribosa) polimerasas.",
        "NAD+ (nicotinamide adenine dinucleotide) is a coenzyme for redox reactions, which places it at the centre of energy metabolism, and also an essential cofactor for non-redox enzymes such as the sirtuins, CD38 and the poly(ADP-ribose) polymerases.",
        [REF.covarrubias],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "nad-research-ageing",
        "La revisión citada describe cómo el NAD+ influye directa e indirectamente en vías metabólicas, reparación de ADN, remodelado de cromatina, senescencia celular y función de las células inmunes, y revisa esos procesos en el contexto del envejecimiento.",
        "The review cited describes how NAD+ directly and indirectly influences metabolic pathways, DNA repair, chromatin remodelling, cellular senescence and immune cell function, and reviews those processes in the context of ageing.",
        [REF.covarrubias],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.covarrubias],
    technicalNotes: [],
    functions: [
      { id: "nnmt-nad-metabolism", statement: "nad-mechanism-coenzyme" },
      { id: "redox-balance", statement: "nad-mechanism-coenzyme" },
    ],
  },

  /* ---- MOTS-c ------------------------------------------------------------- */
  "mots-c": {
    slug: "mots-c",
    summary: null,
    mechanismNotes: [
      sci(
        "mots-c-mechanism-mitochondrial",
        "MOTS-c es un péptido de 16 aminoácidos codificado por un marco de lectura corto dentro del ARN ribosomal 12S del ADN mitocondrial. Su identificación partió de la de la humanina, el primer péptido señalizador descrito en el ADN mitocondrial.",
        "MOTS-c is a 16-amino-acid peptide encoded by a short open reading frame within the 12S ribosomal RNA of mitochondrial DNA. Its identification followed that of humanin, the first signalling peptide described in mitochondrial DNA.",
        [REF.motsC],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "mots-c-research-metabolic",
        "El trabajo que lo describió reporta que regula la sensibilidad a la insulina y la homeostasis metabólica, y plantea a la mitocondria como unidad de señalización además de orgánulo funcional.",
        "The work that described it reports that it regulates insulin sensitivity and metabolic homeostasis, and puts forward the mitochondrion as a signalling unit as well as a functional organelle.",
        [REF.motsC],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.motsC],
    technicalNotes: [],
    functions: [
      { id: "mitochondrial-bioenergetics", statement: "mots-c-mechanism-mitochondrial" },
      { id: "energy-balance", statement: "mots-c-research-metabolic" },
    ],
  },

  /* ---- Humanin ------------------------------------------------------------ */
  humanin: {
    slug: "humanin",
    summary: null,
    mechanismNotes: [
      sci(
        "humanin-mechanism-mitochondrial",
        "La humanina es un péptido señalizador codificado por un marco de lectura corto del ADN mitocondrial: el primero descrito, y el que abrió la búsqueda de otros como MOTS-c. Es un péptido secretado que inhibe la neurotoxicidad del péptido amiloide β.",
        "Humanin is a signalling peptide encoded by a short open reading frame in mitochondrial DNA: the first described, and the one that opened the search for others such as MOTS-c. It is a secreted peptide that inhibits the neurotoxicity of amyloid β peptide.",
        [REF.motsC, REF.chaiHumanin],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "humanin-research-rat-model",
        "En ratas, el tratamiento con humanina aumentó el número de ramificaciones dendríticas y la densidad de espinas dendríticas en un modelo de cambios patológicos y déficit cognitivo inducidos por amiloide β.",
        "In rats, treatment with humanin increased the number of dendritic branches and the density of dendritic spines in a model of amyloid β-induced pathological changes and cognitive deficits.",
        [REF.chaiHumanin],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.motsC, REF.chaiHumanin],
    technicalNotes: [
      note(
        "humanin-note-models",
        "La evidencia citada es de ratas; no se cita ningún ensayo en humanos.",
        "The evidence cited is from rats; no human trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [
      { id: "mitochondrial-bioenergetics", statement: "humanin-mechanism-mitochondrial" },
      { id: "neuroprotection", statement: "humanin-research-rat-model" },
    ],
  },

  /* ---- SS-31 -------------------------------------------------------------- */
  "ss-31": {
    slug: "ss-31",
    summary: null,
    mechanismNotes: [
      sci(
        "ss-31-mechanism-cardiolipin",
        "SS-31 se describe como un compuesto protector de la cardiolipina, el fosfolípido exclusivo de la membrana mitocondrial interna que participa en la formación de crestas y en la organización de los complejos respiratorios en supercomplejos para una fosforilación oxidativa óptima.",
        "SS-31 is described as a cardiolipin-protective compound. Cardiolipin is the phospholipid found only on the inner mitochondrial membrane, involved in cristae formation and in organising the respiratory complexes into supercomplexes for optimal oxidative phosphorylation.",
        [REF.szeto],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "ss-31-research-bioenergetics",
        "La revisión citada plantea la restauración de la bioenergética mitocondrial como enfoque común para enfermedades asociadas a la edad, y sitúa la interacción entre cardiolipina y citocromo c como punto donde ese enfoque actúa.",
        "The review cited proposes restoring mitochondrial bioenergetics as a common approach for age-associated disease, and places the interaction between cardiolipin and cytochrome c as the point where that approach acts.",
        [REF.szeto],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.szeto],
    technicalNotes: [],
    functions: [{ id: "mitochondrial-bioenergetics", statement: "ss-31-mechanism-cardiolipin" }],
  },

  /* ---- FOXO4-DRI ---------------------------------------------------------- */
  "fox04-dir": {
    slug: "fox04-dir",
    summary: null,
    mechanismNotes: [
      sci(
        "foxo4-mechanism-p53",
        "El péptido FOXO4 fue diseñado para perturbar la interacción entre FOXO4 y p53, identificada como el punto del que depende la viabilidad de las células senescentes.",
        "The FOXO4 peptide was designed to perturb the interaction between FOXO4 and p53, identified as the pivot on which senescent cell viability depends.",
        [REF.baar],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "foxo4-research-senescence",
        "El trabajo citado parte de que las células senescentes deterioran la función del tejido y de que su eliminación genética retrasa rasgos del envejecimiento, e investiga si la homeostasis del tejido puede además restaurarse mediante la apoptosis dirigida de esas células tras daño por quimioterapia y en el envejecimiento.",
        "The work cited starts from senescent cells impairing tissue function and from their genetic clearance delaying features of ageing, and investigates whether tissue homeostasis can also be restored by targeted apoptosis of those cells after chemotoxic damage and in ageing.",
        [REF.baar],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.baar],
    technicalNotes: [
      note(
        "foxo4-note-models",
        "La evidencia citada es de modelos celulares y de ratón; no se cita ningún ensayo en humanos.",
        "The evidence cited is from cell and mouse models; no human trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "cellular-senescence", statement: "foxo4-mechanism-p53" }],
  },

  /* ---- Glutathione -------------------------------------------------------- */
  glutathione: {
    slug: "glutathione",
    summary: null,
    mechanismNotes: [
      sci(
        "glutathione-mechanism-thiol",
        "El glutatión (GSH) es el compuesto tiólico de bajo peso molecular más abundante que sintetizan las células. Cumple papeles críticos protegiéndolas del daño oxidativo y de la toxicidad de electrófilos xenobióticos, y manteniendo la homeostasis redox.",
        "Glutathione (GSH) is the most abundant low-molecular-weight thiol compound synthesised in cells. It plays critical roles protecting them from oxidative damage and from the toxicity of xenobiotic electrophiles, and maintaining redox homeostasis.",
        [REF.forman],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "glutathione-research-overview",
        "La revisión citada describe la eliminación de oxidantes por reducción y de electrófilos por conjugación con GSH, los métodos para medir el estado de glutatión en las células, su síntesis y su regulación, y los enfoques propuestos para manipular su contenido.",
        "The review cited describes the elimination of oxidants by reduction and of electrophiles by conjugation with GSH, the methods for assessing glutathione status in cells, its synthesis and regulation, and the approaches proposed for manipulating its content.",
        [REF.forman],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.forman],
    technicalNotes: [],
    functions: [{ id: "redox-balance", statement: "glutathione-mechanism-thiol" }],
  },

  /* ---- Epithalon ---------------------------------------------------------- */
  epithalon: {
    slug: "epithalon",
    summary: null,
    mechanismNotes: [
      sci(
        "epithalon-mechanism-telomere",
        "La revisión citada incluye al epitalón entre nueve péptidos revisados en gerontología y lo sitúa en la biología del telómero, una de las líneas que examina junto con la restauración metabólica, la regeneración dérmica y la neuroprotección.",
        "The review cited includes epitalon among nine peptides reviewed in gerontology and places it in telomere biology, one of the lines it examines alongside metabolic restoration, dermal regeneration and neuroprotection.",
        [REF.mavrych],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "epithalon-research-review-limits",
        "Esa revisión narrativa distingue explícitamente entre los péptidos con aprobación regulatoria, que cuentan con perfiles de seguridad de ensayos grandes, y los no aprobados, de los que dice que muestran resultados prometedores; el epitalón está en el segundo grupo.",
        "That narrative review explicitly distinguishes peptides with regulatory approval, which have safety profiles from large-scale trials, from non-approved ones, of which it says they show promising results; epitalon is in the second group.",
        [REF.mavrych],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.mavrych],
    technicalNotes: [
      note(
        "epithalon-note-evidence",
        "La única fuente citada es una revisión narrativa. No se cita ningún estudio primario del epitalón, y ese es el estado de la literatura localizada, no un recorte de esta ficha.",
        "The only source cited is a narrative review. No primary study of epitalon is cited, and that is the state of the literature located rather than a cut made on this page.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "telomere-biology", statement: "epithalon-mechanism-telomere" }],
  },

  /* ---- Melatonin ---------------------------------------------------------- */
  melatonin: {
    slug: "melatonin",
    summary: null,
    mechanismNotes: [
      sci(
        "melatonin-mechanism-hormone",
        "La melatonina es una molécula presente en casi todo ser vivo, de bacterias a humanos. En vertebrados se sintetiza centralmente en la glándula pineal, además de producirse en tejidos periféricos donde actúa como señal autocrina y paracrina.",
        "Melatonin is a molecule present in almost every living being, from bacteria to humans. In vertebrates it is synthesised centrally in the pineal gland, besides being produced in peripheral tissues where it acts as an autocrine and paracrine signal.",
        [REF.melatonin],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "melatonin-research-circadian",
        "Independientemente de la especie, la melatonina pineal se produce siempre durante la noche, y la duración de su episodio secretor depende directamente de la longitud de la noche: es la señal que transmite la información temporal del ritmo día-noche.",
        "Whatever the species, pineal melatonin is always produced during the night, and the duration of its secretory episode depends directly on the length of the night: it is the signal that carries the temporal information of the day-night rhythm.",
        [REF.melatonin],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.melatonin],
    technicalNotes: [],
    functions: [{ id: "circadian-regulation", statement: "melatonin-research-circadian" }],
  },

  /* ---- Semax -------------------------------------------------------------- */
  semax: {
    slug: "semax",
    summary: null,
    mechanismNotes: [
      sci(
        "semax-mechanism-acth-analogue",
        "Semax es un análogo del fragmento ACTH(4-10). El estudio citado midió su efecto sobre la dinámica del calcio intracelular en rebanadas de cerebro de rata.",
        "Semax is an analogue of the ACTH(4-10) fragment. The study cited measured its effect on intracellular calcium dynamics in rat brain slices.",
        [REF.kolbaev],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "semax-research-review",
        "Una revisión de 2025 examina el potencial de Semax y de un derivado para corregir alteraciones patológicas en la enfermedad de Alzheimer, en el marco del interés por fármacos peptídicos de perfil de efectos adversos favorable.",
        "A 2025 review examines the potential of Semax and a derivative for correcting pathological impairments in Alzheimer's disease, in the context of interest in peptide drugs with a favourable adverse-effect profile.",
        [REF.radchenko],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.kolbaev, REF.radchenko],
    technicalNotes: [
      note(
        "semax-note-evidence",
        "La literatura citada es experimental y de revisión, y procede en buena parte de grupos rusos donde el compuesto se estudia desde hace décadas.",
        "The literature cited is experimental and review work, much of it from Russian groups where the compound has been studied for decades.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "neuroprotection", statement: "semax-research-review" }],
  },

  /* ---- Selank ------------------------------------------------------------- */
  selank: {
    slug: "selank",
    summary: null,
    mechanismNotes: [
      sci(
        "selank-mechanism-tuftsin",
        "Selank es un análogo peptídico de la tuftsina, un tetrapéptido de origen inmunológico.",
        "Selank is a peptide analogue of tuftsin, a tetrapeptide of immunological origin.",
        [REF.selank],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "selank-research-rats",
        "En ratas, en un modelo de abstinencia de morfina precipitada con naloxona, Selank redujo el índice total del síndrome de abstinencia en 39.6 %, atenuó de forma significativa las reacciones convulsivas, la ptosis y las alteraciones posturales, y elevó nueve veces el umbral de sensibilidad táctil frente al control activo.",
        "In rats, in a naloxone-precipitated morphine withdrawal model, Selank reduced the total withdrawal syndrome index by 39.6%, significantly attenuated convulsive reactions, ptosis and postural disorders, and raised the tactile sensitivity threshold nine-fold versus active control.",
        [REF.selank],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.selank],
    technicalNotes: [
      note(
        "selank-note-models",
        "La evidencia citada es de ratas; no se cita ningún ensayo en humanos.",
        "The evidence cited is from rats; no human trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [
      { id: "immune-modulation", statement: "selank-mechanism-tuftsin" },
      { id: "neuroprotection", statement: "selank-research-rats" },
    ],
  },

  /* ---- Selank + Semax ----------------------------------------------------- */
  "selank-semax": {
    slug: "selank-semax",
    summary: null,
    mechanismNotes: [
      sci(
        "selank-semax-mechanism-components",
        "Esta presentación combina dos péptidos con literatura propia: Selank, análogo de la tuftsina, y Semax, análogo del fragmento ACTH(4-10).",
        "This presentation combines two peptides with their own literature: Selank, a tuftsin analogue, and Semax, an analogue of the ACTH(4-10) fragment.",
        [REF.selank, REF.kolbaev],
        BATCH_5,
      ),
    ],
    researchContext: [],
    areasOfInvestigation: [],
    keyReferences: [REF.selank, REF.kolbaev, REF.radchenko],
    technicalNotes: [
      note(
        "selank-semax-note-blend",
        "No se cita literatura sobre la combinación: las fuentes estudian cada péptido por separado.",
        "No literature about the combination is cited: the sources study each peptide separately.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "neuroprotection", statement: "selank-semax-mechanism-components" }],
  },

  /* ---- Cerebrolysin ------------------------------------------------------- */
  cerebrolysin: {
    slug: "cerebrolysin",
    summary: null,
    mechanismNotes: [
      sci(
        "cerebrolysin-mechanism-multimodal",
        "El estudio citado describe la cerebrolisina como un agente neuroprotector multimodal, usado como tratamiento adyuvante.",
        "The study cited describes Cerebrolysin as a multimodal neuroprotective agent, used as an adjunctive treatment.",
        [REF.cerebrolysin],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "cerebrolysin-research-thrombectomy",
        "En una cohorte emparejada por puntaje de propensión de pacientes seleccionados con trombectomía endovascular por ictus, se evaluaron los resultados funcionales a 12 meses con cerebrolisina adyuvante. Los autores describen el análisis como generador de hipótesis, una emulación de ensayo diana y no un ensayo aleatorizado.",
        "In a propensity score-matched cohort of selected patients undergoing endovascular thrombectomy for stroke, 12-month functional outcomes with adjunctive Cerebrolysin were assessed. The authors describe the analysis as hypothesis-generating, a target-trial emulation rather than a randomised trial.",
        [REF.cerebrolysin],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.cerebrolysin],
    technicalNotes: [],
    functions: [{ id: "neuroprotection", statement: "cerebrolysin-mechanism-multimodal" }],
  },

  /* ---- Dihexa ------------------------------------------------------------- */
  dihexa: {
    slug: "dihexa",
    summary: null,
    mechanismNotes: [
      sci(
        "dihexa-mechanism-angiotensin-iv",
        "Dihexa, también identificado como PNB-0408 y como N-hexanoil-Tyr-Ile-(6)-amino hexanoico amida, es un análogo de la angiotensina IV al que se han atribuido propiedades neuroprotectoras y procognitivas.",
        "Dihexa, also identified as PNB-0408 and as N-hexanoic-Tyr-Ile-(6)-amino hexanoic amide, is an angiotensin IV analogue to which neuroprotective and procognitive properties have been attributed.",
        [REF.wellsDihexa],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "dihexa-research-huntington-model",
        "Se estudió en ratas en un modelo que imita la patología de la enfermedad de Huntington mediante ácido 3-nitropropiónico, una toxina mitocondrial que induce síntomas similares a los de la enfermedad.",
        "It was studied in rats in a model that mimics Huntington's disease pathology using 3-nitropropionic acid, a mitochondrial toxin that induces disease-like symptoms.",
        [REF.wellsDihexa],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.wellsDihexa],
    technicalNotes: [
      note(
        "dihexa-note-models",
        "La evidencia citada es de ratas; no se cita ningún ensayo en humanos.",
        "The evidence cited is from rats; no human trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "neuroprotection", statement: "dihexa-mechanism-angiotensin-iv" }],
  },

  /* ---- P21 (P021) --------------------------------------------------------- */
  "p21-p021": {
    slug: "p21-p021",
    summary: null,
    mechanismNotes: [
      sci(
        "p021-mechanism-cntf-mimetic",
        "P021 es un mimético peptídico de molécula pequeña del factor neurotrófico ciliar (CNTF). La línea de trabajo en la que se estudia parte de que aumentar los niveles cerebrales de BDNF produce mejoras estructurales y conductuales en modelos de trastornos del neurodesarrollo.",
        "P021 is a small-molecule peptide mimetic of ciliary neurotrophic factor (CNTF). The line of work it is studied in starts from the finding that increasing brain BDNF levels produces structural and behavioural improvements in neurodevelopmental disorder models.",
        [REF.mottolese],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "p021-research-cdkl5",
        "Se evaluó en modelos in vitro e in vivo del trastorno por deficiencia de CDKL5, una encefalopatía epiléptica grave en la que la ausencia de Cdkl5 afecta la proliferación, la supervivencia y la maduración neuronal.",
        "It was evaluated in in vitro and in vivo models of CDKL5 deficiency disorder, a severe epileptic encephalopathy in which the absence of Cdkl5 impairs neuronal proliferation, survival and maturation.",
        [REF.mottolese],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.mottolese],
    technicalNotes: [
      note(
        "p021-note-models",
        "La evidencia citada es de cultivos y de ratón; no se cita ningún ensayo en humanos.",
        "The evidence cited is from cultures and mice; no human trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "neuroprotection", statement: "p021-mechanism-cntf-mimetic" }],
  },

  /* ---- Melanotan 1 (afamelanotide) --------------------------------------- */
  "melanotan-1": {
    slug: "melanotan-1",
    summary: null,
    mechanismNotes: [
      sci(
        "melanotan-1-mechanism-msh-analogue",
        "La afamelanotida, el nombre con el que este compuesto aparece en la literatura clínica, es un análogo de la hormona estimulante de melanocitos α (α-MSH), de la familia de las melanocortinas.",
        "Afamelanotide, the name under which this compound appears in the clinical literature, is an analogue of α-melanocyte-stimulating hormone (α-MSH), of the melanocortin family.",
        [REF.afamelanotide, REF.mc4r],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "melanotan-1-research-epp",
        "Dos ensayos multicéntricos, aleatorizados, doble ciego y controlados con placebo lo evaluaron en protoporfiria eritropoyética, una fotodermatosis grave con fototoxicidad aguda, midiendo dolor y calidad de vida.",
        "Two multicentre, randomised, double-blind, placebo-controlled trials evaluated it in erythropoietic protoporphyria, a severe photodermatosis with acute phototoxicity, measuring pain and quality of life.",
        [REF.afamelanotide],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.afamelanotide, REF.mc4r],
    technicalNotes: [
      note(
        "melanotan-1-note-population",
        "La literatura citada estudia una enfermedad rara concreta, no la pigmentación como fin cosmético.",
        "The literature cited studies one specific rare disease, not pigmentation as a cosmetic end.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "melanocortin-receptors", statement: "melanotan-1-mechanism-msh-analogue" }],
  },

  /* ---- Melanotan 2 -------------------------------------------------------- */
  "melanotan-2": {
    slug: "melanotan-2",
    summary: null,
    mechanismNotes: [
      sci(
        "melanotan-2-mechanism-mc1r",
        "El Melanotan II se describe en la literatura como un péptido sintético no autorizado de la familia de las melanocortinas, que actúa principalmente activando receptores MC1R en los melanocitos y estimulando la producción de eumelanina, con pigmentación independiente de la exposición solar.",
        "Melanotan II is described in the literature as an unlicensed synthetic peptide of the melanocortin family, acting primarily by activating MC1R receptors on melanocytes and stimulating eumelanin production, with pigmentation independent of sun exposure.",
        [REF.bonchev, REF.mc4r],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "melanotan-2-research-case-report",
        "La fuente citada es un reporte de caso con seguimiento de tres meses de una persona que se lo aplicó durante 64 días buscando un bronceado más profundo, y documenta cambios en la mucosa oral. Los autores señalan su popularidad a través de promoción en redes sociales.",
        "The source cited is a case report with three-month follow-up of a person who self-applied it over 64 days seeking a deeper tan, documenting changes in the oral mucosa. The authors note its popularity through social media promotion.",
        [REF.bonchev],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.bonchev, REF.mc4r],
    technicalNotes: [
      note(
        "melanotan-2-note-evidence",
        "La evidencia citada es un reporte de caso, el nivel más bajo de la jerarquía clínica, y describe un hallazgo adverso. No se cita ningún ensayo controlado.",
        "The evidence cited is a case report, the lowest level of the clinical hierarchy, and it describes an adverse finding. No controlled trial is cited.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "melanocortin-receptors", statement: "melanotan-2-mechanism-mc1r" }],
  },

  /* ---- B12 (methylcobalamin) --------------------------------------------- */
  "b12-methylcobalamin": {
    slug: "b12-methylcobalamin",
    summary: null,
    mechanismNotes: [
      sci(
        "b12-mechanism-cofactor",
        "La vitamina B12, también llamada cobalamina, tiene un papel importante en el metabolismo celular, en particular en la síntesis de ADN, la metilación y el metabolismo mitocondrial.",
        "Vitamin B12, also called cobalamin, has an important role in cellular metabolism, particularly in DNA synthesis, methylation and mitochondrial metabolism.",
        [REF.greenB12],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "b12-research-deficiency",
        "La deficiencia clínica de B12, con sus manifestaciones hematológicas y neurológicas clásicas, es relativamente poco común; la deficiencia subclínica afecta entre 2.5 % y 26 % de la población general según la definición usada, y su relevancia clínica no está clara. Puede afectar a personas de todas las edades.",
        "Clinical B12 deficiency, with its classic haematological and neurological manifestations, is relatively uncommon; subclinical deficiency affects between 2.5% and 26% of the general population depending on the definition used, and its clinical relevance is unclear. It can affect people of all ages.",
        [REF.greenB12],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.greenB12],
    technicalNotes: [],
    functions: [{ id: "one-carbon-metabolism", statement: "b12-mechanism-cofactor" }],
  },

  /* ---- Dermorphin --------------------------------------------------------- */
  dermorphin: {
    slug: "dermorphin",
    summary: null,
    mechanismNotes: [
      sci(
        "dermorphin-mechanism-mu-opioid",
        "La dermorfina es un analgésico potente que actúa sobre receptores opioides μ y que promueve su desensibilización rápida. El estudio citado la usa precisamente por esa propiedad, en un modelo de apnea inducida por fentanilo en ratas.",
        "Dermorphin is a potent analgesic acting on μ-opioid receptors and promoting their rapid desensitisation. The study cited uses it precisely for that property, in a model of fentanyl-induced apnoea in rats.",
        [REF.dermorphin],
        BATCH_5,
      ),
    ],
    researchContext: [
      sci(
        "dermorphin-research-apnoea-model",
        "El contexto del estudio es la muerte súbita por opioides: en ratas, una cantidad alta de fentanilo desencadena una apnea sostenida mediada por el receptor μ1, letal si la cantidad es excesiva. Los autores probaron si un pretratamiento con dermorfina bloqueaba esa respuesta.",
        "The study's context is sudden death from opioid overdose: in rats, a high amount of fentanyl triggers a sustained apnoea mediated by the μ1 receptor, lethal if excessive. The authors tested whether dermorphin pretreatment blocked that response.",
        [REF.dermorphin],
        BATCH_5,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.dermorphin],
    technicalNotes: [
      note(
        "dermorphin-note-opioid",
        "Es un agonista de receptores opioides. La literatura citada es de farmacología en ratas y trata la sobredosis de opioides como problema de estudio.",
        "It is an opioid receptor agonist. The literature cited is rat pharmacology and treats opioid overdose as the problem under study.",
        BATCH_5,
      ),
    ],
    functions: [{ id: "opioid-receptors", statement: "dermorphin-mechanism-mu-opioid" }],
  },

  /* ---- Thymosin alpha-1 --------------------------------------------------- */
  "thymosin-alpha-1": {
    slug: "thymosin-alpha-1",
    summary: null,
    mechanismNotes: [
      sci(
        "thymosin-alpha-1-mechanism-identity",
        "La timosina alfa-1 (Tα1) es una hormona peptídica producida por el timo. La revisión citada le atribuye propiedades inmunomoduladoras, antiinflamatorias y antioxidantes, y describe su acción estimulando la diferenciación de linfocitos T y modulando la actividad de células dendríticas y macrófagos.",
        "Thymosin alpha-1 (Tα1) is a peptide hormone produced by the thymus. The review cited attributes immunomodulatory, anti-inflammatory and antioxidant properties to it, and describes its action as stimulating T-cell differentiation and modulating dendritic cell and macrophage activity.",
        [REF.simonova],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "thymosin-alpha-1-research-etass",
        "Ensayo aleatorizado y controlado (ETASS) en 361 pacientes con sepsis grave en seis hospitales: la mortalidad por cualquier causa a 28 días fue de 26.0 % con Tα1 y 35.0 % en el grupo control (riesgo relativo 0.74; IC 95 %: 0.54–1.02; log rank p = 0.049). El marcador inmunitario mHLA-DR mejoró más en el grupo con Tα1 a los días 3 y 7.",
        "Randomised controlled trial (ETASS) in 361 patients with severe sepsis across six hospitals: all-cause mortality at 28 days was 26.0% with Tα1 and 35.0% in the control group (relative risk 0.74; 95% CI 0.54–1.02; log rank p = 0.049). The immune marker mHLA-DR improved more in the Tα1 group at days 3 and 7.",
        [REF.etass],
        BATCH_4,
      ),
      sci(
        "thymosin-alpha-1-research-safety",
        "En ese ensayo no se registró ningún evento adverso grave relacionado con el fármaco. El intervalo de confianza del riesgo relativo cruza 1, y los autores describen el efecto como posible en una población específica de sepsis grave, no como establecido.",
        "In that trial no serious drug-related adverse event was recorded. The confidence interval for the relative risk crosses 1, and the authors describe the effect as possible in a specific severe-sepsis population rather than as established.",
        [REF.etass],
        BATCH_4,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.simonova, REF.etass],
    technicalNotes: [],
    functions: [{ id: "immune-modulation", statement: "thymosin-alpha-1-mechanism-identity" }],
  },

  /* ---- KPV ---------------------------------------------------------------- */
  kpv: {
    slug: "kpv",
    summary: null,
    mechanismNotes: [
      sci(
        "kpv-mechanism-pept1",
        "KPV es un tripéptido (Lys-Pro-Val) que corresponde al extremo C-terminal de la hormona α-MSH (α-MSH 11-13) y al que se atribuyen propiedades antiinflamatorias. Su captación por células epiteliales intestinales e inmunes ocurre a través de PepT1, un transportador de di- y tripéptidos que normalmente se expresa en el intestino delgado y que se induce en el colon durante la enfermedad inflamatoria intestinal.",
        "KPV is a tripeptide (Lys-Pro-Val) corresponding to the C-terminus of the α-MSH hormone (α-MSH 11-13), with anti-inflammatory properties attributed to it. Its uptake by intestinal epithelial and immune cells occurs through PepT1, a di- and tripeptide transporter normally expressed in the small intestine and induced in the colon during inflammatory bowel disease.",
        [REF.dalmasso, REF.kannengiesser],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "kpv-research-cells",
        "En células epiteliales intestinales humanas y linfocitos T estimulados con citocinas proinflamatorias, KPV redujo la actividad del factor NF-κB; los experimentos de captación con competidor indican que el efecto es mediado por PepT1.",
        "In human intestinal epithelial cells and T cells stimulated with pro-inflammatory cytokines, KPV reduced NF-κB activity; competitor uptake experiments indicate the effect is PepT1-mediated.",
        [REF.dalmasso],
        BATCH_4,
      ),
      sci(
        "kpv-research-colitis",
        "Se estudió en dos modelos murinos de colitis (inducida por sulfato de dextrano y por transferencia de CD45RB alto). En ratones con un receptor de melanocortina-1 no funcional la actividad antiinflamatoria se mantuvo, lo que los autores interpretan como un mecanismo independiente de ese receptor.",
        "It was studied in two murine colitis models (dextran sulfate-induced and CD45RB-high transfer). In mice with a non-functional melanocortin-1 receptor the anti-inflammatory activity persisted, which the authors read as a mechanism independent of that receptor.",
        [REF.kannengiesser],
        BATCH_4,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.dalmasso, REF.kannengiesser],
    technicalNotes: [
      note(
        "kpv-note-models",
        "La evidencia citada es de cultivos celulares humanos y de modelos murinos de colitis; no se cita ningún ensayo en humanos.",
        "The evidence cited is from human cell cultures and murine colitis models; no human trial is cited.",
        BATCH_4,
      ),
    ],
    functions: [
      { id: "inflammatory-signalling", statement: "kpv-research-cells" },
      { id: "immune-modulation", statement: "kpv-mechanism-pept1" },
    ],
  },

  /* ---- ARA-290 ------------------------------------------------------------ */
  "ara-290": {
    slug: "ara-290",
    summary: null,
    mechanismNotes: [
      sci(
        "ara-290-mechanism-helix-b",
        "ARA 290 es un péptido de 11 aminoácidos derivado de la cara acuosa de la hélice B de la eritropoyetina (EPO). La EPO regula la producción de eritrocitos por el homodímero de su receptor, y protege tejidos por una vía distinta: un heterocomplejo del receptor de EPO con CD131, el receptor β común. ARA 290 activa esa segunda vía sin la acción eritropoyética.",
        "ARA 290 is an 11-amino-acid peptide derived from the aqueous face of helix B of erythropoietin (EPO). EPO regulates erythrocyte production through its receptor homodimer, and protects tissues through a different route: a heterocomplex of the EPO receptor with CD131, the beta common receptor. ARA 290 activates that second route without the erythropoietic action.",
        [REF.brines],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "ara-290-research-preclinical",
        "El péptido de la hélice B fue neuroprotector in vitro y protector de tejidos in vivo en varios modelos: ictus isquémico, edema retiniano inducido por diabetes y traumatismo de nervio periférico.",
        "The helix B peptide was neuroprotective in vitro and tissue-protective in vivo across several models: ischaemic stroke, diabetes-induced retinal oedema and peripheral nerve trauma.",
        [REF.brines],
        BATCH_4,
      ),
      sci(
        "ara-290-research-sarcoidosis",
        "Ensayo ciego y controlado con placebo de 28 días en pacientes con pérdida documentada de fibras nerviosas pequeñas asociada a sarcoidosis: mejoraron los síntomas neuropáticos reportados por los pacientes y aumentó la densidad de fibras nerviosas pequeñas en la córnea.",
        "Blinded, placebo-controlled 28-day trial in patients with documented sarcoidosis-associated small nerve fibre loss: patient-reported neuropathic symptoms improved and corneal small nerve fibre density increased.",
        [REF.dahan],
        BATCH_4,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.brines, REF.dahan],
    technicalNotes: [],
    functions: [{ id: "innate-repair-receptor", statement: "ara-290-mechanism-helix-b" }],
  },

  /* ---- LL-37 -------------------------------------------------------------- */
  "ll-37": {
    slug: "ll-37",
    summary: null,
    mechanismNotes: [
      sci(
        "ll-37-mechanism-identity",
        "LL-37 es el fragmento C-terminal de hCAP18, la proteína catelicidina antimicrobiana humana y componente del sistema inmunitario innato; ese fragmento le confiere una actividad antimicrobiana amplia. hCAP18 se produce de forma constitutiva en los leucocitos y se induce en órganos de barrera ante inflamación e infección.",
        "LL-37 is the C-terminal fragment of hCAP18, the human cathelicidin antimicrobial protein and a component of the innate immune system; that fragment confers its broad antimicrobial activity. hCAP18 is produced constitutively in leukocytes and induced in barrier organs upon inflammation and infection.",
        [REF.heilborn],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "ll-37-research-reepithelialisation",
        "En piel humana, los niveles de hCAP18 aumentan al producirse una herida, alcanzan su máximo a las 48 horas y vuelven a los valores previos al cerrarse; se detecta en el infiltrado inflamatorio y en el epitelio que migra sobre el lecho de la herida. En úlceras crónicas los niveles son bajos y no hay inmunorreactividad en el epitelio del borde.",
        "In human skin, hCAP18 levels rise when a wound occurs, peak at 48 hours and return to pre-injury levels as the wound closes; it is detected in the inflammatory infiltrate and in the epithelium migrating over the wound bed. In chronic ulcers levels are low and there is no immunoreactivity in the ulcer-edge epithelium.",
        [REF.heilborn],
        BATCH_4,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.heilborn],
    technicalNotes: [],
    functions: [
      { id: "antimicrobial-activity", statement: "ll-37-mechanism-identity" },
      { id: "wound-healing", statement: "ll-37-research-reepithelialisation" },
    ],
  },

  /* ---- AHK-Cu ------------------------------------------------------------- */
  "ahk-cu": {
    slug: "ahk-cu",
    summary: null,
    mechanismNotes: [
      sci(
        "ahk-cu-mechanism-tripeptide-copper",
        "AHK-Cu es el complejo del tripéptido L-alanil-L-histidil-L-lisina con cobre (Cu²⁺). Los complejos tripéptido-cobre se describen como factores de crecimiento para distintos tipos de células diferenciadas: estimulan la proliferación de fibroblastos dérmicos y elevan la producción de factor de crecimiento endotelial vascular (VEGF), a la vez que reducen la secreción de TGF-β1 por esos fibroblastos.",
        "AHK-Cu is the complex of the tripeptide L-alanyl-L-histidyl-L-lysine with copper (Cu²⁺). Tripeptide-copper complexes are described as growth factors for various differentiated cell types: they stimulate dermal fibroblast proliferation and raise vascular endothelial growth factor (VEGF) production, while reducing those fibroblasts' TGF-β1 secretion.",
        [REF.pyo],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "ahk-cu-research-hair-follicle",
        "En folículos pilosos humanos ex vivo, AHK-Cu estimuló su elongación, y en cultivo estimuló la proliferación de células de la papila dérmica —fibroblastos especializados con un papel en la morfogénesis y el crecimiento del folículo—. La relación Bcl-2/Bax aumentó y bajaron las formas escindidas de caspasa-3 y PARP; la reducción de células apoptóticas no alcanzó significancia estadística.",
        "In human hair follicles ex vivo, AHK-Cu stimulated their elongation, and in culture it stimulated the proliferation of dermal papilla cells — specialised fibroblasts with a role in follicle morphogenesis and growth. The Bcl-2/Bax ratio rose and the cleaved forms of caspase-3 and PARP fell; the reduction in apoptotic cells did not reach statistical significance.",
        [REF.pyo],
        BATCH_4,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.pyo],
    technicalNotes: [
      note(
        "ahk-cu-note-models",
        "La evidencia citada es de folículos humanos ex vivo y de células en cultivo; no se cita ningún ensayo en humanos.",
        "The evidence cited is from human follicles ex vivo and cultured cells; no human trial is cited.",
        BATCH_4,
      ),
    ],
    functions: [
      { id: "hair-follicle", statement: "ahk-cu-research-hair-follicle" },
      { id: "dermal-structure", statement: "ahk-cu-mechanism-tripeptide-copper" },
    ],
  },

  /* ---- Thymalin ----------------------------------------------------------- */
  thymalin: {
    slug: "thymalin",
    summary: null,
    mechanismNotes: [
      sci(
        "thymalin-mechanism-dipeptides",
        "Thymalin es una preparación inmunomoduladora que contiene un extracto polipeptídico de timo; sus sustancias activas son los dipéptidos KE y EW. Según la literatura que citan los autores, KE estimula la inmunidad celular y la resistencia no específica actuando sobre macrófagos, linfocitos, timocitos y neutrófilos, mientras EW reduce la vasoconstricción inducida por angiotensina.",
        "Thymalin is an immunomodulatory preparation containing a polypeptide extract of thymus; its active substances are the dipeptides KE and EW. According to the literature the authors cite, KE stimulates cellular immunity and non-specific resistance by acting on macrophages, lymphocytes, thymocytes and neutrophils, while EW reduces angiotensin-induced vasoconstriction.",
        [REF.linkova],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "thymalin-research-mechanism-study",
        "El estudio citado es de modelado molecular y expresión génica: evaluó la interacción de los dipéptidos EW y KE con ADN de doble cadena para identificar un posible mecanismo de la actividad inmunomoduladora de Thymalin en el contexto de la respuesta inflamatoria del COVID-19.",
        "The study cited is molecular modelling and gene expression work: it assessed how the EW and KE dipeptides interact with double-stranded DNA, to identify a possible mechanism for Thymalin's immunomodulatory activity in the context of the COVID-19 inflammatory response.",
        [REF.linkova],
        BATCH_4,
      ),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.linkova],
    technicalNotes: [
      note(
        "thymalin-note-evidence",
        "La literatura localizada procede en su mayoría de un mismo grupo de investigación y es de modelado y expresión génica. Los ensayos clínicos que los autores mencionan no se citan aquí porque no se revisaron en su fuente original.",
        "The literature located comes mostly from a single research group and is modelling and gene-expression work. The clinical trials the authors mention are not cited here because they were not read in their original source.",
        BATCH_4,
      ),
    ],
    functions: [{ id: "immune-modulation", statement: "thymalin-mechanism-dipeptides" }],
  },

  /* ---- KLOW --------------------------------------------------------------- */
  klow: {
    slug: "klow",
    summary: null,
    mechanismNotes: [
      sci(
        "klow-mechanism-components",
        "KLOW reúne cuatro compuestos con literatura propia: BPC-157, estudiado en modelos preclínicos de lesión musculoesquelética; GHK-Cu, estudiado en síntesis de colágeno y reparación de la piel; TB-500, descrito como forma sintética de la timosina β4, que se une a la actina y promueve la migración celular; y KPV, el tripéptido derivado de α-MSH cuya captación por PepT1 reduce la señalización inflamatoria en modelos celulares y murinos.",
        "KLOW brings together four compounds with their own literature: BPC-157, studied in preclinical models of musculoskeletal injury; GHK-Cu, studied in collagen synthesis and skin repair; TB-500, described as a synthetic form of thymosin β4, which binds actin and promotes cell migration; and KPV, the α-MSH-derived tripeptide whose PepT1-mediated uptake reduces inflammatory signalling in cell and murine models.",
        [REF.vasireddi, REF.pickart2015, REF.goldstein, REF.dalmasso],
        BATCH_4,
      ),
    ],
    researchContext: [
      sci(
        "klow-research-combination",
        "El único estudio citado que combina dos de sus componentes —BPC-157 y TB-500, en ratas con reparación del tendón de Aquiles— encontró que la combinación no aportó beneficios adicionales frente a cada compuesto por separado. Ese estudio no incluyó GHK-Cu ni KPV.",
        "The only study cited that combines two of its components — BPC-157 and TB-500, in rats with Achilles tendon repair — found that the combination conferred no additional benefit over either compound alone. That study included neither GHK-Cu nor KPV.",
        [REF.bicer],
        BATCH_4,
      ),
      tewariLimit("klow-research-evidence-limit"),
    ],
    areasOfInvestigation: [],
    keyReferences: [REF.vasireddi, REF.pickart2015, REF.goldstein, REF.dalmasso, REF.bicer],
    technicalNotes: [
      note(
        "klow-note-blend",
        "No se cita literatura sobre esta combinación de cuatro componentes: las fuentes estudian cada uno por separado, y una de ellas estudia dos de ellos juntos en un modelo animal.",
        "No literature about this four-component combination is cited: the sources study each one separately, and one of them studies two of them together in an animal model.",
        BATCH_4,
      ),
    ],
    functions: [
      { id: "extracellular-matrix", statement: "klow-mechanism-components" },
      { id: "inflammatory-signalling", statement: "klow-mechanism-components" },
      { id: "musculoskeletal-repair", statement: "klow-research-combination" },
    ],
  },

  /* ---- BPC + TB blends ---------------------------------------------------- */
  "bpc-5mg-tb-5mg": bpcTbBlend("bpc-5mg-tb-5mg"),
  "bpc-10mg-tb-10mg": bpcTbBlend("bpc-10mg-tb-10mg"),

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
