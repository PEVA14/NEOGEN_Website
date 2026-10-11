/**
 * Reading CSP violation reports (`app/api/csp-report/route.ts`): both report
 * formats reduced to what may be logged. Pure, so the checks can run it.
 */

const MAX_REPORTS = 10;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, 200) : null;
}

/** The host of a blocked URL, or the keyword a browser uses instead (`inline`, `eval`, `data`). */
export function blockedHost(blocked: string | null): string | null {
  if (!blocked) return null;
  try {
    const url = new URL(blocked);
    return url.protocol === "http:" || url.protocol === "https:" ? url.host : url.protocol;
  } catch {
    return blocked.slice(0, 40);
  }
}

export interface Violation {
  directive: string | null;
  blocked: string | null;
  disposition: string | null;
}

/** Normalise either report format to the three fields that are logged. */
export function readViolations(body: unknown): Violation[] {
  if (isRecord(body) && isRecord(body["csp-report"])) {
    const r = body["csp-report"];
    return [
      {
        directive: text(r["effective-directive"]) ?? text(r["violated-directive"]),
        blocked: text(r["blocked-uri"]),
        disposition: text(r.disposition),
      },
    ];
  }
  if (Array.isArray(body)) {
    return body
      .slice(0, MAX_REPORTS)
      .filter((r) => isRecord(r) && r.type === "csp-violation" && isRecord(r.body))
      .map((r) => {
        const b = (r as { body: Record<string, unknown> }).body;
        return {
          directive: text(b.effectiveDirective),
          blocked: text(b.blockedURL),
          disposition: text(b.disposition),
        };
      });
  }
  return [];
}
