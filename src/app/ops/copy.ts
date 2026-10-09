import type { AdjustmentReason } from "@/domain/inventory";
import type { NotificationKind, OutboxStatus } from "@/domain/notifications";
import type {
  AttentionReason,
  CancellationReason,
  EventSource,
  FulfilmentState,
  HoldReason,
  OpRefusal,
  OrderEventKind,
  OrderView,
  PaymentState,
  RefundReason,
  RefundStatus,
  ShipmentState,
  ShipmentSummary,
} from "@/domain/order";

/**
 * THE CONSOLE'S VOCABULARY — Spanish, one place.
 *
 * Operations reads Spanish, whatever language the customer bought in (the
 * same decision the internal notification already made). Every state, reason
 * and refusal has exactly one label here, so the list, the detail and the
 * history cannot describe one thing three ways. An English console is a
 * second object of this shape, not a rewrite.
 */
export const OPS = {
  brand: "NEOGEN · Operaciones",
  nav: {
    orders: "Pedidos",
    inventory: "Inventario",
    messages: "Mensajes",
    content: "Contenido",
  },
  signOut: "Cerrar sesión",
  signedInAs: "Sesión",

  views: {
    attention: "Requiere atención",
    to_fulfil: "Por preparar",
    preparing: "En preparación",
    ready_to_ship: "Listos para envío",
    in_transit: "En tránsito",
    delivered: "Entregados",
    awaiting_payment: "Pendientes de pago",
    disputed: "En disputa",
    refunded: "Reembolsados",
    cancelled: "Cancelados",
    all: "Todos",
  } satisfies Record<OrderView, string>,

  payment: {
    created: "Sin pago",
    pending_payment: "Pago pendiente",
    payment_processing: "Procesando",
    paid: "Pagado",
    payment_failed: "Pago fallido",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
    disputed: "En disputa",
  } satisfies Record<PaymentState, string>,

  fulfilment: {
    unfulfilled: "Espera pago",
    queued: "En cola",
    preparing: "En preparación",
    ready_to_ship: "Listo para envío",
    fulfilled: "Despachado",
    on_hold: "En espera",
    cancelled: "Cancelado",
  } satisfies Record<FulfilmentState, string>,

  shipment: {
    not_shipped: "Sin envío",
    pending: "Reservado",
    in_transit: "En tránsito",
    exception: "Incidencia",
    delivered: "Entregado",
    returned: "Devuelto",
    cancelled: "Cancelado",
  } satisfies Record<ShipmentSummary | ShipmentState, string>,

  refund: {
    requested: "Solicitado",
    submitted: "Enviado al procesador",
    failed: "Rechazado por el procesador",
    confirmed: "Confirmado por el procesador",
  } satisfies Record<RefundStatus, string>,

  refundReasons: {
    order_cancelled: "Pedido cancelado",
    customer_request: "Solicitud del cliente",
    not_delivered: "No entregado",
    returned: "Devuelto",
    duplicate_charge: "Cargo duplicado",
    operator_other: "Otro",
  } satisfies Record<RefundReason, string>,

  cancelReasons: {
    customer_request: "Solicitud del cliente",
    payment_not_completed: "Pago no completado",
    stock_unavailable: "Sin existencias",
    fraud_suspected: "Sospecha de fraude",
    address_undeliverable: "Dirección no entregable",
    payment_refunded: "Reembolsado en el procesador",
    operator_other: "Otro",
  } satisfies Record<CancellationReason, string>,

  holdReasons: {
    payment_disputed: "Pago en disputa",
    operator: "Decisión de operaciones",
    stock_short: "Faltan existencias",
    address_check: "Verificar dirección",
  } satisfies Record<HoldReason, string>,

  attention: {
    payment_disputed: "El cargo está en disputa (contracargo). La preparación se detuvo.",
    payment_stalled: "El procesador respondió, pero el pago sigue sin resolverse tras 30 minutos.",
    paid_on_earlier_attempt:
      "Llegó un pago aprobado para un intento anterior. Puede ser un cargo doble: concilia en el procesador.",
    amount_mismatch:
      "El procesador informó un importe distinto al del pedido. El pedido no se marcó como pagado.",
    refund_open: "Hay un reembolso solicitado sin enviar al procesador.",
    refund_unconfirmed: "El reembolso se envió, pero el procesador aún no lo confirma.",
    fulfilment_on_hold: "La preparación está en espera.",
    shipment_exception: "La paquetería reportó una incidencia.",
    refunded_after_dispatch: "Se reembolsó un pedido ya despachado.",
    stock_short: "Faltaron existencias al reservar este pedido.",
  } satisfies Record<AttentionReason, string>,

  refusals: {
    not_paid: "El pedido no está pagado.",
    illegal_transition: "Ese cambio no es válido desde el estado actual.",
    dispatch_required: "«Despachado» se registra al despachar un envío.",
    not_on_hold: "El pedido no está en espera.",
    payment_in_flight: "Hay un pago en proceso. Espera la respuesta del procesador.",
    already_dispatched: "El pedido ya salió. Esto es una devolución, no una cancelación.",
    already_cancelled: "El pedido ya está cancelado.",
    shipment_active: "Ya hay un envío activo para este pedido.",
    shipment_not_found: "No existe ese envío.",
    not_ready_to_ship: "El pedido debe estar «Listo para envío».",
    line_not_found: "No existe esa línea.",
    lot_not_found: "No existe ese lote en el registro.",
    lot_wrong_variant: "El lote es de otra presentación (SKU).",
    lot_unavailable: "El lote no está disponible (cuarentena, reservado, agotado o retirado).",
    lot_expired: "El lote está caducado.",
    lot_quantity: "La cantidad asignada supera la de la línea.",
    lot_not_assigned: "Ese lote no está asignado a la línea.",
    fulfilment_closed: "La preparación ya está cerrada.",
    refund_open: "Ya hay un reembolso abierto.",
    refund_not_found: "No existe ese reembolso.",
    refund_state: "Ese reembolso no admite esta acción.",
    payment_disputed: "El cargo está en disputa; el banco resuelve el dinero.",
    nothing_to_refund: "No hay un pago que reembolsar.",
    invalid_tracking_url:
      "La URL de rastreo debe empezar con https:// e incluir un dominio completo, por ejemplo https://www.ejemplo.com/rastreo/123.",
    invalid_input: "Revisa los datos.",
    stale: "Alguien guardó esta ficha mientras la editabas. Recarga para ver la versión actual.",
    approval_blocked: "No se puede aprobar todavía. Revisa los requisitos de aprobación.",
    read_only:
      "Este entorno es de solo lectura: edita Simple Effects en local y confirma el archivo con git.",
    malformed: "El archivo de Simple Effects no es válido. Corrígelo antes de editar.",
    unreadable: "No se pudo leer el archivo de Simple Effects.",
    unknown_product: "Ese producto no existe en el catálogo publicado.",
    tag_exists: "Ya existe una etiqueta con ese identificador.",
    tag_invalid: "Una etiqueta necesita texto en español y en inglés.",
    tag_in_use: "Esa etiqueta está en uso. Quítala de las fichas antes de eliminarla.",
    bulk_empty: "No seleccionaste ninguna ficha.",
    duplicate: "Ya estaba registrado.",
    not_found: "No existe ese pedido.",
    conflict: "El pedido cambió mientras tanto. Vuelve a intentarlo.",
    no_provider: "El pedido no tiene un pago en un procesador configurado.",
    live_refunds_disabled:
      "Los reembolsos con credenciales productivas están desactivados (OPS_LIVE_REFUNDS).",
    provider_refused: "El procesador rechazó el reembolso. Quedó registrado como rechazado.",
    confirm_required: "Confirma la casilla para continuar.",
    untracked: "Ese SKU aún no tiene inventario. Registra primero un conteo.",
    below_reserved: "No puede quedar menos existencia que la reservada para pedidos.",
    invalid: "Cantidad no válida.",
  } satisfies Record<OpRefusal | string, string>,

  done: {
    advance: "Estado de preparación actualizado.",
    hold: "Preparación en espera.",
    resume: "Preparación reanudada.",
    cancel: "Pedido cancelado.",
    refund_requested: "Reembolso solicitado. Aún no se ha movido dinero.",
    refund_submitted:
      "Reembolso enviado al procesador. Se confirmará cuando el procesador lo reporte.",
    refund_confirmed: "El procesador confirmó el reembolso.",
    reconcile_settled: "El procesador respondió y el pago se actualizó.",
    reconcile_unchanged: "El procesador sigue informando el mismo estado. No se cambió nada.",
    reconcile_released:
      "El intento nunca llegó al procesador; se cerró como fallido y se liberó el inventario.",
    reconcile_unreachable: "No se pudo consultar al procesador. Inténtalo de nuevo más tarde.",
    reconcile_failed:
      "El procesador respondió, pero la respuesta no se pudo guardar. Inténtalo de nuevo.",
    reconcile_skipped: "Este pago ya no está en curso.",
    lot: "Lote actualizado.",
    shipment: "Envío registrado.",
    shipment_state: "Estado del envío actualizado.",
    tracking: "Rastreo actualizado.",
    note: "Nota añadida.",
    ack: "Marcado como revisado.",
    external: "Referencia externa añadida.",
    stock: "Inventario actualizado.",
    effects_saved: "Ficha guardada.",
    tag_added: "Etiqueta añadida.",
    tag_updated: "Etiqueta actualizada.",
    tag_deleted: "Etiqueta eliminada.",
  },

  /** A payment NEOGEN itself refused for lack of stock: the processor was never asked. */
  paymentRefusedForStock: "Sin existencias: no se envió al procesador",
  events: {
    created: "Pedido creado",
    payment_intent: "Intención de pago",
    payment_event_applied: "Pago: estado aplicado",
    payment_event_duplicate: "Pago: evento repetido",
    payment_event_rejected: "Pago: evento rechazado",
    payment_submitted: "Intento de pago",
    payment_answered: "Respuesta del procesador",
    status_changed: "Cambio de estado de pago",
    fulfilment_changed: "Preparación",
    lot_assigned: "Lote asignado",
    lot_unassigned: "Lote retirado",
    shipment_recorded: "Envío registrado",
    shipment_changed: "Envío",
    tracking_updated: "Rastreo",
    order_cancelled: "Pedido cancelado",
    refund_requested: "Reembolso solicitado",
    refund_submitted: "Reembolso enviado",
    refund_failed: "Reembolso rechazado",
    refund_confirmed: "Reembolso confirmado",
    inventory_short: "Existencias insuficientes",
    note_added: "Nota interna",
    attention_acknowledged: "Revisado",
    external_reference_added: "Referencia externa",
  } satisfies Record<OrderEventKind, string>,

  sources: {
    system: "Sistema",
    customer: "Cliente",
    provider: "Procesador",
    operator: "Operación",
  } satisfies Record<EventSource, string>,

  messages: {
    "order.placed.customer": "Cliente · pedido confirmado",
    "order.placed.internal": "Operaciones · nuevo pedido",
    "order.shipped.customer": "Cliente · pedido enviado",
    "order.tracking.customer": "Cliente · rastreo disponible",
    "order.delivered.customer": "Cliente · entregado",
    "order.cancelled.customer": "Cliente · cancelado",
    "order.refunded.customer": "Cliente · reembolso confirmado",
    "order.disputed.internal": "Operaciones · disputa",
  } satisfies Record<NotificationKind, string>,

  outbox: {
    pending: "Pendiente — sin proveedor de correo; no se ha enviado",
    sent: "Enviado (aceptado por el proveedor)",
    failed: "Falló el envío",
  } satisfies Record<OutboxStatus, string>,

  adjustments: {
    initial_count: "Conteo inicial",
    cycle_count: "Conteo cíclico",
    receipt: "Recepción",
    damaged: "Dañado",
    expired: "Caducado",
    return_restock: "Devolución reintegrada",
    correction: "Corrección",
  } satisfies Record<AdjustmentReason, string>,
};

/** "hace 3 h", "hace 2 d" — order age at a glance. */
export function age(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export const money = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

/**
 * SIMPLE EFFECTS — the console's words for the owner-authored layer
 * (`content/effects`). Kept apart from the order vocabulary above.
 */
export const EFFECTS = {
  title: "Simple Effects",
  eyebrow: "Contenido · capa editorial",
  intro:
    "Etiquetas y una frase sencilla por producto, escritas por el equipo. No es el registro científico: solo se publica lo aprobado, después de volver a compilar el sitio.",
  status: { draft: "Borrador", review: "En revisión", approved: "Aprobado" },
  filters: {
    all: "Todos",
    empty: "Sin contenido",
    draft: "Borradores",
    review: "En revisión",
    approved: "Aprobados",
    flagged: "Con avisos",
  },
  source: { manual: "Escrito en el editor", import: "Importado (p. ej., borrador de IA)" },
  findings: {
    forbidden_term: "Lenguaje de instrucción de uso",
    personal_recommendation: "Recomendación personal",
    unknown_tag: "Etiqueta desconocida",
    strong_effect: "Afirmación de efecto fuerte",
    therapeutic_claim: "Lenguaje de tratamiento",
    missing_translation: "Falta la traducción",
    no_tags: "Sin etiquetas",
    too_many_tags: "Muchas etiquetas",
    too_long: "Descripción larga",
  },
  /** Wording warnings are advisory; only an unknown tag stops approval. */
  advisory: "Avisos editoriales: no impiden guardar ni aprobar. La decisión de publicar es tuya.",
  findingHelp: {
    unknown_tag: "Impide aprobar: la etiqueta no existe en el vocabulario.",
  } as Record<string, string>,
  blockers: {
    description_es: "Falta la descripción en español",
    description_en: "Falta la descripción en inglés",
    unknown_tags: "Hay etiquetas que no existen en el vocabulario",
  } as Record<string, string>,
  plan: {
    new: "Nueva",
    changed: "Cambia",
    unchanged: "Sin cambios",
    empty: "Vacía (se ignora)",
    error: "Error",
  },
  planNotes: {
    name_differs: "El nombre no coincide con el catálogo (se usa el slug)",
    notes_ignored_on_unchanged: "Notas ignoradas: el texto no cambió",
  } as Record<string, string>,
  problems: {
    empty: "No hay nada que importar.",
    json_invalid: "El JSON no es válido.",
    json_shape: "El JSON debe ser una lista de filas (como la exportación).",
    csv_no_slug: "El CSV necesita una columna «slug».",
  } as Record<string, string>,
};
