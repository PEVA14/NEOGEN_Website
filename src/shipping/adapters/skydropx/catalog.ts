import "server-only";

import { readSkydropxCredentials } from "./config";
import { requestSkydropxToken } from "./index";

/**
 * THE CARTA PORTE CATALOGUES — read-only, for the owner's decision.
 *
 * Skydropx publishes the two SAT catalogues a Mexican shipment declares:
 *   GET /api/v1/shipments/consignment_notes   product/content codes
 *       (`?description=` partial, accent- and case-insensitive)
 *   GET /api/v1/shipments/packagings          packaging codes (`?name=`)
 * Both paginate at most 20 per page.
 *
 * This module can reach exactly those two GETs and the token — anything else
 * is refused before it leaves. It returns codes and the catalogue's own
 * descriptions, nothing chosen: picking the code that truthfully describes
 * NEOGEN's goods and packaging is the owner's declaration.
 */
const PER_PAGE = 20;
/** Skydropx allows 2 requests per second. */
const SPACING_MS = 600;
const PAGES_PER_QUERY = 3;
const PACKAGING_PAGES = 10;

export interface CatalogEntry {
  code: string;
  description: string;
}

export interface CatalogSearch {
  query: string;
  status: number | null;
  totalCount: number | null;
  entries: CatalogEntry[];
  truncated: boolean;
}

const ALLOWED = new Set([
  "/api/v1/oauth/token",
  "/api/v1/shipments/consignment_notes",
  "/api/v1/shipments/packagings",
]);

export function validCatalogQuery(q: string): boolean {
  return q.length >= 2 && q.length <= 40 && /^[\p{L}\p{N} .-]+$/u.test(q);
}

export async function searchCarta(
  input: { products: readonly string[]; packaging: readonly string[] },
  deps: { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void> } = {},
) {
  const creds = readSkydropxCredentials();
  if (!creds) return { configured: false as const };
  const http = deps.fetch ?? fetch;
  const wait = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const blocked: string[] = [];

  const guarded: typeof fetch = async (target, init) => {
    const url = new URL(String(target));
    const method = (init?.method ?? "GET").toUpperCase();
    const ok =
      ALLOWED.has(url.pathname) &&
      (url.pathname === "/api/v1/oauth/token" ? method === "POST" : method === "GET");
    if (!ok) {
      blocked.push(`${method} ${url.pathname}`);
      throw new Error("blocked by the catalogue search");
    }
    return http(target, init);
  };

  const token = await requestSkydropxToken(creds, guarded);
  if (!token.ok) {
    return {
      configured: true as const,
      authenticated: false,
      httpStatuses: token.statuses,
      providerError: token.error,
    };
  }

  let first = true;
  async function page(path: string, params: Record<string, string>) {
    if (!first) await wait(SPACING_MS);
    first = false;
    const url = new URL(`${creds!.apiUrl}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    try {
      const response = await guarded(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token.ok ? token.token : ""}` },
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as {
        data?: unknown;
        meta?: { next_page?: unknown; total_count?: unknown };
      } | null;
      return { status: response.status, body };
    } catch {
      return { status: null, body: null };
    }
  }

  async function search(
    path: string,
    param: string,
    query: string | null,
    pages: number,
    entry: (row: Record<string, unknown>) => CatalogEntry | null,
  ): Promise<CatalogSearch> {
    const entries: CatalogEntry[] = [];
    let status: number | null = null;
    let totalCount: number | null = null;
    let next: number | null = 1;
    let fetched = 0;
    while (next !== null && fetched < pages) {
      const params: Record<string, string> = { page: String(next), per_page: String(PER_PAGE) };
      if (query) params[param] = query;
      const { status: s, body } = await page(path, params);
      status = s;
      fetched += 1;
      if (s !== 200 || !body) break;
      const rows = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : [];
      for (const row of rows) {
        const e = entry(row);
        if (e) entries.push(e);
      }
      totalCount = typeof body.meta?.total_count === "number" ? body.meta.total_count : totalCount;
      next = typeof body.meta?.next_page === "number" ? body.meta.next_page : null;
    }
    return { query: query ?? "(all)", status, totalCount, entries, truncated: next !== null };
  }

  const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  const products: CatalogSearch[] = [];
  for (const q of input.products) {
    products.push(
      await search("/api/v1/shipments/consignment_notes", "description", q, PAGES_PER_QUERY, (r) =>
        text(r.consignment_note)
          ? { code: text(r.consignment_note), description: text(r.description).slice(0, 200) }
          : null,
      ),
    );
  }
  const packagingAll = await search(
    "/api/v1/shipments/packagings",
    "name",
    null,
    PACKAGING_PAGES,
    (r) => (text(r.code) ? { code: text(r.code), description: text(r.name).slice(0, 200) } : null),
  );
  const packaging: CatalogSearch[] = [];
  for (const q of input.packaging) {
    packaging.push(
      await search("/api/v1/shipments/packagings", "name", q, PAGES_PER_QUERY, (r) =>
        text(r.code) ? { code: text(r.code), description: text(r.name).slice(0, 200) } : null,
      ),
    );
  }

  return {
    configured: true as const,
    authenticated: true,
    mode: creds.mode,
    apiHost: new URL(creds.apiUrl).host,
    blocked,
    note: "Catalogue entries as Skydropx returns them. Nothing here is chosen: the codes to declare are the owner's decision.",
    products,
    packagingAll,
    packaging,
  };
}
