"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/ui/ProductCard";
import { SimpleEffects } from "@/components/ui/SimpleEffects";
import { approvalBlockers, DESCRIPTION_SOFT_LIMIT, effectFindings } from "@/content/effects/rules";
import { EFFECT_STATUSES } from "@/content/effects/types";

import { EFFECTS } from "../../../copy";
import styles from "../../../ops.module.css";
import local from "../effects.module.css";

import type { WorldId } from "@/config/worlds";
import type { EffectStatus, EffectTag, SimpleEffectsEntry } from "@/content/effects/types";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { Locale } from "@/i18n/config";

/** What the real catalogue card needs, per language — built on the server. */
export interface PreviewCard {
  slug: string;
  world: WorldId | null;
  worldLabel?: string;
  areaId: string | null;
  areaLabel?: string;
  eyebrow: string;
  name: string;
  subtitle: string | null;
  price: string | null;
  priceFrom: string;
  presentationRange: string | null;
  presentations: number;
  ctaLabel: string;
}

/**
 * THE EDITOR — the form, its findings as you type, and the preview.
 *
 * Saving goes through `saveEffectAction`, which applies the same rules on the
 * server; nothing computed here is trusted. Findings never stop you writing:
 * errors only stop approval.
 */
export function EffectEditor({
  entry,
  vocabulary,
  cards,
  action,
}: {
  entry: SimpleEffectsEntry;
  vocabulary: readonly EffectTag[];
  cards: Record<Locale, PreviewCard>;
  action: (form: FormData) => Promise<void>;
}) {
  const [tags, setTags] = useState<string[]>([...entry.tags]);
  const [es, setEs] = useState(entry.description.es);
  const [en, setEn] = useState(entry.description.en);
  const [notes, setNotes] = useState(entry.notes);
  const [status, setStatus] = useState<EffectStatus>(entry.status);
  const [locale, setLocale] = useState<Locale>("es");

  const draft: SimpleEffectsEntry = {
    ...entry,
    tags,
    description: { es, en },
    status,
  };
  const findings = useMemo(
    () => effectFindings({ tags, description: { es, en } }, vocabulary),
    [tags, es, en, vocabulary],
  );
  const blockers = approvalBlockers(draft, vocabulary);
  const labels = new Map(vocabulary.map((t) => [t.id, t.label]));
  const preview = {
    tags: tags.map((id) => labels.get(id)?.[locale] ?? id),
    description: (locale === "es" ? es : en).trim(),
  };
  const toggle = (id: string) =>
    setTags((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );

  return (
    <div className={local.editor}>
      <form action={action} className={styles.panel}>
        <input type="hidden" name="slug" value={entry.slug} />
        <input type="hidden" name="revision" value={entry.revision} />
        {tags.map((id) => (
          <input key={id} type="hidden" name="tags" value={id} />
        ))}
        <header className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Contenido</h2>
          <span className={styles.chip} data-tone={entry.status === "approved" ? "good" : "quiet"}>
            Guardado: {EFFECTS.status[entry.status]}
          </span>
        </header>
        <div className={`${styles.panelBody} ${styles.form}`}>
          <fieldset className={local.tagGrid}>
            <legend className={styles.labelText}>
              Etiquetas — en el orden en que las marques ({tags.length})
            </legend>
            {vocabulary.map((t) => (
              <label key={t.id} className={local.tagOption}>
                <input
                  type="checkbox"
                  checked={tags.includes(t.id)}
                  onChange={() => toggle(t.id)}
                />
                {t.label.es} / {t.label.en}
              </label>
            ))}
          </fieldset>
          <p className={`${styles.hint} ${styles.mono}`}>
            ES: {tags.map((id) => labels.get(id)?.es).join(" · ") || "—"} · EN:{" "}
            {tags.map((id) => labels.get(id)?.en).join(" · ") || "—"}
          </p>

          {(["es", "en"] as const).map((l) => {
            const value = l === "es" ? es : en;
            return (
              <label key={l} className={styles.label}>
                <span className={styles.labelText}>
                  Descripción ({l.toUpperCase()}){" "}
                  <span
                    className={`${local.counter} ${styles.muted}`}
                    data-over={value.trim().length > DESCRIPTION_SOFT_LIMIT ? "true" : undefined}
                  >
                    {value.trim().length}/{DESCRIPTION_SOFT_LIMIT}
                  </span>
                </span>
                <textarea
                  name={`description_${l}`}
                  value={value}
                  onChange={(e) => (l === "es" ? setEs : setEn)(e.target.value)}
                  className={`${styles.textarea} ${local.textarea}`}
                  lang={l}
                />
              </label>
            );
          })}

          <label className={styles.label}>
            <span className={styles.labelText}>Notas internas (nunca se publican)</span>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${styles.textarea} ${local.textarea}`}
            />
          </label>

          <section aria-labelledby="findings-title">
            <h3 id="findings-title" className={styles.labelText}>
              Avisos
            </h3>
            <p className={styles.hint}>{EFFECTS.advisory}</p>
            {findings.length === 0 ? (
              <p className={styles.muted}>Ninguno.</p>
            ) : (
              <ul className={local.findings}>
                {findings.map((f, i) => (
                  <li key={i} className={local.finding}>
                    <span className={styles.chip} data-tone={f.level === "error" ? "bad" : "wait"}>
                      {EFFECTS.findings[f.code]}
                      {f.locale ? ` · ${f.locale.toUpperCase()}` : ""}
                    </span>
                    {f.detail ? <span className={styles.mono}>«{f.detail}»</span> : null}
                    {EFFECTS.findingHelp[f.code] ? (
                      <span className={styles.muted}>{EFFECTS.findingHelp[f.code]}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <fieldset className={styles.form}>
            <legend className={styles.labelText}>Estado</legend>
            <div className={local.radioRow} role="radiogroup" aria-label="Estado">
              {EFFECT_STATUSES.map((s) => (
                <label key={s} className={styles.check}>
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                  />
                  {EFFECTS.status[s]}
                </label>
              ))}
            </div>
            {status === "approved" && findings.some((f) => f.level === "warning") ? (
              <p className={styles.hint} role="status">
                ⚠ Vas a aprobar una ficha con {findings.filter((f) => f.level === "warning").length}{" "}
                aviso(s). Se publicará igual en la próxima compilación.
              </p>
            ) : null}
            {status === "approved" && blockers.length ? (
              <ul className={local.findings}>
                {blockers.map((x) => (
                  <li key={x}>
                    <span className={styles.chip} data-tone="bad">
                      {EFFECTS.blockers[x] ?? x}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>

          <div className={styles.actions}>
            <button type="submit" className={styles.button}>
              Guardar
            </button>
          </div>
        </div>
      </form>

      <section className={`${styles.panel}`} aria-labelledby="preview-title">
        <header className={styles.panelHead}>
          <h2 id="preview-title" className={styles.panelTitle}>
            Vista previa
          </h2>
          <div className={local.localeSwitch} role="group" aria-label="Idioma de la vista previa">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={styles.button}
                data-variant={l === locale ? undefined : "quiet"}
                aria-pressed={l === locale}
                onClick={() => setLocale(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>
        <div className={`${styles.panelBody} ${local.preview}`}>
          <p className={`${styles.muted} ${local.previewNote}`}>
            Lo que el formulario dice ahora, con los componentes públicos. No se publica: un cliente
            solo ve una ficha aprobada, después de volver a compilar el sitio.
          </p>

          <div className={local.frame}>
            <span className={local.surfaceLabel}>Tarjeta del catálogo</span>
            {/* A picture of the card: not focusable, not clickable, not announced twice. */}
            <div className={local.cardFrame} inert>
              <ProductCard
                {...cards[locale]}
                areaId={cards[locale].areaId as DiscoveryAreaId | null}
                href="#"
                variant="store"
                simpleEffects={preview}
              />
            </div>
          </div>

          <div className={local.frame}>
            <span className={local.surfaceLabel}>Página de producto</span>
            <p className={local.surfaceName}>{cards[locale].name}</p>
            <SimpleEffects effects={preview} variant="pdp" />
          </div>

          <div className={local.frame}>
            <span className={local.surfaceLabel}>Vista rápida</span>
            <SimpleEffects effects={preview} variant="quick" />
          </div>

          <div className={local.frame}>
            <span className={local.surfaceLabel}>Registro científico (orientación)</span>
            <p className={local.surfaceName}>{cards[locale].name}</p>
            <SimpleEffects effects={preview} variant="record" />
          </div>
        </div>
      </section>
    </div>
  );
}
