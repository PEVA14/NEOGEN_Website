import type { Parcel } from "../../types";

/**
 * SKYDROPX CONFIGURATION — read from the environment, never from code.
 *
 * Nothing here is a default for NEOGEN's business: the origin address, the
 * parcel and the Carta Porte codes are the owner's facts, and until they are
 * set the adapter is unconfigured and checkout keeps its free-threshold-only
 * behaviour. Read on every call, so a test can configure and unconfigure it.
 *
 *   SKYDROPX_MODE              "sandbox" or "live". Explicit, never inferred.
 *   SKYDROPX_CLIENT_ID         OAuth client id (Conexiones > API).
 *   SKYDROPX_CLIENT_SECRET     SECRET.
 *   SKYDROPX_API_URL           Required in sandbox (the sandbox host from the
 *                              sandbox panel); live defaults to the host the
 *                              API reference names, https://api-pro.skydropx.com.
 *   SKYDROPX_WEBHOOK_SECRET    SECRET. The HMAC key set in Conexiones > Webhooks.
 *   SKYDROPX_WEBHOOK_HEADER    Optional. The header Skydropx signs into
 *                              (default "Authorization"; configurable there).
 *   SKYDROPX_LIVE_LABELS       "enabled" — the switch that lets a LIVE
 *                              deployment buy real labels. Sandbox ignores it.
 *   SKYDROPX_CARRIERS_ALLOW    Optional, comma-separated: `fedex` or
 *   SKYDROPX_CARRIERS_DENY     `fedex:express_saver`. Allow first, then deny.
 *   SKYDROPX_PRINTING_FORMAT   Optional: "standard" (default) or "thermal".
 *   SKYDROPX_SANDBOX_AUTO_ADVANCE  Optional "true": in sandbox, Skydropx moves
 *                              the parcel through its states every minute.
 *   SKYDROPX_ORIGIN_TEMPLATE_ID Optional: a saved, carrier-verified origin.
 *   SHIPPING_ORIGIN_*          The fulfilment address (see `readOrigin`).
 *   SHIPPING_PARCEL_*          The packed order's size and weight.
 *   SKYDROPX_CONSIGNMENT_NOTE  Carta Porte product code (SAT) for the goods.
 *   SKYDROPX_PACKAGE_TYPE      Carta Porte packaging code.
 */
export interface SkydropxOrigin {
  name: string;
  company: string;
  phone: string;
  email: string;
  /** Street and number, as one line (Skydropx `street1`, max 45). */
  street: string;
  reference: string;
  postalCode: string;
  state: string;
  city: string;
  neighborhood: string;
}

export interface SkydropxConfig {
  mode: "sandbox" | "live";
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string | null;
  webhookHeader: string;
  /** May this deployment buy labels? Always true in sandbox. */
  labelsAllowed: boolean;
  origin: SkydropxOrigin;
  parcel: Parcel;
  /** Null until the owner sets them; booking refuses without both. */
  consignmentNote: string | null;
  packageType: string | null;
  allow: readonly string[];
  deny: readonly string[];
  printingFormat: "standard" | "thermal";
  autoAdvance: boolean;
  originTemplateId: string | null;
}

export const LIVE_API_URL = "https://api-pro.skydropx.com";

type Env = Record<string, string | undefined>;
const get = (env: Env, name: string) => env[name]?.trim() || null;

const ORIGIN_ENV = {
  name: "SHIPPING_ORIGIN_NAME",
  company: "SHIPPING_ORIGIN_COMPANY",
  phone: "SHIPPING_ORIGIN_PHONE",
  email: "SHIPPING_ORIGIN_EMAIL",
  street: "SHIPPING_ORIGIN_STREET",
  reference: "SHIPPING_ORIGIN_REFERENCE",
  postalCode: "SHIPPING_ORIGIN_POSTAL_CODE",
  state: "SHIPPING_ORIGIN_STATE",
  city: "SHIPPING_ORIGIN_CITY",
  neighborhood: "SHIPPING_ORIGIN_NEIGHBORHOOD",
} as const satisfies Record<keyof SkydropxOrigin, string>;

const PARCEL_ENV = {
  lengthCm: "SHIPPING_PARCEL_LENGTH_CM",
  widthCm: "SHIPPING_PARCEL_WIDTH_CM",
  heightCm: "SHIPPING_PARCEL_HEIGHT_CM",
  weightKg: "SHIPPING_PARCEL_WEIGHT_KG",
} as const satisfies Record<keyof Parcel, string>;

function readOrigin(env: Env): SkydropxOrigin | null {
  const origin = {} as Record<keyof SkydropxOrigin, string>;
  for (const [key, name] of Object.entries(ORIGIN_ENV) as [keyof SkydropxOrigin, string][]) {
    const value = get(env, name);
    if (!value) return null;
    origin[key] = value;
  }
  return /^\d{5}$/.test(origin.postalCode) ? origin : null;
}

function readParcel(env: Env): Parcel | null {
  const parcel = {} as Record<keyof Parcel, number>;
  for (const [key, name] of Object.entries(PARCEL_ENV) as [keyof Parcel, string][]) {
    const value = Number(get(env, name));
    if (!Number.isFinite(value) || value <= 0) return null;
    parcel[key] = value;
  }
  return parcel;
}

const list = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function readSkydropxConfig(env: Env = process.env): SkydropxConfig | null {
  const mode = get(env, "SKYDROPX_MODE");
  if (mode !== "sandbox" && mode !== "live") return null;
  /* Live credentials never run on a Preview or development deployment. */
  if (mode === "live" && env.VERCEL_ENV && env.VERCEL_ENV !== "production") return null;

  const clientId = get(env, "SKYDROPX_CLIENT_ID");
  const clientSecret = get(env, "SKYDROPX_CLIENT_SECRET");
  const apiUrl = (get(env, "SKYDROPX_API_URL") ?? (mode === "live" ? LIVE_API_URL : null))?.replace(
    /\/+$/,
    "",
  );
  if (!clientId || !clientSecret || !apiUrl || !apiUrl.startsWith("https://")) return null;

  const origin = readOrigin(env);
  const parcel = readParcel(env);
  if (!origin || !parcel) return null;

  const format = get(env, "SKYDROPX_PRINTING_FORMAT");
  const header = get(env, "SKYDROPX_WEBHOOK_HEADER") ?? "Authorization";
  return {
    mode,
    apiUrl,
    clientId,
    clientSecret,
    webhookSecret: get(env, "SKYDROPX_WEBHOOK_SECRET"),
    webhookHeader: /^[A-Za-z0-9_-]{3,25}$/.test(header) ? header : "Authorization",
    labelsAllowed: mode === "sandbox" || get(env, "SKYDROPX_LIVE_LABELS") === "enabled",
    origin,
    parcel,
    consignmentNote: get(env, "SKYDROPX_CONSIGNMENT_NOTE"),
    packageType: get(env, "SKYDROPX_PACKAGE_TYPE"),
    allow: list(get(env, "SKYDROPX_CARRIERS_ALLOW")),
    deny: list(get(env, "SKYDROPX_CARRIERS_DENY")),
    printingFormat: format === "thermal" ? "thermal" : "standard",
    autoAdvance: mode === "sandbox" && get(env, "SKYDROPX_SANDBOX_AUTO_ADVANCE") === "true",
    originTemplateId: get(env, "SKYDROPX_ORIGIN_TEMPLATE_ID"),
  };
}

/** Names of what is missing, for the console. Never values. */
export function missingSkydropxEnv(env: Env = process.env): string[] {
  const missing: string[] = [];
  const mode = get(env, "SKYDROPX_MODE");
  if (mode !== "sandbox" && mode !== "live") missing.push("SKYDROPX_MODE (sandbox or live)");
  if (mode === "live" && env.VERCEL_ENV && env.VERCEL_ENV !== "production") {
    missing.push("SKYDROPX_MODE=live is refused outside Production");
  }
  for (const name of ["SKYDROPX_CLIENT_ID", "SKYDROPX_CLIENT_SECRET"]) {
    if (!get(env, name)) missing.push(name);
  }
  if (mode === "sandbox" && !get(env, "SKYDROPX_API_URL")) missing.push("SKYDROPX_API_URL");
  for (const name of [...Object.values(ORIGIN_ENV), ...Object.values(PARCEL_ENV)]) {
    if (!get(env, name)) missing.push(name);
  }
  for (const name of [
    "SKYDROPX_CONSIGNMENT_NOTE",
    "SKYDROPX_PACKAGE_TYPE",
    "SKYDROPX_WEBHOOK_SECRET",
  ]) {
    if (!get(env, name)) missing.push(name);
  }
  if (mode === "live" && get(env, "SKYDROPX_LIVE_LABELS") !== "enabled") {
    missing.push("SKYDROPX_LIVE_LABELS=enabled (to buy real labels)");
  }
  return missing;
}

/** Does a carrier/service pass the owner's allow and deny lists? */
export function carrierAllowed(
  cfg: Pick<SkydropxConfig, "allow" | "deny">,
  carrierCode: string,
  serviceCode: string,
): boolean {
  const carrier = carrierCode.toLowerCase();
  const both = `${carrier}:${serviceCode.toLowerCase()}`;
  if (cfg.allow.length > 0 && !cfg.allow.includes(carrier) && !cfg.allow.includes(both)) {
    return false;
  }
  return !cfg.deny.includes(carrier) && !cfg.deny.includes(both);
}
