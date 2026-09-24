import Link from "next/link";

import { renderEmail } from "@/domain/notifications/render";
import { activeChannel, renderContextFor } from "@/server/notifications";
import { requireOperator } from "@/server/ops/auth";
import { orderAccessConfigured } from "@/server/orderAccess";
import { notificationOutbox } from "@/server/persistence";

import { dateTime, OPS } from "../copy";
import styles from "../ops.module.css";
import { Shell } from "../Shell";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

/**
 * THE OUTBOX — every message an order is owed, and whether it went.
 *
 * With no email provider configured every entry is `pending`, and the page
 * says "not sent" in those words: a queued message is not a delivered one.
 * Selecting an entry previews exactly what would be sent — the same
 * `renderEmail` a channel adapter will call — in a sandboxed frame with no
 * scripts. The preview's status link is omitted: it is a credential.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const operator = await requireOperator();
  const { id } = await searchParams;
  const outbox = notificationOutbox();
  const entries = await outbox.recent(100);
  const selected = id ? await outbox.get(id) : null;
  const channel = activeChannel();
  const preview = selected
    ? renderEmail(selected.message, {
        ...(await renderContextFor(selected.message.orderId)),
        statusUrl: null,
      })
    : null;

  return (
    <Shell current="messages" operator={operator}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Bandeja de salida</p>
          <h1 className={styles.title}>Mensajes</h1>
        </div>
      </div>

      <dl
        className={styles.axes}
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))" }}
      >
        <div className={styles.axis}>
          <dt className={styles.labelText}>Proveedor de correo</dt>
          <dd className={styles.axisValue} style={{ margin: 0 }}>
            {channel.isConfigured() ? channel.id : "Ninguno configurado"}
          </dd>
          <dd className={styles.eventMeta} style={{ margin: 0 }}>
            {channel.isConfigured()
              ? "Los mensajes se envían al registrarse."
              : "Nada se envía. Los mensajes quedan pendientes hasta que se elija un proveedor."}
          </dd>
        </div>
        <div className={styles.axis}>
          <dt className={styles.labelText}>Enlace de seguimiento</dt>
          <dd className={styles.axisValue} style={{ margin: 0 }}>
            {orderAccessConfigured() ? "Configurado" : "Sin configurar"}
          </dd>
          <dd className={styles.eventMeta} style={{ margin: 0 }}>
            {orderAccessConfigured()
              ? "Los correos al cliente incluyen un enlace firmado al estado del pedido."
              : "Sin ORDER_ACCESS_SECRET, los correos piden conservar la referencia."}
          </dd>
        </div>
      </dl>

      <div className={styles.detail}>
        <div className={styles.column}>
          {entries.length === 0 ? (
            <p className={styles.empty}>
              Ningún mensaje pendiente. Un pedido debe mensajes cuando el procesador confirma su
              pago, cuando sale, cuando se entrega, y si se cancela o reembolsa.
            </p>
          ) : (
            <div
              className={styles.tableWrap}
              tabIndex={0}
              role="region"
              aria-label="Bandeja de salida"
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Mensaje</th>
                    <th scope="col">Pedido</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.message.id} aria-current={e.message.id === id ? "true" : undefined}>
                      <td>
                        <Link
                          href={`/ops/mensajes?id=${encodeURIComponent(e.message.id)}`}
                          className={styles.rowLink}
                        >
                          {OPS.messages[e.message.kind]}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/ops/pedidos/${e.message.orderId}`} className={styles.mono}>
                          {e.message.orderId}
                        </Link>
                      </td>
                      <td>{OPS.outbox[e.status]}</td>
                      <td>{dateTime.format(new Date(e.message.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={styles.column}>
          {preview && selected ? (
            <section className={styles.panel} aria-labelledby="preview-title">
              <header className={styles.panelHead}>
                <h2 id="preview-title" className={styles.panelTitle}>
                  Vista previa
                </h2>
                <span className={styles.eventMeta}>
                  {selected.message.locale.toUpperCase()} · {OPS.outbox[selected.status]}
                </span>
              </header>
              <div className={styles.panelBody}>
                <dl className={styles.facts}>
                  <dt>Asunto</dt>
                  <dd>{preview.subject}</dd>
                  <dt>Para</dt>
                  <dd>
                    {selected.message.recipient.role === "customer"
                      ? selected.message.recipient.email
                      : "Operaciones (destino por definir)"}
                  </dd>
                </dl>
                <iframe
                  title={`Vista previa: ${preview.subject}`}
                  srcDoc={preview.html}
                  sandbox=""
                  style={{
                    border: "1px solid var(--border-default)",
                    inlineSize: "100%",
                    blockSize: "36rem",
                    background: "#fff",
                  }}
                />
                <details className={styles.details}>
                  <summary>Texto plano</summary>
                  <pre className={styles.note} style={{ overflowX: "auto" }}>
                    {preview.text}
                  </pre>
                </details>
              </div>
            </section>
          ) : (
            <p className={styles.hint}>Elige un mensaje para ver exactamente lo que se enviaría.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
