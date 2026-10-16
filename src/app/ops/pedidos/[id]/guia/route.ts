import { isOrderId } from "@/payments/instrument";
import { currentOperator, opsConfigured } from "@/server/ops/auth";
import { orderRepository } from "@/server/persistence";
import { shippingProviderById } from "@/shipping";

export const dynamic = "force-dynamic";

/**
 * THE SHIPPING LABEL, for an operator (D1).
 *
 * The provider's label URL is fetched here, on the server, at the moment an
 * operator asks — never stored, never shown to a customer, never handed to
 * the browser. The PDF is passed through with `no-store`, so it is not kept
 * in any cache. Operators only; the console's 404-when-closed applies.
 */
const MAX_LABEL_BYTES = 10 * 1024 * 1024;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  const { id } = await params;
  const shipmentId = new URL(request.url).searchParams.get("envio") ?? "";
  if (!isOrderId(id)) return new Response("Not found", { status: 404 });
  const order = await orderRepository().get(id);
  const shipment = order?.shipments.find((s) => s.id === shipmentId);
  if (!shipment?.providerRef) return new Response("Not found", { status: 404 });

  const provider = shippingProviderById(shipment.provider);
  if (!provider?.isConfigured())
    return new Response("Shipping provider unavailable", { status: 503 });
  const label = await provider.getLabel(shipment.providerRef);
  if (!label.ok) {
    return new Response("La guía todavía no está disponible. Inténtalo en un momento.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  let pdf: Response;
  try {
    pdf = await fetch(label.value.url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  } catch {
    return new Response("No se pudo descargar la guía.", { status: 502 });
  }
  const bytes = await pdf.arrayBuffer();
  if (!pdf.ok || bytes.byteLength === 0 || bytes.byteLength > MAX_LABEL_BYTES) {
    return new Response("No se pudo descargar la guía.", { status: 502 });
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="guia-${shipment.id}.pdf"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
