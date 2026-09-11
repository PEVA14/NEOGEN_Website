"use server";

import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { accept } from "@/domain/acknowledgements";
import {
  markAttempted,
  methodById,
  normaliseAddress,
  normaliseContact,
  placementBlock,
  select,
  snapshotMatches,
  touch,
  validateAddress,
  validateContact,
  withSnapshot,
} from "@/domain/checkout";
import { priceLines, reprice } from "@/domain/checkout/pricing";
import { createOrder, recordAttempt, transition } from "@/domain/order";
import { isLocale, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { activeProvider, bagEnabled } from "@/payments";
import { notifyOrderPlaced } from "@/server/notifications";
import { orderRepository } from "@/server/persistence";

import { clearDraft, currentDraft, ensureDraft, rememberOrder, saveDraft } from "./session";

import type { RequestedLine } from "@/domain/checkout/pricing";
import type { CheckoutDraft, CheckoutStepId, MxAddress } from "@/domain/checkout";

/**
 * CHECKOUT SERVER ACTIONS — every state change in the purchase, in one file.
 *
 * WHY ACTIONS AND NOT API ROUTES. Each step is a plain `<form action={...}>`.
 * With no JavaScript the browser posts the form and Next runs the action, so
 * the checkout is operable before hydration and after a failed bundle load —
 * on a transactional surface that is worth more than any interaction polish.
 *
 * THE RULE EVERY ACTION FOLLOWS: nothing that arrives is trusted. Form bodies
 * and action arguments are attacker-controlled — a Server Action is a public
 * HTTP endpoint whose arguments happen to be typed on the client, and the
 * types are erased by the time they reach here. So every value is re-read,
 * re-validated and re-priced against the registry, and the TypeScript
 * signature is documentation rather than a guard.
 */

/**
 * Locale travels in a hidden field.
 *
 * It has to come from somewhere: an action has no route params, and the
 * redirect it performs must land on the locale the customer is reading. A
 * missing or unknown value falls back to the default rather than throwing —
 * a bad locale is not worth losing a filled-in address over.
 */
function localeOf(form: FormData): Locale {
  const value = form.get("locale");
  return typeof value === "string" && isLocale(value) ? value : "es";
}

function stepPath(locale: Locale, step: CheckoutStepId): string {
  return localizePath(routes.checkoutStep(step), locale);
}

/**
 * Load the draft or leave.
 *
 * A missing draft means an expired session or a direct hit on an action URL.
 * Either way there is nothing to edit, and the bag is where the customer can
 * start again — so this redirects rather than creating a draft, which would
 * silently manufacture an empty checkout.
 */
async function requireDraft(locale: Locale): Promise<CheckoutDraft> {
  const draft = await currentDraft();
  if (!draft) redirect(localizePath(routes.cart, locale));
  return draft;
}

/** Read a string field, defensively. FormData values can be Files. */
function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/* ------------------------------------------------------------------ entry */

/**
 * ENTER CHECKOUT — the client's bag becomes server state here, once.
 *
 * The ONLY thing the browser is allowed to assert is the list below: variant
 * ids, quantities, and the unit price it displayed. The first two are
 * re-resolved against the registry; the third is used only to notice that a
 * price has moved and tell the customer, never to charge. See
 * `domain/checkout/pricing.ts` — that distinction is the security boundary of
 * the whole flow.
 */
export async function beginCheckout(
  requested: readonly RequestedLine[],
  locale: string,
): Promise<void> {
  const target: Locale = isLocale(locale) ? locale : "es";

  /*
   * The commerce flag, checked server-side. The bag page also disables its
   * button, but a disabled button is a suggestion — this is the enforcement,
   * and without it a hand-made POST could open a checkout on a deployment
   * where purchasing is switched off.
   */
  if (!bagEnabled()) redirect(localizePath(routes.cart, target));

  /* Shape-check every entry rather than trusting the array's declared type. */
  const clean: RequestedLine[] = (Array.isArray(requested) ? requested : [])
    .slice(0, 100)
    .filter((line): line is RequestedLine => Boolean(line) && typeof line === "object")
    .map((line) => ({
      variantId: typeof line.variantId === "string" ? line.variantId.slice(0, 80) : "",
      quantity: Number(line.quantity),
      claimedUnitPrice:
        typeof line.claimedUnitPrice === "number" ? line.claimedUnitPrice : undefined,
    }))
    .filter((line) => line.variantId.length > 0);

  const draft = await ensureDraft();
  const { snapshot, adjustments } = await priceLines(clean);

  /* Nothing survived repricing — every line was unknown, unpriced or
     withdrawn. Back to the bag, which reconciles and explains. */
  if (snapshot.lines.length === 0) redirect(localizePath(routes.cart, target));

  await saveDraft(withSnapshot(draft, snapshot, adjustments));
  redirect(stepPath(target, "contact"));
}

/* ------------------------------------------------------------------- steps */

/** 01 CONTACT. */
export async function submitContact(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await requireDraft(locale);

  const contact = {
    email: field(form, "email"),
    name: field(form, "name"),
    phone: field(form, "phone"),
  };

  /*
   * Raw values are stored whether they validate or not, so a customer who
   * mistypes an email does not lose the name and phone they got right. The
   * step re-derives its errors from these values on render — there is no
   * stored error list to go stale.
   */
  const attempted = markAttempted(touch(draft, { contact }), "contact");
  await saveDraft(attempted);

  if (validateContact(contact).length > 0) redirect(stepPath(locale, "contact"));
  redirect(stepPath(locale, "shipping"));
}

/** 02 SHIPPING. */
export async function submitShipping(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await requireDraft(locale);

  const address: Partial<MxAddress> = {
    recipient: field(form, "recipient"),
    street: field(form, "street"),
    numeroExterior: field(form, "numeroExterior"),
    numeroInterior: field(form, "numeroInterior"),
    colonia: field(form, "colonia"),
    postalCode: field(form, "postalCode"),
    city: field(form, "city"),
    state: field(form, "state"),
    /* Locked. The form has no country control; this is stated rather than
       read, so a posted country cannot change the destination. */
    country: "MX",
    notes: field(form, "notes"),
  };

  /*
   * A changed address can invalidate the delivery selection — a move from
   * Guadalajara to Mérida changes the route and the estimate. Clearing it
   * makes the customer re-choose instead of shipping under a stale method.
   */
  const next = markAttempted(touch(draft, { address, delivery: null }), "shipping");
  await saveDraft(next);

  if (validateAddress(address).length > 0) redirect(stepPath(locale, "shipping"));
  redirect(stepPath(locale, "delivery"));
}

/** 03 DELIVERY. */
export async function submitDelivery(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await requireDraft(locale);

  if (validateAddress(draft.address).length > 0) redirect(stepPath(locale, "shipping"));
  const address = normaliseAddress(draft.address);

  /*
   * The method is RE-DERIVED from the address and the subtotal, and the posted
   * id is only matched against the result. Its price never comes from the
   * form: a posted `price=0` would otherwise buy free shipping.
   */
  const id = field(form, "method");
  const method =
    id === "local-priority" || id === "national-standard"
      ? methodById(address, draft.snapshot.subtotal, id)
      : null;

  const next = markAttempted(
    touch(draft, { delivery: method ? select(method) : null }),
    "delivery",
  );
  await saveDraft(next);

  if (!method) redirect(stepPath(locale, "delivery"));
  redirect(stepPath(locale, "payment"));
}

/**
 * 04 PAYMENT.
 *
 * Collects nothing today and is not pretending to. There is no configured
 * provider, so there is no instrument to choose — the step states that, and
 * continuing records that the customer saw it. When an adapter is registered
 * this is where the instrument choice and the intent creation land.
 */
export async function continuePayment(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await requireDraft(locale);
  await saveDraft(markAttempted(draft, "payment"));
  redirect(stepPath(locale, "review"));
}

/**
 * 05 REVIEW → place the order.
 *
 * The one action that creates a durable record, and the only place a price is
 * finally committed. The order of operations below is the whole safety
 * argument, so it is worth reading as a sequence rather than as steps:
 *
 *   1. REFUSE A SECOND ORDER from the same draft. Reloading a POST is the
 *      most common way a shop charges twice.
 *   2. REPRICE and compare fingerprints. A price that moved between the
 *      review screen being read and this button being pressed stops the flow
 *      and shows the customer what changed. It never charges the new number.
 *   3. RE-CHECK EVERY GATE via `placementBlock`, and send the customer to the
 *      step that is actually blocking rather than failing generically.
 *   4. FILTER ACKNOWLEDGEMENTS through `accept()`, which drops any id that is
 *      not currently publishable — so a posted consent to an unapproved
 *      declaration is discarded rather than recorded.
 *   5. CREATE and PERSIST, then attempt the payment intent.
 */
export async function placeOrder(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await requireDraft(locale);

  if (draft.orderId) redirect(localizePath(routes.orderConfirmation(draft.orderId), locale));

  const fresh = await reprice(draft.snapshot);
  if (!snapshotMatches(draft, fresh.snapshot)) {
    /* Store the new prices and the disclosure, then send them back to read
       it. The order is NOT created. */
    await saveDraft(withSnapshot(draft, fresh.snapshot, fresh.adjustments));
    redirect(stepPath(locale, "review"));
  }

  const accepted = accept(
    form.getAll("acknowledge").filter((v): v is string => typeof v === "string"),
  );
  const withAcks = touch(draft, { acknowledged: accepted });

  const block = placementBlock(withAcks);
  if (block) {
    await saveDraft(withAcks);
    redirect(blockedStep(locale, block));
  }

  const order = createOrder(
    withAcks,
    normaliseContact(withAcks.contact),
    normaliseAddress(withAcks.address),
  );
  /* Unreachable given `placementBlock`, but a null here must never become a
     thrown error on a customer's screen. */
  if (!order) redirect(stepPath(locale, "review"));

  const repository = orderRepository();
  const created = await repository.create(order);
  if (!created.ok) redirect(stepPath(locale, "review"));

  /*
   * ASK THE PROVIDER TO OPEN A PAYMENT.
   *
   * `none` refuses, always — so today this records a refused attempt and the
   * order stays in `created`. The confirmation page reads that state and says
   * plainly that no payment was taken. The success branches are written
   * because they are the shape a real adapter meets, and because writing them
   * later would mean rewriting this action.
   */
  const provider = activeProvider();
  const at = new Date().toISOString();
  const intent = await provider.createIntent(created.order);

  let placed = created.order;
  if (intent.ok) {
    placed = recordAttempt(placed, {
      provider: provider.id,
      at,
      outcome: "intent_created",
      providerRef: intent.providerRef,
    });
    /*
     * A REDIRECT or INSTRUCTIONS intent means the customer still has to act,
     * so the order is awaiting them. An EMBEDDED intent is paid in-page and
     * stays in `created` until the provider says otherwise — we must never
     * advance a state on the strength of having asked.
     */
    if (intent.action.kind !== "embedded") {
      placed = transition(placed, "pending_payment", at) ?? placed;
    }
  } else {
    placed = recordAttempt(placed, {
      provider: provider.id,
      at,
      outcome: "intent_refused",
      errorCode: intent.error.code,
    });
  }

  const saved = await repository.save(placed);
  const final = saved.ok ? saved.order : created.order;

  /* Mark the draft spent BEFORE clearing it, so a race that re-reads the
     draft finds the order id rather than an orderable basket. */
  await saveDraft(touch(withAcks, { orderId: final.id }));
  await rememberOrder(final.id);
  await clearDraft();

  /*
   * NOTIFICATIONS — after the order is durable, never before, and never able
   * to fail it. `notifyOrderPlaced` swallows its own errors: an order that
   * was recorded has been placed, whether or not an email went out. Today no
   * channel is registered, so both messages are queued as pending.
   */
  await notifyOrderPlaced(final, locale);

  redirect(localizePath(routes.orderConfirmation(final.id), locale));
}

/** Send a blocked customer to the step that can unblock them. */
function blockedStep(
  locale: Locale,
  block: NonNullable<ReturnType<typeof placementBlock>>,
): string {
  switch (block) {
    case "empty":
      return localizePath(routes.cart, locale);
    case "contact_incomplete":
      return stepPath(locale, "contact");
    case "shipping_incomplete":
      return stepPath(locale, "shipping");
    case "delivery_missing":
    case "delivery_unquotable":
      return stepPath(locale, "delivery");
    case "acknowledgements_missing":
    case "already_placed":
      return stepPath(locale, "review");
  }
}

/**
 * Re-check the bag against the registry from a checkout step.
 *
 * Used by the review screen's "refresh" affordance and after an adjustment is
 * shown, so a customer can clear a stale-price warning without leaving.
 */
export async function refreshSnapshot(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await requireDraft(locale);
  const fresh = await reprice(draft.snapshot);
  await saveDraft(withSnapshot(draft, fresh.snapshot, fresh.adjustments));
  redirect(stepPath(locale, "review"));
}
