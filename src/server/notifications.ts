import "server-only";

import { formatAddress } from "@/domain/checkout/validate";
import { dispatch, orderPlacedMessages } from "@/domain/notifications";
import { memoryOutbox } from "@/domain/notifications/adapters/memoryOutbox";
import { noneChannel } from "@/domain/notifications/adapters/none";

import type { Order } from "@/domain/order/types";
import type { Locale } from "@/i18n/config";

/**
 * WHERE THE NOTIFICATION ADAPTERS ARE CHOSEN — the one file that knows.
 *
 * TODO(owner): choose an email provider and an operations destination. Then
 * register a channel adapter here; nothing else changes. Until then every
 * order's two messages are written to the outbox as `pending`.
 */
export async function notifyOrderPlaced(order: Order, locale: Locale): Promise<void> {
  try {
    await dispatch(
      orderPlacedMessages(order, locale, (o) => formatAddress(o.shipping)),
      memoryOutbox(),
      noneChannel,
    );
  } catch {
    /* A notification failure never reaches the customer's confirmation. */
  }
}
