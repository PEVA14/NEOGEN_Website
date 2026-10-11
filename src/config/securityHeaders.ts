/**
 * SECURITY HEADERS — what every response tells the browser it may do.
 *
 * Read by `next.config.ts`, so this file imports nothing: it is evaluated
 * when the server starts, before path aliases exist.
 *
 * THREE LAYERS:
 *
 *   1. EVERYWHERE, ENFORCED. HSTS, no MIME sniffing, no framing by other
 *      sites, no camera/microphone/location, and a Content-Security-Policy
 *      limited to directives that cannot break a page: no plugins
 *      (`object-src`), no `<base>` hijack (`base-uri`), no framing
 *      (`frame-ancestors`).
 *
 *   2. THE STOREFRONT, REPORT-ONLY. The full policy — scripts, frames,
 *      connections, images — is sent as `Content-Security-Policy-Report-Only`.
 *      Mercado Pago does not publish the hosts its card fields load from, so
 *      enforcing a guess could break the payment step on a real card. Browsers
 *      report what this policy WOULD block to `/api/csp-report`, which logs
 *      `security.csp_violation`. Once a sandbox payment on Preview runs clean,
 *      the same string moves to the enforced header (`STOREFRONT_ENFORCED`).
 *
 *   3. THE CONSOLE, ENFORCED IN FULL. `/ops` loads nothing from a third
 *      party, so its full policy is enforced from the start.
 *
 * `'unsafe-inline'` IN script-src is deliberate: Next streams its page data
 * as inline scripts, and the alternative — a per-request nonce — would make
 * every one of the site's ~600 static pages render on demand. The policy
 * still decides WHICH ORIGINS may serve script, which is what stops an
 * injected `<script src=…>` from an attacker's host.
 */

/**
 * Flip to `true` once a sandbox payment on Preview produces no
 * `security.csp_violation` from Mercado Pago's hosts: the storefront policy
 * then becomes the enforced `Content-Security-Policy`.
 */
const STOREFRONT_ENFORCED = false;

/** Mercado Pago's own domain families: its SDK, card-field frames, APIs and assets. */
const MERCADO_PAGO = [
  "https://*.mercadopago.com",
  "https://*.mercadolibre.com",
  "https://*.mlstatic.com",
];

function policy(directives: Record<string, readonly string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** Never breaks a page: enforced on every response. */
export function baselinePolicy(): string {
  return policy({
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
  });
}

/** The storefront's full policy. Report-only until a Preview payment proves it. */
export function storefrontPolicy(dev: boolean): string {
  return policy({
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      "https://sdk.mercadopago.com",
      ...MERCADO_PAGO,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    /* `blob:` — the 3D viewer decodes the vials' embedded textures to blob URLs. */
    "img-src": ["'self'", "data:", "blob:", ...MERCADO_PAGO],
    "font-src": ["'self'", "data:", ...MERCADO_PAGO],
    /* `blob:` — the 3D viewer fetches those decoded textures back. */
    "connect-src": ["'self'", "blob:", ...(dev ? ["ws:"] : []), ...MERCADO_PAGO],
    "frame-src": [...MERCADO_PAGO],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'"],
    "manifest-src": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "report-uri": ["/api/csp-report"],
    "report-to": ["csp"],
  });
}

/** The operations console: first-party only, enforced. */
export function consolePolicy(dev: boolean): string {
  return policy({
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    /* The message preview renders an email in a sandboxed frame; its images
       are absolute URLs on the public site, which may be another host. */
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    "frame-src": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
  });
}

type Header = { key: string; value: string };

export function securityHeaders(dev: boolean): { source: string; headers: Header[] }[] {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()",
        },
        { key: "Content-Security-Policy", value: baselinePolicy() },
      ],
    },
    {
      /* Everything except the console, which gets its own policy below (and
         its own Referrer-Policy from `proxy.ts`). Later entries override
         earlier ones for the same header, so this replaces the baseline. */
      source: "/((?!ops/|ops$).*)",
      headers: [
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
        STOREFRONT_ENFORCED
          ? { key: "Content-Security-Policy", value: storefrontPolicy(dev) }
          : { key: "Content-Security-Policy-Report-Only", value: storefrontPolicy(dev) },
      ],
    },
    {
      source: "/ops",
      headers: [{ key: "Content-Security-Policy", value: consolePolicy(dev) }],
    },
    {
      source: "/ops/:path*",
      headers: [{ key: "Content-Security-Policy", value: consolePolicy(dev) }],
    },
  ];
}
