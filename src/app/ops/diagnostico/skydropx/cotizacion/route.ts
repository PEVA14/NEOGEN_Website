import { MX_STATES } from "@/domain/checkout/types";
import { currentOperator, opsConfigured } from "@/server/ops/auth";
import { signal } from "@/server/observe";
import { sameOriginPost } from "@/server/ops/sameOrigin";
import { runQuoteCheck, validQuoteCheckInput } from "@/shipping/adapters/skydropx/quoteCheck";

export const dynamic = "force-dynamic";

/**
 * SKYDROPX QUOTE CHECK — operators only. GET shows a form for a destination;
 * POSTing it asks Skydropx for ONE quotation through checkout's own code
 * (`runQuoteCheck`) and answers with the provider's rates beside what NEOGEN
 * would offer. Only the token and quotation endpoints can be reached: no
 * shipment, no label. A POST, so a reload or a prefetch never quotes again
 * without the browser asking first.
 */
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

async function guard(request: Request): Promise<Response | null> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  return null;
}

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(request: Request): Promise<Response> {
  const refused = await guard(request);
  if (refused) return refused;
  const options = MX_STATES.map(
    (s) => `<option value="${escape(s.code)}">${escape(s.name)}</option>`,
  ).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización Skydropx</title></head><body>
<h1>Cotización Skydropx (una)</h1>
<p>Pide UNA cotización con el código del checkout. No crea envíos ni guías.</p>
<form method="post">
<p><label>Código postal <input name="postalCode" required pattern="[0-9]{5}" inputmode="numeric" autocomplete="off"></label></p>
<p><label>Estado <select name="state" required><option value="">—</option>${options}</select></label></p>
<p><label>Ciudad o municipio <input name="city" required maxlength="60" autocomplete="off"></label></p>
<p><label>Colonia <input name="colonia" required maxlength="60" autocomplete="off"></label></p>
<p><button type="submit">Cotizar una vez</button></p>
</form></body></html>`;
  return new Response(html, {
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const refused = await guard(request);
  if (refused) return refused;
  if (!sameOriginPost(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const input = {
    postalCode: field("postalCode"),
    state: field("state"),
    city: field("city"),
    colonia: field("colonia"),
  };
  if (!validQuoteCheckInput(input)) {
    return Response.json({ error: "invalid_destination" }, { status: 400, headers });
  }
  const report = await runQuoteCheck(input);
  /* Statuses and counts only — no destination, origin or provider text. */
  signal(
    "shipping.provider_error",
    report.configured && report.outcome === "ok" ? "info" : "warn",
    {
      view: "quote_check",
      code: report.configured ? report.outcome : "unconfigured",
      status: report.configured ? (report.calls.at(-1)?.status ?? null) : null,
      count: report.configured ? report.rateCount : 0,
    },
  );
  return Response.json(report, { headers });
}
