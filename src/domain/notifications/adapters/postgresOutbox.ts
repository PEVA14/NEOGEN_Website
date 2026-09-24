import type { SqlClient } from "@/lib/sql";
import type { NotificationMessage, NotificationOutbox, OutboxEntry } from "../types";

/**
 * THE DURABLE OUTBOX — `neogen_notification_outbox`
 * (`db/migrations/002_operations.sql`).
 *
 * Same contract as the memory outbox: `enqueue` is idempotent on the message
 * id (`insert … on conflict do nothing`), and `sent` is written only after a
 * channel reports the provider accepted the message. With no channel
 * configured, rows stay `pending` — an honest list of what is owed.
 *
 * The payload holds the message facts (names, items, amounts, and for
 * internal messages the delivery address) — personal data, kept beside the
 * orders it came from and under the same retention decision.
 */
interface Row {
  message: NotificationMessage;
  status: OutboxEntry["status"];
  attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  updated_at: string | Date;
}

const iso = (v: string | Date) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

const toEntry = (r: Row): OutboxEntry => ({
  message: r.message,
  status: r.status,
  attempts: Number(r.attempts),
  lastError: r.last_error,
  providerMessageId: r.provider_message_id,
  updatedAt: iso(r.updated_at),
});

const COLUMNS = `message, status, attempts, last_error, provider_message_id, updated_at`;

export function createPostgresOutbox(sql: SqlClient): NotificationOutbox {
  return {
    async enqueue(message) {
      const inserted = await sql.query<Row>(
        `insert into neogen_notification_outbox
           (id, order_id, kind, message, status, attempts, created_at, updated_at)
         values ($1, $2, $3, $4::jsonb, 'pending', 0, $5, $5)
         on conflict (id) do nothing
         returning ${COLUMNS}`,
        [message.id, message.orderId, message.kind, JSON.stringify(message), message.createdAt],
      );
      if (inserted.rows[0]) return { created: true, entry: toEntry(inserted.rows[0]) };
      const existing = await sql.query<Row>(
        `select ${COLUMNS} from neogen_notification_outbox where id = $1`,
        [message.id],
      );
      return { created: false, entry: toEntry(existing.rows[0]) };
    },

    async get(id) {
      const r = await sql.query<Row>(
        `select ${COLUMNS} from neogen_notification_outbox where id = $1`,
        [id],
      );
      return r.rows[0] ? toEntry(r.rows[0]) : null;
    },

    async markSent(id, providerMessageId, at) {
      await sql.query(
        `update neogen_notification_outbox
            set status = 'sent', attempts = attempts + 1, provider_message_id = $2,
                last_error = null, updated_at = $3
          where id = $1`,
        [id, providerMessageId, at],
      );
    },

    async markFailed(id, error, at) {
      await sql.query(
        `update neogen_notification_outbox
            set status = 'failed', attempts = attempts + 1, last_error = $2, updated_at = $3
          where id = $1`,
        [id, error.slice(0, 120), at],
      );
    },

    async pending() {
      const r = await sql.query<Row>(
        `select ${COLUMNS} from neogen_notification_outbox
          where status <> 'sent' order by created_at limit 500`,
      );
      return r.rows.map(toEntry);
    },

    async forOrder(orderId) {
      const r = await sql.query<Row>(
        `select ${COLUMNS} from neogen_notification_outbox
          where order_id = $1 order by created_at`,
        [orderId],
      );
      return r.rows.map(toEntry);
    },

    async recent(limit) {
      const r = await sql.query<Row>(
        `select ${COLUMNS} from neogen_notification_outbox order by updated_at desc limit $1`,
        [limit],
      );
      return r.rows.map(toEntry);
    },
  };
}
