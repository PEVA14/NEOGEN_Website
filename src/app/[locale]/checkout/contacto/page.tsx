import { ErrorSummary, Field, StepActions, errorsFor } from "@/components/checkout";
import { Mono } from "@/components/typography";
import { validateContact } from "@/domain/checkout";
import { submitContact } from "@/server/checkout/actions";

import { CheckoutShell, StepHead, loadStep, messagesFor, stepMetadata } from "../shared";
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
  return stepMetadata(locale, "contact");
}

/**
 * 01 CONTACT — three fields, and no account.
 *
 * GUEST CHECKOUT IS THE ONLY CHECKOUT, deliberately. There is no account
 * system, and adding a sign-up wall in front of a first purchase is the most
 * reliable way to lose it. Nothing here depends on identity: the order is
 * addressed by a cookie, and if accounts ever arrive they attach to an order
 * that already exists rather than gating one.
 *
 * WHY THREE FIELDS AND NOT TWO. Phone is required, not optional, because
 * delivery in Mexico routinely depends on a courier being able to call — an
 * unreachable number is a failed delivery rather than a cosmetic gap. Email
 * is required because it is where the record goes. Nothing else is asked.
 *
 * ONE NAME FIELD. Mexican names commonly carry two surnames, and a fixed
 * first/last pair mangles them.
 */
export default async function ContactStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const load = await loadStep(locale, "contact");
  if (load.kind === "notice") return load.node;

  const { ctx } = load;
  const { dict, draft } = ctx;
  const copy = dict.checkout.steps.contact;

  /*
   * Errors are DERIVED from the stored values on every render, and shown only
   * once the step has been submitted. Nothing stale is possible: there is no
   * error list in the draft to outlive the value it described.
   */
  const issues = validateContact(draft.contact);
  const errors = messagesFor(
    errorsFor(issues, draft.attempted.contact === true),
    dict.checkout.errors,
  );

  const labels: Record<string, string> = {
    email: copy.email,
    name: copy.name,
    phone: copy.phone,
  };

  return (
    <CheckoutShell ctx={ctx} step="contact">
      <form action={submitContact} className={styles.step} noValidate>
        {/* The action has no route params, so the locale travels with the
            submission — see `localeOf` in the actions module. */}
        <input type="hidden" name="locale" value={ctx.locale} />

        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-contact" />

        <ErrorSummary
          title={dict.checkout.errors.title}
          entries={Object.entries(errors)
            .filter(([, message]) => Boolean(message))
            .map(([field, message]) => ({
              field,
              label: labels[field] ?? field,
              message: message as string,
            }))}
        />

        <div className={styles.fields}>
          <Field
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            copy={{ label: copy.email, hint: copy.emailHint }}
            error={errors.email}
            defaultValue={draft.contact.email}
            required
          />
          <Field
            name="name"
            autoComplete="name"
            maxLength={120}
            copy={{ label: copy.name, hint: copy.nameHint }}
            error={errors.name}
            defaultValue={draft.contact.name}
            required
            span="half"
          />
          <Field
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={40}
            copy={{ label: copy.phone, hint: copy.phoneHint }}
            error={errors.phone}
            defaultValue={draft.contact.phone}
            required
            span="half"
          />
        </div>

        <Mono size="2xs" className={styles.locked}>
          {copy.guestNote}
        </Mono>

        <StepActions submit={copy.submit} />
      </form>
    </CheckoutShell>
  );
}
