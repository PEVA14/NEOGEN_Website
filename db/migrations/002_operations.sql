-- NEOGEN operations — fulfilment/shipment columns, inventory, notification outbox.
--
-- Idempotent like 001: every statement is `if not exists` or guarded, so
-- `npm run db:migrate` can run on every deploy. Applied after 001 (files run
-- in name order).

-- ---------------------------------------------------------------- orders
-- The order stays one jsonb document; these columns exist to be listed and
-- filtered by the operations console. The repository writes them on every
-- save from the same derivation the memory store uses
-- (`domain/order/attention.ts`), so the two cannot disagree.
alter table neogen_orders add column if not exists fulfilment_state text;
alter table neogen_orders add column if not exists shipment_state text;
alter table neogen_orders add column if not exists attention boolean not null default false;

-- Rows written before this migration: the same derivation `upgradeOrder`
-- applies on read (nothing was ever fulfilled before operations existed).
update neogen_orders
   set fulfilment_state = case
         when state = 'paid' then 'queued'
         when state in ('cancelled', 'refunded') then 'cancelled'
         when state = 'disputed' then 'on_hold'
         else 'unfulfilled'
       end
 where fulfilment_state is null;
update neogen_orders set shipment_state = 'not_shipped' where shipment_state is null;
update neogen_orders set attention = true where state = 'disputed' and attention = false;

create index if not exists neogen_orders_created_idx on neogen_orders (created_at desc);
create index if not exists neogen_orders_ops_idx
  on neogen_orders (fulfilment_state, shipment_state, created_at desc);
create index if not exists neogen_orders_attention_idx
  on neogen_orders (created_at desc) where attention;
create index if not exists neogen_orders_email_idx
  on neogen_orders (lower(data -> 'contact' ->> 'email'));

-- ------------------------------------------------------------- inventory
-- A variant is TRACKED only once a row exists here — created by an operator's
-- first stock count. Untracked variants are never limited, which is how the
-- shop behaved before inventory existed. No row is ever seeded.
create table if not exists neogen_inventory (
  variant_id  text        primary key,
  on_hand     integer     not null,
  reserved    integer     not null default 0 check (reserved >= 0),
  version     integer     not null default 1,
  updated_at  timestamptz not null
);

-- One hold per (order, variant). `held` counts against availability;
-- `consumed` has left the shelf; `released` gave the units back.
create table if not exists neogen_inventory_holds (
  order_id    text        not null,
  variant_id  text        not null,
  quantity    integer     not null check (quantity > 0),
  status      text        not null check (status in ('held', 'released', 'consumed')),
  updated_at  timestamptz not null,
  primary key (order_id, variant_id)
);

-- Append-only ledger. `id` is the idempotency key, so a retried adjustment or
-- hold writes one movement.
create table if not exists neogen_inventory_movements (
  id              text        primary key,
  variant_id      text        not null,
  kind            text        not null,
  on_hand_delta   integer     not null,
  reserved_delta  integer     not null,
  reason          text,
  order_id        text,
  lot_id          text,
  source          text        not null,
  actor           text,
  note            text,
  at              timestamptz not null
);
create index if not exists neogen_inventory_movements_variant_idx
  on neogen_inventory_movements (variant_id, at desc);
create index if not exists neogen_inventory_movements_order_idx
  on neogen_inventory_movements (order_id);

-- ---------------------------------------------------------- notifications
-- Written BEFORE any send is attempted; `id` is one message per (order, kind
-- [, shipment]) ever. `sent` is set only from a provider's own acceptance.
create table if not exists neogen_notification_outbox (
  id                   text        primary key,
  order_id             text        not null,
  kind                 text        not null,
  message              jsonb       not null,
  status               text        not null check (status in ('pending', 'sent', 'failed')),
  attempts             integer     not null default 0,
  last_error           text,
  provider_message_id  text,
  created_at           timestamptz not null,
  updated_at           timestamptz not null
);
create index if not exists neogen_notification_outbox_status_idx
  on neogen_notification_outbox (status, updated_at);
create index if not exists neogen_notification_outbox_order_idx
  on neogen_notification_outbox (order_id);
