import Link from "next/link";

import { requireOperator } from "@/server/ops/auth";
import { importAction } from "@/server/ops/effectsActions";

import { EFFECTS } from "../../../copy";
import styles from "../../../ops.module.css";
import { Shell } from "../../../Shell";
import { ImportForm } from "./ImportForm";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Simple Effects · importar" };

/**
 * IMPORT — paste or upload a CSV or JSON (the export's own shape), see the
 * plan, then confirm. Everything imported arrives as a draft; an unchanged
 * row is left as it is.
 */
export default async function EffectsImportPage() {
  const operator = await requireOperator();
  return (
    <Shell current="content" operator={operator}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <Link href="/ops/contenido/efectos" className={styles.rowLink}>
              {EFFECTS.title}
            </Link>{" "}
            / importar
          </p>
          <h1 className={styles.title}>Importar borradores</h1>
          <p className={styles.muted}>
            Usa la exportación como plantilla (CSV o JSON), complétala a mano o con cualquier
            herramienta, y pégala aquí. Todo lo importado entra como borrador: importar nunca
            publica. Un borrador generado con IA no está verificado.
          </p>
        </div>
      </div>
      <ImportForm action={importAction} />
    </Shell>
  );
}
