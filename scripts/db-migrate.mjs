/**
 * APPLY THE ORDER SCHEMA to the database in DATABASE_URL.
 *
 *   DATABASE_URL=postgres://… npm run db:migrate
 *
 * Every statement in db/migrations is idempotent, so this is safe to run on
 * every deploy. Prints table names only — never the connection string.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set — nothing to migrate.");
  process.exit(1);
}

const dir = path.resolve(import.meta.dirname, "../db/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const file of files) {
    await client.query(readFileSync(path.join(dir, file), "utf8"));
    console.log(`applied ${file}`);
  }
  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_name like 'neogen_%' order by 1`,
  );
  console.log(`tables: ${rows.map((r) => r.table_name).join(", ")}`);
} finally {
  await client.end();
}
