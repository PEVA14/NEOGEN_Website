import type { TokenizedInstrument } from "./types";

/**
 * WHAT A PAYMENT SUBMISSION MAY CONTAIN — validated before anything else.
 *
 * Pure, so `check:payments` can throw hostile input at it directly. Only a
 * provider token and the provider's identifiers for card brand and type pass,
 * each against a strict pattern; instalments must be 1 (see `payOrder`).
 * There is no field for an amount: whatever a tampered page sends as a price
 * is simply not read.
 */
const ORDER_ID = /^NG-[A-Z0-9]{4,16}-[A-Z0-9]{3}$/;

export function isOrderId(value: string): boolean {
  return ORDER_ID.test(value);
}
const TOKEN = /^[A-Za-z0-9-]{8,128}$/;
const METHOD = /^[a-z0-9_]{2,40}$/;
const TYPES = new Set<TokenizedInstrument["typeId"]>(["credit_card", "debit_card", "prepaid_card"]);

export function readInstrument(raw: unknown): TokenizedInstrument | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const token = typeof r.token === "string" ? r.token : "";
  const methodId = typeof r.methodId === "string" ? r.methodId : "";
  const typeId = typeof r.typeId === "string" ? r.typeId : "";
  const installments = Number(r.installments ?? 1);

  if (!TOKEN.test(token) || !METHOD.test(methodId)) return null;
  if (!TYPES.has(typeId as TokenizedInstrument["typeId"])) return null;
  if (installments !== 1) return null;

  let identification: TokenizedInstrument["identification"] = null;
  const id = r.identification as Record<string, unknown> | null | undefined;
  if (id && typeof id === "object") {
    const type = typeof id.type === "string" ? id.type.trim() : "";
    const number = typeof id.number === "string" ? id.number.trim() : "";
    if (type && number) {
      if (!/^[A-Za-z.]{1,10}$/.test(type) || !/^[A-Za-z0-9-]{1,30}$/.test(number)) return null;
      identification = { type, number };
    }
  }

  return {
    token,
    methodId,
    typeId: typeId as TokenizedInstrument["typeId"],
    installments: 1,
    identification,
  };
}
