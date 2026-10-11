import type { SqlClient } from "@/lib/sql";

/**
 * WHERE RATE-LIMIT COUNTS LIVE — fixed windows, one counter per key.
 *
 * A serverless deployment runs several instances at once, so a count kept in
 * one instance's memory is a count an attacker spreads across the others. In
 * a deployment the counters live in Postgres (`neogen_rate_limits`, migration
 * 003); locally, with no `DATABASE_URL`, in memory, like every other store.
 *
 * FIXED WINDOWS: a key's count resets when its window rolls over. It allows a
 * burst of up to twice the limit across a boundary, which is acceptable for
 * what this is — a brake on loops and guessing, not a billing quota — and it
 * makes every check a single atomic upsert.
 *
 * KEYS ARE NOT RAW: callers pass `rule:digest`, never an address or a name
 * (`rateLimit.ts` hashes them), so the table holds no personal data.
 */
export interface RateLimitStore {
  /** Count one hit in `windowStart`'s window and return the count so far. */
  hit(key: string, windowStart: number): Promise<number>;
  /** The count in `windowStart`'s window, without adding to it. */
  peek(key: string, windowStart: number): Promise<number>;
  /** Forget these keys entirely (a successful sign-in clears its failures). */
  clear(keys: readonly string[]): Promise<void>;
}

/* ------------------------------------------------------------------ memory */

const KEY = "__neogen_rate_limits__";

function counters(): Map<string, { windowStart: number; hits: number }> {
  const g = globalThis as typeof globalThis & {
    [KEY]?: Map<string, { windowStart: number; hits: number }>;
  };
  g[KEY] ??= new Map();
  return g[KEY];
}

export const memoryRateLimitStore: RateLimitStore = {
  async hit(key, windowStart) {
    const map = counters();
    const current = map.get(key);
    const hits = current && current.windowStart === windowStart ? current.hits + 1 : 1;
    map.set(key, { windowStart, hits });
    /* A development heap, but still bounded: drop windows that have rolled over. */
    if (map.size > 10_000) {
      for (const [k, v] of map) if (v.windowStart < windowStart) map.delete(k);
    }
    return hits;
  },
  async peek(key, windowStart) {
    const current = counters().get(key);
    return current && current.windowStart === windowStart ? current.hits : 0;
  },
  async clear(keys) {
    for (const k of keys) counters().delete(k);
  },
};

/** Test-only. */
export function __resetMemoryRateLimits(): void {
  counters().clear();
}

/* ---------------------------------------------------------------- postgres */

/** Rows older than this are deleted, now and then, by the hits themselves. */
const RETAIN_MS = 24 * 60 * 60 * 1000;

export function createPostgresRateLimitStore(sql: SqlClient): RateLimitStore {
  return {
    async hit(key, windowStart) {
      const start = new Date(windowStart).toISOString();
      const { rows } = await sql.query<{ hits: number }>(
        `insert into neogen_rate_limits (key, window_start, hits)
              values ($1, $2, 1)
         on conflict (key) do update
               set hits = case
                            when neogen_rate_limits.window_start = excluded.window_start
                              then neogen_rate_limits.hits + 1
                            else 1
                          end,
                   window_start = excluded.window_start
         returning hits`,
        [key, start],
      );
      /* Housekeeping on roughly one hit in a hundred: no cron, no unbounded table. */
      if (Math.random() < 0.01) {
        await sql
          .query(`delete from neogen_rate_limits where window_start < $1`, [
            new Date(windowStart - RETAIN_MS).toISOString(),
          ])
          .catch(() => undefined);
      }
      return Number(rows[0]?.hits ?? 1);
    },
    async peek(key, windowStart) {
      const { rows } = await sql.query<{ hits: number }>(
        `select hits from neogen_rate_limits where key = $1 and window_start = $2`,
        [key, new Date(windowStart).toISOString()],
      );
      return Number(rows[0]?.hits ?? 0);
    },
    async clear(keys) {
      if (keys.length === 0) return;
      await sql.query(`delete from neogen_rate_limits where key = any($1::text[])`, [[...keys]]);
    },
  };
}
