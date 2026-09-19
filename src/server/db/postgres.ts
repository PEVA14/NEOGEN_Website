import "server-only";

import { Pool } from "pg";

import type { SqlClient } from "@/lib/sql";

/**
 * THE PRODUCTION SQL CLIENT — one `pg` pool per server instance.
 *
 * Kept on `globalThis` so hot reloads in development do not open a new pool
 * per edit. Small, because a serverless instance handles one request at a
 * time and a Neon pooled connection string does the pooling server-side.
 */
const KEY = "__neogen_pg_pool__";

function pool(connectionString: string): Pool {
  const globals = globalThis as typeof globalThis & { [KEY]?: Pool };
  globals[KEY] ??= new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return globals[KEY];
}

export function postgresClient(connectionString: string): SqlClient {
  const p = pool(connectionString);
  const client: SqlClient = {
    async query(text, params) {
      const result = await p.query(text, params as unknown[] | undefined);
      return { rows: result.rows };
    },
    async transaction(fn) {
      const conn = await p.connect();
      try {
        await conn.query("begin");
        const tx: SqlClient = {
          async query(text, params) {
            const result = await conn.query(text, params as unknown[] | undefined);
            return { rows: result.rows };
          },
          /* Nested transactions are not needed; run inline. */
          transaction: (inner) => inner(tx),
        };
        const out = await fn(tx);
        await conn.query("commit");
        return out;
      } catch (error) {
        await conn.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        conn.release();
      }
    },
  };
  return client;
}
