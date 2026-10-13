import "server-only";

import { cookies } from "next/headers";

import { createDraft, newDraftId } from "@/domain/checkout";
import { orderProof, verifyOrderProof, type ProofPurpose } from "@/server/orderAccess";
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
 * partly time-derived on purpose — readable over the phone, printed on the
 * packing slip — which makes them exactly the wrong thing to use as an access
 * token.
 *
 * So the orders this browser may open are kept in httpOnly cookies, and each
 * id carries a proof signed by the server (`orderProof` in
 * `server/orderAccess.ts`). A cookie is still something the person at the
 * browser can write; without the proof, an id they typed into it opens
 * nothing. Two cookies, two levels:
 *
 *   OWNER  (`neogen.orders`)  — placed here, or arrived by the order's signed
 *          email link. Opens the confirmation, the payment step and the
 *          status page.
 *   TRACK  (`neogen.tracked`) — looked up here by order number and email
 *          (`/rastrear`). Opens the status page only, which shows no street
 *          address, phone or email.
 *
 * It is not an account system and does not pretend to be one. Each cookie is
 * capped at the last few orders, because a cookie is not a database and an
 * unbounded list would grow until the header was rejected.
 */
const COOKIES: Record<ProofPurpose, string> = {
  owner: "neogen.orders",
  track: "neogen.tracked",
};
const REMEMBERED = 5;

async function entries(purpose: ProofPurpose): Promise<string[]> {
  const jar = await cookies();
  return (jar.get(COOKIES[purpose])?.value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function remember(purpose: ProofPurpose, orderId: string): Promise<void> {
  const proof = orderProof(purpose, orderId);
  if (!proof) return;
  const existing = (await entries(purpose)).filter((e) => e.split(".")[0] !== orderId);
  const next = [`${orderId}.${proof}`, ...existing].slice(0, REMEMBERED);
  const jar = await cookies();
  jar.set(COOKIES[purpose], next.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    /* Long enough to reload a confirmation and come back to it later the same
       day; short enough that a shared machine does not keep it. */
    maxAge: 60 * 60 * 24,
  });
}

async function holds(purpose: ProofPurpose, orderId: string): Promise<boolean> {
  return (await entries(purpose)).some((entry) => {
    const [id, proof] = entry.split(".");
    return id === orderId && verifyOrderProof(purpose, orderId, proof);
  });
}

/** This browser placed the order, or opened its signed email link. */
export function rememberOrder(orderId: string): Promise<void> {
  return remember("owner", orderId);
}

export function ownsOrder(orderId: string): Promise<boolean> {
  return holds("owner", orderId);
}

/** This browser looked the order up by number and email. Status page only. */
export function rememberTrackedOrder(orderId: string): Promise<void> {
  return remember("track", orderId);
}

/** May this browser see the order's status page? Owners and trackers both. */
export async function canTrackOrder(orderId: string): Promise<boolean> {
  return (await holds("owner", orderId)) || (await holds("track", orderId));
}
