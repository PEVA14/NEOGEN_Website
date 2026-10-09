import { randomBytes } from "node:crypto";

import { LOTS } from "@/data/quality";
import { ADJUSTMENT_REASONS, available } from "@/domain/inventory";
import { stockAction } from "@/server/ops/actions";
import { requireOperator } from "@/server/ops/auth";
import { skuLabel, skuOptions } from "@/server/ops/data";
import { inventoryStore } from "@/server/persistence";

import { dateTime, OPS } from "../copy";
import styles from "../ops.module.css";
import { Flash, Shell } from "../Shell";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventario" };

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

  return (
    <Shell current="inventory" operator={operator}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Existencias por SKU</p>
          <h1 className={styles.title}>Inventario</h1>
        </div>
      </div>
      <Flash ok={ok} error={error} />

      <div className={styles.detail}>
        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="levels-title">
            <header className={styles.panelHead}>
              <h2 id="levels-title" className={styles.panelTitle}>
                SKU con conteo
              </h2>
              <span className={styles.eventMeta}>
                {levels.length} de {options.length} SKU
              </span>
            </header>
            <div className={styles.panelBody}>
              {levels.length === 0 ? (
                <p className={styles.empty}>
                  Ningún SKU tiene conteo. Todos se venden sin límite de existencias, como hasta
                  ahora. Registra un conteo inicial para empezar a controlar un SKU.
                </p>
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
                        <th scope="col">SKU</th>
                        <th scope="col" className={styles.num}>
                          En almacén
                        </th>
                        <th scope="col" className={styles.num}>
                          Reservado
                        </th>
                        <th scope="col" className={styles.num}>
                          Disponible
                        </th>
                        <th scope="col">Actualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {levels.map((l) => (
                        <tr key={l.variantId}>
                          <td>
                            <span className={styles.mono}>{l.variantId}</span>
                            <br />
                            <span className={styles.muted}>{skuLabel(l.variantId)}</span>
                          </td>
                          <td className={styles.num}>{l.onHand}</td>
                          <td className={styles.num}>{l.reserved}</td>
                          <td className={styles.num}>
                            <strong>{available(l)}</strong>
                          </td>
                          <td>{dateTime.format(new Date(l.updatedAt))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="ledger-title">
            <header className={styles.panelHead}>
              <h2 id="ledger-title" className={styles.panelTitle}>
                Movimientos recientes
              </h2>
            </header>
            <div className={styles.panelBody}>
              {movements.length === 0 ? (
                <p className={styles.hint}>Sin movimientos.</p>
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
                        <th scope="col">SKU</th>
                        <th scope="col">Tipo</th>
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
                          <td>{dateTime.format(new Date(m.at))}</td>
                          <td className={styles.mono}>{m.variantId}</td>
                          <td>
                            {m.reason ? OPS.adjustments[m.reason] : m.kind}
                            {m.lotId ? <span className={styles.mono}> · {m.lotId}</span> : null}
                          </td>
                          <td className={styles.num}>{m.onHandDelta || ""}</td>
                          <td className={styles.num}>{m.reservedDelta || ""}</td>
                          <td className={styles.mono}>{m.orderId ?? m.actor ?? m.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="adjust-title">
            <header className={styles.panelHead}>
              <h2 id="adjust-title" className={styles.panelTitle}>
                Registrar conteo o ajuste
              </h2>
            </header>
            <div className={styles.panelBody}>
              <form
                action={stockAction}
                className={styles.form}
                style={{ borderBlockStart: 0, paddingBlockStart: 0 }}
              >
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
                    <input
                      name="quantity"
                      type="number"
                      step={1}
                      required
                      className={styles.input}
                    />
                  </label>
                </div>
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
                  <span className={styles.labelText}>Nota</span>
                  <input name="note" className={styles.input} maxLength={300} />
                </label>
                <p className={styles.hint}>
                  «Conteo» fija la cantidad total que hay en almacén; no se suma a la anterior.
                  «Ajuste» suma o resta unidades a lo que ya hay. El primer conteo empieza el
                  control de ese SKU. No puede quedar menos existencia que la ya reservada para
                  pedidos pagados.
                </p>
                <div>
                  <button type="submit" className={styles.button}>
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="lots-title">
            <header className={styles.panelHead}>
              <h2 id="lots-title" className={styles.panelTitle}>
                Lotes
              </h2>
              <span className={styles.eventMeta}>{LOTS.length}</span>
            </header>
            <div className={styles.panelBody}>
              {LOTS.length === 0 ? (
                <p className={styles.empty}>
                  No hay lotes registrados. Un lote se registra al recibir inventario, con las
                  fechas copiadas de su documentación (en{" "}
                  <span className={styles.mono}>data/quality/lots.ts</span>). Ningún lote, fecha de
                  caducidad o certificado se genera aquí.
                </p>
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
                          <td>{l.status}</td>
                          <td>{l.receivedOn ?? "—"}</td>
                          <td>{l.expiresOn ?? "—"}</td>
                          <td>{l.publicVisibility ? "Sí" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
