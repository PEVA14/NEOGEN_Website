import type { DiscoveryAreaId } from "@/data/discovery";
import type { Dictionary } from "@/i18n/types";

/**
 * The copy Atlas's client components receive. `compose` is omitted: those are
 * server-side templates for the registry-only composition and have no business
 * in a browser bundle.
 */
export type AtlasCopy = Omit<Dictionary["atlas"], "compose">;

/** One area tile in the first step — facts resolved on the server. */
export interface AtlasAreaOption {
  id: DiscoveryAreaId;
  label: string;
  framing: string;
  body: string;
  compounds: number;
  entryPrice: string | null;
}
