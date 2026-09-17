import type { DiscoveryAreaId } from "@/data/discovery";
import type { Dictionary } from "@/i18n/types";

/**
 * The copy Atlas's client components receive. `compose` is omitted: those are
 * server-side templates for the registry-only composition and have no business
 * in a browser bundle. The bag's own copy rides along for the result's actions.
 */
export type AtlasCopy = Omit<Dictionary["atlas"], "compose"> & {
  commerce: Dictionary["commerceUi"];
};

/** One topic tile in the first step — facts resolved on the server. */
export interface AtlasAreaOption {
  id: DiscoveryAreaId;
  label: string;
  framing: string;
  body: string;
  compounds: number;
  entryPrice: string | null;
}

/** A product the visitor may say they already have in mind. Names only. */
export interface AtlasProductOption {
  slug: string;
  name: string;
  areas: readonly DiscoveryAreaId[];
}
