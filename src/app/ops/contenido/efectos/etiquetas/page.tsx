import Link from "next/link";

import { EffectsStoreError, readEffects } from "@/server/effects/store";
import { requireOperator } from "@/server/ops/auth";
import { addTagAction, deleteTagAction, updateTagAction } from "@/server/ops/effectsActions";

import { EFFECTS } from "../../../copy";
import styles from "../../../ops.module.css";
import { Flash, Shell } from "../../../Shell";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Simple Effects · etiquetas" };

/**
 * THE TAG VOCABULARY — the only tags an entry may use. Comprehension words,
 * not a taxonomy: they never filter, rank, recommend or relate products, and
 * they are not the scientific Areas or research lines. Relabelling a tag
 * changes it everywhere; a tag in use cannot be deleted.
 */
export default async function EffectTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const operator = await requireOperator();
  const { ok, error } = await searchParams;
  let file;
  try {
    file = await readEffects();
  } catch (e) {
    return (
      <Shell current="content" operator={operator}>
        <Flash error={e instanceof EffectsStoreError ? e.code : "unreadable"} />
      </Shell>
    );
  }
  const uses = (id: string) =>
    Object.values(file.entries).filter((e) => e.tags.includes(id)).length;

  return (
    <Shell current="content" operator={operator}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <Link href="/ops/contenido/efectos" className={styles.rowLink}>
              {EFFECTS.title}
            </Link>{" "}
            / etiquetas
          </p>
          <h1 className={styles.title}>Vocabulario de etiquetas</h1>
          <p className={styles.muted}>
            Palabras para entender un producto de un vistazo. No filtran, no recomiendan y no tocan
            las áreas ni las líneas de investigación.
          </p>
        </div>
      </div>
      <Flash ok={ok} error={error} />

      <div className={styles.column}>
        <section className={styles.panel} aria-labelledby="add-title">
          <header className={styles.panelHead}>
            <h2 id="add-title" className={styles.panelTitle}>
              Añadir etiqueta
            </h2>
          </header>
          <form action={addTagAction} className={`${styles.panelBody} ${styles.formRow}`}>
            <label className={styles.label}>
              <span className={styles.labelText}>Español</span>
              <input name="es" className={styles.input} maxLength={40} required />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Inglés</span>
              <input name="en" className={styles.input} maxLength={40} required />
            </label>
            <button type="submit" className={styles.button}>
              Añadir
            </button>
          </form>
        </section>

        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Etiquetas">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Identificador</th>
                <th scope="col">Etiqueta (ES / EN)</th>
                <th scope="col" className={styles.num}>
                  En uso
                </th>
                <th scope="col">
                  <span className="sr-only">Eliminar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {file.vocabulary.map((t) => (
                <tr key={t.id}>
                  <td className={styles.mono}>{t.id}</td>
                  <td>
                    <form action={updateTagAction} className={styles.formRow}>
                      <input type="hidden" name="id" value={t.id} />
                      <label className="sr-only" htmlFor={`es-${t.id}`}>
                        Español
                      </label>
                      <input
                        id={`es-${t.id}`}
                        name="es"
                        defaultValue={t.label.es}
                        className={styles.input}
                        maxLength={40}
                        required
                      />
                      <label className="sr-only" htmlFor={`en-${t.id}`}>
                        Inglés
                      </label>
                      <input
                        id={`en-${t.id}`}
                        name="en"
                        defaultValue={t.label.en}
                        className={styles.input}
                        maxLength={40}
                        required
                      />
                      <button type="submit" className={styles.button} data-variant="quiet">
                        Guardar
                      </button>
                    </form>
                  </td>
                  <td className={styles.num}>{uses(t.id)}</td>
                  <td>
                    <form action={deleteTagAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className={styles.button}
                        data-variant="danger"
                        disabled={uses(t.id) > 0}
                      >
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
