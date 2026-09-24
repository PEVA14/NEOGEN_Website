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
      researchReferences:
        "The full index of sources cited across NEOGEN: every reference with its identifiers and the compounds whose profile cites it.",
      qualityExplorer:
        "NEOGEN quality documentation, tied to the exact presentation and lot each document examines.",
      research:
        "NEOGEN compound index, research areas, and the model each presentation's quality is documented by.",
      peptides:
        "What a peptide is, why they are studied, and the condition NEOGEN's compounds are sold under in Mexico.",
      faq: "Shipping, documentation, payment and research use: frequently asked questions for NEOGEN Mexico.",
      articles:
        "NEOGEN notes on laboratory vocabulary, analytical documentation and the handling of lyophilised materials.",
      compendium:
        "Compendium of {count} research compounds: search by name, area or research line, with scientific records and their sources.",
      compound:
        "{name}: scientific record with {statements} statements and {references} numbered references. NEOGEN Research.",
      lines:
        "NEOGEN research lines: receptors, pathways and processes the literature studies, with the compounds each one examines.",
      line: "{name}: compounds studied in this research line, with the statement and source behind each one.",
      glossary:
        "NEOGEN glossary: {count} terms on structure, mechanism, studies, quality and materials, with the records that use them.",
      handling:
        "Laboratory handling of lyophilised materials: receipt, stability, common errors and storage. NEOGEN Research.",
      start:
        "Start here: what NEOGEN Research is, how it is organised, how to read a scientific record and how to weigh its documentation.",
      cart: "Your NEOGEN Mexico bag.",
      checkout: "NEOGEN Mexico payment process.",
    },
  },

  atlas: {
    name: "Atlas",
    eyebrow: "NEOGEN Atlas",
    title: "Your personal advisor",
    lede: "Tell Atlas what you're looking for, how you like to buy and how much you want to spend. It goes through the whole catalogue and tells you where to start, what else to consider, and why.",
    metaDescription:
      "NEOGEN Atlas: your personal advisor. Answer a few questions about your goals, experience and budget, and get a selection of NEOGEN products explained for you.",
    intro: {
      start: "Get started",
      duration: "About two minutes",
      boundary:
        "Atlas chooses from your goals, preferences and budget. It does not use health, weight or medication information, and it does not suggest amounts, methods of use or schedules.",
      sources:
        "Prices, presentations and documentation come straight from the catalogue. Atlas only writes the explanation.",
    },
    progress: "Step {n} of {total}",
    /* Chrome the RENDERER needs; every question's own words live in
       src/content/atlas/questionnaire.ts. */
    field: {
      optional: "Optional",
      selected: "{n} of {max} chosen",
      limit: "You've chosen {max}. Remove one to change it.",
      ranks: ["Priority 1", "Priority 2", "Priority 3"],
      search: "Search for a product",
      empty: "No product matches.",
      remove: "Remove {name}",
      counter: "{n} / {max}",
      meta: {
        products: "{n} products",
        compounds: "{n} compounds",
        compoundOne: "1 compound",
        from: "From",
      },
    },
    controls: {
      back: "Back",
      next: "Next",
      generate: "See my selection",
      restart: "Start over",
      edit: "Change answers",
    },
    generating: {
      title: "Preparing your selection",
      stages: [
        "Reading your answers",
        "Searching the whole catalogue",
        "Comparing prices, presentations and documentation",
        "Writing your selection",
      ],
      note: "Prices, presentations and documentation come from the catalogue; Atlas writes the explanation.",
    },
    error: {
      title: "We couldn't prepare your selection",
      body: "Something went wrong. Your answers are still here.",
      retry: "Try again",
      rateLimited: "You asked for several selections in a row. Wait a few minutes and try again.",
      invalid: "Some answers aren't valid. Check them and try again.",
    },
    result: {
      eyebrow: "Your selection",
      for: "For {name}",
      welcomeBack: "Good to see you again",
      modes: {
        ai: "Written by AI · checked against the catalogue",
        development: "Development composition · no AI configured",
        catalogue: "Catalogue selection · AI explanation unavailable",
      },
      stats: {
        start: "To start",
        more: "To consider",
        topics: "Topics",
        pool: "Products reviewed",
      },
      about: { title: "What we understood about you" },
      start: {
        title: "Start here",
        lede: "What we suggest first, in the presentation that best fits your answers.",
      },
      more: {
        title: "Also for you",
        lede: "Worth considering now or in your next order.",
      },
      supplies: { title: "Supplies", lede: "The supplies you asked to include." },
      product: {
        inMind: "You had this in mind",
        why: "Why",
        suggested: "We suggest",
        presentations: "Presentations",
        entry: "From",
        documented: "Public documentation",
        undocumented: "No public documentation yet",
        fits: "Fits your budget",
        over: "Over your budget",
        signature: "Signature",
        overlap: "Spans your topics",
        topics: "Topics",
        research: "What it does",
        studied: "What has been studied",
        source: "{n} published source",
        sources: "{n} published sources",
        open: "View product",
        addAll: "Add “Start here” to the bag",
        addedAll: "Added to the bag",
      },
      map: {
        title: "How it connects",
        lede: "Your topics and the products in your selection. Each line joins a product to a topic it sits in.",
        label: "Map of your topics and the products in your selection",
        column: "Products",
        legend: { start: "Start here", more: "Also for you", bridges: "Spans your topics" },
      },
      topics: {
        title: "Your topics",
        count: "{n} products",
        from: "From",
        open: "View topic",
      },
      budget: {
        title: "Your budget",
        open: "No cap: we don't rule anything out on price.",
        cap: "Your cap",
        start: "Start here",
        all: "Whole selection",
        fits: "Within your budget",
        over: "Over your budget",
        unknown: "No published price",
        method:
          "The sum of each product's suggested presentation, at catalogue prices. Shipping not included.",
      },
      detail: { show: "Show the map and your topics", hide: "Hide the map and your topics" },
      next: { title: "Next steps" },
      tips: { title: "Tips for your order" },
      documentation: {
        title: "Documentation",
        none: "There is no public documentation for the products in your selection yet. When there is, it will appear tied to the exact presentation it examines.",
        some: "{n} public records linked to the products in your selection.",
        model: "How we document each product",
        explorer: "Explore the documentation",
        references: "Public references",
      },
      ledger: {
        title: "How Atlas used your answers",
        lede: "Every answer, and what Atlas did with it. Anything not used to choose products never leaves your device.",
        question: "Question",
        answer: "Your answer",
        used: "Used to",
        skipped: "Not answered",
        notUsed: "Not used",
        noteGiven: "Note included",
        yes: "Yes",
        no: "No",
        uses: {
          "candidate-selection": "Choose and order products",
          retrieval: "Choose which research to show you",
          "ai-context": "Explain the selection to you",
          recap: "Show it back to you",
          presentation: "Shape this page",
        },
        withheld: {
          health:
            "Health and medication: Atlas does not choose products from this, and it never leaves your device.",
          body: "Body data: Atlas does not choose products from this, and it never leaves your device.",
          lifestyle:
            "Habits: Atlas does not choose products from this, and it never leaves your device.",
          administration:
            "How and for how long something would be used: Atlas gives no instructions for use. It never leaves your device.",
          outcome:
            "Personal outcome: Atlas does not match products to personal outcomes. It never leaves your device.",
          "use-history":
            "Use history: Atlas does not choose products from this, and it never leaves your device.",
          unclassified: "Not assigned a use yet, so it never leaves your device.",
          goal: "The current policy does not use this answer to choose products. It never leaves your device.",
          experience:
            "The current policy does not use this answer to choose products. It never leaves your device.",
          context: "The current policy does not use this answer. It never leaves your device.",
          commerce: "The current policy does not use this preference. It never leaves your device.",
          identity: "Used on this page only.",
          "health-note":
            "Your note included health topics, so it was discarded in full before your selection was prepared. Your other answers were handled as this table shows.",
          "name-private": "Used on this page only; never sent to the AI.",
        },
      },
      reasons: {
        "named-by-visitor": "You named it",
        "policy-pin": "Included by Atlas policy",
        "area-match": "In {ref}",
        "function-match": "Tagged with {ref}",
        "spans-areas": "Spans several of your topics",
        signature: "Signature line",
        documented: "Publicly documented",
        referenced: "Published sources",
        value: "Accessible entry price",
        "within-budget": "Within your budget",
        "over-budget": "Over your budget",
        unavailable: "Unavailable for now",
        "catalogue-wide": "Catalogue highlight",
      },
      empty: {
        title: "No products found",
        body: "There are no products in your topics in this format. Remove the format filter or choose other topics.",
      },
      healthNotice:
        "Your note mentioned personal or health topics. Atlas does not assess health or medication and did not take it into account. Any decision about your health belongs with a health professional.",
      screenedNotice:
        "Your note included health information, so it was discarded before your selection was prepared. Your other answers were handled as usual.",
      disclaimer:
        "Atlas helps you choose within NEOGEN's catalogue based on your goals, preferences and budget. It is not medical advice: it does not assess your health and does not suggest amounts, methods of use or schedules.",
    },
    destinations: {
      catalogue: "Full catalogue",
      "research-index": "Product index",
      "quality-model": "How we document",
      explorer: "Documentation explorer",
    },
    compose: {
      and: "and",
      headline: {
        "first-order": "Your first order, starting with {topic}",
        compare: "Your options in {topic}, side by side",
        deepen: "{topic} in depth: where to start",
        "cover-topics": "{topics} in a single order",
        browse: "A tour of {topics}",
      },
      headlineArea: "Your selection in {topic}",
      headlineCatalogue: "A selection from the NEOGEN catalogue",
      summary:
        "Start with {start}. After that, consider {more} more products. We chose them for {reasons}.",
      summaryNoMore: "Start with {start}. We chose it for {reasons}.",
      reasons: {
        topics: "the catalogue topic that matches your goal",
        catalogue: "the signature line and the documentation available",
        inMind: "the products you already had in mind",
        budget: "your budget",
        priorities: {
          documentation: "the documentation available",
          price: "price",
          signature: "your interest in the signature line",
          overlap: "covering several of your topics",
        },
      },
      aboutYou: {
        topics: "we started from {topics}, the catalogue topic that matches your goal.",
        catalogue:
          "your goal doesn't match a single catalogue topic, so we started from the whole catalogue.",
        experience: "{experience}.",
        intent: "you want to {intent}.",
        budget: "you're looking for options {budget}, {horizon}.",
      },
      experience: {
        new: "this is your first time with products like these",
        some: "you've bought products like these before",
        experienced: "you're very experienced with products like these",
      },
      intent: {
        "first-order": "place your first order",
        compare: "compare options before deciding",
        deepen: "go deep on one topic",
        "cover-topics": "cover several topics in one order",
        browse: "explore the catalogue at your own pace",
      },
      budgetOpen: "without a budget cap",
      budgetSet: "within a set budget",
      horizon: {
        "one-order": "to buy in a single order",
        "over-time": "to buy bit by bit",
      },
      why: {
        inMind: "You had it in mind.",
        policy: "Atlas policy includes it.",
        catalogue: "It's one of the catalogue's highlights.",
        primary: "It's in {topic}, your main topic.",
        secondary: "It's in {topic}, another of your topics.",
        outside: "You picked it even though it sits outside your topics.",
        overlap: "It sits in {topics}, so it covers more than one of your topics.",
        signature: "It's part of NEOGEN's signature line.",
        documented: "It has public documentation.",
        undocumented: "It has no public documentation yet.",
        value: "Its entry price is among the most accessible in your topics.",
        fits: "It fits your budget.",
        over: "It's above your budget; keep it in mind for later.",
        size: {
          smallest: "We're showing its smallest presentation.",
          largest: "We're showing its largest presentation within your budget.",
        },
        supply: "One of the supplies you asked to include.",
      },
      topic: "{topic} has {count} products in the catalogue.",
      topicPicked: "{count} are in your selection.",
      path: {
        area: "See every product in {label}, with its presentations.",
        product: "Open {label} to see all its presentations and prices.",
        catalogue: "Compare against the full catalogue and its filters.",
        "research-index": "Look up any product in the NEOGEN Research index.",
        "quality-model": "See how each document is tied to the presentation it examines.",
        explorer: "Explore the public documentation available.",
      },
      tips: {
        new: "Open each product's page before deciding: it shows every presentation and price.",
        compare:
          "Compare the product pages side by side: presentations, entry price and documentation.",
        overTime: "Start with “Start here” and keep the rest for your next orders.",
        soon: "Check availability on each product page before ordering.",
        documentation: "See how we document each product to know what backs each presentation.",
        price: "Compare the price of each presentation on its page before choosing.",
      },
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
    peptides: "Peptides",
    faq: "FAQ",
    atlas: "Atlas",
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

    hub: {
      index: "01",
      label: "Index",
      title: "Where to start",
      lede: "The full catalog, the areas it is organised by, the three flagship worlds, and the model every presentation is documented under.",
      counts: {
        products: "Compounds",
        presentations: "Presentations",
        areas: "Areas",
        worlds: "Worlds",
      },
      previewLabel: "Preview",
      rows: {
        catalog: {
          name: "Catalog",
          descriptor: "Every compound with its presentation ladder and its price.",
          action: "See the catalog",
        },
        areas: {
          name: "Areas",
          descriptor: "Eight ways into the catalog, by the ground being studied.",
          action: "See the areas",
        },
        worlds: {
          name: "Worlds",
          descriptor:
            "RETA, GLOW and GHK-Cu: the three compounds with an environment of their own.",
          action: "See the flagships",
        },
        research: {
          name: "Research",
          descriptor: "The compound index, the areas, and the public references.",
          // Shortened from "Go to NEOGEN Research" — see the Spanish note: the
          // long label collided with the row's mark on narrower desktops.
          action: "NEOGEN Research",
        },
        quality: {
          name: "Quality",
          descriptor: "How a document is tied to the exact presentation it examines.",
          action: "See the model",
        },
      },
      research: {
        index: "Compound index",
        areas: "Research areas",
        model: "Evidence model",
      },
      quality: {
        points: [
          "An analysis names the exact presentation it examined.",
          "A lot certificate covers that lot and no other.",
          "Where no document exists, no seal appears in its place.",
        ],
        explorer: "Explore the documentation",
      },
      keys: "Each destination is a link; focusing one shows its preview.",
      atlas: {
        label: "New",
        title: "Your personal advisor",
        body: "Tell Atlas what you're looking for, how you buy and how much you want to spend. It goes through the whole catalogue and tells you where to start, and why.",
        action: "Start with Atlas",
      },
    },

    evolution: {
      index: "02",
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
          body: "Amount per vial, vials per presentation, and composition where the source states it. Nothing is inferred from a name.",
        },
        {
          title: "Documented",
          body: "Documentation attaches to the exact presentation and lot it examines. Where no document exists, no seal appears in its place.",
        },
      ],
    },

    reta: {
      cta: "View RETA",
      /*
       * RETA ON THE HOMEPAGE — labelled facts, not poetry.
       *
       * Every block says one checkable thing: what it is, how it is sold, what
       * the packaging is and what gets published. Figures (area,
       * presentations, prices, vials) are read from the registry. Nothing
       * describes mechanisms, effects, purity or lots (CLAUDE.md,
       * CONVENTIONS §8).
       */
      eyebrow: "Signature compound · Precision",
      title: "RETA",
      subtitle: "Retatrutide Research",
      lede: "The first of NEOGEN's three signature compounds, shown in its own environment.",
      /** The world's line: the product page uses it too. */
      statement: "The environment becomes precision.",
      facts: {
        what: {
          label: "What it is",
          title: "Retatrutide, for research",
          body: "A research compound in the {area} area, sold in packs of {pack} vials.",
          bodyNoPack: "A research compound in the {area} area.",
        },
        packaging: {
          label: "The packaging",
          title: "Clear glass, aluminium seal",
          body: "Transparent glass, a satin aluminium seal and a technical label carrying the compound's name.",
        },
        presentations: {
          label: "Presentations",
          title: "{n} strengths, each with its own price",
        },
        documentation: {
          label: "Documentation",
          title: "Documents before promises",
          body: "Every analysis is published with its issuer, its date and the exact presentation it examines. Nothing is claimed before the document exists.",
        },
      },
      vialAlt: "NEOGEN glass vial labelled RETA, tilted in a dark environment with blue light.",
      loadingLabel: "Loading model",
      staticLabel: "Static view",
    },

    catalog: {
      index: "03",
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
          title: "Materials",
          body: "Solvents and laboratory consumables.",
          link: "Explore catalogue",
        },
      ],
    },

    glow: {
      /*
       * GLOW ON THE HOMEPAGE — the light, split into what it contains.
       *
       * GLOW is a blend, and that is the first thing to say. Composition,
       * milligrams, proportions, pack and prices come from the registry.
       * Nothing describes effects or uses.
       */
      eyebrow: "Signature compound · Luminous",
      title: "GLOW",
      /** The world's line: the product page uses it too. */
      statement: "The environment becomes light.",
      lede: "{n} peptides in a single {total} mg vial.",
      blend: {
        label: "The blend",
        share: "{pct}% of the blend",
        alone: "Also sold alone",
        from: "From",
      },
      presentation: {
        label: "The presentation",
        pack: "{strength} × {n} vials",
        perVial: "{price} per vial",
      },
      cta: "View GLOW",
    },

    /** See the Spanish source for why the three-row register was replaced. */
    research: {
      index: "04",
      label: "Research",
      title: "NEOGEN Research",
      action: "Go to research",
      lede: "The compound index, the areas they are studied in, and the model their quality is documented by.",
      railLabel: "Catalogue compounds",
      tailLabel: "Published compounds",
      tailAction: "See the full catalogue",
    },

    quality: {
      index: "05",
      label: "Quality",
      title: "Evidence, not seals",
      lede: "Every quality status on NEOGEN comes from a document you can open, tied to the exact presentation it examines.",
      action: "How it is documented",
    },

    ghkcu: {
      /*
       * GHK-Cu ON THE HOMEPAGE — its record, in layers.
       *
       * Material is weight and surface; here the weight is literal: two
       * presentations drawn to scale. Presentations, prices, areas, the blend
       * that contains it and the references come from the registry. Nothing
       * describes effects or uses.
       */
      eyebrow: "Signature compound · Material",
      title: "GHK-Cu",
      /** The world's line: the product page uses it too. */
      statement: "The environment becomes material.",
      lede: "A research compound in {n} presentations: {list}.",
      strata: {
        presentations: {
          label: "Presentations",
          pack: "× {n} vials",
          perVial: "{price} per vial",
        },
        areas: { label: "Areas" },
        usedIn: { label: "Also in", body: "{mg} mg in every {total} mg vial" },
        research: {
          label: "Research",
          body: "Sourced profile · {n} references",
          action: "Read the profile",
        },
      },
      cta: "View GHK-Cu",
    },

    ticker: {
      label: "Full catalog",
      from: "From",
      pause: "Pause the moving catalog",
      play: "Resume the moving catalog",
    },

    shelf: {
      index: "02",
      label: "Catalogue",
      title: "{n} compounds, one catalogue",
      lede: "One entry compound per area, with its presentation ladder and its price.",
      action: "View the full catalogue",
      areasLabel: "Shop by area",
    },

    science: {
      index: "05",
      label: "Evidence",
      title: "Every profile, with its source",
      lede: "NEOGEN's compound profiles cite published literature: authors, journal, DOI. Nothing is stated without a reference that can be opened.",
      profiles: "Sourced profiles",
      references: "Public references",
      areas: "Research areas",
      action: "Go to NEOGEN Research",
      referencesAction: "View the references",
    },

    /**
     * V1 HOMEPAGE — the store opening up after the brand introduction.
     * Every figure in these strings is filled from the registry; nothing here
     * states a claim, a promise or a popularity signal.
     */
    gateway: {
      index: "01",
      label: "Explore",
      title: "Explore NEOGEN",
      lede: "Compounds, areas and research. Choose where to begin.",
      aside: "Science. Products. Catalogue.",
      products: {
        name: "Products",
        body: "The full catalogue, every compound with its presentation ladder and its price.",
        facts: "{products} compounds · {presentations} presentations",
        from: "From",
      },
      research: {
        name: "Research",
        body: "Compound profiles with published sources, organised by area.",
        profiles: "Sourced profiles",
        references: "References",
        areas: "Areas",
        latest: "Latest references",
      },
      areas: {
        name: "By area",
        body: "{n} ways into the catalogue.",
        all: "See the areas",
        count: "{n} compounds",
      },
      search: {
        name: "Search",
        label: "Search for a compound",
        placeholder: "e.g. BPC157, 10 mg",
        submit: "Search",
        try: "Try",
        byStrength: "By strength",
        index: "{products} compounds · {presentations} presentations indexed",
      },
      worlds: {
        name: "Signature",
        body: "Three compounds, three environments.",
      },
      quality: {
        name: "Quality",
        body: "Public documentation per presentation.",
      },
    },
    worlds: {
      index: "02",
      label: "Signature",
      title: "Three worlds",
      lede: "Three compounds with their own environment, and a broader collection behind them.",
      action: "Full catalogue",
      taglines: {
        reta: "The environment becomes precision.",
        glow: "The environment becomes light.",
        "ghk-cu": "The environment becomes material.",
      },
      view: "View {name}",
    },
    collection: {
      index: "03",
      label: "Collection",
      title: "{n} compounds. {areas} areas.",
      action: "View the whole catalogue",
      count: "{n} compounds",
    },
    explorer: {
      index: "04",
      label: "Areas",
      title: "Explore by area",
      tabsLabel: "Catalogue areas",
      count: "{n} compounds",
      from: "From",
      enter: "View the area",
      all: "All {n} compounds in the area",
    },
    closing: {
      index: "06",
      label: "Catalogue",
      title: "The whole catalogue",
      lede: "{products} compounds and {presentations} presentations, each with its price. By area, A to Z.",
      count: "{n} compounds",
      more: "All {n} in {area}",
      facts: "{products} compounds · {presentations} presentations · {areas} areas",
      action: "View the full catalogue",
      search: "Search for a compound",
    },
    products: {
      index: "01",
      label: "Flagship",
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
      variantLabel: "Select format",
      variantPending: "Formats pending verification",
      quantityLabel: "Quantity",
      priceLabel: "Price",
      pricePending: "Price pending",
      addToBag: "Add to bag",
      commercePending: "Purchase not enabled — pending regulatory and processor review",
      documentation: "View quality and documentation",
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
      ladder: "Presentation range",
      pack: "× {n} vials",
    },
    research: {
      label: "Research",
      qualifier: "References and areas",
      title: "Related research",
      lede: "The references this page cites, and the areas to continue reading in.",
      routes: "Continue by area",
      hub: "NEOGEN Research index",
      record: "Full scientific record",
    },
    quality: {
      label: "Quality",
      qualifier: "Evidence per presentation",
      title: "Quality and documentation",
    },
    overview: {
      label: "Profile",
      qualifier: "Sourced context",
      title: "Compound profile",
      researchContext: "Research context",
      areas: "Areas of investigation",
      mechanism: "Mechanism and pathways",
      technical: "Technical notes",
      keyReferences: "Key references",
    },
    interlude: {
      presentations: "Presentations",
      range: "Range",
      area: "Area",
    },
    media: {
      alternate: "View",
      detail: "Detail",
      packaging: "Packaging",
    },
    /**
     * CROSS-SELL — laboratory consumables, listed as adjacent products.
     *
     * Deliberately verb-free. Naming a solvent next to a compound is a
     * merchandising adjacency, not an instruction: nothing here says what to
     * do with either, and no reconstitution or administration language may
     * ever be added to this section.
     */
    shop: {
      label: "Shop",
      qualifier: "Flagship compounds",
      title: "The other worlds",
      lede: "The other flagship compounds, with every presentation and price.",
      tabsLabel: "Flagship compounds",
      composition: "Composition",
      presentation: "Presentation",
      presentations: "{n} in catalog",
      unit: "{price} per vial · pack of {n}",
      freeReached: "With this pack, your order reaches free shipping",
      freeFrom: "Free shipping on orders from {price}",
      add: "Add to bag",
      added: "Added",
      view: "View product",
    },
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
    card: {
      open: "Show details for {name}",
      close: "Hide details for {name}",
      presentations: "Presentations",
      composition: "Composition",
      pack: "× {n} vials",
      perVial: "{price} per vial",
    },
    catalog: {
      index: "01",
      label: "Catalog",
      qualifier: "Research compounds",
      title: "Compounds",
      lede: "Each compound is presented with its material record and its technical documentation.",
      searchLabel: "Search",
      searchPlaceholder: "Name, class or strength",
      searchClear: "Clear search",
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
      sortNameDesc: "Name Z–A",
      sortPresentations: "Most presentations",
      facets: {
        hide: "Hide filters",
        show: "Show filters",
        heading: "Filter",
        area: "Area",
        alsoIn: "Also in",
        category: "Classification",
        type: "Product type",
        format: "Format",
        vials: "Vials per pack",
        availability: "Availability",
        price: "Price from",
        priceMin: "Minimum",
        priceMax: "Maximum",
        selection: "Selection",
        flagship: "Flagship compounds only",
        documented: "With public documentation",
        photographed: "With photography",
        formats: {
          solid: "Solid (mg)",
          solution: "Solution (mg/ml)",
          volume: "Volume (ml)",
          iu: "Units (IU)",
          blend: "Blend",
        },
        vialsValue: "× {n} vials",
        active: "Active filters",
        remove: "Remove filter",
        clearAll: "Clear all",
        showResults: "Show {n} results",
        showResult: "Show 1 result",
      },
      typeLabel: "Type",
      filtersLabel: "Filters",
      filtersApplied: "active",
      filterApplied: "active",
      /** Qualifier before a "from" price on a card. */
      from: "From",
      empty: "No compound matches the applied filters.",
      clear: "Clear filters",
      /** THE STOREFRONT — /productos as NEOGEN's primary store (2026-09-18). */
      store: {
        eyebrow: "NEOGEN · Store",
        stats: "{products} compounds · {presentations} presentations · {areas} areas",
        lede: "Peptides, metabolics, blends and laboratory materials. Every presentation with its price.",
        searchLabel: "Search the catalogue",
        searchPlaceholder: "Name or strength",
        searchSubmit: "Search",
        browseAll: "Browse the whole catalogue",
        signature: {
          label: "Signature compounds",
          from: "From",
        },
        areas: {
          index: "02",
          label: "Areas",
          title: "Shop by area",
          count: "{n} compounds",
          all: "View all compounds",
        },
        collection: {
          index: "03",
          label: "Collection",
          title: "The whole catalogue",
        },
        more: {
          show: "Show {n} more",
          showing: "{shown} of {total}",
        },
      },
      matrix: {
        caption: "Presentations and prices of the listed compounds",
        othersCaption: "Presentations in other units",
        others: "Other units",
        compound: "Compound",
        from: "From",
        unitLabel: "Price",
        perPack: "Per pack",
        perVial: "Per vial",
        packNote: "Packs of {n} vials",
        step: "Presentation {n}",
      },
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
    /* The reference index page: /investigacion/referencias */
    references: {
      index: "01",
      label: "References",
      qualifier: "Full index",
      title: "Reference index",
      lede: "Every source behind a statement on a compound's page, grouped by year. Each one lists the compounds that cite it.",
      countLabel: "References",
      compoundsLabel: "Compounds citing",
      citedBy: "Cited by",
      backToHub: "Back to NEOGEN Research",
    },
    hub: {
      index: "01",
      label: "Research",
      qualifier: "Scientific archive",
      title: "NEOGEN Research",
      lede: "The catalogue's scientific archive: what each compound is, what the published literature has studied, from which sources and within which limits. Every statement cites its source; what has no source does not appear.",
      search: {
        label: "Search the compendium",
        placeholder: "Compound, alias or presentation",
        submit: "Search",
      },
      stats: {
        label: "What the archive holds",
        compounds: "Compounds",
        records: "Scientific records",
        references: "References",
        lines: "Research lines",
        terms: "Terms",
      },
      paths: {
        index: "02",
        label: "Routes",
        qualifier: "Three ways in",
        title: "Where to begin",
        chooser: "Choose your way in",
        begin: {
          question: "I'm new to this",
          label: "If this is your first time",
          body: "What a peptide is, how the archive is organised and how a record is read.",
          start: {
            title: "Start here",
            body: "Five steps, from zero to reading a record.",
            meta: "5 steps",
          },
          peptides: {
            title: "What a peptide is",
            body: "The definition, with a diagram.",
            meta: "Diagram and comparison",
          },
          glossary: { title: "Glossary", body: "{n} terms, with the records that use them." },
        },
        explore: {
          question: "I'm looking for a compound",
          label: "If you are looking for a compound",
          flagships: "Records of the flagship compounds",
          areasMeta: "{n} areas",
          body: "The whole compendium, by name, area or research line.",
          compendium: {
            title: "Compendium",
            body: "{n} compounds, {records} with a scientific record.",
          },
          lines: {
            title: "Research lines",
            body: "{n} receptors, pathways and processes studied.",
          },
          areas: { title: "Areas", body: "The catalogue's sections by field of study." },
        },
        evaluate: {
          question: "I want to see the evidence",
          label: "If you are weighing the evidence",
          referencesMeta: "{n} sources",
          qualityMeta: "4 levels",
          handlingMeta: "Laboratory reference",
          notesMeta: "{n} notes",
          body: "Where each statement comes from and how quality is documented.",
          references: { title: "References", body: "{n} sources, each with a DOI or PMID." },
          quality: {
            title: "Documentation model",
            body: "How a document attaches to a presentation or a lot.",
          },
          handling: {
            title: "Laboratory handling",
            body: "Stability, receipt and storage of lyophilised materials.",
          },
          notes: { title: "Notes", body: "Short reads on vocabulary and documentation." },
        },
      },
      areas: {
        index: "02",
        label: "Areas",
        qualifier: "By area of study",
        title: "Research areas",
        compounds: "Compounds",
        references: "References",
        enter: "Enter",
      },
      lines: {
        index: "03",
        label: "Lines",
        qualifier: "What is studied",
        title: "Research lines",
        lede: "Receptors, pathways and processes studied by the literature the records cite. A compound appears in a line only if a sourced statement in its record supports it.",
        all: "All lines",
      },
      quality: {
        index: "04",
        label: "Quality",
        qualifier: "Evidence model",
        title: "How quality is documented",
        lede: "A document attaches to the most specific thing it examines: the presentation, or the lot. Nothing extends from one presentation to another, and no status appears without a document behind it.",
        explorer: "Explore documentation",
      },
      notes: {
        index: "05",
        label: "Notes",
        qualifier: "Reading",
        title: "NEOGEN notes",
        lede: "Vocabulary, documentation and handling, explained without jargon. Short reading to understand what is being bought.",
        all: "All notes",
      },
      references: {
        index: "06",
        label: "References",
        qualifier: "Sources",
        title: "References",
        empty:
          "No references are published. A reference appears here when a verified source supports a statement on a compound's page.",
        citedBy: "Cited on",
        /* "See all 74 references" */
        all: "See all {n} references",
        showing: "The {n} most recent",
      },
    },
  },

  knowledge: {
    crumbs: {
      research: "Research",
      compendium: "Compendium",
      lines: "Lines",
    },
    counts: {
      compounds: "{n} compounds",
      compound: "1 compound",
      terms: "{n} terms",
      term: "1 term",
      references: "{n} references",
      reference: "1 reference",
      statements: "{n} statements",
      statement: "1 statement",
      lines: "{n} lines",
      line: "1 line",
    },

    compendium: {
      label: "Compendium",
      qualifier: "Compound index",
      title: "Compound compendium",
      lede: "Every compound in the catalogue in one index. Open any of them for a quick view; those with a scientific record lead on to the full record, with its statements and numbered sources.",
      legend: {
        label: "How to read the index",
        depth:
          "The four marks show which sections a record holds: mechanism, published research, technical notes and references.",
        none: "A dash means the compound has no scientific record: it has a product page, but no sourced statement has been published.",
      },
      controls: {
        search: "Search",
        searchPlaceholder: "Name, alias or presentation",
        area: "Area",
        areaAll: "All areas",
        line: "Research line",
        lineAll: "All lines",
        record: "Only with a scientific record",
        clear: "Clear filters",
        filters: "Filters",
        results: "{n} compounds",
        result: "1 compound",
        empty: "No compound matches. Try another name or remove a filter.",
        letters: "Alphabetical index",
      },
      columns: {
        compound: "Compound",
        areas: "Area",
        lines: "Research lines",
        record: "Record",
      },
      depth: {
        label: "Record sections",
        mechanism: "Mechanism",
        research: "Published research",
        notes: "Technical notes",
        references: "References",
        none: "No scientific record",
        refs: "{n} ref.",
      },
      preview: {
        open: "Quick view",
        dialog: "Quick view of {name}",
        close: "Close",
        previous: "Previous",
        next: "Next",
        position: "{i} of {n}",
        identity: "Identity",
        type: "Type",
        alias: "Alternative designation",
        composition: "Composition",
        presentations: "Presentations",
        areas: "Areas",
        lines: "Research lines",
        mechanism: "Mechanism, as the source describes it",
        research: "Published research, as the source reports it",
        sources: "{n} sources in the record",
        source: "1 source in the record",
        contents: "In the record",
        record: "Open scientific record",
        product: "View in the catalogue",
        noRecord:
          "This compound has no scientific record: no sourced statement about it has been published. Its product page carries its identity and presentations.",
        documentation: "Documentation",
        documentationNone: "No public documentation",
      },
    },

    record: {
      label: "Scientific record",
      index: "In this record",
      jump: "Jump to section",
      sections: {
        identity: "Identity",
        mechanism: "Mechanism",
        research: "Published research",
        areas: "By research area",
        notes: "Technical notes and limits",
        references: "References",
        documentation: "Documentation",
        product: "In the catalogue",
        related: "Keep exploring",
      },
      ledes: {
        mechanism: "How the sources describe the compound's action, in their own terms.",
        research:
          "Which studies have been published, in which model and with what result, including the adverse events and limits they report.",
        areas: "What the literature has examined in each area of the catalogue.",
        notes: "What helps in reading the sources: what they actually studied and how far they go.",
        references: "Numbered in the order they are cited. Each opens at its original source.",
      },
      identity: {
        caption: "Compound identity",
        name: "Name",
        alias: "Alternative designation",
        type: "Type",
        composition: "Composition",
        presentations: "Presentations",
        areas: "Areas",
        lines: "Research lines",
        formula: "Molecular formula",
        mass: "Molecular mass",
        sequence: "Sequence",
        cas: "CAS number",
        source: "Source of identity",
      },
      citation: "Reference {n}",
      documentation: {
        body: "Analytical documentation attaches to a specific presentation or lot, and is consulted on the product page, where it is shown with its exact scope.",
        link: "See the product's documentation",
        count: "{n} public documents",
        one: "1 public document",
      },
      product: {
        body: "This record describes the compound NEOGEN sells in these presentations.",
        link: "View product",
      },
      related: {
        compounds: "Compounds in the same lines",
        compoundsBody:
          "Studied in at least one of this record's lines. It implies neither similar effects nor a combination.",
        shared: "{n} lines in common",
        sharedOne: "1 line in common",
        terms: "Terms in this record",
        termsBody: "Words from this record defined in the glossary.",
        lines: "This record's lines",
        back: "Back to the compendium",
      },
    },

    lines: {
      label: "Research lines",
      qualifier: "What is studied",
      title: "Research lines",
      lede: "The receptors, pathways and processes studied by the literature the records cite, with the compounds each one examines.",
      principle: {
        label: "What a line is",
        body: "A line groups compounds by what published research has studied in them, not by what might be combined. Each compound is in a line because a sourced statement in its own record supports it, and that statement is quoted on the line's page.",
      },
      open: "View line",
      line: {
        back: "All lines",
        why: "Why it is here",
        record: "Scientific record",
        product: "View in the catalogue",
        references: "References for this line",
        others: "Other lines in the group",
        compounds: "Compounds studied in this line",
        note: "A line is not a recommendation. Compounds appear in catalogue order, and what is said about each one is backed by its own source.",
      },
    },

    glossary: {
      label: "Glossary",
      qualifier: "Vocabulary",
      title: "Glossary",
      lede: "The words the records are written in, defined once. Each term shows which records use it.",
      scope:
        "General definitions. No term describes what a compound does: that is in its record, with its source.",
      search: "Search for a term",
      searchPlaceholder: "Term or abbreviation",
      categories: {
        all: "All",
        structure: "Structure",
        mechanism: "Mechanism",
        evidence: "Studies and evidence",
        quality: "Quality and documentation",
        materials: "Materials",
        framework: "How NEOGEN reads",
      },
      view: {
        label: "Order",
        category: "By topic",
        alphabet: "A–Z",
      },
      results: "{n} terms",
      result: "1 term",
      empty: "No term matches the search.",
      seeAlso: "See also",
      usedIn: "In the records",
      more: "and {n} more",
      readMore: "Read the note",
      letters: "Jump to letter",
      destinations: {
        peptides: "What a peptide is",
        compendium: "Compendium",
        lines: "Research lines",
        handling: "Laboratory handling",
        start: "Start here",
        references: "References",
        "quality-model": "Documentation model",
      },
    },

    handling: {
      label: "Laboratory reference",
      qualifier: "Handling",
      title: "Laboratory handling",
      lede: "How a lyophilised material arrives, what affects its stability and what to record on receipt. A reference for laboratory work, and for no other use.",
      index: "In this reference",
      arrives: {
        label: "Receipt",
        title: "What arrives",
        body: "Material travels lyophilised, in a sealed vial, protected from light and impact. A lyophilised material is a dry solid, and its stability depends above all on staying dry.",
        facts: [
          { term: "Form", value: "Lyophilised solid" },
          { term: "Container", value: "Sealed glass vial" },
          {
            term: "Presentation",
            value: "Amount per vial and vials per pack, as the product page states",
          },
          {
            term: "Documentation",
            value: "Attached to the presentation or the lot, on the product page",
          },
        ],
      },
      receiving: {
        label: "Record",
        title: "What to record on receipt",
        items: [
          "The presentation received against the one ordered: amount per vial and number of vials.",
          "The state of the seal and the vial before storing it.",
          "The date of receipt and the conditions it is stored in.",
          "The lot, where the documentation states one, and the document that belongs to it.",
        ],
      },
      stability: {
        label: "Stability",
        title: "What affects a lyophilised material",
        lede: "The three factors any laboratory watches, and a fourth that is less obvious.",
        factors: [
          {
            term: "Temperature",
            body: "Cold slows chemical degradation. The steadiness of the temperature matters as much as its value: constant is better than low but fluctuating.",
          },
          {
            term: "Humidity",
            body: "Lyophilisation removes the water. A vial opened in a humid room takes some of it back, and with it the degradation route that had been removed.",
          },
          {
            term: "Light",
            body: "Some sequences are sensitive to ultraviolet light. Keeping material in the dark is standard practice precisely because it costs nothing.",
          },
          {
            term: "Changes of condition",
            body: "Every move from cold to room temperature, and back, exposes the material to condensation. Taking a vial out once is not the same as taking it out ten times.",
          },
        ],
      },
      errors: {
        label: "Common errors",
        title: "What tends to go wrong",
        items: [
          {
            title: "Opening a vial while still cold",
            body: "Opened before it reaches room temperature, the air's moisture condenses inside.",
          },
          {
            title: "Moving material between conditions",
            body: "Taking it out of the cold and back again repeatedly accumulates temperature changes and condensation.",
          },
          {
            title: "Storing it in the light",
            body: "A lit shelf exposes the material without anyone having decided to.",
          },
          {
            title: "Reading a document as general",
            body: "A certificate describes the lot analysed. It does not cover another presentation or another production of the same compound.",
          },
          {
            title: "Assuming the conditions",
            body: "A compound's specific conditions are a documented fact. Without the document, there is no figure to follow.",
          },
        ],
      },
      documented: {
        label: "Per-compound data",
        title: "Documented conditions",
        body: "A specific compound's storage temperature and shelf life are facts from its documentation, and appear on its page beside the document that supports them. This reference gives no general figures because no general figure would be true for the whole catalogue.",
      },
      boundary: {
        label: "Scope",
        title: "What this reference does not include",
        body: "There are no preparation procedures, amounts, calculations or instructions for use. That is not an omission: the catalogue is sold for research work, and a site that publishes how to employ a material has said what use it expects.",
      },
      materials: {
        label: "Catalogue",
        title: "Laboratory materials",
        body: "What the catalogue sells as laboratory material, with its presentations.",
      },
      faq: {
        label: "Questions",
        title: "Questions about handling",
      },
      related: {
        label: "Related",
        title: "Keep reading",
        terms: "Terms",
      },
    },

    start: {
      label: "Start here",
      qualifier: "Walkthrough",
      title: "Start here",
      lede: "Five steps from not knowing what a peptide is to reading a scientific record and weighing its documentation. A few minutes, no jargon.",
      progress: "Walkthrough steps",
      what: {
        index: "01",
        label: "What this is",
        title: "An archive of research compounds",
        body: "NEOGEN sells compounds for laboratory work, and this archive explains what each one is according to the published literature. Most are peptides: short chains of amino acids whose sequence defines which molecule they are.",
        condition:
          "The whole catalogue is sold under one condition: research use only. No page in this archive describes how to employ a compound or what it would do in a person.",
        peptides: "What a peptide is",
        research: "What “research use” means",
      },
      map: {
        index: "02",
        label: "Organisation",
        title: "How it is organised",
        body: "Five levels, from the general to the specific. Each is a different way in, and each leads to the next.",
        levels: {
          areas: { title: "Areas", body: "The catalogue's sections by field of study." },
          lines: {
            title: "Research lines",
            body: "Receptors, pathways and processes the literature studies.",
          },
          compounds: {
            title: "Compounds",
            body: "The whole catalogue, with identity and presentations.",
          },
          records: {
            title: "Scientific records",
            body: "What the sources report, statement by statement.",
          },
          references: { title: "References", body: "The published sources, with a DOI or PMID." },
        },
      },
      anatomy: {
        index: "03",
        label: "Reading",
        title: "How to read a record",
        body: "A real excerpt from the record for {name}. Each part does a job.",
        figure: "Excerpt from the record for {name}, annotated",
        notes: {
          section: {
            title: "Section",
            body: "Mechanism, published research, technical notes: the record separates how the compound's action is described from what has been measured.",
          },
          statement: {
            title: "Sourced statement",
            body: "It says what the source reports, in its terms: the model, the figure and the limit. Never what a compound would do for the reader.",
          },
          marker: {
            title: "Citation marker",
            body: "The number points to the record's reference list. Each reference opens at its original source.",
          },
          model: {
            title: "The model matters",
            body: "In vitro, in mice or in a phase 2 trial: the same result weighs differently depending on where it was obtained. The glossary explains each term.",
          },
        },
        open: "Open the full record",
      },
      evidence: {
        index: "04",
        label: "Documentation",
        title: "How to weigh documentation",
        body: "An analytical document answers three questions, and belongs to the most specific thing it examines: a presentation or a lot, never the compound in the abstract.",
        questions: [
          "Which sample was analysed, and which lot does it come from?",
          "By which method: HPLC for purity, mass spectrometry for identity?",
          "Who signs it, and can the report be verified?",
        ],
        note: "How to read a certificate of analysis",
      },
      next: {
        index: "05",
        label: "Next",
        title: "Where to go now",
        compendium: { title: "Look up a compound", body: "The whole compendium, with quick view." },
        lines: {
          title: "Explore by what is studied",
          body: "The research lines and their compounds.",
        },
        glossary: {
          title: "Check a word",
          body: "The glossary, with the records that use each term.",
        },
        handling: {
          title: "Laboratory handling",
          body: "Stability and storage of lyophilised materials.",
        },
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
      "Purchasing is not enabled yet. The catalogue can be browsed in full; ordering opens once regulatory review is complete.",
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
    checkoutPending: "Purchasing not enabled — pending regulatory review",
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
  /** QUALITY — see the Spanish source for the content rules. */
  quality: {
    record: {
      panelLabel: "Quality status",
      coverageLabel: "Coverage",
      coverage: "{n} of {total} presentations with public documentation",
      emptyTitle: "This compound has no public documentation.",
      emptyBody:
        "Documentation is published when it exists, tied to the exact presentation and, where it applies, to the lot it examines. An analysis of one presentation is never shown as valid for another.",
      tableCaption: "Published documentation by presentation",
      columns: {
        presentation: "Presentation",
        state: "Status",
        type: "Type",
        issuer: "Issuer",
        lot: "Lot",
        date: "Date",
        document: "Document",
      },
      noRecord: "No public document",
      compoundLevel: "Compound",
      states: {
        "documentation-available": "Technical documentation",
        "coa-available": "Certificate of analysis",
        "lot-coa": "Lot certificate",
        "third-party-tested": "Independent analysis",
        "janoshik-verified": "Verifiable Janoshik report",
      },
      types: {
        "technical-document": "Technical document",
        "supplier-documentation": "Supplier documentation",
        coa: "Certificate of analysis",
        "lot-coa": "Lot certificate of analysis",
        "third-party-analysis": "Third-party analysis",
        "handling-storage": "Storage and handling",
        "analytical-report": "Analytical report",
      },
      issuerRoles: {
        "independent-laboratory": "Independent laboratory",
        manufacturer: "Manufacturer",
        supplier: "Supplier",
        neogen: "NEOGEN",
      },
      reportId: "Report",
      view: "View document",
      external: "opens in a new tab",
      chain: {
        label: "How evidence resolves",
        steps: {
          product: {
            title: "Compound",
            rule: "Technical documentation only. No analysis is assigned to the whole compound.",
          },
          variant: {
            title: "Presentation",
            rule: "An analysis names the exact presentation it examined.",
          },
          lot: {
            title: "Lot",
            rule: "A lot certificate covers that lot and no other.",
          },
          document: {
            title: "Document",
            rule: "Every visible status comes from a document you can open.",
          },
        },
        resolved: "with a public document",
        unresolved: "no public document",
      },
    },
    explorer: {
      index: "01",
      label: "Research",
      qualifier: "Quality",
      title: "Quality documentation",
      lede: "Every public document in the catalogue, with the exact presentation and lot it examines.",
      devNotice: "Development view. This page is not published while no public document exists.",
      filters: {
        product: "Compound",
        presentation: "Presentation",
        lot: "Lot",
        type: "Type",
        issuer: "Issuer",
        all: "All",
      },
      results: "{n} documents",
      result: "{n} document",
      empty: "No document matches the filters.",
      caption: "Public documents",
      columns: {
        product: "Compound",
        presentation: "Presentation",
        lot: "Lot",
        type: "Type",
        issuer: "Issuer",
        date: "Date",
        document: "Document",
      },
      view: "View document",
      external: "opens in a new tab",
    },
  },

  citations: {
    label: "References",
    sourceTypes: {
      "journal-article": "Article",
      "review-article": "Review",
      "clinical-trial-registry": "Trial registry",
      preprint: "Preprint",
      book: "Book",
      "regulatory-document": "Regulatory document",
      dataset: "Dataset",
      other: "Source",
    },
    doi: "DOI",
    pmid: "PMID",
    open: "Open source",
    external: "opens in a new tab",
    etAl: "et al.",
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
        submit: "Continue to review",
        back: "Back to shipping",
      },

      review: {
        index: "04",
        title: "Review",
        note: "Confirm this is exactly what you are ordering. Continuing registers the order at these amounts and takes you to payment.",
        submit: "Continue to payment",
        back: "Back to delivery",
        acknowledgements: {
          title: "Declarations",
          requiredNote: "Marked declarations are required.",
          declarations: {
            "research-use":
              "I confirm that I am acquiring these materials for research use only, and that I will not direct them to consumption or to human or veterinary use.",
          },
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
          payment_unavailable:
            "Payment is not available right now, so the order cannot be registered yet.",
          action: "Go to step",
        },
      },

      payment: {
        index: "05",
        title: "Payment",
        note: "Enter your card details in Mercado Pago's secure fields, inside this page. NEOGEN never receives or stores the card number.",
        slot: {
          stateLabel: "Payment state",
          badges: {
            no_provider: "No processor",
            embedded: "Card",
            redirect: "Redirect",
            instructions: "Transfer",
            processing: "Processing",
            failed: "Declined",
            approved: "Approved",
          },
          states: {
            no_provider: {
              title: "Payment is not available right now",
              body: "There is no active payment processor, so nothing can be charged. Your order stays registered and unpaid.",
              contactLabel: "Available channel",
            },
            embedded: {
              title: "Credit or debit card",
              body: "The fields below belong to Mercado Pago. The charge is the order total, computed on the server.",
              mountLabel: "Mercado Pago secure fields",
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
        card: {
          amountLabel: "Total to pay",
          orderLabel: "Order",
          provider: "Payment processed by Mercado Pago",
          loading: "Loading Mercado Pago's secure fields…",
          loadError: "The payment fields could not load. Check your connection and reload them.",
          reload: "Reload",
          submitting: "Processing the payment. Do not close this page…",
          testMode:
            "Test mode: Mercado Pago is in its test environment and no real charge is made. Use Mercado Pago's test cards.",
          formSubmit: "Pay",
          errors: {
            unavailable: "Payment is not available right now. Nothing was charged.",
            not_found: "We could not find this order in this browser.",
            invalid_state: "This order no longer accepts a new payment. Showing its current state…",
            provider_error:
              "We could not complete the operation with Mercado Pago. Nothing was charged; you can try again.",
            invalid_request: "The payment details arrived incomplete. Please enter them again.",
          },
        },
        retry: {
          title: "The previous attempt did not complete",
          note: "Your order is still registered and your bag is unchanged. You can try again with the same card or another one.",
        },
        declines: {
          insufficient_funds: "The card has insufficient funds. Try another card.",
          card_data: "Check the card details (number, expiry date or security code) and try again.",
          call_for_authorize:
            "Your bank needs to authorise this payment. Contact them and try again, or use another card.",
          card_disabled: "The card is disabled. Use another card or contact your bank.",
          high_risk:
            "The payment was declined by the processor's security review. Try another card.",
          issuer_rejected:
            "The issuing bank declined the payment. Try another card or contact your bank.",
          amount_limit: "The amount exceeds the card's limit. Try another card.",
          installments: "The card does not accept this payment option. Try another card.",
          attempts_exceeded:
            "The maximum number of attempts with this card was reached. Use another card.",
          expired: "The time to complete the payment ran out. You can try again.",
          cancelled: "The payment attempt was cancelled. You can try again.",
          unconfirmed:
            "We received no answer to the previous attempt and no payment is recorded. You can try again.",
          generic: "The payment was declined. Try again or use another card.",
        },
        back: "Edit the bag",
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
      body: "The catalogue can be browsed in full. Orders will be activated once regulatory review is complete.",
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
          badge: "Awaiting payment",
          title: "Your order is registered. Payment is still due.",
          body: "Nothing has been charged yet. Complete the payment to confirm the order.",
        },
        pending_payment: {
          badge: "Awaiting",
          title: "Payment still needs to be completed",
          body: "The processor is waiting for an action to complete the payment. The order stays registered until it confirms.",
        },
        payment_processing: {
          badge: "Processing",
          title: "We are confirming your payment",
          body: "The processor is resolving the transaction. This page updates itself; do not pay again.",
        },
        paid: {
          badge: "Paid",
          title: "Payment confirmed",
          body: "The processor confirmed payment for this order.",
        },
        payment_failed: {
          badge: "Declined",
          title: "Payment did not complete",
          body: "Nothing was charged. Your order is still registered and you can try the payment again.",
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
        disputed: {
          badge: "Disputed",
          title: "The payment for this order is disputed",
          body: "The cardholder disputed the charge with their bank. The order stays under review until the dispute is resolved.",
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
        body: "Keep the reference: it is how your order is identified. For any question, NEOGEN's direct channel is its phone line.",
        contactLabel: "Receipt registered to",
      },
      items: { title: "Items", quantity: "×" },
      contact: { title: "Contact", email: "Email", phone: "Phone" },
      shipping: { title: "Shipping", estimate: "Estimate" },
      totals: { subtotal: "Subtotal", shipping: "Shipping", free: "Free", total: "Total" },
      estimateDays: { one: "{n} business day", many: "{n} business days" },
      acknowledgedLabel: "Declarations accepted",
      actions: {
        catalogue: "Keep exploring",
        research: "NEOGEN Research",
        pay: "Complete the payment",
        retry: "Try the payment again",
      },
      watching: "Updating the payment state…",
      watchStopped: "The payment is still processing. Reload the page later to see its state.",
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
    unavailable: "Purchasing opens once the regulatory review is complete.",
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

  /** The research-use condition — one wording for the whole site. See `es.ts`. */
  researchUse: {
    label: "Research use only",
    statement:
      "Materials intended for laboratory work. They are not medicines, supplements or cosmetics, and they are not sold for consumption or for human or veterinary use.",
    readMore: "What this means",
  },

  /** Shipping templates. Values are filled from `config/site` — see `es.ts`. */
  shipping: {
    label: "Shipping",
    national: "We ship anywhere in Mexico.",
    priority: "{zone}: estimated delivery in {days} business day.",
    standard: "Rest of the country: up to {days} business days.",
    free: "Free shipping from {amount}.",
    and: "and",
  },

  peptides: {
    eyebrow: "NEOGEN guide",
    title: "Peptides, explained",
    lede: "What they are, why they are studied, and the condition they are sold under. No promises, no jargon, no hedging.",
    sections: {
      what: {
        index: "01",
        label: "Definition",
        title: "What a peptide is",
        body: "A peptide is a short chain of amino acids — the same parts proteins are built from. The difference from a protein is mostly one of size: a few dozen parts rather than hundreds or thousands. The order of those parts, the sequence, is what identifies each peptide, and changing one produces a different molecule.",
      },
      why: {
        index: "02",
        label: "Context",
        title: "Why they are studied",
        body: "Because they combine two uncommon properties: they are specific, since their sequence determines what they interact with, and they are synthesisable, since their size makes them reproducible to produce and purify. That combination makes them laboratory tools with a degree of control larger molecules do not allow.",
      },
      anatomy: {
        index: "02",
        label: "Structure",
        title: "From amino acid to protein",
        lede: "A diagram, not a real molecule: the same unit, joined in a chain, at three scales.",
        diagram: {
          label: "Diagram of a peptide chain",
          aminoAcid: "Amino acid",
          bond: "Peptide bond",
          nTerm: "N-terminus",
          cTerm: "C-terminus",
          sequence: "Sequence: the order of the amino acids, from N to C",
        },
        scale: {
          label: "Three scales",
          aminoAcid: "One unit",
          peptide: "Tens of units",
          protein: "Hundreds or thousands, folded",
        },
        table: {
          caption: "Amino acid, peptide and protein, compared",
          property: "Property",
          columns: ["Amino acid", "Peptide", "Protein"],
          rows: [
            {
              label: "What it is",
              values: [
                "A molecule: the unit",
                "A short chain of amino acids",
                "A long chain of amino acids, folded",
              ],
            },
            {
              label: "Size",
              values: ["One unit", "Tens of units", "Hundreds or thousands of units"],
            },
            {
              label: "Shape",
              values: ["—", "Often flexible", "A stable three-dimensional structure"],
            },
            {
              label: "How it is made in the laboratory",
              values: [
                "Chemical synthesis or natural sources",
                "Chemical synthesis, one amino acid after another",
                "Usually, production in cells",
              ],
            },
            {
              label: "What identifies it",
              values: ["Its chemical structure", "Its sequence", "Its sequence and its folding"],
            },
          ],
        },
        terms: "Terms in this section",
      },
      condition: {
        index: "03",
        label: "Condition",
        title: "Research use only",
        body: "The whole catalogue is sold under this condition, with no exceptions. This site publishes no usage amounts, methods or indications, and no page claims that a compound diagnoses, treats, cures or prevents anything. Before an order is registered we ask for an explicit confirmation of the condition, which is recorded with the order.",
      },
      quality: {
        index: "04",
        label: "Documentation",
        title: "How we document",
        body: "Analytical documentation belongs to a specific lot and presentation, never to the compound in the abstract, and appears on the product page when it exists. Where no document exists, no seal appears: a purity figure with no report behind it is exactly the kind of data this site does not publish.",
        action: "See the full model",
      },
      handling: {
        index: "05",
        label: "Handling",
        title: "Handling and shipping",
        body: "Material travels lyophilised and sealed, protected from light and impact. Lyophilised materials are kept dry, cold and in the dark, and the steadiness of the temperature matters as much as its value. The specific conditions for a compound are a documented fact and appear on its page when that document exists.",
      },
      catalogue: {
        index: "06",
        label: "Catalogue",
        title: "Where to start",
        body: "The catalogue is organised by research area. Every compound appears with its exact name, its presentations and whatever documentation it carries.",
        action: "See the catalogue",
      },
    },
    notes: {
      title: "Notes",
      lede: "Four short reads on vocabulary, documentation and handling.",
      action: "All notes",
    },
    continue: {
      title: "Continue in NEOGEN Research",
      start: "Start here",
      glossary: "Glossary",
      compendium: "Compound compendium",
    },
    faq: {
      title: "Frequently asked questions",
      action: "See all questions",
    },
  },

  editorial: {
    eyebrow: "NEOGEN Research",
    title: "Notes",
    lede: "Vocabulary, documentation and the handling of laboratory materials. What can be explained honestly, explained.",
    index: "All notes",
    topics: {
      vocabulary: "Vocabulary",
      documentation: "Documentation",
      handling: "Handling",
      "research-use": "Research use",
    },
    published: "Published",
    updated: "Updated",
    readNext: "Read next",
    backToIndex: "Back to notes",
    relatedProducts: "Related compounds",
    relatedAreas: "Related areas",
    readingNote: "A NEOGEN editorial note. It does not describe the use of any compound.",
  },

  faq: {
    eyebrow: "Help",
    title: "Frequently asked questions",
    lede: "What people ask before buying, answered with what we actually know.",
    topics: {
      peptides: "About peptides",
      "research-use": "Research use",
      documentation: "Documentation and quality",
      ordering: "Orders and payment",
      shipping: "Shipping",
      handling: "Handling and storage",
      contact: "Contact",
    },
    contactTitle: "Question not here?",
    contactBody: "The phone is the support channel operating today.",
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
    /** Area masthead copy — see `components/ui/AreaMasthead`. */
    masthead: {
      compounds: "Compounds in this area",
      examples: "Way in",
    },
    /** Design preview — development only; see the Spanish source. */
    preview: {
      label: "Design preview · Sample data",
      body: "Context, research and documentation shown with sample data for design review. This page exists only in development and is never published.",
      back: "See the real page",
    },
    research: {
      label: "Research",
      qualifier: "Public references",
      title: "Connected research",
      lede: "The references cited by this area's compounds and its context.",
      references: "References",
      citingCompounds: "Citing compounds",
      hub: "NEOGEN Research index",
    },
    related: {
      label: "Areas",
      qualifier: "Shared compounds",
      title: "Related areas",
      shared: "{n} shared",
      ofTotal: "of {total} in this area",
      sharedCompounds: "Shared compounds",
      enter: "Enter the area",
    },
    /** Area page sections after the masthead — see the Spanish source. */
    page: {
      entry: {
        label: "Entry",
        qualifier: "{n} of {total}",
        title: "Entry compounds",
        presentations: "Presentations",
        pack: "× {n} vials",
        documentation: "Documentation",
        alsoIn: "Also in",
        cta: "View compound",
        records: "{n} public records",
        record: "1 public record",
      },
      context: {
        label: "Context",
        qualifier: "With published sources",
        title: "Area context",
        themes: "Research themes",
        pathways: "Pathways studied",
      },
      compounds: {
        label: "Index",
        qualifier: "{n} compounds",
        title: "All compounds",
      },
      evidence: {
        label: "Quality",
        qualifier: "Public records",
        title: "Documentation in this area",
        lede: "Each document covers only the presentation or lot it examines. A record never extends to the rest of the area.",
        records: "Public records",
        compounds: "Compounds with a record",
        presentations: "Presentations with a record",
        caption: "Public documentation records for this area's compounds",
        explorer: "Explore the documentation",
      },
      continue: {
        label: "Continue",
        qualifier: "From this area",
        title: "Keep exploring",
        nextArea: "Next area",
        catalogue: "Catalogue",
        catalogueName: "All compounds",
        research: "Research",
        researchName: "NEOGEN Research",
        researchMeta: "Compound and area index",
        materials: "Materials",
        count: "{n} compounds",
      },
    },
    areas: {
      metabolic: {
        short: "Metabolism",
        title: "Metabolic Research",
        body: "Compounds studied in the context of metabolic regulation.",
      },
      recovery: {
        short: "Recovery",
        title: "Recovery & Repair",
        body: "Compounds studied in the context of tissue repair.",
      },
      longevity: {
        short: "Longevity",
        title: "Longevity & Cellular",
        body: "Compounds studied in the context of cellular ageing.",
      },
      growth: {
        short: "Growth",
        title: "Growth & Performance",
        body: "Compounds studied in the context of growth pathways.",
      },
      skin: {
        short: "Skin",
        title: "Skin & Aesthetics",
        body: "Compounds studied in the context of the dermal matrix and pigment.",
      },
      neuro: {
        short: "Neuro",
        title: "Neuro & Sleep",
        body: "Compounds studied in the context of cognitive function and sleep.",
      },
      hormonal: {
        short: "Hormonal",
        title: "Hormonal & Reproductive",
        body: "Compounds studied in the context of hormonal regulation.",
      },
      materials: {
        short: "Materials",
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
      compendium: "Compendium",
      lines: "Research lines",
      glossary: "Glossary",
      start: "Start here",
      handling: "Laboratory handling",
      allCompounds: "All compounds",
      documentation: "Documentation",
      peptides: "What is a peptide",
      notes: "Notes",
      faq: "Frequently asked questions",
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
