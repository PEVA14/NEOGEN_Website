import type { Article } from "./types";

/**
 * THE NOTES — NEOGEN's editorial register.
 *
 * Four, written to be useful to someone who has just met the word "peptide"
 * and is trying to work out what this shop actually sells. They are also the
 * organic-search surface: each answers a question people genuinely type, in
 * the vocabulary they type it in.
 *
 * WHAT IS DELIBERATELY NOT HERE, AND WHY IT NEVER WILL BE.
 * -------------------------------------------------------
 * The highest-traffic searches around these compounds are about human use:
 * what to take, how much, how often, what results to expect. Every one of them
 * is refused. Not because the gate would catch the vocabulary — it would — but
 * because a shop that sells research materials and publishes a usage guide has
 * said in public that it knows what its customers are really doing, and has
 * helped. There is no version of that which is compatible with the condition
 * these products are sold under.
 *
 * So the notes stay on the four things NEOGEN can speak about honestly:
 * what the words mean, what the documentation is, how the materials are
 * handled, and what "research use only" actually commits both sides to. Each
 * block declares what it rests on — a definition, NEOGEN's own practice, or a
 * citation — and `check:content` fails the build if a `sourced` block turns up
 * without approved references behind it.
 */
export const ARTICLES: readonly Article[] = [
  /* ---------------------------------------------------------------------- */
  {
    slug: "que-es-un-peptido",
    topic: "vocabulary",
    status: "approved",
    publishedOn: "2026-09-20",
    updatedOn: null,
    title: {
      es: "¿Qué es un péptido?",
      en: "What is a peptide?",
    },
    summary: {
      es: "Una explicación breve y sin jerga: qué es un péptido, en qué se diferencia de una proteína y por qué se estudian en laboratorio.",
      en: "A short, jargon-free explanation: what a peptide is, how it differs from a protein, and why laboratories study them.",
    },
    body: [
      {
        id: "definition",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "Un péptido es una cadena corta de aminoácidos unidos entre sí. Los aminoácidos son las piezas con las que el cuerpo construye las proteínas, y la diferencia entre un péptido y una proteína es sobre todo de tamaño: unas pocas decenas de piezas frente a cientos o miles. Esa cadena corta es lo suficientemente pequeña para sintetizarse con precisión en un laboratorio y lo suficientemente específica para que cada secuencia sea una molécula distinta.",
          en: "A peptide is a short chain of amino acids joined together. Amino acids are the parts the body builds proteins from, and the difference between a peptide and a protein is mostly one of size: a few dozen parts rather than hundreds or thousands. That short chain is small enough to be synthesised precisely in a laboratory and specific enough that every sequence is a distinct molecule.",
        },
      },
      {
        id: "sequence",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "El orden de los aminoácidos es la identidad del péptido. Cambiar una sola pieza de la secuencia produce una molécula diferente, con un peso molecular diferente y un comportamiento diferente en el análisis. Por eso, en el catálogo, cada compuesto aparece con su nombre exacto y su presentación exacta: el nombre no es una etiqueta comercial, es la descripción de lo que hay en el vial.",
          en: "The order of the amino acids is the peptide's identity. Change a single part of the sequence and you have a different molecule, with a different molecular weight and different behaviour under analysis. That is why every compound in the catalogue appears with its exact name and its exact presentation: the name is not a commercial label, it is the description of what is in the vial.",
        },
      },
      {
        id: "words",
        kind: "heading",
        editorialClass: "definition",
        text: {
          es: "Las palabras que verás en el catálogo",
          en: "The words you will see in the catalogue",
        },
      },
      {
        id: "glossary",
        kind: "terms",
        editorialClass: "definition",
        terms: [
          {
            term: { es: "Secuencia", en: "Sequence" },
            definition: {
              es: "El orden de los aminoácidos que forman el péptido. Es lo que lo identifica.",
              en: "The order of the amino acids that make up the peptide. It is what identifies it.",
            },
          },
          {
            term: { es: "Liofilizado", en: "Lyophilised" },
            definition: {
              es: "Secado por congelación. El material se congela y el agua se retira al vacío, quedando un polvo estable que tolera mejor el transporte y el almacenamiento que una solución.",
              en: "Freeze-dried. The material is frozen and the water drawn off under vacuum, leaving a stable powder that travels and stores better than a solution.",
            },
          },
          {
            term: { es: "Presentación", en: "Presentation" },
            definition: {
              es: "La cantidad declarada en cada vial y el número de viales por empaque. Es el dato que define lo que se compra.",
              en: "The amount declared in each vial and the number of vials per pack. It is the figure that defines what is being bought.",
            },
          },
          {
            term: { es: "Lote", en: "Lot" },
            definition: {
              es: "El conjunto de unidades producidas juntas bajo las mismas condiciones. La documentación analítica siempre pertenece a un lote concreto, nunca a un compuesto en abstracto.",
              en: "The set of units produced together under the same conditions. Analytical documentation always belongs to a specific lot, never to a compound in the abstract.",
            },
          },
          {
            term: { es: "Pureza", en: "Purity" },
            definition: {
              es: "La proporción del contenido que corresponde a la molécula declarada, medida por un método analítico. Es un resultado de laboratorio: sin el análisis detrás, la cifra no significa nada.",
              en: "The proportion of the contents that is the declared molecule, measured by an analytical method. It is a laboratory result: without the analysis behind it, the figure means nothing.",
            },
          },
        ],
      },
      {
        id: "why-studied",
        kind: "heading",
        editorialClass: "definition",
        text: { es: "Por qué se estudian", en: "Why they are studied" },
      },
      {
        id: "why-body",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "Los péptidos son objeto de investigación porque combinan dos propiedades poco frecuentes: son específicos, porque su secuencia determina con qué interactúan, y son sintetizables, porque su tamaño permite producirlos y purificarlos de forma reproducible. Esa combinación los hace herramientas útiles en el laboratorio, donde se usan para estudiar sistemas biológicos con un grado de control que moléculas más grandes no permiten.",
          en: "Peptides are studied because they combine two uncommon properties: they are specific, because their sequence determines what they interact with, and they are synthesisable, because their size makes them reproducible to produce and purify. That combination makes them useful laboratory tools, used to study biological systems with a degree of control that larger molecules do not allow.",
        },
      },
      {
        id: "boundary",
        kind: "note",
        editorialClass: "practice",
        text: {
          es: "Esta nota explica qué es un péptido como categoría de molécula. No describe lo que hace ningún compuesto del catálogo: eso se documenta producto por producto, con las referencias publicadas que lo sustentan, y nunca como texto general.",
          en: "This note explains what a peptide is as a category of molecule. It does not describe what any compound in the catalogue does: that is documented product by product, with the published references behind it, and never as general copy.",
        },
      },
    ],
    related: { products: ["reta", "semaglutide"], areas: ["metabolic", "materials"] },
  },

  /* ---------------------------------------------------------------------- */
  {
    slug: "uso-exclusivo-en-investigacion",
    topic: "research-use",
    status: "approved",
    publishedOn: "2026-09-20",
    updatedOn: null,
    title: {
      es: "Qué significa «uso exclusivo en investigación»",
      en: "What “research use only” means",
    },
    summary: {
      es: "Qué condición acompaña a cada producto NEOGEN, qué implica para quien compra y por qué no es un tecnicismo.",
      en: "The condition attached to every NEOGEN product, what it means for the buyer, and why it is not a technicality.",
    },
    body: [
      {
        id: "what",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "«Uso exclusivo en investigación» —RUO, por sus siglas en inglés— describe un material destinado al trabajo de laboratorio y a nada más. No es un grado de calidad ni una categoría de producto: es la condición bajo la cual se vende. Un material RUO no ha sido evaluado ni autorizado como medicamento, como suplemento ni como producto cosmético, y no se ofrece para ninguno de esos fines.",
          en: "“Research use only” — RUO — describes a material intended for laboratory work and nothing else. It is not a grade of quality or a category of product: it is the condition under which it is sold. An RUO material has not been evaluated or authorised as a medicine, a supplement or a cosmetic product, and it is not offered for any of those purposes.",
        },
      },
      {
        id: "neogen",
        kind: "heading",
        editorialClass: "practice",
        text: { es: "Cómo lo aplica NEOGEN", en: "How NEOGEN applies it" },
      },
      {
        id: "practice-list",
        kind: "list",
        editorialClass: "practice",
        items: {
          es: [
            "Todo el catálogo se vende bajo esta condición, sin excepciones por producto.",
            "El sitio no publica cantidades de uso, formas de empleo ni indicaciones: no existen en el modelo de contenido y el sistema de verificación rechaza ese vocabulario antes de una publicación.",
            "Ninguna página afirma que un compuesto sirva para diagnosticar, tratar, curar o prevenir nada.",
            "En la compra se pide una confirmación explícita de esta condición antes de registrar el pedido, y esa confirmación queda asociada al pedido.",
          ],
          en: [
            "The whole catalogue is sold under this condition, with no per-product exceptions.",
            "The site publishes no usage amounts, methods or indications: they do not exist in the content model, and the verification system rejects that vocabulary before anything can be published.",
            "No page claims that a compound diagnoses, treats, cures or prevents anything.",
            "The purchase asks for an explicit confirmation of this condition before the order is registered, and that confirmation is recorded with the order.",
          ],
        },
      },
      {
        id: "not-a-loophole",
        kind: "heading",
        editorialClass: "practice",
        text: { es: "No es un resquicio legal", en: "It is not a loophole" },
      },
      {
        id: "loophole-body",
        kind: "paragraph",
        editorialClass: "practice",
        text: {
          es: "Conviene decirlo con claridad, porque en este sector se dice poco: la etiqueta de investigación no cambia lo que un material es ni convierte en lícita una operación que no lo sea. La regulación mexicana atiende al destino real de un producto, no a la leyenda impresa en la caja. NEOGEN lo trata como lo que es —la descripción honesta de para qué se vende algo— y no como una fórmula que resuelva nada.",
          en: "This is worth saying plainly, because the sector rarely does: a research label does not change what a material is, and it does not make a transaction lawful that otherwise would not be. Mexican regulation looks at a product's actual destination, not at the wording printed on the box. NEOGEN treats it as what it is — the honest description of what something is sold for — and not as a formula that settles anything.",
        },
      },
      {
        id: "buyer",
        kind: "note",
        editorialClass: "practice",
        text: {
          es: "Al confirmar un pedido, quien compra declara que adquiere el material para trabajo de investigación y que no lo destinará a consumo ni a uso humano o veterinario. Si ese no es el uso previsto, el material no es para esa persona.",
          en: "By confirming an order, the buyer declares that they are acquiring the material for research work and will not direct it to human or veterinary consumption or use. If that is not the intended use, the material is not for them.",
        },
      },
    ],
    related: { products: [], areas: [] },
  },

  /* ---------------------------------------------------------------------- */
  {
    slug: "como-leer-un-certificado-de-analisis",
    topic: "documentation",
    status: "approved",
    publishedOn: "2026-09-20",
    updatedOn: null,
    title: {
      es: "Cómo leer un certificado de análisis",
      en: "How to read a certificate of analysis",
    },
    summary: {
      es: "Qué campos tiene un COA, qué significa cada uno y cómo distinguir un documento que verifica algo de uno que solo lo parece.",
      en: "What fields a COA carries, what each one means, and how to tell a document that verifies something from one that merely looks like it does.",
    },
    body: [
      {
        id: "intro",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "Un certificado de análisis (COA) es el informe de un laboratorio sobre una muestra concreta. Su valor está en la precisión con la que responde a tres preguntas: qué se analizó, con qué método y con qué resultado. Un documento que no responde a las tres no verifica nada, por bien presentado que esté.",
          en: "A certificate of analysis (COA) is a laboratory's report on one specific sample. Its value lies in how precisely it answers three questions: what was analysed, by what method, and with what result. A document that does not answer all three verifies nothing, however well presented it is.",
        },
      },
      {
        id: "fields-heading",
        kind: "heading",
        editorialClass: "definition",
        text: { es: "Los campos que importan", en: "The fields that matter" },
      },
      {
        id: "fields",
        kind: "terms",
        editorialClass: "definition",
        terms: [
          {
            term: { es: "Identificación de la muestra", en: "Sample identification" },
            definition: {
              es: "Qué llegó al laboratorio y de qué lote procede. Sin un identificador de lote, el informe no puede vincularse con el material que se tiene delante.",
              en: "What reached the laboratory and which lot it came from. Without a lot identifier, the report cannot be tied to the material in front of you.",
            },
          },
          {
            term: { es: "Identidad", en: "Identity" },
            definition: {
              es: "La confirmación de que la molécula es la declarada, normalmente por espectrometría de masas: se compara el peso molecular medido con el esperado para esa secuencia.",
              en: "Confirmation that the molecule is the declared one, usually by mass spectrometry: the measured molecular weight is compared with the one expected for that sequence.",
            },
          },
          {
            term: { es: "Pureza", en: "Purity" },
            definition: {
              es: "La proporción del contenido que corresponde a la molécula declarada, habitualmente por HPLC. La cifra solo se interpreta junto al método: sin él, es un número suelto.",
              en: "The proportion of the contents that is the declared molecule, usually by HPLC. The figure is only meaningful alongside the method: without it, it is a loose number.",
            },
          },
          {
            term: { es: "Fecha y firma", en: "Date and signature" },
            definition: {
              es: "Cuándo se hizo el análisis y quién responde por él. Un informe sin laboratorio identificable no es verificable por nadie.",
              en: "When the analysis was done and who stands behind it. A report with no identifiable laboratory is verifiable by nobody.",
            },
          },
        ],
      },
      {
        id: "scope-heading",
        kind: "heading",
        editorialClass: "definition",
        text: {
          es: "Un COA cubre un lote, no un catálogo",
          en: "A COA covers a lot, not a catalogue",
        },
      },
      {
        id: "scope",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "Este es el punto que más se estira en la práctica. Un informe describe la muestra que se analizó: ese lote, esa presentación, ese día. No se extiende a otras presentaciones del mismo compuesto, ni a producciones posteriores, ni al resto del catálogo. Un sitio que presenta un análisis como si cubriera todo lo que vende está afirmando algo que su propio documento no dice.",
          en: "This is the point most often stretched in practice. A report describes the sample that was analysed: that lot, that presentation, that day. It does not extend to other presentations of the same compound, to later production, or to the rest of the catalogue. A site that presents one analysis as if it covered everything it sells is asserting something its own document does not say.",
        },
      },
      {
        id: "neogen-heading",
        kind: "heading",
        editorialClass: "practice",
        text: { es: "Cómo lo trata NEOGEN", en: "How NEOGEN treats it" },
      },
      {
        id: "neogen-body",
        kind: "paragraph",
        editorialClass: "practice",
        text: {
          es: "La documentación en este sitio está atada a una presentación o a un lote concreto, nunca al compuesto en general, y el modelo completo puede consultarse en NEOGEN Research. Donde no existe un documento, no aparece un sello: una cifra de pureza sin informe detrás es exactamente el tipo de dato que este sitio no publica.",
          en: "Documentation on this site is tied to a specific presentation or lot, never to the compound in general, and the full model can be read in NEOGEN Research. Where no document exists, no seal appears: a purity figure with no report behind it is exactly the kind of data this site does not publish.",
        },
      },
    ],
    related: { products: [], areas: ["materials"] },
  },

  /* ---------------------------------------------------------------------- */
  {
    slug: "manejo-y-almacenamiento-en-laboratorio",
    topic: "handling",
    status: "approved",
    publishedOn: "2026-09-20",
    updatedOn: null,
    title: {
      es: "Manejo y almacenamiento de materiales liofilizados",
      en: "Handling and storing lyophilised materials",
    },
    summary: {
      es: "Qué afecta a la estabilidad de un material liofilizado y por qué las condiciones concretas se publican por producto, no como regla general.",
      en: "What affects the stability of a lyophilised material, and why specific conditions are published per product rather than as a general rule.",
    },
    body: [
      {
        id: "intro",
        kind: "paragraph",
        editorialClass: "definition",
        text: {
          es: "Un material liofilizado es un sólido seco, y su estabilidad depende sobre todo de mantenerlo seco. Los tres factores que se vigilan en cualquier laboratorio son la temperatura, la humedad y la luz; el cuarto, menos evidente, es el número de veces que un vial cambia de condiciones.",
          en: "A lyophilised material is a dry solid, and its stability depends above all on keeping it dry. The three factors watched in any laboratory are temperature, humidity and light; the fourth, less obvious, is how many times a vial changes conditions.",
        },
      },
      {
        id: "factors",
        kind: "terms",
        editorialClass: "definition",
        terms: [
          {
            term: { es: "Temperatura", en: "Temperature" },
            definition: {
              es: "El frío ralentiza la degradación química. Lo relevante no es solo el valor, sino su estabilidad: una temperatura constante es preferible a una baja pero fluctuante.",
              en: "Cold slows chemical degradation. What matters is not only the value but its steadiness: a constant temperature is preferable to a low but fluctuating one.",
            },
          },
          {
            term: { es: "Humedad", en: "Humidity" },
            definition: {
              es: "El agua es lo que la liofilización retira. Un vial que se abre en un ambiente húmedo recupera parte de ella, y con ella la vía de degradación que se había eliminado.",
              en: "Water is what freeze-drying removes. A vial opened in a humid environment takes some of it back, and with it the degradation route that had been eliminated.",
            },
          },
          {
            term: { es: "Luz", en: "Light" },
            definition: {
              es: "Algunas secuencias son sensibles a la luz ultravioleta. El almacenamiento en oscuridad es la práctica habitual precisamente porque no cuesta nada.",
              en: "Some sequences are sensitive to ultraviolet light. Storing in the dark is standard practice precisely because it costs nothing.",
            },
          },
          {
            term: { es: "Cambios de temperatura", en: "Temperature swings" },
            definition: {
              es: "Cada paso de frío a temperatura ambiente y de vuelta somete al material a condensación. Sacar un vial una vez es distinto de sacarlo diez.",
              en: "Every move from cold to room temperature and back exposes the material to condensation. Taking a vial out once is not the same as taking it out ten times.",
            },
          },
        ],
      },
      {
        id: "transport-heading",
        kind: "heading",
        editorialClass: "practice",
        text: { es: "Qué hace NEOGEN en el envío", en: "What NEOGEN does in transit" },
      },
      {
        id: "transport",
        kind: "paragraph",
        editorialClass: "practice",
        text: {
          es: "El material viaja liofilizado y sellado, en empaque que lo protege de la luz y del golpe. NEOGEN no afirma tener cadena de frío en tránsito: es una capacidad que o se tiene y se documenta, o no se menciona. Si el envío de un producto llega a requerirla, la condición se publicará en la ficha de ese producto antes de venderse así.",
          en: "Material travels lyophilised and sealed, in packaging that protects it from light and impact. NEOGEN does not claim temperature-controlled transport: that is a capability you either have and document, or do not mention. If shipping a product comes to require it, the condition will be published on that product's page before it is sold that way.",
        },
      },
      {
        id: "per-product",
        kind: "note",
        editorialClass: "practice",
        text: {
          es: "Esta nota describe la práctica general de laboratorio para materiales liofilizados. Las condiciones concretas de un compuesto son un dato documentado, no una regla común: cuando existe el documento de manejo y almacenamiento de una presentación, aparece en su ficha; mientras no exista, el sitio no lo sustituye por una regla genérica.",
          en: "This note describes general laboratory practice for lyophilised materials. The specific conditions for a compound are a documented fact, not a common rule: where a handling-and-storage document exists for a presentation, it appears on its page; until it does, the site does not substitute a generic instruction for it.",
        },
      },
    ],
    related: { products: [], areas: ["materials"] },
  },
];
