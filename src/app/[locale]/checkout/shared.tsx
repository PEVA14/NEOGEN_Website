import { notFound, redirect } from "next/navigation";

import { CheckoutProgress, FlowNotice, OrderSummary } from "@/components/checkout";
import { Body, Mono } from "@/components/typography";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { canEnter, firstIncomplete, progression, provisionalShipping } from "@/domain/checkout";
import { isLocale, localeTags, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { bagEnabled } from "@/payments";
import { currentDraft } from "@/server/checkout/session";

import styles from "./page.module.css";

import type { CheckoutDraft, CheckoutStepId } from "@/domain/checkout";
import type { Dictionary } from "@/i18n/types";
import type { ReactNode } from "react";

/**
 * SHARED CHECKOUT PLUMBING — the gate every step passes through.
 *
 * Six routes need identical prerequisites: a valid locale, commerce switched
 * on, a draft with something in it, and permission to be on this particular
 * step. Writing that four times per page would guarantee that one of them
 * eventually drifted — and the one that drifts is the one that lets a customer
 * reach the review screen without an address.
 *
 * `canEnter` is enforced HERE, on the server, at render time. Hiding a link is
 * not access control: a URL typed directly has to meet the same rule, because
 * the steps it would skip are the ones that collect where the order ships.
 */

export interface StepContext {
  locale: Locale;
  dict: Dictionary;
  draft: CheckoutDraft;
  /** BCP-47 tag for `Intl`. */
  tag: string;
  path: (to: string) => string;
  stepPath: (step: CheckoutStepId) => string;
}

export type StepLoad = { kind: "ok"; ctx: StepContext } | { kind: "notice"; node: ReactNode };

export async function loadStep(rawLocale: string, step: CheckoutStepId): Promise<StepLoad> {
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const dict = await getDictionary(locale);
  const path = (to: string) => localizePath(to, locale);
  const stepPath = (s: CheckoutStepId) => path(routes.checkoutStep(s));

  /*
   * THE COMMERCE FLAG, server-side. Production defaults to off, so this is
   * what every visitor currently sees — a stated position, not a 404, because
   * the customer asked a reasonable question and deserves the answer.
   */
  if (!bagEnabled()) {
    return {
      kind: "notice",
      node: <Notice copy={dict.checkout.unavailable} path={path} />,
    };
  }

  const draft = await currentDraft();

  /*
   * No draft, or a draft that repriced down to nothing. Both are the same
   * thing from the customer's side — there is no order in progress — and both
   * get the same honest screen rather than a silent bounce.
   */
  if (!draft || draft.snapshot.lines.length === 0) {
    return {
      kind: "notice",
      node: <Notice copy={dict.checkout.expired} path={path} />,
    };
  }

  /* Already ordered from this draft: the confirmation is the only sensible
     destination, and re-entering the flow would risk a second order. */
  if (draft.orderId && step !== "confirmation") {
    redirect(path(routes.orderConfirmation(draft.orderId)));
  }

  if (!canEnter(draft, step)) redirect(stepPath(firstIncomplete(draft)));

  return { kind: "ok", ctx: { locale, dict, draft, tag: localeTags[locale], path, stepPath } };
}

function Notice({
  copy,
  path,
}: {
  copy: Dictionary["checkout"]["unavailable"];
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

/**
 * THE CHECKOUT SHELL — masthead, progression, form column, summary column.
 *
 * ASYMMETRIC BY DESIGN: 7 columns of process against 4 of account, with a
 * column of air between them. An even split would read as two equal panels;
 * this reads as a document with a margin note, which is what it is.
 *
 * DOM ORDER IS THE FORM, THEN THE SUMMARY, on every breakpoint — so the
 * visual order and the focus order never disagree. On a phone the columns
 * simply stack in that same order: the step a customer is on comes first,
 * which is also where their attention already is, and the summary follows
 * without anything being hidden or duplicated.
 */
export function CheckoutShell({
  ctx,
  step,
  children,
}: {
  ctx: StepContext;
  step: CheckoutStepId;
  children: ReactNode;
}) {
  const { dict, draft, tag, path, stepPath } = ctx;
  const checkout = dict.checkout;
  const steps = progression(draft, step);

  /*
   * A chosen method's price wins; before one is chosen, the threshold rule
   * still answers the question. Null only when it is genuinely unknown, in
   * which case no total is printed at all.
   */
  const shipping = draft.delivery?.price ?? provisionalShipping(draft.snapshot.subtotal);
  const total = shipping
    ? { amount: draft.snapshot.subtotal.amount + shipping.amount, currency: "MXN" as const }
    : null;

  return (
    <Section mode="quiet" aria-labelledby="checkout-title">
      <Container width="full">
        <SectionHeader
          index={checkout.index}
          label={`${checkout.label} // ${checkout.qualifier}`}
          title={checkout.title}
          id="checkout-title"
          lede={checkout.lede}
          as="h1"
        />

        <CheckoutProgress
          steps={steps}
          copy={checkout.progress}
          /* Only completed steps link. `hrefFor` returning null for the rest
             keeps that decision in one place rather than in the component. */
          hrefFor={(id) => (id === "confirmation" ? null : stepPath(id))}
        />

        <div className={styles.layout}>
          <div className={styles.flow}>{children}</div>

          {/*
           * A plain div, not an <aside>: a complementary landmark nested
           * inside <main> is reported as a landmark violation, and the order
           * is not complementary content — it is the point of the page. The
           * summary inside carries its own labelled <section>.
           */}
          <div className={styles.aside}>
            <OrderSummary
              lines={draft.snapshot.lines}
              subtotal={draft.snapshot.subtotal}
              delivery={draft.delivery}
              shipping={shipping}
              total={total}
              copy={checkout.summary}
              localeTag={tag}
              bagHref={path(routes.cart)}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}

/** Every step's `<head>`: a title, and never indexable. */
export async function stepMetadata(rawLocale: string, step: CheckoutStepId) {
  if (!isLocale(rawLocale)) return {};
  const dict = await getDictionary(rawLocale);
  const steps = dict.checkout.steps;
  const titles: Record<CheckoutStepId, string> = {
    contact: steps.contact.title,
    shipping: steps.shipping.title,
    delivery: steps.delivery.title,
    payment: steps.payment.title,
    review: steps.review.title,
    confirmation: dict.checkout.confirmation.title,
  };
  return {
    title: `${dict.checkout.title} — ${titles[step]}`,
    description: dict.meta.descriptions.checkout,
    /*
     * NOINDEX, and deliberately without an `alternates` block. A checkout
     * step is per-session and carries a customer's own data; advertising
     * hreflang alternates for it would be inviting a crawler to enumerate a
     * transactional surface.
     */
    robots: { index: false, follow: false },
  };
}

/**
 * A STEP'S OWN HEADING — index, title, note.
 *
 * Repeated on all five collecting steps, so it is one component rather than
 * five near-identical blocks. `<h2>` because the page's `<h1>` is the
 * checkout itself: a step is a section of one process, not a separate page,
 * and a document with two `<h1>`s tells a screen-reader user they have
 * arrived somewhere new when they have not.
 */
export function StepHead({
  index,
  title,
  note,
  id,
}: {
  index: string;
  title: string;
  note: string;
  id: string;
}) {
  return (
    <>
      <div className={styles.stepHead}>
        <Mono size="2xs" className={styles.stepIndex}>
          {index}
        </Mono>
        <h2 className={styles.stepTitle} id={id}>
          {title}
        </h2>
      </div>
      <Body tone="muted" size="sm" className={styles.stepNote}>
        {note}
      </Body>
    </>
  );
}

/**
 * Turn validator output into localized field messages.
 *
 * The domain returns CODES; the dictionary owns sentences. Joined here so
 * neither has to know about the other, and so Spanish and English cannot
 * drift from the rule they describe.
 */
export function messagesFor(
  errors: Record<string, string | undefined>,
  copy: Dictionary["checkout"]["errors"],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [field, code] of Object.entries(errors)) {
    if (!code) continue;
    out[field] = copy[code as keyof typeof copy] ?? copy.required;
  }
  return out;
}
