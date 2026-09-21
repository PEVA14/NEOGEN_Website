import type { FaqEntry } from "./types";

/**
 * THE QUESTIONS.
 *
 * Ordered the way a customer meets them: what is this, under what condition is
 * it sold, what proof comes with it, and then the transaction. Entries that
 * are not `approved` do not render anywhere — they are here so the owner can
 * see the exact list of decisions standing between this page and a complete
 * one, each with what it needs.
 */
export const FAQ_ENTRIES: readonly FaqEntry[] = [
  /* ---- what this is --------------------------------------------------- */
  {
    id: "what-is-a-peptide",
    topic: "peptides",
    status: "approved",
    question: {
      es: "¿Qué es un péptido?",
      en: "What is a peptide?",
    },
    answer: {
      es: "Una cadena corta de aminoácidos, las mismas piezas con las que se construyen las proteínas. La diferencia con una proteína es de tamaño, y el orden de las piezas —la secuencia— es lo que identifica a cada péptido como una molécula distinta.",
      en: "A short chain of amino acids — the same parts proteins are built from. The difference from a protein is one of size, and the order of the parts, the sequence, is what identifies each peptide as a distinct molecule.",
    },
    links: ["peptides", "article:que-es-un-peptido"],
  },
  {
    id: "what-neogen-sells",
    topic: "peptides",
    status: "approved",
    question: {
      es: "¿Qué vende NEOGEN exactamente?",
      en: "What exactly does NEOGEN sell?",
    },
    answer: {
      es: "Compuestos de investigación en presentaciones definidas: {catalogueCount} compuestos publicados, cada uno con su nombre exacto, su cantidad declarada por vial y el número de viales por empaque. No vendemos medicamentos, suplementos ni productos cosméticos.",
      en: "Research compounds in defined presentations: {catalogueCount} published compounds, each with its exact name, the amount declared per vial and the number of vials per pack. We do not sell medicines, supplements or cosmetic products.",
    },
    links: ["products"],
  },

  /* ---- the condition of sale ------------------------------------------ */
  {
    id: "research-use-meaning",
    topic: "research-use",
    status: "approved",
    question: {
      es: "¿Qué significa «uso exclusivo en investigación»?",
      en: "What does “research use only” mean?",
    },
    answer: {
      es: "Que el material se vende para trabajo de laboratorio y para nada más. No ha sido evaluado ni autorizado como medicamento, suplemento o cosmético, y no se ofrece para consumo ni para uso humano o veterinario. Es la condición de toda la venta, no una nota al pie de algunos productos.",
      en: "That the material is sold for laboratory work and nothing else. It has not been evaluated or authorised as a medicine, supplement or cosmetic, and it is not offered for consumption or for human or veterinary use. This is the condition of the whole sale, not a footnote on some products.",
    },
    links: ["article:uso-exclusivo-en-investigacion"],
  },
  {
    id: "research-use-acknowledgement",
    topic: "research-use",
    status: "approved",
    question: {
      es: "¿Por qué tengo que confirmar algo antes de pagar?",
      en: "Why do I have to confirm something before paying?",
    },
    answer: {
      es: "Porque la condición de investigación tiene que ser explícita por ambas partes. Antes de registrar un pedido pedimos una confirmación de que el material se adquiere para investigación y no para consumo ni uso humano o veterinario. Sin esa confirmación el pedido no se crea, y queda registrada junto con el pedido.",
      en: "Because the research condition has to be explicit on both sides. Before an order is registered we ask you to confirm that the material is being acquired for research and not for consumption or human or veterinary use. Without that confirmation the order is not created, and it is recorded alongside the order.",
    },
  },
  {
    id: "personal-use",
    topic: "research-use",
    status: "approved",
    question: {
      es: "¿Puedo comprar para uso personal?",
      en: "Can I buy for personal use?",
    },
    answer: {
      es: "No. Estos materiales se venden únicamente para trabajo de investigación. Si el uso previsto es otro, NEOGEN no es el proveedor adecuado, y ninguna página de este sitio indica cómo emplear un compuesto en una persona.",
      en: "No. These materials are sold solely for research work. If the intended use is anything else, NEOGEN is not the right supplier, and no page on this site sets out how to use a compound in a person.",
    },
  },

  /* ---- documentation and quality -------------------------------------- */
  {
    id: "certified-in-mexico",
    topic: "documentation",
    status: "approved",
    question: {
      es: "¿Los péptidos de NEOGEN están certificados en México?",
      en: "Are NEOGEN's peptides certified in Mexico?",
    },
    /*
     * THE QUESTION THE STAKEHOLDER ASKED FOR, ANSWERED HONESTLY.
     *
     * No certification, registration or laboratory credential exists in this
     * repository (`content/certifications.ts` states what would be needed).
     * The answer therefore explains what the word requires and what NEOGEN
     * publishes instead — which is both true and, on this question, more
     * persuasive than a badge would be.
     */
    answer: {
      es: "No publicamos ningún sello de certificación, y conviene decir por qué: «certificado» solo significa algo con tres datos —quién lo emite, contra qué norma y qué alcance cubre— y un documento verificable de forma independiente. Cuando un documento así exista, aparecerá con esos datos. Lo que sí publicamos hoy es el modelo con el que se documenta cada presentación, y cada documento está atado al lote o a la presentación que analiza.",
      en: "We publish no certification seal, and it is worth saying why: “certified” only means something with three facts — who issued it, against which standard, and what scope it covers — plus a document you can check independently. When such a document exists, it will appear with those facts. What we do publish today is the model each presentation is documented under, and every document is tied to the lot or presentation it analyses.",
    },
    links: ["research", "article:como-leer-un-certificado-de-analisis"],
  },
  {
    id: "coa-availability",
    topic: "documentation",
    status: "approved",
    question: {
      es: "¿Los productos vienen con certificado de análisis?",
      en: "Do products come with a certificate of analysis?",
    },
    answer: {
      es: "La documentación analítica pertenece a un lote y a una presentación concretos, y aparece en la ficha del producto cuando existe para ese lote. Donde no existe un documento, no aparece un sello ni una cifra de pureza: preferimos que el catálogo se lea con lo que hay detrás, no con lo que suena bien.",
      en: "Analytical documentation belongs to a specific lot and presentation, and appears on the product page when it exists for that lot. Where no document exists, no seal and no purity figure appears: we would rather the catalogue be read for what stands behind it than for what sounds good.",
    },
    links: ["research", "article:como-leer-un-certificado-de-analisis"],
  },
  {
    id: "storage",
    topic: "handling",
    status: "approved",
    question: {
      es: "¿Cómo se almacena el material?",
      en: "How should the material be stored?",
    },
    answer: {
      es: "Los materiales liofilizados se conservan secos, fríos y al abrigo de la luz; la estabilidad de la temperatura importa tanto como su valor. Las condiciones concretas de un compuesto son un dato documentado y aparecen en su ficha cuando existe el documento correspondiente.",
      en: "Lyophilised materials are kept dry, cold and away from light; the steadiness of the temperature matters as much as its value. The specific conditions for a compound are a documented fact and appear on its page when that document exists.",
    },
    links: ["article:manejo-y-almacenamiento-en-laboratorio"],
  },

  /* ---- the transaction ------------------------------------------------ */
  {
    id: "shipping-coverage",
    topic: "shipping",
    status: "approved",
    question: {
      es: "¿A dónde envían?",
      en: "Where do you ship?",
    },
    answer: {
      es: "A todo México. No realizamos envíos internacionales: la dirección de entrega tiene que estar en territorio mexicano.",
      en: "Anywhere in Mexico. We do not ship internationally: the delivery address has to be in Mexican territory.",
    },
  },
  {
    id: "shipping-speed",
    topic: "shipping",
    status: "approved",
    /*
     * The stakeholder's "envíos a México en 24 horas" lands here, as the true
     * version of itself. `domain/fulfilment` refuses the nationwide-24h and
     * same-day claims outright; what is left is the confirmed zone, named, and
     * the real estimate for everywhere else.
     */
    answer: {
      es: "En {priorityZone} la entrega estimada es de {priorityDays} día hábil. En el resto del país, hasta {nationalDays} días hábiles, y hasta {madeToOrderDays} días hábiles cuando la presentación se prepara por pedido. Son estimaciones de entrega, no plazos garantizados, y no ofrecemos entrega el mismo día.",
      en: "In {priorityZone} the estimated delivery is {priorityDays} business day. Elsewhere in the country, up to {nationalDays} business days, and up to {madeToOrderDays} business days when the presentation is made to order. These are delivery estimates, not guaranteed windows, and we do not offer same-day delivery.",
    },
    question: {
      es: "¿Cuánto tarda el envío?",
      en: "How long does delivery take?",
    },
  },
  {
    id: "shipping-cost",
    topic: "shipping",
    status: "approved",
    question: {
      es: "¿Cuánto cuesta el envío?",
      en: "How much does shipping cost?",
    },
    answer: {
      es: "Los pedidos de {freeShipping} o más no pagan envío. Por debajo de ese monto, el checkout no cierra un pedido con un costo de envío que no pueda mostrarte antes de cobrarlo.",
      en: "Orders of {freeShipping} or more ship at no cost. Below that amount, the checkout will not close an order with a shipping cost it cannot show you before charging it.",
    },
  },
  {
    id: "payment-security",
    topic: "ordering",
    status: "approved",
    question: {
      es: "¿Cómo se paga y qué pasa con los datos de mi tarjeta?",
      en: "How do I pay, and what happens to my card details?",
    },
    /*
     * An architectural fact, not a provider capability. The processor is not
     * named: production merchant eligibility is unresolved (PROJECT_STATE §6),
     * and naming a provider the account may not be approved for would be
     * claiming a capability. What IS true in every case is where the card
     * data goes, which is also what the question is actually asking.
     */
    answer: {
      es: "El pedido se confirma y se paga con tarjeta en el mismo flujo. Los datos de la tarjeta se capturan directamente en el formulario del procesador de pagos: NEOGEN no los recibe ni los almacena en ningún momento.",
      en: "The order is confirmed and paid by card in the same flow. Card details are captured directly in the payment processor's own form: NEOGEN never receives or stores them.",
    },
  },
  {
    id: "order-changes",
    topic: "ordering",
    status: "approved",
    question: {
      es: "¿Puedo revisar el pedido antes de pagar?",
      en: "Can I review the order before paying?",
    },
    answer: {
      es: "Sí. Antes de pagar se muestra el pedido completo —líneas, precios, dirección y entrega— con la hora a la que se calcularon los precios. Si un precio cambia entre esa pantalla y el cobro, el proceso se detiene y se te muestra qué cambió; nunca se cobra el número nuevo en silencio.",
      en: "Yes. Before payment you see the complete order — lines, prices, address and delivery — with the time the prices were calculated. If a price changes between that screen and the charge, the process stops and shows you what changed; the new figure is never charged silently.",
    },
  },
  {
    id: "contact",
    topic: "contact",
    status: "approved",
    question: {
      es: "¿Cómo contacto a NEOGEN?",
      en: "How do I contact NEOGEN?",
    },
    answer: {
      es: "Por teléfono, al {phone}. Es el único canal de atención que opera hoy; cuando exista un correo de soporte, aparecerá aquí.",
      en: "By phone, on {phone}. It is the only support channel operating today; when a support email exists, it will appear here.",
    },
  },

  /* ---- NOT PUBLISHED: decisions the owner has to make ------------------ */
  {
    /*
     * The single most-asked commerce question after shipping. It cannot be
     * answered from anything that exists: there is no returns policy, no
     * cancellation window and no counsel review (PROJECT_STATE §6, item 6).
     */
    id: "returns",
    topic: "ordering",
    status: "owner-review",
    question: {
      es: "¿Puedo cancelar o devolver un pedido?",
      en: "Can I cancel or return an order?",
    },
    answer: { es: "", en: "" },
    blockedOn:
      "No returns or cancellation policy exists. The owner must decide: whether an order can be cancelled before dispatch, whether an unopened sealed vial can be returned, who pays return shipping, and the window — then counsel must review it as `policies.returns`. PROFECO rules on distance selling apply to the wording.",
  },
  {
    id: "age",
    topic: "ordering",
    status: "owner-review",
    question: {
      es: "¿Hay una edad mínima para comprar?",
      en: "Is there a minimum age to buy?",
    },
    answer: { es: "", en: "" },
    blockedOn:
      "The owner's answer was 'a simple one, +18 for now, maybe in the ToS' — a decision to make a rule, not a rule. It needs the final wording, the place it lives (Terms or its own declaration at checkout), and whether anything verifies it.",
  },
  {
    id: "shipping-rate",
    topic: "shipping",
    status: "owner-review",
    question: {
      es: "¿Cuál es la tarifa de envío exacta para mi dirección?",
      en: "What is the exact shipping rate for my address?",
    },
    answer: { es: "", en: "" },
    blockedOn:
      "No rate model and no national courier. `siteConfig.tbd.shippingRates` and `nationalCourier` are null, and the checkout refuses to quote below the free-shipping threshold rather than guess. Needs a carrier and a rate table, or a flat rate the owner sets.",
  },
  {
    id: "cold-chain",
    topic: "shipping",
    status: "owner-review",
    question: {
      es: "¿Los envíos viajan con cadena de frío?",
      en: "Do shipments travel temperature-controlled?",
    },
    answer: { es: "", en: "" },
    blockedOn:
      "The owner's answer was 'shouldn't need it, unsure', which is a product-integrity determination nobody has made. Needs a per-compound answer, or a supplier statement covering the catalogue.",
  },
];
