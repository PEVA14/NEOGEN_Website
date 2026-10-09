import { timingSafeEqual } from "node:crypto";

import { paymentAvailable } from "@/payments";
import { reconcileInFlight } from "@/server/reconcile";

/**
 * SCHEDULED RECONCILE OF IN-FLIGHT PAYMENTS (`vercel.json` → `crons`).
 *
 * Vercel calls this with `GET` and `Authorization: Bearer <CRON_SECRET>` when a
 * `CRON_SECRET` environment variable exists. Nothing else may run it: the job
 * asks the payment provider about real orders, so it is closed by default.
 *
 *   no CRON_SECRET (or under 32 characters)   503, the job is off
 *   wrong or missing bearer                    401
 *   payments not configured here               200, nothing to do
 *
 * The answer is counts only — no order ids, names or amounts.
 *
 * Vercel runs scheduled jobs on the PRODUCTION deployment only. A Preview
 * deployment is exercised by calling this route yourself with the secret.
 */
export const dynamic = "force-dynamic";

function secret(): string | null {
  const value = process.env.CRON_SECRET ?? "";
  return value.length >= 32 ? value : null;
}

function authorised(header: string | null, key: string): boolean {
  const expected = Buffer.from(`Bearer ${key}`);
  const given = Buffer.from(header ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request): Promise<Response> {
  const key = secret();
  if (!key) return json({ error: "reconcile_disabled" }, 503);
  if (!authorised(request.headers.get("authorization"), key)) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!paymentAvailable()) return json({ ok: true, skipped: "payments_unavailable" }, 200);

  const summary = await reconcileInFlight();
  return json({ ok: true, ...summary }, 200);
}
