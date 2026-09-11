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
    /**
     * Per-page description templates.
     *
     * Every page used to inherit `meta.description`, so 88 Spanish URLs shipped
     * the same one-line summary — including all 83 product pages, which is the
     * text a search result shows and the strongest duplicate-content signal the
     * site was sending. `{name}`, `{classification}`, `{presentations}` and
     * `{count}` are filled from the registry, so every value is a fact the
     * catalogue already holds and none of them is a product claim.
     */
    descriptions: {
      product:
        "{name} — {classification}. Presentaciones: {presentations}. Catálogo NEOGEN México.",
      catalog:
        "{count} compuestos de investigación en cuatro categorías: metabólicos, péptidos, mezclas y disolventes. Catálogo NEOGEN México.",
      qualityExplorer:
        "Documentación de calidad de NEOGEN, vinculada a la presentación y al lote exactos que examina.",
      research:
        "Índice de compuestos NEOGEN, áreas de investigación y el modelo con que se documenta la calidad de cada presentación.",
      cart: "Tu bag de NEOGEN México.",
      checkout: "Proceso de pago de NEOGEN México.",
    },
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
          body: "Cantidad por vial, viales por presentación y composición cuando la fuente la declara. Nada se infiere a partir de un nombre.",
        },
        {
          title: "Documentado",
          body: "La documentación se vincula a la presentación y al lote exactos que examina. Donde no existe un documento, no aparece un sello en su lugar.",
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
          body: "Un análisis se publica con su emisor, su fecha y la presentación exacta que examina. Nada se afirma antes de que exista el documento.",
        },
        {
          eyebrow: "Disponibilidad",
          statement: "RETA — Retatrutide Research.",
          body: "El primero de los tres compuestos insignia de NEOGEN.",
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
          title: "Materiales",
          body: "Disolventes y consumibles de laboratorio.",
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
      lede: "El índice de compuestos, las áreas en que se estudian y el modelo con que se documenta su calidad.",
      /**
       * Encabezados de columna del registro y etiquetas del expediente.
       *
       * Estas columnas eran "Código / Documentación / Artículos". La primera
       * mostraba la categoría bajo una etiqueta que prometía un identificador,
       * y la tercera mostraba el número de presentaciones bajo la palabra
       * "Artículos" — es decir, afirmaba que existen 7 artículos sobre RETA
       * cuando no existe ninguno. Ahora cada columna nombra lo que muestra.
       */
      columns: ["Categoría", "Presentaciones", "Documentación"],
      recordLabel: "Registro",
      stateLabel: "Estado",
      fields: {
        category: "Categoría",
        presentations: "Presentaciones",
        documentation: "Documentación",
      },
    },

    quality: {
      index: "07",
      label: "Calidad",
      title: "Evidencia, no sellos",
      lede: "Cada estado de calidad en NEOGEN proviene de un documento que puede consultarse, vinculado a la presentación exacta que examina.",
      action: "Cómo se documenta",
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
    /*
     * Names the FRAME, not the product. It used to read "Medio de producto —
     * RETA" and was passed to every product page, so eighty compounds carried
     * another product's name under their own image.
     */
    inspectionLabel: "Medio de producto",
    /** Notes that the media responds to the cursor. Desktop pointers only. */
    viewerHint: "Vista sensible al cursor",
    commerce: {
      index: "01",
      section: "Producto",
      qualifier: "Compuesto de investigación",
      variantLabel: "Selecciona formato",
      variantPending: "Formatos pendientes de verificación",
      quantityLabel: "Cantidad",
      priceLabel: "Precio",
      pricePending: "Precio pendiente",
      addToBag: "Añadir a la bag",
      commercePending: "Compra no habilitada — pendiente de revisión regulatoria y de procesador",
      documentation: "Ver calidad y documentación",
      shippingLabel: "Envío",
    },
    specifications: {
      index: "02",
      label: "Especificaciones",
      qualifier: "Ficha técnica",
      title: "Especificaciones del producto",
      compound: "Compuesto",
      /*
       * "Clasificación", not "Categoría". The value is the catalogue bucket a
       * compound is filed under — one of four — and labelling it "Categoría"
       * inside a technical specification table read as a claim about what the
       * substance IS. Several compounds filed under "Péptidos" are not
       * peptides.
       */
      classification: "Clasificación de catálogo",
      presentation: "Presentaciones",
      composition: "Composición",
      ladder: "Escala de presentaciones",
      pack: "× {n} viales",
    },
    research: {
      label: "Investigación",
      qualifier: "Referencias y áreas",
      title: "Investigación relacionada",
      lede: "Las referencias que cita esta página y las áreas donde continuar leyendo.",
      routes: "Continuar por área",
      hub: "Índice de NEOGEN Research",
    },
    quality: {
      label: "Calidad",
      qualifier: "Evidencia por presentación",
      title: "Calidad y documentación",
    },
    overview: {
      label: "Perfil",
      qualifier: "Contexto con fuentes",
      title: "Perfil del compuesto",
      researchContext: "Contexto de investigación",
      areas: "Áreas de investigación",
      mechanism: "Mecanismo y vías",
      technical: "Notas técnicas",
      keyReferences: "Referencias principales",
    },
    interlude: {
      presentations: "Presentaciones",
      range: "Escala",
      area: "Área",
    },
    media: {
      alternate: "Vista",
      detail: "Detalle",
      packaging: "Empaque",
    },
    /**
     * CROSS-SELL — laboratory consumables, listed as adjacent products.
     *
     * Deliberately verb-free. Naming a solvent next to a compound is a
     * merchandising adjacency, not an instruction: nothing here says what to
     * do with either, and no reconstitution or administration language may
     * ever be added to this section.
     */
    materials: {
      index: "06",
      label: "Materiales",
      qualifier: "Consumibles de laboratorio",
      title: "Materiales de investigación",
      action: "Ver materiales",
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
      sortPriceAsc: "Precio ↑",
      sortPriceDesc: "Precio ↓",
      typeLabel: "Tipo",
      filtersLabel: "Filtros",
      filtersApplied: "activos",
      /** Qualifier before a "from" price on a card. */
      from: "Desde",
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
     * An index and an evidence model, not a blog. Every section below shows
     * something that exists — areas, compounds, the rules documentation
     * follows — and the reference index states its own rule rather than
     * implying an archive is on its way.
     */
    hub: {
      index: "01",
      label: "Investigación",
      qualifier: "Índice y evidencia",
      title: "NEOGEN Research",
      lede: "El índice de los compuestos del catálogo, las áreas en que se estudian y el modelo con que se documenta su calidad.",
      areas: {
        index: "02",
        label: "Áreas",
        qualifier: "Por área de estudio",
        title: "Áreas de investigación",
        compounds: "Compuestos",
        references: "Referencias",
        enter: "Entrar",
      },
      finder: {
        index: "03",
        label: "Compuestos",
        qualifier: "Índice",
        title: "Índice de compuestos",
        searchLabel: "Buscar",
        searchPlaceholder: "Nombre o presentación",
        areaLabel: "Área",
        areaAll: "Todas las áreas",
        results: "{n} compuestos",
        result: "{n} compuesto",
        empty: "Ningún compuesto coincide con la búsqueda.",
        clear: "Limpiar",
        columns: {
          compound: "Compuesto",
          areas: "Áreas",
          presentations: "Presentaciones",
          documentation: "Documentación",
        },
        documents: "{n} documentos públicos",
        document: "1 documento público",
      },
      quality: {
        index: "04",
        label: "Calidad",
        qualifier: "Modelo de evidencia",
        title: "Cómo se documenta la calidad",
        lede: "Un documento se vincula a lo más específico que examina: la presentación, o el lote. Nada se extiende de una presentación a otra, y ningún estado aparece sin un documento detrás.",
        explorer: "Explorar documentación",
      },
      references: {
        index: "05",
        label: "Referencias",
        qualifier: "Fuentes",
        title: "Referencias",
        empty:
          "No hay referencias publicadas. Una referencia aparece aquí cuando una fuente verificada respalda una afirmación en la página de un compuesto.",
        citedBy: "Citada en",
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
      "La compra aún no está habilitada. El catálogo puede consultarse por completo; los pedidos se activarán al concluir la revisión regulatoria y la selección de procesador de pagos.",
    /* Used when purchasing IS enabled — see the bag page for why the
       regulatory note must not render then. */
    emptyNoteEnabled: "Añade compuestos desde el catálogo para verlos aquí.",
    browse: "Ver catálogo",
    summary: {
      title: "Resumen del pedido",
      subtotal: "Subtotal",
      shipping: "Envío",
      taxes: "Impuestos",
      total: "Total",
      note: "Los importes de envío e impuestos se calcularán al habilitarse los pedidos.",
    },
    checkout: "Continuar al pago",
    /* Shown while the server reprices the bag and opens the checkout draft. */
    checkoutBusy: "Preparando el pedido…",
    /* Taken from the project's own regulatory position, not invented. */
    checkoutPending: "Pago no habilitado — pendiente de revisión regulatoria y de procesador",
  },

  /**
   * POLICY DOCUMENTS.
   *
   * Titles and chrome only — the BODIES are not here and are not anywhere.
   * Legal text is written by counsel and lives in `content/policies.ts` with
   * an approval status; nothing in this file may become a legal statement.
   * Every policy route 404s until one is approved.
   */
  policies: {
    index: "01",
    label: "Documentos",
    qualifier: "Políticas",
    approvedLabel: "Vigente desde",
    description: "{title} — NEOGEN.",
    titles: {
      terms: "Términos y condiciones",
      privacy: "Aviso de privacidad",
      shipping: "Envíos",
      returns: "Devoluciones y reembolsos",
      quality: "Calidad y documentación",
      "research-use": "Uso en investigación",
      "medical-disclaimer": "Aviso médico",
    },
  },
  /**
   * QUALITY — the evidence ledger and the rules it follows.
   *
   * Every state label below names a DOCUMENT that exists, never a property of
   * a substance: "Certificado de análisis" says a certificate is available, not
   * that anything is pure. And no label renders unless `domain/quality`
   * resolved a real, public, approved document for that exact presentation.
   *
   * The empty-state copy states the policy once, plainly. It is not "pending"
   * and it promises no date.
   */
  quality: {
    record: {
      panelLabel: "Estado de calidad",
      coverageLabel: "Cobertura",
      coverage: "{n} de {total} presentaciones con documentación pública",
      emptyTitle: "Este compuesto no tiene documentación pública.",
      emptyBody:
        "La documentación se publica cuando existe, vinculada a la presentación exacta y, cuando corresponde, al lote que examina. Un análisis de una presentación nunca se muestra como válido para otra.",
      tableCaption: "Documentación publicada por presentación",
      columns: {
        presentation: "Presentación",
        state: "Estado",
        type: "Tipo",
        issuer: "Emisor",
        lot: "Lote",
        date: "Fecha",
        document: "Documento",
      },
      noRecord: "Sin documento público",
      compoundLevel: "Compuesto",
      states: {
        "documentation-available": "Documentación técnica",
        "coa-available": "Certificado de análisis",
        "lot-coa": "Certificado de lote",
        "third-party-tested": "Análisis independiente",
        "janoshik-verified": "Informe Janoshik verificable",
      },
      types: {
        "technical-document": "Documento técnico",
        "supplier-documentation": "Documentación de proveedor",
        coa: "Certificado de análisis",
        "lot-coa": "Certificado de análisis de lote",
        "third-party-analysis": "Análisis de tercero",
        "handling-storage": "Almacenamiento y manejo",
        "analytical-report": "Informe analítico",
      },
      issuerRoles: {
        "independent-laboratory": "Laboratorio independiente",
        manufacturer: "Fabricante",
        supplier: "Proveedor",
        neogen: "NEOGEN",
      },
      reportId: "Informe",
      view: "Ver documento",
      external: "abre en otra pestaña",
      chain: {
        label: "Cómo se resuelve la evidencia",
        steps: {
          product: {
            title: "Compuesto",
            rule: "Solo documentación técnica. Ningún análisis se asigna al compuesto completo.",
          },
          variant: {
            title: "Presentación",
            rule: "Un análisis nombra la presentación exacta que examinó.",
          },
          lot: {
            title: "Lote",
            rule: "Un certificado de lote cubre ese lote y ningún otro.",
          },
          document: {
            title: "Documento",
            rule: "Cada estado visible proviene de un documento que puede consultarse.",
          },
        },
        resolved: "con documento público",
        unresolved: "sin documento público",
      },
    },
    explorer: {
      index: "01",
      label: "Investigación",
      qualifier: "Calidad",
      title: "Documentación de calidad",
      lede: "Cada documento público del catálogo, con la presentación y el lote exactos que examina.",
      devNotice:
        "Vista de desarrollo. Esta página no se publica mientras no exista ningún documento público.",
      filters: {
        product: "Compuesto",
        presentation: "Presentación",
        lot: "Lote",
        type: "Tipo",
        issuer: "Emisor",
        all: "Todos",
      },
      results: "{n} documentos",
      result: "{n} documento",
      empty: "Ningún documento coincide con los filtros.",
      caption: "Documentos públicos",
      columns: {
        product: "Compuesto",
        presentation: "Presentación",
        lot: "Lote",
        type: "Tipo",
        issuer: "Emisor",
        date: "Fecha",
        document: "Documento",
      },
      view: "Ver documento",
      external: "abre en otra pestaña",
    },
  },

  /** Reference presentation. No summaries: NEOGEN does not paraphrase sources. */
  citations: {
    label: "Referencias",
    sourceTypes: {
      "journal-article": "Artículo",
      "review-article": "Revisión",
      "clinical-trial-registry": "Registro de ensayo",
      preprint: "Preprint",
      book: "Libro",
      "regulatory-document": "Documento regulatorio",
      dataset: "Conjunto de datos",
      other: "Fuente",
    },
    doi: "DOI",
    pmid: "PMID",
    open: "Abrir fuente",
    external: "abre en otra pestaña",
    etAl: "et al.",
  },

  checkout: {
    index: "01",
    label: "Compra",
    qualifier: "Proceso",
    title: "Compra",
    /*
     * States the architecture, because it is the reassurance that matters
     * here: the amounts are the server's, recomputed from the catálogo, and
     * nothing in the browser decides what anyone pays.
     */
    lede: "Seis pasos. Cada importe se calcula en el servidor a partir del catálogo, no en tu navegador.",

    progress: {
      label: "Progreso de la compra",
      /* Announced, never drawn — "03" alone no dice cuánto falta. */
      stepOf: "paso {n} de {total}",
      completed: "completado",
      current: "paso actual",
      steps: {
        contact: "Contacto",
        shipping: "Envío",
        delivery: "Entrega",
        payment: "Pago",
        review: "Revisión",
        confirmation: "Confirmación",
      },
    },

    steps: {
      contact: {
        index: "01",
        title: "Contacto",
        note: "Lo mínimo para enviarte el comprobante y para que la entrega pueda localizarte.",
        /* No account, and it is worth saying so: an unexpected sign-up wall is
           the most common reason a checkout is abandoned. */
        guestNote: "No necesitas crear una cuenta.",
        email: "Correo electrónico",
        emailHint: "Aquí llega el comprobante del pedido.",
        /* ONE name field. Mexican names commonly carry two surnames, and a
           fixed first/last pair gets them wrong. */
        name: "Nombre completo",
        nameHint: "Como aparece en tu identificación.",
        phone: "Teléfono",
        phoneHint: "10 dígitos. La entrega puede necesitar llamarte.",
        submit: "Continuar a envío",
      },

      shipping: {
        index: "02",
        title: "Envío",
        note: "Dirección de entrega dentro de México.",
        recipient: "Quién recibe",
        recipientHint: "Puede ser distinta de la persona que compra.",
        street: "Calle",
        numeroExterior: "Núm. exterior",
        numeroInterior: "Núm. interior",
        numeroInteriorHint: "Opcional.",
        colonia: "Colonia",
        postalCode: "Código postal",
        postalCodeHint: "Cinco dígitos.",
        city: "Ciudad o municipio",
        state: "Estado",
        statePlaceholder: "Selecciona un estado",
        /*
         * No SEPOMEX lookup. Autocompleting colonia and municipio from the CP
         * is the right thing to do later; there is no verified source wired
         * up, so the fields are typed rather than guessed.
         */
        postalNote:
          "No completamos la colonia automáticamente: preferimos que la escribas tú antes de tener una fuente verificada.",
        country: "País",
        countryLocked: "México — es el único destino disponible.",
        notes: "Indicaciones para la entrega",
        notesHint: "Opcional. Referencias, horarios, portón.",
        submit: "Continuar a entrega",
        back: "Volver a contacto",
      },

      delivery: {
        index: "03",
        title: "Entrega",
        note: "El servicio se determina por la dirección que registraste.",
        options: {
          legend: "Servicio de entrega",
          methods: {
            "local-priority": {
              title: "Entrega prioritaria",
              detail: "Guadalajara y Durango. Al día siguiente, no el mismo día.",
            },
            "national-standard": {
              title: "Envío nacional",
              detail: "Resto del país.",
            },
          },
          estimate: "Estimado",
          /* Spanish agrees in number, and every priority delivery is one day. */
          estimateDays: { one: "{n} día hábil", many: "{n} días hábiles" },
          cost: "Costo",
          free: "Gratis",
          /* Not "$0" and not a made-up figure: genuinely unknown. */
          ratePending: "Por confirmar",
          ratePendingNote:
            "Aún no hay tarifa de envío definida para pedidos por debajo de $10,000 MXN, así que el pedido no puede totalizarse. Al alcanzar ese importe el envío es gratuito.",
          handlingPending:
            "El manejo especial (cadena de frío) está pendiente de determinación y no se aplica todavía.",
          none: "No hay servicio disponible para esta dirección.",
        },
        submit: "Continuar a pago",
        back: "Volver a envío",
      },

      payment: {
        index: "04",
        title: "Pago",
        /*
         * States the ENGINEERING position, not just the scope one: card data
         * is captured by the processor's own hosted component and never
         * passes through a form we author.
         */
        note: "Los datos de tarjeta se capturan en un componente alojado por el procesador y nunca pasan por este sitio.",
        slot: {
          stateLabel: "Estado del pago",
          badges: {
            no_provider: "Sin procesador",
            embedded: "En esta página",
            redirect: "Redirección",
            instructions: "Transferencia",
            processing: "Procesando",
            failed: "Rechazado",
            approved: "Aprobado",
          },
          states: {
            no_provider: {
              title: "El pago no puede completarse todavía",
              body: "NEOGEN no tiene un procesador de pagos activo. Puedes revisar y registrar el pedido: no se realizará ningún cargo y el pedido no queda pagado.",
              contactLabel: "Canal disponible",
            },
            embedded: {
              title: "Datos de pago",
              body: "El procesador carga sus propios campos en esta página. NEOGEN no recibe ni almacena el número de tarjeta.",
              mountLabel: "Área reservada al procesador",
            },
            redirect: {
              title: "Continúa con el procesador",
              body: "Te llevaremos al sitio del procesador para completar el pago y volverás aquí al terminar.",
              action: "Ir al procesador",
            },
            instructions: {
              title: "Transferencia",
              body: "Realiza la transferencia con la referencia siguiente. El pedido queda en espera hasta que el procesador confirme la recepción.",
              referenceLabel: "Referencia",
              amountLabel: "Importe",
              expiresLabel: "Vigencia",
            },
            processing: {
              title: "Pago en proceso",
              body: "El procesador está resolviendo la operación. No es necesario hacer nada más.",
            },
            failed: {
              title: "El pago no se completó",
              body: "No se realizó ningún cargo. Puedes intentar de nuevo.",
              action: "Intentar de nuevo",
              reasons: {
                unavailable: "No hay procesador de pagos configurado.",
                invalid_state: "El pedido no está en un estado que admita pago.",
                declined: "El procesador rechazó la operación.",
                provider_error: "Falla temporal del procesador. Puedes reintentar.",
              },
            },
            approved: {
              title: "Pago aprobado",
              body: "El procesador confirmó el pago.",
            },
          },
        },
        submit: "Continuar a revisión",
        back: "Volver a entrega",
      },

      review: {
        index: "05",
        title: "Revisión",
        note: "Confirma que esto es exactamente lo que estás pidiendo.",
        submit: "Registrar pedido",
        back: "Volver a pago",
        acknowledgements: {
          title: "Declaraciones",
          requiredNote: "Las declaraciones marcadas son obligatorias.",
        },
        blocked: {
          title: "Falta un paso",
          empty: "No hay artículos en el pedido.",
          contact_incomplete: "Los datos de contacto están incompletos.",
          shipping_incomplete: "La dirección de envío está incompleta.",
          delivery_missing: "Falta elegir el servicio de entrega.",
          delivery_unquotable:
            "El pedido no puede totalizarse: no hay tarifa de envío definida para este importe.",
          acknowledgements_missing: "Faltan declaraciones obligatorias.",
          already_placed: "Este pedido ya fue registrado.",
          action: "Ir al paso",
        },
      },
    },

    /* --- the summary panel, on every step ----------------------------- */
    summary: {
      title: "Resumen del pedido",
      itemsLabel: "Artículos",
      linesLabel: "Artículos del pedido",
      quantity: "×",
      subtotal: "Subtotal",
      shipping: "Envío",
      shippingFree: "Gratis",
      shippingPending: "Por confirmar",
      total: "Total",
      totalPending: "Por confirmar",
      estimate: "Días hábiles",
      freeShippingRemaining: "{amount} más para envío gratis",
      freeShippingReached: "Envío gratis alcanzado",
      note: "Los precios incluirán IVA cuando queden confirmados. No se añade impuesto por separado.",
      editBag: "Modificar la bag",
    },

    /* --- what the server changed -------------------------------------- */
    adjustments: {
      title: "Cambios en tu pedido",
      note: "Estos cambios ya están reflejados en los importes de arriba.",
      removedUnknown: "Se retiró un artículo que ya no está en el catálogo ({id}).",
      removedUnpriced: "{name} se retiró: no tiene precio confirmado.",
      removedUnavailable: "{name} se retiró: no está disponible.",
      repriced: "{name} cambió de precio: {was} → {now}.",
      quantityClamped: "{name}: la cantidad se ajustó de {from} a {to}.",
      acknowledge: "Entendido",
    },

    errors: {
      title: "Revisa estos campos",
      required: "Falta este dato",
      email_invalid: "Revisa el formato del correo",
      phone_invalid: "Escribe 10 dígitos, o 12 con la clave 52",
      postal_invalid: "El código postal tiene cinco dígitos",
      state_unknown: "Selecciona un estado de la lista",
      too_long: "Demasiado largo",
      country_unsupported: "Solo enviamos dentro de México",
    },

    /* --- whole-page states -------------------------------------------- */
    unavailable: {
      index: "—",
      label: "Compra // No habilitada",
      title: "La compra aún no está habilitada",
      body: "El catálogo puede consultarse por completo. Los pedidos se activarán al concluir la revisión regulatoria y la selección de procesador de pagos.",
      catalogue: "Ver catálogo",
      bag: "Ver la bag",
    },
    expired: {
      index: "—",
      label: "Compra // Sin pedido",
      title: "No hay un pedido en curso",
      body: "Tu bag está vacía o la sesión de compra terminó. Puedes volver al catálogo y comenzar de nuevo.",
      catalogue: "Ver catálogo",
      bag: "Ver la bag",
    },

    confirmation: {
      index: "06",
      label: "Confirmación",
      qualifier: "Pedido",
      title: "Pedido registrado",
      referenceLabel: "Referencia",
      placedLabel: "Registrado",
      stateLabel: "Estado del pago",
      statusLabel: "Estado del pedido",
      states: {
        /*
         * `created` is the ONLY reachable state, because no processor exists.
         * It says plainly that nothing was charged — a confirmation page that
         * implied otherwise would be the worst possible place to be vague.
         */
        created: {
          badge: "Sin cargo",
          title: "Registramos tu pedido. No se realizó ningún cargo.",
          body: "NEOGEN no tiene un procesador de pagos activo, así que el pedido no está pagado. Conserva la referencia: es la forma de identificarlo cuando el pago se habilite.",
        },
        pending_payment: {
          badge: "En espera",
          title: "Falta completar el pago",
          body: "El pedido queda reservado hasta que el procesador confirme la operación.",
        },
        payment_processing: {
          badge: "Procesando",
          title: "El pago está en proceso",
          body: "El procesador está resolviendo la operación. No es necesario hacer nada más.",
        },
        paid: {
          badge: "Pagado",
          title: "Pago confirmado",
          body: "El procesador confirmó el pago de este pedido.",
        },
        payment_failed: {
          badge: "Rechazado",
          title: "El pago no se completó",
          body: "No se realizó ningún cargo. El pedido sigue registrado con esta referencia.",
        },
        cancelled: {
          badge: "Cancelado",
          title: "Pedido cancelado",
          body: "Este pedido fue cancelado y no se realizará ningún cargo.",
        },
        refunded: {
          badge: "Reembolsado",
          title: "Pedido reembolsado",
          body: "El importe de este pedido fue devuelto.",
        },
      },
      statuses: {
        placed: "Registrado",
        in_review: "En revisión",
        preparing: "En preparación",
        shipped: "Enviado",
        delivered: "Entregado",
        closed: "Cerrado",
      },
      nextSteps: {
        title: "Qué sigue",
        body: "El pago se habilitará al concluir la revisión regulatoria y la selección de procesador. Hasta entonces, el único canal directo es el teléfono de NEOGEN.",
        contactLabel: "Comprobante registrado a",
      },
      items: { title: "Artículos", quantity: "×" },
      contact: { title: "Contacto", email: "Correo", phone: "Teléfono" },
      shipping: { title: "Envío", estimate: "Estimado" },
      totals: { subtotal: "Subtotal", shipping: "Envío", free: "Gratis", total: "Total" },
      estimateDays: { one: "{n} día hábil", many: "{n} días hábiles" },
      acknowledgedLabel: "Declaraciones aceptadas",
      actions: { catalogue: "Seguir explorando", research: "NEOGEN Research" },
      notFound: {
        index: "—",
        label: "Confirmación // No encontrada",
        title: "No encontramos ese pedido",
        body: "La referencia no corresponde a un pedido de este navegador. Si la tienes por escrito, consérvala y comunícate por teléfono.",
        catalogue: "Ver catálogo",
        bag: "Ver la bag",
      },
    },

    review: {
      items: {
        title: "Artículos",
        product: "Compuesto",
        presentation: "Presentación",
        quantity: "Cant.",
        unit: "Unitario",
        total: "Importe",
      },
      contact: { title: "Contacto", email: "Correo", name: "Nombre", phone: "Teléfono" },
      shipping: {
        title: "Envío",
        recipient: "Recibe",
        address: "Dirección",
        notes: "Indicaciones",
      },
      delivery: {
        title: "Entrega",
        method: "Servicio",
        estimate: "Estimado",
        cost: "Costo",
        free: "Gratis",
        pending: "Por confirmar",
      },
      methodNames: {
        "local-priority": "Entrega prioritaria",
        "national-standard": "Envío nacional",
      },
      totals: {
        subtotal: "Subtotal",
        shipping: "Envío",
        total: "Total",
        pending: "Por confirmar",
        note: "Los precios incluirán IVA cuando queden confirmados. No se añade impuesto por separado.",
      },
      edit: "Editar",
      estimateDays: { one: "{n} día hábil", many: "{n} días hábiles" },
      snapshotLabel: "Precios consultados",
    },
  },

  /**
   * BAG — the live bag surface.
   *
   * Free-shipping copy states the MX$10,000 threshold, which is an
   * owner-confirmed fact. Shipping COST is never stated below the threshold:
   * no rate model has been chosen.
   */
  bagUi: {
    presentation: "Presentación",
    quantity: "Cantidad",
    unitPrice: "Precio unitario",
    lineTotal: "Importe",
    remove: "Quitar",
    decrease: "Reducir cantidad",
    increase: "Aumentar cantidad",
    shippingFree: "Envío gratis",
    shippingPending: "Se calcula al pagar",
    freeShippingRemaining: "Faltan {amount} para envío gratis",
    freeShippingReached: "Envío gratis alcanzado",
    totalsNote: "Importes en MXN. IVA incluido en el precio mostrado.",
  },

  /** Commerce controls on a product page. */
  commerceUi: {
    add: "Añadir a la bag",
    added: "Añadido",
    soldOut: "No disponible por ahora",
    unavailable:
      "La compra se activará al concluir la revisión regulatoria y la selección de procesador de pagos.",
    decrease: "Reducir cantidad",
    increase: "Aumentar cantidad",
  },

  /**
   * COMMERCE VOCABULARY.
   *
   * The three stock states, and nothing warmer. "En existencia" is a claim
   * about our own supply, so it may only ever be rendered from a value an
   * owner has actually set — never as a default.
   */
  commerce: {
    availability: {
      "in-stock": "En existencia",
      "made-to-order": "Sobre pedido",
      unavailable: "No disponible por ahora",
    },
  },

  /**
   * DISCOVERY — customer-facing merchandising copy.
   *
   * DRAFT COPY, PENDING OWNER REVIEW. Area names and descriptions are
   * merchandising language, and the descriptions below name a FIELD OF STUDY
   * rather than anything a product does. None of them may be rewritten into a
   * statement about an outcome.
   *
   * Nothing here renders until an area has at least one non-draft assignment,
   * so approving an area's products is also what puts its wording live.
   */
  discovery: {
    label: "Áreas de investigación",
    /** Eyebrow above the product name on a PDP. */
    productLabel: "Área de investigación",
    all: "Todo el catálogo",
    countLabel: "Compuestos",
    research: {
      label: "Investigación",
      qualifier: "En esta área",
      title: "Investigación en esta área",
      lede: "Las referencias citadas por los compuestos de esta área.",
      empty: "Ningún compuesto de esta área cita referencias publicadas.",
      hub: "Índice de NEOGEN Research",
    },
    related: {
      label: "Áreas",
      qualifier: "Compuestos compartidos",
      title: "Áreas relacionadas",
      /* "{n} compuestos en común" */
      shared: "{n} en común",
    },
    areas: {
      metabolic: {
        title: "Investigación metabólica",
        body: "Compuestos estudiados en el contexto de la regulación metabólica.",
      },
      recovery: {
        title: "Recuperación y reparación",
        body: "Compuestos estudiados en el contexto de la reparación tisular.",
      },
      longevity: {
        title: "Longevidad y función celular",
        body: "Compuestos estudiados en el contexto del envejecimiento celular.",
      },
      growth: {
        title: "Desarrollo y rendimiento",
        body: "Compuestos estudiados en el contexto de las vías de crecimiento.",
      },
      skin: {
        title: "Piel y estética",
        body: "Compuestos estudiados en el contexto de la matriz dérmica y el pigmento.",
      },
      neuro: {
        title: "Neurología y sueño",
        body: "Compuestos estudiados en el contexto de la función cognitiva y el sueño.",
      },
      hormonal: {
        title: "Hormonal y reproductiva",
        body: "Compuestos estudiados en el contexto de la regulación hormonal.",
      },
      materials: {
        title: "Materiales de investigación",
        body: "Disolventes y consumibles para preparación y manejo en laboratorio.",
      },
    },
  },

  /**
   * PRODUCT TYPE — the factual axis.
   *
   * `compound` is the default and says only "a substance". Every other label
   * is a statement about what something is, and only renders where an owner
   * has confirmed it.
   */
  productTypes: {
    compound: "Compuesto",
    peptide: "Péptido",
    protein: "Proteína",
    "small-molecule": "Molécula pequeña",
    "vitamin-cofactor": "Vitamina / cofactor",
    "amino-acid-derivative": "Derivado de aminoácido",
    blend: "Mezcla",
    solvent: "Disolvente",
  },

  status: {
    /**
     * Neutral verification vocabulary.
     *
     * `pending` is the only honest state for a document that has not been
     * produced; `placeholder` marks a field whose value is not yet a business
     * fact. Neither may ever be paired with a positive assertion.
     */
    pending: "Pendiente de verificación",
    placeholder: "PLACEHOLDER",
  },

  footer: {
    tagline: "Compuestos de investigación. Construidos sobre evidencia.",
    about: "Laboratorio de compuestos de investigación. Metodología orientada a la documentación.",
    contact: "Contacto",
    serviceArea: "Zona de servicio",
    national: "Nacional",
    columns: {
      products: "Productos",
      research: "Investigación",
      help: "Ayuda",
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
