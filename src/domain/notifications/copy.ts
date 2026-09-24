import type { Locale } from "@/i18n/config";
import type { NotificationKind } from "./types";

/**
 * EMAIL COPY — ES and EN, reviewed as copy, rendered by `render.ts`.
 *
 * WHAT THESE EMAILS NEVER SAY: a delivery date, a delivery promise, a courier
 * NEOGEN did not name on the shipment, how long a bank takes to credit a
 * refund, anything about what a compound does, or any legal term. They state
 * what happened to the order — facts NEOGEN recorded — and where to read
 * more. The order-received email repeats the delivery ESTIMATE the checkout
 * already showed, in the checkout's own words ("business days", "estimate").
 *
 * `check:content` runs the same forbidden-term scan over this file as over
 * the site dictionaries.
 */
export interface EmailCopy {
  greeting: (name: string) => string;
  referenceLabel: string;
  itemsLabel: string;
  subtotal: string;
  shipping: string;
  shippingFree: string;
  total: string;
  statusLink: string;
  statusLinkAbsent: string;
  contactLine: string;
  footer: string;
  estimate: (days: number) => string;
  carrier: string;
  service: string;
  tracking: string;
  trackingLink: string;
  kinds: Record<
    NotificationKind,
    { subject: (id: string) => string; heading: string; body: string }
  >;
}

const es: EmailCopy = {
  greeting: (name) => `Hola, ${name}:`,
  referenceLabel: "Referencia del pedido",
  itemsLabel: "Artículos",
  subtotal: "Subtotal",
  shipping: "Envío",
  shippingFree: "Gratis",
  total: "Total",
  statusLink: "Ver el estado del pedido",
  statusLinkAbsent: "Conserva la referencia: es la forma de identificar tu pedido.",
  contactLine: "Para cualquier pregunta, el canal directo de NEOGEN es su teléfono:",
  footer: "Recibes este correo porque realizaste un pedido en NEOGEN.",
  estimate: (days) => `Estimado de entrega: ${days} ${days === 1 ? "día hábil" : "días hábiles"}.`,
  carrier: "Paquetería",
  service: "Servicio",
  tracking: "Número de rastreo",
  trackingLink: "Rastrear en la página de la paquetería",
  kinds: {
    "order.placed.customer": {
      subject: (id) => `Pedido confirmado · ${id}`,
      heading: "Tu pago está confirmado",
      body: "El procesador confirmó el pago de tu pedido.",
    },
    "order.placed.internal": {
      subject: (id) => `Nuevo pedido pagado · ${id}`,
      heading: "Nuevo pedido pagado",
      body: "El procesador confirmó el pago. El pedido está en la cola de preparación.",
    },
    "order.shipped.customer": {
      subject: (id) => `Tu pedido salió · ${id}`,
      heading: "Tu pedido va en camino",
      body: "Entregamos tu pedido a la paquetería.",
    },
    "order.tracking.customer": {
      subject: (id) => `Rastreo de tu pedido · ${id}`,
      heading: "Ya puedes rastrear tu pedido",
      body: "Estos son los datos de rastreo de tu envío.",
    },
    "order.delivered.customer": {
      subject: (id) => `Pedido entregado · ${id}`,
      heading: "Tu pedido fue entregado",
      body: "La paquetería reporta tu pedido como entregado.",
    },
    "order.cancelled.customer": {
      subject: (id) => `Pedido cancelado · ${id}`,
      heading: "Tu pedido fue cancelado",
      body: "Tu pedido fue cancelado y no se enviará.",
    },
    "order.refunded.customer": {
      subject: (id) => `Reembolso confirmado · ${id}`,
      heading: "Tu reembolso está confirmado",
      body: "El procesador confirmó el reembolso de este importe a tu método de pago. Cuándo se refleja depende de tu banco.",
    },
    "order.disputed.internal": {
      subject: (id) => `Disputa de cargo · ${id}`,
      heading: "Un cargo está en disputa",
      body: "El titular disputó el cargo con su banco. La preparación se detuvo. Revisa el pedido en la consola.",
    },
  },
};

const en: EmailCopy = {
  greeting: (name) => `Hello ${name},`,
  referenceLabel: "Order reference",
  itemsLabel: "Items",
  subtotal: "Subtotal",
  shipping: "Shipping",
  shippingFree: "Free",
  total: "Total",
  statusLink: "View your order status",
  statusLinkAbsent: "Keep the reference: it is how your order is identified.",
  contactLine: "For any question, NEOGEN's direct channel is its phone line:",
  footer: "You are receiving this email because you placed an order with NEOGEN.",
  estimate: (days) => `Delivery estimate: ${days} business ${days === 1 ? "day" : "days"}.`,
  carrier: "Carrier",
  service: "Service",
  tracking: "Tracking number",
  trackingLink: "Track on the carrier's site",
  kinds: {
    "order.placed.customer": {
      subject: (id) => `Order confirmed · ${id}`,
      heading: "Your payment is confirmed",
      body: "The payment processor confirmed payment for your order.",
    },
    "order.placed.internal": {
      subject: (id) => `New paid order · ${id}`,
      heading: "New paid order",
      body: "The payment processor confirmed payment. The order is in the preparation queue.",
    },
    "order.shipped.customer": {
      subject: (id) => `Your order has shipped · ${id}`,
      heading: "Your order is on its way",
      body: "We handed your order to the carrier.",
    },
    "order.tracking.customer": {
      subject: (id) => `Tracking for your order · ${id}`,
      heading: "You can now track your order",
      body: "These are the tracking details for your shipment.",
    },
    "order.delivered.customer": {
      subject: (id) => `Order delivered · ${id}`,
      heading: "Your order was delivered",
      body: "The carrier reports your order as delivered.",
    },
    "order.cancelled.customer": {
      subject: (id) => `Order cancelled · ${id}`,
      heading: "Your order was cancelled",
      body: "Your order was cancelled and will not ship.",
    },
    "order.refunded.customer": {
      subject: (id) => `Refund confirmed · ${id}`,
      heading: "Your refund is confirmed",
      body: "The payment processor confirmed the refund of this amount to your payment method. When it appears depends on your bank.",
    },
    "order.disputed.internal": {
      subject: (id) => `Payment dispute · ${id}`,
      heading: "A charge is disputed",
      body: "The cardholder disputed the charge with their bank. Preparation stopped. Review the order in the console.",
    },
  },
};

export const EMAIL_COPY: Readonly<Record<Locale, EmailCopy>> = { es, en };
