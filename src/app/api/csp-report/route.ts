import { signal } from "@/server/observe";
import { blockedHost, readViolations } from "@/server/security/cspReport";
import { clientAddress, consume, RULES } from "@/server/security/rateLimit";

/**
 * CSP VIOLATION REPORTS — what the storefront policy would block, logged.
 *
 * Browsers POST here when a page breaks the Content-Security-Policy (or the
 * report-only one, `src/config/securityHeaders.ts`). Two formats arrive: the
 * older `application/csp-report` (`{"csp-report": {…}}`, from `report-uri`)
 * and the Reporting API's `application/reports+json` (an array, from
 * `report-to`). Both are reduced to the directive, the disposition and the
 * blocked HOST — never the full URL, whose path or query could carry a token
 * — and logged as `security.csp_violation`.
 *
 * Anyone can post here, so the body is capped, the rate is limited per
 * address, and nothing is stored. The answer is always 204.
 */

const MAX_BODY = 16 * 1024;

function noContent(): Response {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return noContent();
  if (!(await consume(RULES.cspReport, [clientAddress(request.headers)]))) return noContent();

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return noContent();
  }

  for (const v of readViolations(body)) {
    signal("security.csp_violation", "warn", {
      directive: v.directive,
      blockedHost: blockedHost(v.blocked),
      disposition: v.disposition,
    });
  }
  return noContent();
}
