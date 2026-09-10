import { PaymentSlot, StepActions } from "@/components/checkout";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { paymentAvailable } from "@/payments";
import { continuePayment } from "@/server/checkout/actions";

import { CheckoutShell, StepHead, loadStep, stepMetadata } from "../shared";
import styles from "../page.module.css";

import type { PaymentView } from "@/components/checkout";
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
  return stepMetadata(locale, "payment");
}

/**
 * 04 PAYMENT — a first-class step that collects nothing.
 *
 * WHAT IT DOES TODAY. It reports the truth: there is no configured provider,
 * so there is no instrument to choose and no intent to create. The state is
 * rendered as a designed plate with a real explanation and NEOGEN's one live
 * channel, because "intentional" and "broken" look identical when the answer
 * is a greyed-out box.
 *
 * WHY THE INTENT IS NOT CREATED HERE. An intent is a payment against an
 * ORDER, and no order exists until review. Creating one here would mean
 * either inventing an order before the customer has confirmed it, or asking a
 * provider to open a payment for an amount that can still change. So the
 * attempt happens in `placeOrder`, immediately after the order is persisted —
 * which is also where its outcome can be recorded against something.
 *
 * NO SDK, NO SCRIPT, NO NETWORK CALL. A page with no provider must not load a
 * provider's JavaScript, and this one loads none: the step is a server
 * component with a form, and `PaymentSlot` is server-rendered markup.
 *
 * WHEN A PROVIDER EXISTS, `view` becomes the shape its adapter returns and
 * `PaymentSlot` already renders all four — embedded, redirect, instructions,
 * plus the three outcomes. Nothing on this page changes but the value below.
 */
export default async function PaymentStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const load = await loadStep(locale, "payment");
  if (load.kind === "notice") return load.node;

  const { ctx } = load;
  const { dict, tag, path } = ctx;
  const copy = dict.checkout.steps.payment;

  /*
   * The only reachable value. `paymentAvailable()` is false because `none` is
   * the only registered adapter and it never configures — so this cannot be
   * turned on by an environment variable, only by registering a real adapter,
   * which is a reviewed code change.
   */
  const view: PaymentView = paymentAvailable()
    ? /* Unreachable today. Left as the honest default a real adapter would
         replace: an instrument choice belongs to the provider, not to us. */
      { kind: "no_provider" }
    : { kind: "no_provider" };

  return (
    <CheckoutShell ctx={ctx} step="payment">
      <form action={continuePayment} className={styles.step} noValidate>
        <input type="hidden" name="locale" value={ctx.locale} />

        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-payment" />

        <PaymentSlot
          view={view}
          copy={copy.slot}
          localeTag={tag}
          contact={{
            href: `tel:${siteConfig.contact.phone}`,
            display: siteConfig.contact.phoneDisplay,
          }}
        />

        <StepActions
          submit={copy.submit}
          back={{ href: path(routes.checkoutStep("delivery")), label: copy.back }}
        />
      </form>
    </CheckoutShell>
  );
}
