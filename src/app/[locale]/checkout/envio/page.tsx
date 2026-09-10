import {
  ErrorSummary,
  Field,
  SelectField,
  StepActions,
  TextareaField,
  errorsFor,
} from "@/components/checkout";
import { Mono } from "@/components/typography";
import { routes } from "@/config/routes";
import { MX_STATES, validateAddress } from "@/domain/checkout";
import { submitShipping } from "@/server/checkout/actions";

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
  return stepMetadata(locale, "shipping");
}

/**
 * 02 SHIPPING — a Mexican address, in the shape Mexican addresses take.
 *
 * WHY THIS IS NOT A GENERIC ADDRESS FORM. `numero exterior` is a separate
 * field because it is separate on every Mexican label, form and courier
 * manifest. `colonia` has no equivalent in the anglophone "address line 2"
 * model, and a package addressed without one routinely does not arrive. Both
 * are required; the interior number is not, because plenty of addresses have
 * none.
 *
 * THE STATE IS A CLOSED LIST, not a text field. It is the coarsest routing
 * fact on the address and it also decides the delivery route, so "Jal",
 * "Jalisco" and "JALISCO" arriving as three values would make every
 * downstream question harder than it needs to be.
 *
 * NO POSTAL-CODE LOOKUP, and the form says so. Filling colonia, municipio and
 * state from the CP via SEPOMEX is the right thing to do — later, against a
 * verified source. Guessing them from an unverified one would put a wrong
 * address on a package with more confidence than a typed one.
 *
 * COUNTRY IS LOCKED and rendered as a statement rather than a disabled
 * select. There is one destination; offering a control that cannot change
 * anything is worse than saying so in a sentence.
 */
export default async function ShippingStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const load = await loadStep(locale, "shipping");
  if (load.kind === "notice") return load.node;

  const { ctx } = load;
  const { dict, draft, path } = ctx;
  const copy = dict.checkout.steps.shipping;

  const issues = validateAddress(draft.address);
  const errors = messagesFor(
    errorsFor(issues, draft.attempted.shipping === true),
    dict.checkout.errors,
  );

  const labels: Record<string, string> = {
    recipient: copy.recipient,
    street: copy.street,
    numeroExterior: copy.numeroExterior,
    numeroInterior: copy.numeroInterior,
    colonia: copy.colonia,
    postalCode: copy.postalCode,
    city: copy.city,
    state: copy.state,
    notes: copy.notes,
    country: copy.country,
  };

  return (
    <CheckoutShell ctx={ctx} step="shipping">
      <form action={submitShipping} className={styles.step} noValidate>
        <input type="hidden" name="locale" value={ctx.locale} />

        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-shipping" />

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
            name="recipient"
            autoComplete="name"
            maxLength={120}
            copy={{ label: copy.recipient, hint: copy.recipientHint }}
            error={errors.recipient}
            defaultValue={draft.address.recipient}
            required
          />

          {/* Street across eight, exterior and interior numbers beside it —
              the geometry the address itself has. */}
          <Field
            name="street"
            autoComplete="address-line1"
            maxLength={160}
            copy={{ label: copy.street }}
            error={errors.street}
            defaultValue={draft.address.street}
            required
            span="half"
          />
          <Field
            name="numeroExterior"
            maxLength={20}
            copy={{ label: copy.numeroExterior }}
            error={errors.numeroExterior}
            defaultValue={draft.address.numeroExterior}
            required
            span="third"
          />
          <Field
            name="numeroInterior"
            maxLength={20}
            copy={{ label: copy.numeroInterior, hint: copy.numeroInteriorHint }}
            error={errors.numeroInterior}
            defaultValue={draft.address.numeroInterior ?? ""}
            span="quarter"
          />

          <Field
            name="colonia"
            autoComplete="address-level3"
            maxLength={120}
            copy={{ label: copy.colonia }}
            error={errors.colonia}
            defaultValue={draft.address.colonia}
            required
            span="half"
          />
          <Field
            name="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            copy={{ label: copy.postalCode, hint: copy.postalCodeHint }}
            error={errors.postalCode}
            defaultValue={draft.address.postalCode}
            required
            span="half"
          />

          <Field
            name="city"
            autoComplete="address-level2"
            maxLength={120}
            copy={{ label: copy.city }}
            error={errors.city}
            defaultValue={draft.address.city}
            required
            span="half"
          />
          <SelectField
            name="state"
            autoComplete="address-level1"
            copy={{ label: copy.state }}
            error={errors.state}
            defaultValue={draft.address.state}
            required
            span="half"
            placeholder={copy.statePlaceholder}
            options={MX_STATES.map((state) => ({ value: state.code, label: state.name }))}
          />

          <Mono size="2xs" className={styles.postalNote}>
            {copy.postalNote}
          </Mono>

          <TextareaField
            name="notes"
            maxLength={400}
            copy={{ label: copy.notes, hint: copy.notesHint }}
            error={errors.notes}
            defaultValue={draft.address.notes ?? ""}
          />

          {/* A statement, not a disabled control. There is one destination. */}
          <Mono size="2xs" className={styles.locked}>
            {copy.country} — {copy.countryLocked}
          </Mono>
        </div>

        <StepActions
          submit={copy.submit}
          back={{ href: path(routes.checkoutStep("contact")), label: copy.back }}
        />
      </form>
    </CheckoutShell>
  );
}
