import {
  Acknowledgements,
  AdjustmentNotice,
  BlockNotice,
  ReviewPanel,
  StepActions,
} from "@/components/checkout";
import { routes } from "@/config/routes";
import { publicAcknowledgements } from "@/domain/acknowledgements";
import {
  formatAddress,
  missingAcknowledgements,
  normaliseAddress,
  normaliseContact,
  placementBlock,
} from "@/domain/checkout";
import { quote } from "@/domain/order";
import { placeOrder } from "@/server/checkout/actions";

import { CheckoutShell, StepHead, loadStep, stepMetadata } from "../shared";
import styles from "../page.module.css";

import type { AcknowledgementItem } from "@/components/checkout";
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
  return stepMetadata(locale, "review");
}

/**
 * 05 REVIEW — the screen that answers "is this exactly what I'm ordering?"
 *
 * Everything that would compete with that question is absent: no upsell, no
 * newsletter, no shipping protection, no last-minute cross-sell. This is the
 * screen before a commitment and its job is certainty, not conversion.
 *
 * THE NUMBERS ARE THE SERVER'S SNAPSHOT — the same object `createOrder`
 * freezes — so there is no transformation between what is reviewed and what
 * is recorded. Its timestamp is printed, because a price someone is asked to
 * approve should say when it was quoted.
 *
 * THE PLACE BUTTON IS DISABLED ONLY WITH AN EXPLANATION. `placementBlock`
 * returns a code, the block notice names it and links to the step that fixes
 * it. A disabled primary action with no stated reason is the single most
 * frustrating thing a checkout can do.
 *
 * DECLARATIONS RENDER NOTHING. No acknowledgement is approved and no policy
 * behind one is approved, so `publicAcknowledgements()` is empty — see
 * `domain/acknowledgements` for why an unapproved checkbox is worse than none.
 */
export default async function ReviewStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const load = await loadStep(locale, "review");
  if (load.kind === "notice") return load.node;

  const { ctx } = load;
  const { dict, draft, tag, path } = ctx;
  const copy = dict.checkout.steps.review;
  const reviewCopy = dict.checkout.review;

  const contact = normaliseContact(draft.contact);
  const address = normaliseAddress(draft.address);
  const totals = quote(draft.snapshot.lines, draft.delivery);

  /* `canEnter` guarantees a delivery selection exists by this point. */
  const delivery = draft.delivery;
  if (!delivery) return null;

  const block = placementBlock(draft);
  const missing = missingAcknowledgements(draft);

  /*
   * Empty today. Each entry would carry its own approved declaration text
   * from the dictionary; there is no copy for any of them because none is
   * approved, so the list maps to nothing and the fieldset does not render.
   */
  const acknowledgements: readonly AcknowledgementItem[] = publicAcknowledgements().map((ack) => ({
    id: ack.id,
    version: ack.version,
    label: ack.id,
    required: ack.required,
    policy: null,
  }));

  return (
    <CheckoutShell ctx={ctx} step="review">
      <form action={placeOrder} className={styles.step} noValidate>
        <input type="hidden" name="locale" value={ctx.locale} />

        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-review" />

        {/* What the server changed since the bag — dropped lines, moved
            prices, clamped quantities. Never silent. */}
        <AdjustmentNotice
          adjustments={draft.adjustments}
          copy={dict.checkout.adjustments}
          localeTag={tag}
        />

        {block ? (
          <BlockNotice
            title={copy.blocked.title}
            body={copy.blocked[block]}
            action={
              block === "empty"
                ? { href: path(routes.cart), label: dict.checkout.summary.editBag }
                : {
                    href: path(
                      routes.checkoutStep(
                        block === "contact_incomplete"
                          ? "contact"
                          : block === "shipping_incomplete"
                            ? "shipping"
                            : block === "delivery_missing" || block === "delivery_unquotable"
                              ? "delivery"
                              : "review",
                      ),
                    ),
                    label: copy.blocked.action,
                  }
            }
          />
        ) : null}

        <ReviewPanel
          lines={draft.snapshot.lines}
          contact={contact}
          address={address}
          delivery={delivery}
          totals={totals}
          pricedAt={draft.snapshot.pricedAt}
          copy={reviewCopy}
          localeTag={tag}
          editHrefs={{
            items: path(routes.cart),
            contact: path(routes.checkoutStep("contact")),
            shipping: path(routes.checkoutStep("shipping")),
            delivery: path(routes.checkoutStep("delivery")),
          }}
          formatAddressLine={formatAddress(address)}
        />

        <Acknowledgements items={acknowledgements} copy={copy.acknowledgements} />

        {/*
         * Disabled when anything blocks placement — including a missing
         * declaration, which is unreachable today because none is required.
         * The reason is always on screen above.
         */}
        <StepActions
          submit={copy.submit}
          disabled={block !== null || missing.length > 0}
          back={{ href: path(routes.checkoutStep("payment")), label: copy.back }}
        />
      </form>
    </CheckoutShell>
  );
}
