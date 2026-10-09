import Link from "next/link";

import { renderEmail } from "@/domain/notifications/render";
import { activeChannel, renderContextFor } from "@/server/notifications";
import { requireOperator } from "@/server/ops/auth";
import { orderAccessConfigured } from "@/server/orderAccess";
import { notificationOutbox } from "@/server/persistence";

import { dateTime, OPS } from "../copy";
import styles from "../ops.module.css";
import { Shell } from "../Shell";
import { EmptyState, PageHeader, Section, State } from "../ui";

import type { Tone } from "../lifecycle";
import type { OutboxStatus } from "@/domain/notifications";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

const OUTBOX_TONE: Record<OutboxStatus, Tone> = {
  pending: "warn",
  sent: "good",
  failed: "bad",
};

/**
 * THE OUTBOX — every message an order is owed, and whether it went.
 *
 * With no email provider configured every entry is `pending`, and the page
 * says "not sent" in those words: a queued message is not a delivered one.
 * Why it is pending is the environment's fact, said once above the list.
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
  const configured = channel.isConfigured();
  const preview = selected
    ? renderEmail(selected.message, {
        ...(await renderContextFor(selected.message.orderId)),
        statusUrl: null,
      })
    : null;
  const tally = { pending: 0, sent: 0, failed: 0 } satisfies Record<OutboxStatus, number>;
  for (const e of entries) tally[e.status] += 1;

  return (
    <Shell current="messages" operator={operator}>
      <PageHeader title="Mensajes" description={OPS.pages.messages} />

      <dl className={styles.statusBand}>
        <div className={styles.statusItem} data-tone={configured ? undefined : "warn"}>
          <dt className={styles.statusLabel}>Proveedor de correo</dt>
          <dd className={styles.statusValue}>{configured ? channel.id : "Ninguno configurado"}</dd>
          <dd className={styles.statusNote}>
            {configured
              ? "Los mensajes se envían al registrarse."
              : "Nada se envía. Los mensajes quedan pendientes hasta que se elija un proveedor."}
          </dd>
        </div>
        <div className={styles.statusItem}>
          <dt className={styles.statusLabel}>Enlace de seguimiento</dt>
          <dd className={styles.statusValue}>
            {orderAccessConfigured() ? "Configurado" : "Sin configurar"}
          </dd>
          <dd className={styles.statusNote}>
            {orderAccessConfigured()
              ? "Los correos al cliente incluyen un enlace firmado al estado del pedido."
              : "Sin ORDER_ACCESS_SECRET, los correos piden conservar la referencia."}
          </dd>
        </div>
        <div className={styles.statusItem} data-tone={tally.failed > 0 ? "warn" : undefined}>
          <dt className={styles.statusLabel}>Últimos {entries.length}</dt>
          <dd className={styles.statusValue}>
            {tally.pending} pendientes · {tally.sent} enviados
          </dd>
          <dd className={styles.statusNote}>
            {tally.failed > 0 ? `${tally.failed} fallaron: revisa el proveedor.` : "Ninguno falló."}
          </dd>
        </div>
      </dl>

      <div className={styles.detail}>
        <div className={styles.column}>
          <Section
            id="bandeja"
            title="Bandeja de salida"
            description={
              tally.pending > 0
                ? configured
                  ? OPS.outboxReason.queued
                  : OPS.outboxReason.noProvider
                : "Elige un mensaje para ver exactamente lo que se enviaría."
            }
          >
            {entries.length === 0 ? (
              <EmptyState title="Todavía no hay mensajes.">
                Un pedido debe mensajes cuando el procesador confirma su pago, cuando sale, cuando
                se entrega, y si se cancela o reembolsa. Aparecerán aquí.
              </EmptyState>
            ) : (
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Bandeja de salida"
              >
                <table className={`${styles.table} ${styles.messageTable}`}>
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
                      <tr
                        key={e.message.id}
                        aria-current={e.message.id === id ? "true" : undefined}
                      >
                        <td>
                          <Link
                            href={`/ops/mensajes?id=${encodeURIComponent(e.message.id)}#vista-previa`}
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
                        <td>
                          <span title={OPS.outbox[e.status]}>
                            <State tone={OUTBOX_TONE[e.status]}>{OPS.outboxShort[e.status]}</State>
                          </span>
                        </td>
                        <td className={styles.nowrap}>
                          {dateTime.format(new Date(e.message.createdAt))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
        <div className={styles.column}>
          {preview && selected ? (
            <Section
              id="vista-previa"
              title="Vista previa"
              aside={
                <span className={styles.sectionMeta}>
                  {selected.message.locale.toUpperCase()} · {OPS.outboxShort[selected.status]}
                </span>
              }
            >
              <dl className={styles.facts}>
                <dt>Mensaje</dt>
                <dd>{OPS.messages[selected.message.kind]}</dd>
                <dt>Asunto</dt>
                <dd>{preview.subject}</dd>
                <dt>Para</dt>
                <dd>
                  {selected.message.recipient.role === "customer"
                    ? selected.message.recipient.email
                    : "Operaciones (destino por definir)"}
                </dd>
                <dt>Pedido</dt>
                <dd>
                  <Link
                    href={`/ops/pedidos/${selected.message.orderId}`}
                    className={styles.rowLink}
                  >
                    {selected.message.orderId}
                  </Link>
                </dd>
                <dt>Estado</dt>
                <dd>{OPS.outbox[selected.status]}</dd>
              </dl>
              <iframe
                title={`Vista previa: ${preview.subject}`}
                srcDoc={preview.html}
                sandbox=""
                className={styles.previewFrame}
              />
              <details className={styles.details}>
                <summary>Texto plano</summary>
                <pre className={`${styles.note} ${styles.preText}`}>{preview.text}</pre>
              </details>
              <p className={styles.hint}>
                El enlace al estado del pedido se omite en esta vista previa: es una credencial del
                cliente.
              </p>
            </Section>
          ) : (
            <Section id="vista-previa" title="Vista previa">
              <EmptyState compact>
                Elige un mensaje de la bandeja para ver exactamente lo que se enviaría: asunto,
                destinatario y cuerpo.
              </EmptyState>
            </Section>
          )}
        </div>
      </div>
    </Shell>
  );
}
