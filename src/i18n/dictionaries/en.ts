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
    /**
     * Per-page description templates.
     *
     * Every page used to inherit `meta.description`, so 88 English URLs shipped
     * the same one-line summary — including all 83 product pages, which is the
     * text a search result shows and the strongest duplicate-content signal the
     * site was sending. `{name}`, `{classification}`, `{presentations}` and
     * `{count}` are filled from the registry, so every value is a fact the
     * catalogue already holds and none of them is a product claim.
     */
    descriptions: {
      product:
        "{name} — {classification}. Presentations: {presentations}. NEOGEN Mexico catalogue.",
      catalog:
        "{count} research compounds across four categories: metabolic, peptides, blends and solvents. NEOGEN Mexico catalogue.",
      research:
        "The NEOGEN compound register and the classes of technical documentation that accompany each one.",
      cart: "Your NEOGEN Mexico bag.",
      checkout: "NEOGEN Mexico payment process.",
    },
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
      /**
       * Register column heads and document-record labels.
       *
       * These were "Code / Documentation / Articles". The first showed the
       * category under a label promising an identifier, and the third showed
       * the number of presentations under the word "Articles" — asserting that
       * seven articles exist about RETA when none do. Each column now names
       * what it shows.
       */
      columns: ["Category", "Presentations", "Documentation"],
      recordLabel: "Record",
      stateLabel: "State",
      fields: {
        category: "Category",
        presentations: "Presentations",
        documentation: "Documentation",
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
    /*
     * Names the FRAME, not the product. It used to read "Product media —
     * RETA" and was passed to every product page, so eighty compounds carried
     * another product's name under their own image.
     */
    inspectionLabel: "Product media",
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
      /*
       * "Classification", not "Category". The value is the catalogue bucket a
       * compound is filed under — one of four — and labelling it "Category"
       * inside a technical specification table read as a claim about what the
       * substance IS. Several compounds filed under "Peptides" are not
       * peptides.
       */
      classification: "Catalogue classification",
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
      label: "Materials",
      qualifier: "Laboratory consumables",
      title: "Research materials",
      action: "View materials",
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
      sortPriceAsc: "Price ↑",
      sortPriceDesc: "Price ↓",
      typeLabel: "Type",
      filtersLabel: "Filters",
      filtersApplied: "active",
      /** Qualifier before a "from" price on a card. */
      from: "From",
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
        /* Columns carrying real register data. They were "Code / Documentation
           / Literature", and two of the three could only ever show a
           placeholder. */
        columns: ["Category", "Presentations", "From"],
        countLabel: "Published compounds",
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
    emptyNote:
      "Purchasing is not enabled yet. The catalogue can be browsed in full; ordering opens once regulatory review and payment-processor selection are complete.",
    /* Used when purchasing IS enabled — see the bag page for why the
       regulatory note must not render then. */
    emptyNoteEnabled: "Add compounds from the catalogue to see them here.",
    browse: "View catalog",
    summary: {
      title: "Order summary",
      subtotal: "Subtotal",
      shipping: "Shipping",
      taxes: "Taxes",
      total: "Total",
      note: "Shipping and tax amounts will be calculated once ordering is enabled.",
    },
    checkout: "Continue to payment",
    /* Shown while the server reprices the bag and opens the checkout draft. */
    checkoutBusy: "Preparing your order…",
    checkoutPending: "Payment not enabled — pending regulatory and processor review",
  },

  /**
   * POLICY DOCUMENTS. Titles and chrome only — see the Spanish source.
   */
  policies: {
    index: "01",
    label: "Documents",
    qualifier: "Policies",
    approvedLabel: "In effect since",
    description: "{title} — NEOGEN.",
    titles: {
      terms: "Terms & Conditions",
      privacy: "Privacy Notice",
      shipping: "Shipping",
      returns: "Returns & Refunds",
      quality: "Quality & Documentation",
      "research-use": "Research Use",
      "medical-disclaimer": "Medical Disclaimer",
    },
  },
  checkout: {
    index: "01",
    label: "Purchase",
    qualifier: "Process",
    title: "Purchase",
    lede: "Six steps. Every amount is computed on the server from the catalogue, not in your browser.",

    progress: {
      label: "Checkout progress",
      stepOf: "step {n} of {total}",
      completed: "completed",
      current: "current step",
      steps: {
        contact: "Contact",
        shipping: "Shipping",
        delivery: "Delivery",
        payment: "Payment",
        review: "Review",
        confirmation: "Confirmation",
      },
    },

    steps: {
      contact: {
        index: "01",
        title: "Contact",
        note: "The minimum needed to send your receipt and to let delivery reach you.",
        guestNote: "No account required.",
        email: "Email",
        emailHint: "Where the order receipt is sent.",
        name: "Full name",
        nameHint: "As it appears on your identification.",
        phone: "Phone",
        phoneHint: "10 digits. Delivery may need to call you.",
        submit: "Continue to shipping",
      },

      shipping: {
        index: "02",
        title: "Shipping",
        note: "Delivery address within Mexico.",
        recipient: "Recipient",
        recipientHint: "May differ from the person buying.",
        street: "Street",
        numeroExterior: "Exterior no.",
        numeroInterior: "Interior no.",
        numeroInteriorHint: "Optional.",
        colonia: "Colonia",
        postalCode: "Postal code",
        postalCodeHint: "Five digits.",
        city: "City or municipality",
        state: "State",
        statePlaceholder: "Select a state",
        postalNote:
          "We do not autocomplete the colonia: we would rather you typed it than guess it from an unverified source.",
        country: "Country",
        countryLocked: "Mexico — the only destination available.",
        notes: "Delivery instructions",
        notesHint: "Optional. Landmarks, hours, gate.",
        submit: "Continue to delivery",
        back: "Back to contact",
      },

      delivery: {
        index: "03",
        title: "Delivery",
        note: "The service is determined by the address you entered.",
        options: {
          legend: "Delivery service",
          methods: {
            "local-priority": {
              title: "Priority delivery",
              detail: "Guadalajara and Durango. Next day, not same day.",
            },
            "national-standard": {
              title: "National shipping",
              detail: "Everywhere else in the country.",
            },
          },
          estimate: "Estimate",
          estimateDays: { one: "{n} business day", many: "{n} business days" },
          cost: "Cost",
          free: "Free",
          ratePending: "To be confirmed",
          ratePendingNote:
            "No shipping rate has been set for orders below MX$10,000, so the order cannot be totalled. At that amount shipping is free.",
          handlingPending:
            "Special handling (cold chain) has not been determined and is not applied yet.",
          none: "No service is available for this address.",
        },
        submit: "Continue to payment",
        back: "Back to shipping",
      },

      payment: {
        index: "04",
        title: "Payment",
        note: "Card details are captured in a component hosted by the processor and never pass through this site.",
        slot: {
          stateLabel: "Payment state",
          badges: {
            no_provider: "No processor",
            embedded: "On this page",
            redirect: "Redirect",
            instructions: "Transfer",
            processing: "Processing",
            failed: "Declined",
            approved: "Approved",
          },
          states: {
            no_provider: {
              title: "Payment cannot be completed yet",
              body: "NEOGEN has no active payment processor. You can review and register the order: nothing will be charged and the order is not paid.",
              contactLabel: "Available channel",
            },
            embedded: {
              title: "Payment details",
              body: "The processor loads its own fields into this page. NEOGEN never receives or stores the card number.",
              mountLabel: "Area reserved for the processor",
            },
            redirect: {
              title: "Continue with the processor",
              body: "We will take you to the processor's site to complete payment and you will return here afterwards.",
              action: "Go to the processor",
            },
            instructions: {
              title: "Bank transfer",
              body: "Make the transfer using the reference below. The order waits until the processor confirms receipt.",
              referenceLabel: "Reference",
              amountLabel: "Amount",
              expiresLabel: "Valid until",
            },
            processing: {
              title: "Payment in progress",
              body: "The processor is resolving the transaction. Nothing further is needed.",
            },
            failed: {
              title: "Payment did not complete",
              body: "Nothing was charged. You can try again.",
              action: "Try again",
              reasons: {
                unavailable: "No payment processor is configured.",
                invalid_state: "The order is not in a state that can be paid.",
                declined: "The processor declined the transaction.",
                provider_error: "Temporary processor failure. You can retry.",
              },
            },
            approved: {
              title: "Payment approved",
              body: "The processor confirmed the payment.",
            },
          },
        },
        submit: "Continue to review",
        back: "Back to delivery",
      },

      review: {
        index: "05",
        title: "Review",
        note: "Confirm this is exactly what you are ordering.",
        submit: "Register order",
        back: "Back to payment",
        acknowledgements: {
          title: "Declarations",
          requiredNote: "Marked declarations are required.",
        },
        blocked: {
          title: "A step is missing",
          empty: "There are no items in the order.",
          contact_incomplete: "Contact details are incomplete.",
          shipping_incomplete: "The shipping address is incomplete.",
          delivery_missing: "A delivery service has not been chosen.",
          delivery_unquotable:
            "The order cannot be totalled: no shipping rate has been set for this amount.",
          acknowledgements_missing: "Required declarations are missing.",
          already_placed: "This order has already been registered.",
          action: "Go to step",
        },
      },
    },

    summary: {
      title: "Order summary",
      itemsLabel: "Items",
      linesLabel: "Order items",
      quantity: "×",
      subtotal: "Subtotal",
      shipping: "Shipping",
      shippingFree: "Free",
      shippingPending: "To be confirmed",
      total: "Total",
      totalPending: "To be confirmed",
      estimate: "Business days",
      freeShippingRemaining: "{amount} more for free shipping",
      freeShippingReached: "Free shipping reached",
      note: "Prices will include IVA once confirmed. No tax is added separately.",
      editBag: "Edit the bag",
    },

    adjustments: {
      title: "Changes to your order",
      note: "These changes are already reflected in the amounts above.",
      removedUnknown: "An item that is no longer in the catalogue was removed ({id}).",
      removedUnpriced: "{name} was removed: it has no confirmed price.",
      removedUnavailable: "{name} was removed: it is not available.",
      repriced: "{name} changed price: {was} → {now}.",
      quantityClamped: "{name}: the quantity was adjusted from {from} to {to}.",
      acknowledge: "Understood",
    },

    errors: {
      title: "Check these fields",
      required: "This is missing",
      email_invalid: "Check the email format",
      phone_invalid: "Enter 10 digits, or 12 with the 52 country code",
      postal_invalid: "A postal code has five digits",
      state_unknown: "Select a state from the list",
      too_long: "Too long",
      country_unsupported: "We only ship within Mexico",
    },

    unavailable: {
      index: "—",
      label: "Purchase // Not enabled",
      title: "Purchasing is not enabled yet",
      body: "The catalogue can be browsed in full. Orders will be activated once regulatory review and payment-processor selection are complete.",
      catalogue: "View catalogue",
      bag: "View the bag",
    },
    expired: {
      index: "—",
      label: "Purchase // No order",
      title: "There is no order in progress",
      body: "Your bag is empty, or the checkout session ended. You can return to the catalogue and start again.",
      catalogue: "View catalogue",
      bag: "View the bag",
    },

    confirmation: {
      index: "06",
      label: "Confirmation",
      qualifier: "Order",
      title: "Order registered",
      referenceLabel: "Reference",
      placedLabel: "Registered",
      stateLabel: "Payment state",
      statusLabel: "Order status",
      states: {
        created: {
          badge: "Not charged",
          title: "We registered your order. Nothing was charged.",
          body: "NEOGEN has no active payment processor, so the order is not paid. Keep the reference: it is how the order is identified once payment is enabled.",
        },
        pending_payment: {
          badge: "Awaiting",
          title: "Payment still needs to be completed",
          body: "The order is held until the processor confirms the transaction.",
        },
        payment_processing: {
          badge: "Processing",
          title: "Payment is in progress",
          body: "The processor is resolving the transaction. Nothing further is needed.",
        },
        paid: {
          badge: "Paid",
          title: "Payment confirmed",
          body: "The processor confirmed payment for this order.",
        },
        payment_failed: {
          badge: "Declined",
          title: "Payment did not complete",
          body: "Nothing was charged. The order remains registered under this reference.",
        },
        cancelled: {
          badge: "Cancelled",
          title: "Order cancelled",
          body: "This order was cancelled and nothing will be charged.",
        },
        refunded: {
          badge: "Refunded",
          title: "Order refunded",
          body: "The amount for this order was returned.",
        },
      },
      statuses: {
        placed: "Registered",
        in_review: "In review",
        preparing: "Preparing",
        shipped: "Shipped",
        delivered: "Delivered",
        closed: "Closed",
      },
      nextSteps: {
        title: "What happens next",
        body: "Payment will be enabled once regulatory review and processor selection are complete. Until then, NEOGEN's phone line is the only direct channel.",
        contactLabel: "Receipt registered to",
      },
      items: { title: "Items", quantity: "×" },
      contact: { title: "Contact", email: "Email", phone: "Phone" },
      shipping: { title: "Shipping", estimate: "Estimate" },
      totals: { subtotal: "Subtotal", shipping: "Shipping", free: "Free", total: "Total" },
      estimateDays: { one: "{n} business day", many: "{n} business days" },
      acknowledgedLabel: "Declarations accepted",
      actions: { catalogue: "Keep exploring", research: "NEOGEN Research" },
      notFound: {
        index: "—",
        label: "Confirmation // Not found",
        title: "We could not find that order",
        body: "The reference does not match an order from this browser. If you have it written down, keep it and get in touch by phone.",
        catalogue: "View catalogue",
        bag: "View the bag",
      },
    },

    review: {
      items: {
        title: "Items",
        product: "Compound",
        presentation: "Presentation",
        quantity: "Qty",
        unit: "Unit",
        total: "Amount",
      },
      contact: { title: "Contact", email: "Email", name: "Name", phone: "Phone" },
      shipping: {
        title: "Shipping",
        recipient: "Recipient",
        address: "Address",
        notes: "Instructions",
      },
      delivery: {
        title: "Delivery",
        method: "Service",
        estimate: "Estimate",
        cost: "Cost",
        free: "Free",
        pending: "To be confirmed",
      },
      methodNames: {
        "local-priority": "Priority delivery",
        "national-standard": "National shipping",
      },
      totals: {
        subtotal: "Subtotal",
        shipping: "Shipping",
        total: "Total",
        pending: "To be confirmed",
        note: "Prices will include IVA once confirmed. No tax is added separately.",
      },
      edit: "Edit",
      estimateDays: { one: "{n} business day", many: "{n} business days" },
      snapshotLabel: "Prices retrieved",
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
    presentation: "Presentation",
    quantity: "Quantity",
    unitPrice: "Unit price",
    lineTotal: "Amount",
    remove: "Remove",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    shippingFree: "Free shipping",
    shippingPending: "Calculated at checkout",
    freeShippingRemaining: "{amount} more for free shipping",
    freeShippingReached: "Free shipping unlocked",
    totalsNote: "Amounts in MXN. VAT included in the displayed price.",
  },

  /** Commerce controls on a product page. */
  commerceUi: {
    add: "Add to bag",
    added: "Added",
    soldOut: "Currently unavailable",
    unavailable:
      "Purchasing opens once regulatory review and payment-processor selection are complete.",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
  },

  /**
   * COMMERCE VOCABULARY.
   *
   * The three stock states, and nothing warmer. "In stock" is a claim about
   * our own supply, so it may only ever be rendered from a value an owner has
   * actually set — never as a default.
   */
  commerce: {
    availability: {
      "in-stock": "In stock",
      "made-to-order": "Made to order",
      unavailable: "Currently unavailable",
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
    label: "Research areas",
    /** Eyebrow above the product name on a PDP. */
    productLabel: "Research area",
    all: "Full catalogue",
    countLabel: "Compounds",
    areas: {
      metabolic: {
        title: "Metabolic Research",
        body: "Compounds studied in the context of metabolic regulation.",
      },
      recovery: {
        title: "Recovery & Repair",
        body: "Compounds studied in the context of tissue repair.",
      },
      longevity: {
        title: "Longevity & Cellular",
        body: "Compounds studied in the context of cellular ageing.",
      },
      growth: {
        title: "Growth & Performance",
        body: "Compounds studied in the context of growth pathways.",
      },
      skin: {
        title: "Skin & Aesthetics",
        body: "Compounds studied in the context of the dermal matrix and pigment.",
      },
      neuro: {
        title: "Neuro & Sleep",
        body: "Compounds studied in the context of cognitive function and sleep.",
      },
      hormonal: {
        title: "Hormonal & Reproductive",
        body: "Compounds studied in the context of hormonal regulation.",
      },
      materials: {
        title: "Research Materials",
        body: "Solvents and consumables for laboratory preparation and handling.",
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
    compound: "Compound",
    peptide: "Peptide",
    protein: "Protein",
    "small-molecule": "Small molecule",
    "vitamin-cofactor": "Vitamin / cofactor",
    "amino-acid-derivative": "Amino acid derivative",
    blend: "Blend",
    solvent: "Solvent",
  },

  status: {
    /**
     * Neutral verification vocabulary.
     *
     * `pending` is the only honest state for a document that has not been
     * produced; `placeholder` marks a field whose value is not yet a business
     * fact. Neither may ever be paired with a positive assertion.
     */
    pending: "Pending verification",
    /** SYSTEM STATUS V1 technical convention: LABEL — PLACEHOLDER. */
    placeholder: "PLACEHOLDER",
  },

  footer: {
    tagline: "Research compounds. Built around evidence.",
    about: "Research compound laboratory. Documentation-first methodology.",
    contact: "Contact",
    serviceArea: "Service area",
    national: "Nationwide",
    columns: {
      products: "Products",
      research: "Research",
      help: "Help",
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
