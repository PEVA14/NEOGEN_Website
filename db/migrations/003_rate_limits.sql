-- NEOGEN rate limits — shared counters for sign-in, payment, order placement,
-- Atlas and CSP reports (`src/server/security/rateLimit.ts`).
--
-- Idempotent like 001 and 002, so `npm run db:migrate` can run on every
-- deploy. Until it has run, the limiter cannot reach this table and lets
-- requests through (logging `security.rate_limit_unavailable`): a deploy
-- that precedes the migration degrades protection, never checkout.
--
-- `key` is `rule:digest` — a hash of the address, name or order id, never the
-- value itself — so this table holds no personal data. Rows older than a day
-- are deleted by the limiter as it runs.
create table if not exists neogen_rate_limits (
  key           text        primary key,
  window_start  timestamptz not null,
  hits          integer     not null
);
create index if not exists neogen_rate_limits_window_idx
  on neogen_rate_limits (window_start);
