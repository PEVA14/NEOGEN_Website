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
      "Compuestos de investigación con documentación técnica. Catálogo NEOGEN para México.",
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
      meta: ["México", "Compuestos de investigación"],
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
        presentation: "Presentaciones",
        category: "Categoría",
        from: "Desde",
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
        presentation: "Presentaciones",
        category: "Categoría",
        from: "Desde",
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
        presentation: "Presentaciones",
        category: "Categoría",
        from: "Desde",
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

  pdp: {
    /*
     * PDP copy for the RETA flagship.
     *
     * Describes the vessel, the environment and the page's own structure. It
     * does NOT describe pharmacology, purity, dosage, storage, availability or
     * shipping — those are fields with placeholder values, never sentences.
     */
    /** Caption for the media area. Describes the frame, never the contents. */
    inspectionLabel: "Medio de producto — RETA",
    /** Notes that the media responds to the cursor. Desktop pointers only. */
    viewerHint: "Vista sensible al cursor",
    commerce: {
      index: "01",
      section: "Producto",
      qualifier: "Compuesto de investigación",
      descriptor:
        "Vial de vidrio farmacéutico con cierre de aluminio satinado y etiqueta de papel técnico. Presentado en un entorno controlado; cada contenedor se documenta por lote.",
      variantLabel: "Selecciona formato",
      variantPending: "Formatos pendientes de verificación",
      quantityLabel: "Cantidad",
      priceLabel: "Precio",
      pricePending: "Precio pendiente",
      addToBag: "Añadir a la bag",
      commercePending: "Compra no habilitada — pendiente de revisión regulatoria y de procesador",
      documentation: "Ver documentación",
      shippingLabel: "Envío",
    },
    specifications: {
      index: "02",
      label: "Especificaciones",
      qualifier: "Ficha técnica",
      title: "Especificaciones del producto",
      compound: "Compuesto",
      category: "Categoría",
      presentation: "Presentaciones",
      composition: "Composición",
    },
    documentation: {
      index: "03",
      label: "Documentación",
      qualifier: "Verificación técnica",
      title: "Análisis y documentación",
      records: [
        { title: "Certificado de análisis", body: "Perfil analítico por lote." },
        { title: "Ficha técnica", body: "Especificación de material y formato." },
        { title: "Protocolo de manejo", body: "Secuencias de reconstitución y almacenamiento." },
      ],
      /** Ningún documento existe todavía; no se ofrece descarga. */
      unavailable: "Documento no disponible",
    },
    research: {
      index: "04",
      label: "Investigación",
      qualifier: "Literatura relacionada",
      title: "Investigación relacionada",
      lede: "Literatura y documentación conectadas con este compuesto.",
      empty: "Aún no hay literatura publicada para este compuesto.",
      action: "Ir a NEOGEN Research",
    },
    related: {
      index: "05",
      label: "Productos",
      qualifier: "Catálogo",
      title: "Compuestos relacionados",
      action: "Catálogo completo",
    },
  },

  products: {
    title: "Catálogo",
    detailTitle: "Ficha de producto",
    /*
     * The catalogue's own copy.
     *
     * Every control below operates on data that actually exists — the compound
     * names and the product worlds. Facets that would need a taxonomy we have
     * not verified (format, concentration, category) are NOT rendered as empty
     * dropdowns; they are named once, as pending, the same way the product
     * page treats its variant selector.
     */
    catalog: {
      index: "01",
      label: "Catálogo",
      qualifier: "Compuestos de investigación",
      title: "Compuestos",
      lede: "Cada compuesto se presenta con su ficha de material y su documentación técnica.",
      searchLabel: "Buscar",
      searchPlaceholder: "Nombre del compuesto",
      filterLabel: "Compuesto",
      filterAll: "Todos",
      categoryLabels: {
        metabolic: "Metabólicos",
        peptides: "Péptidos",
        blends: "Mezclas",
        solvents: "Disolventes",
      },
      sortLabel: "Orden",
      sortIndex: "Índice",
      sortName: "Nombre",
      viewLabel: "Vista",
      viewGrid: "Cuadrícula",
      /* NOT "Índice" — that is the sort key's label, and two controls sharing
         a word is two controls a reader cannot tell apart. "Registro" also
         names what the view actually is: the compound register. */
      viewIndex: "Registro",
      countLabel: "Mostrando",
      /** Shown when the filters exclude everything. Never a fabricated state. */
      empty: "Ningún compuesto coincide con los filtros aplicados.",
      clear: "Limpiar filtros",
      /** The architecture exists; the taxonomy does not. Stated, not faked. */
      /** Column heads for the index view. */
      columns: ["Categoría", "Presentaciones", "Precio"],
      documentationPending: "No disponible",
    },
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
    title: "NEOGEN Research",
    articleTitle: "Artículo",
    /*
     * NEOGEN Research is documentation infrastructure, not a blog.
     *
     * No literature has been published, so the hub does NOT dress an empty
     * archive in article cards. What it shows instead is real: the compound
     * register and the classes of record the documentation system carries,
     * each with its neutral verification state. Nothing here asserts that a
     * document exists, describes a finding, or names a source.
     */
    hub: {
      index: "01",
      label: "Investigación",
      qualifier: "Documentación y evidencia",
      title: "Documentación",
      lede: "Cada compuesto se publica junto a su registro técnico. Los documentos aparecen aquí a medida que se verifican.",
      register: {
        index: "02",
        label: "Compuestos",
        qualifier: "Registro",
        title: "Registro de compuestos",
        action: "Catálogo completo",
        columns: ["Código", "Documentación", "Literatura"],
      },
      documents: {
        index: "03",
        label: "Documentación",
        qualifier: "Clases de registro",
        title: "Clases de registro",
        /* Describes what the SYSTEM carries, not what has been published. */
        lede: "El sistema de documentación contempla las siguientes clases de registro por compuesto y por lote.",
        unavailable: "Documento no disponible",
      },
      literature: {
        index: "04",
        label: "Literatura",
        qualifier: "Publicaciones",
        title: "Literatura",
        empty: "Aún no hay literatura publicada.",
        /* Says what will appear, without promising when or claiming a source. */
        note: "Las referencias se publicarán con su identificador y su vínculo a la fuente original.",
      },
    },
  },

  cart: {
    /* SYSTEM STATUS V1: BAG, not Cart. The route stays /carrito. */
    index: "01",
    label: "Bag",
    qualifier: "Pedido",
    title: "Bag",
    countLabel: "Artículos",
    empty: "Tu bag está vacía.",
    /*
     * Says WHY it cannot be filled. Without this the empty state reads as a
     * step the reader failed to complete rather than as the state of the site.
     */
    emptyNote:
      "La compra aún no está habilitada: los precios y los formatos siguen pendientes de verificación.",
    browse: "Ver catálogo",
    summary: {
      title: "Resumen del pedido",
      subtotal: "Subtotal",
      shipping: "Envío",
      taxes: "Impuestos",
      total: "Total",
      note: "Los importes se calcularán cuando los datos de producto estén verificados.",
    },
    checkout: "Continuar al pago",
    /* Taken from the project's own regulatory position, not invented. */
    checkoutPending: "Pago no habilitado — pendiente de revisión regulatoria y de procesador",
  },

  checkout: {
    index: "01",
    label: "Pago",
    qualifier: "Proceso",
    title: "Pago",
    lede: "El proceso de compra se activará cuando se complete la revisión regulatoria y se seleccione un procesador de pagos.",
    guestNote: "La compra como invitado estará disponible.",
    steps: {
      contact: {
        index: "01",
        title: "Contacto",
        note: "Para el comprobante y el seguimiento del pedido.",
        email: "Correo electrónico",
      },
      shipping: {
        index: "02",
        title: "Envío",
        note: "La zona de servicio está por definir.",
        name: "Nombre completo",
        address: "Dirección",
        city: "Ciudad",
        state: "Estado",
        postal: "Código postal",
        country: "País",
      },
      payment: {
        index: "03",
        title: "Pago",
        /*
         * States the ENGINEERING position, not just the scope one: card data is
         * captured by the processor's own hosted component and never passes
         * through a form we author. Nothing on this page collects it.
         */
        note: "Los datos de pago se capturan en un componente alojado por el procesador y nunca pasan por este sitio. No hay procesador seleccionado.",
      },
      confirmation: {
        index: "04",
        title: "Confirmación",
        note: "Resumen del pedido y comprobante, disponibles cuando el pago esté habilitado.",
      },
    },
    place: "Realizar pedido",
    pending: "Pago no habilitado — pendiente de revisión regulatoria y de procesador",
    emptyBag: "No hay artículos en tu bag.",
    browse: "Ver catálogo",
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
