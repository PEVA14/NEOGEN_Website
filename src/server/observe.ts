import "server-only";

/**
 * OPERATIONAL SIGNALS — what went wrong, in a shape a log search can use.
 *
 * NO MONITORING VENDOR. This writes one JSON line per signal to the server
 * log (which Vercel, or any host, already collects). A vendor — Sentry,
 * Datadog, Better Stack — would be one `Sink` registered below; choosing one
 * is an owner decision, and nothing here depends on which.
 *
 * WHAT CAN BE LOGGED IS AN ALLOW-LIST, not a deny-list. `context` accepts
 * only the keys in `SAFE_KEYS`, and only scalar values; anything else is
 * dropped before it reaches a sink. So a token, a webhook secret, a card
 * detail, a provider payload, an address, a phone or an email cannot be
 * logged by passing the wrong object — there is no key for them.
 */
export type Signal =
  | "payment.provider_error"
  | "payment.webhook_rejected"
  | "payment.webhook_unsettled"
  | "payment.not_persisted"
  | "payment.reconciled"
  | "inventory.hold_failed"
  | "inventory.sync_failed"
  | "inventory.short"
  | "notification.enqueue_failed"
  | "notification.send_failed"
  | "shipping.provider_error"
  | "refund.provider_error"
  | "persistence.conflict"
  | "ops.login_failed"
  | "ops.login_locked";

export type Severity = "info" | "warn" | "error";

const SAFE_KEYS = new Set([
  "orderId",
  "shipmentId",
  "refundId",
  "variantId",
  "provider",
  "outcome",
  "status",
  "code",
  "reason",
  "state",
  "view",
  "count",
  "attempt",
  "operator",
  "settled",
  "released",
  "unreachable",
  "failed",
]);

export type SignalContext = Readonly<Record<string, string | number | boolean | null | undefined>>;

export interface SignalRecord {
  at: string;
  signal: Signal;
  severity: Severity;
  context: Record<string, string | number | boolean | null>;
}

export interface Sink {
  write(record: SignalRecord): void;
}

/** Keep only allow-listed scalar keys. Strings are clipped. */
export function redact(context: SignalContext = {}): SignalRecord["context"] {
  const out: SignalRecord["context"] = {};
  for (const [key, value] of Object.entries(context)) {
    if (!SAFE_KEYS.has(key) || value === undefined) continue;
    if (typeof value === "string") out[key] = value.slice(0, 120);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    }
  }
  return out;
}

const consoleSink: Sink = {
  write(record) {
    const line = JSON.stringify({ neogen: record });
    if (record.severity === "error") console.error(line);
    else if (record.severity === "warn") console.warn(line);
    else console.info(line);
  },
};

const KEY = "__neogen_signal_sinks__";

function sinks(): Sink[] {
  const g = globalThis as typeof globalThis & { [KEY]?: Sink[] };
  g[KEY] ??= [consoleSink];
  return g[KEY];
}

/** Tests replace the sinks to capture what would be logged. */
export function __setSinks(next: Sink[]): void {
  (globalThis as typeof globalThis & { [KEY]?: Sink[] })[KEY] = next;
}

/** Never throws: an observability failure must not become a checkout failure. */
export function signal(name: Signal, severity: Severity, context?: SignalContext): void {
  try {
    const record: SignalRecord = {
      at: new Date().toISOString(),
      signal: name,
      severity,
      context: redact(context),
    };
    for (const sink of sinks()) sink.write(record);
  } catch {
    /* swallowed on purpose */
  }
}
