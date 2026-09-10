import { defaultLocale, locales } from "@/i18n/config";

/**
 * Site-level configuration.
 *
 * Anything not yet verified as a business fact is explicitly `null` and flagged
 * TBD. Nothing here may be rendered as a promise to a customer.
 */
export const siteConfig = {
  name: "NEOGEN",

  /** Initial market. Drives Intl formatting defaults, not shipping logic. */
  market: {
    country: "MX",
    currency: "MXN",
  },

  locales,
  defaultLocale,

  /**
   * Production origin, used for metadataBase / canonical URLs / hreflang.
   * TODO(pre-launch): replace with the real domain once registered.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /**
   * FULFILMENT — owner-confirmed, and only what was actually confirmed.
   *
   * These are business facts stated by the owner, not inferred and not
   * aspirational. Anything still undecided stays `null` below rather than being
   * given a plausible value, because every field here is a promise to a
   * customer the moment it is rendered.
   */
  fulfilment: {
    /** Ships nationally within Mexico. */
    national: true,
    /**
     * Cities reached faster. NOT same-day — the owner was explicit that it is
     * next-day, and the difference matters if it is ever printed.
     */
    priorityCities: ["Guadalajara", "Durango"],
    /** Business days, by route. */
    estimateDays: {
      priority: 1,
      national: 7,
      madeToOrder: 14,
    },
    /** Order total in MXN at or above which shipping is free. */
    freeShippingThreshold: 10000,
    /** No local pickup. */
    pickup: false,
  },

  /**
   * UNRESOLVED BUSINESS FACTS.
   *
   * Kept as explicit nulls so the UI can render a neutral pending state rather
   * than anyone inventing a value. See docs/NEOGEN_MVP_SCOPE.md.
   */
  tbd: {
    /**
     * Rate model. The owner's answer was "unsure, calculated probably", which
     * is not a rate — so no shipping cost is quoted anywhere yet.
     */
    shippingRates: null,
    /** National courier not selected. */
    nationalCourier: null,
    /**
     * Whether any product needs temperature-controlled shipping. The owner's
     * answer was "shouldn't need it, unsure" — which is not a determination,
     * and getting it wrong is a product-integrity question rather than a
     * logistics one.
     */
    coldChain: null,
    /** Payment processor pending product/regulatory review. Never activate here. */
    paymentProvider: null,
    /**
     * Tax handling. IVA is to be INCLUDED in the displayed price once prices
     * are final, so no tax line is added at checkout — but the prices on the
     * site today are provisional, so this is not yet settled.
     */
    taxHandling: null,
    /** No support email yet; the phone number below is the only channel. */
    supportEmail: null,
  },

  /**
   * CONTACT — the only channel that currently exists.
   *
   * A Mexican mobile number, given by the owner. Rendered as a `tel:` link and
   * nothing more: the number was supplied without saying whether it also takes
   * WhatsApp, and labelling it as such would be inventing a capability.
   */
  contact: {
    phone: "+523320655447",
    phoneDisplay: "+52 33 2065 5447",
  },
} as const;

export type SiteConfig = typeof siteConfig;
