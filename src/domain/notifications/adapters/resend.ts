import { renderEmail } from "../render";

import type { RenderContext } from "../render";
import type { NotificationChannel, NotificationMessage, SendResult } from "../types";

/**
 * THE RESEND CHANNEL — the outbox's email provider (owner decision B6,
 * 2026-10-15).
 *
 * One HTTPS call per message (`POST https://api.resend.com/emails`, read
 * 2026-10-15), no SDK: the same reasoning as the Mercado Pago adapter. The
 * outbox decides WHAT is owed and records every attempt; this only turns one
 * message into one email. It never throws, so a failed send can never reach
 * an order or a payment.
 *
 * WHAT IS SENT is `renderEmail`'s output — the exact bytes the console
 * previews — in the message's own locale (customer emails follow the order's
 * language; operations email is Spanish).
 *
 * IDEMPOTENCY. `Idempotency-Key: <message id>:<attempt>`. Resend keeps a key
 * for 24 hours and answers a repeat with the first result, so an email that
 * went out but was never recorded as sent (a crash) is not sent twice; a
 * recorded failure is retried under the next attempt's key. The rendered body
 * is deterministic for a message (the status link is derived, not random),
 * which Resend requires for a reused key.
 *
 * ERRORS (Resend's error reference, 2026-10-15), mapped to the outbox's
 * three codes:
 *   401, 403           unconfigured   key, permission, or an unverified sending
 *                                     domain — fix the configuration and the
 *                                     message goes out on the next retry
 *   400, 422           rejected       the message itself was refused; retrying
 *                                     the same message cannot help
 *   409, 429, 5xx,     provider_error try again later
 *   no answer
 */
export interface ResendConfig {
  apiKey: string;
  /** `Name <address@domain>` — from the environment, never from code. */
  from: string;
  replyTo: string | null;
  /** Where operations email goes. Empty: operations email is not sent. */
  operationsTo: readonly string[];
  /** Testing only: every email goes here instead, marked as a test. */
  redirectTo: string | null;
}

const ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 15_000;

/* Tags admit ASCII letters, digits, `_` and `-` only. */
const tag = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);

export function createResendChannel(deps: {
  config: () => ResendConfig | null;
  context: (orderId: string) => Promise<RenderContext>;
  fetch?: typeof fetch;
}): NotificationChannel {
  const http: typeof fetch = (...args) => (deps.fetch ?? fetch)(...args);
  const fail = (
    code: "unconfigured" | "rejected" | "provider_error",
    retryable: boolean,
  ): SendResult => ({ ok: false, error: { code, retryable } });

  return {
    id: "resend",
    isConfigured: () => deps.config() !== null,

    async send(message: NotificationMessage, meta = { attempt: 0 }): Promise<SendResult> {
      const cfg = deps.config();
      if (!cfg) return fail("unconfigured", true);

      const intended =
        message.recipient.role === "customer" ? [message.recipient.email] : cfg.operationsTo;
      if (intended.length === 0) return fail("unconfigured", true);
      const to = cfg.redirectTo ? [cfg.redirectTo] : intended;

      let body: Record<string, unknown>;
      try {
        const email = renderEmail(message, await deps.context(message.orderId));
        body = {
          from: cfg.from,
          to,
          subject: cfg.redirectTo
            ? `[TEST · ${message.recipient.role}] ${email.subject}`
            : email.subject,
          html: email.html,
          text: email.text,
          ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
          tags: [
            { name: "kind", value: tag(message.kind) },
            { name: "order", value: tag(message.orderId) },
          ],
        };
      } catch {
        /* The order could not be read to build the link: try again later. */
        return fail("provider_error", true);
      }

      let response: Response;
      try {
        response = await http(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `${message.id}:${meta.attempt}`.slice(0, 256),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
      } catch {
        return fail("provider_error", true);
      }

      if (response.ok) {
        let id: unknown = null;
        try {
          id = ((await response.json()) as { id?: unknown } | null)?.id;
        } catch {
          /* Accepted without a readable body: still sent. */
        }
        return { ok: true, providerMessageId: typeof id === "string" ? id : "resend" };
      }
      if (response.status === 401 || response.status === 403) return fail("unconfigured", true);
      if (response.status === 400 || response.status === 422) return fail("rejected", false);
      return fail("provider_error", true);
    },
  };
}

/**
 * READ THE CONFIGURATION — names only ever, values never logged.
 *
 *   RESEND_API_KEY        secret
 *   EMAIL_FROM            "NEOGEN <address@verified-domain>"
 *   EMAIL_SENDING         must be exactly "enabled": the switch that turns
 *                         sending on once the domain is verified in Resend
 *   EMAIL_OPERATIONS_TO   comma-separated operations inbox(es)
 *   EMAIL_REPLY_TO        optional
 *   EMAIL_REDIRECT_TO     optional, TESTING ONLY: every email goes here
 *
 * Returns null — nothing is sent, messages stay pending — unless the key, the
 * sender and the switch are all present. On the production deployment a
 * redirect is refused outright (null): a production that would quietly send
 * customers' emails to a test inbox must not send at all.
 */
export function readResendConfig(
  env: Record<string, string | undefined> = process.env,
): ResendConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from || env.EMAIL_SENDING?.trim() !== "enabled") return null;
  const redirectTo = env.EMAIL_REDIRECT_TO?.trim() || null;
  if (redirectTo && env.VERCEL_ENV === "production") return null;
  const list = (value: string | undefined) =>
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));
  return {
    apiKey,
    from,
    replyTo: env.EMAIL_REPLY_TO?.trim() || null,
    operationsTo: list(env.EMAIL_OPERATIONS_TO),
    redirectTo,
  };
}

/** Names of what is missing for sending, for the console. Never values. */
export function missingEmailEnv(env: Record<string, string | undefined> = process.env): string[] {
  const missing: string[] = [];
  if (!env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!env.EMAIL_FROM?.trim()) missing.push("EMAIL_FROM");
  if (env.EMAIL_SENDING?.trim() !== "enabled") missing.push("EMAIL_SENDING=enabled");
  if (!env.EMAIL_OPERATIONS_TO?.trim()) missing.push("EMAIL_OPERATIONS_TO");
  if (env.EMAIL_REDIRECT_TO?.trim() && env.VERCEL_ENV === "production") {
    missing.push("EMAIL_REDIRECT_TO must be empty on Production");
  }
  return missing;
}
