import type { Dictionary } from "../types";

/**
 * English (en-US).
 *
 * Typed as `Dictionary`, which is derived from the Spanish source dictionary —
 * a missing or misspelled key is a type error, not a runtime surprise.
 */
const en: Dictionary = {
  meta: {
    siteName: "NEOGEN",
    tagline: "Living Laboratory",
    description: "Research compounds with technical documentation. The NEOGEN catalog for Mexico.",
  },

  a11y: {
    skipToContent: "Skip to main content",
    mainNavigation: "Main navigation",
    footerNavigation: "Footer navigation",
    languageSwitcher: "Change language",
    currentLanguage: "Current language",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    breadcrumb: "Breadcrumb",
  },

  nav: {
    home: "Home",
    products: "Products",
    research: "NEOGEN Research",
    cart: "Cart",
    checkout: "Checkout",
    /** Brand label. SYSTEM STATUS V1: BAG, not Cart. The route stays /carrito. */
    bag: "BAG",
    /** Route prepared; the page is built in a later phase. */
    about: "About NEOGEN",
  },

  home: {
    hero: {
      eyebrow: "NEOGEN — Living Laboratory",
      title: "NEOGEN",
      lede: "Research compounds built around evidence.",
      cta: "Explore products",
      scrollCue: "Scroll",
      meta: ["Mexico", "Research compounds"],
      vialAlt: "NEOGEN glass vial with a RETA label, tilted against a dark background.",
      loadingLabel: "Loading model",
      staticLabel: "Static view",
    },

    evolution: {
      index: "01",
      label: "NEOGEN",
      title: "Creative evolution",
      lede: "A new environment for molecular research. Precision compounds, documented evidence, premium presentation.",
      points: [
        {
          title: "Scientific",
          body: "Compounds described according to documented molecular structures. Chemical realities presented without marketing inflation or generic visual noise.",
        },
        {
          title: "Precise",
          body: "Format, storage parameters and lot-specific data surfaced directly. Complete documentation supports informed research decisions.",
        },
        {
          title: "Documented",
          body: "Full documentation accompanies each compound. Certificates of analysis, storage parameters and handling protocols — referenced, not assumed.",
        },
      ],
    },

    reta: {
      eyebrow: "Retatrutide — research compound",
      beats: [
        {
          eyebrow: "Flagship product",
          statement: "The environment becomes precision.",
          body: "Flagship molecular matrix. Cold blue light defines glass refractions and geometric surfaces, creating an environment of optical precision.",
        },
        {
          eyebrow: "Material",
          statement: "Clear glass, controlled light.",
          body: "Transparent pharmaceutical glass, satin aluminium seal and a technical paper label. Every surface answers to a different light source.",
        },
        {
          eyebrow: "Specification",
          statement: "Documentation before promise.",
          body: "Formulation, molecular action and purity grade are published per lot once analysis is available. Until then the fields stay open.",
        },
        {
          eyebrow: "Availability",
          statement: "RETA — Retatrutide Research.",
          body: "The first of NEOGEN's three flagship compounds. Catalogue, pricing and documentation in preparation.",
        },
      ],
      specs: {
        presentation: "Presentations",
        category: "Category",
        from: "From",
      },
      vialAlt:
        "NEOGEN glass vial with a RETA label, tilted in a dark environment lit with blue light.",
      loadingLabel: "Loading model",
      staticLabel: "Static view",
      progressLabel: "Sequence",
    },

    catalog: {
      index: "04",
      label: "Discovery",
      title: "Explore the catalogue",
      action: "All products",
      categories: [
        {
          index: "01",
          title: "Peptides",
          body: "Research-grade peptide chains.",
          link: "Explore catalogue",
        },
        {
          index: "02",
          title: "Compounds",
          body: "Isolated chemical agents, raw material precursors and analytical laboratory standards.",
          link: "Explore catalogue",
        },
        {
          index: "03",
          title: "Protocols",
          body: "Comprehensive documentation, storage sequences and reconstitution methodologies.",
          link: "Explore catalogue",
        },
      ],
    },

    glow: {
      eyebrow: "Research compound — Luminous",
      statement: "The environment becomes light.",
      body: "The vial is the source. Saturated amber gold illumination emanates from the core, spreading warm refractive patterns across darkness. Clean, focused luminescence.",
      specs: {
        presentation: "Presentations",
        category: "Category",
        from: "From",
      },
      mediaLabel: "Media pending",
    },

    research: {
      index: "06",
      label: "Research",
      title: "NEOGEN Research",
      action: "Go to research",
      lede: "Compound profiles, analysis documentation and research literature. Every product in the catalogue connected to its evidence.",
      /** Register column heads and document-record labels. */
      columns: ["Code", "Documentation", "Articles"],
      recordLabel: "Record",
      stateLabel: "State",
      fields: {
        code: "Code",
        documentation: "Documentation",
        articles: "Articles",
      },
    },

    quality: {
      index: "07",
      label: "Quality",
      title: "Analysis and documentation",
      points: [
        {
          title: "Compounds",
          body: "Complete compound library detailing compound data, specific weights and documented classifications.",
        },
        {
          title: "Analysis",
          body: "COA database linking analytical profiles and documentation to each compound lot.",
        },
        {
          title: "Library",
          body: "Scientific documentation database detailing synthesis routes and assay methodologies.",
        },
        {
          title: "Documentation",
          body: "Reconstitution sequences, storage protocols and raw technical specification sheets.",
        },
      ],
    },

    ghkcu: {
      eyebrow: "Copper peptide complex — GHK-Cu",
      statement: "The environment becomes material.",
      body: "Heavy tactile context. Saturated verdigris and deep oxidised copper replace the clinical template. Symmetrical physical textures present weight where GLOW presents light.",
      specs: {
        presentation: "Presentations",
        category: "Category",
        from: "From",
      },
      mediaLabel: "Sample pending",
    },

    products: {
      index: "08",
      label: "Products",
      title: "Flagship compounds",
      action: "Full catalogue",
      meta: "SKU — PLACEHOLDER // PRICE — PLACEHOLDER",
      cta: "View product",
      mediaLabel: "Image pending",
      worldLabels: {
        reta: "Precision",
        glow: "Luminous",
        "ghk-cu": "Material",
      },
    },
  },

  pdp: {
    inspectionLabel: "Product media — RETA",
    /** Notes that the media responds to the cursor. Desktop pointers only. */
    viewerHint: "Cursor-responsive view",
    commerce: {
      index: "01",
      section: "Product",
      qualifier: "Research compound",
      descriptor:
        "Pharmaceutical glass vial with a satin aluminium seal and a technical paper label. Presented in a controlled environment; each container is documented lot by lot.",
      variantLabel: "Select format",
      variantPending: "Formats pending verification",
      quantityLabel: "Quantity",
      priceLabel: "Price",
      pricePending: "Price pending",
      addToBag: "Add to bag",
      commercePending: "Purchase not enabled — pending regulatory and processor review",
      documentation: "View documentation",
      shippingLabel: "Shipping",
    },
    specifications: {
      index: "02",
      label: "Specifications",
      qualifier: "Technical sheet",
      title: "Product specifications",
      compound: "Compound",
      category: "Category",
      presentation: "Presentations",
      composition: "Composition",
    },
    documentation: {
      index: "03",
      label: "Documentation",
      qualifier: "Technical verification",
      title: "Analysis and documentation",
      records: [
        { title: "Certificate of analysis", body: "Per-lot analytical profile." },
        { title: "Technical sheet", body: "Material and format specification." },
        { title: "Handling protocol", body: "Reconstitution and storage sequences." },
      ],
      /** No document exists yet; no download is offered. */
      unavailable: "Document unavailable",
    },
    research: {
      index: "04",
      label: "Research",
      qualifier: "Related literature",
      title: "Related research",
      lede: "Literature and documentation connected to this compound.",
      empty: "No literature published for this compound yet.",
      action: "Go to NEOGEN Research",
    },
    related: {
      index: "05",
      label: "Products",
      qualifier: "Catalogue",
      title: "Related compounds",
      action: "Full catalogue",
    },
  },

  products: {
    title: "Catalog",
    detailTitle: "Product record",
    catalog: {
      index: "01",
      label: "Catalog",
      qualifier: "Research compounds",
      title: "Compounds",
      lede: "Each compound is presented with its material record and its technical documentation.",
      searchLabel: "Search",
      searchPlaceholder: "Compound name",
      filterLabel: "Compound",
      filterAll: "All",
      categoryLabels: {
        metabolic: "Metabolic",
        peptides: "Peptides",
        blends: "Blends",
        solvents: "Solvents",
      },
      sortLabel: "Sort",
      sortIndex: "Index",
      sortName: "Name",
      viewLabel: "View",
      viewGrid: "Grid",
      viewIndex: "Register",
      countLabel: "Showing",
      empty: "No compound matches the applied filters.",
      clear: "Clear filters",
      columns: ["Category", "Presentations", "Price"],
      documentationPending: "Unavailable",
    },
    sections: {
      experience: "Experience",
      commerce: "Purchase",
      specifications: "Specifications",
      documentation: "Documentation",
      research: "Research",
      related: "Related products",
    },
  },

  research: {
    title: "NEOGEN Research",
    articleTitle: "Article",
    hub: {
      index: "01",
      label: "Research",
      qualifier: "Documentation and evidence",
      title: "Documentation",
      lede: "Each compound is published alongside its technical record. Documents appear here as they are verified.",
      register: {
        index: "02",
        label: "Compounds",
        qualifier: "Register",
        title: "Compound register",
        action: "Full catalog",
        columns: ["Code", "Documentation", "Literature"],
      },
      documents: {
        index: "03",
        label: "Documentation",
        qualifier: "Record classes",
        title: "Record classes",
        lede: "The documentation system carries the following classes of record, per compound and per lot.",
        unavailable: "Document unavailable",
      },
      literature: {
        index: "04",
        label: "Literature",
        qualifier: "Publications",
        title: "Literature",
        empty: "No literature has been published yet.",
        note: "References will be published with their identifier and a link to the original source.",
      },
    },
  },

  cart: {
    index: "01",
    label: "Bag",
    qualifier: "Order",
    title: "Bag",
    countLabel: "Items",
    empty: "Your bag is empty.",
    emptyNote: "Purchasing is not enabled yet: prices and formats are still pending verification.",
    browse: "View catalog",
    summary: {
      title: "Order summary",
      subtotal: "Subtotal",
      shipping: "Shipping",
      taxes: "Taxes",
      total: "Total",
      note: "Amounts will be calculated once product data is verified.",
    },
    checkout: "Continue to payment",
    checkoutPending: "Payment not enabled — pending regulatory and processor review",
  },

  checkout: {
    index: "01",
    label: "Payment",
    qualifier: "Process",
    title: "Payment",
    lede: "Checkout will be activated once regulatory review is complete and a payment processor has been selected.",
    guestNote: "Guest checkout will be available.",
    steps: {
      contact: {
        index: "01",
        title: "Contact",
        note: "For the receipt and order updates.",
        email: "Email address",
      },
      shipping: {
        index: "02",
        title: "Shipping",
        note: "The service area is to be defined.",
        name: "Full name",
        address: "Address",
        city: "City",
        state: "State",
        postal: "Postal code",
        country: "Country",
      },
      payment: {
        index: "03",
        title: "Payment",
        note: "Payment details are captured in a component hosted by the processor and never pass through this site. No processor has been selected.",
      },
      confirmation: {
        index: "04",
        title: "Confirmation",
        note: "Order summary and receipt, available once payment is enabled.",
      },
    },
    place: "Place order",
    pending: "Payment not enabled — pending regulatory and processor review",
    emptyBag: "There are no items in your bag.",
    browse: "View catalog",
  },

  status: {
    pending: "Pending verification",
    notAvailable: "Not available",
    tbd: "To be determined",
    /** SYSTEM STATUS V1 technical convention: LABEL — PLACEHOLDER. */
    placeholder: "PLACEHOLDER",
    /** The field already carries the label; the value is just the token. */
    lot: "XXXX",
    placeholderNotice:
      "Placeholder. This value has not been verified and must not be treated as final information.",
  },

  footer: {
    tagline: "Research compounds. Built around evidence.",
    about: "Research compound laboratory. Documentation-first methodology.",
    serviceArea: "Service area",
    columns: {
      products: "Products",
      research: "Research",
      help: "Help",
      legal: "Legal",
    },
    links: {
      allCompounds: "All compounds",
      documentation: "Documentation",
    },
  },

  error: {
    notFoundTitle: "Page not found",
    notFoundBody: "The page you are looking for does not exist or has moved.",
    genericTitle: "Something went wrong",
    genericBody: "An unexpected error occurred. Please try again.",
    retry: "Try again",
    backHome: "Back to home",
    loading: "Loading…",
  },
};

export default en;
