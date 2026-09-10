import type { Money } from "@/data/commerce";
import type { OrderLine } from "@/domain/order/types";

/**
 * CHECKOUT — the shape of a purchase in progress.
 *
 * A DRAFT IS SERVER STATE, and that is the single most important decision in
 * this phase. The bag lives in `localStorage`: it is this browser's opinion
 * about what someone wants to buy, and it can be edited by hand in a console.
 * The moment a customer enters checkout, the server takes over — it reprices
 * every line from the registry, stores the result under an opaque id, and
 * hands back nothing but a cookie.
 *
 * So no price, total, name or presentation on any screen after the bag comes
 * from the client. What the client may say is "these variant ids, these
 * quantities", and even that is re-validated on every step.
 */

/** Minimal contact. No account, no password, no marketing fields. */
export interface Contact {
  email: string;
  /** One field, not first/last. Mexican names commonly carry two surnames and
      splitting them into a fixed two-box form gets them wrong. */
  name: string;
  /** E.164-ish digits. Required, because delivery needs a reachable number. */
  phone: string;
}

/**
 * A MEXICAN ADDRESS, in the shape Mexican addresses actually take.
 *
 * `numeroExterior` is a separate field rather than part of the street line
 * because it is separate on every Mexican label, form and courier manifest,
 * and `colonia` has no equivalent in the generic "address line 2" model — a
 * package addressed without one routinely does not arrive.
 *
 * NO POSTAL-CODE LOOKUP. SEPOMEX data would fill colonia, municipio and state
 * from the CP, and it is the right thing to do later — but there is no
 * verified source wired up, so the fields are typed rather than guessed.
 */
export interface MxAddress {
  recipient: string;
  street: string;
  numeroExterior: string;
  numeroInterior: string | null;
  colonia: string;
  postalCode: string;
  city: string;
  /** One of `MX_STATES` — a code, not free text. */
  state: string;
  /** Locked. NEOGEN ships within Mexico only. */
  country: "MX";
  notes: string | null;
}

/**
 * The 32 federal entities, as codes with their own names.
 *
 * A closed list rather than a text field: a state is the coarsest routing
 * fact on the address, and "Jal", "Jalisco" and "JALISCO" arriving as three
 * different values makes every downstream question harder than it needs to be.
 */
export const MX_STATES: readonly { code: string; name: string }[] = [
  { code: "AGU", name: "Aguascalientes" },
  { code: "BCN", name: "Baja California" },
  { code: "BCS", name: "Baja California Sur" },
  { code: "CAM", name: "Campeche" },
  { code: "CHP", name: "Chiapas" },
  { code: "CHH", name: "Chihuahua" },
  { code: "CMX", name: "Ciudad de México" },
  { code: "COA", name: "Coahuila" },
  { code: "COL", name: "Colima" },
  { code: "DUR", name: "Durango" },
  { code: "GUA", name: "Guanajuato" },
  { code: "GRO", name: "Guerrero" },
  { code: "HID", name: "Hidalgo" },
  { code: "JAL", name: "Jalisco" },
  { code: "MEX", name: "Estado de México" },
  { code: "MIC", name: "Michoacán" },
  { code: "MOR", name: "Morelos" },
  { code: "NAY", name: "Nayarit" },
  { code: "NLE", name: "Nuevo León" },
  { code: "OAX", name: "Oaxaca" },
  { code: "PUE", name: "Puebla" },
  { code: "QUE", name: "Querétaro" },
  { code: "ROO", name: "Quintana Roo" },
  { code: "SLP", name: "San Luis Potosí" },
  { code: "SIN", name: "Sinaloa" },
  { code: "SON", name: "Sonora" },
  { code: "TAB", name: "Tabasco" },
  { code: "TAM", name: "Tamaulipas" },
  { code: "TLA", name: "Tlaxcala" },
  { code: "VER", name: "Veracruz" },
  { code: "YUC", name: "Yucatán" },
  { code: "ZAC", name: "Zacatecas" },
];

/**
 * WHY A METHOD CARRIES A NULLABLE PRICE.
 *
 * The owner's answer on rates was "unsure, calculated probably". That is not a
 * rate. So a method whose cost is not known says so — `price: null` — and the
 * checkout refuses to total an order it cannot total, rather than printing a
 * plausible figure. Free shipping above MX$10,000 IS confirmed, so that path
 * resolves to zero and works today.
 *
 * `handling` is the cold-chain seam. Null means UNDETERMINED, not "none":
 * whether any compound here needs temperature control is a product-integrity
 * question nobody has answered, and a method that quietly claimed "standard"
 * would be answering it.
 */
export type DeliveryMethodId = "local-priority" | "national-standard";

export interface DeliveryMethod {
  id: DeliveryMethodId;
  /** Matches `Order["route"]`, so fulfilment and pricing agree by construction. */
  route: "priority" | "national";
  /** Business days, from `siteConfig.fulfilment.estimateDays`. */
  estimateDays: number;
  /**
   * Cost for THIS order. Null when no rate model applies and the free
   * threshold has not been met — genuinely unknown, never rendered as a number.
   */
  price: Money | null;
  /** Why the price is what it is, for honest UI copy. Never a marketing claim. */
  basis: "free-threshold" | "rate-model-pending";
  /** Special handling. Null = not determined. */
  handling: null;
}

export interface DeliverySelection {
  methodId: DeliveryMethodId;
  route: "priority" | "national";
  estimateDays: number;
  price: Money | null;
}

/** Which step a draft is on. Ordered — the array IS the progression. */
export const CHECKOUT_STEPS = [
  "contact",
  "shipping",
  "delivery",
  "payment",
  "review",
  "confirmation",
] as const;

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number];

/**
 * A VALIDATION ISSUE IS A CODE, NOT A SENTENCE.
 *
 * Copy is localized and lives in the dictionaries; the domain states which
 * field failed and why in stable terms. That keeps the validator testable
 * without a locale and keeps Spanish and English from drifting apart from the
 * rule they describe.
 */
export type IssueCode =
  | "required"
  | "email_invalid"
  | "phone_invalid"
  | "postal_invalid"
  | "state_unknown"
  | "too_long"
  | "country_unsupported";

export interface ValidationIssue {
  field: string;
  code: IssueCode;
}

/**
 * A PRICED LINE, computed on the server from the registry.
 *
 * Structurally an `OrderLine` because it becomes one unchanged: the review
 * screen shows exactly the rows the order will carry, so there is no last
 * transformation in which a number could change.
 */
export type PricedLine = OrderLine;

/**
 * WHAT HAPPENED WHEN THE SERVER LOOKED AT THE CLIENT'S BAG.
 *
 * Every entry here is a thing the customer must be told: a variant we no
 * longer sell, a price that moved, a quantity that was clamped. Silence on any
 * of them is how a shop charges someone a different amount than it showed.
 */
export type LineAdjustment =
  | { kind: "removed_unknown"; variantId: string }
  | { kind: "removed_unpriced"; variantId: string; name: string }
  | { kind: "removed_unavailable"; variantId: string; name: string }
  | { kind: "repriced"; variantId: string; name: string; was: Money; now: Money }
  | { kind: "quantity_clamped"; variantId: string; name: string; from: number; to: number };

/**
 * THE PRICE SNAPSHOT — explicit, timestamped, and the thing that gets paid.
 *
 * §14 of the phase brief: "before payment, the final price snapshot must be
 * explicit". This is it. It is recomputed from the registry every time the
 * customer moves, and the review step compares the snapshot it displayed
 * against a fresh one before creating an order — so a price that changes
 * between reading and paying stops the flow instead of silently changing what
 * is charged.
 */
export interface PriceSnapshot {
  lines: readonly PricedLine[];
  subtotal: Money;
  pricedAt: string;
  /** A cheap equality key over (variantId, quantity, unitPrice) — see `pricing.ts`. */
  fingerprint: string;
}

export interface AcceptedAcknowledgement {
  id: string;
  /** The version accepted. Policy text changes; consent does not travel with it. */
  version: string;
  acceptedAt: string;
}

/**
 * THE DRAFT. Server-side, cookie-addressed, never sent to the browser whole.
 *
 * Field values are stored RAW as submitted, and every screen re-derives its
 * errors from them. There is no stored error list, because a stored error
 * outlives the thing it described: fix the field, and a cached issue would
 * still be on screen. `attempted` is the only submission state kept, and it
 * exists solely so an untouched form does not open covered in red.
 */
export interface CheckoutDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  contact: Partial<Contact>;
  address: Partial<MxAddress>;
  delivery: DeliverySelection | null;
  acknowledged: readonly AcceptedAcknowledgement[];
  snapshot: PriceSnapshot;
  adjustments: readonly LineAdjustment[];
  attempted: Partial<Record<CheckoutStepId, boolean>>;
  /** Set once an order has been created from this draft, so it cannot be twice. */
  orderId: string | null;
}
