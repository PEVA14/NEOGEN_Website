import { redirect } from "next/navigation";

import { FlowNotice } from "@/components/checkout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { firstIncomplete } from "@/domain/checkout";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { bagEnabled } from "@/payments";
import { currentDraft } from "@/server/checkout/session";

import { notFound } from "next/navigation";

import type { Metadata } from "next";

/**
 * NEVER CACHED, NEVER PRERENDERED.
 *
 * Every screen in this flow is specific to one browser's checkout session, and
 * several render a customer's own name, phone and address. A cached copy
 * served to a second visitor would be a data leak rather than a stale page.
 *
 * Declared explicitly rather than relying on `cookies()` having been read.
 * That inference is real but fragile: the flag-off branch of this route
 * returns before it touches a cookie, which was enough for the build to
 * prerender the entire checkout as static HTML — exactly the failure this
 * export prevents.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.checkout.title,
    description: dict.meta.descriptions.checkout,
    alternates: alternates(locale, routes.checkout),
    /* A transactional surface. Kept explicit rather than left to a robots
       file, and `follow: false` too — there is nothing here to crawl onward
       from that is not already reachable from the catalogue. */
    robots: { index: false, follow: false },
  };
}

/**
 * /checkout — a dispatcher, not a page.
 *
 * WHY THE FLOW IS SIX ROUTES AND THIS IS A SWITCHBOARD. Each step is a real
 * URL, so browser back and forward behave, a step can be reloaded, and every
 * validation a customer meets runs on the server in the same code that
 * decides whether the order may be created. A single page holding step state
 * in the client would have needed a second, weaker copy of every rule — and
 * would have stopped working the moment a bundle failed to load, on the one
 * surface where that matters most.
 *
 * So this route answers one question — which step is next — and sends them
 * there. `firstIncomplete` derives it from the draft, so a customer who
 * closed the tab after entering their address returns to delivery rather
 * than to the beginning.
 *
 * The two cases it does NOT redirect are the two that would be a lie: with
 * commerce switched off, or with nothing to buy, there is no step to send
 * anyone to, and a bounce to the catalogue would leave them wondering what
 * they did wrong.
 */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const path = (to: string) => localizePath(to, locale);

  const copy = !bagEnabled() ? dict.checkout.unavailable : null;
  if (copy) return <Notice copy={copy} path={path} />;

  const draft = await currentDraft();
  if (!draft || draft.snapshot.lines.length === 0) {
    return <Notice copy={dict.checkout.expired} path={path} />;
  }

  if (draft.orderId) redirect(path(routes.orderConfirmation(draft.orderId)));

  redirect(path(routes.checkoutStep(firstIncomplete(draft))));
}

function Notice({
  copy,
  path,
}: {
  copy: {
    index: string;
    label: string;
    title: string;
    body: string;
    catalogue: string;
    bag: string;
  };
  path: (to: string) => string;
}) {
  return (
    <Section mode="quiet">
      <Container width="full">
        <FlowNotice
          index={copy.index}
          label={copy.label}
          title={copy.title}
          body={copy.body}
          actions={[
            { href: path(routes.products), label: copy.catalogue, primary: true },
            { href: path(routes.cart), label: copy.bag },
          ]}
        />
      </Container>
    </Section>
  );
}
