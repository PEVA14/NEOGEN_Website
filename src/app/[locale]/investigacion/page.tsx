import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { Body } from "@/components/typography";
import { CompoundIndexHead, CompoundRow, DocumentLedger, TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { getWorld, worldIds } from "@/config/worlds";
import { isLocale } from "@/i18n/config";
import { isPublishable, products } from "@/data/catalog";
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
  return { title: dict.research.title, alternates: alternates(locale, routes.research) };
}

/**
 * NEOGEN RESEARCH — documentation infrastructure, not a blog.
 *
 * WHAT THIS PAGE IS, GIVEN THAT NOTHING HAS BEEN PUBLISHED YET.
 * -------------------------------------------------------------
 * The obvious move — an article grid with three placeholder cards — would be a
 * page pretending to have an archive. So the hub is built around what actually
 * exists: the compound register, and the classes of record the documentation
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
  const placeholder = dict.status.placeholder;
  const path = (to: string) => localizePath(to, locale);

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
          <ul>
            <CompoundIndexHead columns={[...hub.register.columns]} />
            {worldIds.map((id, index) => {
              const world = getWorld(id);
              return (
                <CompoundRow
                  key={id}
                  index={String(index + 1).padStart(2, "0")}
                  world={id}
                  worldLabel={dict.home.products.worldLabels[id]}
                  name={world.productName}
                  /* Deep-link where a product page carries the documentation;
                     otherwise the catalogue, so no row points at a 404. */
                  href={
                    products.some((p) => p.world === world.id && isPublishable(p))
                      ? path(routes.product(world.slug))
                      : path(routes.products)
                  }
                  /* Neutral vocabulary throughout. A code that does not exist
                     is a placeholder, not a fabricated identifier. */
                  fields={[
                    { key: hub.register.columns[0], value: placeholder },
                    { key: hub.register.columns[1], value: dict.status.pending },
                    { key: hub.register.columns[2], value: dict.status.tbd },
                  ]}
                />
              );
            })}
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
