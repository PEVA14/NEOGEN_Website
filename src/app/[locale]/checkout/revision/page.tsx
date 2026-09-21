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
  normaliseAddress,
  normaliseContact,
  placementBlock,
} from "@/domain/checkout";
import { quote } from "@/domain/order";
import { paymentAvailable } from "@/payments";
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
 * ONE DECLARATION RENDERS: the research-use condition, and it is required.
 * `placeOrder` refuses to create an order without it — the checkbox is the
 * visible half of a server-side gate, not the gate itself, and posting the
 * form with the box removed lands back here rather than in an order. Every
 * other declaration (Terms, 18+) is still unpublishable because its policy
 * does not exist; see `domain/acknowledgements`.
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
  /*
   * The ONE block a customer can clear without leaving this screen. Before
   * they have tried, it is not a problem to report — it is the checkbox
   * below. After a refused attempt (`attempted.review`), it is.
   */
  const unacknowledgedOnly = block === "acknowledgements_missing" && !draft.attempted.review;
  /*
   * An order is registered only when it can be paid. Stated on screen, with
   * the reason, rather than a button that silently does nothing.
   */
  const payable = paymentAvailable();

  /*
   * The declaration text comes from the dictionary, keyed by id — never from
   * the domain, which holds no copy, and never from the id itself, which is
   * not a sentence. A published declaration with no wording for this locale
   * would be a checkbox with no statement on it, so it is dropped rather than
   * labelled with its own id.
   *
   * `check:checkout` asserts that every publishable declaration HAS wording in
   * both dictionaries, which is what keeps that filter from ever mattering: a
   * required declaration dropped here would disable the button with no box to
   * tick, so the condition is caught at build time rather than survived.
   */
  const declarations = copy.acknowledgements.declarations;
  const acknowledgements: readonly AcknowledgementItem[] = publicAcknowledgements()
    .map((ack) => ({
      id: ack.id,
      version: ack.version,
      label: declarations[ack.id as keyof typeof declarations] ?? "",
      required: ack.required,
      policy: null,
    }))
    .filter((item) => item.label !== "");

  return (
    <CheckoutShell ctx={ctx} step="review">
      {/*
       * `noValidate` is the convention on every other step, where the server
       * owns validation and native bubbles would duplicate it in a different
       * voice. THIS form is the exception: its only input is the declaration
       * checkbox, and the browser's own `required` handling is the one thing
       * that stops an accidental submit with no JavaScript at all. The server
       * still refuses the order either way.
       */}
      <form action={placeOrder} className={styles.step}>
        <input type="hidden" name="locale" value={ctx.locale} />

        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-review" />

        {/* What the server changed since the bag — dropped lines, moved
            prices, clamped quantities. Never silent. */}
        <AdjustmentNotice
          adjustments={draft.adjustments}
          copy={dict.checkout.adjustments}
          localeTag={tag}
        />

        {block && !unacknowledgedOnly ? (
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

        {!block && !payable ? (
          <BlockNotice title={copy.blocked.title} body={copy.blocked.payment_unavailable} />
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
         * DISABLED FOR WHAT THE CUSTOMER CANNOT FIX HERE — an incomplete
         * address, an unquotable delivery, no processor. NOT for an unticked
         * declaration: that is fixable on this very screen, and a button that
         * stays dead after the box is ticked is a dead end, because this form
         * is server-rendered and nothing re-renders on a click.
         *
         * The checkbox is `required`, so the browser refuses the submit on its
         * own — no JavaScript involved — and `placeOrder` re-checks regardless.
         * The disabled state is a courtesy; the gate is the server.
         */}
        <StepActions
          submit={copy.submit}
          disabled={(block !== null && !unacknowledgedOnly) || !payable}
          back={{ href: path(routes.checkoutStep("delivery")), label: copy.back }}
        />
      </form>
    </CheckoutShell>
  );
}
