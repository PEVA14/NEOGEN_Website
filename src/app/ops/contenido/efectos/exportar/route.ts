import { exportRows, toCsv } from "@/content/effects/transfer";
import { publishedProducts } from "@/data/catalog";
import { readEffects } from "@/server/effects/store";
import { currentOperator, opsConfigured } from "@/server/ops/auth";

export const dynamic = "force-dynamic";

/**
 * EXPORT — every published product, filled or not, as CSV or JSON: the
 * template for drafting outside the console and importing back.
 *
 * A route handler, so the session is checked here by hand: the console's
 * 404-when-closed and sign-in redirect, without the page helpers.
 */
export async function GET(request: Request): Promise<Response> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  const format = new URL(request.url).searchParams.get("formato") === "json" ? "json" : "csv";
  const file = await readEffects();
  const rows = exportRows(
    file,
    publishedProducts.map((p) => ({ slug: p.slug, name: p.name })),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const body = format === "json" ? `${JSON.stringify(rows, null, 2)}\n` : toCsv(rows);
  return new Response(body, {
    headers: {
      "Content-Type":
        format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neogen-simple-effects-${stamp}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
