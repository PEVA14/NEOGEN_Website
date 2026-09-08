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
    description:
      "NEOGEN — precision laboratory. Site under construction; product content is not yet available.",
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
      meta: ["Mexico", "Three flagship compounds", "Site under construction"],
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
        formulation: "Formulation",
        molecularAction: "Molecular action",
        purity: "Purity grade",
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
        vial: "Vial specs",
        state: "Luminous state",
        lot: "Lot",
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
        materialClass: "Material class",
        tactileMatrix: "Tactile matrix",
        status: "Compound status",
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

  products: {
    title: "Products",
    intro: "Catalogue in preparation.",
    empty: "No products published yet.",
    detailTitle: "Product detail",
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
    title: "Research",
    intro: "NEOGEN's research and education hub. Editorial structure in preparation.",
    empty: "No articles published yet.",
    articleTitle: "Article",
  },

  cart: {
    title: "Cart",
    empty: "Your cart is empty.",
    summary: "Order summary",
  },

  checkout: {
    title: "Checkout",
    guestNote: "Guest checkout will be available.",
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
