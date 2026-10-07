import Link from "next/link";
import { notFound } from "next/navigation";

import { blankEntry } from "@/content/effects/rules";
import { getProduct, publishedProducts } from "@/data/catalog";
import { getDictionary } from "@/i18n/getDictionary";
import { catalogEntries } from "@/server/catalog";
import { EffectsStoreError, readEffects } from "@/server/effects/store";
import { requireOperator } from "@/server/ops/auth";
import { saveEffectAction } from "@/server/ops/effectsActions";

import { dateTime, EFFECTS } from "../../../copy";
import styles from "../../../ops.module.css";
import { Flash, Shell } from "../../../Shell";
import local from "../effects.module.css";
import { EffectEditor, type PreviewCard } from "./EffectEditor";

import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Simple Effects · ficha" };

/**
 * ONE PRODUCT'S SIMPLE EFFECTS — edit, check, preview, save.
 *
 * The preview renders the public components with what is in the form, in
 * both languages. It is a preview and nothing more: no draft is ever served
 * to a customer, and an approved entry reaches the site on the next build.
 */
export default async function EffectEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; error?: string; b?: string }>;
}) {
  const operator = await requireOperator();
  const { slug } = await params;
  const { ok, error, b } = await searchParams;
  const product = getProduct(slug);
  if (!product || !publishedProducts.some((p) => p.slug === slug)) notFound();

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
  const entry = file.entries[slug] ?? blankEntry(slug);

  /* The real catalogue card's data, in each language, for the preview. */
  const cards = Object.fromEntries(
    await Promise.all(
      (["es", "en"] as const).map(async (locale: Locale) => {
        const dict = await getDictionary(locale);
        const [item] = await catalogEntries([product], { locale, dict });
        const card: PreviewCard = {
          slug: item.slug,
          world: item.world,
          worldLabel: item.worldLabel,
          areaId: item.areaId,
          areaLabel: item.areaId
            ? dict.discovery.areas[item.areaId as keyof typeof dict.discovery.areas]?.short
            : undefined,
          eyebrow: item.categoryLabel,
          name: item.name,
          subtitle: item.subtitle,
          price: item.price,
          priceFrom: dict.products.catalog.from,
          presentationRange: item.range,
          presentations: item.presentations,
          ctaLabel: item.ctaLabel,
        };
        return [locale, card] as const;
      }),
    ),
  ) as Record<Locale, PreviewCard>;

  const order = publishedProducts.map((p) => p.slug);
  const at = order.indexOf(slug);
  const prev = at > 0 ? order[at - 1] : null;
  const next = at < order.length - 1 ? order[at + 1] : null;
  const blockers = (b ?? "").split(",").filter(Boolean);

  return (
    <Shell current="content" operator={operator}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <Link href="/ops/contenido/efectos" className={styles.rowLink}>
              {EFFECTS.title}
            </Link>{" "}
            / {at + 1} de {order.length}
          </p>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={`${styles.mono} ${styles.muted}`}>
            {slug}
            {entry.updatedAt
              ? ` · rev. ${entry.revision} · ${dateTime.format(new Date(entry.updatedAt))} · ${entry.updatedBy} · ${EFFECTS.source[entry.source]}`
              : " · sin contenido todavía"}
          </p>
        </div>
        <nav aria-label="Producto anterior y siguiente" className={local.pager}>
          {prev ? (
            <Link
              href={`/ops/contenido/efectos/${prev}`}
              className={styles.button}
              data-variant="quiet"
            >
              ← Anterior
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/ops/contenido/efectos/${next}`}
              className={styles.button}
              data-variant="quiet"
            >
              Siguiente →
            </Link>
          ) : null}
        </nav>
      </div>
      <Flash ok={ok} error={error} />
      {blockers.length ? (
        <ul className={styles.flash} data-tone="error">
          {blockers.map((x) => (
            <li key={x}>{EFFECTS.blockers[x] ?? x}</li>
          ))}
        </ul>
      ) : null}

      <EffectEditor
        key={`${slug}:${entry.revision}`}
        entry={entry}
        vocabulary={file.vocabulary}
        cards={cards}
        action={saveEffectAction}
      />
    </Shell>
  );
}
