import { currentOperator, opsConfigured } from "@/server/ops/auth";
import { skydropxReadiness } from "@/shipping/adapters/skydropx/config";

export const dynamic = "force-dynamic";

/**
 * SKYDROPX SHIPMENT READINESS — operators only, and it calls NOTHING.
 *
 * Before the first label: is everything a shipment needs configured here
 * (credentials, origin, parcel, both Carta Porte codes), may this deployment
 * buy labels, is the tracking webhook's secret set? Names and checks only —
 * never a credential, never the origin's values. The Carta Porte codes are
 * shown, because they are the owner's declarations to verify, not secrets.
 */
export async function GET(request: Request): Promise<Response> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  return Response.json(skydropxReadiness(), {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
