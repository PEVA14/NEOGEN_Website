import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAddress, formatPhoneDisplay } from "@/domain/checkout";
import {
  ACKNOWLEDGEABLE,
  activeShipment,
  attentionReasons,
  FULFILMENT_TRANSITIONS,
  lastDecline,
  openRefund,
  SHIPMENT_TRANSITIONS,
  shipmentSummary,
} from "@/domain/order";
import { isOrderId } from "@/payments/instrument";
import { providerById } from "@/payments";
import {
  ackAction,
  advanceAction,
  assignLotAction,
  cancelAction,
  externalRefAction,
  holdAction,
  noteAction,
  recordShipmentAction,
  requestRefundAction,
  resumeAction,
  shipmentStateAction,
  submitRefundAction,
  trackingAction,
  unassignLotAction,
} from "@/server/ops/actions";
import { requireOperator } from "@/server/ops/auth";
import { lotsFor } from "@/server/orders";
import { inventoryStore, notificationOutbox, orderRepository } from "@/server/persistence";

import { age, dateTime, money, OPS } from "../../copy";
import styles from "../../ops.module.css";
import { AxisChip, Flash, Shell } from "../../Shell";

import type { EventState, Order, OrderEvent, ShipmentState } from "@/domain/order";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: isOrderId(id) ? id : "Pedido" };
}

const SHIPMENT_ACTIONS: Partial<Record<ShipmentState, string>> = {
  in_transit: "En tránsito (la paquetería lo tiene)",
  exception: "Registrar incidencia",
  delivered: "Entregado",
  returned: "Devuelto a NEOGEN",
  cancelled: "Cancelar reserva",
};

function stateLabel(event: OrderEvent, state: EventState | null): string {
  /* "Pedido creado" already says it; the stored `to: created` adds nothing. */
  if (state === null || event.kind === "created") return "";
  const axis =
    event.axis ??
    (event.kind.startsWith("payment") || event.kind === "status_changed" ? "payment" : "order");
  const table: Record<string, Record<string, string>> = {
    payment: OPS.payment,
    fulfilment: OPS.fulfilment,
    shipment: OPS.shipment,
    refund: OPS.refund,
  };
  return table[axis]?.[state] ?? state;
}

function Panel({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={styles.panel} aria-labelledby={`${id}-title`}>
      <header className={styles.panelHead}>
        <h2 id={`${id}-title`} className={styles.panelTitle}>
          {title}
        </h2>
        {aside}
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function Hidden({ order }: { order: Order }) {
  return <input type="hidden" name="orderId" value={order.id} />;
}

/**
 * THE NEXT STEP — the one action this order most likely needs, and where it
 * stands if nothing is for NEOGEN to do. Every button here posts to the same
 * server action its section uses; the section below still has the rest.
 */
function NextStep({ order, flagged }: { order: Order; flagged: boolean }) {
  const f = order.fulfilment.state;
  const paid = order.state === "paid";
  const active = activeShipment(order);
  const refund = openRefund(order);

  let label = "Siguiente paso";
  let title: string;
  let action: React.ReactNode = null;
  let tone: "act" | "wait" = "act";

  const post = (
    act: (form: FormData) => Promise<void>,
    text: string,
    fields: Record<string, string> = {},
  ) => (
    <form action={act}>
      <Hidden order={order} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={styles.button}>
        {text}
      </button>
    </form>
  );
  const jump = (href: string, text: string) => (
    <a href={href} className={styles.button}>
      {text}
    </a>
  );

  if (refund && (refund.status === "requested" || refund.status === "failed")) {
    title = `Reembolso de ${money(refund.amount.amount)} por enviar al procesador.`;
    action = jump("#pago", "Ir al reembolso");
  } else if (refund && refund.status === "submitted") {
    title = "Reembolso enviado; espera la confirmación del procesador.";
    tone = "wait";
  } else if (order.state === "disputed") {
    title = "Cargo en disputa. La preparación está detenida hasta que el banco resuelva.";
    tone = "wait";
  } else if (!paid && f !== "cancelled") {
    title =
      order.state === "payment_processing" || order.state === "pending_payment"
        ? "El procesador está resolviendo el pago."
        : "El cliente aún no paga. No hay nada que preparar.";
    tone = "wait";
  } else if (f === "on_hold") {
    title = `En espera: ${order.fulfilment.hold ? OPS.holdReasons[order.fulfilment.hold.reason] : ""}.`;
    action = post(resumeAction, "Reanudar");
  } else if (f === "queued") {
    title = "Pagado y en cola. Empieza a prepararlo.";
    action = post(advanceAction, "Iniciar preparación", { to: "preparing" });
  } else if (f === "preparing") {
    title = "En preparación. Márcalo cuando esté empacado.";
    action = post(advanceAction, "Listo para envío", { to: "ready_to_ship" });
  } else if (f === "ready_to_ship" && (!active || active.state === "returned")) {
    title = "Empacado. Registra el envío que contrataste.";
    action = jump("#envio", "Registrar envío");
  } else if (active?.state === "pending") {
    title = "Envío reservado. Despáchalo cuando la paquetería lo recoja.";
    action = post(shipmentStateAction, "Despachar", { shipmentId: active.id, to: "in_transit" });
  } else if (active?.state === "in_transit" || active?.state === "exception") {
    title =
      active.state === "exception"
        ? "La paquetería reportó una incidencia."
        : "En tránsito. Márcalo cuando la paquetería confirme la entrega.";
    action = post(shipmentStateAction, "Marcar entregado", {
      shipmentId: active.id,
      to: "delivered",
    });
  } else {
    label = "Estado";
    title =
      active?.state === "delivered"
        ? "Entregado. Nada pendiente."
        : f === "cancelled"
          ? "Cancelado. Nada pendiente."
          : "Nada pendiente.";
    tone = "wait";
  }

  /* Nothing to do, and the attention list above already says why: the line
     would only repeat it. */
  if (tone === "wait" && flagged && !action) return null;

  return (
    <div className={`${styles.next} ${styles.noPrint}`} data-tone={tone}>
      <div className={styles.nextText}>
        <span className={styles.nextLabel}>{label}</span>
        <p className={styles.nextTitle}>{title}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * ONE ORDER — its lifecycle made obvious.
 *
 * The three axes sit side by side at the top; anything that needs a person is
 * listed under them in words. Every section offers only the actions that are
 * legal from where the order is now — and the server refuses anything else
 * regardless (`server/ops/actions.ts`). The history at the bottom is the
 * order's own audit trail: every provider answer, every operator action, every
 * refusal.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const operator = await requireOperator();
  const { id } = await params;
  const { ok, error } = await searchParams;
  if (!isOrderId(id)) notFound();
  const order = await orderRepository().get(id);
  if (!order) notFound();

  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const [holds, messages] = await Promise.all([
    inventoryStore().holds(order.id),
    notificationOutbox().forOrder(order.id),
  ]);
  const reasons = attentionReasons(order, now);
  const f = order.fulfilment.state;
  const paid = order.state === "paid";
  const active = activeShipment(order);
  const refund = openRefund(order);
  const provider = providerById(order.provider);
  const decline = lastDecline(order);
  const dispatched =
    f === "fulfilled" ||
    (active !== null && active.state !== "pending" && active.state !== "returned");
  const cancellable =
    f !== "cancelled" && !order.cancellation && !dispatched && order.state !== "payment_processing";
  const units = order.lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <Shell current="orders" operator={operator}>
      <p className={`${styles.hint} ${styles.noPrint}`}>
        <Link href="/ops/pedidos" className={styles.rowLink}>
          ← Pedidos
        </Link>
      </p>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            Pedido · {dateTime.format(new Date(order.createdAt))} · {age(order.createdAt, nowMs)}
          </p>
          <h1 className={styles.reference}>{order.id}</h1>
        </div>
        <div className={styles.actions}>
          <Link
            href={`/ops/pedidos/${order.id}/empaque`}
            className={styles.button}
            data-variant="quiet"
          >
            Hoja de empaque
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <div className={styles.axes}>
        <div className={styles.axis}>
          <span className={styles.labelText}>Pago</span>
          <p className={styles.axisValue}>{OPS.payment[order.state]}</p>
          {order.milestones.paid ? (
            <span className={styles.eventMeta}>
              {dateTime.format(new Date(order.milestones.paid))}
            </span>
          ) : null}
        </div>
        <div className={styles.axis}>
          <span className={styles.labelText}>Preparación</span>
          <p className={styles.axisValue}>{OPS.fulfilment[f]}</p>
          {order.fulfilment.hold ? (
            <span className={styles.eventMeta}>
              {OPS.holdReasons[order.fulfilment.hold.reason]}
            </span>
          ) : null}
        </div>
        <div className={styles.axis}>
          <span className={styles.labelText}>Envío</span>
          <p className={styles.axisValue}>{OPS.shipment[shipmentSummary(order)]}</p>
          {active?.trackingNumber ? (
            <span className={styles.eventMeta}>{active.trackingNumber}</span>
          ) : null}
        </div>
        <div className={styles.axis}>
          <span className={styles.labelText}>Total</span>
          <p className={styles.axisValue}>{money(order.totals.total.amount)}</p>
          <span className={styles.eventMeta}>
            {units} u · {order.lines.length} SKU
          </span>
        </div>
      </div>

      {reasons.length > 0 ? (
        <ul className={styles.attention} aria-label="Requiere atención">
          {reasons.map((r) => (
            <li key={r}>
              <span>
                <span className={styles.attentionDot} aria-hidden="true" />
                {OPS.attention[r]}
              </span>
              {ACKNOWLEDGEABLE.includes(r) ? (
                <form action={ackAction}>
                  <Hidden order={order} />
                  <input type="hidden" name="reason" value={r} />
                  <button type="submit" className={styles.button} data-variant="quiet">
                    Marcar revisado
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <NextStep order={order} flagged={reasons.length > 0} />

      <div className={styles.detail}>
        <div className={styles.column}>
          {/* ---------------------------------------------------- items */}
          <Panel id="articulos" title="Artículos">
            <div
              className={styles.tableWrap}
              tabIndex={0}
              role="region"
              aria-label="Artículos del pedido"
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col">Producto</th>
                    <th scope="col" className={styles.num}>
                      Cant.
                    </th>
                    <th scope="col" className={styles.num}>
                      Unitario
                    </th>
                    <th scope="col" className={styles.num}>
                      Importe
                    </th>
                    <th scope="col">Lotes</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line, index) => {
                    const assigned = order.fulfilment.lots.filter((a) => a.line === index);
                    const available = lotsFor(line.variantId);
                    const canAssign = paid && ["queued", "preparing", "ready_to_ship"].includes(f);
                    return (
                      <tr key={index}>
                        <td className={`${styles.mono} ${styles.nowrap}`}>{line.variantId}</td>
                        <td>
                          {line.name}
                          <br />
                          <span className={styles.muted}>{line.presentation}</span>
                        </td>
                        <td className={styles.num}>{line.quantity}</td>
                        <td className={styles.num}>{money(line.unitPrice.amount)}</td>
                        <td className={styles.num}>{money(line.lineTotal.amount)}</td>
                        <td>
                          {assigned.length > 0 ? (
                            <ul
                              className={styles.chips}
                              style={{ listStyle: "none", margin: 0, padding: 0 }}
                            >
                              {assigned.map((a) => (
                                <li key={a.lotId} className={styles.chips}>
                                  <span className={styles.chip}>
                                    {a.lotId} ×{a.quantity}
                                  </span>
                                  {canAssign ? (
                                    <form action={unassignLotAction}>
                                      <Hidden order={order} />
                                      <input type="hidden" name="line" value={index} />
                                      <input type="hidden" name="lotId" value={a.lotId} />
                                      <button
                                        type="submit"
                                        className={styles.button}
                                        data-variant="quiet"
                                        aria-label={`Retirar lote ${a.lotId}`}
                                      >
                                        ×
                                      </button>
                                    </form>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className={styles.muted}>Sin asignar</span>
                          )}
                          {canAssign && available.length > 0 ? (
                            <form action={assignLotAction} className={styles.chips}>
                              <Hidden order={order} />
                              <input type="hidden" name="line" value={index} />
                              <label className="sr-only" htmlFor={`lot-${index}`}>
                                Lote para {line.variantId}
                              </label>
                              <select id={`lot-${index}`} name="lotId" className={styles.select}>
                                {available.map((lot) => (
                                  <option key={lot.id} value={lot.id}>
                                    {lot.id} · {lot.status}
                                    {lot.expiresOn ? ` · cad. ${lot.expiresOn}` : ""}
                                  </option>
                                ))}
                              </select>
                              <label className="sr-only" htmlFor={`lotq-${index}`}>
                                Cantidad
                              </label>
                              <input
                                id={`lotq-${index}`}
                                name="quantity"
                                type="number"
                                min={1}
                                max={line.quantity}
                                defaultValue={line.quantity}
                                className={styles.input}
                                style={{ inlineSize: "5rem" }}
                              />
                              <button type="submit" className={styles.button} data-variant="quiet">
                                Asignar
                              </button>
                            </form>
                          ) : null}
                          {canAssign && available.length === 0 ? (
                            <p className={styles.hint}>No hay lotes registrados para este SKU.</p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* ------------------------------------------------ fulfilment */}
          <Panel
            id="preparacion"
            title="Preparación"
            aside={<AxisChip axis="fulfilment" state={f} />}
          >
            {!paid && f === "unfulfilled" ? (
              <p className={styles.hint}>
                Un pedido entra a la cola solo cuando el procesador confirma el pago.
              </p>
            ) : null}
            {f === "fulfilled" ? (
              <p className={styles.hint}>Despachado: la paquetería tiene el paquete.</p>
            ) : null}
            {f === "cancelled" ? <p className={styles.hint}>No se preparará.</p> : null}
            <div className={`${styles.actions} ${styles.noPrint}`}>
              {paid && FULFILMENT_TRANSITIONS[f].includes("preparing") && f !== "on_hold" ? (
                <form action={advanceAction}>
                  <Hidden order={order} />
                  <input type="hidden" name="to" value="preparing" />
                  <button type="submit" className={styles.button} data-variant="quiet">
                    {f === "ready_to_ship" ? "Reabrir preparación" : "Iniciar preparación"}
                  </button>
                </form>
              ) : null}
              {paid && f === "preparing" ? (
                <>
                  <form action={advanceAction}>
                    <Hidden order={order} />
                    <input type="hidden" name="to" value="ready_to_ship" />
                    <button type="submit" className={styles.button} data-variant="quiet">
                      Listo para envío
                    </button>
                  </form>
                  <form action={advanceAction}>
                    <Hidden order={order} />
                    <input type="hidden" name="to" value="queued" />
                    <button type="submit" className={styles.button} data-variant="quiet">
                      Regresar a la cola
                    </button>
                  </form>
                </>
              ) : null}
              {f === "on_hold" && paid ? (
                <form action={resumeAction}>
                  <Hidden order={order} />
                  <button type="submit" className={styles.button} data-variant="quiet">
                    Reanudar
                  </button>
                </form>
              ) : null}
            </div>
            {FULFILMENT_TRANSITIONS[f].includes("on_hold") ? (
              <details className={`${styles.details} ${styles.noPrint}`}>
                <summary>Poner en espera…</summary>
                <form action={holdAction} className={styles.form}>
                  <Hidden order={order} />
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      <span className={styles.labelText}>Motivo</span>
                      <select name="reason" className={styles.select}>
                        <option value="operator">{OPS.holdReasons.operator}</option>
                        <option value="address_check">{OPS.holdReasons.address_check}</option>
                        <option value="stock_short">{OPS.holdReasons.stock_short}</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <button type="submit" className={styles.button} data-variant="quiet">
                      En espera
                    </button>
                  </div>
                </form>
              </details>
            ) : null}
          </Panel>

          {/* -------------------------------------------------- shipment */}
          <Panel
            id="envio"
            title="Envío"
            aside={<AxisChip axis="shipment" state={shipmentSummary(order)} />}
          >
            {order.shipments.length === 0 ? (
              <p className={styles.hint}>Sin envíos registrados.</p>
            ) : (
              order.shipments.map((s) => (
                <div
                  key={s.id}
                  className={styles.form}
                  style={{ borderBlockStart: 0, paddingBlockStart: 0 }}
                >
                  <dl className={styles.facts}>
                    <dt>Envío</dt>
                    <dd className={styles.mono}>{s.id}</dd>
                    <dt>Estado</dt>
                    <dd>
                      <AxisChip axis="shipment" state={s.state} />
                    </dd>
                    <dt>Origen</dt>
                    <dd>{s.provider === "manual" ? "Registrado a mano" : s.provider}</dd>
                    <dt>Paquetería</dt>
                    <dd>{s.carrier ?? "—"}</dd>
                    <dt>Servicio</dt>
                    <dd>{s.service ?? "—"}</dd>
                    <dt>Rastreo</dt>
                    <dd className={styles.mono}>
                      {s.trackingNumber ?? "—"}
                      {s.trackingUrl ? (
                        <>
                          {" · "}
                          <a href={s.trackingUrl} rel="noopener noreferrer" target="_blank">
                            página de rastreo
                          </a>
                        </>
                      ) : null}
                    </dd>
                    <dt>Despachado</dt>
                    <dd>{s.shippedAt ? dateTime.format(new Date(s.shippedAt)) : "—"}</dd>
                    <dt>Entregado</dt>
                    <dd>{s.deliveredAt ? dateTime.format(new Date(s.deliveredAt)) : "—"}</dd>
                  </dl>
                  {SHIPMENT_TRANSITIONS[s.state].length > 0 ? (
                    <div className={`${styles.actions} ${styles.noPrint}`}>
                      {SHIPMENT_TRANSITIONS[s.state].map((to) => (
                        <form key={to} action={shipmentStateAction}>
                          <Hidden order={order} />
                          <input type="hidden" name="shipmentId" value={s.id} />
                          <input type="hidden" name="to" value={to} />
                          <button type="submit" className={styles.button} data-variant="quiet">
                            {SHIPMENT_ACTIONS[to] ?? to}
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                  {s.state !== "cancelled" && s.state !== "returned" ? (
                    <details className={`${styles.details} ${styles.noPrint}`}>
                      <summary>Actualizar rastreo</summary>
                      <form action={trackingAction} className={styles.form}>
                        <Hidden order={order} />
                        <input type="hidden" name="shipmentId" value={s.id} />
                        <div className={styles.formRow}>
                          <label className={styles.label}>
                            <span className={styles.labelText}>Paquetería</span>
                            <input
                              name="carrier"
                              defaultValue={s.carrier ?? ""}
                              className={styles.input}
                              maxLength={80}
                            />
                          </label>
                          <label className={styles.label}>
                            <span className={styles.labelText}>Número de rastreo</span>
                            <input
                              name="trackingNumber"
                              defaultValue={s.trackingNumber ?? ""}
                              className={styles.input}
                              maxLength={80}
                            />
                          </label>
                          <label className={styles.label}>
                            <span className={styles.labelText}>URL de rastreo (https)</span>
                            <input
                              name="trackingUrl"
                              type="url"
                              defaultValue={s.trackingUrl ?? ""}
                              className={styles.input}
                            />
                          </label>
                        </div>
                        <div>
                          <button type="submit" className={styles.button} data-variant="quiet">
                            Guardar rastreo
                          </button>
                        </div>
                      </form>
                    </details>
                  ) : null}
                </div>
              ))
            )}
            {paid && f === "ready_to_ship" && (!active || active.state === "returned") ? (
              <form action={recordShipmentAction} className={`${styles.form} ${styles.noPrint}`}>
                <Hidden order={order} />
                <p className={styles.hint}>
                  No hay paquetería integrada: registra aquí el envío que se contrató. Nada se
                  cotiza ni se genera automáticamente.
                </p>
                <div className={styles.formRow}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Paquetería</span>
                    <input name="carrier" className={styles.input} maxLength={80} />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Servicio</span>
                    <input name="service" className={styles.input} maxLength={80} />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Número de rastreo</span>
                    <input name="trackingNumber" className={styles.input} maxLength={80} />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>URL de rastreo (https)</span>
                    <input name="trackingUrl" type="url" className={styles.input} />
                  </label>
                </div>
                <label className={styles.check}>
                  <input type="checkbox" name="dispatched" value="yes" />
                  La paquetería ya recogió el paquete (despachar ahora)
                </label>
                <div>
                  <button type="submit" className={styles.button}>
                    Registrar envío
                  </button>
                </div>
              </form>
            ) : null}
          </Panel>

          {/* --------------------------------------------------- payment */}
          <Panel id="pago" title="Pago" aside={<AxisChip axis="payment" state={order.state} />}>
            <dl className={styles.facts}>
              <dt>Procesador</dt>
              <dd>
                {order.provider ?? "—"}
                {provider
                  ? ` · ${provider.mode() === "test" ? "modo de prueba" : "producción"}`
                  : ""}
              </dd>
              <dt>Referencia</dt>
              <dd className={styles.mono}>{order.providerRef ?? "—"}</dd>
              {decline ? (
                <>
                  <dt>Último rechazo</dt>
                  <dd className={styles.mono}>{decline}</dd>
                </>
              ) : null}
            </dl>
            {order.attempts.length > 0 ? (
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Intentos de pago"
              >
                <table className={styles.table}>
                  <caption className="sr-only">Intentos de pago</caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Enviado</th>
                      <th scope="col">Resultado</th>
                      <th scope="col">Referencia</th>
                      <th scope="col">Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.attempts.map((a) => (
                      <tr key={a.seq}>
                        <td className={styles.mono}>{a.seq}</td>
                        <td>{dateTime.format(new Date(a.at))}</td>
                        <td className={styles.mono}>{a.outcome}</td>
                        <td className={styles.mono}>{a.providerRef ?? "—"}</td>
                        <td className={styles.mono}>{a.errorCode ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.hint}>Sin intentos de pago.</p>
            )}

            <h3 className={styles.labelText}>Reembolsos</h3>
            {order.refunds.length === 0 ? (
              <p className={styles.hint}>Ninguno.</p>
            ) : (
              <ul className={styles.timeline}>
                {order.refunds.map((r) => (
                  <li key={r.id} className={styles.event}>
                    <span className={styles.eventHead}>
                      <strong>{money(r.amount.amount)}</strong> · {OPS.refund[r.status]} ·{" "}
                      {OPS.refundReasons[r.reason]}
                    </span>
                    <span className={styles.eventMeta}>
                      {r.id} · solicitado {dateTime.format(new Date(r.requestedAt))}
                      {r.requestedBy ? ` por ${r.requestedBy}` : ""}
                      {r.error ? ` · error ${r.error}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {refund && (refund.status === "requested" || refund.status === "failed") ? (
              <form action={submitRefundAction} className={`${styles.form} ${styles.noPrint}`}>
                <Hidden order={order} />
                <input type="hidden" name="refundId" value={refund.id} />
                <p className={styles.hint}>
                  Envía al procesador un reembolso TOTAL de {money(refund.amount.amount)}. NEOGEN lo
                  marcará como confirmado solo cuando el procesador informe el pago como
                  reembolsado.
                </p>
                <label className={styles.check}>
                  <input type="checkbox" name="confirm" value="yes" required />
                  Confirmo enviar el reembolso total al procesador
                </label>
                <div>
                  <button type="submit" className={styles.button} data-variant="danger">
                    Enviar reembolso
                  </button>
                </div>
              </form>
            ) : null}
            {paid && !refund ? (
              <details className={`${styles.details} ${styles.noPrint}`}>
                <summary>Solicitar reembolso sin cancelar</summary>
                <form action={requestRefundAction} className={styles.form}>
                  <Hidden order={order} />
                  <label className={styles.label}>
                    <span className={styles.labelText}>Motivo</span>
                    <select name="reason" className={styles.select}>
                      {(
                        [
                          "customer_request",
                          "not_delivered",
                          "returned",
                          "duplicate_charge",
                          "operator_other",
                        ] as const
                      ).map((r) => (
                        <option key={r} value={r}>
                          {OPS.refundReasons[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={styles.hint}>Solo registra la solicitud; no mueve dinero.</p>
                  <div>
                    <button type="submit" className={styles.button} data-variant="quiet">
                      Solicitar reembolso
                    </button>
                  </div>
                </form>
              </details>
            ) : null}
          </Panel>

          {/* --------------------------------------------------- history */}
          <Panel
            id="historial"
            title="Historial"
            aside={<span className={styles.eventMeta}>{order.events.length} eventos</span>}
          >
            <ol className={styles.timeline} reversed>
              {[...order.events].reverse().map((e) => (
                <li
                  key={e.seq}
                  className={styles.event}
                  data-source={e.source ?? (e.providerEventId ? "provider" : "system")}
                  data-rejected={e.kind === "payment_event_rejected" ? "true" : undefined}
                >
                  <span className={styles.eventHead}>
                    <strong>{OPS.events[e.kind]}</strong>
                    {e.from || e.to ? (
                      <span>
                        {stateLabel(e, e.from)}
                        {e.from && e.to ? " → " : ""}
                        {stateLabel(e, e.to)}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.eventMeta}>
                    {dateTime.format(new Date(e.at))} ·{" "}
                    {OPS.sources[e.source ?? (e.providerEventId ? "provider" : "system")]}
                    {e.actor ? ` · ${e.actor}` : ""}
                    {e.note ? ` · ${e.note}` : ""}
                    {e.ref ? ` · ${e.ref}` : ""}
                    {e.meta
                      ? ` · ${Object.entries(e.meta)
                          .filter(([, v]) => v !== null && v !== "")
                          .map(([k, v]) => `${k}=${v}`)
                          .join(" ")}`
                      : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className={styles.column}>
          {/* -------------------------------------------------- customer */}
          <Panel id="cliente" title="Cliente">
            <dl className={styles.facts}>
              <dt>Nombre</dt>
              <dd>{order.contact.name}</dd>
              <dt>Correo</dt>
              <dd>
                <a href={`mailto:${order.contact.email}`}>{order.contact.email}</a>
              </dd>
              <dt>Teléfono</dt>
              <dd>
                <a href={`tel:+${order.contact.phone}`}>
                  {formatPhoneDisplay(order.contact.phone)}
                </a>
              </dd>
              <dt>Recibe</dt>
              <dd>{order.shipping.recipient}</dd>
              <dt>Dirección</dt>
              <dd>{formatAddress(order.shipping)}</dd>
              {order.shipping.notes ? (
                <>
                  <dt>Indicaciones</dt>
                  <dd>{order.shipping.notes}</dd>
                </>
              ) : null}
              <dt>Idioma</dt>
              <dd>{order.locale === "es" ? "Español" : "Inglés"}</dd>
            </dl>
          </Panel>

          {/* ----------------------------------------------------- order */}
          <Panel id="pedido" title="Pedido">
            <dl className={styles.facts}>
              <dt>Subtotal</dt>
              <dd>{money(order.totals.subtotal.amount)}</dd>
              <dt>Envío</dt>
              <dd>
                {order.totals.shipping.amount === 0
                  ? "Gratis"
                  : money(order.totals.shipping.amount)}
              </dd>
              <dt>Total</dt>
              <dd>
                <strong>{money(order.totals.total.amount)}</strong>
              </dd>
              <dt>Ruta</dt>
              <dd>
                {order.route === "priority" ? "Prioritaria" : "Nacional"} · estimado{" "}
                {order.delivery.estimateDays}{" "}
                {order.delivery.estimateDays === 1 ? "día hábil" : "días hábiles"}
              </dd>
              <dt>Declaraciones</dt>
              <dd className={styles.mono}>
                {order.acknowledged.length
                  ? order.acknowledged.map((a) => `${a.id}@${a.version}`).join(", ")
                  : "—"}
              </dd>
              {order.cancellation ? (
                <>
                  <dt>Cancelado</dt>
                  <dd>
                    {OPS.cancelReasons[order.cancellation.reason]} ·{" "}
                    {dateTime.format(new Date(order.cancellation.at))}
                    {order.cancellation.by ? ` · ${order.cancellation.by}` : ""}
                  </dd>
                </>
              ) : null}
            </dl>
          </Panel>

          {/* ------------------------------------------------- inventory */}
          <Panel id="existencias" title="Existencias">
            {holds.length === 0 ? (
              <p className={styles.hint}>
                Ninguna reserva. Los SKU sin conteo de inventario no se reservan ni se limitan.
              </p>
            ) : (
              <ul className={styles.timeline}>
                {holds.map((h) => (
                  <li key={h.variantId} className={styles.event}>
                    <span className={styles.eventHead}>
                      <span className={styles.mono}>{h.variantId}</span> ×{h.quantity}
                    </span>
                    <span className={styles.eventMeta}>
                      {h.status === "held"
                        ? "Reservado"
                        : h.status === "consumed"
                          ? "Salió del almacén"
                          : "Liberado"}{" "}
                      · {dateTime.format(new Date(h.updatedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* -------------------------------------------------- messages */}
          <Panel id="mensajes" title="Mensajes">
            {messages.length === 0 ? (
              <p className={styles.hint}>Este pedido aún no debe ningún mensaje.</p>
            ) : (
              <ul className={styles.timeline}>
                {messages.map((m) => (
                  <li key={m.message.id} className={styles.event}>
                    <span className={styles.eventHead}>
                      <Link href={`/ops/mensajes?id=${encodeURIComponent(m.message.id)}`}>
                        {OPS.messages[m.message.kind]}
                      </Link>
                    </span>
                    <span className={styles.eventMeta}>{OPS.outbox[m.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* ----------------------------------------------------- notes */}
          <Panel id="notas" title="Notas internas">
            {order.notes.length === 0 ? <p className={styles.hint}>Sin notas.</p> : null}
            {order.notes.map((n, i) => (
              <div key={i}>
                <p className={styles.note}>{n.text}</p>
                <span className={styles.eventMeta}>
                  {n.by ?? "—"} · {dateTime.format(new Date(n.at))}
                </span>
              </div>
            ))}
            <form action={noteAction} className={`${styles.form} ${styles.noPrint}`}>
              <Hidden order={order} />
              <label className={styles.label}>
                <span className={styles.labelText}>Nueva nota (no la ve el cliente)</span>
                <textarea name="text" className={styles.textarea} maxLength={1000} required />
              </label>
              <div>
                <button type="submit" className={styles.button} data-variant="quiet">
                  Añadir nota
                </button>
              </div>
            </form>
            {order.externalRefs.length > 0 ? (
              <dl className={styles.facts}>
                {order.externalRefs.map((r) => (
                  <div key={`${r.system}:${r.ref}`} style={{ display: "contents" }}>
                    <dt>{r.system}</dt>
                    <dd className={styles.mono}>{r.ref}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <details className={`${styles.details} ${styles.noPrint}`}>
              <summary>Referencia externa</summary>
              <form action={externalRefAction} className={styles.form}>
                <Hidden order={order} />
                <p className={styles.hint}>
                  El número de pedido sigue siendo el de NEOGEN; esto solo anota cómo lo conoce otro
                  sistema (p. ej. <span className={styles.mono}>erp</span>).
                </p>
                <div className={styles.formRow}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Sistema</span>
                    <input
                      name="system"
                      className={styles.input}
                      pattern="[a-z][a-z0-9_-]*"
                      maxLength={40}
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Referencia</span>
                    <input name="ref" className={styles.input} maxLength={120} required />
                  </label>
                </div>
                <div>
                  <button type="submit" className={styles.button} data-variant="quiet">
                    Añadir
                  </button>
                </div>
              </form>
            </details>
          </Panel>

          {/* ---------------------------------------------------- cancel */}
          {cancellable ? (
            <Panel id="cancelar" title="Cancelar pedido">
              <form
                action={cancelAction}
                className={styles.form}
                style={{ borderBlockStart: 0, paddingBlockStart: 0 }}
              >
                <Hidden order={order} />
                <p className={styles.hint}>
                  {paid
                    ? `Detiene la preparación y SOLICITA un reembolso total de ${money(order.totals.total.amount)}. El dinero no se mueve hasta enviarlo al procesador.`
                    : order.state === "disputed"
                      ? "Detiene la preparación. No se solicita reembolso: la disputa ya está moviendo el dinero."
                      : "El pedido no está pagado: se cancela sin reembolso."}
                </p>
                <label className={styles.label}>
                  <span className={styles.labelText}>Motivo</span>
                  <select name="reason" className={styles.select}>
                    {(
                      [
                        "customer_request",
                        "payment_not_completed",
                        "stock_unavailable",
                        "fraud_suspected",
                        "address_undeliverable",
                        "operator_other",
                      ] as const
                    ).map((r) => (
                      <option key={r} value={r}>
                        {OPS.cancelReasons[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.check}>
                  <input type="checkbox" name="confirm" value="yes" required />
                  Confirmo cancelar el pedido
                </label>
                <div>
                  <button type="submit" className={styles.button} data-variant="danger">
                    Cancelar pedido
                  </button>
                </div>
              </form>
            </Panel>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
