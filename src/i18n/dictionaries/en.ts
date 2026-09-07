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
    research: "Research",
    cart: "Cart",
    checkout: "Checkout",
  },

  home: {
    title: "NEOGEN",
    skeletonNote:
      "Phase 1 scaffold. The final homepage and 3D experience are built in later phases.",
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
    placeholderNotice:
      "Placeholder. This value has not been verified and must not be treated as final information.",
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
