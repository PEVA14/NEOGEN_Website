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
  reconcileAction,
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
import {
  exceptionLabel,
  FULFILMENT_TONE,
  lifecycle,
  NEXT_TONE,
  nextStep,
  noteText,
  PAYMENT_TONE,
  SHIPMENT_TONE,
} from "../../lifecycle";
import styles from "../../ops.module.css";
import { Flash, Shell } from "../../Shell";
import { Effects, EmptyState, PageHeader, Section, State } from "../../ui";

import type { NextAction } from "../../lifecycle";
import type { EventState, Order, OrderEvent, Shipment, ShipmentState } from "@/domain/order";
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

const E = OPS.effects;

/**
 * WHAT EACH SHIPMENT MOVE IS CALLED, AND WHAT IT DOES — keyed by where the
 * shipment is and where it goes, because "back to in transit" after an
 * incident is not the same act as dispatching. The moves themselves are the
 * domain's (`SHIPMENT_TRANSITIONS`); only their words live here.
 */
function shipmentMove(
  from: ShipmentState,
  to: ShipmentState,
): { label: string; effects: Parameters<typeof Effects>[0]["items"]; danger?: boolean } {
  if (to === "in_transit" && from === "pending") {
    return {
      label: "Despachar",
      effects: [
        { text: E.irreversible, strong: true },
        E.notifies,
        E.stockOut,
        "Úsalo cuando la paquetería ya tenga el paquete",
      ],
    };
  }
  if (to === "in_transit") {
    return {
      label: "Volver a «En tránsito»",
      effects: [E.noNotice, "La incidencia queda resuelta"],
    };
  }
  if (to === "exception") {
    return {
      label: "Registrar incidencia",
      effects: ["Marca el pedido para revisión", E.reversible, E.noNotice],
    };
  }
  if (to === "delivered") {
    return { label: "Marcar entregado", effects: [E.notifies, "Cierra el envío"] };
  }
  if (to === "returned") {
    return {
      label: "Devuelto a NEOGEN",
      effects: [
        { text: E.irreversible, strong: true },
        "No reintegra el inventario: regístralo en Inventario",
        E.noNotice,
      ],
    };
  }
  return {
    label: "Cancelar la reserva del envío",
    effects: ["El pedido sigue listo para envío", E.noNotice],
  };
}

/** The moment the order reached its CURRENT payment state (refunded → when refunded). */
function paymentDate(order: Order): string | null {
  const reached =
    order.state === "refunded"
      ? order.milestones.refunded
      : order.state === "disputed"
        ? order.milestones.disputed
        : order.milestones.paid;
  return reached ?? null;
}

/**
 * A history row's name. A payment NEOGEN refused for lack of stock was never
 * sent to the processor, so its row must not say the processor answered.
 */
function eventLabel(event: OrderEvent): string {
  if (event.kind === "payment_answered" && event.note === "out_of_stock") {
    return OPS.paymentRefusedForStock;
  }
  return OPS.events[event.kind];
}

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

const sourceOf = (e: OrderEvent) => e.source ?? (e.providerEventId ? "provider" : "system");

const dayFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "full",
  timeZone: "America/Mexico_City",
});
const timeFormat = new Intl.DateTimeFormat("es-MX", {
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

function Hidden({ order }: { order: Order }) {
  return <input type="hidden" name="orderId" value={order.id} />;
}

/**
 * ONE ACTION, SELF-EXPLAINED: the button, then what it does. Posts to the
 * same server action, with the same fields, as before this layout existed.
 */
function ActionRow({
  action,
  order,
  fields = {},
  label,
  effects,
  variant = "quiet",
}: {
  action: (form: FormData) => Promise<void>;
  order: Order;
  fields?: Record<string, string>;
  label: string;
  effects: Parameters<typeof Effects>[0]["items"];
  variant?: "primary" | "quiet" | "danger";
}) {
  return (
    <form action={action} className={styles.actionRow}>
      <Hidden order={order} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className={styles.button}
        data-variant={variant === "primary" ? undefined : variant}
      >
        {label}
      </button>
      <Effects items={effects} />
    </form>
  );
}

/** The next-step block's button, from the existing action it names. */
function NextButton({ order, action }: { order: Order; action: NextAction }) {
  if (action.type === "jump") {
    return (
      <a href={action.href} className={styles.button}>
        {action.label}
      </a>
    );
  }
  const [act, fields]: [(form: FormData) => Promise<void>, Record<string, string>] =
    action.type === "advance"
      ? [advanceAction, { to: action.to }]
      : action.type === "resume"
        ? [resumeAction, {}]
        : action.type === "shipment"
          ? [shipmentStateAction, { shipmentId: action.shipmentId, to: action.to }]
          : [reconcileAction, {}];
  return (
    <form action={act}>
      <Hidden order={order} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={styles.button}>
        {action.label}
      </button>
    </form>
  );
}

/**
 * ONE ORDER — where it is, what it needs, and everything that happened.
 *
 * Top to bottom: the lifecycle (payment → preparation → shipping →
 * delivery), what needs a person and the one most likely next step, then the
 * work sections, then the record. Every section offers only the actions that
 * are legal from where the order is now, each saying what it does — and the
 * server refuses anything else regardless (`server/ops/actions.ts`).
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
  const step = nextStep(order, now);
  const steps = lifecycle(order, now);
  const exception = exceptionLabel(order);
  const ship = shipmentSummary(order);
  const inFlight = order.state === "payment_processing" || order.state === "pending_payment";
  const whenPaid = paymentDate(order);

  /* History, newest first, grouped by day in Mexico City. */
  const days: { day: string; events: OrderEvent[] }[] = [];
  for (const e of [...order.events].reverse()) {
    const day = dayFormat.format(new Date(e.at));
    const last = days.at(-1);
    if (last && last.day === day) last.events.push(e);
    else days.push({ day, events: [e] });
  }

  return (
    <Shell current="orders" operator={operator}>
      <PageHeader
        back={{ href: "/ops/pedidos", label: "Pedidos" }}
        eyebrow={
          <>
            Recibido {dateTime.format(new Date(order.createdAt))} · {age(order.createdAt, nowMs)}
          </>
        }
        title={order.id}
        reference
        actions={
          <Link
            href={`/ops/pedidos/${order.id}/empaque`}
            className={styles.button}
            data-variant="quiet"
          >
            Hoja de empaque
          </Link>
        }
      />

      <Flash ok={ok} error={error} />

      {/* ---- where the order is ------------------------------------------- */}
      <section className={styles.overview} aria-label="Estado del pedido">
        <div className={styles.overviewMain}>
          <div className={styles.overviewTop}>
            <p className={styles.overviewCustomer}>
              {order.contact.name}
              <span className={styles.muted}>
                {" "}
                · {order.shipping.city}, {order.shipping.state}
              </span>
            </p>
            {exception ? (
              <State tone={exception.tone} strong>
                {exception.label}
              </State>
            ) : null}
          </div>
          <ol className={styles.lifecycle} aria-label="Avance del pedido">
            {steps.map((s) => (
              <li key={s.key} className={styles.lifeStep} data-status={s.status}>
                <span className={styles.lifeMarker} aria-hidden="true" />
                <span className={styles.lifeLabel}>{s.label}</span>
                <span className={styles.lifeCaption}>
                  <span className="sr-only">
                    {
                      {
                        done: "hecho",
                        current: "en curso",
                        upcoming: "pendiente",
                        problem: "con problema",
                        stopped: "detenido",
                      }[s.status]
                    }
                    :{" "}
                  </span>
                  {s.caption}
                </span>
                {s.at ? (
                  <span className={styles.lifeDate}>{dateTime.format(new Date(s.at))}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        <dl className={styles.overviewTotal}>
          <dt>Total</dt>
          <dd className={styles.overviewAmount}>{money(order.totals.total.amount)}</dd>
          <dd className={styles.muted}>
            {units} {units === 1 ? "unidad" : "unidades"} · {order.lines.length}{" "}
            {order.lines.length === 1 ? "presentación" : "presentaciones"}
          </dd>
        </dl>
      </section>

      {/* ---- what it needs ------------------------------------------------- */}
      <section
        className={`${styles.nextBlock} ${styles.noPrint}`}
        data-kind={step.kind}
        aria-labelledby="next-title"
      >
        {reasons.length > 0 ? (
          <div className={styles.attentionBox}>
            <p className={styles.attentionTitle}>
              <span className={styles.stateDot} data-tone="bad" aria-hidden="true" />
              Requiere atención
            </p>
            <ul className={styles.attentionList}>
              {reasons.map((r) => (
                <li key={r}>
                  <span>{OPS.attention[r]}</span>
                  {ACKNOWLEDGEABLE.includes(r) ? (
                    <form action={ackAction} className={styles.inlineForm}>
                      <Hidden order={order} />
                      <input type="hidden" name="reason" value={r} />
                      <button type="submit" className={styles.button} data-variant="quiet">
                        Marcar revisado
                      </button>
                      <span className={styles.hint}>
                        Oculta este aviso hasta que vuelva a ocurrir.
                      </span>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={styles.nextRow}>
          <div className={styles.nextText}>
            <span className={styles.nextLabel}>
              <span
                className={styles.stateDot}
                data-tone={NEXT_TONE[step.kind]}
                aria-hidden="true"
              />
              {step.kind === "done" ? "Estado" : "Qué sigue"}
            </span>
            <h2 id="next-title" className={styles.nextTitle}>
              {step.title}
            </h2>
            {step.detail ? <p className={styles.nextDetail}>{step.detail}</p> : null}
          </div>
          {step.action ? <NextButton order={order} action={step.action} /> : null}
        </div>
      </section>

      <div className={styles.detail}>
        <div className={styles.column}>
          {/* ---------------------------------------------------- items */}
          <Section
            id="articulos"
            title="Artículos"
            aside={
              <span className={styles.sectionMeta}>
                {units} {units === 1 ? "unidad" : "unidades"}
              </span>
            }
          >
            <ul className={styles.items}>
              {order.lines.map((line, index) => {
                const assigned = order.fulfilment.lots.filter((a) => a.line === index);
                const available = lotsFor(line.variantId);
                const canAssign = paid && ["queued", "preparing", "ready_to_ship"].includes(f);
                return (
                  <li key={index} className={styles.item}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemQty}>{line.quantity}×</span>
                      <span>
                        <span className={styles.itemName}>
                          {line.name} · {line.presentation}
                        </span>
                        <span className={styles.itemSku}>{line.variantId}</span>
                      </span>
                      <span className={styles.itemPrice}>
                        {money(line.lineTotal.amount)}
                        {line.quantity > 1 ? (
                          <span className={styles.muted}>{money(line.unitPrice.amount)} c/u</span>
                        ) : null}
                      </span>
                    </div>
                    <div className={styles.itemLots}>
                      <span className={styles.labelText}>Lote</span>
                      {assigned.length > 0 ? (
                        <ul className={styles.chips}>
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
                                    data-size="small"
                                    aria-label={`Retirar lote ${a.lotId}`}
                                  >
                                    Retirar
                                  </button>
                                </form>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className={styles.muted}>
                          {available.length === 0
                            ? "Sin lotes registrados para esta presentación. No impide prepararlo ni enviarlo."
                            : "Sin asignar."}
                        </span>
                      )}
                      {canAssign && available.length > 0 ? (
                        <form action={assignLotAction} className={styles.inlineForm}>
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
                            className={`${styles.input} ${styles.inputNarrow}`}
                          />
                          <button type="submit" className={styles.button} data-variant="quiet">
                            Asignar lote
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* ------------------------------------------------ fulfilment */}
          <Section
            id="preparacion"
            title="Preparación"
            aside={
              <State tone={FULFILMENT_TONE[f]} label="Preparación" strong>
                {OPS.fulfilment[f]}
              </State>
            }
          >
            {!paid && f === "unfulfilled" ? (
              <EmptyState compact>
                Un pedido entra a la cola de preparación solo cuando el procesador confirma su pago.
              </EmptyState>
            ) : null}
            {f === "fulfilled" ? (
              <p className={styles.hint}>Despachado: la paquetería tiene el paquete.</p>
            ) : null}
            {f === "cancelled" ? (
              <p className={styles.hint}>Cancelado: este pedido no se preparará.</p>
            ) : null}
            {f === "on_hold" && order.fulfilment.hold ? (
              <p className={styles.hint}>
                En espera por «{OPS.holdReasons[order.fulfilment.hold.reason]}» desde{" "}
                {dateTime.format(new Date(order.fulfilment.hold.at))}. Al reanudar vuelve a «
                {OPS.fulfilment[order.fulfilment.hold.from]}».
              </p>
            ) : null}
            <div className={styles.actionList}>
              {paid && FULFILMENT_TRANSITIONS[f].includes("preparing") && f !== "on_hold" ? (
                <ActionRow
                  action={advanceAction}
                  order={order}
                  fields={{ to: "preparing" }}
                  label={f === "ready_to_ship" ? "Reabrir preparación" : "Iniciar preparación"}
                  effects={
                    f === "ready_to_ship"
                      ? ["Vuelve a «En preparación»", E.reversible, E.noNotice]
                      : ["Pasa a «En preparación»", E.reversible, E.noNotice]
                  }
                />
              ) : null}
              {paid && f === "preparing" ? (
                <>
                  <ActionRow
                    action={advanceAction}
                    order={order}
                    fields={{ to: "ready_to_ship" }}
                    label="Listo para envío"
                    effects={["Ya está empacado", E.reversible, E.noNotice]}
                  />
                  <ActionRow
                    action={advanceAction}
                    order={order}
                    fields={{ to: "queued" }}
                    label="Regresar a la cola"
                    effects={["Vuelve a «En cola» sin perder nada", E.noNotice]}
                  />
                </>
              ) : null}
              {f === "on_hold" && paid ? (
                <ActionRow
                  action={resumeAction}
                  order={order}
                  label="Reanudar"
                  effects={[
                    order.fulfilment.hold
                      ? `Vuelve a «${OPS.fulfilment[order.fulfilment.hold.from]}»`
                      : "Retoma la preparación",
                    E.noNotice,
                  ]}
                />
              ) : null}
            </div>
            {FULFILMENT_TRANSITIONS[f].includes("on_hold") ? (
              <details className={`${styles.details} ${styles.noPrint}`}>
                <summary>Poner en espera…</summary>
                <form action={holdAction} className={styles.form}>
                  <Hidden order={order} />
                  <p className={styles.hint}>
                    Detiene la preparación hasta que alguien la reanude, y marca el pedido para
                    revisión. No cambia el pago.
                  </p>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Motivo</span>
                    <select name="reason" className={styles.select}>
                      <option value="operator">{OPS.holdReasons.operator}</option>
                      <option value="address_check">{OPS.holdReasons.address_check}</option>
                      <option value="stock_short">{OPS.holdReasons.stock_short}</option>
                    </select>
                  </label>
                  <div className={styles.actionRow}>
                    <button type="submit" className={styles.button} data-variant="quiet">
                      Poner en espera
                    </button>
                    <Effects items={[E.reversible, E.noNotice, E.noMoney]} />
                  </div>
                </form>
              </details>
            ) : null}
          </Section>

          {/* -------------------------------------------------- shipment */}
          <Section
            id="envio"
            title="Envío"
            aside={
              <State tone={SHIPMENT_TONE[ship]} label="Envío" strong>
                {OPS.shipment[ship]}
              </State>
            }
          >
            {order.shipments.length === 0 && !(paid && f === "ready_to_ship") ? (
              <EmptyState compact>
                {f === "cancelled"
                  ? "No se envió: el pedido está cancelado."
                  : "El envío aún no empieza. Se registra cuando el pedido esté «Listo para envío»."}
              </EmptyState>
            ) : null}
            {order.shipments.map((s: Shipment) => (
              <article key={s.id} className={styles.shipment} data-state={s.state}>
                <header className={styles.shipmentHead}>
                  <State tone={SHIPMENT_TONE[s.state]} label="Estado del envío" strong>
                    {OPS.shipment[s.state]}
                  </State>
                  <span className={styles.sectionMeta}>
                    {s.carrier ?? "Paquetería sin indicar"}
                    {s.service ? ` · ${s.service}` : ""}
                  </span>
                </header>
                <dl className={styles.facts}>
                  <dt>Rastreo</dt>
                  <dd>
                    {s.trackingNumber ? (
                      <span className={styles.mono}>{s.trackingNumber}</span>
                    ) : (
                      <span className={styles.muted}>Sin número de rastreo</span>
                    )}
                    {s.trackingUrl ? (
                      <>
                        {" · "}
                        <a href={s.trackingUrl} rel="noopener noreferrer" target="_blank">
                          Abrir página de rastreo
                        </a>
                      </>
                    ) : null}
                  </dd>
                  <dt>Despachado</dt>
                  <dd>{s.shippedAt ? dateTime.format(new Date(s.shippedAt)) : "Todavía no"}</dd>
                  {s.deliveredAt ? (
                    <>
                      <dt>Entregado</dt>
                      <dd>{dateTime.format(new Date(s.deliveredAt))}</dd>
                    </>
                  ) : null}
                  <dt>Registro</dt>
                  <dd className={styles.muted}>
                    {s.provider === "manual" ? "Registrado a mano" : s.provider} ·{" "}
                    <span className={styles.mono}>{s.id}</span>
                  </dd>
                </dl>
                {SHIPMENT_TRANSITIONS[s.state].length > 0 ? (
                  <div className={`${styles.actionList} ${styles.noPrint}`}>
                    {SHIPMENT_TRANSITIONS[s.state].map((to) => {
                      const move = shipmentMove(s.state, to);
                      return (
                        <ActionRow
                          key={to}
                          action={shipmentStateAction}
                          order={order}
                          fields={{ shipmentId: s.id, to }}
                          label={move.label}
                          effects={move.effects}
                        />
                      );
                    })}
                  </div>
                ) : null}
                {s.state !== "cancelled" && s.state !== "returned" ? (
                  <details className={`${styles.details} ${styles.noPrint}`}>
                    <summary>{s.trackingNumber ? "Corregir rastreo" : "Añadir rastreo"}</summary>
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
                          <span className={styles.labelText}>Página de rastreo (https://…)</span>
                          <input
                            name="trackingUrl"
                            type="url"
                            defaultValue={s.trackingUrl ?? ""}
                            className={styles.input}
                            placeholder="https://"
                          />
                        </label>
                      </div>
                      <div className={styles.actionRow}>
                        <button type="submit" className={styles.button} data-variant="quiet">
                          Guardar rastreo
                        </button>
                        <Effects
                          items={[
                            s.shippedAt && !s.trackingNumber
                              ? "Avisa al cliente con el número de rastreo"
                              : E.noNotice,
                          ]}
                        />
                      </div>
                    </form>
                  </details>
                ) : null}
              </article>
            ))}
            {paid && f === "ready_to_ship" && (!active || active.state === "returned") ? (
              <form action={recordShipmentAction} className={`${styles.form} ${styles.noPrint}`}>
                <Hidden order={order} />
                <h3 className={styles.formTitle}>Registrar el envío</h3>
                <p className={styles.hint}>
                  No hay paquetería integrada: registra aquí el envío que contrataste. Nada se
                  cotiza ni se genera automáticamente.
                </p>
                <div className={styles.formRow}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Paquetería</span>
                    <input
                      name="carrier"
                      className={styles.input}
                      maxLength={80}
                      placeholder="p. ej. Estafeta"
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Servicio</span>
                    <input
                      name="service"
                      className={styles.input}
                      maxLength={80}
                      placeholder="p. ej. Día siguiente"
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Número de rastreo</span>
                    <input name="trackingNumber" className={styles.input} maxLength={80} />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Página de rastreo (https://…)</span>
                    <input
                      name="trackingUrl"
                      type="url"
                      className={styles.input}
                      placeholder="https://"
                    />
                  </label>
                </div>
                <label className={styles.check}>
                  <input type="checkbox" name="dispatched" value="yes" />
                  La paquetería ya recogió el paquete (despachar ahora)
                </label>
                <p className={styles.hint}>
                  Sin marcar: el envío queda reservado y lo despachas después. Marcado: el paquete
                  sale del almacén, se avisa al cliente y no se puede deshacer.
                </p>
                <div>
                  <button type="submit" className={styles.button}>
                    Registrar envío
                  </button>
                </div>
              </form>
            ) : null}
          </Section>

          {/* --------------------------------------------------- payment */}
          <Section
            id="pago"
            title="Pago"
            aside={
              <State tone={PAYMENT_TONE[order.state]} label="Pago" strong>
                {OPS.payment[order.state]}
              </State>
            }
          >
            <dl className={styles.facts}>
              <dt>Estado</dt>
              <dd>
                {order.state === "paid"
                  ? `Cobrado ${money(order.totals.total.amount)}${whenPaid ? ` el ${dateTime.format(new Date(whenPaid))}` : ""}`
                  : order.state === "refunded"
                    ? `Reembolsado${whenPaid ? ` el ${dateTime.format(new Date(whenPaid))}` : ""}`
                    : order.state === "disputed"
                      ? `En disputa${whenPaid ? ` desde el ${dateTime.format(new Date(whenPaid))}` : ""}: el banco del cliente abrió un contracargo.`
                      : inFlight
                        ? "El procesador todavía no confirma ni rechaza el pago."
                        : order.state === "payment_failed"
                          ? "El último intento de pago no se completó."
                          : order.state === "cancelled"
                            ? "Cancelado sin cobro."
                            : "Todavía no hay un intento de pago."}
              </dd>
              {decline && order.state !== "paid" ? (
                <>
                  <dt>Motivo</dt>
                  <dd>{OPS.declines[decline] ?? decline}</dd>
                </>
              ) : null}
              <dt>Procesador</dt>
              <dd>
                {order.provider === "mercadopago" ? "Mercado Pago" : (order.provider ?? "—")}
                {provider
                  ? ` · ${provider.mode() === "test" ? "modo de prueba (sin dinero real)" : "producción"}`
                  : ""}
              </dd>
            </dl>

            {inFlight ? (
              <div className={styles.actionList}>
                <ActionRow
                  action={reconcileAction}
                  order={order}
                  label="Revisar con el procesador"
                  effects={[
                    "Pregunta cómo va el pago",
                    "Solo aplica lo que responda el procesador",
                    "Si lo confirma, se avisa al cliente como con cualquier pago",
                  ]}
                />
              </div>
            ) : null}

            <div className={styles.subsection}>
              <h3 className={styles.subTitle}>Reembolsos</h3>
              {order.refunds.length === 0 ? (
                <p className={styles.hint}>Ningún reembolso registrado para este pedido.</p>
              ) : (
                <ul className={styles.refunds}>
                  {order.refunds.map((r) => (
                    <li key={r.id} className={styles.refund}>
                      <span className={styles.refundAmount}>{money(r.amount.amount)}</span>
                      <State
                        tone={
                          r.status === "confirmed" ? "good" : r.status === "failed" ? "bad" : "warn"
                        }
                      >
                        {OPS.refund[r.status]}
                      </State>
                      <span className={styles.muted}>
                        {OPS.refundReasons[r.reason]} · solicitado{" "}
                        {dateTime.format(new Date(r.requestedAt))}
                        {r.requestedBy ? ` por ${r.requestedBy}` : ""}
                        {r.error ? ` · error ${r.error}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {refund && (refund.status === "requested" || refund.status === "failed") ? (
                <form
                  action={submitRefundAction}
                  className={`${styles.form} ${styles.dangerForm} ${styles.noPrint}`}
                >
                  <Hidden order={order} />
                  <input type="hidden" name="refundId" value={refund.id} />
                  <h4 className={styles.formTitle}>
                    Enviar el reembolso de {money(refund.amount.amount)}
                  </h4>
                  <p className={styles.hint}>
                    El procesador devuelve el total al medio de pago del cliente. NEOGEN lo marca
                    como confirmado solo cuando el procesador informa el pago como reembolsado.
                  </p>
                  <Effects
                    items={[
                      { text: E.moneyMoves, strong: true },
                      { text: E.irreversible, strong: true },
                      "Avisa al cliente cuando el procesador lo confirme",
                    ]}
                  />
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
                  <summary>Registrar un reembolso sin cancelar…</summary>
                  <form action={requestRefundAction} className={styles.form}>
                    <Hidden order={order} />
                    <p className={styles.hint}>
                      Para una devolución, un paquete perdido o un cargo duplicado. Solo registra la
                      solicitud: el dinero se mueve después, al enviarla al procesador. El pedido no
                      se cancela.
                    </p>
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
                    <div className={styles.actionRow}>
                      <button type="submit" className={styles.button} data-variant="quiet">
                        Registrar solicitud de reembolso
                      </button>
                      <Effects items={[E.noMoney, E.noNotice, "Queda pendiente de enviar"]} />
                    </div>
                  </form>
                </details>
              ) : null}
            </div>

            <details className={styles.details}>
              <summary>Detalle técnico del pago</summary>
              <div className={styles.form}>
                <dl className={styles.facts}>
                  <dt>Referencia</dt>
                  <dd className={styles.mono}>{order.providerRef ?? "—"}</dd>
                  {decline ? (
                    <>
                      <dt>Código</dt>
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
                          <th scope="col">Intento</th>
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
                            <td>
                              {OPS.attemptOutcomes[a.outcome] ?? a.outcome}{" "}
                              <span className={`${styles.mono} ${styles.muted}`}>
                                ({a.outcome})
                              </span>
                            </td>
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
              </div>
            </details>
          </Section>

          {/* --------------------------------------------------- history */}
          <Section
            id="historial"
            title="Historial"
            aside={
              <span className={styles.sectionMeta}>
                {order.events.length} eventos · más reciente primero
              </span>
            }
          >
            {days.map((d) => (
              <div key={d.day} className={styles.historyDay}>
                <h3 className={styles.historyDate}>{d.day}</h3>
                <ol className={styles.timeline}>
                  {d.events.map((e) => {
                    const from = stateLabel(e, e.from);
                    const to = stateLabel(e, e.to);
                    const note = noteText(e.note);
                    const meta = e.meta
                      ? Object.entries(e.meta)
                          .filter(([, v]) => v !== null && v !== "")
                          .map(([k, v]) => `${k}=${v}`)
                          .join(" ")
                      : "";
                    const technical = [e.note && !note ? e.note : null, e.ref, meta || null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li
                        key={e.seq}
                        className={styles.event}
                        data-source={sourceOf(e)}
                        data-rejected={e.kind === "payment_event_rejected" ? "true" : undefined}
                      >
                        <span className={styles.eventTime}>
                          {timeFormat.format(new Date(e.at))}
                        </span>
                        <span className={styles.eventHead}>
                          <strong>{eventLabel(e)}</strong>
                          {from || to ? (
                            <span className={styles.eventChange}>
                              {from}
                              {from && to ? " → " : ""}
                              {to}
                            </span>
                          ) : null}
                          {note ? <span className={styles.muted}>({note})</span> : null}
                        </span>
                        <span className={styles.eventMeta}>
                          {OPS.sources[sourceOf(e)]}
                          {e.actor ? ` · ${e.actor}` : ""}
                        </span>
                        {technical ? <span className={styles.eventTech}>{technical}</span> : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </Section>
        </div>

        <div className={styles.column}>
          {/* -------------------------------------------------- customer */}
          <Section id="cliente" title="Cliente">
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
          </Section>

          {/* ----------------------------------------------------- order */}
          <Section id="pedido" title="Resumen del pedido">
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
                {order.route === "priority" ? "Prioritaria" : "Nacional"} · entrega estimada en{" "}
                {order.delivery.estimateDays}{" "}
                {order.delivery.estimateDays === 1 ? "día hábil" : "días hábiles"}
              </dd>
              <dt>Declaraciones</dt>
              <dd>
                {order.acknowledged.length ? (
                  <ul className={styles.plainList}>
                    {order.acknowledged.map((a) => (
                      <li key={a.id}>
                        {OPS.acknowledgements[a.id] ?? a.id}{" "}
                        <span className={`${styles.mono} ${styles.muted}`}>
                          v{a.version} · aceptada {dateTime.format(new Date(a.acceptedAt))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
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
          </Section>

          {/* ------------------------------------------------- inventory */}
          <Section id="existencias" title="Inventario">
            {holds.length === 0 ? (
              <p className={styles.hint}>
                Este pedido no tiene unidades reservadas: sus presentaciones no tienen conteo de
                inventario, así que se venden sin límite.
              </p>
            ) : (
              <ul className={styles.plainList}>
                {holds.map((h) => (
                  <li key={h.variantId} className={styles.holdRow}>
                    <span>
                      {h.quantity} × <span className={styles.mono}>{h.variantId}</span>
                    </span>
                    <State
                      tone={
                        h.status === "held" ? "active" : h.status === "consumed" ? "good" : "quiet"
                      }
                    >
                      {OPS.holdStatus[h.status] ?? h.status}
                    </State>
                    <span className={styles.eventMeta}>
                      {dateTime.format(new Date(h.updatedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* -------------------------------------------------- messages */}
          <Section id="mensajes" title="Mensajes">
            {messages.length === 0 ? (
              <p className={styles.hint}>
                Este pedido aún no debe ningún mensaje. Se generan al confirmarse el pago, al
                despachar, al entregar, y si se cancela o se reembolsa.
              </p>
            ) : (
              <ul className={styles.plainList}>
                {messages.map((m) => (
                  <li key={m.message.id} className={styles.messageRow}>
                    <Link href={`/ops/mensajes?id=${encodeURIComponent(m.message.id)}`}>
                      {OPS.messages[m.message.kind]}
                    </Link>
                    <State
                      tone={m.status === "sent" ? "good" : m.status === "failed" ? "bad" : "warn"}
                    >
                      {OPS.outboxShort[m.status]}
                    </State>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* ----------------------------------------------------- notes */}
          <Section
            id="notas"
            title="Notas internas"
            description="Solo las ve el equipo, nunca el cliente."
          >
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
                <span className={styles.labelText}>Nueva nota</span>
                <textarea name="text" className={styles.textarea} maxLength={1000} required />
              </label>
              <div className={styles.actionRow}>
                <button type="submit" className={styles.button} data-variant="quiet">
                  Añadir nota
                </button>
                <Effects items={["Queda en el historial", "No se puede borrar"]} />
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
              <summary>Añadir referencia externa…</summary>
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
                      pattern="[a-z][a-z0-9_\-]*"
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
          </Section>

          {/* ---------------------------------------------------- cancel */}
          {cancellable ? (
            <Section id="cancelar" title="Cancelar pedido" tone="danger">
              <form action={cancelAction} className={styles.form} data-flush="true">
                <Hidden order={order} />
                <p className={styles.hint}>
                  {paid
                    ? `Detiene la preparación y registra un reembolso total de ${money(order.totals.total.amount)}. El dinero no se mueve hasta que envíes el reembolso desde Pago.`
                    : order.state === "disputed"
                      ? "Detiene la preparación. No se registra reembolso: la disputa ya está moviendo el dinero."
                      : "El pedido no está pagado: se cancela sin cobro y sin reembolso."}
                </p>
                <Effects
                  items={
                    paid
                      ? [
                          { text: E.irreversible, strong: true },
                          E.notifies,
                          E.stockReleased,
                          "El dinero se devuelve en un segundo paso",
                        ]
                      : order.state === "disputed"
                        ? [
                            { text: E.irreversible, strong: true },
                            E.noMoney,
                            E.notifies,
                            E.stockReleased,
                          ]
                        : [{ text: E.irreversible, strong: true }, E.noMoney, E.noNotice]
                  }
                />
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
            </Section>
          ) : f !== "cancelled" && !order.cancellation ? (
            <Section id="cancelar" title="Cancelar pedido">
              <p className={styles.hint}>
                {order.state === "payment_processing"
                  ? "No se puede cancelar mientras el procesador resuelve el pago. Espera su respuesta."
                  : "No se puede cancelar: el paquete ya salió. Si vuelve, regístralo como devuelto en Envío y, si corresponde, registra un reembolso en Pago."}
              </p>
            </Section>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
