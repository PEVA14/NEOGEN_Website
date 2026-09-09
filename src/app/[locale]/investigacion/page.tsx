import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { Body, Mono } from "@/components/typography";
import { CompoundIndexHead, CompoundRow, DocumentLedger, TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { isLocale, localeTags } from "@/i18n/config";
import { formatStrength, publishedProducts } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { localizePath } from "@/i18n/routing";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const description = dict.meta.descriptions.research;
  return {
    title: dict.research.title,
    description,
    openGraph: { title: dict.research.title, description },
    twitter: { title: dict.research.title, description },
    alternates: alternates(locale, routes.research),
  };
}

/**
 * NEOGEN RESEARCH — documentation infrastructure, not a blog.
 *
 * WHAT THIS PAGE IS, GIVEN THAT NOTHING HAS BEEN PUBLISHED YET.
 * -------------------------------------------------------------
 * The obvious move — an article grid with three placeholder cards — would be a
 * page pretending to have an archive. So the hub is built around what actually
 * exists: the compound register — every published compound, its category, its
 * presentations and its price — and the classes of record the documentation
 * system carries. Both are real structure. Neither asserts that any particular
 * document exists, describes a finding, or names a source.
 *
 * Literature gets its own section and an honest empty state rather than being
 * hidden. An empty section that says so is information; a missing section is a
 * gap the reader cannot see.
 *
 * The rhythm is the site's: masthead → register → records → literature, all
 * Quiet Mode. Research is where a reader reads, so nothing here moves.
 */
export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const hub = dict.research.hub;
  const path = (to: string) => localizePath(to, locale);

  /*
   * THE REGISTER IS THE CATALOGUE, NOT THE THREE WORLDS.
   *
   * It used to iterate `worldIds`, so a "compound register" on a research site
   * listed three compounds while the catalogue held eighty-three — and filled
   * its three columns with "Código PLACEHOLDER", "Pendiente de verificación"
   * and "Por definir", none of which a reader can use. Reading the registry
   * makes it an actual register, and every column now carries a fact the
   * catalogue already knows.
   */
  const register = [...publishedProducts].sort((a, b) => a.name.localeCompare(b.name));
  const prices = await getPrices(register.flatMap((p) => p.variants.map((v) => v.id)));
  const from = new Map(
    register.map((product) => {
      const cheapest = product.variants
        .map((v) => prices.get(v.id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .sort((a, b) => a.amount - b.amount)[0];
      return [product.slug, cheapest ? formatPrice(cheapest, localeTags[locale]) : null];
    }),
  );

  return (
    <>
      <Section mode="quiet" aria-labelledby="research-title">
        <Container width="full">
          <SectionHeader
            index={hub.index}
            label={`${hub.label} // ${hub.qualifier}`}
            title={hub.title}
            id="research-title"
            lede={hub.lede}
            as="h1"
          />
        </Container>
      </Section>

      {/* 02 — THE REGISTER. The same shape the homepage uses, at full scale. */}
      <Section mode="quiet" aria-labelledby="register-title">
        <Container width="full">
          <SectionHeader
            index={hub.register.index}
            label={`${hub.register.label} // ${hub.register.qualifier}`}
            title={hub.register.title}
            id="register-title"
            action={<TextLink href={path(routes.products)}>{hub.register.action}</TextLink>}
          />
          <Mono size="2xs" className="block text-(--ink-muted)">
            {hub.register.countLabel} — {String(register.length).padStart(2, "0")}
          </Mono>
          <ul>
            <CompoundIndexHead columns={[...hub.register.columns]} />
            {register.map((product, index) => (
              <CompoundRow
                key={product.id}
                index={String(index + 1).padStart(2, "0")}
                world={product.world}
                worldLabel={
                  product.world
                    ? dict.home.products.worldLabels[product.world]
                    : dict.products.catalog.categoryLabels[product.category]
                }
                name={product.name}
                href={path(routes.product(product.slug))}
                fields={[
                  {
                    key: hub.register.columns[0],
                    value: dict.products.catalog.categoryLabels[product.category],
                  },
                  {
                    key: hub.register.columns[1],
                    value: product.variants.map((v) => formatStrength(v.strength)).join(" · "),
                  },
                  { key: hub.register.columns[2], value: from.get(product.slug) ?? "—" },
                ]}
              />
            ))}
          </ul>
        </Container>
      </Section>

      {/*
       * 03 — RECORD CLASSES, on warm stone.
       *
       * Reuses the product page's document vocabulary at catalogue scale: this
       * describes what the documentation system CARRIES, not what has been
       * filed. Every record shows the unavailable state, because none has.
       */}
      <Section mode="quiet" aria-labelledby="records-title" className="bg-(--surface-raised)">
        <Container width="full">
          <SectionHeader
            index={hub.documents.index}
            label={`${hub.documents.label} // ${hub.documents.qualifier}`}
            title={hub.documents.title}
            id="records-title"
            lede={hub.documents.lede}
          />
          <DocumentLedger
            records={dict.pdp.documentation.records}
            identifierLabel={dict.home.research.recordLabel}
            stateLabel={dict.home.research.stateLabel}
            stateValue={hub.documents.unavailable}
          />
        </Container>
      </Section>

      {/* 04 — LITERATURE. Empty, and saying so. */}
      <Section mode="quiet" aria-labelledby="literature-title">
        <Container width="full">
          <SectionHeader
            index={hub.literature.index}
            label={`${hub.literature.label} // ${hub.literature.qualifier}`}
            title={hub.literature.title}
            id="literature-title"
          />
          <Body tone="muted">{hub.literature.empty}</Body>
          <Body tone="muted" size="sm" className="neogen-mono mt-(--space-sm)">
            {hub.literature.note}
          </Body>
        </Container>
      </Section>
    </>
  );
}
