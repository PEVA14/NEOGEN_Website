/**
 * MERCADO PAGO CONFIGURATION — read from the environment, never from code.
 *
 * Four values, all required, and the adapter is unconfigured (and the checkout
 * cannot take payment) unless every one is present and the mode is stated:
 *
 *   MERCADOPAGO_MODE            "test" or "live". Explicit, never inferred from
 *                               a credential's prefix — Mercado Pago's test and
 *                               production access tokens share the `APP_USR-`
 *                               prefix, so a prefix check would be a guess.
 *   MERCADOPAGO_ACCESS_TOKEN    SECRET. Server only. Creates and reads orders.
 *   MERCADOPAGO_PUBLIC_KEY      Publishable. Handed to the card fields at render
 *                               time — deliberately NOT a NEXT_PUBLIC_ variable,
 *                               so it is not inlined into every bundle and it
 *                               can change without a rebuild.
 *   MERCADOPAGO_WEBHOOK_SECRET  SECRET. Verifies webhook signatures. Without it
 *                               no notification could be trusted, so the
 *                               adapter refuses to configure at all.
 *
 * Read on every call rather than once at import, so a test can configure and
 * unconfigure the adapter, and so nothing caches a secret in module state.
 */
export interface MercadoPagoConfig {
  mode: "test" | "live";
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
}

export const MERCADOPAGO_ENV = [
  "MERCADOPAGO_MODE",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_WEBHOOK_SECRET",
] as const;

export function readMercadoPagoConfig(
  env: Record<string, string | undefined> = process.env,
): MercadoPagoConfig | null {
  const mode = env.MERCADOPAGO_MODE?.trim();
  const accessToken = env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const publicKey = env.MERCADOPAGO_PUBLIC_KEY?.trim();
  const webhookSecret = env.MERCADOPAGO_WEBHOOK_SECRET?.trim();

  if (mode !== "test" && mode !== "live") return null;
  if (!accessToken || !publicKey || !webhookSecret) return null;
  return { mode, accessToken, publicKey, webhookSecret };
}

/** Names of the variables that are missing or invalid. Names only — never values. */
export function missingMercadoPagoEnv(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const missing: string[] = MERCADOPAGO_ENV.filter((name) => !env[name]?.trim());
  const mode = env.MERCADOPAGO_MODE?.trim();
  if (mode && mode !== "test" && mode !== "live")
    missing.push("MERCADOPAGO_MODE (must be test or live)");
  return missing;
}

/**
 * The payer email Mercado Pago's test environment accepts.
 *
 * Its sandbox rejects any payer email outside `@testuser.com`
 * (`invalid_email_for_sandbox`), and its test-purchase guide names this exact
 * address as the one to use. In TEST mode only, the adapter sends it in place
 * of the customer's own address, so a tester can use their real email at the
 * contact step and still reach the processor. Live mode always sends the
 * customer's address.
 */
export const SANDBOX_PAYER_EMAIL = "test@testuser.com";
