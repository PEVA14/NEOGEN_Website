import Link from "next/link";

import { NeogenMark } from "@/components/brand/NeogenMark";
import { Container, Section } from "@/components/primitives";
import { Body, Heading } from "@/components/typography";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { routes } from "@/config/routes";

/**
 * 404.
 *
 * `not-found.tsx` receives no params, and reading the request would make
 * every page under `[locale]` dynamic. But the `[locale]` layout has already
 * written `<html lang>` for this address, so the page carries the words in
 * both languages and CSS shows the one that matches (B11, 2026-10-15): static,
 * no JavaScript, no hydration mismatch. The hidden copy is `display: none`,
 * so a screen reader reads one language only.
 */
const SHOW_ONE = `html:not(:lang(en)) [data-notfound="en"], html:lang(en) [data-notfound="es"] { display: none; }`;

export default async function NotFound() {
  const dicts = await Promise.all(locales.map(async (l) => [l, await getDictionary(l)] as const));

  return (
    <Section mode="quiet">
      <style>{SHOW_ONE}</style>
      <Container>
        {/* Nothing connects here: the mark's nodes, without their
            connections. Decorative. */}
        <NeogenMark form="points" className="mb-(--space-md) h-12 text-(--ink-muted)" />
        {dicts.map(([locale, dict]) => (
          <div key={locale} data-notfound={locale} lang={locale}>
            <Heading level={1} size="3xl">
              {dict.error.notFoundTitle}
            </Heading>
            <Body className="mt-(--space-sm)">{dict.error.notFoundBody}</Body>
            <Link
              href={localizePath(routes.home, locale)}
              className="mt-(--space-lg) inline-block text-sm text-(--ink-primary) underline underline-offset-4"
            >
              {dict.error.backHome}
            </Link>
          </div>
        ))}
      </Container>
    </Section>
  );
}
