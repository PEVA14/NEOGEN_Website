import { MX_STATES } from "./types";

import type { Contact, MxAddress, ValidationIssue } from "./types";

/**
 * VALIDATION — strong on the things that break a delivery, quiet elsewhere.
 *
 * The brief asked for validation that is not annoying, and the way to get that
 * is to be clear about what each rule is FOR. A postal code that is not five
 * digits cannot route a package, so it is rejected. A name that looks unusual
 * is not wrong, so nothing here inspects names beyond requiring one. There is
 * no rule that exists to make the form feel rigorous.
 *
 * Pure functions over plain objects: no locale, no React, no request. That is
 * what lets `scripts/check-checkout.mjs` test them directly, and what lets the
 * SAME code run in the server action that actually decides.
 */

/** Trim, collapse inner whitespace, and treat blank as absent. */
export function clean(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Digits only, so "+52 33 2065 5447" and "3320655447" compare equal. */
export function digits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D+/g, "") : "";
}

/**
 * Email, checked structurally and no further.
 *
 * Deliberately not one of the maximal RFC-5322 regexes: those reject real
 * addresses, and the only authority on whether an address exists is whether
 * mail to it arrives. This rejects what cannot possibly be an address and
 * accepts the rest.
 */
export function isEmail(value: string): boolean {
  if (value.length > 254 || /\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  return domain.length > 2 && domain.includes(".") && !/^[.-]|[.-]$|\.\./.test(domain);
}

/**
 * A Mexican phone number.
 *
 * Ten national digits, or twelve beginning `52`. Rejecting anything else is
 * correct here rather than pedantic: NEOGEN ships within Mexico only, the
 * number exists so a courier can call, and an unreachable number is a failed
 * delivery rather than a cosmetic problem.
 */
export function isMxPhone(value: string): boolean {
  const d = digits(value);
  if (d.length === 10) return d[0] !== "0" && d[0] !== "1";
  if (d.length === 12) return d.startsWith("52");
  return false;
}

/** Mexican postal codes are exactly five digits. */
export function isMxPostalCode(value: string): boolean {
  return /^\d{5}$/.test(digits(value));
}

export function isMxState(code: string): boolean {
  return MX_STATES.some((s) => s.code === code);
}

function require_(
  issues: ValidationIssue[],
  field: string,
  value: string,
  max: number,
  raw: unknown,
): boolean {
  if (!value) {
    issues.push({ field, code: "required" });
    return false;
  }
  /* Length is checked against the RAW input, because `clean()` truncates: a
     silently shortened street is worse than a rejected one. */
  if (typeof raw === "string" && raw.trim().length > max) {
    issues.push({ field, code: "too_long" });
    return false;
  }
  return true;
}

export function validateContact(contact: Partial<Contact>): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const email = clean(contact.email, 254);
  if (require_(issues, "email", email, 254, contact.email) && !isEmail(email)) {
    issues.push({ field: "email", code: "email_invalid" });
  }

  require_(issues, "name", clean(contact.name, 120), 120, contact.name);

  const phone = clean(contact.phone, 40);
  if (require_(issues, "phone", phone, 40, contact.phone) && !isMxPhone(phone)) {
    issues.push({ field: "phone", code: "phone_invalid" });
  }

  return issues;
}

export function validateAddress(address: Partial<MxAddress>): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  require_(issues, "recipient", clean(address.recipient, 120), 120, address.recipient);
  require_(issues, "street", clean(address.street, 160), 160, address.street);
  require_(issues, "numeroExterior", clean(address.numeroExterior, 20), 20, address.numeroExterior);
  require_(issues, "colonia", clean(address.colonia, 120), 120, address.colonia);
  require_(issues, "city", clean(address.city, 120), 120, address.city);

  const postal = clean(address.postalCode, 10);
  if (require_(issues, "postalCode", postal, 10, address.postalCode) && !isMxPostalCode(postal)) {
    issues.push({ field: "postalCode", code: "postal_invalid" });
  }

  const state = clean(address.state, 8);
  if (require_(issues, "state", state, 8, address.state) && !isMxState(state)) {
    issues.push({ field: "state", code: "state_unknown" });
  }

  /*
   * Country is locked to MX by the form, so a different value did not come
   * from a customer — it came from someone posting the action directly. It is
   * rejected rather than corrected, because quietly rewriting a submitted
   * destination is how a package goes to the wrong country.
   */
  if (address.country !== undefined && address.country !== "MX") {
    issues.push({ field: "country", code: "country_unsupported" });
  }

  /* Optional fields, length-checked only. */
  if (typeof address.notes === "string" && address.notes.trim().length > 400) {
    issues.push({ field: "notes", code: "too_long" });
  }
  if (typeof address.numeroInterior === "string" && address.numeroInterior.trim().length > 20) {
    issues.push({ field: "numeroInterior", code: "too_long" });
  }

  return issues;
}

/** Normalise a validated draft into the stored contact. */
export function normaliseContact(contact: Partial<Contact>): Contact {
  return {
    email: clean(contact.email, 254).toLowerCase(),
    name: clean(contact.name, 120),
    /* Stored as digits with the country code, so one format reaches a courier. */
    phone: (() => {
      const d = digits(contact.phone);
      return d.length === 10 ? `52${d}` : d;
    })(),
  };
}

export function normaliseAddress(address: Partial<MxAddress>): MxAddress {
  const interior = clean(address.numeroInterior, 20);
  const notes = clean(address.notes, 400);
  return {
    recipient: clean(address.recipient, 120),
    street: clean(address.street, 160),
    numeroExterior: clean(address.numeroExterior, 20),
    numeroInterior: interior || null,
    colonia: clean(address.colonia, 120),
    postalCode: digits(address.postalCode).slice(0, 5),
    city: clean(address.city, 120),
    state: clean(address.state, 8),
    country: "MX",
    notes: notes || null,
  };
}

/**
 * A phone number as a Mexican reader writes it.
 *
 * Stored canonically (`52` + ten digits, so one format reaches a courier) and
 * displayed conventionally. A customer checking their own number should see
 * the shape they typed, not the shape an API wants — a receipt printing
 * `523320655447` reads as a fault even though the value is correct.
 */
export function formatPhoneDisplay(phone: string): string {
  const national = phone.startsWith("52") && phone.length === 12 ? phone.slice(2) : phone;
  if (national.length !== 10) return phone;
  return `+52 ${national.slice(0, 2)} ${national.slice(2, 6)} ${national.slice(6)}`;
}

/** One line, for a summary or a label. */
export function formatAddress(address: MxAddress): string {
  const interior = address.numeroInterior ? ` int. ${address.numeroInterior}` : "";
  const state = MX_STATES.find((s) => s.code === address.state)?.name ?? address.state;
  return `${address.street} ${address.numeroExterior}${interior}, ${address.colonia}, ${address.postalCode} ${address.city}, ${state}`;
}
