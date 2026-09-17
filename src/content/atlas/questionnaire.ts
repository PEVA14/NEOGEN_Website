import type { AtlasQuestionnaire } from "@/domain/atlas/questionnaire";

/**
 * ===========================================================================
 *  THE ATLAS QUESTIONNAIRE — THIS IS THE FILE TO EDIT.
 * ===========================================================================
 *
 * Every question a visitor is asked, its wording in both languages, its
 * options and their order live here and nowhere else. Adding, removing,
 * reordering or rewriting a question is a change to this file alone: no
 * component, no policy and no check needs to move with it.
 *
 * See `docs/ATLAS_QUESTIONNAIRE.md` for the full guide. The short version:
 *
 *   GROUPS are the steps, in order, and the progress rail reads its names
 *   from `label`.
 *
 *   KINDS are `single-select`, `multi-select`, `toggle`, `number`, `range`,
 *   `short-text` and `long-text`. The renderer draws each one; `render` and
 *   `columns` choose between existing presentations of a select.
 *
 *   IDS are machine-readable and permanent. `id` is the answer's key, and an
 *   option's `id` is the stored answer — rewrite a `label` freely, but change
 *   an `id` only deliberately, and bump `version` when you do so saved drafts
 *   are discarded instead of restored wrong.
 *
 *   ROLE is what the answer is allowed to feed. `ATLAS_POLICY` (in
 *   `domain/atlas/policy.ts`) maps each role to the uses it permits, and the
 *   visitor is shown that mapping on the result page. A question with NO role
 *   is collected and echoed back, and can move nothing. Roles are optional and
 *   each may be filled once; drop a question and its role falls back to the
 *   default in `ROLE_DEFAULTS`.
 *
 *   OPTIONS are either `static` — written here, with ids and labels — or
 *   `registry`, resolved at render time from NEOGEN's own registries
 *   (`discovery-areas`, `published-products`, `research-functions`). Never
 *   copy a product, price, count or slug into this file: name the registry and
 *   the current facts are read for you.
 *
 *   VISIBILITY: `visibleWhen` shows a question only while a condition over
 *   EARLIER answers holds. `hideWithoutOptions` drops a registry question that
 *   currently has nothing to offer.
 *
 * WHAT MAY NOT BE ASKED HERE. Atlas does not select compounds from a person's
 * health, body, measurements or medication, and does not ask for a personal
 * outcome to match a compound to. A free-text note is screened for that
 * material and discarded whole when it appears (`domain/atlas/screen.ts`), and
 * `check:content` fails on dosing vocabulary anywhere in this file.
 */
export const ATLAS_QUESTIONNAIRE: AtlasQuestionnaire = {
  /* Bump when a change would make a stored draft wrong. */
  version: "3",
  groups: [
    /* ---- 01 Goals -------------------------------------------------------- */
    {
      id: "goals",
      label: { es: "Objetivos", en: "Goals" },
      title: { es: "¿Qué te trae a NEOGEN?", en: "What brings you to NEOGEN?" },
      lede: {
        es: "Empecemos por lo que buscas. Estas respuestas definen qué productos te mostramos.",
        en: "Let's start with what you're looking for. These answers decide which products we show you.",
      },
      questions: [
        {
          id: "topics",
          kind: "multi-select",
          role: "topics",
          required: true,
          recap: true,
          ranked: true,
          min: 1,
          max: 3,
          render: "tiles",
          shortLabel: { es: "Temas", en: "Topics" },
          label: { es: "¿Qué temas te interesan?", en: "Which topics interest you?" },
          hint: {
            es: "Elige hasta tres, en orden de importancia.",
            en: "Pick up to three, most important first.",
          },
          options: { kind: "registry", registry: "discovery-areas" },
        },
        {
          id: "research-functions",
          kind: "multi-select",
          role: "research-functions",
          recap: true,
          max: 3,
          columns: 3,
          hideWithoutOptions: true,
          shortLabel: { es: "Funciones de investigación", en: "Research functions" },
          label: {
            es: "¿Qué función te interesa investigar?",
            en: "Which function do you want to research?",
          },
          hint: {
            es: "Opcional. Hasta tres mecanismos o procesos, tal como los describen las fuentes publicadas. Sólo aparecen los que tienen compuestos con fuentes revisadas.",
            en: "Optional. Up to three mechanisms or processes, as published sources describe them. Only those with source-reviewed compounds appear.",
          },
          options: { kind: "registry", registry: "research-functions" },
        },
        {
          id: "intent",
          kind: "single-select",
          role: "intent",
          recap: true,
          default: "first-order",
          columns: 3,
          shortLabel: { es: "Objetivo", en: "Goal" },
          label: { es: "¿Qué quieres lograr hoy?", en: "What do you want to get done today?" },
          options: {
            kind: "static",
            items: [
              {
                id: "first-order",
                label: { es: "Hacer mi primer pedido", en: "Place my first order" },
                hint: {
                  es: "Quiero saber exactamente por dónde empezar.",
                  en: "I want to know exactly where to start.",
                },
              },
              {
                id: "compare",
                label: { es: "Comparar opciones", en: "Compare options" },
                hint: {
                  es: "Ver alternativas antes de decidir.",
                  en: "See the alternatives before deciding.",
                },
              },
              {
                id: "deepen",
                label: { es: "Conocer a fondo un tema", en: "Go deep on one topic" },
                hint: {
                  es: "Ya sé qué me interesa; quiero ver todo lo que hay.",
                  en: "I know what interests me; show me everything there is.",
                },
              },
              {
                id: "cover-topics",
                label: { es: "Cubrir varios temas", en: "Cover several topics" },
                hint: {
                  es: "Un pedido que abarque todo lo que me interesa.",
                  en: "One order that spans everything I care about.",
                },
              },
              {
                id: "browse",
                label: { es: "Sólo explorar", en: "Just exploring" },
                hint: {
                  es: "Conocer el catálogo sin prisa.",
                  en: "Get to know the catalogue, no rush.",
                },
              },
            ],
          },
        },
        {
          id: "products-in-mind",
          kind: "multi-select",
          role: "products-in-mind",
          recap: true,
          max: 3,
          render: "search",
          shortLabel: { es: "Productos en mente", en: "Products in mind" },
          label: {
            es: "¿Ya tienes productos en mente?",
            en: "Do you already have products in mind?",
          },
          hint: {
            es: "Opcional. Hasta tres: Atlas los incluye y te muestra qué más hay cerca.",
            en: "Optional. Up to three: Atlas includes them and shows you what else is close by.",
          },
          options: { kind: "registry", registry: "published-products" },
        },
      ],
    },

    /* ---- 02 About you ---------------------------------------------------- */
    {
      id: "you",
      label: { es: "Sobre ti", en: "About you" },
      title: { es: "Cuéntanos de ti", en: "Tell us about you" },
      lede: {
        es: "Así ajustamos cuántos productos mostrarte y cómo explicártelos.",
        en: "This decides how many products we show you and how we explain them.",
      },
      questions: [
        {
          id: "first-name",
          kind: "short-text",
          role: "first-name",
          maxLength: 40,
          autoComplete: "given-name",
          shortLabel: { es: "Nombre", en: "Name" },
          label: { es: "¿Cómo te llamas?", en: "What's your name?" },
          hint: {
            es: "Opcional. Sólo lo usamos en esta página; no se envía a la IA.",
            en: "Optional. Used only on this page; it is not sent to the AI.",
          },
          placeholder: { es: "Tu nombre", en: "Your name" },
        },
        {
          id: "experience",
          kind: "single-select",
          role: "experience",
          recap: true,
          default: "new",
          columns: 3,
          shortLabel: { es: "Experiencia", en: "Experience" },
          label: {
            es: "¿Qué experiencia tienes con péptidos y productos como estos?",
            en: "How much experience do you have with peptides and products like these?",
          },
          options: {
            kind: "static",
            items: [
              {
                id: "new",
                label: { es: "Es mi primera vez", en: "This is my first time" },
                hint: {
                  es: "Prefiero empezar con algo sencillo.",
                  en: "I'd rather start simple.",
                },
              },
              {
                id: "some",
                label: { es: "Ya he comprado antes", en: "I've bought before" },
                hint: { es: "Conozco lo básico.", en: "I know the basics." },
              },
              {
                id: "experienced",
                label: { es: "Tengo mucha experiencia", en: "I'm very experienced" },
                hint: { es: "Muéstrame todo el detalle.", en: "Show me all the detail." },
              },
            ],
          },
        },
        {
          id: "history",
          kind: "single-select",
          role: "history",
          default: "first-time",
          render: "pills",
          shortLabel: { es: "Con NEOGEN", en: "With NEOGEN" },
          label: {
            es: "¿Has comprado en NEOGEN antes?",
            en: "Have you ordered from NEOGEN before?",
          },
          options: {
            kind: "static",
            items: [
              {
                id: "first-time",
                label: { es: "Es mi primera vez en NEOGEN", en: "First time at NEOGEN" },
              },
              {
                id: "returning",
                label: { es: "Ya soy cliente", en: "I'm a returning customer" },
              },
            ],
          },
        },
        {
          id: "priorities",
          kind: "multi-select",
          role: "priorities",
          max: 2,
          columns: 4,
          shortLabel: { es: "Lo más importante", en: "What matters most" },
          label: { es: "¿Qué es lo más importante para ti?", en: "What matters most to you?" },
          hint: { es: "Elige hasta dos.", en: "Pick up to two." },
          options: {
            kind: "static",
            items: [
              {
                id: "documentation",
                label: { es: "Documentación disponible", en: "Available documentation" },
                hint: {
                  es: "Productos con documentos publicados primero.",
                  en: "Products with published documents first.",
                },
              },
              {
                id: "price",
                label: { es: "Buen precio", en: "Good price" },
                hint: {
                  es: "Las opciones más accesibles primero.",
                  en: "The most accessible options first.",
                },
              },
              {
                id: "signature",
                label: { es: "Productos insignia", en: "Signature products" },
                hint: {
                  es: "RETA, GLOW y GHK-Cu, la línea distintiva de NEOGEN.",
                  en: "RETA, GLOW and GHK-Cu, NEOGEN's signature line.",
                },
              },
              {
                id: "overlap",
                label: { es: "Que cubra varios temas", en: "Covers several topics" },
                hint: {
                  es: "Productos que están en más de uno de tus temas.",
                  en: "Products that sit in more than one of your topics.",
                },
              },
            ],
          },
        },
        {
          id: "explanation-style",
          kind: "single-select",
          role: "explanation-style",
          default: "direct",
          columns: 2,
          shortLabel: { es: "Explicación", en: "Explanation" },
          label: {
            es: "¿Cómo prefieres que te lo expliquemos?",
            en: "How should we explain it?",
          },
          options: {
            kind: "static",
            items: [
              {
                id: "direct",
                label: { es: "Directo y breve", en: "Short and direct" },
                hint: { es: "Sólo lo esencial.", en: "Just the essentials." },
              },
              {
                id: "detailed",
                label: { es: "Con detalle", en: "In detail" },
                hint: { es: "Todas las razones.", en: "Every reason." },
              },
            ],
          },
        },
      ],
    },

    /* ---- 03 Preferences -------------------------------------------------- */
    {
      id: "preferences",
      label: { es: "Preferencias", en: "Preferences" },
      title: { es: "Tus preferencias", en: "Your preferences" },
      lede: {
        es: "Cómo quieres que sean los productos que te sugerimos.",
        en: "What you want the products we suggest to be like.",
      },
      questions: [
        {
          id: "forms",
          kind: "multi-select",
          role: "forms",
          render: "pills",
          shortLabel: { es: "Formato", en: "Format" },
          label: { es: "¿Tienes preferencia de formato?", en: "Any format preference?" },
          hint: {
            es: "Opcional. Déjalo vacío si te da igual.",
            en: "Optional. Leave it empty if you don't mind.",
          },
          options: {
            kind: "static",
            items: [
              { id: "solid", label: { es: "Polvo liofilizado", en: "Lyophilised powder" } },
              { id: "solution", label: { es: "Solución", en: "Solution" } },
              { id: "volume", label: { es: "Por volumen", en: "By volume" } },
              { id: "iu", label: { es: "Unidades (UI)", en: "Units (IU)" } },
              { id: "blend", label: { es: "Mezclas", en: "Blends" } },
            ],
          },
        },
        {
          id: "presentation-size",
          kind: "single-select",
          role: "presentation-size",
          default: "no-preference",
          columns: 3,
          shortLabel: { es: "Tamaño", en: "Size" },
          label: {
            es: "¿Qué tamaño de presentación prefieres?",
            en: "Which presentation size do you prefer?",
          },
          options: {
            kind: "static",
            items: [
              {
                id: "smallest",
                label: { es: "La más pequeña", en: "The smallest" },
                hint: { es: "Para empezar con menos.", en: "To start with less." },
              },
              {
                id: "largest",
                label: { es: "La más grande", en: "The largest" },
                hint: {
                  es: "La mayor que quepa en tu presupuesto.",
                  en: "The biggest that fits your budget.",
                },
              },
              {
                id: "no-preference",
                label: { es: "Me da igual", en: "No preference" },
                hint: { es: "Muéstrame la de entrada.", en: "Show me the entry one." },
              },
            ],
          },
        },
        {
          id: "include-supplies",
          kind: "toggle",
          role: "include-supplies",
          default: false,
          shortLabel: { es: "Insumos", en: "Supplies" },
          label: { es: "Incluir insumos", en: "Include supplies" },
          hint: {
            es: "Agua y otros insumos del catálogo, junto a tu selección.",
            en: "Water and other catalogue supplies, alongside your selection.",
          },
        },
      ],
    },

    /* ---- 04 Budget and context ------------------------------------------- */
    {
      id: "budget",
      label: { es: "Presupuesto", en: "Budget" },
      title: { es: "Presupuesto y contexto", en: "Budget and context" },
      lede: {
        es: "Comparamos tu presupuesto con los precios reales del catálogo.",
        en: "We compare your budget against the catalogue's real prices.",
      },
      questions: [
        {
          id: "budget",
          kind: "single-select",
          role: "budget-cap",
          recap: true,
          default: "open",
          columns: 4,
          shortLabel: { es: "Presupuesto", en: "Budget" },
          label: { es: "¿Cuánto quieres invertir?", en: "How much do you want to spend?" },
          options: {
            kind: "static",
            /* `value` is the MXN ceiling the policy applies; null is no cap. */
            items: [
              {
                id: "open",
                value: null,
                label: { es: "Sin tope", en: "No cap" },
                hint: { es: "Muéstrame todo.", en: "Show me everything." },
              },
              {
                id: "8k",
                value: 8000,
                label: { es: "Hasta $8,000 MXN", en: "Up to $8,000 MXN" },
                hint: { es: "Un primer pedido.", en: "A first order." },
              },
              {
                id: "20k",
                value: 20000,
                label: { es: "Hasta $20,000 MXN", en: "Up to $20,000 MXN" },
                hint: { es: "Varios productos.", en: "Several products." },
              },
              {
                id: "40k",
                value: 40000,
                label: { es: "Hasta $40,000 MXN", en: "Up to $40,000 MXN" },
                hint: { es: "Un pedido amplio.", en: "A wide order." },
              },
            ],
          },
        },
        {
          id: "purchase-horizon",
          kind: "single-select",
          role: "purchase-horizon",
          default: "one-order",
          columns: 2,
          shortLabel: { es: "Forma de compra", en: "How you buy" },
          label: { es: "¿Cómo piensas comprar?", en: "How do you plan to buy?" },
          options: {
            kind: "static",
            items: [
              {
                id: "one-order",
                label: { es: "Todo en un pedido", en: "All in one order" },
                hint: {
                  es: "Lo que elija, lo compro de una vez.",
                  en: "Whatever I pick, I buy at once.",
                },
              },
              {
                id: "over-time",
                label: { es: "Poco a poco", en: "Bit by bit" },
                hint: {
                  es: "Empiezo con algo y sigo después.",
                  en: "I'll start with something and continue later.",
                },
              },
            ],
          },
        },
        {
          id: "timing",
          kind: "single-select",
          role: "timing",
          default: "no-rush",
          columns: 2,
          shortLabel: { es: "Para cuándo", en: "When" },
          label: { es: "¿Para cuándo lo necesitas?", en: "When do you need it?" },
          options: {
            kind: "static",
            items: [
              {
                id: "soon",
                label: { es: "Lo antes posible", en: "As soon as possible" },
                hint: {
                  es: "Prioriza lo disponible.",
                  en: "Prioritise what's available.",
                },
              },
              {
                id: "no-rush",
                label: { es: "Sin prisa", en: "No rush" },
                hint: { es: "Puedo esperar.", en: "I can wait." },
              },
            ],
          },
        },
        {
          id: "note",
          kind: "long-text",
          role: "free-note",
          markOptional: true,
          maxLength: 400,
          shortLabel: { es: "Nota", en: "Note" },
          label: {
            es: "¿Algo más que Atlas deba saber?",
            en: "Anything else Atlas should know?",
          },
          placeholder: {
            es: "Por ejemplo: quiero empezar con algo de la línea insignia y dejar lo demás para mi siguiente pedido.",
            en: "For example: I want to start with something from the signature line and leave the rest for my next order.",
          },
          footnote: {
            es: "Cuéntanos tus objetivos con tus palabras. Atlas no usa información de salud, peso ni medicamentos: si la nota la incluye, se descarta completa y el resto de tus respuestas se usa igual.",
            en: "Tell us your goals in your own words. Atlas does not use health, weight or medication information: if the note includes it, the whole note is discarded and the rest of your answers are still used.",
          },
        },
      ],
    },
  ],
};
