/**
 * APPLY THE SCHEMA to a Postgres database.
 *
 *   DATABASE_URL=postgres://… npm run db:migrate
 *
 * Uses DATABASE_URL_UNPOOLED when it is set (Neon's direct connection, which
 * is what schema changes should use), otherwise DATABASE_URL. Prints which
 * variable it used, the migrations applied or skipped, and the table names —
 * never a connection string.
 *
 * Each file runs once and is recorded in `neogen_schema_migrations`; see
 * `scripts/lib/migrate.mjs` for the rules.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import pg from "pg";

import { migrate } from "./lib/migrate.mjs";

const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim();
const url = unpooled || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Neither DATABASE_URL_UNPOOLED nor DATABASE_URL is set — nothing to migrate.");
  process.exit(1);
}
console.log(`using ${unpooled ? "DATABASE_URL_UNPOOLED" : "DATABASE_URL"}`);

const dir = path.resolve(import.meta.dirname, "../db/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await migrate(client, files);
  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_name like 'neogen_%' order by 1`,
  );
  console.log(`tables: ${rows.map((r) => r.table_name).join(", ")}`);
} finally {
  await client.end();
}
