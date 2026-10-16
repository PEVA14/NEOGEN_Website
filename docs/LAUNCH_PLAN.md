# NEOGEN — Launch audit and plan

Written **2026-10-12**, at `3047100` plus the uncommitted "Rastrear mi pedido"
work (`PROJECT_STATE.md` §8bi). This is the authoritative list of what is left
before NEOGEN can take real orders, and the order to do it in. It supersedes
the ecommerce-readiness audit of 2026-10-07 (summarised in `PROJECT_STATE.md`
§8bj), which most of the work since then has answered.

**How to use it.** Part 1 says what is already done. Part 2 is the audit:
every open item, with an id, who owns it and what it waits on. Part 3 is the
plan: the steps in order, written for the owner to follow. Part 4 is the
launch-day checklist. When an item is done, mark it here **and** record the
work in `PROJECT_STATE.md`, as with every phase.

Nothing here is legal, tax or regulatory advice. Statements about processors
and Mexican regulation come from the repository's own research and need
re-verification by the owner's counsel.

---

## Part 1 — What is done

Built, committed, and validated by the owner on Vercel Preview (`staging`
branch, Neon `staging` database, Mercado Pago **sandbox**) unless marked
otherwise.

| Area                   | State                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront V1          | Frozen since 2026-10-06 (`CONVENTIONS.md` §20): catalogue, product pages, 3D flagships, Research, editorial, FAQ, bag.                                                                                    |
| Checkout               | Six steps, server repricing, the required research-use declaration saved with each order.                                                                                                                 |
| Mercado Pago (sandbox) | Approved, declined-then-retried, pending, refund and stock-hold paths walked on Preview and matched against Mercado Pago's own records (§8bf).                                                            |
| Database               | Neon: `staging` for Preview, `main` for Production, isolated. Migrations 001–003 applied to `staging` (003 on 2026-10-11).                                                                                |
| Operations console     | `/ops` deployed on Preview with operator accounts; redesigned 2026-10-09 (§8bg). Orders, fulfilment, manual shipments, inventory, refunds, notes, messages preview.                                       |
| Stuck payments         | Operator "Revisar con el procesador" button and a scheduled reconcile route (§8bf).                                                                                                                       |
| Security               | Shared rate limits (sign-in, card attempts, order placement, lookups, Atlas, reports), security headers, Content-Security-Policy **enforced** and reporting, verified with a Preview card payment (§8bh). |
| Customer order access  | Signed email links; signed ownership cookies (the forgeable cookie was fixed); "Rastrear mi pedido" by order number and email (§8bi).                                                                     |
| Secrets hygiene        | Repository and full history scanned 2026-10-07: no real credentials ever committed; `.env*` ignored, `.env.example` tracked (§8bj).                                                                       |

---

## Part 2 — The audit: what is left

Owner = Pablo. Claude = development in this repository. **Blocks launch**
means a real order should not be taken without it.

### A. The gate — whether money can flow at all

| Id  | Item                                                                                                                                                                                                                    | Owner         | Blocks launch | Waits on |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------- | -------- |
| A1  | **Classification review** with counsel (COFEPRIS-literate): can this catalogue be sold, marketed and shipped in Mexico, and on what terms? Include the product wording, the research-use framing and the label artwork. | Owner         | Yes           | —        |
| A2  | **Processor acceptance in writing.** Ask Mercado Pago (production onboarding: industry, website, terms) whether it accepts this catalogue. Its policy restricts medicamentos without registro sanitario.                | Owner         | Yes           | A1       |
| A3  | If Mercado Pago says no: choose the alternative (high-risk acquirer, SPEI or cash through a bank arrangement, or a narrowed catalogue) and Claude integrates it.                                                        | Owner, Claude | Yes           | A2       |

### B. Owner decisions and content

| Id  | Item                                                                                                                                                                                                                                                                                                   | Blocks launch                | Unblocks     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------ |
| B1  | **Legal texts** from counsel, in Spanish (and English if it ships): Terms (with the 18+ line), Aviso de Privacidad (including the international-transfer question: Neon has no Mexico region; data retention for addresses), shipping policy, returns and refunds policy. Each with its approval date. | Yes                          | D3           |
| B2  | **Shipping:** courier (or a written manual procedure), the rate for orders **under MX$10,000** (84 of 147 variants cannot be totalled today), and a determination on cold chain.                                                                                                                       | Yes                          | D1           |
| B3  | **Final prices** for all 147 variants (today's are provisional, derived from cost) and the accountant's confirmation that prices are shown IVA-included.                                                                                                                                               | Yes                          | D6           |
| B4  | **Stock:** counts per SKU, the made-to-order list (up to 14 days), and whether the storefront shows stock or "sold out". Until a SKU is counted it sells without limit.                                                                                                                                | Yes                          | D4, step 5.2 |
| B5  | **Label artwork** without injection, dosing, purity, lot or expiry placeholders. The draft strip is on `reta-v7.glb`, `glow-v4.glb`, `ghk-cu-v4.glb` and the Semaglutide, GLOW and GHK-Cu stills; `npm run check:media` lists every one.                                                               | Yes                          | D6           |
| B6  | **Email:** a transactional provider, a sending domain (SPF/DKIM), a support mailbox, and where operator alerts go (inbox or chat).                                                                                                                                                                     | Yes                          | D2           |
| B7  | **Domain:** confirm `neogen.mx`, where its DNS is managed, and HTTPS (Mercado Pago requires it in production).                                                                                                                                                                                         | Yes                          | C5           |
| B8  | **Who operates `/ops`**, their account names, and whether the console gets protection beyond its own sign-in on Production (it has no 2FA or password reset; Vercel's deployment protection covers whole deployments, not one path).                                                                   | Yes                          | C2, 5.1      |
| B9  | **Certificates:** may a supplier certificate be shown to the customer as received (issuing lab named), or only a redacted copy? And how a customer asks for documentation (the site says "available on request after purchase").                                                                       | Before first order that asks | D5           |
| B10 | **Refunds:** approve the refunds policy (part of B1); then live refunds need `OPS_LIVE_REFUNDS=enabled`.                                                                                                                                                                                               | Yes                          | C2           |
| B11 | **Language:** does English ship at launch? (Questionnaire answer: "Spanish only for now".)                                                                                                                                                                                                             | No                           | D13          |
| B12 | **Lots:** is a lot required before dispatch, are lot ids printed on labels, which lots are public? The lot registry is in code (`data/quality/lots.ts`).                                                                                                                                               | No                           | —            |
| B13 | **Invoicing (CFDI):** with the accountant, a PAC and SAT keys, or an interim policy for customers who ask for a factura (`INVOICING_READINESS.md`).                                                                                                                                                    | No                           | later        |
| B14 | **Error monitoring:** pick a tool (or accept Vercel's log search plus a daily look) for alerts on payment and persistence signals.                                                                                                                                                                     | Recommended                  | D9           |
| B15 | **Content gaps (not blocking):** the three unlabelled blends (Relaxation PM, SUPER Human Blend, Healthy Hair), 10 products without Simple Effects, flagship photography.                                                                                                                               | No                           | —            |

### C. Configuration (owner, in the Vercel, Neon and Mercado Pago dashboards)

| Id  | Item                                                                                                                                                                                                                                                                                                                                                                      | Blocks launch | Waits on   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------- |
| C1  | ✅ **Done 2026-10-15** (step 1.3). **Webhook test on Preview** (pending since 2026-10-09): Protection Bypass for Automation, the bypass in Mercado Pago's test webhook URL, "Simulate notification" (expect 200 `unknown_payment`), then a real `APRO` order shows "Pago: evento repetido" in `/ops`.                                                                     | Yes           | —          |
| C2  | **Production environment variables** (Production scope only, never shared with Preview): `DATABASE_URL` (Neon `main`, pooled), `ORDER_ACCESS_SECRET`, `OPS_ACCOUNTS`, `OPS_SESSION_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, the email provider's key, Mercado Pago **live** credentials and `MERCADOPAGO_MODE=live`, and last `NEXT_PUBLIC_COMMERCE_ENABLED=true`. | Yes           | A2, B6, B7 |
| C3  | **Migrate Neon `main`:** `npm run db:migrate` with its direct (unpooled) URL, entered hidden — the same command used for `staging`. Also re-run it once on `staging` so that database starts recording its migrations (it was migrated before tracking existed; the re-run is safe).                                                                                      | Yes           | —          |
| C4  | **Production webhook** in Mercado Pago's production tab: `https://<domain>/api/payments/webhook` (no bypass parameter), Order topic, and its own secret in `MERCADOPAGO_WEBHOOK_SECRET`.                                                                                                                                                                                  | Yes           | A2, C5     |
| C5  | **Domain in Vercel** with HTTPS; `NEXT_PUBLIC_SITE_URL=https://neogen.mx`; redeploy.                                                                                                                                                                                                                                                                                      | Yes           | B7         |
| C6  | **Backups:** confirm Neon's restore window on the chosen plan.                                                                                                                                                                                                                                                                                                            | Yes           | —          |
| C7  | **Scheduled reconcile on Production:** the job is already in `vercel.json` (daily, 14:00 UTC — the most Hobby allows) and runs only on Production; it stays closed until `CRON_SECRET` (32+ characters) is set there (`OPERATIONS.md` §9a).                                                                                                                               | Recommended   | C2         |
| C8  | Optional: `sslmode=verify-full` in the Neon URLs (silences the `pg` driver's deprecation warning, keeps today's behaviour).                                                                                                                                                                                                                                               | No            | —          |
| C9  | **Uptime monitor** on `https://<domain>/api/health` (any free monitor): 200 means serving with the database answering; 503 means the database is unreachable. Its `schema` field should name the newest file in `db/migrations`.                                                                                                                                          | Recommended   | C5         |

### D. Development (Claude)

| Id  | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Blocks launch                | Waits on |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- |
| D1  | **Shipping rate model** replacing "no price below MX$10,000", plus courier booking (API or the written manual procedure).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Yes                          | B2       |
| D2  | **Email channel adapter** for the chosen provider; **operator alerts** for "new paid order" and "dispute"; retry behaviour for failed sends. The outbox and templates exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Yes                          | B6       |
| D3  | **Policy pages** rendered from approved texts, linked from the footer and checkout; the Terms and 18+ acknowledgements wired into review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Yes                          | B1       |
| D4  | **Stock on the storefront:** show availability or "sold out" for counted SKUs, per the owner's choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Yes                          | B4       |
| D5  | **Order certificates:** an order-level record (migration 004), "attach certificate" per line in `/ops` (PDF only, size and content checks, allowed after dispatch, a three-point operator checklist), a customer download from the status page, gated by ownership and payment state.                                                                                                                                                                                                                                                                                                                                                           | Before first order that asks | B9       |
| D6  | **Final prices and label artwork** loaded and baked; `check:media` clean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Yes                          | B3, B5   |
| D7  | ✅ **Done 2026-10-13** (row locked before the idempotency check; source guard in `check:operations`). **Inventory adjust double-apply:** the Postgres adapter checks a movement id before taking the row lock, so two overlapping submits of the same stock form could both apply. Move the check inside the lock.                                                                                                                                                                                                                                                                                                                              | Yes (small)                  | —        |
| D8  | 🟡 **2026-10-13:** checklist read through the Mercado Pago MCP; `NEOGEN` statement descriptor added. **Owner decision: no order or customer details are sent** (items, names, phone, address, device id), even where the checklist asks — see `PAYMENTS.md` §7. Left: Mercado Pago's automatic evaluation on a fresh sandbox order, to see whether the omissions block go-live. **Mercado Pago go-live quality:** run Mercado Pago's quality checklist; the charge sends amount, reference, payer email and card token only (no items, no device id). Add what is required; build a 3-D Secure challenge screen if their risk rules ask for it. | Yes                          | A2       |
| D9  | **Alerts** on the existing signals (`payment.not_persisted`, `payment.webhook_unsettled`, `security.rate_limit_unavailable`, provider errors), to the tool from B14.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Recommended                  | B14      |
| D10 | ✅ **Done 2026-10-13** (`GET /api/health`). **Health check** route for uptime monitoring (database reachable, payment configured), returning no secrets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Recommended                  | —        |
| D11 | ✅ **Done 2026-10-13** (`neogen_schema_migrations`; `db:migrate` prefers `DATABASE_URL_UNPOOLED`). **Migrations:** a tracking table before the first non-idempotent migration (D5's is the first likely one), and `db:migrate` preferring `DATABASE_URL_UNPOOLED`.                                                                                                                                                                                                                                                                                                                                                                              | Yes (before D5)              | —        |
| D12 | **Stock held by abandoned payments:** an attempt still "processing" at Mercado Pago keeps its hold until it resolves. Decide an expiry and release rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Recommended                  | —        |
| D13 | **English locale:** hide it if B11 says Spanish only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No                           | B11      |
| D14 | **Data retention** job for addresses, per the privacy notice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | After launch                 | B1       |
| D15 | **Payment route change** if Mercado Pago declines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Yes, if needed               | A3       |

### E. Testing and drills

| Id  | Item                                                                                                                                                                                                     | Owner         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| E1  | ✅ **Done 2026-10-15.** Webhook end to end on Preview (C1).                                                                                                                                              | Owner         |
| E2  | **Full rehearsal on Preview** once D1–D4 and D7 are in: decline, pending, approved, duplicate webhook, cancel with refund, a shipment to delivered, emails received, the lookup page, an operator alert. | Claude, owner |
| E3  | **Restore drill:** restore Neon `staging` from its history to a branch and confirm orders read back.                                                                                                     | Owner, Claude |
| E4  | **First real order:** a low-value live order end to end (payment, order, stock, email, shipment, tracking), then a live refund.                                                                          | Owner         |

### F. After launch (not needed for the first orders)

Customer accounts and saved cards; meses sin intereses; SPEI and OXXO;
partial refunds; carrier API with labels (manual works at low volume); CFDI
automation; stock by lot and warehouse locations; photography beyond the
flagship stills; analytics with a consent banner; Atlas (frozen for V2); the
`DEFERRED_POLISH.md` items.

---

## Part 3 — The plan

Five stages. Inside a stage the steps can run in parallel unless one names
another. **Never paste a secret, password or connection string into a chat**:
enter them in the dashboards, or in your terminal with the hidden prompts
Claude gives you. After each step, tell Claude what is done and what it
decided, so it can mark this file.

### Stage 1 — Start the long-lead items (this week)

1.1 **Book counsel** for the classification review (A1). Bring: the catalogue
export, product page wording, the research-use declaration, and the label
artwork. Ask for the legal texts (B1) in the same engagement.
_Done when_ counsel has the material and a date.

1.2 **Ask Mercado Pago** about production onboarding for this catalogue (A2).
Get the answer in writing. If counsel advises waiting for A1, start with an
informal question to your account contact.
_Done when_ you have a written yes or no (or a date for one).

1.3 ✅ **Webhook test on Preview** (C1, E1) — **done 2026-10-15**. How it
works on staging, for a re-run:

1. Vercel → Settings → Deployment Protection → **Protection Bypass for
   Automation** gives a bypass secret (rotate it after testing: it sits in
   Mercado Pago's panel in plain text).
2. **Test credentials belong to a test account Mercado Pago creates for the
   app** (here application `739441805860620`, not NEOGEN's
   `2107697494236035`). Its orders are signed by that account, so the webhook
   is configured **signed in as the test account** (its username and password
   are under NEOGEN → Credenciales de prueba), in its **Modo productivo** tab:
   the Preview URL with `?x-vercel-protection-bypass=<secret>`, topic
   **Order**. That account's secret is Preview's
   `MERCADOPAGO_WEBHOOK_SECRET`. (NEOGEN's own "Simular notificación" then
   answers 401 on Preview — expected; production uses NEOGEN's secret, C4.)
3. Place an `APRO` order (MX$10,000 or more while D1 is open). Healthy: the
   test account's webhook log shows **200**. The order's history does not
   change: the card answer already recorded that payment state, and the
   notification is recognised as the same fact before the order is loaded
   (`server/payments.ts`). Nothing in the history is the expected result.
4. A simulated notification (id `123456`) answers 200 `unknown_payment`.

1.4 **Choose the email provider** and set up the sending domain and support
mailbox (B6). Decide where "new paid order" alerts go.
_Tell Claude_: the provider's name, the sender address, and the alert
destination. Put the API key in Vercel → Preview only, for now.

1.5 **Confirm the domain** (B7): who holds `neogen.mx` and where DNS lives.

Meanwhile **Claude does D7, D10 and D11**: they need no decision (✅ done
2026-10-13). Say "do the
ready items" to start them.

### Stage 2 — Decide the commerce facts (next two weeks)

2.1 **Shipping** (B2): pick the courier or a manual booking routine; write the
rate for orders under MX$10,000 (flat, by zone, or by weight, with numbers);
state the cold-chain answer.
_Tell Claude_: the rate table and courier. Claude builds D1.

2.2 **Prices** (B3): send the final price list (by SKU) and the accountant's
IVA confirmation. Claude loads it (D6).

2.3 **Stock policy** (B4): decide whether the storefront shows stock or only
"sold out", and list made-to-order SKUs. Claude builds D4. (Counts come in
Stage 4.)

2.4 **Certificates** (B9): decide "as received" or "redacted copy", and how
customers request documents. Claude builds D5 after D11.

2.5 **Operators** (B8): who, their account names, and the extra protection for
`/ops` on Production.

2.6 **Language** (B11) and **lots** (B12): one answer each. Not blocking.

2.7 **Label artwork** (B5): commission or approve the final label; send the
file. Claude re-letters and bakes it per product (D6).

As decisions arrive, **Claude builds D1–D6 on `staging`**, each as its own
commit, and you test each on Preview.

### Stage 3 — Rehearse on Preview (after Stage 2's builds)

3.1 **Claude runs the rehearsal** (E2) and writes up the results; you place
the orders it asks for with Mercado Pago's test cards and confirm the emails
arrive.

3.2 **Restore drill** (E3) on Neon `staging`.

3.3 **Legal texts approved** (B1, B10): Claude renders them (D3); you check
every page and the checkout links on Preview.

_Done when_ a sandbox order goes from the catalogue to delivered, with the
customer email, the operator alert and the tracking page, with no manual
help beyond the operator's own steps.

### Stage 4 — Prepare Production (after A1 and A2 say yes)

4.1 **Mercado Pago production:** activate production credentials (industry,
website, terms — your act); configure the production webhook (C4). Claude
completes D8 against their checklist.

4.2 **Neon `main`:** run the migration (C3) with the hidden-prompt command;
confirm the restore window (C6).

4.3 **Vercel Production variables** (C2), Production scope only. Leave
`NEXT_PUBLIC_COMMERCE_ENABLED` **off** for now. Generate fresh secrets — never
reuse Preview's.

4.4 **Domain** (C5): attach it, HTTPS on, `NEXT_PUBLIC_SITE_URL` set,
redeploy `main`.

4.5 **Merge `staging` into `main`** (your push) once Preview is green, and
confirm the Production build passes.

4.6 **Cron** (C7) and **alerts** (D9).

### Stage 5 — Go live

5.1 **Operator accounts** on Production; each operator signs in once.

5.2 **Count stock** for every SKU you will sell, in `/ops/inventario`, before
the first order (counts are best entered before orders exist).

5.3 **Switch commerce on** (`NEXT_PUBLIC_COMMERCE_ENABLED=true`, redeploy).

5.4 **First real order** (E4): a low-value order to yourself, end to end, then
a live refund (after `OPS_LIVE_REFUNDS=enabled`).

5.5 **Soft launch** to a small audience; read `/ops` and the logs daily for a
week. Anything odd goes to Claude with the order number.

---

## Part 4 — Launch-day checklist

- [ ] Written answer from counsel (A1) and from the processor (A2)
- [ ] Terms, Aviso de Privacidad, shipping and returns policies approved, live and linked at checkout (B1, D3)
- [ ] Shipping price for every order size, and a courier or written procedure (B2, D1)
- [ ] Final prices loaded, IVA display confirmed (B3, D6)
- [ ] Draft label artwork gone from every model and still; `check:media` clean (B5, D6)
- [ ] Email provider live: customer confirmation and operator alert received (B6, D2)
- [ ] Domain on HTTPS, `NEXT_PUBLIC_SITE_URL` set (B7, C5)
- [ ] Neon `main` migrated, restore window confirmed, restore drill done (C3, C6, E3)
- [ ] Production variables set in Production scope only, fresh secrets (C2)
- [ ] Production webhook delivering, its own secret (C4)
- [ ] Mercado Pago quality checklist passed (D8)
- [ ] Inventory double-apply fixed (D7); stock counted for every SKU on sale (5.2)
- [ ] Operators named, signed in, `/ops` protection decided (B8)
- [ ] Refunds policy approved; one live refund done (B10, E4)
- [ ] One real low-value order reconciled end to end (E4)

---

## Keeping this current

Mark items here as they close (✅ and the date), and keep the detail in
`PROJECT_STATE.md`. A new blocker found in testing gets the next free id in
its section, never a renumbering, so references in conversation stay valid.
