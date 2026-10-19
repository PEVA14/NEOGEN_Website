import "server-only";

import { quotedMethods } from "@/domain/checkout/shipping";
import { MX_STATES } from "@/domain/checkout/types";
import { siteConfig } from "@/config/site";

import { carrierAllowed, readSkydropxConfig } from "./config";
import { createSkydropxProvider, destinationFor } from "./index";
import { NO_PRICE } from "./vocabulary";

import type { StoredQuote } from "@/domain/checkout/types";
import type { SkydropxConfig } from "./config";

/**
 * THE QUOTE CHECK — operators only: ONE real quotation, through exactly the
 * code checkout uses (`provider.quote`, `destinationFor`, `quotedMethods`),
 * with the provider's raw answer laid beside what NEOGEN made of it.
 *
 * Only two paths can be reached: the token and the quotations. Anything else
 * the adapter might ask for (a shipment, a label, a cancellation) is refused
 * before it leaves — this check cannot buy anything.
 *
 * NEVER IN THE ANSWER: the token, the client id or secret, rate or quotation
 * ids, or the configured origin's values. The origin is reported as checks
 * (present, well-formed), and any origin value the provider echoes back is
 * replaced with "[origin]".
 */
export interface QuoteCheckInput {
  postalCode: string;
  /** One of `MX_STATES` codes, as checkout stores it. */
  state: string;
  city: string;
  colonia: string;
}

export function validQuoteCheckInput(input: QuoteCheckInput): boolean {
  return (
    /^\d{5}$/.test(input.postalCode) &&
    MX_STATES.some((s) => s.code === input.state) &&
    input.city.length > 0 &&
    input.city.length <= 60 &&
    input.colonia.length > 0 &&
    input.colonia.length <= 60
  );
}

/** Shape checks on the configured origin and parcel. Booleans and numbers, never origin values. */
export function originChecks(cfg: SkydropxConfig) {
  const o = cfg.origin;
  return {
    origin: {
      postalCodeFiveDigits: /^\d{5}$/.test(o.postalCode),
      stateIsOfficialName: MX_STATES.some((s) => s.name === o.state),
      cityPresent: o.city.length > 0,
      neighborhoodPresent: o.neighborhood.length > 0,
      streetWithin45: o.street.length <= 45,
      referenceWithin30: o.reference.length <= 30,
      usesSavedTemplate: cfg.originTemplateId !== null,
    },
    parcelConfigured: cfg.parcel,
    /* What the quotation body carries (`index.ts`): integers, and the API's 1 kg floor. */
    parcelSent: {
      length: Math.ceil(cfg.parcel.lengthCm),
      width: Math.ceil(cfg.parcel.widthCm),
      height: Math.ceil(cfg.parcel.heightCm),
      weight: Math.max(1, cfg.parcel.weightKg),
    },
  };
}

type Primitive = string | number | boolean | null;

function redactor(cfg: SkydropxConfig) {
  const values = Object.values(cfg.origin)
    .filter((v) => v.length >= 4)
    .sort((a, b) => b.length - a.length);
  return (s: string) => values.reduce((acc, v) => acc.split(v).join("[origin]"), s).slice(0, 160);
}

/** Primitive fields of a provider object, minus ids; nested objects by key name only. */
function flat(obj: unknown, redact: (s: string) => string, skip: readonly string[] = []) {
  const out: Record<string, Primitive | string[]> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (skip.includes(key) || key === "id" || key.endsWith("_id")) continue;
    if (value === null || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string") {
      out[key] = redact(value);
    } else if (value && typeof value === "object") {
      out[key] = Array.isArray(value)
        ? [`array(${value.length})`]
        : Object.keys(value).slice(0, 20);
    }
  }
  return out;
}

/** The 422/400 body: field paths and messages, origin values redacted. */
function refusalOf(body: unknown, redact: (s: string) => string) {
  const b = (body ?? {}) as { errors?: unknown; error_code?: unknown; error?: unknown };
  const paths: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (paths.length >= 30) return;
    if (Array.isArray(node)) {
      paths.push(`${path}: ${node.map((m) => redact(String(m))).join("; ")}`);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    } else if (node !== undefined) {
      paths.push(`${path}: ${redact(String(node))}`);
    }
  };
  walk(b.errors, "");
  return {
    errorCode: typeof b.error_code === "string" ? redact(b.error_code) : null,
    error: typeof b.error === "string" ? redact(b.error) : null,
    errors: paths,
  };
}

export async function runQuoteCheck(
  input: QuoteCheckInput,
  deps: { config?: () => SkydropxConfig | null; fetch?: typeof fetch } = {},
) {
  const config = deps.config ?? (() => readSkydropxConfig());
  const cfg = config();
  if (!cfg) return { configured: false as const };
  const http = deps.fetch ?? fetch;
  const redact = redactor(cfg);

  const calls: { step: "token" | "create_quotation" | "poll_quotation"; status: number | null }[] =
    [];
  const blocked: string[] = [];
  let quotation: unknown = null;
  let refusal: unknown = null;

  const guarded: typeof fetch = async (target, init) => {
    const path = new URL(String(target)).pathname.replace(/\/+$/, "");
    const method = (init?.method ?? "GET").toUpperCase();
    const step =
      path === "/api/v1/oauth/token" && method === "POST"
        ? "token"
        : path === "/api/v1/quotations" && method === "POST"
          ? "create_quotation"
          : /^\/api\/v1\/quotations\/[^/]+$/.test(path) && method === "GET"
            ? "poll_quotation"
            : null;
    if (!step) {
      blocked.push(`${method} ${path.replace(/[0-9a-f-]{8,}/gi, ":id")}`);
      throw new Error("blocked by the quote check");
    }
    try {
      const response = await http(target, init);
      calls.push({ step, status: response.status });
      if (step !== "token") {
        const body = await response
          .clone()
          .json()
          .catch(() => null);
        if (response.ok) quotation = body;
        else refusal = body;
      }
      return response;
    } catch (error) {
      calls.push({ step, status: null });
      throw error;
    }
  };

  const provider = createSkydropxProvider({ config: () => cfg, fetch: guarded });
  const address = { postalCode: input.postalCode, state: input.state, city: input.city };
  const result = await provider.quote(
    destinationFor({ shipping: { ...address, colonia: input.colonia } as never }),
    cfg.parcel,
  );

  const offered = result.ok ? result.value.options : [];
  const stored: StoredQuote | null = result.ok
    ? {
        destinationKey: "check",
        quotedAt: result.value.quotedAt,
        quote: {
          provider: provider.id,
          quotationId: result.value.quotationId,
          expiresAt: result.value.expiresAt,
          options: offered,
        },
        error: null,
      }
    : null;
  const threshold = siteConfig.fulfilment.freeShippingThreshold;
  const below = stored
    ? quotedMethods(stored, address, { amount: threshold - 1, currency: "MXN" })
    : [];
  const atThreshold = stored
    ? quotedMethods(stored, address, { amount: threshold, currency: "MXN" })
    : [];

  const q = (quotation ?? {}) as Record<string, unknown>;
  const rawRates = Array.isArray(q.rates) ? (q.rates as Record<string, unknown>[]) : [];
  const rates = rawRates.map((r) => {
    const id = typeof r.id === "string" ? r.id : "";
    const option = offered.find((o) => o.rateId === id);
    const shown = below.find((m) => m.id === id);
    const notSelectable: string[] = [];
    if (r.success !== true) notSelectable.push("success_not_true");
    if (!(Number(r.total) > 0)) notSelectable.push("no_positive_total");
    if (r.requires_origin_verification === true) notSelectable.push("requires_origin_verification");
    if (NO_PRICE.has(String(r.status ?? ""))) notSelectable.push(`status:${String(r.status)}`);
    if (r.currency_code && r.currency_code !== "MXN") notSelectable.push("not_mxn");
    if (
      typeof r.provider_name === "string" &&
      !carrierAllowed(cfg, r.provider_name, String(r.provider_service_code ?? ""))
    ) {
      notSelectable.push("carrier_allow_deny");
    }
    if (option && !shown) notSelectable.push("duplicate_carrier_service");
    return {
      provider: flat(r, redact),
      customerSelectable: Boolean(shown),
      notSelectable,
      neogen: option
        ? {
            cost: option.cost.amount,
            customerPriceBelowFreeThreshold: shown?.price?.amount ?? null,
            subsidyAtFreeThreshold: atThreshold.find((m) => m.id === id)?.subsidy?.amount ?? null,
          }
        : null,
    };
  });

  return {
    configured: true as const,
    mode: cfg.mode,
    apiHost: new URL(cfg.apiUrl).host,
    labelsAllowedHere: cfg.labelsAllowed,
    ...originChecks(cfg),
    calls,
    blocked,
    outcome: result.ok ? "ok" : result.error.code,
    refusal: refusal ? refusalOf(refusal, redact) : null,
    quotation: flat(q, redact, ["rates"]),
    rateCount: rawRates.length,
    selectableCount: below.length,
    rates,
    neogenAssumedExpiry: result.ok ? result.value.expiresAt : null,
    freeShippingThreshold: threshold,
  };
}
