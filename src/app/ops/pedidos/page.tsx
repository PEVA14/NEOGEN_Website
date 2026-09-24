import Link from "next/link";

import { attentionReasons, isOrderView, ORDER_VIEWS, shipmentSummary } from "@/domain/order";
import { requireOperator } from "@/server/ops/auth";
import { orderRepository, storageKind } from "@/server/persistence";

import { age, dateTime, money, OPS } from "../copy";
import styles from "../ops.module.css";
import { AxisChip, Flash, Shell } from "../Shell";

import type { OrderView } from "@/domain/order";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos" };

/**
 * THE ORDER LIST — what needs doing, newest first.
 *
 * Tabs are views over the three axes (`domain/order/attention.ts`), counted by
 * the same predicates that filter the list. The default is "needs attention"
 * when anything does, otherwise "to prepare". Search takes an order number
 * (prefix) or a customer's exact email — what an operator is given on the
 * phone. Nothing on this page is invented to fill it: an empty view says so.
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
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            {storageKind() === "memory"
              ? "Almacenamiento en memoria — solo desarrollo; se pierde al reiniciar"
              : "Pedidos"}
          </p>
          <h1 className={styles.title}>{OPS.views[view]}</h1>
        </div>
      </div>

      <Flash error={error} />

      <nav aria-label="Vistas">
        <ul className={styles.tabs}>
          {ORDER_VIEWS.map((v) => (
            <li key={v}>
              <Link
                href={href(v)}
                className={styles.tab}
                aria-current={v === view ? "page" : undefined}
                data-alert={v === "attention" && counts.attention > 0 ? "true" : undefined}
              >
                {OPS.views[v]}
                <span className={styles.count}>{counts[v]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className={styles.search} role="search" action="/ops/pedidos">
        <input type="hidden" name="vista" value={view} />
        <label className="sr-only" htmlFor="q">
          Buscar por número de pedido o correo exacto
        </label>
        <input
          id="q"
          name="q"
          defaultValue={search}
          className={styles.input}
          placeholder="NG-… o correo del cliente"
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

      {orders.length === 0 ? (
        <p className={styles.empty}>
          {search
            ? `Ningún pedido en «${OPS.views[view]}» coincide con «${search}».`
            : `No hay pedidos en «${OPS.views[view]}».`}
        </p>
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Lista de pedidos">
          <table className={styles.table}>
            <caption className="sr-only">
              {OPS.views[view]}: {orders.length} pedidos
            </caption>
            <thead>
              <tr>
                <th scope="col">Pedido</th>
                <th scope="col">Recibido</th>
                <th scope="col">Cliente</th>
                <th scope="col">Destino</th>
                <th scope="col">Artículos</th>
                <th scope="col" className={styles.num}>
                  Total
                </th>
                <th scope="col">Pago</th>
                <th scope="col">Preparación</th>
                <th scope="col">Envío</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const units = o.lines.reduce((n, l) => n + l.quantity, 0);
                const attention = attentionReasons(o, now).length > 0;
                return (
                  <tr key={o.id}>
                    <td>
                      {attention ? (
                        <span
                          className={styles.attentionDot}
                          role="img"
                          aria-label="Requiere atención"
                        />
                      ) : null}
                      <Link href={`/ops/pedidos/${o.id}`} className={styles.rowLink}>
                        {o.id}
                      </Link>
                    </td>
                    <td>
                      <span title={dateTime.format(new Date(o.createdAt))}>
                        {age(o.createdAt, nowMs)}
                      </span>
                    </td>
                    <td>{o.contact.name}</td>
                    <td>
                      {o.shipping.city}, {o.shipping.state}
                      <br />
                      <span className={`${styles.mono} ${styles.muted}`}>
                        {o.route === "priority" ? "prioritaria" : "nacional"}
                      </span>
                    </td>
                    <td>
                      <span className={styles.mono}>
                        {units} u · {o.lines.length} SKU
                      </span>
                      <br />
                      <span className={`${styles.mono} ${styles.muted}`}>
                        {o.lines
                          .slice(0, 2)
                          .map((l) => `${l.variantId}×${l.quantity}`)
                          .join(", ")}
                        {o.lines.length > 2 ? "…" : ""}
                      </span>
                    </td>
                    <td className={styles.num}>{money(o.totals.total.amount)}</td>
                    <td>
                      <AxisChip axis="payment" state={o.state} />
                    </td>
                    <td>
                      <AxisChip axis="fulfilment" state={o.fulfilment.state} />
                    </td>
                    <td>
                      <AxisChip axis="shipment" state={shipmentSummary(o)} />
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
