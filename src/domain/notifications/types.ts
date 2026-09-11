import type { Money } from "@/data/commerce/types";
import type { Locale } from "@/i18n/config";
import type { PaymentState } from "@/domain/order/types";

/**
 * NOTIFICATIONS — what NEOGEN tells people when an order happens.
 *
 * PROVIDER-INDEPENDENT, the same way payments are. No Resend, SendGrid, Gmail
 * or SES name appears outside `./adapters`, and the order domain never imports
 * this module at all: the server action that places an order hands the order
 * to `server/notifications`, which builds messages and passes them to whatever
 * channel is registered.
 *
 * A MESSAGE IS STRUCTURED FACTS, NOT PROSE. Subject lines and bodies are copy,
 * copy is localized, and customer email copy is exactly the kind of text that
 * starts making promises — delivery dates, next steps — nobody approved. So the
 * domain produces the facts an email may state, and rendering those facts into
 * words is the adapter's job, reviewed when an adapter exists.
 */
export type NotificationKind = "order.placed.customer" | "order.placed.internal";

export interface OrderPlacedFacts {
  orderId: string;
  placedAt: string;
  /** Stated plainly in both messages. With no processor this is `created`. */
  paymentState: PaymentState;
  lines: readonly { name: string; presentation: string; quantity: number; lineTotal: Money }[];
  subtotal: Money;
  shipping: Money;
  total: Money;
  deliveryMethod: string;
  estimateDays: number;
}

/**
 * Who a message is for.
 *
 * The internal recipient carries NO address. Where NEOGEN's operations inbox
 * is — or whether it is an inbox at all rather than a chat channel — is an
 * owner decision (`siteConfig.tbd.supportEmail` is null), and the channel
 * resolves it from configuration when one is registered.
 */
export type NotificationRecipient =
  { role: "customer"; email: string; name: string } | { role: "internal" };

export interface NotificationMessage {
  /** Idempotency key: one message per (order, kind), ever. */
  id: string;
  kind: NotificationKind;
  orderId: string;
  locale: Locale;
  recipient: NotificationRecipient;
  createdAt: string;
  facts: OrderPlacedFacts;
  /**
   * Internal messages only: where it ships and how to reach the customer.
   * Kept off the customer message, which does not need to repeat their own
   * address back to an inbox that may be read on a shared screen.
   */
  fulfilment?: {
    contact: { name: string; email: string; phone: string };
    address: string;
    notes: string | null;
  };
}

export type SendResult =
  | { ok: true; providerMessageId: string }
  | {
      ok: false;
      error: { code: "unconfigured" | "rejected" | "provider_error"; retryable: boolean };
    };

/** THE CHANNEL CONTRACT. One adapter per provider, under `./adapters`. */
export interface NotificationChannel {
  readonly id: string;
  isConfigured(): boolean;
  send(message: NotificationMessage): Promise<SendResult>;
}

export type OutboxStatus = "pending" | "sent" | "failed";

export interface OutboxEntry {
  message: NotificationMessage;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  updatedAt: string;
}

/**
 * THE OUTBOX — why a message is recorded BEFORE it is sent.
 *
 * Sending is a network call that fails. If the order is saved and the send
 * throws, the only record that a customer was owed an email is the one written
 * first. `enqueue` is idempotent on message id, so a retried order placement
 * cannot queue the same email twice.
 */
export interface NotificationOutbox {
  enqueue(message: NotificationMessage): Promise<{ created: boolean; entry: OutboxEntry }>;
  get(id: string): Promise<OutboxEntry | null>;
  markSent(id: string, providerMessageId: string, at: string): Promise<void>;
  markFailed(id: string, error: string, at: string): Promise<void>;
  pending(): Promise<readonly OutboxEntry[]>;
}
