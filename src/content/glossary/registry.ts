import type { GlossaryTerm } from "./types";

/**
 * THE TERMS — defined once, linked from everywhere they are used.
 *
 * Written as definitions only (see `types.ts`): what a word means, never what
 * a compound does. Order within a category is the order a first-time reader
 * needs them in — "amino acid" before "peptide bond" before "peptide" — and
 * the page offers an A–Z view for the reader who arrives looking one up.
 *
 * APPROVED ON THE SAME BASIS AS THE NOTES (§8y): definition-class vocabulary,
 * checkable against any textbook, with no statement about any product. The
 * owner should still read them; demoting one to `owner-review` removes it from
 * the page, from every record's term list and from the sitemap at once.
 */
export const GLOSSARY: readonly GlossaryTerm[] = [
  /* ---- Structure -------------------------------------------------------- */
  {
    id: "aminoacido",
    category: "structure",
    status: "approved",
    term: { es: "Aminoácido", en: "Amino acid" },
    definition: {
      es: "Molécula pequeña con un grupo amino y un grupo carboxilo. Veinte aminoácidos distintos son las piezas con las que se construyen los péptidos y las proteínas.",
      en: "A small molecule carrying an amino group and a carboxyl group. Twenty different amino acids are the building blocks of peptides and proteins.",
    },
    matches: { es: ["aminoacido", "aminoacidos"], en: ["amino acid", "amino acids", "amino-acid"] },
    seeAlso: ["enlace-peptidico", "residuo"],
    destination: "peptides",
  },
  {
    id: "enlace-peptidico",
    category: "structure",
    status: "approved",
    term: { es: "Enlace peptídico", en: "Peptide bond" },
    definition: {
      es: "La unión química entre el grupo carboxilo de un aminoácido y el grupo amino del siguiente. Una sucesión de estos enlaces forma el esqueleto de un péptido.",
      en: "The chemical link between the carboxyl group of one amino acid and the amino group of the next. A run of these bonds forms a peptide's backbone.",
    },
    matches: {
      es: ["enlace peptidico", "enlaces peptidicos"],
      en: ["peptide bond", "peptide bonds"],
    },
    seeAlso: ["aminoacido", "peptido"],
    destination: "peptides",
  },
  {
    id: "peptido",
    category: "structure",
    status: "approved",
    term: { es: "Péptido", en: "Peptide" },
    definition: {
      es: "Cadena corta de aminoácidos unidos por enlaces peptídicos. Se distingue de una proteína sobre todo por el tamaño: decenas de aminoácidos frente a cientos o miles.",
      en: "A short chain of amino acids joined by peptide bonds. It differs from a protein mainly in size: tens of amino acids against hundreds or thousands.",
    },
    matches: { es: ["peptido", "peptidos"], en: ["peptide", "peptides"] },
    seeAlso: ["proteina", "secuencia"],
    /* The guide, not the short note: /peptidos links the note itself, and two
       links reading "what is a peptide" side by side helped nobody. */
    destination: "peptides",
  },
  {
    id: "proteina",
    category: "structure",
    status: "approved",
    term: { es: "Proteína", en: "Protein" },
    definition: {
      es: "Cadena larga de aminoácidos —cientos o miles— que se pliega en una estructura tridimensional estable, de la que depende su función.",
      en: "A long chain of amino acids — hundreds or thousands — that folds into a stable three-dimensional structure on which its function depends.",
    },
    matches: { es: ["proteina", "proteinas"], en: ["protein", "proteins"] },
    seeAlso: ["peptido"],
    destination: "peptides",
  },
  {
    id: "secuencia",
    category: "structure",
    status: "approved",
    term: { es: "Secuencia", en: "Sequence" },
    definition: {
      es: "El orden de los aminoácidos de un péptido. Es su identidad: cambiar un solo aminoácido produce una molécula distinta.",
      en: "The order of a peptide's amino acids. It is the peptide's identity: changing a single amino acid produces a different molecule.",
    },
    matches: { es: ["secuencia", "secuencias"], en: ["sequence", "sequences"] },
    seeAlso: ["residuo", "analogo"],
  },
  {
    id: "residuo",
    category: "structure",
    status: "approved",
    term: { es: "Residuo", en: "Residue" },
    definition: {
      es: "Cada aminoácido una vez incorporado a una cadena. Las posiciones de una secuencia se numeran por residuo, de modo que «lisina 26» es el residuo que ocupa la posición 26.",
      en: "Each amino acid once it is part of a chain. Positions in a sequence are numbered by residue, so “lysine 26” is the residue at position 26.",
    },
    matches: { es: ["residuo", "residuos"], en: ["residue", "residues"] },
    seeAlso: ["secuencia"],
  },
  {
    id: "analogo",
    category: "structure",
    status: "approved",
    term: { es: "Análogo", en: "Analogue" },
    definition: {
      es: "Molécula diseñada a partir de otra, con cambios deliberados en su estructura —una sustitución de aminoácidos, una modificación química— que conserva el parecido con la original.",
      en: "A molecule designed from another, with deliberate changes to its structure — an amino-acid substitution, a chemical modification — while keeping its resemblance to the original.",
    },
    matches: {
      es: ["analogo", "analogos", "analoga", "analogas"],
      en: ["analogue", "analogues", "analog", "analogs"],
    },
    seeAlso: ["secuencia", "acido-graso"],
  },
  {
    id: "acido-graso",
    category: "structure",
    status: "approved",
    term: { es: "Modificación con ácido graso", en: "Fatty-acid modification" },
    definition: {
      es: "Unión de una cadena de ácido graso a un péptido. En la literatura se describe como una forma de aumentar la unión a la albúmina de la sangre y, con ella, el tiempo que la molécula permanece en circulación.",
      en: "Attaching a fatty-acid chain to a peptide. The literature describes it as a way to increase binding to blood albumin and, with it, how long the molecule remains in circulation.",
    },
    matches: {
      es: ["acido graso", "acidos grasos", "acido graso diacido"],
      en: ["fatty acid", "fatty-acid", "fatty acids"],
    },
    seeAlso: ["analogo", "vida-media"],
  },
  {
    id: "acetato",
    category: "structure",
    status: "approved",
    term: { es: "Acetato (forma de sal)", en: "Acetate (salt form)" },
    definition: {
      es: "Muchos péptidos sintéticos se aíslan como sal, asociados a un contraión. «Acetato» en el nombre de un producto indica esa forma; no cambia la secuencia del péptido.",
      en: "Many synthetic peptides are isolated as a salt, paired with a counter-ion. “Acetate” in a product's name indicates that form; it does not change the peptide's sequence.",
    },
    matches: { es: ["acetato"], en: ["acetate"] },
    seeAlso: ["secuencia"],
  },
  {
    id: "mezcla",
    category: "structure",
    status: "approved",
    term: { es: "Mezcla", en: "Blend" },
    definition: {
      es: "Presentación que combina dos o más compuestos en un mismo vial, con la cantidad de cada uno declarada. La literatura sobre cada componente no se transfiere por sí sola a la mezcla.",
      en: "A presentation that combines two or more compounds in one vial, with the amount of each declared. The literature on each component does not by itself transfer to the blend.",
    },
    matches: { es: ["mezcla", "mezclas"], en: ["blend", "blends"] },
    seeAlso: ["presentacion"],
    destination: "compendium",
  },

  /* ---- Mechanism -------------------------------------------------------- */
  {
    id: "receptor",
    category: "mechanism",
    status: "approved",
    term: { es: "Receptor", en: "Receptor" },
    definition: {
      es: "Proteína, a menudo en la superficie de una célula, que reconoce una molécula concreta y desencadena una respuesta al unirse a ella.",
      en: "A protein, often on the surface of a cell, that recognises a specific molecule and triggers a response when it binds.",
    },
    matches: { es: ["receptor", "receptores"], en: ["receptor", "receptors"] },
    seeAlso: ["agonista", "antagonista", "senalizacion"],
    destination: "lines",
  },
  {
    id: "agonista",
    category: "mechanism",
    status: "approved",
    term: { es: "Agonista", en: "Agonist" },
    definition: {
      es: "Molécula que se une a un receptor y lo activa. Un agonista dual o triple actúa sobre dos o tres receptores distintos.",
      en: "A molecule that binds a receptor and activates it. A dual or triple agonist acts on two or three different receptors.",
    },
    matches: {
      es: ["agonista", "agonistas", "agonismo"],
      en: ["agonist", "agonists", "agonism"],
    },
    seeAlso: ["receptor", "antagonista", "afinidad"],
  },
  {
    id: "antagonista",
    category: "mechanism",
    status: "approved",
    term: { es: "Antagonista", en: "Antagonist" },
    definition: {
      es: "Molécula que se une a un receptor sin activarlo e impide que otra lo active.",
      en: "A molecule that binds a receptor without activating it, and prevents another from doing so.",
    },
    matches: { es: ["antagonista", "antagonistas"], en: ["antagonist", "antagonists"] },
    seeAlso: ["receptor", "agonista"],
  },
  {
    id: "afinidad",
    category: "mechanism",
    status: "approved",
    term: { es: "Afinidad", en: "Affinity" },
    definition: {
      es: "Qué tan fuertemente se une una molécula a su receptor. Suele expresarse como una concentración —por ejemplo en nanomolar (nM)—: cuanto menor el valor, mayor la afinidad.",
      en: "How strongly a molecule binds its receptor. It is usually expressed as a concentration — for example in nanomolar (nM): the lower the value, the higher the affinity.",
    },
    matches: { es: ["afinidad"], en: ["affinity"] },
    seeAlso: ["receptor", "agonista"],
  },
  {
    id: "vida-media",
    category: "mechanism",
    status: "approved",
    term: { es: "Vida media", en: "Half-life" },
    definition: {
      es: "Tiempo que tarda la concentración de un compuesto en reducirse a la mitad. Se mide en un modelo concreto, y el valor obtenido en una especie no se traslada a otra.",
      en: "The time it takes for a compound's concentration to fall by half. It is measured in a specific model, and a value obtained in one species does not carry over to another.",
    },
    matches: { es: ["vida media"], en: ["half-life", "half life"] },
    seeAlso: ["modelo-animal"],
  },
  {
    id: "incretinas",
    category: "mechanism",
    status: "approved",
    term: { es: "Incretinas", en: "Incretins" },
    definition: {
      es: "Hormonas intestinales, como el GLP-1 y el GIP, que se liberan tras la ingesta de alimento y participan en la regulación de la secreción de insulina.",
      en: "Gut hormones, such as GLP-1 and GIP, released after food intake that take part in regulating insulin secretion.",
    },
    matches: {
      es: ["incretina", "incretinas", "glp-1", "gip"],
      en: ["incretin", "incretins", "glp-1", "gip"],
    },
    seeAlso: ["glucagon", "receptor", "hba1c"],
    destination: "lines",
  },
  {
    id: "glucagon",
    category: "mechanism",
    status: "approved",
    term: { es: "Glucagón", en: "Glucagon" },
    definition: {
      es: "Hormona del páncreas que eleva la glucosa en sangre. Su receptor es una de las dianas que estudia la investigación metabólica.",
      en: "A pancreatic hormone that raises blood glucose. Its receptor is one of the targets metabolic research studies.",
    },
    matches: { es: ["glucagon"], en: ["glucagon"] },
    seeAlso: ["incretinas"],
  },
  {
    id: "senalizacion",
    category: "mechanism",
    status: "approved",
    term: { es: "Señalización", en: "Signalling" },
    definition: {
      es: "La cadena de reacciones dentro de una célula que sigue a la activación de un receptor y termina en una respuesta.",
      en: "The chain of reactions inside a cell that follows a receptor's activation and ends in a response.",
    },
    matches: { es: ["senalizacion"], en: ["signalling", "signaling"] },
    seeAlso: ["receptor", "expresion-genica"],
  },
  {
    id: "expresion-genica",
    category: "mechanism",
    status: "approved",
    term: { es: "Expresión génica", en: "Gene expression" },
    definition: {
      es: "El proceso por el que la información de un gen se usa para producir una proteína. Muchos estudios miden cómo cambia la expresión de genes concretos en un modelo.",
      en: "The process by which a gene's information is used to make a protein. Many studies measure how the expression of specific genes changes in a model.",
    },
    matches: {
      es: ["expresion genica", "expresion de genes", "genes"],
      en: ["gene expression", "genes"],
    },
    seeAlso: ["senalizacion"],
  },
  {
    id: "angiogenesis",
    category: "mechanism",
    status: "approved",
    term: { es: "Angiogénesis", en: "Angiogenesis" },
    definition: {
      es: "Formación de nuevos vasos sanguíneos a partir de otros que ya existen.",
      en: "The formation of new blood vessels from existing ones.",
    },
    matches: { es: ["angiogenesis"], en: ["angiogenesis"] },
  },
  {
    id: "mitocondria",
    category: "mechanism",
    status: "approved",
    term: { es: "Mitocondria", en: "Mitochondrion" },
    definition: {
      es: "Orgánulo de la célula donde se produce la mayor parte de su energía química.",
      en: "The cell organelle where most of its chemical energy is produced.",
    },
    matches: {
      es: ["mitocondria", "mitocondrias", "mitocondrial", "mitocondriales"],
      en: ["mitochondria", "mitochondrion", "mitochondrial"],
    },
  },
  {
    id: "apoptosis",
    category: "mechanism",
    status: "approved",
    term: { es: "Apoptosis", en: "Apoptosis" },
    definition: {
      es: "Muerte celular programada: un proceso regulado por el que una célula se desmantela a sí misma.",
      en: "Programmed cell death: a regulated process by which a cell dismantles itself.",
    },
    matches: { es: ["apoptosis"], en: ["apoptosis"] },
    seeAlso: ["senescencia"],
  },
  {
    id: "senescencia",
    category: "mechanism",
    status: "approved",
    term: { es: "Senescencia celular", en: "Cellular senescence" },
    definition: {
      es: "Estado en que una célula deja de dividirse de forma permanente sin morir. Es uno de los temas centrales de la investigación sobre envejecimiento.",
      en: "A state in which a cell permanently stops dividing without dying. It is one of the central subjects of ageing research.",
    },
    matches: {
      es: ["senescencia", "senescentes", "senescente"],
      en: ["senescence", "senescent"],
    },
    seeAlso: ["apoptosis"],
  },

  /* ---- Studies and evidence --------------------------------------------- */
  {
    id: "in-vitro",
    category: "evidence",
    status: "approved",
    term: { es: "In vitro", en: "In vitro" },
    definition: {
      es: "Estudio realizado fuera de un organismo vivo: en células, tejidos o sistemas bioquímicos, en el laboratorio.",
      en: "A study carried out outside a living organism: in cells, tissues or biochemical systems, in the laboratory.",
    },
    matches: { es: ["in vitro"], en: ["in vitro"] },
    seeAlso: ["in-vivo", "preclinico"],
  },
  {
    id: "in-vivo",
    category: "evidence",
    status: "approved",
    term: { es: "In vivo", en: "In vivo" },
    definition: {
      es: "Estudio realizado en un organismo vivo completo, animal o humano.",
      en: "A study carried out in a whole living organism, animal or human.",
    },
    matches: { es: ["in vivo"], en: ["in vivo"] },
    seeAlso: ["in-vitro", "modelo-animal"],
  },
  {
    id: "modelo-animal",
    category: "evidence",
    status: "approved",
    term: { es: "Modelo animal", en: "Animal model" },
    definition: {
      es: "Especie que se usa para estudiar un proceso biológico: ratones, ratas, cerdos, primates. Un resultado en un modelo animal no demuestra el mismo efecto en personas.",
      en: "A species used to study a biological process: mice, rats, pigs, primates. A result in an animal model does not show the same effect in people.",
    },
    matches: {
      es: [
        "modelo animal",
        "modelos animales",
        "ratones",
        "raton",
        "ratas",
        "rata",
        "minicerdos",
        "monos",
        "primates",
      ],
      en: [
        "animal model",
        "animal models",
        "mice",
        "mouse",
        "rats",
        "rat",
        "mini-pigs",
        "monkeys",
        "primates",
      ],
    },
    seeAlso: ["preclinico", "in-vivo"],
  },
  {
    id: "preclinico",
    category: "evidence",
    status: "approved",
    term: { es: "Preclínico", en: "Preclinical" },
    definition: {
      es: "Toda la investigación anterior a los estudios en personas: in vitro y en modelos animales.",
      en: "All research that comes before studies in people: in vitro and in animal models.",
    },
    matches: {
      es: ["preclinico", "preclinica", "preclinicos", "preclinicas"],
      en: ["preclinical"],
    },
    seeAlso: ["in-vitro", "modelo-animal", "ensayo-clinico"],
  },
  {
    id: "ensayo-clinico",
    category: "evidence",
    status: "approved",
    term: { es: "Ensayo clínico", en: "Clinical trial" },
    definition: {
      es: "Estudio en personas diseñado para responder una pregunta concreta, con un plan fijado antes de empezar. Se organiza por fases.",
      en: "A study in people designed to answer a specific question, with a plan fixed before it starts. Trials are organised in phases.",
    },
    matches: {
      es: ["ensayo", "ensayos", "ensayo clinico", "ensayos clinicos"],
      en: ["trial", "trials", "clinical trial", "clinical trials"],
    },
    seeAlso: ["fases", "placebo", "aleatorizado"],
  },
  {
    id: "fases",
    category: "evidence",
    status: "approved",
    term: { es: "Fases de un ensayo", en: "Trial phases" },
    definition: {
      es: "Fase 1: seguridad y tolerabilidad en un grupo pequeño. Fase 2: primeras mediciones del efecto, en decenas a cientos de participantes. Fase 3: confirmación en grupos grandes, normalmente frente a placebo o a un comparador. Un resultado de fase 2 todavía es exploratorio.",
      en: "Phase 1: safety and tolerability in a small group. Phase 2: first measurements of the effect, in tens to hundreds of participants. Phase 3: confirmation in large groups, usually against placebo or a comparator. A phase 2 result is still exploratory.",
    },
    matches: {
      es: ["fase 1", "fase 2", "fase 3", "fase 1b", "fase 2b"],
      en: ["phase 1", "phase 2", "phase 3", "phase 1b", "phase 2b"],
    },
    seeAlso: ["ensayo-clinico", "comparador-activo"],
  },
  {
    id: "placebo",
    category: "evidence",
    status: "approved",
    term: { es: "Placebo", en: "Placebo" },
    definition: {
      es: "Preparación sin actividad que recibe el grupo de control, para que la comparación distinga el efecto del compuesto del efecto de participar en el estudio.",
      en: "An inactive preparation given to the control group, so that the comparison separates the compound's effect from the effect of taking part in the study.",
    },
    matches: { es: ["placebo"], en: ["placebo"] },
    seeAlso: ["comparador-activo", "aleatorizado"],
  },
  {
    id: "comparador-activo",
    category: "evidence",
    status: "approved",
    term: { es: "Comparador activo", en: "Active comparator" },
    definition: {
      es: "Un compuesto ya estudiado que sirve de referencia en lugar de un placebo. El resultado dice cómo se compara con esa referencia, no con la ausencia de tratamiento.",
      en: "An already-studied compound used as the reference instead of a placebo. The result says how the compound compares with that reference, not with no treatment at all.",
    },
    matches: { es: ["comparador activo", "comparador"], en: ["active comparator", "comparator"] },
    seeAlso: ["placebo", "ensayo-abierto"],
  },
  {
    id: "aleatorizado",
    category: "evidence",
    status: "approved",
    term: { es: "Aleatorizado", en: "Randomised" },
    definition: {
      es: "Diseño en el que el azar decide a qué grupo va cada participante, para que los grupos sean comparables desde el inicio.",
      en: "A design in which chance decides which group each participant joins, so that the groups are comparable from the start.",
    },
    matches: {
      es: ["aleatorizado", "aleatorizados", "aleatorizada", "aleatorizadas"],
      en: ["randomised", "randomized"],
    },
    seeAlso: ["ensayo-clinico", "placebo"],
  },
  {
    id: "ensayo-abierto",
    category: "evidence",
    status: "approved",
    term: { es: "Ensayo abierto", en: "Open-label trial" },
    definition: {
      es: "Ensayo en el que participantes e investigadores saben qué recibe cada grupo. Es más susceptible a sesgos que un ensayo doble ciego.",
      en: "A trial in which participants and investigators know what each group receives. It is more open to bias than a double-blind trial.",
    },
    matches: { es: ["abierto", "ensayo abierto"], en: ["open-label", "open label"] },
    seeAlso: ["ensayo-clinico", "comparador-activo"],
  },
  {
    id: "evento-adverso",
    category: "evidence",
    status: "approved",
    term: { es: "Evento adverso", en: "Adverse event" },
    definition: {
      es: "Cualquier suceso desfavorable registrado durante un estudio, lo haya causado o no el compuesto. Los registros de NEOGEN los incluyen siempre que la fuente los reporta.",
      en: "Any unfavourable occurrence recorded during a study, whether or not the compound caused it. NEOGEN's records include them whenever the source reports them.",
    },
    matches: {
      es: ["evento adverso", "eventos adversos", "efectos adversos", "efecto adverso"],
      en: ["adverse event", "adverse events", "adverse effects", "adverse effect"],
    },
    seeAlso: ["ensayo-clinico"],
  },
  {
    id: "intervalo-confianza",
    category: "evidence",
    status: "approved",
    term: { es: "Intervalo de confianza", en: "Confidence interval" },
    definition: {
      es: "Rango de valores compatible con los datos de un estudio. Si el intervalo de una diferencia incluye el cero —o el uno, cuando se trata de una razón—, el resultado no descarta que no haya diferencia.",
      en: "The range of values compatible with a study's data. If the interval for a difference includes zero — or one, for a ratio — the result does not rule out that there is no difference.",
    },
    matches: {
      es: ["intervalo de confianza", "intervalos de confianza"],
      en: ["confidence interval", "confidence intervals"],
    },
    seeAlso: ["significancia"],
  },
  {
    id: "significancia",
    category: "evidence",
    status: "approved",
    term: { es: "Significancia estadística", en: "Statistical significance" },
    definition: {
      es: "Criterio con el que un estudio decide si una diferencia observada es poco probable por azar. Un resultado que no alcanza significancia no demuestra un efecto.",
      en: "The criterion a study uses to decide whether an observed difference is unlikely to be due to chance. A result that misses significance does not show an effect.",
    },
    matches: {
      es: ["significancia", "significativa", "significativo", "significativas", "significativos"],
      en: ["significance", "significant", "significantly"],
    },
    seeAlso: ["intervalo-confianza"],
  },
  {
    id: "hba1c",
    category: "evidence",
    status: "approved",
    term: { es: "HbA1c", en: "HbA1c" },
    definition: {
      es: "Hemoglobina glicada: una medición en sangre que refleja el nivel promedio de glucosa de los meses anteriores. Es la medida principal de los ensayos sobre metabolismo de la glucosa.",
      en: "Glycated haemoglobin: a blood measurement reflecting the average glucose level over the preceding months. It is the main measure in trials of glucose metabolism.",
    },
    matches: { es: ["hba1c"], en: ["hba1c"] },
    seeAlso: ["ensayo-clinico", "incretinas"],
  },
  {
    id: "revision-sistematica",
    category: "evidence",
    status: "approved",
    term: { es: "Revisión sistemática", en: "Systematic review" },
    definition: {
      es: "Síntesis de la literatura que sigue un método explícito y reproducible para buscar, seleccionar y evaluar los estudios sobre una pregunta.",
      en: "A synthesis of the literature that follows an explicit, reproducible method to search for, select and assess the studies on a question.",
    },
    matches: {
      es: ["revision sistematica", "revisiones sistematicas"],
      en: ["systematic review", "systematic reviews"],
    },
    seeAlso: ["metaanalisis", "revision-narrativa"],
  },
  {
    id: "metaanalisis",
    category: "evidence",
    status: "approved",
    term: { es: "Metaanálisis", en: "Meta-analysis" },
    definition: {
      es: "Combinación estadística de los resultados de varios estudios comparables en una sola estimación.",
      en: "The statistical combination of the results of several comparable studies into a single estimate.",
    },
    matches: { es: ["metaanalisis", "meta-analisis"], en: ["meta-analysis", "meta-analyses"] },
    seeAlso: ["revision-sistematica"],
  },
  {
    id: "revision-narrativa",
    category: "evidence",
    status: "approved",
    term: { es: "Revisión narrativa", en: "Narrative review" },
    definition: {
      es: "Síntesis de la literatura escrita por sus autores sin un método de búsqueda sistemático. Es útil como panorama y más débil como evidencia.",
      en: "A synthesis of the literature written by its authors without a systematic search method. Useful as an overview, weaker as evidence.",
    },
    matches: {
      es: ["revision narrativa", "revisiones narrativas"],
      en: ["narrative review", "narrative reviews"],
    },
    seeAlso: ["revision-sistematica", "revision-alcance"],
  },
  {
    id: "revision-alcance",
    category: "evidence",
    status: "approved",
    term: { es: "Revisión de alcance", en: "Scoping review" },
    definition: {
      es: "Mapa de la literatura disponible sobre un tema: qué se ha estudiado, en qué modelos y con qué lagunas. No evalúa si un efecto es real.",
      en: "A map of the available literature on a subject: what has been studied, in which models, and where the gaps are. It does not assess whether an effect is real.",
    },
    matches: {
      es: ["revision de alcance", "revisiones de alcance"],
      en: ["scoping review", "scoping reviews"],
    },
    seeAlso: ["revision-narrativa", "revision-sistematica"],
  },
  {
    id: "reporte-de-caso",
    category: "evidence",
    status: "approved",
    term: { es: "Reporte de caso", en: "Case report" },
    definition: {
      es: "Descripción de lo observado en una sola persona. Puede señalar algo inesperado, pero no permite generalizar.",
      en: "A description of what was observed in a single person. It can flag something unexpected, but it cannot be generalised.",
    },
    matches: {
      es: ["reporte de caso", "reportes de caso", "informe de caso"],
      en: ["case report", "case reports"],
    },
    seeAlso: ["evento-adverso"],
  },

  /* ---- Quality and documentation ---------------------------------------- */
  {
    id: "coa",
    category: "quality",
    status: "approved",
    term: { es: "Certificado de análisis", en: "Certificate of analysis" },
    abbreviation: "COA",
    definition: {
      es: "Informe de un laboratorio sobre una muestra concreta: qué se analizó, con qué método y con qué resultado. Cubre el lote analizado, no el compuesto en general.",
      en: "A laboratory's report on a specific sample: what was analysed, by which method and with what result. It covers the lot analysed, not the compound in general.",
    },
    matches: {
      es: ["certificado de analisis", "coa"],
      en: ["certificate of analysis", "coa"],
    },
    seeAlso: ["lote", "pureza", "hplc"],
    note: "como-leer-un-certificado-de-analisis",
    destination: "quality-model",
  },
  {
    id: "lote",
    category: "quality",
    status: "approved",
    term: { es: "Lote", en: "Lot" },
    definition: {
      es: "El conjunto de unidades producidas juntas y en las mismas condiciones. La documentación analítica pertenece siempre a un lote concreto, nunca a un compuesto en abstracto.",
      en: "The set of units produced together under the same conditions. Analytical documentation always belongs to a specific lot, never to a compound in the abstract.",
    },
    matches: { es: ["lote", "lotes"], en: ["lot", "lots", "batch"] },
    seeAlso: ["coa", "presentacion"],
    destination: "quality-model",
  },
  {
    id: "pureza",
    category: "quality",
    status: "approved",
    term: { es: "Pureza", en: "Purity" },
    definition: {
      es: "La proporción del contenido que corresponde a la molécula declarada, medida por un método analítico. Sin el análisis detrás, la cifra no significa nada.",
      en: "The share of the contents that is the declared molecule, measured by an analytical method. Without the analysis behind it, the figure means nothing.",
    },
    matches: { es: ["pureza"], en: ["purity"] },
    seeAlso: ["hplc", "coa"],
  },
  {
    id: "hplc",
    category: "quality",
    status: "approved",
    term: {
      es: "Cromatografía líquida de alta resolución",
      en: "High-performance liquid chromatography",
    },
    abbreviation: "HPLC",
    definition: {
      es: "Técnica que separa los componentes de una muestra para medir qué proporción corresponde a la molécula declarada. Es el método habitual para determinar la pureza.",
      en: "A technique that separates a sample's components to measure what share of it is the declared molecule. It is the usual method for determining purity.",
    },
    matches: { es: ["hplc", "cromatografia"], en: ["hplc", "chromatography"] },
    seeAlso: ["pureza", "espectrometria-de-masas"],
  },
  {
    id: "espectrometria-de-masas",
    category: "quality",
    status: "approved",
    term: { es: "Espectrometría de masas", en: "Mass spectrometry" },
    abbreviation: "MS",
    definition: {
      es: "Técnica que mide la masa de las moléculas de una muestra. En un certificado confirma la identidad: la masa medida se compara con la esperada para la secuencia declarada.",
      en: "A technique that measures the mass of the molecules in a sample. On a certificate it confirms identity: the measured mass is compared with the one expected for the declared sequence.",
    },
    matches: {
      es: ["espectrometria de masas"],
      en: ["mass spectrometry"],
    },
    seeAlso: ["hplc", "coa", "secuencia"],
  },
  {
    id: "analisis-de-terceros",
    category: "quality",
    status: "approved",
    term: { es: "Análisis de terceros", en: "Third-party analysis" },
    definition: {
      es: "Análisis hecho por un laboratorio independiente del vendedor y del fabricante. Su valor depende de que el informe sea verificable: un laboratorio identificable y un número de informe.",
      en: "An analysis by a laboratory independent of both seller and manufacturer. Its value depends on the report being verifiable: an identifiable laboratory and a report number.",
    },
    matches: { es: ["laboratorio independiente"], en: ["independent laboratory", "third-party"] },
    seeAlso: ["coa"],
    destination: "quality-model",
  },
  {
    id: "presentacion",
    category: "quality",
    status: "approved",
    term: { es: "Presentación", en: "Presentation" },
    definition: {
      es: "La cantidad declarada en cada vial y el número de viales por empaque. Es el dato que define qué se compra, y el nivel al que se vincula la documentación.",
      en: "The amount declared in each vial and the number of vials per pack. It defines what is being bought, and it is the level documentation attaches to.",
    },
    matches: { es: ["presentacion", "presentaciones"], en: ["presentation", "presentations"] },
    seeAlso: ["lote", "vial"],
  },

  /* ---- Materials --------------------------------------------------------- */
  {
    id: "liofilizado",
    category: "materials",
    status: "approved",
    term: { es: "Liofilizado", en: "Lyophilised" },
    definition: {
      es: "Secado por congelación: el material se congela y el agua se retira al vacío, y queda un sólido seco que tolera mejor el transporte y el almacenamiento que una solución.",
      en: "Freeze-dried: the material is frozen and the water removed under vacuum, leaving a dry solid that tolerates transport and storage better than a solution.",
    },
    matches: {
      es: ["liofilizado", "liofilizados", "liofilizada", "liofilizacion"],
      en: ["lyophilised", "lyophilized", "lyophilisation", "lyophilization", "freeze-dried"],
    },
    seeAlso: ["higroscopico", "degradacion"],
    note: "manejo-y-almacenamiento-en-laboratorio",
    destination: "handling",
  },
  {
    id: "vial",
    category: "materials",
    status: "approved",
    term: { es: "Vial", en: "Vial" },
    definition: {
      es: "Envase pequeño de vidrio, cerrado con tapón y sello, en el que se presenta un material de laboratorio.",
      en: "A small glass container, closed with a stopper and seal, in which a laboratory material is supplied.",
    },
    matches: { es: ["vial", "viales"], en: ["vial", "vials"] },
    seeAlso: ["presentacion"],
    destination: "handling",
  },
  {
    id: "higroscopico",
    category: "materials",
    status: "approved",
    term: { es: "Higroscópico", en: "Hygroscopic" },
    definition: {
      es: "Que absorbe humedad del ambiente. Los materiales liofilizados lo son, y por eso se conservan cerrados y secos.",
      en: "Taking up moisture from the air. Lyophilised materials are, which is why they are kept closed and dry.",
    },
    matches: { es: ["higroscopico", "humedad"], en: ["hygroscopic", "humidity", "moisture"] },
    seeAlso: ["liofilizado", "degradacion"],
    destination: "handling",
  },
  {
    id: "fotosensible",
    category: "materials",
    status: "approved",
    term: { es: "Fotosensible", en: "Light-sensitive" },
    definition: {
      es: "Que se degrada con la exposición a la luz, en particular a la ultravioleta.",
      en: "Degraded by exposure to light, ultraviolet light in particular.",
    },
    matches: { es: ["fotosensible", "fotosensibles"], en: ["light-sensitive", "photosensitive"] },
    seeAlso: ["degradacion"],
    destination: "handling",
  },
  {
    id: "degradacion",
    category: "materials",
    status: "approved",
    term: { es: "Degradación", en: "Degradation" },
    definition: {
      es: "Pérdida de la molécula original por reacciones químicas —con el agua, el oxígeno o la luz—. Es lo que las condiciones de almacenamiento buscan retrasar.",
      en: "Loss of the original molecule through chemical reactions — with water, oxygen or light. It is what storage conditions aim to slow down.",
    },
    matches: { es: ["degradacion"], en: ["degradation"] },
    seeAlso: ["liofilizado", "higroscopico", "fotosensible"],
    destination: "handling",
  },
  {
    id: "agua-bacteriostatica",
    category: "materials",
    status: "approved",
    term: { es: "Agua bacteriostática", en: "Bacteriostatic water" },
    definition: {
      es: "Agua estéril con un conservador que inhibe el crecimiento bacteriano. En el catálogo figura como material de laboratorio.",
      en: "Sterile water containing a preservative that inhibits bacterial growth. The catalogue lists it as a laboratory material.",
    },
    matches: { es: ["agua bacteriostatica"], en: ["bacteriostatic water"] },
    seeAlso: ["agua-esteril"],
  },
  {
    id: "agua-esteril",
    category: "materials",
    status: "approved",
    term: { es: "Agua estéril", en: "Sterile water" },
    definition: {
      es: "Agua libre de microorganismos viables, sin conservador añadido. En el catálogo figura como material de laboratorio.",
      en: "Water free of viable microorganisms, with no added preservative. The catalogue lists it as a laboratory material.",
    },
    matches: { es: ["agua esteril"], en: ["sterile water"] },
    seeAlso: ["agua-bacteriostatica"],
  },

  /* ---- How NEOGEN reads ------------------------------------------------- */
  {
    id: "uso-en-investigacion",
    category: "framework",
    status: "approved",
    term: { es: "Uso exclusivo en investigación", en: "Research use only" },
    abbreviation: "RUO",
    definition: {
      es: "La condición bajo la que se vende todo el catálogo: material para trabajo de laboratorio, no evaluado ni autorizado como medicamento, suplemento o cosmético, y no destinado a consumo ni a uso humano o veterinario.",
      en: "The condition the whole catalogue is sold under: material for laboratory work, not evaluated or authorised as a medicine, supplement or cosmetic, and not intended for consumption or for human or veterinary use.",
    },
    matches: { es: [], en: [] },
    note: "uso-exclusivo-en-investigacion",
  },
  {
    id: "registro-cientifico",
    category: "framework",
    status: "approved",
    term: { es: "Registro científico", en: "Scientific record" },
    definition: {
      es: "La ficha de un compuesto en el compendio: identidad, mecanismo, investigación publicada, límites y referencias. Existe sólo cuando hay afirmaciones con fuente que publicar.",
      en: "A compound's entry in the compendium: identity, mechanism, published research, limits and references. It exists only when there are sourced statements to publish.",
    },
    matches: { es: [], en: [] },
    seeAlso: ["afirmacion-con-fuente", "referencia"],
    destination: "compendium",
  },
  {
    id: "afirmacion-con-fuente",
    category: "framework",
    status: "approved",
    term: { es: "Afirmación con fuente", en: "Sourced statement" },
    definition: {
      es: "Frase de un registro que dice lo que reporta una fuente, en sus propios términos: mecanismo, modelo, cifra y límites. No se publica sin una referencia aprobada detrás.",
      en: "A sentence in a record that says what a source reports, in the source's own terms: mechanism, model, figure and limits. It is not published without an approved reference behind it.",
    },
    matches: { es: [], en: [] },
    seeAlso: ["referencia", "registro-cientifico"],
    destination: "start",
  },
  {
    id: "referencia",
    category: "framework",
    status: "approved",
    term: { es: "Referencia", en: "Reference" },
    definition: {
      es: "Fuente publicada —un artículo, un ensayo, una revisión— identificada por su DOI o su PMID. Cada afirmación científica de NEOGEN cita al menos una.",
      en: "A published source — an article, a trial, a review — identified by its DOI or PMID. Every scientific statement NEOGEN makes cites at least one.",
    },
    matches: { es: [], en: [] },
    seeAlso: ["doi", "afirmacion-con-fuente"],
    destination: "references",
  },
  {
    id: "doi",
    category: "framework",
    status: "approved",
    term: { es: "DOI y PMID", en: "DOI and PMID" },
    definition: {
      es: "Identificadores permanentes de una publicación. El DOI la localiza en su editorial; el PMID, en PubMed. Con cualquiera de los dos, una fuente se puede consultar directamente.",
      en: "Permanent identifiers for a publication. The DOI locates it at its publisher; the PMID, in PubMed. With either, a source can be looked up directly.",
    },
    matches: { es: [], en: [] },
    seeAlso: ["referencia"],
    destination: "references",
  },
  {
    id: "linea-de-investigacion",
    category: "framework",
    status: "approved",
    term: { es: "Línea de investigación", en: "Research line" },
    definition: {
      es: "Un receptor, una vía o un proceso que la literatura estudia. Un compuesto pertenece a una línea sólo si una afirmación con fuente de su registro lo sustenta.",
      en: "A receptor, pathway or process the literature studies. A compound belongs to a line only if a sourced statement in its record supports it.",
    },
    matches: { es: [], en: [] },
    seeAlso: ["area-de-investigacion", "afirmacion-con-fuente"],
    destination: "lines",
  },
  {
    id: "area-de-investigacion",
    category: "framework",
    status: "approved",
    term: { es: "Área de investigación", en: "Research area" },
    definition: {
      es: "Cada una de las secciones en que se organiza el catálogo. Nombra un campo de estudio, no algo que un compuesto haga.",
      en: "Each of the sections the catalogue is organised into. It names a field of study, not something a compound does.",
    },
    matches: { es: [], en: [] },
    seeAlso: ["linea-de-investigacion"],
    destination: "compendium",
  },
];
