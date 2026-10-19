import "server-only";

import { MX_STATES } from "@/domain/checkout/types";

import { carrierAllowed, readSkydropxConfig } from "./config";
import { verifySkydropxSignature } from "./signature";
import { labelUrl, rateOptions, shipmentSnapshot, trackingState } from "./vocabulary";

import type { Order } from "@/domain/order/types";
import type {
  Parcel,
  QuoteDestination,
  QuoteResult,
  RateOption,
  ShipmentSnapshot,
  ShippingError,
  ShippingProvider,
  ShippingResult,
  ShippingWebhookVerdict,
} from "../../types";
import type { SkydropxConfig } from "./config";

/**
 * THE SKYDROPX ADAPTER — Skydropx PRO API v1 (`api-pro.skydropx.com`), read
 * from its official OpenAPI reference on 2026-10-15. No SDK: a handful of
 * HTTPS calls, like the Mercado Pago adapter.
 *
 *   AUTH      POST /api/v1/oauth/token (client credentials, form-encoded).
 *             The token lives two hours; it is cached per client id and
 *             renewed early, and a 401 renews it once.
 *   QUOTE     POST /api/v1/quotations, then GET /api/v1/quotations/{id}
 *             until `is_completed` — within a time budget, because a
 *             customer is waiting. Rates are valid 24 hours.
 *   SHIP      POST /api/v1/shipments with the chosen `rate_id` and
 *             `unique_shipment: true`: Skydropx caches the answer per rate
 *             for 96 hours and REPLAYS it (200) on a retry, or answers 409
 *             while the first request is still running. With NEOGEN's own
 *             booking record (`domain/order`), that is what makes "one paid
 *             order, one label" hold through retries, crashes and timeouts.
 *   LABEL     GET /api/v1/shipments/{id} → the package's `label_url`, fetched
 *             when an operator asks, never stored or shown to a customer.
 *   CANCEL    POST /api/v1/shipments/{id}/cancellations.
 *   WEBHOOK   HMAC-SHA512 over the raw body (`signature.ts`).
 *
 * Skydropx allows 2 requests per second; polling respects that.
 *
 * WHAT IS SENT. Origin and parcel from configuration; for a quote, the
 * destination's postal code, state, city and colonia; for a label, the
 * recipient's name, street and phone (a carrier needs them to deliver) and
 * the address notes. The customer's EMAIL is not sent: NEOGEN tells the
 * customer about tracking itself, and the contact address on the label is
 * NEOGEN's (`SHIPPING_ORIGIN_EMAIL`).
 */

/*
 * WHEN A QUOTE IS DONE — measured on the first real sandbox quotation
 * (2026-10-19): complete after 17.7 s and 20 polls, but every rate a customer
 * could choose, and the cheapest, were all there by 4.8 s; the rest of the
 * wait resolved services nobody could select. Rates arrived ~2 s apart
 * (MX$159 at ~3 s, the cheaper MX$119 at ~5 s).
 *
 * So checkout stops at the FIRST of:
 *   - Skydropx says the quotation is complete;
 *   - the SELECTABLE set — each rate's id, carrier/service and NEOGEN cost,
 *     hence the cheapest, which sets the free-shipping subsidy — has not
 *     changed for QUOTE_STABLE_MS (twice the gap seen between arrivals);
 *   - QUOTE_HARD_TIMEOUT_MS. Then only a set that is ALREADY stable is
 *     offered; a set still changing is a timeout, never a guess at the
 *     subsidy. Every call inside is cut to the time left.
 * The first usable rate alone never ends the wait.
 */
const QUOTE_HARD_TIMEOUT_MS = 20_000;
const QUOTE_STABLE_MS = 4_000;
const POLL_EVERY_MS = 700;
const CALL_TIMEOUT_MS = 12_000;
/** "Los rates son válidos por 24 horas." */
export const RATE_VALIDITY_MS = 24 * 60 * 60 * 1000;

type Fetch = typeof fetch;

/* Token cache, per API host and client — never logged, never persisted. */
const TOKENS_KEY = "__neogen_skydropx_tokens__";
function tokenCache(): Map<string, { token: string; expiresAt: number }> {
  const g = globalThis as typeof globalThis & {
    [TOKENS_KEY]?: Map<string, { token: string; expiresAt: number }>;
  };
  g[TOKENS_KEY] ??= new Map();
  return g[TOKENS_KEY];
}

/** Test-only. */
export function __resetSkydropxTokens(): void {
  tokenCache().clear();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clip = (value: string, max: number) => value.trim().slice(0, max);

/** What must hold still before checkout offers a partial quote: ids, services, costs. */
function selectableSignature(options: readonly RateOption[]): string {
  return options
    .map((o) => `${o.rateId}|${o.carrierCode}:${o.serviceCode}|${o.cost.amount}`)
    .sort()
    .join(",");
}

export function destinationFor(order: Pick<Order, "shipping">): QuoteDestination {
  const a = order.shipping;
  return {
    postalCode: a.postalCode,
    state: MX_STATES.find((s) => s.code === a.state)?.name ?? a.state,
    city: a.city,
    neighborhood: a.colonia,
  };
}

export function createSkydropxProvider(
  deps: {
    config?: () => SkydropxConfig | null;
    fetch?: Fetch;
    sleep?: (ms: number) => Promise<void>;
    /** The quote's time budget is measured on this clock (tests inject one). */
    now?: () => number;
    /** Only the console's completion check overrides these; checkout keeps the defaults. */
    quoteBudgetMs?: number;
    /** False: ignore early stability and poll until complete (or the budget). */
    stopWhenStable?: boolean;
  } = {},
): ShippingProvider {
  const config = deps.config ?? (() => readSkydropxConfig());
  const http: Fetch = (...args) => (deps.fetch ?? fetch)(...args);
  const wait = deps.sleep ?? sleep;
  const clock = deps.now ?? Date.now;
  const budgetMs = deps.quoteBudgetMs ?? QUOTE_HARD_TIMEOUT_MS;
  const stopWhenStable = deps.stopWhenStable ?? true;
  const fail = <T>(error: ShippingError): ShippingResult<T> => ({ ok: false, error });

  async function json(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function token(cfg: SkydropxConfig, renew = false): Promise<string | null> {
    const key = `${cfg.apiUrl}|${cfg.clientId}`;
    const cached = tokenCache().get(key);
    if (!renew && cached && cached.expiresAt > Date.now()) return cached.token;
    const result = await requestSkydropxToken(cfg, http);
    if (!result.ok) return null;
    /* Renewed with ten minutes to spare. */
    tokenCache().set(key, {
      token: result.token,
      expiresAt: Date.now() + Math.max(60, (result.expiresIn ?? 7200) - 600) * 1000,
    });
    return result.token;
  }

  /** One authenticated call; a 401 renews the token once. Throws on no answer. */
  async function call(
    cfg: SkydropxConfig,
    path: string,
    init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number },
  ): Promise<Response | null> {
    for (const renew of [false, true]) {
      const bearer = await token(cfg, renew);
      if (!bearer) return null;
      const response = await http(`${cfg.apiUrl}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${bearer}`,
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, init.timeoutMs ?? CALL_TIMEOUT_MS)),
        cache: "no-store",
      });
      if (response.status !== 401) return response;
    }
    return null;
  }

  function area(d: QuoteDestination) {
    return {
      country_code: "MX",
      postal_code: d.postalCode,
      area_level1: d.state,
      area_level2: d.city,
      area_level3: d.neighborhood,
    };
  }

  return {
    id: "skydropx",
    isConfigured: () => config() !== null,
    mode: () => config()?.mode ?? null,
    parcel: () => config()?.parcel ?? null,

    async quote(
      destination: QuoteDestination,
      parcel: Parcel,
    ): Promise<ShippingResult<QuoteResult>> {
      const cfg = config();
      if (!cfg) return fail({ code: "unconfigured" });
      const started = clock();
      const quotedAt = new Date(started).toISOString();
      const o = cfg.origin;
      try {
        const created = await call(cfg, "/api/v1/quotations", {
          method: "POST",
          body: {
            quotation: {
              address_from: area({
                postalCode: o.postalCode,
                state: o.state,
                city: o.city,
                neighborhood: o.neighborhood,
              }),
              address_to: area(destination),
              parcels: [
                {
                  length: Math.ceil(parcel.lengthCm),
                  width: Math.ceil(parcel.widthCm),
                  height: Math.ceil(parcel.heightCm),
                  /* The API's minimum is 1 kg. */
                  weight: Math.max(1, parcel.weightKg),
                },
              ],
            },
          },
        });
        if (!created) return fail({ code: "provider_error" });
        /*
         * 422 names the fields it refused (`errors.address_to.*`,
         * `errors.address_from.*`, `errors.parcel.*`, per the reference). Only
         * the DESTINATION is the customer's to correct; an origin or parcel
         * refusal is NEOGEN's configuration and must not blame the customer.
         */
        if (created.status === 422) {
          const body = (await json(created)) as { errors?: Record<string, unknown> } | null;
          return fail({
            code: body?.errors && "address_to" in body.errors ? "invalid_address" : "configuration",
          });
        }
        if (created.status === 400) return fail({ code: "configuration" });
        if (!created.ok) return fail({ code: "provider_error" });
        let quotation = (await json(created)) as { id?: unknown; is_completed?: unknown } | null;
        const id = typeof quotation?.id === "string" ? quotation.id : null;
        if (!id) return fail({ code: "provider_error" });

        const selectable = (q: unknown) =>
          rateOptions(q).filter((r) => carrierAllowed(cfg, r.carrierCode, r.serviceCode));
        let signature = selectableSignature(selectable(quotation));
        let unchangedSince = clock();
        const stable = () => signature !== "" && clock() - unchangedSince >= QUOTE_STABLE_MS;

        while (quotation?.is_completed !== true && clock() - started < budgetMs) {
          if (stopWhenStable && stable()) break;
          await wait(POLL_EVERY_MS);
          const left = budgetMs - (clock() - started);
          if (left <= 0) break;
          let polled: Response | null = null;
          try {
            polled = await call(cfg, `/api/v1/quotations/${encodeURIComponent(id)}`, {
              method: "GET",
              timeoutMs: left,
            });
          } catch {
            /* One slow or lost poll ends nothing; the deadline does. */
            continue;
          }
          if (!polled?.ok) continue;
          quotation = (await json(polled)) as typeof quotation;
          const next = selectableSignature(selectable(quotation));
          if (next !== signature) [signature, unchangedSince] = [next, clock()];
        }

        const options = selectable(quotation);
        if (options.length === 0) {
          if (quotation?.is_completed !== true) return fail({ code: "timeout" });
          return fail({ code: "no_coverage" });
        }
        /* Out of time while the choice — or the cheapest — was still moving. */
        if (quotation?.is_completed !== true && !stable()) return fail({ code: "timeout" });
        return {
          ok: true,
          value: {
            quotationId: id,
            options,
            quotedAt,
            expiresAt: new Date(started + RATE_VALIDITY_MS).toISOString(),
          },
        };
      } catch {
        return fail({ code: "timeout" });
      }
    },

    async createShipment(order, parcel, rateId, idempotencyKey) {
      const cfg = config();
      if (!cfg) return fail({ code: "unconfigured" });
      if (!cfg.labelsAllowed) return fail({ code: "not_allowed" });
      if (!cfg.consignmentNote || !cfg.packageType) return fail({ code: "unconfigured" });
      void parcel;
      void idempotencyKey;
      const a = order.shipping;
      const o = cfg.origin;
      const street = `${a.street} ${a.numeroExterior}${a.numeroInterior ? ` int. ${a.numeroInterior}` : ""}`;
      try {
        /* The path as the reference writes it, with its trailing slash. */
        const response = await call(cfg, "/api/v1/shipments/", {
          method: "POST",
          body: {
            shipment: {
              rate_id: rateId,
              unique_shipment: true,
              printing_format: cfg.printingFormat,
              ...(cfg.autoAdvance ? { auto_advance: true } : {}),
              address_from: {
                ...(cfg.originTemplateId ? { address_template_id: cfg.originTemplateId } : {}),
                street1: clip(o.street, 45),
                name: clip(o.name, 30),
                company: clip(o.company, 60),
                phone: o.phone,
                email: o.email,
                reference: clip(o.reference, 30),
              },
              address_to: {
                street1: clip(street, 45),
                name: clip(a.recipient, 30),
                company: clip(a.recipient, 60),
                phone: order.contact.phone,
                /* NEOGEN's address, not the customer's (see the header). */
                email: o.email,
                reference: clip(a.colonia, 40),
                ...(a.notes ? { further_information: clip(a.notes, 70) } : {}),
              },
              packages: [
                {
                  package_number: "1",
                  consignment_note: cfg.consignmentNote,
                  package_type: cfg.packageType,
                },
              ],
            },
          },
        });
        if (!response) return fail({ code: "provider_error" });
        if (response.status === 409) return fail({ code: "in_progress" });
        if (response.status === 400 || response.status === 422) {
          return fail({ code: "refused", detail: shipmentRefusal(await json(response)) });
        }
        if (!response.ok) return fail({ code: "provider_error" });
        const snapshot = shipmentSnapshot(await json(response));
        return snapshot ? { ok: true, value: snapshot } : fail({ code: "provider_error" });
      } catch {
        /* The request may have arrived: the booking stays `requested` and is
           repeated under the same rate, which Skydropx replays. */
        return fail({ code: "timeout" });
      }
    },

    async getShipment(providerRef) {
      const cfg = config();
      if (!cfg) return fail({ code: "unconfigured" });
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(providerRef)) return fail({ code: "provider_error" });
      try {
        const response = await call(cfg, `/api/v1/shipments/${encodeURIComponent(providerRef)}`, {
          method: "GET",
        });
        if (!response?.ok) return fail({ code: "provider_error" });
        const snapshot = shipmentSnapshot(await json(response));
        return snapshot ? { ok: true, value: snapshot } : fail({ code: "provider_error" });
      } catch {
        return fail({ code: "timeout" });
      }
    },

    async getLabel(providerRef) {
      const cfg = config();
      if (!cfg) return fail({ code: "unconfigured" });
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(providerRef)) return fail({ code: "provider_error" });
      try {
        const response = await call(cfg, `/api/v1/shipments/${encodeURIComponent(providerRef)}`, {
          method: "GET",
        });
        if (!response?.ok) return fail({ code: "provider_error" });
        const url = labelUrl(await json(response));
        return url ? { ok: true, value: { url } } : fail({ code: "in_progress" });
      } catch {
        return fail({ code: "timeout" });
      }
    },

    async cancelShipment(providerRef, reason) {
      const cfg = config();
      if (!cfg) return fail({ code: "unconfigured" });
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(providerRef)) return fail({ code: "provider_error" });
      try {
        const response = await call(
          cfg,
          `/api/v1/shipments/${encodeURIComponent(providerRef)}/cancellations`,
          { method: "POST", body: { reason: clip(reason, 120), shipment_id: providerRef } },
        );
        if (!response) return fail({ code: "provider_error" });
        if (response.status === 404 || response.status === 422) {
          return fail({ code: "refused", detail: `http_${response.status}` });
        }
        if (!response.ok) return fail({ code: "provider_error" });
        const body = (await json(response)) as { success?: unknown } | null;
        return body?.success === false
          ? fail({ code: "refused", detail: "not_cancelled" })
          : { ok: true, value: { accepted: true } };
      } catch {
        return fail({ code: "timeout" });
      }
    },

    async verifyWebhook({ headers, body }): Promise<ShippingWebhookVerdict> {
      const cfg = config();
      if (!cfg?.webhookSecret) return { kind: "unauthenticated" };
      if (
        !verifySkydropxSignature({
          secret: cfg.webhookSecret,
          header: headers.get(cfg.webhookHeader),
          body,
        })
      ) {
        return { kind: "unauthenticated" };
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return { kind: "malformed" };
      }
      const data = (parsed as { data?: Record<string, unknown> })?.data;
      if (!data || typeof data !== "object") return { kind: "malformed" };
      if (data.type !== "packages") return { kind: "ignored", reason: `type:${String(data.type)}` };
      const attributes = (data.attributes ?? {}) as Record<string, unknown>;
      const shipment = (
        data.relationships as { shipment?: { data?: { id?: unknown } } } | undefined
      )?.shipment?.data?.id;
      const status = typeof attributes.status === "string" ? attributes.status : "";
      const returned =
        typeof attributes.returned_status === "string" ? attributes.returned_status : null;
      if (typeof shipment !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(shipment) || !status) {
        return { kind: "malformed" };
      }
      /* "Created" (label ready) and "Error" (the shipment could not be
         created) are about the booking, not the parcel's movement. */
      if (status === "created" || status === "error")
        return { kind: "refresh", providerRef: shipment };
      const mapped = trackingState(status, returned);
      if (!mapped) return { kind: "ignored", reason: `status:${status.slice(0, 30)}` };
      const tracking =
        typeof attributes.tracking_number === "string"
          ? attributes.tracking_number.slice(0, 80)
          : null;
      const url = attributes.tracking_url_provider;
      return {
        kind: "verified",
        event: {
          providerRef: shipment,
          eventId: `skydropx:${shipment}:${status}:${returned ?? ""}`.slice(0, 200),
          state: mapped.state,
          exception: mapped.exception,
          trackingNumber: tracking || null,
          trackingUrl: typeof url === "string" && url.startsWith("https://") ? url : null,
          providerStatus: returned ? `${status}/${returned}` : status,
        },
      };
    },
  };
}

export const skydropxProvider = createSkydropxProvider();

/** The snapshot type, re-exported for the booking service. */
export type { ShipmentSnapshot };

/**
 * WHY SKYDROPX REFUSED A SHIPMENT — from its documented 422 bodies:
 * `{ errors: string | { field: [messages] }, error_code? }`. Reduced to a
 * code NEOGEN acts on; the provider's prose is never stored or shown.
 *
 *   rate_not_found        `errors.rate_id` — the rate is gone (expired):
 *                         the only refusal worth a re-quote
 *   insufficient_credits  no credit or collection limit (`error_code`, or
 *                         the documented "créditos" message): top up
 *   carta_porte           `consignment_note` / `package_type` refused
 *   destination           `address_to` refused
 *   configuration         `address_from` / `printing_format` refused
 *   refused               anything else
 */
export function shipmentRefusal(body: unknown): string {
  const b = (body ?? {}) as { errors?: unknown; error_code?: unknown };
  const code = typeof b.error_code === "string" ? b.error_code : "";
  if (/CREDIT|DEBT_LIMIT|COLLECTION/i.test(code)) return "insufficient_credits";
  const errors = b.errors;
  if (typeof errors === "string") {
    return /cr[eé]dito/i.test(errors) ? "insufficient_credits" : "refused";
  }
  if (errors && typeof errors === "object") {
    const keys = Object.keys(errors);
    if (keys.includes("rate_id")) return "rate_not_found";
    if (keys.includes("consignment_note") || keys.includes("package_type")) return "carta_porte";
    if (keys.includes("address_to")) return "destination";
    if (keys.includes("address_from") || keys.includes("printing_format")) return "configuration";
  }
  return "refused";
}

/**
 * ONE TOKEN REQUEST — `POST /api/v1/oauth/token`, client credentials.
 *
 * The API reference disagrees with itself here: the endpoint's prose example
 * posts `application/x-www-form-urlencoded`, its schema declares
 * `application/json`. The documented example goes first; a 400/415 — "this
 * format is not accepted" — is retried once as JSON. Anything else (401, bad
 * credentials) is final.
 *
 * Shared by the adapter and the console's authentication check, so the check
 * proves exactly the code that runs. The token is returned to the adapter
 * only; `describeTokenAttempt` is what anything else may see.
 */
export type TokenAttempt =
  | {
      ok: true;
      token: string;
      status: number;
      format: "form" | "json";
      expiresIn: number | null;
      tokenType: string | null;
    }
  | {
      ok: false;
      /** Status of each attempt, in order; null when there was no answer. */
      statuses: (number | null)[];
      /** The provider's own error CODE (`error`), never its description. */
      error: string | null;
    };

export async function requestSkydropxToken(
  creds: { apiUrl: string; clientId: string; clientSecret: string },
  http: typeof fetch = fetch,
): Promise<TokenAttempt> {
  const fields = {
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  };
  const post = async (format: "form" | "json") => {
    try {
      return await http(`${creds.apiUrl}/api/v1/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type":
            format === "form" ? "application/x-www-form-urlencoded" : "application/json",
        },
        body: format === "form" ? new URLSearchParams(fields).toString() : JSON.stringify(fields),
        signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      return null;
    }
  };
  const statuses: (number | null)[] = [];
  let format: "form" | "json" = "form";
  let response = await post("form");
  statuses.push(response?.status ?? null);
  if (response && (response.status === 400 || response.status === 415)) {
    format = "json";
    response = await post("json");
    statuses.push(response?.status ?? null);
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = response ? ((await response.json()) as Record<string, unknown>) : null;
  } catch {
    body = null;
  }
  if (!response?.ok || typeof body?.access_token !== "string") {
    const error =
      typeof body?.error === "string"
        ? body.error.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 40)
        : null;
    return { ok: false, statuses, error };
  }
  return {
    ok: true,
    token: body.access_token,
    status: response.status,
    format,
    expiresIn: typeof body.expires_in === "number" ? body.expires_in : null,
    tokenType: typeof body.token_type === "string" ? body.token_type.slice(0, 20) : null,
  };
}

/** What may be shown about a token attempt: never the token itself. */
export function describeTokenAttempt(attempt: TokenAttempt) {
  return attempt.ok
    ? {
        authenticated: true,
        httpStatus: attempt.status,
        formatAccepted: attempt.format,
        tokenType: attempt.tokenType,
        expiresInSeconds: attempt.expiresIn,
      }
    : { authenticated: false, httpStatuses: attempt.statuses, providerError: attempt.error };
}
