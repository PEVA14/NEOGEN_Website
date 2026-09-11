import type { Lot } from "./types";

/**
 * THE LOT REGISTRY — empty until real inventory exists.
 *
 * NEOGEN has no received stock recorded in this repository, so there is no lot
 * to list. Nothing here is a placeholder: an invented lot number would be a
 * fabricated provenance record, which the project rules forbid outright.
 *
 * When stock arrives each receipt becomes one entry, with its dates copied from
 * the paperwork that came with it and `publicVisibility` left false until
 * someone decides its evidence should be shown.
 */
export const LOTS: readonly Lot[] = [];
