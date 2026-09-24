import { NextResponse } from "next/server";

import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { isOrderId } from "@/payments/instrument";
import { rememberOrder } from "@/server/checkout/session";
import { verifyAccessToken } from "@/server/orderAccess";
import { orderRepository } from "@/server/persistence";

/**
 * EXCHANGE A SIGNED LINK FOR ACCESS — then get the token out of the URL.
 *
 * `GET /{locale}/pedido/{id}/acceso?t=…` verifies the token against the
 * order (`server/orderAccess.ts`). Valid: the order joins this browser's
 * httpOnly ownership cookie, exactly as if it had been placed here. Either
 * way the response is a redirect to the plain status URL, so the token never
 * stays in the address bar, the history or a Referer header, and an invalid
 * link lands on the same "not found" as a missing order — nothing about the
 * response says whether the order exists.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
): Promise<Response> {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : "es";
  const target = new URL(localizePath(routes.orderStatus(id), locale), request.url);

  if (isOrderId(id)) {
    const token = new URL(request.url).searchParams.get("t");
    const order = token ? await orderRepository().get(id) : null;
    if (order && verifyAccessToken(order, token)) await rememberOrder(order.id);
  }

  const response = NextResponse.redirect(target, 303);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
