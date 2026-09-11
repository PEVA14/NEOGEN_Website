import type { Order } from "@/domain/order/types";
import type { Locale } from "@/i18n/config";
import type {
  NotificationChannel,
  NotificationMessage,
  NotificationOutbox,
  OrderPlacedFacts,
} from "./types";

export type {
  NotificationChannel,
  NotificationKind,
  NotificationMessage,
  NotificationOutbox,
  NotificationRecipient,
  OrderPlacedFacts,
  OutboxEntry,
  OutboxStatus,
  SendResult,
} from "./types";

function factsFor(order: Order): OrderPlacedFacts {
  return {
    orderId: order.id,
    placedAt: order.createdAt,
    paymentState: order.state,
    lines: order.lines.map((l) => ({
      name: l.name,
      presentation: l.presentation,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
    subtotal: order.totals.subtotal,
    shipping: order.totals.shipping,
    total: order.totals.total,
    deliveryMethod: order.delivery.methodId,
    estimateDays: order.delivery.estimateDays,
  };
}

/**
 * The two messages an order produces.
 *
 * PURE: no clock, no network, no provider. The ids are derived from the order,
 * so building them twice for the same order yields the same ids — which is what
 * makes the outbox's idempotency meaningful.
 */
export function orderPlacedMessages(
  order: Order,
  locale: Locale,
  formatAddress: (order: Order) => string,
): readonly NotificationMessage[] {
  const facts = factsFor(order);
  return [
    {
      id: `${order.id}:order.placed.customer`,
      kind: "order.placed.customer",
      orderId: order.id,
      locale,
      recipient: { role: "customer", email: order.contact.email, name: order.contact.name },
      createdAt: order.createdAt,
      facts,
    },
    {
      id: `${order.id}:order.placed.internal`,
      kind: "order.placed.internal",
      orderId: order.id,
      /* Operations reads Spanish, whatever locale the customer bought in. */
      locale: "es",
      recipient: { role: "internal" },
      createdAt: order.createdAt,
      facts,
      fulfilment: {
        contact: {
          name: order.contact.name,
          email: order.contact.email,
          phone: order.contact.phone,
        },
        address: formatAddress(order),
        notes: order.shipping.notes,
      },
    },
  ];
}

/**
 * Queue then attempt. Never throws.
 *
 * Returns what happened per message so the caller can log it, but the caller
 * must not act on a failure by failing the order: a customer whose order was
 * recorded has placed an order, whether or not the email went out.
 */
export async function dispatch(
  messages: readonly NotificationMessage[],
  outbox: NotificationOutbox,
  channel: NotificationChannel,
  now: () => string = () => new Date().toISOString(),
): Promise<readonly { id: string; status: "sent" | "queued" | "failed" | "duplicate" }[]> {
  const results: { id: string; status: "sent" | "queued" | "failed" | "duplicate" }[] = [];
  for (const message of messages) {
    try {
      const { created, entry } = await outbox.enqueue(message);
      if (!created && entry.status === "sent") {
        results.push({ id: message.id, status: "duplicate" });
        continue;
      }
      if (!channel.isConfigured()) {
        /* Left pending, deliberately. When a channel is registered, the
           pending entries are exactly the emails that are owed. */
        results.push({ id: message.id, status: "queued" });
        continue;
      }
      const sent = await channel.send(message);
      if (sent.ok) {
        await outbox.markSent(message.id, sent.providerMessageId, now());
        results.push({ id: message.id, status: "sent" });
      } else {
        await outbox.markFailed(message.id, sent.error.code, now());
        results.push({ id: message.id, status: "failed" });
      }
    } catch {
      results.push({ id: message.id, status: "failed" });
    }
  }
  return results;
}
