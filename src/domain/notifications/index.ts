import type { Order } from "@/domain/order/types";
import type { Locale } from "@/i18n/config";
import type { Shipment } from "@/domain/order/types";
import { MAX_SEND_ATTEMPTS } from "./types";

import type {
  NotificationChannel,
  NotificationKind,
  NotificationMessage,
  NotificationOutbox,
  OrderFacts,
  OutboxEntry,
  ShipmentFacts,
} from "./types";

export type {
  NotificationChannel,
  NotificationKind,
  NotificationMessage,
  NotificationOutbox,
  NotificationRecipient,
  OrderFacts,
  OrderPlacedFacts,
  OutboxEntry,
  OutboxStatus,
  SendResult,
  ShipmentFacts,
} from "./types";
export { MAX_SEND_ATTEMPTS, NOTIFICATION_KINDS } from "./types";

function factsFor(order: Order): OrderFacts {
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
      if (!channel.isConfigured() || !worthSending(entry)) {
        /* Left as it is, deliberately. When a channel is registered, the
           pending entries are exactly the emails that are owed; a message
           given up on stays visible as failed in the console. */
        results.push({ id: message.id, status: "queued" });
        continue;
      }
      results.push({ id: message.id, status: await sendOne(entry, channel, outbox, now) });
    } catch {
      results.push({ id: message.id, status: "failed" });
    }
  }
  return results;
}

/**
 * Should this unsent entry be tried (again)? Not once the provider rejected
 * the message itself — the same message would be rejected again — and not
 * after MAX_SEND_ATTEMPTS recorded failures. Configuration failures (a bad
 * key, an unverified domain) and outages stay retryable: fixing them should
 * let the owed email go out.
 */
export function worthSending(entry: OutboxEntry): boolean {
  if (entry.status === "sent") return false;
  if (entry.status === "failed" && entry.lastError === "rejected") return false;
  return entry.attempts < MAX_SEND_ATTEMPTS;
}

async function sendOne(
  entry: OutboxEntry,
  channel: NotificationChannel,
  outbox: NotificationOutbox,
  now: () => string,
): Promise<"sent" | "failed"> {
  const sent = await channel.send(entry.message, { attempt: entry.attempts });
  if (sent.ok) {
    await outbox.markSent(entry.message.id, sent.providerMessageId, now());
    return "sent";
  }
  await outbox.markFailed(entry.message.id, sent.error.code, now());
  return "failed";
}

/**
 * RETRY WHAT IS STILL OWED — every unsent entry worth sending, oldest first.
 *
 * Run by the scheduled job and the console's "Reintentar envíos". The same
 * idempotent path as `dispatch`: an entry sent meanwhile is skipped, and the
 * provider's idempotency key covers a send that was never recorded. Never
 * throws; a failure is recorded on the entry and counted.
 */
export async function retryOwed(
  outbox: NotificationOutbox,
  channel: NotificationChannel,
  now: () => string = () => new Date().toISOString(),
  limit = 50,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const summary = { sent: 0, failed: 0, skipped: 0 };
  if (!channel.isConfigured()) return summary;
  let entries: readonly OutboxEntry[];
  try {
    entries = await outbox.pending();
  } catch {
    return summary;
  }
  for (const entry of entries.slice(0, limit)) {
    if (!worthSending(entry)) {
      summary.skipped += 1;
      continue;
    }
    try {
      summary[await sendOne(entry, channel, outbox, now)] += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

function shipmentFacts(s: Shipment): ShipmentFacts {
  return {
    id: s.id,
    carrier: s.carrier,
    service: s.service,
    trackingNumber: s.trackingNumber,
    trackingUrl: s.trackingUrl,
    shippedAt: s.shippedAt,
    deliveredAt: s.deliveredAt,
  };
}

function customerMessage(
  order: Order,
  kind: NotificationKind,
  id: string,
  createdAt: string,
  extra: Partial<OrderFacts> = {},
): NotificationMessage {
  return {
    id,
    kind,
    orderId: order.id,
    locale: order.locale,
    recipient: { role: "customer", email: order.contact.email, name: order.contact.name },
    createdAt,
    facts: { ...factsFor(order), ...extra },
  };
}

/**
 * EVERY MESSAGE THIS ORDER IS OWED, as of now.
 *
 * LEVEL-TRIGGERED: derived from where the order IS (its milestones and
 * shipments), not from which transition just happened. Called after every
 * change, it returns the same ids every time, and the outbox's idempotent
 * `enqueue` turns that into "each message queued exactly once" — including a
 * message a crash prevented from being queued the first time.
 *
 * Deliberately NOT here: preparing, ready to ship, a payment failure, a
 * refund merely requested. See `NotificationKind`.
 */
export function messagesOwed(
  order: Order,
  formatAddress: (order: Order) => string,
): readonly NotificationMessage[] {
  const owed: NotificationMessage[] = [];
  const m = order.milestones;
  if (m.paid) owed.push(...orderPlacedMessages(order, order.locale, formatAddress));

  for (const s of order.shipments) {
    const facts = { shipment: shipmentFacts(s) };
    if (s.shippedAt) {
      owed.push(
        customerMessage(
          order,
          "order.shipped.customer",
          `${order.id}:${s.id}:order.shipped.customer`,
          s.shippedAt,
          facts,
        ),
      );
    }
    if (s.trackingAddedAt) {
      owed.push(
        customerMessage(
          order,
          "order.tracking.customer",
          `${order.id}:${s.id}:order.tracking.customer`,
          s.trackingAddedAt,
          facts,
        ),
      );
    }
    if (s.deliveredAt) {
      owed.push(
        customerMessage(
          order,
          "order.delivered.customer",
          `${order.id}:${s.id}:order.delivered.customer`,
          s.deliveredAt,
          facts,
        ),
      );
    }
  }

  /* Only a customer who paid hears about a cancellation: an abandoned,
     unpaid order being tidied away is not news to anyone. */
  if (order.cancellation && m.paid) {
    owed.push(
      customerMessage(
        order,
        "order.cancelled.customer",
        `${order.id}:order.cancelled.customer`,
        order.cancellation.at,
      ),
    );
  }

  if (m.refunded) {
    const confirmed = order.refunds.find((r) => r.status === "confirmed");
    owed.push(
      customerMessage(
        order,
        "order.refunded.customer",
        `${order.id}:order.refunded.customer`,
        m.refunded,
        { refunded: confirmed ? { ...confirmed.amount } : { ...order.totals.total } },
      ),
    );
  }

  if (m.disputed) {
    owed.push({
      id: `${order.id}:order.disputed.internal`,
      kind: "order.disputed.internal",
      orderId: order.id,
      locale: "es",
      recipient: { role: "internal" },
      createdAt: m.disputed,
      facts: factsFor(order),
    });
  }

  return owed;
}
