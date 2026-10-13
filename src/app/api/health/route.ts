import { paymentAvailable } from "@/payments";
import { probeDatabase } from "@/server/persistence";

/**
 * HEALTH — one GET for an uptime monitor.
 *
 *   200  the site is serving and its database (if any) answers
 *   503  a database is configured and does not answer
 *
 * The body says only what a monitor needs: storage kind, whether the
 * database answered, the newest migration it has recorded (compare with the
 * newest file in `db/migrations`), and whether checkout can take payment.
 * No host, role, error text, variable name or blocker list — it is public.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const db = await probeDatabase();
  const healthy = db.database !== "unreachable";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      storage: db.storage,
      database: db.database,
      schema: db.schema,
      payments: paymentAvailable() ? "available" : "unavailable",
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
