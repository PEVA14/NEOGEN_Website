import "server-only";

import { siteConfig } from "@/config/site";
import { formatAddress } from "@/domain/checkout/validate";
import { dispatch, messagesOwed, retryOwed } from "@/domain/notifications";
import { createResendChannel, readResendConfig } from "@/domain/notifications/adapters/resend";
import { signal } from "@/server/observe";
import { statusUrl } from "@/server/orderAccess";
import { notificationOutbox, orderRepository } from "@/server/persistence";

import type { NotificationChannel } from "@/domain/notifications";
import type { RenderContext } from "@/domain/notifications/render";
import type { Order } from "@/domain/order/types";

/**
 * WHERE THE NOTIFICATION ADAPTERS ARE CHOSEN — the one file that knows.
 *
 * Resend (owner decision B6, 2026-10-15). It sends only when its
 * configuration is complete AND `EMAIL_SENDING=enabled`
 * (`readResendConfig`); until then it reports itself unconfigured and every
 * owed message stays `pending` in the outbox — and the console says "not
 * sent", because it was not. Read on every call, so a deployment's variables
 * decide, and a test can configure it.
 */
const resendChannel = createResendChannel({
  config: () => readResendConfig(),
  context: (orderId) => renderContextFor(orderId),
});

export function activeChannel(): NotificationChannel {
  return resendChannel;
}

/**
 * Send what is still owed — the scheduled job and the console's
 * "Reintentar envíos". Never throws; counts only.
 */
export async function retryNotifications(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  try {
    const summary = await retryOwed(notificationOutbox(), activeChannel());
    if (summary.failed > 0) signal("notification.send_failed", "warn", { count: summary.failed });
    return summary;
  } catch {
    signal("notification.send_failed", "error", { reason: "retry" });
    return { sent: 0, failed: 0, skipped: 0 };
  }
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
