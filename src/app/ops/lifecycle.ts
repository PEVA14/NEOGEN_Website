import { activeShipment, attentionReasons, openRefund, shipmentSummary } from "@/domain/order";

import { money, OPS } from "./copy";

import type { AttentionReason, Order } from "@/domain/order";

/**
 * HOW THE CONSOLE READS AN ORDER — presentation only.
 *
 * Every answer here is DERIVED from the order's existing state and the
 * domain's own helpers. Nothing in this file decides what is legal: the
 * domain (`domain/order/operations.ts`) and the server actions refuse
 * anything that is not, whatever a button says. This only turns three axes,
 * a refund list and an attention list into "where is it, and what now?".
 */

export type Tone = "good" | "warn" | "bad" | "quiet" | "active";

/* ------------------------------------------------------------- next step */

/** An action the next-step block may offer — each one an EXISTING server action. */
export type NextAction =
  | { type: "advance"; to: "preparing" | "ready_to_ship"; label: string }
  | { type: "resume"; label: string }
  | { type: "shipment"; shipmentId: string; to: "in_transit" | "delivered"; label: string }
  | { type: "reconcile"; label: string }
  | { type: "jump"; href: string; label: string };

export interface NextStep {
  /** act = there is work for NEOGEN; wait = nothing to do yet; problem = a person must look; done = finished. */
  kind: "act" | "wait" | "problem" | "done";
  /** The step, short — what a list row shows. */
  short: string;
  /** The step as a sentence. */
  title: string;
  /** Why, and what happens next. */
  detail: string;
  action: NextAction | null;
}

/**
 * The one thing this order most likely needs. The branches and their order
 * are the console's original "next step" rules; the words now say what each
 * action does and what follows it.
 */
export function nextStep(order: Order, now: string): NextStep {
  const f = order.fulfilment.state;
  const paid = order.state === "paid";
  const active = activeShipment(order);
  const refund = openRefund(order);
  const reasons = attentionReasons(order, now);

  if (refund && (refund.status === "requested" || refund.status === "failed")) {
    return {
      kind: "problem",
      short: "Enviar reembolso",
      title: `Envía el reembolso de ${money(refund.amount.amount)} al procesador.`,
      detail:
        refund.status === "failed"
          ? "El procesador rechazó el intento anterior. Revísalo y vuelve a enviarlo desde Pago."
          : "El reembolso está registrado, pero el dinero aún no se devuelve: se mueve solo al enviarlo desde Pago.",
      action: { type: "jump", href: "#pago", label: "Ir al reembolso" },
    };
  }
  if (refund && refund.status === "submitted") {
    return {
      kind: "wait",
      short: "Esperando confirmación del reembolso",
      title: "Esperando que el procesador confirme el reembolso.",
      detail:
        "La solicitud ya se envió. Se marcará como reembolsado cuando el procesador lo informe.",
      action: null,
    };
  }
  if (order.state === "disputed") {
    return {
      kind: "problem",
      short: "Disputa: no preparar",
      title: "Cargo en disputa. No prepares ni envíes este pedido.",
      detail:
        "El banco del cliente abrió un contracargo y la preparación se detuvo. La disputa se resuelve con el procesador, no aquí.",
      action: null,
    };
  }
  if (!paid && f !== "cancelled") {
    if (order.state === "payment_processing" || order.state === "pending_payment") {
      const stalled = reasons.includes("payment_stalled");
      return {
        kind: stalled ? "problem" : "wait",
        short: stalled ? "Revisar el pago" : "Esperando pago",
        title: stalled
          ? "El pago lleva demasiado tiempo sin resolverse."
          : "Esperando la respuesta del procesador.",
        detail:
          "No prepares nada todavía. Puedes preguntarle al procesador cómo va; solo se aplica lo que él responda.",
        action: { type: "reconcile", label: "Revisar con el procesador" },
      };
    }
    if (order.state === "payment_failed") {
      return {
        kind: "wait",
        short: "Pago fallido",
        title: "El pago no se completó.",
        detail: "El cliente puede volver a intentarlo. No hay nada que preparar.",
        action: null,
      };
    }
    return {
      kind: "wait",
      short: "Sin pago",
      title: "El cliente aún no paga.",
      detail: "El pedido existe, pero no se ha cobrado nada. No hay nada que preparar.",
      action: null,
    };
  }
  if (f === "on_hold") {
    const hold = order.fulfilment.hold;
    return {
      kind: "problem",
      short: "En espera",
      title: `En espera${hold ? `: ${OPS.holdReasons[hold.reason].toLowerCase()}` : ""}.`,
      detail: hold
        ? `Nada avanza hasta reanudarlo. Al reanudar vuelve a «${OPS.fulfilment[hold.from]}».`
        : "Nada avanza hasta reanudarlo.",
      action: { type: "resume", label: "Reanudar" },
    };
  }
  if (f === "queued") {
    return {
      kind: "act",
      short: "Iniciar preparación",
      title: "Pagado y en cola. Empieza a prepararlo.",
      detail: "Pasa a «En preparación». Se puede regresar a la cola. No avisa al cliente.",
      action: { type: "advance", to: "preparing", label: "Iniciar preparación" },
    };
  }
  if (f === "preparing") {
    return {
      kind: "act",
      short: "Marcar listo para envío",
      title: "En preparación. Márcalo cuando esté empacado.",
      detail: "Pasa a «Listo para envío». Se puede reabrir. No avisa al cliente.",
      action: { type: "advance", to: "ready_to_ship", label: "Listo para envío" },
    };
  }
  if (f === "ready_to_ship" && (!active || active.state === "returned")) {
    return {
      kind: "act",
      short: "Registrar envío",
      title: "Empacado. Registra el envío que contrataste.",
      detail:
        "Anota la paquetería y el rastreo. Si ya recogieron el paquete, se despacha al registrarlo y se avisa al cliente.",
      action: { type: "jump", href: "#envio", label: "Registrar envío" },
    };
  }
  if (active?.state === "pending") {
    return {
      kind: "act",
      short: "Despachar",
      title: "Envío reservado. Despáchalo cuando la paquetería lo recoja.",
      detail:
        "Al despachar, el paquete sale del almacén y se avisa al cliente. No se puede deshacer.",
      action: { type: "shipment", shipmentId: active.id, to: "in_transit", label: "Despachar" },
    };
  }
  if (active?.state === "exception") {
    return {
      kind: "problem",
      short: "Resolver incidencia",
      title: "La paquetería reportó una incidencia.",
      detail:
        "Resuélvela con la paquetería. Después márcalo de nuevo en tránsito, entregado o devuelto en Envío.",
      action: { type: "jump", href: "#envio", label: "Ver envío" },
    };
  }
  if (active?.state === "in_transit") {
    return {
      kind: "act",
      short: "Confirmar entrega",
      title: "En camino. Márcalo entregado cuando la paquetería lo confirme.",
      detail: "Al marcarlo entregado se avisa al cliente.",
      action: {
        type: "shipment",
        shipmentId: active.id,
        to: "delivered",
        label: "Marcar entregado",
      },
    };
  }
  return {
    kind: "done",
    short: "Nada pendiente",
    title:
      active?.state === "delivered"
        ? "Entregado. Nada pendiente."
        : f === "cancelled"
          ? order.state === "refunded"
            ? "Cancelado y reembolsado. Nada pendiente."
            : "Cancelado. Nada pendiente."
          : active?.state === "returned"
            ? "El paquete volvió a NEOGEN."
            : "Nada pendiente.",
    detail:
      active?.state === "returned"
        ? "Si el producto vuelve a venderse, regístralo en Inventario como «Devolución reintegrada»."
        : "",
    action: null,
  };
}

/* ------------------------------------------------------------- lifecycle */

export type StepStatus = "done" | "current" | "upcoming" | "problem" | "stopped";

export interface LifecycleStep {
  key: "payment" | "preparation" | "shipping" | "delivery";
  label: string;
  status: StepStatus;
  caption: string;
  at: string | null;
}

/**
 * Payment → Preparation → Shipping → Delivery, with exceptions marked where
 * they happened. Read from the three axes and the milestones; nothing new.
 */
export function lifecycle(order: Order, now: string): LifecycleStep[] {
  const m = order.milestones;
  const f = order.fulfilment.state;
  const ship = shipmentSummary(order);
  const reasons = attentionReasons(order, now);
  const cancelled = f === "cancelled" || order.state === "cancelled";

  const paymentStatus: StepStatus =
    order.state === "paid" || order.state === "refunded"
      ? m.paid
        ? "done"
        : "stopped"
      : order.state === "disputed" || order.state === "payment_failed"
        ? "problem"
        : order.state === "cancelled"
          ? "stopped"
          : reasons.includes("payment_stalled")
            ? "problem"
            : "current";
  const payment: LifecycleStep = {
    key: "payment",
    label: "Pago",
    status: paymentStatus,
    caption:
      order.state === "refunded" && m.paid ? "Pagado, luego reembolsado" : OPS.payment[order.state],
    at: m.paid ?? null,
  };

  const paidOnce = Boolean(m.paid);
  let preparation: LifecycleStep;
  if (f === "on_hold") {
    preparation = {
      key: "preparation",
      label: "Preparación",
      status: "problem",
      caption: "En espera",
      at: null,
    };
  } else if (f === "preparing" || f === "queued") {
    preparation = {
      key: "preparation",
      label: "Preparación",
      status: "current",
      caption: OPS.fulfilment[f],
      at: f === "preparing" ? (m.preparing ?? null) : (m.queued ?? null),
    };
  } else if (f === "ready_to_ship" || f === "fulfilled") {
    preparation = {
      key: "preparation",
      label: "Preparación",
      status: "done",
      caption: "Empacado",
      at: m.ready ?? null,
    };
  } else if (cancelled) {
    preparation = {
      key: "preparation",
      label: "Preparación",
      status: "stopped",
      caption: m.ready ? "Empacado, luego cancelado" : "No se preparó",
      at: null,
    };
  } else {
    preparation = {
      key: "preparation",
      label: "Preparación",
      status: "upcoming",
      caption: paidOnce ? "En cola" : "Espera el pago",
      at: null,
    };
  }

  let shipping: LifecycleStep;
  let delivery: LifecycleStep;
  if (ship === "delivered") {
    shipping = {
      key: "shipping",
      label: "Envío",
      status: "done",
      caption: "Despachado",
      at: m.shipped ?? null,
    };
    delivery = {
      key: "delivery",
      label: "Entrega",
      status: "done",
      caption: "Entregado",
      at: m.delivered ?? null,
    };
  } else if (ship === "in_transit" || ship === "exception") {
    shipping = {
      key: "shipping",
      label: "Envío",
      status: "done",
      caption: "Despachado",
      at: m.shipped ?? null,
    };
    delivery = {
      key: "delivery",
      label: "Entrega",
      status: ship === "exception" ? "problem" : "current",
      caption: ship === "exception" ? "Incidencia" : "En camino",
      at: null,
    };
  } else if (ship === "returned") {
    shipping = {
      key: "shipping",
      label: "Envío",
      status: "done",
      caption: "Despachado",
      at: m.shipped ?? null,
    };
    delivery = {
      key: "delivery",
      label: "Entrega",
      status: "stopped",
      caption: "Devuelto",
      at: null,
    };
  } else if (ship === "pending") {
    shipping = {
      key: "shipping",
      label: "Envío",
      status: "current",
      caption: "Reservado, sin recoger",
      at: null,
    };
    delivery = { key: "delivery", label: "Entrega", status: "upcoming", caption: "—", at: null };
  } else if (cancelled) {
    shipping = {
      key: "shipping",
      label: "Envío",
      status: "stopped",
      caption: "No se envió",
      at: null,
    };
    delivery = { key: "delivery", label: "Entrega", status: "stopped", caption: "—", at: null };
  } else {
    shipping = {
      key: "shipping",
      label: "Envío",
      status: f === "ready_to_ship" ? "current" : "upcoming",
      caption: f === "ready_to_ship" ? "Por registrar" : "—",
      at: null,
    };
    delivery = { key: "delivery", label: "Entrega", status: "upcoming", caption: "—", at: null };
  }

  return [payment, preparation, shipping, delivery];
}

/** The exception that frames the whole order, if any — said once, above the lifecycle. */
export function exceptionLabel(order: Order): { label: string; tone: Tone } | null {
  if (order.cancellation || order.fulfilment.state === "cancelled") {
    return {
      label: order.state === "refunded" ? "Cancelado y reembolsado" : "Cancelado",
      tone: "quiet",
    };
  }
  if (order.state === "refunded") return { label: "Reembolsado", tone: "quiet" };
  if (order.state === "disputed") return { label: "En disputa", tone: "bad" };
  return null;
}

/* ----------------------------------------------------------- state tones */

export const PAYMENT_TONE: Record<Order["state"], Tone> = {
  created: "quiet",
  pending_payment: "warn",
  payment_processing: "warn",
  paid: "good",
  payment_failed: "bad",
  cancelled: "quiet",
  refunded: "quiet",
  disputed: "bad",
};

export const FULFILMENT_TONE: Record<Order["fulfilment"]["state"], Tone> = {
  unfulfilled: "quiet",
  queued: "active",
  preparing: "active",
  ready_to_ship: "active",
  fulfilled: "good",
  on_hold: "warn",
  cancelled: "quiet",
};

export const SHIPMENT_TONE: Record<ReturnType<typeof shipmentSummary>, Tone> = {
  not_shipped: "quiet",
  pending: "active",
  in_transit: "active",
  exception: "bad",
  delivered: "good",
  returned: "quiet",
  cancelled: "quiet",
};

export const NEXT_TONE: Record<NextStep["kind"], Tone> = {
  act: "active",
  wait: "quiet",
  problem: "bad",
  done: "good",
};

/** The first reason that needs a person, short, for a list row. */
export function firstAttention(order: Order, now: string): AttentionReason | null {
  return attentionReasons(order, now)[0] ?? null;
}

/** "Semaglutide 30 mg ×1, GLOW 70 mg ×1" — products in words, for scanning. */
export function itemsSummary(order: Order, max = 2): string {
  const parts = order.lines
    .slice(0, max)
    .map((l) => `${l.name} ${l.presentation}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`);
  const more = order.lines.length - max;
  return more > 0 ? `${parts.join(", ")} y ${more} más` : parts.join(", ");
}

/** A history note code, in words; an unknown code stays as written. */
export function noteText(note: string | null): string | null {
  if (!note) return null;
  const attempt = note.match(/^attempt_(\d+)$/);
  if (attempt) return `intento ${attempt[1]}`;
  const holds = OPS.holdReasons as Record<string, string>;
  const cancels = OPS.cancelReasons as Record<string, string>;
  const refunds = OPS.refundReasons as Record<string, string>;
  return (
    OPS.eventNotes[note] ??
    holds[note]?.toLowerCase() ??
    cancels[note]?.toLowerCase() ??
    refunds[note]?.toLowerCase() ??
    OPS.declines[note]?.toLowerCase() ??
    null
  );
}
