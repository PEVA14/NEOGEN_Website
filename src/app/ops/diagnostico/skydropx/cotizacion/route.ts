import { currentOperator, opsConfigured } from "@/server/ops/auth";
import { signal } from "@/server/observe";
import { issueOnceToken, spendOnceToken } from "@/server/ops/onceToken";
import { quoteFormPage } from "@/server/ops/quoteForm";
import { sameOriginPost } from "@/server/ops/sameOrigin";
import { runQuoteCheck, validQuoteCheckInput } from "@/shipping/adapters/skydropx/quoteCheck";

export const dynamic = "force-dynamic";
/* The completion mode polls for up to COMPLETION_BUDGET_MS (90 s). */
export const maxDuration = 120;

/**
 * SKYDROPX QUOTE CHECK — operators only. GET shows a form for a destination;
 * POSTing it asks Skydropx for ONE quotation through checkout's own code
 * (`runQuoteCheck`) and answers with the provider's rates beside what NEOGEN
 * would offer. Only the token and quotation endpoints can be reached: no
 * shipment, no label. A POST, so a reload or a prefetch never quotes again
 * without the browser asking first.
 *
 * ONE SUBMISSION, TWICE OVER. In the browser, the first submit locks the
 * form (button disabled, "Cotizando…"). On the server, the page carries a
 * one-time token that the submit spends before any provider call — a double
 * click, a resend or a back-and-resubmit is refused with nothing sent.
 */
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

async function guard(request: Request): Promise<Response | null> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const refused = await guard(request);
  if (refused) return refused;
  const html = quoteFormPage(issueOnceToken());
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
  if (!(await spendOnceToken(field("once")))) {
    return new Response(
      "Este formulario ya se envió: no se pidió otra cotización. Para una nueva, abre la página de nuevo.",
      { status: 409, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
  const report = await runQuoteCheck(input, { untilComplete: field("mode") === "complete" });
  /* Statuses and counts only — no destination, origin or provider text. */
  signal(
    "shipping.provider_error",
    report.configured && report.outcome === "ok" ? "info" : "warn",
    {
      view: "quote_check",
      code: report.configured ? `${report.outcome}:${report.completion}` : "unconfigured",
      status: report.configured ? (report.calls.at(-1)?.status ?? null) : null,
      count: report.configured ? report.rateCount : 0,
    },
  );
  return Response.json(report, { headers });
}
