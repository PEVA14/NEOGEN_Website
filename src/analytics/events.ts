/**
 * THE COMMERCE FUNNEL — one taxonomy, no vendor.
 *
 * Six events, named for what happened, carrying only what a funnel needs:
 * SKUs, quantities, prices and step names. NEVER a name, email, phone,
 * address, order-status link, payment token or free text — there is no field
 * for any of them, and `sanitize` drops anything not declared here.
 *
 * NO ANALYTICS PRODUCT IS INTEGRATED. Events go to whichever `AnalyticsSink`
 * is registered (`client.ts`, `server.ts`), and the default is none. On the
 * client each event is also dispatched as a DOM `neogen:analytics`
 * CustomEvent, so a tag manager or a future adapter can listen without this
 * code knowing its name. Choosing a product — and whether its cookies need
 * consent under Mexican privacy law — is an owner decision.
 */
export interface FunnelItem {
  /** The SKU (variant id). */
  sku: string;
  quantity: number;
  /** Whole MXN, per unit. */
  price: number;
}

export type CheckoutStep = "contact" | "shipping" | "delivery" | "review";

export type FunnelEvent =
  | { name: "product_viewed"; sku: string | null; product: string }
  | { name: "bag_added"; item: FunnelItem }
  | { name: "checkout_started"; items: readonly FunnelItem[]; value: number }
  | { name: "checkout_progressed"; step: CheckoutStep }
  | { name: "payment_attempted"; value: number }
  | { name: "purchase_completed"; items: readonly FunnelItem[]; value: number };

export type FunnelEventName = FunnelEvent["name"];

export const FUNNEL_EVENTS: readonly FunnelEventName[] = [
  "product_viewed",
  "bag_added",
  "checkout_started",
  "checkout_progressed",
  "payment_attempted",
  "purchase_completed",
];

export interface AnalyticsSink {
  readonly id: string;
  isConfigured(): boolean;
  send(event: FunnelEvent & { at: string; currency: "MXN" }): void;
}

export const noneSink: AnalyticsSink = {
  id: "none",
  isConfigured: () => false,
  send: () => undefined,
};

const SKU = /^[a-z0-9][a-z0-9-]{0,79}$/;
const item = (i: FunnelItem): FunnelItem | null =>
  SKU.test(i.sku) && Number.isInteger(i.quantity) && i.quantity > 0 && Number.isFinite(i.price)
    ? { sku: i.sku, quantity: i.quantity, price: i.price }
    : null;
const items = (list: readonly FunnelItem[]) =>
  list
    .map(item)
    .filter((i): i is FunnelItem => i !== null)
    .slice(0, 100);
const amount = (n: number) => (Number.isFinite(n) && n >= 0 ? Math.round(n) : 0);

/**
 * Copy only the declared fields, in the declared shapes. An event built from
 * a wider object (an order, a draft) cannot carry the rest of it along.
 */
export function sanitize(event: FunnelEvent): FunnelEvent | null {
  switch (event.name) {
    case "product_viewed":
      return SKU.test(event.product)
        ? {
            name: event.name,
            product: event.product,
            sku: event.sku && SKU.test(event.sku) ? event.sku : null,
          }
        : null;
    case "bag_added": {
      const i = item(event.item);
      return i ? { name: event.name, item: i } : null;
    }
    case "checkout_started":
    case "purchase_completed":
      return { name: event.name, items: items(event.items), value: amount(event.value) };
    case "checkout_progressed":
      return ["contact", "shipping", "delivery", "review"].includes(event.step)
        ? { name: event.name, step: event.step }
        : null;
    case "payment_attempted":
      return { name: event.name, value: amount(event.value) };
  }
}
