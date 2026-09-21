import { notFound } from "next/navigation";

import { ResearchUseNotice } from "@/components/commerce";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { FaqList } from "@/components/support";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { publicArticle } from "@/content/editorial";
import { publicFaq, publishedTopics } from "@/content/faq";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import styles from "./page.module.css";

import type { FaqGroup } from "@/components/support";
import type { FaqLinkId } from "@/content/faq";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const description = dict.meta.descriptions.faq;
  return {
    title: dict.faq.title,
    description,
    ...socialMetadata({ locale, path: routes.faq, title: dict.faq.title, description }),
    alternates: alternates(locale, routes.faq),
  };
}

/** Resolve an answer's link ids to real localized destinations. */
function resolveLinks(
  ids: readonly FaqLinkId[],
  locale: Locale,
  dict: Dictionary,
): readonly { href: string; label: string }[] {
  const path = (route: string) => localizePath(route, locale);
  return ids.map((id) => {
    if (id.startsWith("article:")) {
      const slug = id.slice("article:".length);
      /* The note's own title, not a generic "read more": three answers link
         to three different notes, and three identical labels tell a reader
         nothing about which one to follow. */
      const article = publicArticle(slug);
      return {
        href: path(routes.article(slug)),
        label: article ? article.title[locale] : dict.editorial.readNext,
      };
    }
    switch (id) {
      case "peptides":
        return { href: path(routes.peptides), label: dict.peptides.title };
      case "products":
        return { href: path(routes.products), label: dict.nav.products };
      case "research":
        return { href: path(routes.research), label: dict.nav.research };
      case "articles":
        return { href: path(routes.articles), label: dict.editorial.title };
      default:
        return { href: path(routes.faq), label: dict.faq.title };
    }
  });
}

/**
 * FREQUENTLY ASKED QUESTIONS.
 *
 * WHAT MAKES THIS PAGE DIFFERENT FROM EVERY OTHER SHOP'S FAQ: the answers are
 * assembled from the same values the checkout quotes. The delivery estimates
 * come from `config/site`, the free-shipping threshold from the same constant
 * the bag's meter reads, the catalogue count from the registry. Nothing on
 * this page is a copy of a fact that could outlive it.
 *
 * AND WHAT IS NOT HERE. Returns, cancellation, the age rule and the shipping
 * rate below the threshold are all questions customers ask and none of them
 * has an answer anyone has decided. They sit in `content/faq/registry.ts` with
 * a `blockedOn` note naming what is needed, and they do not render — an FAQ
 * whose answer is "to be defined" is worse than a question left unasked.
 *
 * The FAQPage structured data is emitted from the SAME resolved list, so the
 * markup a search engine reads cannot contain a question the page does not
 * show — which is both the SEO rule and the honest one.
 */
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.faq;
  const path = (route: string) => localizePath(route, locale);

  const entries = publicFaq(locale, dict.shipping.and);
  const groups: readonly FaqGroup[] = publishedTopics(locale, dict.shipping.and).map((topic) => ({
    topic,
    label: copy.topics[topic],
    items: entries
      .filter((entry) => entry.topic === topic)
      .map((entry) => ({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        links: resolveLinks(entry.links, locale, dict),
      })),
  }));

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return (
    <>
      <Section mode="quiet" aria-labelledby="faq-title">
        <Container width="full">
          <SectionHeader
            index="01"
            label={copy.eyebrow}
            title={copy.title}
            lede={copy.lede}
            id="faq-title"
            as="h1"
          />

          <div className={styles.layout}>
            <FaqList groups={groups} />

            <div className={styles.aside}>
              <ResearchUseNotice
                copy={dict.researchUse}
                href={path(routes.article("uso-exclusivo-en-investigacion"))}
                variant="panel"
              />

              <div className={styles.contact}>
                <Mono size="2xs" className={styles.contactTitle}>
                  {copy.contactTitle}
                </Mono>
                <Body size="sm">{copy.contactBody}</Body>
                {/* The one channel that exists. Never labelled as anything it
                    has not been confirmed to be — see `config/site`. */}
                <a href={`tel:${siteConfig.contact.phone}`} className={styles.phone}>
                  {siteConfig.contact.phoneDisplay}
                </a>
              </div>

              <nav className={styles.more} aria-label={dict.peptides.title}>
                <TextLink href={path(routes.peptides)}>{dict.peptides.title}</TextLink>
                <TextLink href={path(routes.articles)}>{dict.editorial.title}</TextLink>
                <TextLink href={path(routes.products)}>{dict.nav.products}</TextLink>
              </nav>
            </div>
          </div>
        </Container>
      </Section>

      {/* Emitted from the rendered list, so the two cannot disagree. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
