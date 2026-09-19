import "server-only";

import { readMercadoPagoConfig, SANDBOX_PAYER_EMAIL } from "./config";
import { verifySignature } from "./signature";
import { formatAmount, snapshotOf } from "./vocabulary";

import type { Order } from "@/domain/order/types";
import type {
  ChargeResult,
  PaymentError,
  PaymentProvider,
  StatusResult,
  TokenizedInstrument,
  WebhookVerdict,
} from "../../types";
import type { MercadoPagoConfig } from "./config";
import type { MpOrder } from "./vocabulary";

/**
 * THE MERCADO PAGO ADAPTER — Checkout API via the Orders API.
 *
 * WHY THIS PATH. Mercado Pago's current documentation recommends the Orders
 * API (`/v1/orders`) for Checkout API integrations in Mexico over the older
 * Payments API, and recommends the Card Payment Brick for collecting card data
 * on the merchant's own page. Both are used here: the Brick tokenizes the card
 * inside Mercado Pago's iframes, and this adapter creates a Mercado Pago order
 * for NEOGEN's order with that token, in `automatic` processing mode.
 *
 * ONE MERCADO PAGO ORDER PER ATTEMPT. The Orders API accepts one payment
 * transaction per order, so a retry after a decline creates a new Mercado
 * Pago order. Each carries NEOGEN's order id as `external_reference`, which is
 * how a payment can be traced back even when its id was never stored.
 *
 * WHAT IS SENT: the order's own total, the order id as external reference, the
 * payer's email (and the tax id the Brick may collect), and the card token.
 * Line items, names, phone and address are NOT sent — they are not required
 * by the API, and sending product names to a processor is a decision for the
 * owner, not a default (docs/PAYMENTS.md, "Data minimisation").
 *
 * No SDK. The Orders API is four HTTPS calls; `fetch` is enough, and one less
 * dependency is one less thing holding a secret.
 */
const API = "https://api.mercadopago.com";
/* Mercado Pago's own notification timeout is 22 s; a charge answered slower
   than this is treated as unanswered rather than held open indefinitely. */
const CHARGE_TIMEOUT_MS = 20_000;
const READ_TIMEOUT_MS = 10_000;

type Fetch = typeof fetch;

export function createMercadoPagoProvider(
  deps: {
    config?: () => MercadoPagoConfig | null;
    fetch?: Fetch;
  } = {},
): PaymentProvider {
  const config = deps.config ?? (() => readMercadoPagoConfig());
  const http: Fetch = (...args) => (deps.fetch ?? fetch)(...args);

  const error = (code: PaymentError["code"], message: string): PaymentError => ({ code, message });

  async function readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  return {
    id: "mercadopago",

    isConfigured: () => config() !== null,
    mode: () => config()?.mode ?? null,

    prepare(order) {
      const cfg = config();
      if (!cfg)
        return { ok: false, error: error("unavailable", "Mercado Pago is not configured.") };
      return {
        ok: true,
        action: {
          kind: "embedded",
          component: "mercadopago.cardPayment",
          publicKey: cfg.publicKey,
          amount: { ...order.totals.total },
          testMode: cfg.mode === "test",
        },
      };
    },

    async charge(
      order: Order,
      instrument: TokenizedInstrument,
      idempotencyKey: string,
    ): Promise<ChargeResult> {
      const cfg = config();
      if (!cfg) {
        return {
          kind: "refused",
          error: error("unavailable", "Mercado Pago is not configured."),
          detail: null,
        };
      }

      /* THE AMOUNT IS THE ORDER'S. Nothing the browser sent is in this line. */
      const amount = formatAmount(order.totals.total.amount);
      const payer: Record<string, unknown> = {
        email: cfg.mode === "test" ? SANDBOX_PAYER_EMAIL : order.contact.email,
      };
      if (instrument.identification) payer.identification = instrument.identification;

      const body = {
        type: "online",
        processing_mode: "automatic",
        total_amount: amount,
        external_reference: order.id,
        payer,
        transactions: {
          payments: [
            {
              amount,
              payment_method: {
                id: instrument.methodId,
                type: instrument.typeId,
                token: instrument.token,
                installments: instrument.installments,
              },
            },
          ],
        },
      };

      let response: Response;
      try {
        response = await http(`${API}/v1/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.accessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
          cache: "no-store",
        });
      } catch {
        /* Timeout or network failure: the request may have arrived. */
        return {
          kind: "unanswered",
          error: error("provider_error", "No answer from Mercado Pago."),
        };
      }

      const payload = (await readJson(response)) as MpOrder | null;
      const snapshot = payload ? snapshotOf(payload) : null;

      /*
       * 2xx, or 402 — Mercado Pago answers a DECLINED card with 402 and, when
       * it created the order, the order itself. Either way, an order body is
       * the provider's word on the payment and is used as such.
       */
      if (snapshot && (response.ok || response.status === 402)) {
        return { kind: "answered", snapshot };
      }

      if (response.status === 402) {
        return {
          kind: "refused",
          error: error("declined", "Mercado Pago declined the payment."),
          detail: "generic",
        };
      }

      /*
       * 409 (idempotency key already used) and 423 (key locked) mean a request
       * under THIS attempt's key is known to Mercado Pago — money may have
       * moved. Never treated as a refusal.
       */
      if (response.status === 409 || response.status === 423 || response.status >= 500) {
        return {
          kind: "unanswered",
          error: error("provider_error", `Mercado Pago answered ${response.status}.`),
        };
      }

      /* 400/401/403/404/429 — the order was not created. Nothing was charged. */
      const configProblem = response.status === 401 || response.status === 403;
      return {
        kind: "refused",
        error: error(
          configProblem || response.status === 429 ? "provider_error" : "declined",
          `Mercado Pago refused the request (${response.status}).`,
        ),
        detail: configProblem || response.status === 429 ? null : "card_data",
      };
    },

    async fetchStatus(providerRef: string): Promise<StatusResult> {
      const cfg = config();
      if (!cfg || !/^[A-Za-z0-9_-]{1,64}$/.test(providerRef))
        return { ok: false, reason: "provider_error" };
      try {
        const response = await http(`${API}/v1/orders/${encodeURIComponent(providerRef)}`, {
          headers: { Authorization: `Bearer ${cfg.accessToken}` },
          signal: AbortSignal.timeout(READ_TIMEOUT_MS),
          cache: "no-store",
        });
        if (response.status === 404) return { ok: false, reason: "not_found" };
        if (!response.ok) return { ok: false, reason: "provider_error" };
        const snapshot = snapshotOf(((await readJson(response)) ?? {}) as MpOrder);
        return snapshot ? { ok: true, snapshot } : { ok: false, reason: "provider_error" };
      } catch {
        return { ok: false, reason: "provider_error" };
      }
    },

    async verifyWebhook({ url, headers, body }): Promise<WebhookVerdict> {
      const cfg = config();
      if (!cfg) return { kind: "unauthenticated" };

      const dataId = url.searchParams.get("data.id");
      const requestId = headers.get("x-request-id");

      /* Signature FIRST — nothing about an unauthenticated request is read. */
      if (
        !verifySignature({
          secret: cfg.webhookSecret,
          signatureHeader: headers.get("x-signature"),
          requestId,
          dataId,
        })
      ) {
        return { kind: "unauthenticated" };
      }

      /* The id must come from the SIGNED query, never from the unsigned body. */
      if (!dataId || !/^[A-Za-z0-9_-]{1,64}$/.test(dataId)) return { kind: "malformed" };

      let topic = url.searchParams.get("type");
      if (!topic) {
        try {
          const parsed = JSON.parse(body) as { type?: unknown };
          topic = typeof parsed.type === "string" ? parsed.type : null;
        } catch {
          return { kind: "malformed" };
        }
      }
      if (topic !== "order") return { kind: "ignored", reason: `topic:${topic ?? "none"}` };

      return { kind: "verified", providerRef: dataId };
    },

    async refund(providerRef: string, idempotencyKey: string) {
      const cfg = config();
      if (!cfg)
        return { ok: false, error: error("unavailable", "Mercado Pago is not configured.") };
      try {
        /* A full refund: no body. Partial refunds are an operator decision. */
        const response = await http(`${API}/v1/orders/${encodeURIComponent(providerRef)}/refund`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.accessToken}`,
            "X-Idempotency-Key": idempotencyKey,
          },
          signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
          cache: "no-store",
        });
        return response.ok
          ? { ok: true }
          : { ok: false, error: error("provider_error", `Refund refused (${response.status}).`) };
      } catch {
        return { ok: false, error: error("provider_error", "No answer from Mercado Pago.") };
      }
    },
  };
}

export const mercadoPagoProvider = createMercadoPagoProvider();
