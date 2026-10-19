import { currentOperator, opsConfigured } from "@/server/ops/auth";
import { signal } from "@/server/observe";
import { readSkydropxCredentials } from "@/shipping/adapters/skydropx/config";
import { describeTokenAttempt, requestSkydropxToken } from "@/shipping/adapters/skydropx";

export const dynamic = "force-dynamic";

/**
 * SKYDROPX AUTHENTICATION CHECK — operators only, authentication only.
 *
 * Asks Skydropx for ONE bearer token with this deployment's credentials,
 * through exactly the code the adapter uses (`requestSkydropxToken`: form
 * first, JSON on 400/415), and answers whether it worked. Nothing else is
 * called: no quotation, shipment, label or webhook — nothing billable.
 *
 * NEVER IN THE ANSWER: the token, the client id, the client secret. Only the
 * mode, the API host name, the HTTP status(es), which format was accepted,
 * the token's type and lifetime, or the provider's error CODE. Works before
 * the origin and parcel are configured, which the full adapter requires.
 */
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

export async function GET(request: Request): Promise<Response> {
  if (!opsConfigured()) return new Response("Not found", { status: 404 });
  if (!(await currentOperator())) {
    return Response.redirect(new URL("/ops/acceso", request.url), 303);
  }
  const creds = readSkydropxCredentials();
  if (!creds) {
    return json({
      configured: false,
      note: "SKYDROPX_MODE, SKYDROPX_CLIENT_ID, SKYDROPX_CLIENT_SECRET and (in sandbox) an https SKYDROPX_API_URL are needed. Live mode is refused outside Production.",
    });
  }
  const attempt = await requestSkydropxToken(creds);
  const result = describeTokenAttempt(attempt);
  signal("shipping.provider_error", attempt.ok ? "info" : "warn", {
    view: "auth_check",
    status: attempt.ok ? attempt.status : (attempt.statuses.at(-1) ?? null),
    code: attempt.ok ? attempt.format : (attempt.error ?? "no_answer"),
  });
  return json({
    configured: true,
    mode: creds.mode,
    apiHost: new URL(creds.apiUrl).host,
    ...result,
  });
}
