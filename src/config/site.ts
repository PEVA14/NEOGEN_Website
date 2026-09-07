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
   * UNRESOLVED BUSINESS FACTS.
   * Kept as explicit nulls so the UI can render a neutral pending state rather
   * than anyone inventing a value. See docs/NEOGEN_MVP_SCOPE.md.
   */
  tbd: {
    /** Same-day delivery is *intended* for Guadalajara and Durango — unconfirmed. */
    sameDayDeliveryCities: null,
    /** National courier not selected. */
    nationalCourier: null,
    /** Payment processor pending product/regulatory review. Never activate here. */
    paymentProvider: null,
    /** Tax/compliance handling not reviewed. */
    taxHandling: null,
    /** Support/contact channels not established. */
    supportEmail: null,
  },
} as const;

export type SiteConfig = typeof siteConfig;
