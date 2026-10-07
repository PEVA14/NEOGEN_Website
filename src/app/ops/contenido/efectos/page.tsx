import Link from "next/link";

import {
  approvalBlockers,
  countRows,
  EFFECT_FILTERS,
  effectFindings,
  filterRows,
  isPublishable,
  type EffectsFilter,
  type EffectsRow,
} from "@/content/effects/rules";
import { publishedProducts } from "@/data/catalog";
import { EffectsStoreError, readEffects } from "@/server/effects/store";
import { requireOperator } from "@/server/ops/auth";
import { bulkStatusAction } from "@/server/ops/effectsActions";

import { dateTime, EFFECTS, OPS } from "../../copy";
import styles from "../../ops.module.css";
import { Flash, Shell } from "../../Shell";
import { BulkBar } from "./BulkBar";
import local from "./effects.module.css";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Simple Effects" };

/**
 * SIMPLE EFFECTS — every published product, what it says, and how far it is
 * from being publishable. Built for going through 85 products: the tabs say
 * what is missing, waiting or approved; the warnings column says what still
 * blocks approval.
 */
export default async function EffectsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    q?: string;
    ok?: string;
    error?: string;
    n?: string;
    u?: string;
    skip?: string;
  }>;
}) {
  const operator = await requireOperator();
  const { vista, q = "", ok, error, n, u, skip } = await searchParams;
  const filter: EffectsFilter = EFFECT_FILTERS.includes(vista as EffectsFilter)
    ? (vista as EffectsFilter)
    : "all";

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

  const rows: EffectsRow[] = publishedProducts.map((p) => {
    const entry = file.entries[p.slug] ?? null;
    return {
      slug: p.slug,
      name: p.name,
      entry,
      findings: entry ? effectFindings(entry, file.vocabulary) : [],
    };
  });
  const counts = countRows(rows);
  const shown = filterRows(rows, { filter, query: q });
  const labels = new Map(file.vocabulary.map((t) => [t.id, t.label.es]));
  const href = (f: EffectsFilter) =>
    `/ops/contenido/efectos${f === "all" ? "" : `?vista=${f}`}${q ? `${f === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`;

  return (
    <Shell current="content" operator={operator}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>{EFFECTS.eyebrow}</p>
          <h1 className={styles.title}>{EFFECTS.title}</h1>
          <p className={`${styles.muted} ${local.intro}`}>{EFFECTS.intro}</p>
        </div>
        <div className={local.toolbar}>
          <Link href="/ops/contenido/efectos/importar" className={styles.button}>
            Importar
          </Link>
          {/* A file download, not a page: a plain link, so the browser saves it. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/ops/contenido/efectos/exportar?formato=csv"
            className={styles.button}
            data-variant="quiet"
          >
            Exportar CSV
          </a>
          {/* A file download, not a page: a plain link, so the browser saves it. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/ops/contenido/efectos/exportar?formato=json"
            className={styles.button}
            data-variant="quiet"
          >
            Exportar JSON
          </a>
          <Link
            href="/ops/contenido/efectos/etiquetas"
            className={styles.button}
            data-variant="quiet"
          >
            Etiquetas ({file.vocabulary.length})
          </Link>
        </div>
      </div>
      {ok === "effects_bulk_approved" || ok === "effects_bulk_draft" ? (
        <BulkSummary
          approved={ok === "effects_bulk_approved"}
          changed={Number(n) || 0}
          unchanged={Number(u) || 0}
          skipped={(skip ?? "")
            .split(",")
            .map((slug) => rows.find((r) => r.slug === slug))
            .filter((r): r is EffectsRow => Boolean(r))
            .map((r) => ({
              slug: r.slug,
              name: r.name,
              blockers: r.entry ? approvalBlockers(r.entry, file.vocabulary) : [],
            }))}
        />
      ) : (
        <Flash ok={ok} error={error} />
      )}

      <nav aria-label="Estados" className={styles.tabGroups}>
        <ul className={styles.tabs}>
          {EFFECT_FILTERS.map((f) => (
            <li key={f}>
              <Link
                href={href(f)}
                className={styles.tab}
                aria-current={f === filter ? "page" : undefined}
              >
                {EFFECTS.filters[f]}
                <span className={styles.count}>{counts[f]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className={styles.search} role="search" action="/ops/contenido/efectos">
        {filter !== "all" ? <input type="hidden" name="vista" value={filter} /> : null}
        <label className="sr-only" htmlFor="q">
          Buscar producto
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          className={styles.input}
          placeholder="Nombre o slug"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.button}>
          Buscar
        </button>
        {q ? (
          <Link href={href(filter)} className={styles.button} data-variant="quiet">
            Limpiar
          </Link>
        ) : null}
      </form>

      <BulkBar action={bulkStatusAction} vista={filter === "all" ? "" : filter} q={q} />

      {shown.length === 0 ? (
        <p className={styles.empty}>Ningún producto coincide.</p>
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Productos">
          <table className={styles.table}>
            <caption className="sr-only">
              {EFFECTS.filters[filter]}: {shown.length} productos
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Seleccionar</span>
                </th>
                <th scope="col">Producto</th>
                <th scope="col">Estado</th>
                <th scope="col">Etiquetas</th>
                <th scope="col">Descripción (ES)</th>
                <th scope="col">EN</th>
                <th scope="col">Avisos</th>
                <th scope="col">Editado</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ slug, name, entry, findings }) => {
                const live = isPublishable(entry ?? undefined, file.vocabulary);
                const errors = findings.filter((f) => f.level === "error").length;
                const warnings = findings.length - errors;
                return (
                  <tr key={slug}>
                    <td className={local.selectCell}>
                      <input
                        type="checkbox"
                        name="slug"
                        value={slug}
                        form="bulk-status"
                        disabled={!entry}
                        aria-label={`Seleccionar ${name}`}
                        className={local.selectBox}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/ops/contenido/efectos/${encodeURIComponent(slug)}`}
                        className={styles.rowLink}
                      >
                        {name}
                      </Link>
                      <br />
                      <span className={`${styles.mono} ${styles.muted}`}>{slug}</span>
                    </td>
                    <td>
                      {entry ? (
                        <span
                          className={styles.chip}
                          data-tone={live ? "good" : entry.status === "review" ? "wait" : "quiet"}
                        >
                          {EFFECTS.status[entry.status]}
                          {entry.status === "approved" && !live ? " · incompleto" : ""}
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={local.tagsCell}>
                      {entry?.tags.map((id) => labels.get(id) ?? id).join(" · ") || "—"}
                    </td>
                    <td className={local.textCell}>
                      {entry?.description.es || <span className={styles.muted}>—</span>}
                    </td>
                    <td>{entry?.description.en ? "✓" : <span className={styles.muted}>—</span>}</td>
                    <td>
                      <span className={styles.chips}>
                        {errors > 0 ? (
                          <span className={styles.chip} data-tone="bad">
                            {errors} etiqueta{errors > 1 ? "s" : ""} desconocida
                            {errors > 1 ? "s" : ""}
                          </span>
                        ) : null}
                        {warnings > 0 ? (
                          <span className={styles.chip} data-tone="wait">
                            {warnings} aviso{warnings > 1 ? "s" : ""}
                          </span>
                        ) : null}
                        {entry?.source === "import" ? (
                          <span className={styles.chip} data-tone="quiet">
                            Importado
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className={local.nowrapSmall}>
                      {entry?.updatedAt ? (
                        <>
                          {dateTime.format(new Date(entry.updatedAt))}
                          <br />
                          <span className={styles.muted}>{entry.updatedBy}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className={`${styles.muted} ${local.foot}`}>
        {OPS.brand} · El sitio público solo muestra fichas aprobadas, y solo después de volver a
        compilarlo con el archivo actualizado.
      </p>
    </Shell>
  );
}

/** What a bulk change did — including, by name, every entry it left alone. */
function BulkSummary({
  approved,
  changed,
  unchanged,
  skipped,
}: {
  approved: boolean;
  changed: number;
  unchanged: number;
  skipped: readonly { slug: string; name: string; blockers: readonly string[] }[];
}) {
  const one = changed === 1;
  const verb = approved
    ? one
      ? "aprobada"
      : "aprobadas"
    : one
      ? "pasada a borrador"
      : "pasadas a borrador";
  return (
    <div className={styles.flash} data-tone={skipped.length ? "error" : "ok"} role="status">
      <p className={local.bulkLine}>
        {changed} ficha{one ? "" : "s"} {verb}.
        {unchanged ? ` ${unchanged} ya lo estaba${unchanged === 1 ? "" : "n"}.` : ""}
        {approved && changed
          ? " Se publican en el sitio cuando vuelvas a compilarlo con este archivo."
          : ""}
      </p>
      {skipped.length ? (
        <>
          <p className={local.bulkLine}>
            {skipped.length} no se aprobaron y quedaron como estaban:
          </p>
          <ul className={local.bulkSkipped}>
            {skipped.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/ops/contenido/efectos/${encodeURIComponent(x.slug)}`}
                  className={styles.rowLink}
                >
                  {x.name}
                </Link>{" "}
                — {x.blockers.map((b) => EFFECTS.blockers[b] ?? b).join("; ")}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
