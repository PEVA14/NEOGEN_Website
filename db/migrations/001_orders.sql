-- NEOGEN order storage — orders, payment references, provider events, drafts.
--
-- Idempotent: every statement is `if not exists`, so `npm run db:migrate` can
-- run on every deploy. Plain Postgres; nothing vendor-specific
-- (docs/PERSISTENCE_RECOMMENDATION.md recommends Neon, Supabase also works).

-- One row per order. The full order is `data`; the columns beside it are what
-- is queried or constrained. `version` is the optimistic-concurrency counter
-- the repository's `save` checks, so a webhook and a customer action touching
-- one order at the same instant cannot overwrite each other.
create table if not exists neogen_orders (
  id            text primary key,
  version       integer     not null check (version >= 1),
  state         text        not null,
  provider      text,
  provider_ref  text,
  total_amount  integer     not null check (total_amount >= 0),
  created_at    timestamptz not null,
  updated_at    timestamptz not null,
  data          jsonb       not null
);

create index if not exists neogen_orders_state_idx on neogen_orders (state, updated_at);

-- Every provider reference an order has ever had (one per payment attempt),
-- so a late webhook for an earlier attempt still finds its order.
create table if not exists neogen_order_provider_refs (
  provider_ref  text primary key,
  order_id      text not null references neogen_orders (id) on delete cascade
);

-- Deduplication, enforced by the database: a provider event id is recorded at
-- most once, globally.
create table if not exists neogen_provider_events (
  provider_event_id  text primary key,
  order_id           text        not null references neogen_orders (id) on delete cascade,
  recorded_at        timestamptz not null default now()
);

-- Checkout drafts: one person's half-finished form. Short-lived; rows older
-- than the draft lifetime are ignored on read and purged opportunistically.
create table if not exists neogen_checkout_drafts (
  id          text primary key,
  data        jsonb       not null,
  updated_at  timestamptz not null default now()
);

create index if not exists neogen_checkout_drafts_updated_idx on neogen_checkout_drafts (updated_at);
