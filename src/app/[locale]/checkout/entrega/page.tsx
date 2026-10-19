import { Suspense } from "react";

import {
  BlockNotice,
  DeliveryOptions,
  QuoteWait,
  ShipTo,
  StepActions,
} from "@/components/checkout";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import {
  formatAddress,
  methodsFor,
  normaliseAddress,
  quotedMethods,
  validateAddress,
} from "@/domain/checkout";
import { refreshShippingQuote, submitDelivery } from "@/server/checkout/actions";
import { saveDraft } from "@/server/checkout/session";
import { quoteForDraft, shippingQuotesEnabled } from "@/server/shipping/quote";

import { CheckoutShell, StepHead, loadStep, stepMetadata } from "../shared";
import styles from "../page.module.css";

import type { StepContext } from "../shared";
import type { MxAddress } from "@/domain/checkout";
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
  return stepMetadata(locale, "delivery");
}

/**
 * 03 DELIVERY — the honest step.
 *
 * The service is DERIVED from the address, not chosen from a list of
 * everything NEOGEN might one day offer: Guadalajara and Durango get the
 * next-day route, everywhere else gets national. One option, pre-selected,
 * because a choice between one thing is friction with no purpose.
 *
 * AND THIS IS WHERE THE FLOW CAN STOP. Below MX$10,000 there is no shipping
 * rate — the owner's answer was "unsure, calculated probably", which is not a
 * rate — so the method's price is null, the order cannot be totalled, and
 * `placementBlock` will refuse it at review. Rather than let a customer
 * discover that two screens later, the block is stated here, next to the
 * thing that caused it, with the one fact that resolves it: reaching the
 * threshold makes shipping free.
 *
 * That is a real product limitation being surfaced rather than papered over.
 * The alternative — printing a plausible number — is unacceptable in every
 * direction: too low and NEOGEN absorbs it, too high and the customer is
 * overcharged, and either way the confirmation is fiction.
 *
 * THE WAIT. A carrier quote can take ~10 s (the quote policy allows up to
 * ~20 s), so the step does not wait for it: the heading and the address the
 * quote is for render at once, and only the options stream in behind
 * `QuoteWait`. Everything that depends on the quote — its notices, the
 * options, the actions — lives in `DeliveryChoices`. The order summary does
 * not depend on it: a changed address already cleared the delivery choice.
 */
export default async function DeliveryStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const load = await loadStep(locale, "delivery");
  if (load.kind === "notice") return load.node;

  const { ctx } = load;
  const { dict, path } = ctx;
  const copy = dict.checkout.steps.delivery;
  const quoted = copy.options.quoted;

  /* `canEnter` has already proved the address is valid, so this cannot fail —
     but normalising through the validator keeps one definition of "valid". */
  const address =
    validateAddress(ctx.draft.address).length === 0 ? normaliseAddress(ctx.draft.address) : null;
  const quoting = shippingQuotesEnabled();
  const back = { href: path(routes.checkoutStep("shipping")), label: copy.back };

  return (
    <CheckoutShell ctx={ctx} step="delivery">
      <div className={styles.step}>
        <StepHead
          index={copy.index}
          title={copy.title}
          note={quoting ? quoted.note : copy.note}
          id="step-delivery"
        />

        {quoting && address ? (
          <ShipTo
            label={quoted.shipTo}
            recipient={address.recipient}
            address={formatAddress(address)}
            change={{ href: back.href, label: quoted.changeAddress }}
          />
        ) : null}

        <Suspense
          fallback={
            <>
              <QuoteWait title={quoted.loading.title} note={quoted.loading.note} />
              <StepActions submit={copy.submit} back={back} disabled />
            </>
          }
        >
          <DeliveryChoices ctx={ctx} address={address} quoting={quoting} />
        </Suspense>
      </div>
    </CheckoutShell>
  );
}

/** Everything on the step that waits for the quote. */
async function DeliveryChoices({
  ctx,
  address,
  quoting,
}: {
  ctx: StepContext;
  address: MxAddress | null;
  quoting: boolean;
}) {
  const { dict, tag, path } = ctx;
  const copy = dict.checkout.steps.delivery;
  const quoted = copy.options.quoted;

  /*
   * QUOTED SHIPPING (D1). With a shipping provider configured, the options
   * are the carrier rates for this address, fetched and kept on the server
   * (`quoteForDraft`). Without one, the free-threshold rule below stands.
   */
  const { draft, stored } = quoting
    ? await quoteForDraft(ctx.draft, async (d) => void (await saveDraft(d)))
    : { draft: ctx.draft, stored: null };
  const subtotal = draft.snapshot.subtotal;
  const methods = !address
    ? []
    : quoting
      ? stored
        ? quotedMethods(stored, address, subtotal)
        : []
      : methodsFor(address, subtotal);
  const unquotable = !quoting && methods.length > 0 && methods.every((m) => m.price === null);
  const quoteError = quoting ? (stored?.error ?? null) : null;
  const free = subtotal.amount >= siteConfig.fulfilment.freeShippingThreshold;

  return (
    <>
      <form action={submitDelivery} className={styles.step} noValidate>
        <input type="hidden" name="locale" value={ctx.locale} />

        {draft.deliveryNotice === "unavailable" ? (
          <BlockNotice title={copy.title} body={quoted.unavailable} />
        ) : null}

        {quoteError ? (
          <BlockNotice
            title={copy.title}
            body={quoted.errors[quoteError]}
            action={
              quoteError === "invalid_address" || quoteError === "no_coverage"
                ? { href: path(routes.checkoutStep("shipping")), label: quoted.editAddress }
                : undefined
            }
          />
        ) : null}

        {quoting && free && methods.length > 0 ? (
          <BlockNotice title={copy.options.free} body={quoted.freeNote} />
        ) : null}

        {/*
         * Stated BEFORE the options, because it changes what the customer
         * should do with them: continuing is possible, but the order will not
         * be placeable until the subtotal clears the threshold.
         */}
        {unquotable ? (
          <BlockNotice
            title={dict.checkout.steps.review.blocked.title}
            body={dict.checkout.steps.review.blocked.delivery_unquotable}
            action={{ href: path(routes.cart), label: dict.checkout.summary.editBag }}
          />
        ) : null}

        <DeliveryOptions
          methods={methods}
          selected={draft.delivery?.quote?.rateId ?? draft.delivery?.methodId ?? null}
          copy={copy.options}
          localeTag={tag}
        />

        <StepActions
          submit={copy.submit}
          back={{ href: path(routes.checkoutStep("shipping")), label: copy.back }}
        />
      </form>

      {/* Outside the step's form: asking again is its own action. */}
      {quoteError && quoteError !== "invalid_address" && quoteError !== "no_coverage" ? (
        <form action={refreshShippingQuote} className={styles.step}>
          <input type="hidden" name="locale" value={ctx.locale} />
          <StepActions submit={quoted.retry} />
        </form>
      ) : null}
    </>
  );
}
