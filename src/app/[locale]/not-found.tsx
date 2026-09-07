import Link from "next/link";

import { Container, Section } from "@/components/primitives";
import { Body, Heading } from "@/components/typography";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { routes } from "@/config/routes";

/**
 * 404.
 *
 * `not-found.tsx` cannot read route params, so it falls back to the default
 * locale (Spanish — the primary market).
 */
export default async function NotFound() {
  const dict = await getDictionary(defaultLocale);

  return (
    <Section mode="quiet" aria-labelledby="notfound-title">
      <Container>
        <Heading level={1} id="notfound-title" size="3xl">
          {dict.error.notFoundTitle}
        </Heading>
        <Body className="mt-(--space-sm)">{dict.error.notFoundBody}</Body>
        <Link
          href={localizePath(routes.home, defaultLocale)}
          className="mt-(--space-lg) inline-block text-sm text-(--ink-primary) underline underline-offset-4"
        >
          {dict.error.backHome}
        </Link>
      </Container>
    </Section>
  );
}
