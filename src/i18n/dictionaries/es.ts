/**
 * Spanish (es-MX) — the SOURCE dictionary.
 *
 * Its shape defines the `Dictionary` type, so every other locale is compelled
 * by the type checker to stay complete. Add a key here first.
 *
 * Rules:
 *  - UI copy lives here, never in product/world configuration.
 *  - No product claims, prices, certifications or shipping promises.
 */
const es = {
  meta: {
    siteName: "NEOGEN",
    tagline: "Laboratorio Vivo",
    description:
      "NEOGEN — laboratorio de precisión. Sitio en construcción; el contenido de producto aún no está disponible.",
  },

  a11y: {
    skipToContent: "Saltar al contenido principal",
    mainNavigation: "Navegación principal",
    footerNavigation: "Navegación del pie de página",
    languageSwitcher: "Cambiar idioma",
    currentLanguage: "Idioma actual",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    breadcrumb: "Ruta de navegación",
  },

  nav: {
    home: "Inicio",
    products: "Productos",
    research: "Investigación",
    cart: "Carrito",
    checkout: "Pago",
    /** Etiqueta de marca. SYSTEM STATUS V1: BAG, no Cart. La ruta sigue siendo /carrito. */
    bag: "BAG",
    /** Ruta preparada; la página se construye en una fase posterior. */
    about: "Nosotros",
  },

  home: {
    hero: {
      eyebrow: "NEOGEN — Laboratorio Vivo",
      title: "NEOGEN",
      lede: "Compuestos de investigación construidos sobre evidencia.",
      cta: "Explorar productos",
      scrollCue: "Desplaza",
      meta: ["México", "Tres compuestos insignia", "Sitio en construcción"],
      vialAlt: "Vial de vidrio NEOGEN con etiqueta RETA, inclinado sobre un fondo oscuro.",
      loadingLabel: "Cargando modelo",
      staticLabel: "Vista estática",
    },

    evolution: {
      index: "01",
      label: "NEOGEN",
      title: "Evolución creativa",
      lede: "Un nuevo entorno para la investigación molecular. Compuestos precisos, evidencia documentada, presentación premium.",
      points: [
        {
          title: "Científico",
          body: "Los compuestos se describen según estructuras moleculares documentadas. Realidades químicas presentadas sin inflación de marketing ni ruido visual genérico.",
        },
        {
          title: "Preciso",
          body: "Formato, parámetros de almacenamiento y datos específicos por lote, presentados directamente. La documentación completa respalda decisiones de investigación informadas.",
        },
        {
          title: "Documentado",
          body: "Cada compuesto va acompañado de su documentación. Certificados de análisis, parámetros de almacenamiento y protocolos de manejo: referenciados, no asumidos.",
        },
      ],
    },

    reta: {
      /*
       * Copia de producto, no comentario sobre el sistema de diseño.
       *
       * Describe el compuesto y su entorno material. NO describe mecanismos
       * farmacológicos, acción molecular, pureza ni lote: esos campos existen
       * como ESTRUCTURA con marcador de posición hasta que haya datos
       * verificados (CLAUDE.md, CONVENTIONS §8).
       */
      eyebrow: "Retatrutide — compuesto de investigación",
      beats: [
        {
          eyebrow: "Producto insignia",
          statement: "El entorno se vuelve precisión.",
          body: "Matriz molecular insignia. La luz azul fría define las refracciones del vidrio y las superficies geométricas, creando un entorno de precisión óptica.",
        },
        {
          eyebrow: "Material",
          statement: "Vidrio claro, luz controlada.",
          body: "Vidrio farmacéutico transparente, sello de aluminio satinado y etiqueta de papel técnico. Cada superficie responde a una fuente de luz distinta.",
        },
        {
          eyebrow: "Especificación",
          statement: "Documentación antes que promesa.",
          body: "Formulación, acción molecular y grado de pureza se publican por lote cuando el análisis está disponible. Hasta entonces, los campos permanecen abiertos.",
        },
        {
          eyebrow: "Disponibilidad",
          statement: "RETA — Retatrutide Research.",
          body: "El primero de los tres compuestos insignia de NEOGEN. Catálogo, precios y documentación en preparación.",
        },
      ],
      specs: {
        formulation: "Formulación",
        molecularAction: "Acción molecular",
        purity: "Grado de pureza",
      },
      vialAlt:
        "Vial de vidrio NEOGEN con etiqueta RETA, inclinado en un entorno oscuro con luz azul.",
      loadingLabel: "Cargando modelo",
      staticLabel: "Vista estática",
      progressLabel: "Secuencia",
    },

    catalog: {
      index: "04",
      label: "Descubrimiento",
      title: "Explora el catálogo",
      action: "Todos los productos",
      categories: [
        {
          index: "01",
          title: "Péptidos",
          body: "Cadenas peptídicas de grado investigación.",
          link: "Explorar catálogo",
        },
        {
          index: "02",
          title: "Compuestos",
          body: "Agentes químicos aislados, precursores de materia prima y estándares analíticos de laboratorio.",
          link: "Explorar catálogo",
        },
        {
          index: "03",
          title: "Protocolos",
          body: "Documentación completa, secuencias de almacenamiento y metodologías de reconstitución.",
          link: "Explorar catálogo",
        },
      ],
    },

    glow: {
      eyebrow: "Compuesto de investigación — Luminoso",
      statement: "El entorno se vuelve luz.",
      body: "El vial es la fuente. Una iluminación ámbar dorada emana desde el núcleo y extiende patrones refractivos cálidos sobre la oscuridad. Luminiscencia limpia y enfocada.",
      specs: {
        vial: "Especificaciones del vial",
        state: "Estado luminoso",
        lot: "Lote",
      },
      mediaLabel: "Medio pendiente",
    },

    research: {
      index: "06",
      label: "Investigación",
      title: "NEOGEN Research",
      action: "Ir a investigación",
      lede: "Perfiles de compuestos, documentación de análisis y literatura de investigación. Cada producto del catálogo conectado con su evidencia.",
      /** Encabezados de columna del registro y etiquetas del expediente. */
      columns: ["Código", "Documentación", "Artículos"],
      recordLabel: "Registro",
      stateLabel: "Estado",
      fields: {
        code: "Código",
        documentation: "Documentación",
        articles: "Artículos",
      },
    },

    quality: {
      index: "07",
      label: "Calidad",
      title: "Análisis y documentación",
      points: [
        {
          title: "Compuestos",
          body: "Biblioteca completa con datos de compuesto, pesos específicos y clasificaciones documentadas.",
        },
        {
          title: "Análisis",
          body: "Base de datos de COA que vincula perfiles analíticos y documentación con cada lote.",
        },
        {
          title: "Biblioteca",
          body: "Documentación científica con rutas de síntesis y metodologías de ensayo.",
        },
        {
          title: "Documentación",
          body: "Secuencias de reconstitución, protocolos de almacenamiento y fichas técnicas.",
        },
      ],
    },

    ghkcu: {
      eyebrow: "Complejo peptídico de cobre — GHK-Cu",
      statement: "El entorno se vuelve materia.",
      body: "Contexto táctil y pesado. Verdigrís saturado y cobre oxidado profundo reemplazan la plantilla clínica. Texturas físicas simétricas aportan peso donde GLOW aporta luz.",
      specs: {
        materialClass: "Clase de material",
        tactileMatrix: "Matriz táctil",
        status: "Estado del compuesto",
      },
      mediaLabel: "Muestra pendiente",
    },

    products: {
      index: "08",
      label: "Productos",
      title: "Compuestos insignia",
      action: "Catálogo completo",
      meta: "SKU — PLACEHOLDER // PRICE — PLACEHOLDER",
      cta: "Ver producto",
      mediaLabel: "Imagen pendiente",
      worldLabels: {
        reta: "Precisión",
        glow: "Luminoso",
        "ghk-cu": "Material",
      },
    },
  },

  products: {
    title: "Productos",
    intro: "Catálogo en preparación.",
    empty: "Aún no hay productos publicados.",
    detailTitle: "Ficha de producto",
    sections: {
      experience: "Experiencia",
      commerce: "Compra",
      specifications: "Especificaciones",
      documentation: "Documentación",
      research: "Investigación",
      related: "Productos relacionados",
    },
  },

  research: {
    title: "Investigación",
    intro: "Centro de investigación y divulgación de NEOGEN. Estructura editorial en preparación.",
    empty: "Aún no hay artículos publicados.",
    articleTitle: "Artículo",
  },

  cart: {
    title: "Carrito",
    empty: "Tu carrito está vacío.",
    summary: "Resumen del pedido",
  },

  checkout: {
    title: "Pago",
    guestNote: "La compra como invitado estará disponible.",
  },

  status: {
    /** Neutral verification vocabulary — see components/ui/StatusNote. */
    pending: "Pendiente de verificación",
    notAvailable: "No disponible",
    tbd: "Por definir",
    /** Convención técnica de SYSTEM STATUS V1: LABEL — PLACEHOLDER. */
    placeholder: "PLACEHOLDER",
    /** El campo ya lleva la etiqueta; el valor es sólo el marcador. */
    lot: "XXXX",
    placeholderNotice:
      "Marcador de posición. Este dato aún no ha sido verificado y no debe interpretarse como información definitiva.",
  },

  footer: {
    tagline: "Compuestos de investigación. Construidos sobre evidencia.",
    about: "Laboratorio de compuestos de investigación. Metodología orientada a la documentación.",
    serviceArea: "Zona de servicio",
    columns: {
      products: "Productos",
      research: "Investigación",
      help: "Ayuda",
      legal: "Legal",
    },
    links: {
      allCompounds: "Todos los compuestos",
      documentation: "Documentación",
    },
  },

  error: {
    notFoundTitle: "Página no encontrada",
    notFoundBody: "La página que buscas no existe o cambió de dirección.",
    genericTitle: "Algo salió mal",
    genericBody: "Ocurrió un error inesperado. Intenta de nuevo.",
    retry: "Reintentar",
    backHome: "Volver al inicio",
    loading: "Cargando…",
  },
} as const;

export default es;
