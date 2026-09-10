import "server-only";

import { cookies } from "next/headers";

import { createDraft, newDraftId } from "@/domain/checkout";
import { draftStore } from "@/server/persistence";

import type { CheckoutDraft } from "@/domain/checkout";

/**
 * THE CHECKOUT SESSION — a cookie holding an opaque id, and nothing else.
 *
 * WHY THE DRAFT IS NOT IN THE COOKIE. Everything a customer types in checkout
 * is personal data: name, phone, home address. A cookie is sent to the server
 * on every request including static assets, is readable by any script if the
 * `httpOnly` flag is ever lost, and appears in any diagnostic that logs
 * headers. So the cookie carries a random 128-bit id and the data stays
 * server-side, where a future store can encrypt it at rest and delete it on a
 * schedule.
 *
 * The flags are the security surface of this module and are all deliberate:
 *   httpOnly — no client script needs this, and none should read it.
 *   sameSite lax — checkout is entered by navigation, never cross-site POST.
 *   secure in production — the id is a session capability over the wire.
 *   path / — the confirmation route and the bag both need it.
 *   no maxAge — a session cookie. A checkout draft should not outlive the
 *     browser session that created it, and one that did would be an address
 *     sitting on a shared machine.
 */
const COOKIE = "neogen.checkout";

/** Read the current draft, or null. Safe in any server context. */
export async function currentDraft(): Promise<CheckoutDraft | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return draftStore().get(id);
}

/**
 * Get or create the draft.
 *
 * ONLY CALLABLE FROM A SERVER ACTION OR ROUTE HANDLER, because it writes a
 * cookie and Next forbids that during rendering. Steps therefore call
 * `currentDraft()` and redirect when it is missing, rather than silently
 * minting one mid-render — which would also mean a crawler or a prefetch could
 * create drafts.
 */
export async function ensureDraft(): Promise<CheckoutDraft> {
  const existing = await currentDraft();
  if (existing) return existing;

  const jar = await cookies();
  const draft = createDraft(newDraftId());
  await draftStore().put(draft);
  jar.set(COOKIE, draft.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return draft;
}

export async function saveDraft(draft: CheckoutDraft): Promise<CheckoutDraft> {
  return draftStore().put(draft);
}

/**
 * Discard the draft after an order is created.
 *
 * The DRAFT goes; the ORDER stays. Leaving the draft would let a reload of the
 * review step create a second order from the same basket — the classic
 * double-submit — and `draft.orderId` guards that too, but removing the
 * capability entirely is stronger than guarding it.
 */
export async function clearDraft(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await draftStore().delete(id);
  jar.delete(COOKIE);
}

/**
 * WHICH ORDERS THIS BROWSER MAY READ.
 *
 * A confirmation page carries a name, a phone number and a home address, so
 * knowing an order id must not be enough to see it. Order ids are short and
 * partly time-derived on purpose — readable over the phone — which makes them
 * exactly the wrong thing to use as an access token.
 *
 * So the ids this browser created are kept in their own httpOnly cookie and
 * the confirmation route checks membership. It is not an account system and
 * does not pretend to be one: it is the minimum that stops one customer's
 * address being served to anyone who guesses a reference. A real "look up my
 * order" flow needs identity, which V1 does not have.
 *
 * Capped at the last few, because a cookie is not a database and an unbounded
 * list would grow until the header was rejected.
 */
const ORDERS_COOKIE = "neogen.orders";
const REMEMBERED = 5;

export async function rememberOrder(orderId: string): Promise<void> {
  const jar = await cookies();
  const existing = (jar.get(ORDERS_COOKIE)?.value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const next = [orderId, ...existing.filter((id) => id !== orderId)].slice(0, REMEMBERED);
  jar.set(ORDERS_COOKIE, next.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    /* Long enough to reload a confirmation and come back to it later the same
       day; short enough that a shared machine does not keep it. */
    maxAge: 60 * 60 * 24,
  });
}

export async function ownsOrder(orderId: string): Promise<boolean> {
  const jar = await cookies();
  const ids = (jar.get(ORDERS_COOKIE)?.value ?? "").split(",");
  return ids.includes(orderId);
}
