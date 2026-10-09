import { randomBytes } from "node:crypto";

import Link from "next/link";

import { LOTS } from "@/data/quality";
import { ADJUSTMENT_REASONS, available } from "@/domain/inventory";
import { stockAction } from "@/server/ops/actions";
import { requireOperator } from "@/server/ops/auth";
import { skuLabel, skuOptions } from "@/server/ops/data";
import { inventoryStore } from "@/server/persistence";

import { dateTime, OPS } from "../copy";
import styles from "../ops.module.css";
import { Flash, Shell } from "../Shell";
import { EmptyState, Effects, PageHeader, Section, State } from "../ui";

import type { LotStatus } from "@/data/quality";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventario" };

const LOT_STATUS: Record<LotStatus, string> = {
  "in-stock": "En almacén",
  reserved: "Reservado",
  depleted: "Agotado",
  quarantined: "En cuarentena",
  retired: "Retirado",
};

/** "+3", "−2", or nothing: a movement's effect on one column. */
function delta(n: number): string {
  if (n === 0) return "";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/**
 * STOCK AND LOTS — what NEOGEN has counted, and nothing it has not.
 *
 * A SKU appears here only after someone counts it. Every uncounted SKU is
 * untracked: it sells without limit, exactly as before inventory existed, and
 * the page says so rather than showing a zero that would read as "sold out".
 * Every change is a ledger movement with a reason and a name.
 *
 * Lots are listed from the quality registry (`data/quality/lots.ts`), which is
 * empty until stock is received with its paperwork. The supplier's batch
 * reference is never shown here or anywhere a customer could reach.
 */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const operator = await requireOperator();
  const { ok, error } = await searchParams;
  const store = inventoryStore();
  const [levels, movements] = await Promise.all([store.levels(), store.movements({ limit: 50 })]);
  const options = skuOptions();
  /* One idempotency key per rendered form: a double submit records one change. */
  const key = randomBytes(12).toString("base64url");

  const tracked = new Set(levels.map((l) => l.variantId));
  const untracked = options.filter((o) => !tracked.has(o.id));
  const soldOut = levels.filter((l) => available(l) <= 0);
  const reserved = levels.reduce((sum, l) => sum + l.reserved, 0);

  return (
    <Shell current="inventory" operator={operator}>
      <PageHeader title="Inventario" description={OPS.pages.inventory} />
      <Flash ok={ok} error={error} />

      <dl className={styles.statusBand}>
        <div className={styles.statusItem}>
          <dt className={styles.statusLabel}>Con conteo</dt>
          <dd className={styles.statusValue}>
            {levels.length} de {options.length} SKU
          </dd>
          <dd className={styles.statusNote}>
            {untracked.length === 0
              ? "Todos los SKU tienen conteo."
              : `${untracked.length} sin conteo: se venden sin límite.`}
          </dd>
        </div>
        <div className={styles.statusItem} data-tone={soldOut.length > 0 ? "warn" : undefined}>
          <dt className={styles.statusLabel}>Sin disponibles</dt>
          <dd className={styles.statusValue}>{soldOut.length}</dd>
          <dd className={styles.statusNote}>
            {soldOut.length === 0
              ? "Ningún SKU con conteo está agotado."
              : `${soldOut.map((l) => skuLabel(l.variantId)).join(", ")}: la tienda no acepta pagos por ellos.`}
          </dd>
        </div>
        <div className={styles.statusItem}>
          <dt className={styles.statusLabel}>Reservado para pedidos</dt>
          <dd className={styles.statusValue}>{reserved} u.</dd>
          <dd className={styles.statusNote}>Apartado para pedidos pagados que aún no salen.</dd>
        </div>
      </dl>

      <div className={styles.detail}>
        <div className={styles.column}>
          <Section
            id="existencias"
            title="Existencias"
            aside={
              <span className={styles.sectionMeta}>
                {levels.length} de {options.length} SKU
              </span>
            }
          >
            {levels.length === 0 ? (
              <EmptyState title="Ningún SKU tiene conteo todavía.">
                <p>
                  Todos se venden sin límite de existencias, como hasta ahora. Esto es normal antes
                  de recibir inventario.
                </p>
                <p>
                  Para empezar a controlar un SKU, registra su conteo inicial con el formulario
                  «Registrar conteo o ajuste».
                </p>
              </EmptyState>
            ) : (
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Existencias por SKU"
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col" className={styles.num}>
                        En almacén
                      </th>
                      <th scope="col" className={styles.num}>
                        Reservado
                      </th>
                      <th scope="col" className={styles.num}>
                        Disponible
                      </th>
                      <th scope="col">Último cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((l) => {
                      const free = available(l);
                      return (
                        <tr key={l.variantId}>
                          <td>
                            <span className={styles.rowName}>{skuLabel(l.variantId)}</span>
                            <br />
                            <span className={styles.mono}>{l.variantId}</span>
                          </td>
                          <td className={styles.num}>{l.onHand}</td>
                          <td className={styles.num}>{l.reserved}</td>
                          <td className={styles.num}>
                            {free <= 0 ? (
                              <State tone="bad" strong>
                                0 · agotado
                              </State>
                            ) : (
                              <strong>{free}</strong>
                            )}
                          </td>
                          <td className={styles.nowrap}>
                            {dateTime.format(new Date(l.updatedAt))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {untracked.length > 0 && levels.length > 0 ? (
              <details className={styles.details}>
                <summary>Sin conteo ({untracked.length}) — se venden sin límite</summary>
                <ul className={styles.plainList}>
                  {untracked.map((o) => (
                    <li key={o.id} className={styles.holdRow}>
                      <span>{o.label}</span>
                      <span className={styles.mono}>{o.id}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <p className={styles.hint}>
              Disponible = en almacén − reservado. Cuando un pedido se paga, sus unidades se
              reservan; cuando sale, dejan el almacén; si se cancela antes de salir, la reserva se
              libera.
            </p>
          </Section>

          <Section
            id="movimientos"
            title="Movimientos recientes"
            description="Cada cambio de existencias, con su motivo y quién lo hizo. Los últimos 50."
          >
            {movements.length === 0 ? (
              <EmptyState compact>
                Sin movimientos. Aparecerán al registrar un conteo o cuando un pedido pagado reserve
                unidades.
              </EmptyState>
            ) : (
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Movimientos de inventario"
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Producto</th>
                      <th scope="col">Qué pasó</th>
                      <th scope="col" className={styles.num}>
                        Almacén
                      </th>
                      <th scope="col" className={styles.num}>
                        Reserva
                      </th>
                      <th scope="col">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className={styles.nowrap}>{dateTime.format(new Date(m.at))}</td>
                        <td>
                          {skuLabel(m.variantId)}
                          <br />
                          <span className={styles.mono}>{m.variantId}</span>
                        </td>
                        <td>
                          {m.reason
                            ? OPS.adjustments[m.reason]
                            : (OPS.movementKinds[m.kind] ?? m.kind)}
                          {m.lotId ? <span className={styles.mono}> · lote {m.lotId}</span> : null}
                          {m.note ? (
                            <>
                              <br />
                              <span className={styles.muted}>{m.note}</span>
                            </>
                          ) : null}
                        </td>
                        <td className={styles.num}>{delta(m.onHandDelta)}</td>
                        <td className={styles.num}>{delta(m.reservedDelta)}</td>
                        <td>
                          {m.orderId ? (
                            <Link href={`/ops/pedidos/${m.orderId}`} className={styles.rowLink}>
                              {m.orderId}
                            </Link>
                          ) : (
                            <span className={styles.mono}>
                              {m.actor ?? (m.source === "system" ? "sistema" : m.source)}
                            </span>
                          )}
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
          <Section
            id="registrar"
            title="Registrar conteo o ajuste"
            description="Para lo que llega, lo que se cuenta y lo que se pierde. Las reservas de los pedidos se registran solas."
          >
            <form action={stockAction} className={styles.form} data-flush="true">
              <input type="hidden" name="key" value={key} />
              <label className={styles.label}>
                <span className={styles.labelText}>SKU</span>
                <select name="variantId" className={styles.select} required>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} ({o.id})
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.formRow}>
                <label className={styles.label}>
                  <span className={styles.labelText}>Tipo</span>
                  <select name="mode" className={styles.select}>
                    <option value="count">Conteo (cantidad total)</option>
                    <option value="adjustment">Ajuste (+ / −)</option>
                  </select>
                </label>
                <label className={styles.label}>
                  <span className={styles.labelText}>Cantidad</span>
                  <input name="quantity" type="number" step={1} required className={styles.input} />
                </label>
              </div>
              <ul className={styles.hint}>
                <li>
                  <strong>Conteo</strong> fija el total que hay en almacén; no se suma a lo
                  anterior. El primer conteo empieza el control de ese SKU.
                </li>
                <li>
                  <strong>Ajuste</strong> suma o resta unidades (usa −3 para restar tres).
                </li>
                <li>No puede quedar menos existencia que la ya reservada para pedidos pagados.</li>
              </ul>
              <label className={styles.label}>
                <span className={styles.labelText}>Motivo</span>
                <select name="reason" className={styles.select}>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {OPS.adjustments[r]}
                    </option>
                  ))}
                </select>
              </label>
              {LOTS.length > 0 ? (
                <label className={styles.label}>
                  <span className={styles.labelText}>Lote (opcional)</span>
                  <select name="lotId" className={styles.select}>
                    <option value="">—</option>
                    {LOTS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id} · {l.variantId}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className={styles.label}>
                <span className={styles.labelText}>Nota (opcional)</span>
                <input name="note" className={styles.input} maxLength={300} />
              </label>
              <div className={styles.actionRow}>
                <button type="submit" className={styles.button}>
                  Registrar
                </button>
                <Effects items={["Queda en movimientos con tu nombre", OPS.effects.noNotice]} />
              </div>
            </form>
          </Section>

          <Section
            id="lotes"
            title="Lotes"
            aside={<span className={styles.sectionMeta}>{LOTS.length}</span>}
          >
            {LOTS.length === 0 ? (
              <EmptyState compact>
                <p>
                  No hay lotes registrados. Es lo esperado hasta recibir inventario con su
                  documentación.
                </p>
                <p>
                  Un lote se registra en <span className={styles.mono}>data/quality/lots.ts</span>,
                  con las fechas copiadas de sus documentos. Aquí no se genera ningún lote, fecha de
                  caducidad ni certificado.
                </p>
              </EmptyState>
            ) : (
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Lotes registrados"
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Lote</th>
                      <th scope="col">SKU</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Recibido</th>
                      <th scope="col">Caduca</th>
                      <th scope="col">Público</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOTS.map((l) => (
                      <tr key={l.id}>
                        <td className={styles.mono}>{l.id}</td>
                        <td className={styles.mono}>{l.variantId}</td>
                        <td>{LOT_STATUS[l.status]}</td>
                        <td>{l.receivedOn ?? "—"}</td>
                        <td>{l.expiresOn ?? "—"}</td>
                        <td>{l.publicVisibility ? "Sí" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </Shell>
  );
}
