import "server-only";

import { getAvailability } from "@/data/commerce";
import { customerAvailability } from "@/domain/inventory";
import { signal } from "@/server/observe";
import { inventoryStore } from "@/server/persistence";

import type { Availability } from "@/data/commerce";
import type { StockLevel } from "@/domain/inventory";

/**
 * STOCK STATE FOR CUSTOMERS — the curated map, corrected by the real counts.
 *
 * Every customer-facing read of availability (catalogue, product page,
 * checkout) comes through here, so "Agotado" means the same everywhere and
 * checkout can never sell what the shelf no longer has. Quantities never
 * leave this function: callers get a state.
 *
 * If the inventory store cannot be read, the curated map is returned alone —
 * a page must not fail because stock could not be counted, and the payment
 * path still holds stock (and flags a shortage) on its own.
 */
export async function availabilityFor(
  variantIds: readonly string[],
): Promise<Map<string, Availability | null>> {
  const curated = await getAvailability(variantIds);
  let levels: readonly StockLevel[];
  try {
    levels = await inventoryStore().levels();
  } catch {
    signal("inventory.sync_failed", "warn", { view: "availability" });
    return curated;
  }
  const byId = new Map(levels.map((l) => [l.variantId, l]));
  return new Map(
    variantIds.map((id) => [
      id,
      customerAvailability(curated.get(id) ?? null, byId.get(id) ?? null),
    ]),
  );
}
