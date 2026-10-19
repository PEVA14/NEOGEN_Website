import { currentOperator, opsConfigured } from "@/server/ops/auth";
import { signal } from "@/server/observe";
import { searchCarta, validCatalogQuery } from "@/shipping/adapters/skydropx/catalog";

export const dynamic = "force-dynamic";
/* Up to ~70 catalogue pages at Skydropx's 2 requests per second. */
export const maxDuration = 90;

/**
 * CARTA PORTE CATALOGUE SEARCH — operators only, read-only (`catalog.ts`).
 *
 * `?productos=a,b` and `?empaque=x,y` replace the default searches. The
 * defaults are neutral, physical descriptions of what NEOGEN ships (a glass
 * vial of powder; a padded mailer) and of its packaging — search terms, not
 * a classification. The answer lists codes and the catalogue's own wording.
 */
const PRODUCT_DEFAULTS = [
  "vial",
  "frasco",
  "ampolleta",
  "polvo",
  "liofiliz",
  "peptido",
  "proteina",
  "aminoacido",
  "reactivo",
  "quimic",
  "laboratorio",
  "muestra",
];
const PACKAGING_DEFAULTS = ["sobre", "bolsa", "acolchad", "plastic", "metal", "envelope", "bag"];

const terms = (raw: string | null, defaults: readonly string[]) =>
  raw === null
    ? defaults
    : raw
        .split(",")
        .map((s) => s.trim())
        .filter(validCatalogQuery)
        .slice(0, 15);

export async function GET(request: Request): Promise<Response> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  const url = new URL(request.url);
  const report = await searchCarta({
    products: terms(url.searchParams.get("productos"), PRODUCT_DEFAULTS),
    packaging: terms(url.searchParams.get("empaque"), PACKAGING_DEFAULTS),
  });
  signal("shipping.provider_error", "info", {
    view: "carta_catalog",
    code: !report.configured ? "unconfigured" : report.authenticated ? "ok" : "auth_failed",
  });
  return Response.json(report, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
