import "server-only";

import { formatStrength, publishedProducts } from "@/data/catalog";

/** Every sellable SKU with a readable label — the inventory form's options. */
export function skuOptions(): { id: string; label: string }[] {
  return publishedProducts
    .flatMap((p) =>
      p.variants.map((v) => ({ id: v.id, label: `${p.name} · ${formatStrength(v.strength)}` })),
    )
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function skuLabel(id: string): string {
  return skuOptions().find((o) => o.id === id)?.label ?? id;
}
