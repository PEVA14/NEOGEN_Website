import { EMAIL_COPY } from "./copy";

import type { NotificationMessage } from "./types";

/**
 * RENDER A MESSAGE AS AN EMAIL — subject, plain text and HTML.
 *
 * PROVIDER-INDEPENDENT and pure: whichever email provider is chosen, its
 * channel adapter calls this and sends the result. The console's message view
 * calls it too, so what an operator previews is byte-for-byte what would be
 * sent.
 *
 * BUILT FOR EMAIL CLIENTS, not browsers: one 600px table, inline styles only,
 * system fonts, no images, no web fonts, no scripts, no tracking pixels, and a
 * plain-text part that says everything the HTML says. Visually restrained:
 * the NEOGEN wordmark in type, the reference in mono, one link.
 *
 * Every interpolated value is escaped. Names, addresses and product names come
 * from customers and the catalogue, and an email is HTML.
 */
export interface RenderContext {
  /** A signed order-status link, or null when guest access is not configured. */
  statusUrl: string | null;
  /** NEOGEN's one confirmed contact channel. */
  phoneDisplay: string;
  phoneHref: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const INK = "#111111";
const MUTED = "#5f5b54";
const PAPER = "#faf9f6";
const RULE = "#e8e4dc";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

function money(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/** Only https links are ever placed in an email. */
function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.hostname === "localhost" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function renderEmail(message: NotificationMessage, ctx: RenderContext): RenderedEmail {
  const copy = EMAIL_COPY[message.locale];
  const kind = copy.kinds[message.kind];
  const f = message.facts;
  const e = escapeHtml;
  const internal = message.recipient.role === "internal";
  const name = message.recipient.role === "customer" ? message.recipient.name : "";
  const subject = kind.subject(f.orderId);

  const showItems =
    message.kind === "order.placed.customer" || message.kind === "order.placed.internal";
  const showShipment = Boolean(f.shipment) && message.kind !== "order.delivered.customer";
  const statusUrl = internal ? null : safeHref(ctx.statusUrl);
  const trackingUrl = safeHref(f.shipment?.trackingUrl);

  /* ---- plain text: complete on its own ---------------------------------- */
  const text: string[] = [];
  if (!internal) text.push(copy.greeting(name), "");
  text.push(kind.heading, "", kind.body, "", `${copy.referenceLabel}: ${f.orderId}`);
  if (showItems) {
    text.push("", `${copy.itemsLabel}:`);
    for (const l of f.lines) {
      text.push(
        `- ${l.name} · ${l.presentation} × ${l.quantity} — ${money(l.lineTotal.amount, message.locale)}`,
      );
    }
    text.push(
      `${copy.subtotal}: ${money(f.subtotal.amount, message.locale)}`,
      `${copy.shipping}: ${f.shipping.amount === 0 ? copy.shippingFree : money(f.shipping.amount, message.locale)}`,
      `${copy.total}: ${money(f.total.amount, message.locale)}`,
    );
    if (!internal) text.push("", copy.estimate(f.estimateDays));
  }
  if (f.refunded) text.push("", `${copy.total}: ${money(f.refunded.amount, message.locale)}`);
  if (showShipment && f.shipment) {
    text.push("");
    if (f.shipment.carrier) text.push(`${copy.carrier}: ${f.shipment.carrier}`);
    if (f.shipment.service) text.push(`${copy.service}: ${f.shipment.service}`);
    if (f.shipment.trackingNumber) text.push(`${copy.tracking}: ${f.shipment.trackingNumber}`);
    if (trackingUrl) text.push(`${copy.trackingLink}: ${trackingUrl}`);
  }
  if (internal && message.fulfilment) {
    text.push(
      "",
      message.fulfilment.contact.name,
      message.fulfilment.contact.email,
      message.fulfilment.contact.phone,
      message.fulfilment.address,
    );
    if (message.fulfilment.notes) text.push(message.fulfilment.notes);
  }
  if (!internal) {
    text.push("", statusUrl ? `${copy.statusLink}: ${statusUrl}` : copy.statusLinkAbsent);
    text.push("", `${copy.contactLine} ${ctx.phoneDisplay}`, "", copy.footer);
  }

  /* ---- HTML ---------------------------------------------------------------- */
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:6px 0;color:${MUTED};font-family:${SANS};font-size:14px;">${e(label)}</td>` +
    `<td align="right" style="padding:6px 0;font-family:${SANS};font-size:14px;${strong ? "font-weight:700;" : ""}">${e(value)}</td></tr>`;

  const items = showItems
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0 0;">` +
      `<tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid ${RULE};font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${e(copy.itemsLabel)}</td></tr>` +
      f.lines
        .map(
          (l) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;">${e(l.name)}<br><span style="color:${MUTED};font-size:13px;">${e(l.presentation)} × ${l.quantity}</span></td>` +
            `<td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;">${e(money(l.lineTotal.amount, message.locale))}</td></tr>`,
        )
        .join("") +
      row(copy.subtotal, money(f.subtotal.amount, message.locale)) +
      row(
        copy.shipping,
        f.shipping.amount === 0 ? copy.shippingFree : money(f.shipping.amount, message.locale),
      ) +
      row(copy.total, money(f.total.amount, message.locale), true) +
      `</table>` +
      (internal
        ? ""
        : `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;color:${MUTED};">${e(copy.estimate(f.estimateDays))}</p>`)
    : "";

  const refunded = f.refunded
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">${row(copy.total, money(f.refunded.amount, message.locale), true)}</table>`
    : "";

  const shipment =
    showShipment && f.shipment
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0 0;">` +
        (f.shipment.carrier ? row(copy.carrier, f.shipment.carrier) : "") +
        (f.shipment.service ? row(copy.service, f.shipment.service) : "") +
        (f.shipment.trackingNumber ? row(copy.tracking, f.shipment.trackingNumber) : "") +
        `</table>` +
        (trackingUrl
          ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:14px;"><a href="${e(trackingUrl)}" style="color:${INK};">${e(copy.trackingLink)}</a></p>`
          : "")
      : "";

  const fulfilment =
    internal && message.fulfilment
      ? `<p style="margin:24px 0 0;padding:16px;border:1px solid ${RULE};font-family:${SANS};font-size:14px;line-height:1.5;">` +
        [
          message.fulfilment.contact.name,
          message.fulfilment.contact.email,
          message.fulfilment.contact.phone,
          message.fulfilment.address,
          message.fulfilment.notes ?? "",
        ]
          .filter(Boolean)
          .map(e)
          .join("<br>") +
        `</p>`
      : "";

  const cta = internal
    ? ""
    : statusUrl
      ? `<p style="margin:32px 0 0;"><a href="${e(statusUrl)}" style="display:inline-block;padding:14px 20px;background:${INK};color:${PAPER};font-family:${MONO};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">${e(copy.statusLink)}</a></p>`
      : `<p style="margin:32px 0 0;font-family:${SANS};font-size:13px;color:${MUTED};">${e(copy.statusLinkAbsent)}</p>`;

  const footer = internal
    ? ""
    : `<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;line-height:1.5;color:${MUTED};">` +
      `${e(copy.contactLine)} <a href="${e(ctx.phoneHref)}" style="color:${INK};">${e(ctx.phoneDisplay)}</a><br>${e(copy.footer)}</p>`;

  const html =
    `<!doctype html><html lang="${message.locale === "es" ? "es-MX" : "en"}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">` +
    `<title>${e(subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${PAPER};color:${INK};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};"><tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${RULE};"><tr><td style="padding:32px;">` +
    `<p style="margin:0 0 32px;font-family:${MONO};font-size:12px;letter-spacing:0.2em;">NEOGEN</p>` +
    (internal
      ? ""
      : `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;">${e(copy.greeting(name))}</p>`) +
    `<h1 style="margin:0 0 12px;font-family:${SANS};font-size:24px;line-height:1.2;font-weight:700;">${e(kind.heading)}</h1>` +
    `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.55;">${e(kind.body)}</p>` +
    `<p style="margin:24px 0 0;font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${e(copy.referenceLabel)}</p>` +
    `<p style="margin:4px 0 0;font-family:${MONO};font-size:20px;">${e(f.orderId)}</p>` +
    items +
    refunded +
    shipment +
    fulfilment +
    cta +
    footer +
    `</td></tr></table></td></tr></table></body></html>`;

  return { subject, text: text.join("\n"), html };
}
