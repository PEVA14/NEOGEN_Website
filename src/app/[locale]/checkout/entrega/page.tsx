import { BlockNotice, DeliveryOptions, StepActions } from "@/components/checkout";
import { routes } from "@/config/routes";
import { methodsFor, normaliseAddress, validateAddress } from "@/domain/checkout";
import { submitDelivery } from "@/server/checkout/actions";

import { CheckoutShell, StepHead, loadStep, stepMetadata } from "../shared";
import styles from "../page.module.css";

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
 */
export default async function DeliveryStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const load = await loadStep(locale, "delivery");
  if (load.kind === "notice") return load.node;

  const { ctx } = load;
  const { dict, draft, tag, path } = ctx;
  const copy = dict.checkout.steps.delivery;

  /* `canEnter` has already proved the address is valid, so this cannot fail —
     but normalising through the validator keeps one definition of "valid". */
  const address =
    validateAddress(draft.address).length === 0 ? normaliseAddress(draft.address) : null;
  const methods = address ? methodsFor(address, draft.snapshot.subtotal) : [];
  const unquotable = methods.length > 0 && methods.every((m) => m.price === null);

  return (
    <CheckoutShell ctx={ctx} step="delivery">
      <form action={submitDelivery} className={styles.step} noValidate>
        <input type="hidden" name="locale" value={ctx.locale} />

        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-delivery" />

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
          selected={draft.delivery?.methodId ?? null}
          copy={copy.options}
          localeTag={tag}
        />

        <StepActions
          submit={copy.submit}
          back={{ href: path(routes.checkoutStep("shipping")), label: copy.back }}
        />
      </form>
    </CheckoutShell>
  );
}
