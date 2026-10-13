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
 *   2. THE STOREFRONT, ENFORCED AND REPORTING. The full policy — scripts,
 *      frames, connections, images. Mercado Pago publishes no list of the
 *      hosts its card fields load from, so the policy first ran report-only;
 *      a sandbox card payment on Preview (2026-10-11) reported one host,
 *      added below, and it was then enforced. Browsers still report every
 *      violation to `/api/csp-report` (`security.csp_violation`), so a new
 *      Mercado Pago host shows up in the logs. To return to report-only while
 *      investigating, set `STOREFRONT_ENFORCED` to false.
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

/** `false` sends the storefront policy as report-only (see layer 2). */
const STOREFRONT_ENFORCED = true;

/** Mercado Pago's own domain families: its SDK, card-field frames, APIs and assets. */
const MERCADO_PAGO = [
  "https://*.mercadopago.com",
  "https://*.mercadolibre.com",
  /* Seen on Preview (2026-10-11): the card fields load an image from
     www.mercadolivre.com, Mercado Libre's Portuguese-language domain. */
  "https://*.mercadolivre.com",
  "https://*.mlstatic.com",
];

/** Where the policy is served: `next dev`, and Vercel Preview builds. */
export interface PolicyEnv {
  dev: boolean;
  preview: boolean;
}

/**
 * VERCEL'S PREVIEW TOOLBAR (comments, feedback), injected only into Preview
 * deployments. Its hosts, from Vercel's own CSP guidance, are allowed only
 * when `VERCEL_ENV` is `preview` at build time — never in Production.
 */
const TOOLBAR: Record<string, readonly string[]> = {
  "script-src": ["https://vercel.live"],
  "connect-src": ["https://vercel.live", "wss://ws-us3.pusher.com"],
  "img-src": ["https://vercel.live", "https://vercel.com"],
  "frame-src": ["https://vercel.live"],
  "style-src": ["https://vercel.live"],
  "font-src": ["https://vercel.live", "https://assets.vercel.com"],
};

function withToolbar(
  directives: Record<string, readonly string[]>,
  env: PolicyEnv,
): Record<string, readonly string[]> {
  if (!env.preview) return directives;
  return Object.fromEntries(
    Object.entries(directives).map(([name, values]) => [
      name,
      [...values, ...(TOOLBAR[name] ?? [])],
    ]),
  );
}

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

/** The storefront's full policy. */
export function storefrontPolicy({ dev, preview }: PolicyEnv): string {
  return policy(
    withToolbar(
      {
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
      },
      { dev, preview },
    ),
  );
}

/** The operations console: first-party only, enforced. */
export function consolePolicy({ dev, preview }: PolicyEnv): string {
  return policy(
    withToolbar(
      {
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
      },
      { dev, preview },
    ),
  );
}

type Header = { key: string; value: string };

export function securityHeaders(env: PolicyEnv): { source: string; headers: Header[] }[] {
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
          ? { key: "Content-Security-Policy", value: storefrontPolicy(env) }
          : { key: "Content-Security-Policy-Report-Only", value: storefrontPolicy(env) },
      ],
    },
    {
      source: "/ops",
      headers: [{ key: "Content-Security-Policy", value: consolePolicy(env) }],
    },
    {
      source: "/ops/:path*",
      headers: [{ key: "Content-Security-Policy", value: consolePolicy(env) }],
    },
  ];
}
