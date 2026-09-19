import type { SqlClient } from "@/lib/sql";
import type { CheckoutDraft } from "../types";
import type { DraftStore } from "../store";

/**
 * DURABLE DRAFTS — Postgres, so a checkout survives a serverless instance.
 *
 * On a platform that runs many instances, an in-memory draft written by one
 * request is invisible to the next, and the customer is told their session
 * expired between two steps. This adapter is the fix; drafts keep their
 * single-writer, last-write-wins semantics (see `../store.ts`).
 *
 * A draft is personal data with a short purpose, so it has a lifetime: older
 * than `DRAFT_TTL_HOURS` it is treated as absent, and expired rows are purged
 * opportunistically on write.
 */
export const DRAFT_TTL_HOURS = 48;

export function createPostgresDraftStore(sql: SqlClient, random = Math.random): DraftStore {
  return {
    async get(id) {
      const found = await sql.query<{ data: CheckoutDraft }>(
        `select data from neogen_checkout_drafts
          where id = $1 and updated_at > now() - make_interval(hours => $2)`,
        [id, DRAFT_TTL_HOURS],
      );
      return found.rows[0] ? structuredClone(found.rows[0].data) : null;
    },

    async put(draft) {
      await sql.query(
        `insert into neogen_checkout_drafts (id, data, updated_at) values ($1, $2::jsonb, now())
         on conflict (id) do update set data = excluded.data, updated_at = now()`,
        [draft.id, JSON.stringify(draft)],
      );
      /* Roughly one write in fifty sweeps expired drafts. No cron needed. */
      if (random() < 0.02) {
        await sql.query(
          `delete from neogen_checkout_drafts where updated_at < now() - make_interval(hours => $1)`,
          [DRAFT_TTL_HOURS],
        );
      }
      return structuredClone(draft);
    },

    async delete(id) {
      await sql.query(`delete from neogen_checkout_drafts where id = $1`, [id]);
    },
  };
}
