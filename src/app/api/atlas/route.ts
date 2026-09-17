import { parseAtlasAnswers } from "@/domain/atlas";
import { isLocale } from "@/i18n/config";
import { generateAtlas } from "@/server/atlas/generate";
import { atlasQuestionnaireView } from "@/server/atlas/questionnaire";

/**
 * ATLAS GENERATION — one POST, provider-independent.
 *
 * The browser sends a profile and a locale; it never sends a prompt, a model
 * name, a product list or a price, and it never receives the model's raw text
 * or usage. What comes back is an assembled result whose facts were read from
 * the registries on this server.
 *
 * GUARDS, because this endpoint spends money on every call:
 *
 *   size       — the body is a handful of ids, a name and a short note;
 *                anything over 4 KB is not a questionnaire.
 *   origin     — a cross-site POST is refused, so another page cannot drive
 *                generations from a visitor's browser.
 *   rate       — a best-effort per-address window. In-memory, so per instance:
 *                it blunts a loop, it is not a quota. A shared store is the
 *                upgrade if the endpoint is ever abused at scale.
 *   input      — `parseAtlasAnswers` rejects anything the questionnaire does
 *                not describe: an unknown question, a value of the wrong
 *                shape, an option outside the resolved list, a number out of
 *                bounds. What each answer may then influence — and whether the
 *                note may be read at all — is the policy's call, made inside
 *                `generateAtlas`.
 */

export const maxDuration = 60;

const MAX_BODY = 4096;
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 8;
const hits = new Map<string, number[]>();

function allow(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return json({ ok: false, error: "forbidden" }, 403);
    } catch {
      return json({ ok: false, error: "forbidden" }, 403);
    }
  }

  const text = await request.text();
  if (text.length > MAX_BODY) return json({ ok: false, error: "payload_too_large" }, 413);

  const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(address)) return json({ ok: false, error: "rate_limited" }, 429);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_answers" }, 400);
  }
  if (!isRecord(body) || typeof body.locale !== "string" || !isLocale(body.locale)) {
    return json({ ok: false, error: "invalid_answers" }, 400);
  }

  /*
   * The SAME view the page rendered, rebuilt here from the same content and
   * registries — so the rules that accepted an answer in the browser are the
   * rules that accept it on the server, and a stale draft cannot answer a
   * question that no longer exists.
   */
  const questionnaire = await atlasQuestionnaireView(body.locale);
  const parsed = parseAtlasAnswers(body.answers, questionnaire);
  if (!parsed.ok) return json({ ok: false, error: "invalid_answers" }, 400);

  try {
    const result = await generateAtlas(questionnaire, parsed.answers, body.locale);
    return json({ ok: true, result });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "atlas.failure",
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    return json({ ok: false, error: "generation_failed" }, 500);
  }
}
