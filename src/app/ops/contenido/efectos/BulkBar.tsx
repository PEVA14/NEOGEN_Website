"use client";

import { useEffect, useRef, useState } from "react";

import styles from "../../ops.module.css";
import local from "./effects.module.css";

/* The row checkboxes on the list page name this id. */
const FORM = "bulk-status";
const boxes = () =>
  Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[form="${FORM}"][name="slug"]:not(:disabled)`,
    ),
  );

/**
 * BULK STATUS — the bar above the list. The row checkboxes belong to this
 * form through their `form` attribute, so the table stays a plain table.
 * Works without JavaScript too; the script only adds "select all" and the
 * running count.
 */
export function BulkBar({
  action,
  vista,
  q,
}: {
  action: (form: FormData) => Promise<void>;
  vista: string;
  q: string;
}) {
  const [selected, setSelected] = useState(0);
  const [total, setTotal] = useState(0);
  const all = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => {
      const list = boxes();
      const on = list.filter((b) => b.checked).length;
      setSelected(on);
      setTotal(list.length);
      if (all.current) {
        all.current.checked = list.length > 0 && on === list.length;
        all.current.indeterminate = on > 0 && on < list.length;
      }
    };
    sync();
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);

  const toggleAll = (checked: boolean) => {
    for (const b of boxes()) b.checked = checked;
    document.dispatchEvent(new Event("change"));
  };

  return (
    <form id={FORM} action={action} className={local.bulkBar} aria-label="Cambiar estado en bloque">
      {vista ? <input type="hidden" name="vista" value={vista} /> : null}
      {q ? <input type="hidden" name="q" value={q} /> : null}
      <label className={styles.check}>
        <input
          ref={all}
          type="checkbox"
          disabled={total === 0}
          onChange={(e) => toggleAll(e.target.checked)}
        />
        Seleccionar todas las de esta vista ({total})
      </label>
      <span className={styles.muted} role="status">
        {selected} seleccionada{selected === 1 ? "" : "s"}
      </span>
      <span className={local.bulkActions}>
        <button type="submit" name="status" value="approved" className={styles.button}>
          Aprobar seleccionadas
        </button>
        <button
          type="submit"
          name="status"
          value="draft"
          className={styles.button}
          data-variant="quiet"
        >
          Pasar a borrador
        </button>
      </span>
    </form>
  );
}
