import Link from "next/link";

import { activeProvider } from "@/payments";
import { logoutAction } from "@/server/ops/actions";
import { orderRepository, storageKind } from "@/server/persistence";

import { OPS } from "./copy";
import styles from "./ops.module.css";

import type { FulfilmentState, PaymentState, ShipmentState, ShipmentSummary } from "@/domain/order";

type Section = "orders" | "inventory" | "messages" | "content";

const LINKS: readonly { id: Section; href: string }[] = [
  { id: "orders", href: "/ops/pedidos" },
  { id: "inventory", href: "/ops/inventario" },
  { id: "messages", href: "/ops/mensajes" },
  { id: "content", href: "/ops/contenido/efectos" },
];

/**
 * The console frame: four sections, who is signed in, and — always visible —
 * what kind of environment this is. An operator must never have to wonder
 * whether a payment here is real money, or whether an order here will last.
 * "Pedidos" carries the number of orders that need a person, from the same
 * count the order list uses.
 */
export async function Shell({
  current,
  operator,
  children,
}: {
  current: Section;
  operator: string;
  children: React.ReactNode;
}) {
  const now = new Date().toISOString();
  let attention = 0;
  try {
    attention = (await orderRepository().counts(now)).attention;
  } catch {
    /* The bar must render even if the store is unreachable; the page says why. */
  }
  const provider = activeProvider();
  const notices: { text: string; tone: "warn" | "quiet" }[] = [];
  if (!provider.isConfigured()) {
    notices.push({ text: "Pagos sin configurar", tone: "quiet" });
  } else if (provider.mode() === "test") {
    notices.push({ text: "Pagos en modo de prueba", tone: "warn" });
  }
  if (storageKind() === "memory") {
    notices.push({ text: "Datos en memoria: se pierden al reiniciar", tone: "warn" });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link href="/ops/pedidos" className={styles.brand}>
          {OPS.brand}
        </Link>
        <nav aria-label="Operaciones" className={styles.nav}>
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={styles.navLink}
              aria-current={l.id === current ? "page" : undefined}
            >
              {OPS.nav[l.id]}
              {l.id === "orders" && attention > 0 ? (
                <span className={styles.navAlert}>
                  {attention}
                  <span className="sr-only"> requieren atención</span>
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className={styles.barEnd}>
          {notices.map((n) => (
            <span key={n.text} className={styles.envNotice} data-tone={n.tone}>
              {n.text}
            </span>
          ))}
          <form action={logoutAction} className={styles.session}>
            <span>
              {OPS.signedInAs}: {operator}
            </span>
            <button type="submit" className={styles.signOut}>
              {OPS.signOut}
            </button>
          </form>
        </div>
      </header>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}

type Tone = "good" | "bad" | "wait" | "quiet";

const PAYMENT_TONE: Record<PaymentState, Tone> = {
  created: "quiet",
  pending_payment: "wait",
  payment_processing: "wait",
  paid: "good",
  payment_failed: "bad",
  cancelled: "quiet",
  refunded: "quiet",
  disputed: "bad",
};

const FULFILMENT_TONE: Record<FulfilmentState, Tone> = {
  unfulfilled: "quiet",
  queued: "wait",
  preparing: "wait",
  ready_to_ship: "wait",
  fulfilled: "good",
  on_hold: "bad",
  cancelled: "quiet",
};

const SHIPMENT_TONE: Record<ShipmentSummary, Tone> = {
  not_shipped: "quiet",
  pending: "wait",
  in_transit: "wait",
  exception: "bad",
  delivered: "good",
  returned: "quiet",
  cancelled: "quiet",
};

/** One chip per axis, labelled so a screen reader hears which axis it is. */
export function AxisChip({
  axis,
  state,
}:
  | { axis: "payment"; state: PaymentState }
  | { axis: "fulfilment"; state: FulfilmentState }
  | { axis: "shipment"; state: ShipmentSummary | ShipmentState }) {
  const [label, tone, prefix] =
    axis === "payment"
      ? [OPS.payment[state as PaymentState], PAYMENT_TONE[state as PaymentState], "Pago"]
      : axis === "fulfilment"
        ? [
            OPS.fulfilment[state as FulfilmentState],
            FULFILMENT_TONE[state as FulfilmentState],
            "Preparación",
          ]
        : [
            OPS.shipment[state as ShipmentSummary],
            SHIPMENT_TONE[state as ShipmentSummary],
            "Envío",
          ];
  return (
    <span className={styles.chip} data-tone={tone}>
      <span className="sr-only">{prefix}: </span>
      {label}
    </span>
  );
}

/** `?ok=` / `?error=` from an action, as one sentence from the copy. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  const done = OPS.done as Record<string, string>;
  const refusals = OPS.refusals as Record<string, string>;
  if (ok && done[ok]) {
    return (
      <p className={styles.flash} data-tone="ok" role="status">
        {done[ok]}
      </p>
    );
  }
  if (error) {
    return (
      <p className={styles.flash} data-tone="error" role="alert">
        {refusals[error] ?? OPS.refusals.invalid_input}
      </p>
    );
  }
  return null;
}
