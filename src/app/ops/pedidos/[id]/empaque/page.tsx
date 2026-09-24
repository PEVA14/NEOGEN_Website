import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAddress, formatPhoneDisplay } from "@/domain/checkout";
import { isOrderId } from "@/payments/instrument";
import { requireOperator } from "@/server/ops/auth";
import { orderRepository } from "@/server/persistence";

import { dateTime, OPS } from "../../../copy";
import styles from "../../../ops.module.css";
import slip from "./slip.module.css";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hoja de empaque" };

/**
 * THE PACKING SLIP — printed, checked off by hand, put in the box or kept.
 *
 * What a packer needs and nothing else: the NEOGEN order number, who it goes
 * to, and each line as SKU, product, presentation and quantity, with the lots
 * assigned so far and a box to tick. No prices (a slip travels with the
 * parcel), and no warehouse locations — NEOGEN has not defined any, so the
 * slip does not invent a bin.
 */
export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  if (!isOrderId(id)) notFound();
  const order = await orderRepository().get(id);
  if (!order) notFound();
  const units = order.lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <main id="main-content" className={slip.page}>
      <p className={`${slip.tools} ${styles.noPrint}`}>
        <Link href={`/ops/pedidos/${order.id}`} className={styles.rowLink}>
          ← {order.id}
        </Link>
        <span className={styles.hint}>Imprime con Ctrl/Cmd + P.</span>
      </p>

      <header className={slip.head}>
        <div>
          <p className={styles.eyebrow}>NEOGEN · Hoja de empaque</p>
          <h1 className={slip.reference}>{order.id}</h1>
          <p className={styles.hint}>
            {dateTime.format(new Date(order.createdAt))} · {units} unidades · {order.lines.length}{" "}
            SKU
          </p>
        </div>
        <p className={slip.state}>
          Preparación: <strong>{OPS.fulfilment[order.fulfilment.state]}</strong>
          <br />
          Pago: <strong>{OPS.payment[order.state]}</strong>
        </p>
      </header>

      {order.state !== "paid" ? (
        <p className={styles.flash} data-tone="error" role="alert">
          Este pedido NO está pagado. No se empaca.
        </p>
      ) : null}

      <section className={slip.shipTo} aria-labelledby="ship-to">
        <h2 id="ship-to" className={styles.panelTitle}>
          Enviar a
        </h2>
        <p className={slip.address}>
          <strong>{order.shipping.recipient}</strong>
          <br />
          {formatAddress(order.shipping)}
          <br />
          {formatPhoneDisplay(order.contact.phone)}
        </p>
        {order.shipping.notes ? <p className={slip.notes}>{order.shipping.notes}</p> : null}
      </section>

      <table className={slip.table}>
        <caption className="sr-only">Artículos a empacar</caption>
        <thead>
          <tr>
            <th scope="col" aria-label="Empacado" />
            <th scope="col">SKU</th>
            <th scope="col">Producto</th>
            <th scope="col">Presentación</th>
            <th scope="col" className={slip.qty}>
              Cant.
            </th>
            <th scope="col">Lote(s)</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, index) => {
            const lots = order.fulfilment.lots.filter((a) => a.line === index);
            return (
              <tr key={index}>
                <td>
                  <span className={slip.box} aria-hidden="true" />
                </td>
                <td className={slip.sku}>{line.variantId}</td>
                <td>{line.name}</td>
                <td>{line.presentation}</td>
                <td className={slip.qty}>{line.quantity}</td>
                <td className={slip.sku}>
                  {lots.length
                    ? lots.map((l) => `${l.lotId} ×${l.quantity}`).join(", ")
                    : "________________"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer className={slip.sign}>
        <span>Empacó: ______________________</span>
        <span>Revisó: ______________________</span>
        <span>Fecha: ______________</span>
      </footer>
    </main>
  );
}
