import "server-only";

import { siteConfig } from "@/config/site";
import { formatAddress } from "@/domain/checkout/validate";
import { dispatch, messagesOwed } from "@/domain/notifications";
import { noneChannel } from "@/domain/notifications/adapters/none";
import { signal } from "@/server/observe";
import { statusUrl } from "@/server/orderAccess";
import { notificationOutbox, orderRepository } from "@/server/persistence";

import type { NotificationChannel } from "@/domain/notifications";
import type { RenderContext } from "@/domain/notifications/render";
import type { Order } from "@/domain/order/types";

/**
 * WHERE THE NOTIFICATION ADAPTERS ARE CHOSEN — the one file that knows.
 *
 * TODO(owner): choose an email provider and an operations destination (inbox
 * or chat). Then register a channel adapter in `activeChannel`; it receives
 * each message and renders it with `renderEmail` (`domain/notifications/
 * render.ts`). Nothing else changes. Until then every owed message is written
 * to the outbox as `pending` — and the console says "not sent", because it
 * was not.
 */
export function activeChannel(): NotificationChannel {
  return noneChannel;
}

/**
 * Queue (and, once a channel exists, send) every message this order is owed.
 *
 * Called after EVERY order change. The set of owed messages is derived from
 * the order's state, and the outbox is idempotent on message id, so calling
 * this ten times queues each message once. Never throws: a customer whose
 * order changed has had it changed, whether or not an email went out.
 */
export async function notifyOrder(order: Order): Promise<void> {
  try {
    const results = await dispatch(
      messagesOwed(order, (o) => formatAddress(o.shipping)),
      notificationOutbox(),
      activeChannel(),
    );
    for (const r of results) {
      if (r.status === "failed") {
        signal("notification.send_failed", "warn", {
          orderId: order.id,
          code: r.id.split(":").at(-1),
        });
      }
    }
  } catch {
    signal("notification.enqueue_failed", "error", { orderId: order.id });
  }
}

/**
 * What a message needs at render time that must not be stored in the outbox:
 * the signed status link (a bearer credential, re-derived for each send) and
 * the contact line. A channel adapter calls this, then `renderEmail`.
 */
export async function renderContextFor(orderId: string): Promise<RenderContext> {
  const order = await orderRepository().get(orderId);
  return {
    statusUrl: order ? statusUrl(order) : null,
    phoneDisplay: siteConfig.contact.phoneDisplay,
    phoneHref: `tel:${siteConfig.contact.phone}`,
  };
}
