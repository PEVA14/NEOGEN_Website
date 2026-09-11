# Durable persistence — recommendation

**Status:** recommendation only. Nothing is integrated. Choosing a vendor and
creating a production database needs owner approval (Phase 11, Part F).

**Question:** what should replace the in-memory adapters behind
`OrderRepository`, `DraftStore` and `NotificationOutbox` (see
`src/server/persistence.ts`, `src/server/notifications.ts`)?

**Recommendation:** **Neon Postgres, provisioned through the Vercel
Marketplace, in AWS `us-east-1`, with Vercel Functions pinned to `iad1`.**
Supabase is a credible second choice and the right one only if NEOGEN later
wants its auth, storage or realtime products. Nothing below requires anything
but plain Postgres, so the choice stays reversible.

---

## 1. Facts this rests on

Checked against each vendor's own documentation in September 2026. Prices and
regions change; re-check before signing up.

|                     | Neon                                                                                                   | Supabase                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Engine              | Postgres                                                                                               | Postgres                                                                                                        |
| Regions near Mexico | `aws-us-east-1`, `aws-us-east-2`, `aws-us-west-2`, `aws-sa-east-1`                                     | `us-east-1`, `us-east-2`, `us-west-1`, `us-west-2`, `sa-east-1`                                                 |
| **Mexico region**   | **None** (`mx-central-1` not offered)                                                                  | **None** (open feature request)                                                                                 |
| Free tier           | 0.5 GB/project, 100 CU-hours/project, scale-to-zero after 5 min                                        | 500 MB, **paused after 1 week of inactivity**, 2 active projects                                                |
| Entry paid          | Launch: pay-as-you-go, **no monthly minimum**, $0.106/CU-hour, $0.35/GB-month, history up to 7 days    | Pro: from **$25/month**, $10/month compute credit, 8 GB disk, daily backups kept 7 days; PITR add-on $100/month |
| Vercel              | Native Marketplace integration, billed on the Vercel invoice (Vercel Postgres stores migrated to Neon) | Marketplace integration available                                                                               |

Vercel has **no Mexico compute region** either. Functions default to `iad1`
(Washington, D.C.); nearest alternatives are `cle1`, `sfo1`, `pdx1`. Vercel's
guidance is to run functions in the same region as the database.

Sources: [Neon regions](https://neon.com/docs/introduction/regions) ·
[Neon pricing](https://neon.com/pricing) ·
[Supabase regions](https://supabase.com/docs/guides/platform/regions) ·
[Supabase pricing](https://supabase.com/pricing) ·
[Vercel regions](https://vercel.com/docs/regions) ·
[Vercel Postgres → Neon](https://neon.com/docs/guides/vercel-postgres-transition-guide) ·
[AWS Mexico (Central)](https://aws.amazon.com/blogs/aws/now-open-aws-mexico-central-region) ·
[Supabase Mexico region request](https://github.com/orgs/supabase/discussions/43522)

## 2. Evaluation

**Vercel compatibility.** Both work. Neon is Vercel's own Postgres path: one
integration, one invoice, preview-branch databases per deployment. Supabase
works over the same connection-pooled Postgres URL. _Edge: Neon._

**Relational order model.** Identical — both are Postgres. The schema in §3
uses only foreign keys, `UNIQUE` constraints, `CHECK` constraints and
`jsonb`. _Tie._

**Event and idempotency storage.** The property that matters — a provider
event id applied at most once — becomes a `UNIQUE (provider_event_id)`
constraint, enforced by the database rather than by application code, and
optimistic concurrency becomes `UPDATE … WHERE version = $1`. Both engines do
this identically. _Tie._

**Privacy and data location.** Neither vendor, and not Vercel, can keep data
in Mexico. Every option stores customer names, phones and addresses in the
United States (or Brazil). Mexico's new _Ley Federal de Protección de Datos
Personales en Posesión de los Particulares_ (DOF 20 March 2025) requires the
privacy notice to describe processing, and requires equivalent protection
guarantees for international transfers. **Whether using a US-hosted processor
is a transfer or a remission under the new law, and what the privacy notice
must say, is a question for counsel** — it is not a reason to prefer one vendor,
since both are in the same position. `us-east-1` is recommended over `sa-east-1`
for latency, not for legal reasons. _Tie; blocking for counsel._

Sources: [Garrigues on the 2025 LFPDPPP](https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce) ·
[Hogan Lovells](https://www.hlc.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies)

**Operational complexity.** NEOGEN needs a database and nothing else. Supabase
brings auth, storage, realtime and a dashboard NEOGEN would not use, and its
free tier **pauses after a week of inactivity** — an unattended shop in its
early weeks can plausibly go a week without an order. Neon's scale-to-zero
resumes on the next query instead. _Edge: Neon._

**Cost at low volume.** Neon Launch has no minimum; a quiet shop pays for the
compute it uses. Supabase Pro is $25/month before usage. Scale-to-zero has a
cost of its own: the first query after idle pays a cold start. That lands on a
customer's first checkout step or a provider webhook — tolerable for
checkout, and webhooks retry — but if it proves noticeable, disable
scale-to-zero on the production branch. _Edge: Neon at V1 volume._

## 3. Schema sketch

Mirrors the domain types exactly, so each adapter is a mapping, not a
redesign. Money is integer pesos, as in the domain.

```sql
create table orders (
  id              text primary key,                 -- NG-…
  version         integer not null default 1,        -- optimistic concurrency
  created_at      timestamptz not null,
  updated_at      timestamptz not null,
  payment_state   text not null check (payment_state in
                    ('created','pending_payment','payment_processing',
                     'paid','payment_failed','cancelled','refunded')),
  status          text not null,
  contact         jsonb not null,                   -- personal data
  shipping        jsonb not null,                   -- personal data
  delivery        jsonb not null,
  route           text not null,
  subtotal_mxn    integer not null,
  shipping_mxn    integer not null,
  total_mxn       integer not null,
  acknowledged    jsonb not null default '[]',      -- [{id, version, acceptedAt}]
  provider        text,
  provider_ref    text unique                       -- webhook → order join
);

create table order_lines (                          -- immutable snapshots
  order_id        text not null references orders(id),
  position        integer not null,
  variant_id      text not null,
  slug            text not null,
  name            text not null,
  presentation    text not null,
  unit_price_mxn  integer not null,
  quantity        integer not null check (quantity between 1 and 99),
  line_total_mxn  integer not null,
  primary key (order_id, position)
);

create table payment_attempts (
  order_id        text not null references orders(id),
  seq             integer not null,
  provider        text not null,
  at              timestamptz not null,
  outcome         text not null,
  provider_ref    text,
  error_code      text,
  primary key (order_id, seq)
);

create table order_events (                         -- append-only audit
  order_id          text not null references orders(id),
  seq               integer not null,
  at                timestamptz not null,
  kind              text not null,
  provider_event_id text unique,                    -- THE idempotency key
  from_state        text,
  to_state          text,
  note              text,
  primary key (order_id, seq)
);

create table checkout_drafts (                      -- short-lived
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null,
  expires_at  timestamptz not null                  -- purge job deletes past this
);

create table notification_outbox (
  id                  text primary key,             -- orderId:kind
  order_id            text not null references orders(id),
  kind                text not null,
  payload             jsonb not null,
  status              text not null check (status in ('pending','sent','failed')),
  attempts            integer not null default 0,
  last_error          text,
  provider_message_id text,
  updated_at          timestamptz not null
);
```

Two rules the adapter must keep:

1. **Create the order, its lines, the `created` event and its outbox rows in
   one transaction.** That is what makes "an order exists ⇒ its emails are
   owed" true by construction.
2. **Save = `UPDATE orders … WHERE id = $1 AND version = $2`.** Zero rows
   updated is `version_conflict`, which `mutate()` already retries.

## 4. What needs deciding

1. **Approve Neon** (or name another store) — owner.
2. **Privacy notice wording and the transfer question** — counsel, before any
   real order is stored.
3. **Retention** — how long orders and addresses are kept; drafts expire in
   hours, not days.
4. **Access** — who may read production order data, and from where.
