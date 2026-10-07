"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { EFFECTS, OPS } from "../../../copy";
import styles from "../../../ops.module.css";
import local from "../effects.module.css";

import type { ImportState } from "@/server/ops/effectsActions";

const START: ImportState = { text: "", problem: null, plan: null, applied: null };

/** Paste or upload → plan → confirm. The plan is recomputed on confirm. */
export function ImportForm({
  action,
}: {
  action: (state: ImportState, form: FormData) => Promise<ImportState>;
}) {
  const [state, run, pending] = useActionState(action, START);
  const [text, setText] = useState("");
  const value = text || state.text;
  const plan = state.plan;
  const refusals = OPS.refusals as Record<string, string>;
  const problem = state.problem
    ? (EFFECTS.problems[state.problem] ??
      refusals[state.problem] ??
      (state.problem.startsWith("csv_unknown_columns:")
        ? `Columnas desconocidas: ${state.problem.split(":")[1]}`
        : state.problem))
    : null;

  return (
    <div className={styles.column}>
      {state.applied ? (
        <p className={styles.flash} data-tone="ok" role="status">
          Importado: {state.applied.new} nuevas y {state.applied.changed} cambiadas, todas como
          borrador. <Link href="/ops/contenido/efectos?vista=draft">Ver borradores</Link>
        </p>
      ) : null}
      {problem ? (
        <p className={styles.flash} data-tone="error" role="alert">
          {problem}
        </p>
      ) : null}

      <form action={run} className={`${styles.panel} ${styles.form}`}>
        <div className={styles.panelBody}>
          <label className={styles.label}>
            <span className={styles.labelText}>Archivo (CSV o JSON)</span>
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className={styles.input}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
              }}
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>…o pega el contenido</span>
            <textarea
              name="text"
              value={value}
              onChange={(e) => setText(e.target.value)}
              className={`${styles.textarea} ${local.textarea}`}
              rows={10}
              spellCheck={false}
            />
          </label>
          <div className={styles.actions}>
            <button
              type="submit"
              name="apply"
              value="0"
              className={styles.button}
              disabled={pending}
            >
              Revisar
            </button>
            {plan?.ok && !state.applied && plan.counts.new + plan.counts.changed > 0 ? (
              <button
                type="submit"
                name="apply"
                value="1"
                className={styles.button}
                data-variant="quiet"
                disabled={pending}
              >
                Importar {plan.counts.new + plan.counts.changed} como borrador
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {plan && !state.applied ? (
        <section className={styles.panel} aria-labelledby="plan-title">
          <header className={styles.panelHead}>
            <h2 id="plan-title" className={styles.panelTitle}>
              Plan
            </h2>
            <span className={styles.chips}>
              {(Object.keys(plan.counts) as (keyof typeof plan.counts)[]).map((k) => (
                <span
                  key={k}
                  className={styles.chip}
                  data-tone={k === "error" && plan.counts[k] ? "bad" : "quiet"}
                >
                  {EFFECTS.plan[k]}: {plan.counts[k]}
                </span>
              ))}
            </span>
          </header>
          <div className={styles.panelBody}>
            {!plan.ok ? (
              <p className={styles.flash} data-tone="error">
                Hay errores: no se importará nada hasta corregirlos.
              </p>
            ) : null}
            <div
              className={styles.tableWrap}
              tabIndex={0}
              role="region"
              aria-label="Plan de importación"
            >
              <table className={`${styles.table} ${local.planTable}`}>
                <thead>
                  <tr>
                    <th scope="col">Línea</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Resultado</th>
                    <th scope="col">Errores y avisos</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows
                    .filter((r) => r.kind !== "empty" && r.kind !== "unchanged")
                    .map((r) => (
                      <tr key={`${r.line}-${r.slug}`}>
                        <td className={styles.mono}>{r.line}</td>
                        <td>
                          {r.name || r.slug || "—"}
                          <br />
                          <span className={`${styles.mono} ${styles.muted}`}>{r.slug}</span>
                        </td>
                        <td>
                          <span
                            className={styles.chip}
                            data-tone={r.kind === "error" ? "bad" : "quiet"}
                          >
                            {EFFECTS.plan[r.kind]}
                          </span>
                        </td>
                        <td>
                          {r.errors.map((e) => (
                            <div key={e} className={styles.mono}>
                              ✕ {e}
                            </div>
                          ))}
                          {r.findings
                            .filter((f) => f.level === "warning")
                            .map((f, i) => (
                              <div key={i}>
                                ⚠ {EFFECTS.findings[f.code]}
                                {f.locale ? ` · ${f.locale.toUpperCase()}` : ""}
                                {f.detail ? ` «${f.detail}»` : ""}
                              </div>
                            ))}
                          {r.notes.map((n) => (
                            <div key={n} className={styles.muted}>
                              {EFFECTS.planNotes[n] ?? n.replace(/_/g, " ")}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
