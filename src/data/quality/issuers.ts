import type { Issuer } from "./types";

/**
 * KNOWN ISSUERS.
 *
 * Listing a laboratory here asserts nothing about any product. It declares
 * that documents MAY name this party, so that a document naming an issuer not
 * on this list is refused rather than rendered with an unknown name.
 *
 * NO VERIFICATION URL TEMPLATE, deliberately. Independent labs publish report
 * look-ups in their own formats, and a URL pattern written from memory would
 * send a customer to a page that does not verify what it appears to. Each
 * document carries the exact `reportUrl` copied from its own report instead.
 */
export const ISSUERS: Readonly<Record<string, Issuer>> = {
  janoshik: {
    id: "janoshik",
    name: "Janoshik Analytical",
    kind: "independent-laboratory",
    publicName: true,
  },
  neogen: {
    id: "neogen",
    name: "NEOGEN",
    kind: "neogen",
    publicName: true,
  },
  /*
   * The supplier, as a ROLE. There is exactly one entry and it has no company
   * name in it — see `Issuer.publicName`. Nothing about the supplier's
   * identity belongs in this repository.
   */
  supplier: {
    id: "supplier",
    name: "supplier",
    kind: "supplier",
    publicName: false,
  },
};
