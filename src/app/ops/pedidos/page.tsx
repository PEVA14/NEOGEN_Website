import Link from "next/link";

import { isOrderView, shipmentSummary } from "@/domain/order";
import { requireOperator } from "@/server/ops/auth";
import { orderRepository } from "@/server/persistence";

import { age, dateTime, money, OPS } from "../copy";
import {
  firstAttention,
  FULFILMENT_TONE,
  itemsSummary,
  NEXT_TONE,
  nextStep,
  PAYMENT_TONE,
  SHIPMENT_TONE,
} from "../lifecycle";
import styles from "../ops.module.css";
import { Flash, Shell } from "../Shell";
import { Count, EmptyState, PageHeader, State } from "../ui";

import type { OrderView } from "@/domain/order";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos" };

/*
 * The views, grouped by what an operator DOES with them: look at what needs a
 * person, work the queue in the order an order moves through it, watch what is
 * on its way, and keep the records. The views and their counts are exactly the
 * domain's (`domain/order/attention.ts`); only their arrangement is new.
 */
const GROUPS: readonly { id: keyof typeof OPS.viewGroups; views: readonly OrderView[] }[] = [
  { id: "attention", views: ["attention"] },
  { id: "work", views: ["to_fulfil", "preparing", "ready_to_ship"] },
  { id: "transit", views: ["in_transit"] },
  { id: "done", views: ["delivered"] },
  { id: "records", views: ["awaiting_payment", "disputed", "refunded", "cancelled"] },
];

/**
 * THE ORDER LIST — what needs a person, then the work, newest first.
 *
 * The default view is "needs attention" when anything does, otherwise "to
 * prepare" (unchanged). Search takes an order number (prefix) or a customer's
 * exact email — what an operator is given on the phone. Each row says, in
 * words, why it needs attention or what its next step is, so the list can be
 * read without opening every order.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; q?: string; error?: string }>;
}) {
  const operator = await requireOperator();
  const { vista, q, error } = await searchParams;
  const now = new Date().toISOString();
  const repository = orderRepository();
  const counts = await repository.counts(now);
  const view: OrderView = isOrderView(vista)
    ? vista
    : counts.attention > 0
      ? "attention"
      : "to_fulfil";
  const search = (q ?? "").trim().slice(0, 120);
  const { orders, truncated } = await repository.list({ view, search, limit: 100, now });
  const nowMs = Date.parse(now);

  const href = (v: OrderView) => {
    const params = new URLSearchParams({ vista: v });
    if (search) params.set("q", search);
    return `/ops/pedidos?${params}`;
  };

  return (
    <Shell current="orders" operator={operator}>
      <PageHeader title="Pedidos" description={OPS.pages.orders} />

      <Flash error={error} />

      {/* ---- views: grouped on a wide screen ------------------------------ */}
      <nav aria-label="Vistas de pedidos" className={styles.viewNav}>
        {GROUPS.map((g) => (
          <div key={g.id} className={styles.viewGroup} data-group={g.id}>
            <span className={styles.viewGroupLabel}>{OPS.viewGroups[g.id]}</span>
            <ul className={styles.viewList}>
              {g.views.map((v) => (
                <li key={v}>
                  <Link
                    href={href(v)}
                    className={styles.viewLink}
                    aria-current={v === view ? "page" : undefined}
                    data-alert={v === "attention" && counts.attention > 0 ? "true" : undefined}
                  >
                    {OPS.views[v]}
                    <Count n={counts[v]} alert={v === "attention"} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className={styles.viewGroup} data-group="all">
          <span className={styles.viewGroupLabel}>&nbsp;</span>
          <ul className={styles.viewList}>
            <li>
              <Link
                href={href("all")}
                className={styles.viewLink}
                aria-current={view === "all" ? "page" : undefined}
              >
                {OPS.views.all}
                <Count n={counts.all} />
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ---- views on a phone: one selector, plus attention when it matters - */}
      <div className={styles.viewSwitch}>
        {counts.attention > 0 && view !== "attention" ? (
          <Link href={href("attention")} className={styles.attentionLink}>
            <span className={styles.stateDot} data-tone="bad" aria-hidden="true" />
            {counts.attention} {counts.attention === 1 ? "pedido requiere" : "pedidos requieren"}{" "}
            atención
          </Link>
        ) : null}
        <form action="/ops/pedidos" className={styles.viewSwitchForm}>
          {search ? <input type="hidden" name="q" value={search} /> : null}
          <label htmlFor="vista" className={styles.labelText}>
            Vista
          </label>
          <select id="vista" name="vista" defaultValue={view} className={styles.select}>
            {GROUPS.map((g) => (
              <optgroup key={g.id} label={OPS.viewGroups[g.id]}>
                {g.views.map((v) => (
                  <option key={v} value={v}>
                    {OPS.views[v]} ({counts[v]})
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="all">
              {OPS.views.all} ({counts.all})
            </option>
          </select>
          <button type="submit" className={styles.button} data-variant="quiet">
            Ver
          </button>
        </form>
      </div>

      <div className={styles.listHead}>
        <h2 className={styles.listTitle}>
          {OPS.views[view]} <span className={styles.listCount}>{counts[view]}</span>
        </h2>
        <form className={styles.search} role="search" action="/ops/pedidos">
          <input type="hidden" name="vista" value={view} />
          <label className="sr-only" htmlFor="q">
            Buscar por número de pedido o correo exacto del cliente
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            className={styles.input}
            placeholder="Número NG-… o correo del cliente"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className={styles.button}>
            Buscar
          </button>
          {search ? (
            <Link href={href(view)} className={styles.button} data-variant="quiet">
              Limpiar
            </Link>
          ) : null}
        </form>
      </div>

      {orders.length === 0 ? (
        search ? (
          <EmptyState
            title={`Ningún pedido en «${OPS.views[view]}» coincide con «${search}».`}
            action={
              view !== "all" ? (
                <Link href={href("all")} className={styles.button} data-variant="quiet">
                  Buscar en todos los pedidos
                </Link>
              ) : null
            }
          >
            La búsqueda acepta el inicio del número de pedido (NG-…) o el correo exacto del cliente.
          </EmptyState>
        ) : (
          <EmptyState title={OPS.viewEmpty[view]} />
        )
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Lista de pedidos">
          <table className={`${styles.table} ${styles.orderTable}`}>
            <caption className="sr-only">
              {OPS.views[view]}: {orders.length} pedidos
            </caption>
            <thead>
              <tr>
                <th scope="col">Pedido</th>
                <th scope="col">Recibido</th>
                <th scope="col">Pago</th>
                <th scope="col">Preparación</th>
                <th scope="col">Envío</th>
                <th scope="col" className={styles.num}>
                  Total
                </th>
                <th scope="col">Siguiente paso</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const reason = firstAttention(o, now);
                const step = nextStep(o, now);
                const ship = shipmentSummary(o);
                return (
                  <tr key={o.id} data-attention={reason ? "true" : undefined}>
                    <td data-cell="id">
                      <Link href={`/ops/pedidos/${o.id}`} className={styles.rowLink}>
                        {o.id}
                      </Link>
                      <span className={styles.rowName}>{o.contact.name}</span>
                      <span className={styles.rowMeta}>
                        {o.shipping.city}, {o.shipping.state} · {itemsSummary(o)}
                      </span>
                    </td>
                    <td data-cell="age">
                      <span title={dateTime.format(new Date(o.createdAt))}>
                        {age(o.createdAt, nowMs)}
                      </span>
                    </td>
                    <td data-cell="pay">
                      <State tone={PAYMENT_TONE[o.state]} label="Pago">
                        {OPS.payment[o.state]}
                      </State>
                    </td>
                    <td data-cell="ful">
                      <State tone={FULFILMENT_TONE[o.fulfilment.state]} label="Preparación">
                        {OPS.fulfilment[o.fulfilment.state]}
                      </State>
                    </td>
                    <td data-cell="ship">
                      <State tone={SHIPMENT_TONE[ship]} label="Envío">
                        {OPS.shipment[ship]}
                      </State>
                    </td>
                    <td data-cell="total" className={styles.num}>
                      {money(o.totals.total.amount)}
                    </td>
                    <td data-cell="next">
                      {reason ? (
                        <State tone="bad" strong>
                          <span className="sr-only">Requiere atención: </span>
                          {OPS.attentionShort[reason]}
                        </State>
                      ) : (
                        <span className={styles.nextCell} data-kind={step.kind}>
                          <span className="sr-only">Siguiente paso: </span>
                          {step.kind === "act" ? (
                            <span className={styles.nextArrow} aria-hidden="true">
                              →
                            </span>
                          ) : (
                            <span
                              className={styles.stateDot}
                              data-tone={NEXT_TONE[step.kind]}
                              aria-hidden="true"
                            />
                          )}
                          {step.short}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {truncated ? (
        <p className={styles.hint}>Se muestran los 100 más recientes. Usa la búsqueda.</p>
      ) : null}
    </Shell>
  );
}
