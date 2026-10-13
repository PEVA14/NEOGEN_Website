/**
 * THE MIGRATION RUNNER — shared by `npm run db:migrate` and the checks.
 *
 * Applies `db/migrations/*.sql` in name order and records each one in
 * `neogen_schema_migrations` (name, checksum, when), each file and its record
 * in one transaction. A recorded file whose checksum still matches is skipped.
 *
 * LEGACY FILES: 001–003 were written to be re-run (every statement guarded)
 * before this table existed, and databases migrated then have no record of
 * them. They are applied once more on the first tracked run, recorded, and
 * re-applied whenever their text changes. EVERY LATER FILE runs exactly once:
 * editing one after it was applied is refused, because a database that ran
 * the old text would silently differ from one that runs the new. Write a new
 * migration instead.
 *
 * `client.query(text, params?)` must accept a multi-statement text when no
 * params are given (`pg` does; the checks adapt PGlite's `exec`).
 */
import { createHash } from "node:crypto";

export const LEGACY = new Set(["001_orders.sql", "002_operations.sql", "003_rate_limits.sql"]);

const checksum = (sql) => createHash("sha256").update(sql).digest("hex");

export async function migrate(client, files, { log = console.log } = {}) {
  await client.query(
    `create table if not exists neogen_schema_migrations (
       name        text        primary key,
       checksum    text        not null,
       applied_at  timestamptz not null default now()
     )`,
  );
  const { rows } = await client.query(`select name, checksum from neogen_schema_migrations`);
  const recorded = new Map(rows.map((r) => [r.name, r.checksum]));

  const applied = [];
  for (const { name, sql } of files) {
    const sum = checksum(sql);
    const previous = recorded.get(name);
    if (previous === sum) {
      log(`skipped ${name} (already applied)`);
      continue;
    }
    if (previous && !LEGACY.has(name)) {
      throw new Error(
        `${name} was changed after it was applied. Migrations after 003 run once: write a new file instead.`,
      );
    }
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        `insert into neogen_schema_migrations (name, checksum, applied_at) values ($1, $2, now())
         on conflict (name) do update set checksum = excluded.checksum, applied_at = now()`,
        [name, sum],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    }
    applied.push(name);
    log(`applied ${name}`);
  }
  return applied;
}
