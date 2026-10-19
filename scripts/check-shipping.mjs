/**
 * SHIPPING (D1) — Skydropx behind NEOGEN's shipping contract.
 *
 *   npm run check:shipping
 *
 * Never calls Skydropx: a deterministic fake answers its documented API
 * (OpenAPI "Skydropx API v1", 2026-10-15) — OAuth, quotations with polling,
 * shipments with `unique_shipment` replay, labels, cancellations — and every
 * webhook is signed here with HMAC-SHA512 as Skydropx signs it.
 *
 * What is proven: quotes are normalised and filtered; the customer's price
 * comes only from NEOGEN's rule and the stored quote; a tampered or stale
 * rate selects nothing; a label is bought only for a PAID order, exactly
 * once through duplicates, races, retries and lost answers; a failure after
 * payment is an operations flag, never an unpaid order; tracking is
 * verified, deduplicated and order-safe; cancelling an order does not
 * pretend to cancel a label; the customer sees and is told about a
 * delivery problem once, in their language.
 */

/* ---- environment: before any application module ------------------------ */

const SECRET = "whsec-skydropx-test-0123456789";
Object.assign(process.env, {
  SKYDROPX_MODE: "sandbox",
  SKYDROPX_CLIENT_ID: "client-test",
  SKYDROPX_CLIENT_SECRET: "secret-test-not-real",
  SKYDROPX_API_URL: "https://skydropx.test",
  SKYDROPX_WEBHOOK_SECRET: SECRET,
  SKYDROPX_CONSIGNMENT_NOTE: "00000000",
  SKYDROPX_PACKAGE_TYPE: "4G",
  SHIPPING_ORIGIN_NAME: "Bodega",
  SHIPPING_ORIGIN_COMPANY: "Empresa de prueba",
  SHIPPING_ORIGIN_PHONE: "3300000000",
  SHIPPING_ORIGIN_EMAIL: "ops@example.test",
  SHIPPING_ORIGIN_STREET: "Calle Origen 1",
  SHIPPING_ORIGIN_REFERENCE: "Bodega",
  SHIPPING_ORIGIN_POSTAL_CODE: "44100",
  SHIPPING_ORIGIN_STATE: "Jalisco",
  SHIPPING_ORIGIN_CITY: "Guadalajara",
  SHIPPING_ORIGIN_NEIGHBORHOOD: "Centro",
  SHIPPING_PARCEL_LENGTH_CM: "20",
  SHIPPING_PARCEL_WIDTH_CM: "15",
  SHIPPING_PARCEL_HEIGHT_CM: "10",
  SHIPPING_PARCEL_WEIGHT_KG: "1",
});
delete process.env.DATABASE_URL;
delete process.env.VERCEL_ENV;
const signals = [];
globalThis.__neogen_signal_sinks__ = [{ write: (r) => signals.push(r) }];

const failures = [];
let passed = 0;
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${what}: expected ${e}, got ${a}`);
  else passed += 1;
};
const ok = (cond, what) => {
  if (!cond) failures.push(`${what}: expected true`);
  else passed += 1;
};

/* ---- the fake Skydropx --------------------------------------------------- */

const API = "https://skydropx.test";
const sky = {
  tokens: 0,
  quotations: new Map(),
  shipments: new Map(),
  /** rate id → shipment id: `unique_shipment` replay. */
  byRate: new Map(),
  creates: [],
  cancels: [],
  /** Scripted behaviour. */
  rates: null,
  quoteStatus: 201,
  quotePolls: 1,
  createMode: "ok",
  refuseRates: new Set(),
  cancelMode: "ok",
  rejectToken: false,
  /** The reference's own contradiction: some accounts may only take JSON. */
  tokenFormats: ["form", "json"],
  tokenRequests: [],
  quoteErrorField: "address_to",
  failNext: false,
  catalogReads: [],
  notes: [
    ...Array.from({ length: 25 }, (_, i) => ({
      consignment_note: 41000000 + i,
      description: `Frasco de prueba ${i}`,
    })),
    { consignment_note: 12000000, description: "Sustancia de ejemplo en polvo" },
  ],
  packagings: [
    { code: "4G", name: "Caja de cartón" },
    { code: "5H4", name: "Bolsa de película de plástico" },
  ],
  /** A quotation over time: [{ at (ms), completed, rates }], read on `scriptNow()`. */
  script: null,
  scriptNow: () => 0,
};
let seq = 0;
const json = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const defaultRates = () => [
  {
    id: `rate-${++seq}`,
    success: true,
    status: "approved",
    currency_code: "MXN",
    total: "184.20",
    days: 2,
    provider_name: "fedex",
    provider_display_name: "FedEx",
    provider_service_name: "Express Saver",
    provider_service_code: "express_saver",
  },
  {
    id: `rate-${++seq}`,
    success: true,
    status: "price_found_external",
    currency_code: "MXN",
    total: "106.19",
    days: null,
    provider_name: "sendex",
    provider_display_name: "Sendex",
    provider_service_name: "Regular",
    provider_service_code: "reg",
  },
  {
    id: `rate-${++seq}`,
    success: false,
    status: "no_coverage",
    total: null,
    provider_name: "dhl",
    provider_service_code: "standard",
  },
  {
    /* Priced, but the label would fail: origin not verified for this carrier. */
    id: `rate-${++seq}`,
    success: true,
    status: "approved",
    currency_code: "MXN",
    total: "90.00",
    days: 1,
    provider_name: "estafeta",
    provider_display_name: "Estafeta",
    provider_service_name: "Dia siguiente",
    provider_service_code: "next_day",
    requires_origin_verification: true,
  },
  {
    id: `rate-${++seq}`,
    success: true,
    status: "tariff_price_not_found",
    currency_code: "MXN",
    total: "1.00",
    provider_name: "paquetexpress",
    provider_service_code: "ground",
  },
];
function shipmentBody(s) {
  return {
    data: {
      id: s.id,
      type: "shipments",
      attributes: {
        workflow_status: s.workflow,
        carrier_name: s.carrier,
        master_tracking_number: s.tracking,
        total: s.total,
        error_detail: s.failed
          ? { error_code: "ERR_INVALID_ADDRESS", error_message: "x", error_message_detail: null }
          : null,
      },
    },
    included: [
      {
        id: `pkg-${s.id}`,
        type: "packages",
        attributes: {
          tracking_number: s.tracking,
          tracking_status: s.trackingStatus,
          tracking_url_provider: s.tracking ? `https://track.example.test/${s.tracking}` : null,
          label_url: s.workflow === "success" ? `https://labels.example.test/${s.id}.pdf` : null,
        },
      },
    ],
  };
}

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const method = init.method ?? "GET";
  if (url.startsWith("https://labels.example.test/")) {
    return new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 });
  }
  if (!url.startsWith(API)) return json(404, {});
  const path = url.slice(API.length);
  if (path === "/api/v1/oauth/token") {
    const type = new Headers(init.headers).get("content-type") ?? "";
    const format = type.includes("json") ? "json" : "form";
    sky.tokenRequests.push(format);
    if (!sky.tokenFormats.includes(format)) return json(415, {});
    const fields =
      format === "json"
        ? JSON.parse(init.body)
        : Object.fromEntries(new URLSearchParams(init.body));
    if (fields.grant_type !== "client_credentials" || !fields.client_id) return json(400, {});
    sky.tokens += 1;
    return sky.rejectToken
      ? json(401, {})
      : json(200, { access_token: `tok-${sky.tokens}`, token_type: "Bearer", expires_in: 7200 });
  }
  const auth = new Headers(init.headers).get("authorization") ?? "";
  if (!auth.startsWith("Bearer tok-")) return json(401, {});
  if (
    path.startsWith("/api/v1/shipments/consignment_notes") ||
    path.startsWith("/api/v1/shipments/packagings")
  ) {
    sky.catalogReads.push(`${method} ${path.split("?")[0]}`);
    const u = new URL(url);
    const fold = (t) =>
      t
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const isNotes = u.pathname.endsWith("consignment_notes");
    const filter = u.searchParams.get(isNotes ? "description" : "name");
    const all = isNotes ? sky.notes : sky.packagings;
    const rows = filter
      ? all.filter((r) => fold(r.description ?? r.name).includes(fold(filter)))
      : all;
    const pageNo = Number(u.searchParams.get("page") ?? 1);
    const per = Math.min(20, Number(u.searchParams.get("per_page") ?? 20));
    const totalPages = Math.max(1, Math.ceil(rows.length / per));
    return json(200, {
      data: rows.slice((pageNo - 1) * per, pageNo * per),
      meta: {
        current_page: pageNo,
        next_page: pageNo < totalPages ? pageNo + 1 : null,
        total_pages: totalPages,
        total_count: rows.length,
      },
    });
  }
  const body = init.body ? JSON.parse(init.body) : null;

  if (path === "/api/v1/quotations" && method === "POST") {
    if (sky.quoteStatus === "throw") throw new TypeError("fetch failed");
    if (sky.quoteStatus === 422) {
      return json(422, {
        error: "unprocessable_entity",
        errors: { [sky.quoteErrorField]: { postal_code: ["no es válido"] } },
      });
    }
    if (sky.quoteStatus !== 201) return json(sky.quoteStatus, { message: "bad request" });
    const id = `quo-${++seq}`;
    sky.quotations.set(id, {
      id,
      polls: sky.quotePolls,
      rates: sky.rates ?? defaultRates(),
      request: body,
      script: sky.script,
    });
    return json(201, { id, is_completed: false, rates: [] });
  }
  const quo = path.match(/^\/api\/v1\/quotations\/([^/]+)$/);
  if (quo && method === "GET") {
    const q = sky.quotations.get(quo[1]);
    if (!q) return json(404, {});
    if (q.script) {
      const now = sky.scriptNow();
      const at = q.script.filter((step) => step.at <= now).at(-1);
      return json(200, { id: q.id, is_completed: at.completed, rates: at.rates });
    }
    q.polls -= 1;
    return json(200, { id: q.id, is_completed: q.polls <= 0, rates: q.polls <= 0 ? q.rates : [] });
  }
  if (path === "/api/v1/shipments/" && method === "POST") {
    const s = body.shipment;
    sky.creates.push(s);
    if (!s.packages?.[0]?.consignment_note || !s.packages?.[0]?.package_type) {
      return json(422, {
        errors: {
          consignment_note: ["No puede estar en blanco"],
          package_type: ["No puede estar en blanco"],
        },
      });
    }
    if (sky.refuseRates.has(s.rate_id)) {
      return json(422, { errors: { rate_id: ["no existe un rate con ese id"] } });
    }
    if (sky.createMode === "credits") {
      return json(422, {
        errors: "No tienes los créditos suficientes para este envío. Agrega créditos y continúa.",
      });
    }
    if (sky.createMode === "refuse") {
      return json(422, { errors: { address_to: ["No puede estar en blanco"] } });
    }
    if (sky.createMode === "in_progress") return json(409, {});
    if (sky.createMode === "down") return json(503, {});
    /* unique_shipment: the same rate is the same shipment, replayed. */
    const existing = s.unique_shipment ? sky.byRate.get(s.rate_id) : null;
    if (existing) return json(200, shipmentBody(sky.shipments.get(existing)));
    const shipment = {
      id: `shp-${++seq}`,
      workflow: "success",
      carrier: "fedex",
      tracking: `TRK${seq}`,
      trackingStatus: "created",
      total: "184.20",
    };
    if (sky.failNext) {
      shipment.workflow = "pending";
      shipment.failed = true;
      sky.failNext = false;
    }
    sky.shipments.set(shipment.id, shipment);
    if (s.unique_shipment) sky.byRate.set(s.rate_id, shipment.id);
    if (sky.createMode === "lost") throw new TypeError("fetch failed");
    return json(202, shipmentBody(shipment));
  }
  const shp = path.match(/^\/api\/v1\/shipments\/([^/]+)$/);
  if (shp && method === "GET") {
    const s = sky.shipments.get(shp[1]);
    return s ? json(200, shipmentBody(s)) : json(404, {});
  }
  const cancel = path.match(/^\/api\/v1\/shipments\/([^/]+)\/cancellations$/);
  if (cancel && method === "POST") {
    sky.cancels.push(cancel[1]);
    if (sky.cancelMode === "refuse") return json(422, { error: "unprocessable_entity" });
    const s = sky.shipments.get(cancel[1]);
    if (s) s.workflow = "cancelled";
    return json(201, { id: "can-1", success: true, status: "approved" });
  }
  return json(404, {});
};

/* ---- application ---------------------------------------------------------- */

const { readSkydropxConfig, readSkydropxCredentials, carrierAllowed, missingSkydropxEnv } =
  await import("../src/shipping/adapters/skydropx/config.ts");
const {
  createSkydropxProvider,
  __resetSkydropxTokens,
  destinationFor,
  requestSkydropxToken,
  describeTokenAttempt,
} = await import("../src/shipping/adapters/skydropx/index.ts");
const { signSkydropxBody, verifySkydropxSignature } =
  await import("../src/shipping/adapters/skydropx/signature.ts");
const { trackingState } = await import("../src/shipping/adapters/skydropx/vocabulary.ts");
const shipping = await import("../src/domain/checkout/shipping.ts");
const {
  quote: orderTotals,
  cancelOrder,
  attentionReasons,
  customerView,
  upgradeOrder,
  needsBooking,
} = await import("../src/domain/order/index.ts");
const { desiredHold } = await import("../src/domain/inventory/index.ts");
const { memoryOrderRepository, __resetOrderStore } =
  await import("../src/domain/order/adapters/memory.ts");
const { memoryOutbox, __resetOutbox } =
  await import("../src/domain/notifications/adapters/memoryOutbox.ts");
const { messagesOwed } = await import("../src/domain/notifications/index.ts");
const { bookShipment, cancelLabel } = await import("../src/server/shipping/booking.ts");
const { refreshOrderShipment, reconcileShipments } =
  await import("../src/server/shipping/tracking.ts");
const { afterOrderChange } = await import("../src/server/orders.ts");
const { POST: shippingWebhook } = await import("../src/app/api/shipping/webhook/route.ts");
const es = (await import("../src/i18n/dictionaries/es.ts")).default;
const en = (await import("../src/i18n/dictionaries/en.ts")).default;
const { EMAIL_COPY } = await import("../src/domain/notifications/copy.ts");

const provider = createSkydropxProvider({ sleep: async () => {} });
const mxn = (amount) => ({ amount, currency: "MXN" });
const ADDRESS = {
  recipient: "Cliente Prueba",
  street: "Avenida Siempre Viva",
  numeroExterior: "742",
  numeroInterior: null,
  colonia: "Centro",
  postalCode: "44100",
  city: "Guadalajara",
  state: "JAL",
  country: "MX",
  notes: null,
};

/* ======================================================================== */
/* 1. CONFIGURATION — off unless complete; live gated                        */
/* ======================================================================== */

ok(readSkydropxConfig() !== null, "a complete sandbox configuration is configured");
eq(readSkydropxConfig({ ...process.env, SKYDROPX_MODE: "" }), null, "no mode, no provider");
eq(
  readSkydropxConfig({ ...process.env, SHIPPING_ORIGIN_POSTAL_CODE: "" }),
  null,
  "no origin, no provider — never an invented one",
);
eq(
  readSkydropxConfig({ ...process.env, SHIPPING_PARCEL_WEIGHT_KG: "0" }),
  null,
  "no parcel, no provider",
);
eq(
  readSkydropxConfig({ ...process.env, SKYDROPX_MODE: "live", VERCEL_ENV: "preview" }),
  null,
  "live credentials are refused on a Preview deployment",
);
eq(
  readSkydropxConfig({ ...process.env, SKYDROPX_MODE: "live", SKYDROPX_API_URL: "" })
    ?.labelsAllowed,
  false,
  "live labels are off until SKYDROPX_LIVE_LABELS=enabled",
);
eq(
  readSkydropxConfig({
    ...process.env,
    SKYDROPX_MODE: "live",
    SKYDROPX_API_URL: "",
    SKYDROPX_LIVE_LABELS: "enabled",
  })?.apiUrl,
  "https://api-pro.skydropx.com",
  "live defaults to the documented host",
);
ok(
  !JSON.stringify(missingSkydropxEnv({ SKYDROPX_CLIENT_SECRET: "s3cr3t" })).includes("s3cr3t"),
  "missing-configuration names never carry a value",
);
ok(
  !carrierAllowed({ allow: [], deny: ["sendex"] }, "sendex", "reg"),
  "a denied carrier is dropped",
);
ok(
  !carrierAllowed({ allow: [], deny: ["fedex:express_saver"] }, "fedex", "express_saver"),
  "a denied service is dropped",
);
ok(carrierAllowed({ allow: ["fedex"], deny: [] }, "fedex", "x"), "an allowed carrier passes");
ok(!carrierAllowed({ allow: ["fedex"], deny: [] }, "dhl", "x"), "allow-listing excludes the rest");

/* ======================================================================== */
/* 2. QUOTES — normalised, filtered, honest about failure                     */
/* ======================================================================== */

const destination = destinationFor({ shipping: ADDRESS });
eq(destination.state, "Jalisco", "the destination carries the state's name, not its code");
const parcel = provider.parcel();
{
  sky.quotePolls = 2;
  const q = await provider.quote(destination, parcel);
  ok(q.ok, "a valid address quotes");
  eq(q.value.options.length, 2, "only successful, priced rates are offered (no_coverage dropped)");
  eq(q.value.options[0].cost, mxn(185), "a rate's centavos round up once, never down");
  eq(
    q.value.options[1].estimateDays,
    null,
    "no days from the provider → no estimate, never guessed",
  );
  const sent = [...sky.quotations.values()].at(-1).request.quotation;
  eq(sent.address_to.area_level1, "Jalisco", "the quote is for the customer's state");
  eq(sent.parcels[0].weight, 1, "the configured parcel is quoted");
  ok(!JSON.stringify(sent).includes("Cliente Prueba"), "a quote carries no customer name");
  ok(
    Date.parse(q.value.expiresAt) - Date.parse(q.value.quotedAt) === 24 * 3600 * 1000,
    "rates expire 24 hours after the quote, as documented",
  );
  sky.quotePolls = 1;
}
{
  sky.rates = [];
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "no_coverage",
    "no rates is no coverage",
  );
  sky.rates = null;
  sky.quoteStatus = 422;
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "invalid_address",
    "a refused address is reported as such",
  );
  sky.quoteStatus = "throw";
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "timeout",
    "no answer is a timeout, not a crash",
  );
  sky.quoteStatus = 201;
  sky.quotePolls = Number.MAX_SAFE_INTEGER;
  let fakeTime = 0;
  const slow = createSkydropxProvider({
    sleep: async (ms) => void (fakeTime += ms),
    now: () => fakeTime,
  });
  eq(
    (await slow.quote(destination, parcel)).error?.code,
    "timeout",
    "a quote that never completes times out",
  );
  sky.quotePolls = 1;
  sky.rejectToken = true;
  __resetSkydropxTokens();
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "provider_error",
    "bad credentials are a provider error",
  );
  sky.rejectToken = false;
  const denied = createSkydropxProvider({
    sleep: async () => {},
    config: () => ({ ...readSkydropxConfig(), deny: ["fedex", "sendex"] }),
  });
  eq(
    (await denied.quote(destination, parcel)).error?.code,
    "no_coverage",
    "a deny list can empty the options",
  );
}

/* ---- the verified contract (2026-10-18 verification pass) --------------- */
{
  const q = await provider.quote(destination, parcel);
  ok(
    !q.value.options.some((o) => o.carrierCode === "estafeta"),
    "a rate that requires origin verification is never offered (its label would fail)",
  );
  ok(
    !q.value.options.some((o) => o.carrierCode === "paquetexpress"),
    "a tariff_price_not_found rate is never offered",
  );

  sky.quoteStatus = 422;
  sky.quoteErrorField = "address_from";
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "configuration",
    "a refused ORIGIN is NEOGEN's configuration, not the customer's address",
  );
  sky.quoteErrorField = "parcel";
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "configuration",
    "a refused parcel is configuration too",
  );
  sky.quoteErrorField = "address_to";
  eq(
    (await provider.quote(destination, parcel)).error?.code,
    "invalid_address",
    "only a refused DESTINATION asks the customer to correct it",
  );
  sky.quoteStatus = 201;

  /* OAuth: the reference shows form-encoded, its schema says JSON. */
  __resetSkydropxTokens();
  sky.tokenRequests = [];
  ok(
    (await provider.quote(destination, parcel)).ok,
    "the documented form-encoded token request works",
  );
  eq(sky.tokenRequests, ["form"], "form-encoded is tried first");
  __resetSkydropxTokens();
  sky.tokenRequests = [];
  sky.tokenFormats = ["json"];
  ok(
    (await provider.quote(destination, parcel)).ok,
    "an account that only takes JSON still authenticates",
  );
  eq(sky.tokenRequests, ["form", "json"], "…by retrying once as JSON after a 415");
  sky.tokenFormats = ["form", "json"];

  /* The console's authentication check: credentials only, nothing secret out. */
  const onlyCreds = readSkydropxCredentials({
    SKYDROPX_MODE: "sandbox",
    SKYDROPX_CLIENT_ID: "client-test",
    SKYDROPX_CLIENT_SECRET: "secret-test-not-real",
    SKYDROPX_API_URL: API,
  });
  ok(onlyCreds && !readSkydropxConfig({ ...onlyCreds }), "the check needs no origin or parcel");
  eq(
    readSkydropxCredentials({ ...process.env, SKYDROPX_MODE: "live", VERCEL_ENV: "preview" }),
    null,
    "…and still refuses live credentials outside Production",
  );
  const leaks = (shown) =>
    ["tok-", "client-test", "secret-test-not-real"].some((s) => JSON.stringify(shown).includes(s));
  sky.tokenRequests = [];
  let shown = describeTokenAttempt(await requestSkydropxToken(onlyCreds));
  eq(
    [shown.authenticated, shown.httpStatus, shown.formatAccepted, shown.expiresInSeconds],
    [true, 200, "form", 7200],
    "a working token request reports status, format and lifetime",
  );
  ok(!leaks(shown), "…and never the token, the client id or the secret");
  sky.tokenFormats = ["json"];
  shown = describeTokenAttempt(await requestSkydropxToken(onlyCreds));
  eq(shown.formatAccepted, "json", "the JSON fallback is reported as such");
  sky.tokenFormats = ["form", "json"];
  sky.rejectToken = true;
  shown = describeTokenAttempt(await requestSkydropxToken(onlyCreds));
  eq([shown.authenticated, shown.httpStatuses], [false, [401]], "a refusal reports its status");
  ok(!leaks(shown), "…without a credential in it");
  sky.rejectToken = false;

  /* The console's quote check: one quotation, the raw rates beside NEOGEN's. */
  const { runQuoteCheck, validQuoteCheckInput } =
    await import("../src/shipping/adapters/skydropx/quoteCheck.ts");
  const where = { postalCode: "06700", state: "CMX", city: "Cuauhtémoc", colonia: "Roma Norte" };
  ok(validQuoteCheckInput(where), "a normal destination is accepted");
  ok(!validQuoteCheckInput({ ...where, state: "Ciudad de México" }), "…a state must be a code");
  __resetSkydropxTokens();
  const echoing = async (url, init) => {
    const response = await fetch(url, init);
    if (!String(url).includes("/quotations/")) return response;
    const body = await response.clone().json();
    return json(response.status, { ...body, note: "origen Calle Origen 1, 44100 Guadalajara" });
  };
  const check = await runQuoteCheck(where, { fetch: echoing });
  eq(check.outcome, "ok", "the quote check quotes");
  ok(
    check.calls.every((c) => ["token", "create_quotation", "poll_quotation"].includes(c.step)) &&
      check.calls.some((c) => c.step === "create_quotation") &&
      check.blocked.length === 0,
    "…reaching only the token and quotation endpoints",
  );
  eq([check.rateCount, check.selectableCount], [5, 2], "…and reports every raw rate, 2 offered");
  const byCarrier = (name) => check.rates.find((r) => r.provider.provider_name === name);
  ok(
    !byCarrier("estafeta").customerSelectable &&
      byCarrier("estafeta").notSelectable.includes("requires_origin_verification"),
    "a rate needing origin verification is shown as not selectable, and why",
  );
  ok(
    !byCarrier("paquetexpress").customerSelectable &&
      byCarrier("paquetexpress").notSelectable.includes("status:tariff_price_not_found"),
    "a tariff_price_not_found rate is shown as not selectable, and why",
  );
  eq(
    [byCarrier("fedex").neogen.customerPriceBelowFreeThreshold, byCarrier("sendex").neogen.cost],
    [185, 107],
    "customer prices come from the provider totals, rounded up once",
  );
  eq(
    [
      byCarrier("sendex").neogen.subsidyAtFreeThreshold,
      byCarrier("fedex").neogen.subsidyAtFreeThreshold,
    ],
    [107, 107],
    "…and the free-shipping subsidy is the cheapest offered rate",
  );
  const out = JSON.stringify(check);
  ok(
    ![
      "tok-",
      "client-test",
      "secret-test-not-real",
      "rate-",
      "Calle Origen 1",
      "Guadalajara",
      "44100",
    ].some((secret) => out.includes(secret)) && out.includes("[origin]"),
    "the quote check shows no token, credential, rate id or origin value",
  );
  eq(check.parcelSent.weight, 1, "the parcel's weight is sent at the API's 1 kg minimum");

  /* The completion check: ONE quotation, polled until Skydropx says complete. */
  __resetSkydropxTokens();
  sky.quotePolls = 3;
  let completion = await runQuoteCheck(where, { untilComplete: true, sleep: async () => {} });
  eq(
    [completion.completion, completion.pollRequests, completion.rateCount],
    ["COMPLETED", 3, 5],
    "polling until complete stops at is_completed and reports COMPLETED",
  );
  ok(
    completion.msFromCreateToCompleted !== null &&
      completion.timeline.length === 2 &&
      completion.timeline[0].rateCount === 0 &&
      completion.timeline[1].completed &&
      completion.timeline[1].cheapestSelectable === 107,
    "…with the rate counts and cheapest rate over time",
  );
  eq(
    completion.calls.filter((c) => c.step === "create_quotation").length,
    1,
    "…from exactly one quotation",
  );
  let fakeNow = 0;
  const tick = () => (fakeNow += 1000);
  sky.quotePolls = 10_000;
  completion = await runQuoteCheck(where, {
    untilComplete: true,
    now: tick,
    sleep: async () => {},
  });
  ok(
    completion.completion === "TIMED OUT WHILE STILL PROCESSING" &&
      completion.pollRequests > 20 &&
      completion.calls.filter((c) => c.step === "create_quotation").length === 1,
    "a quotation that never completes is reported as TIMED OUT, never quoted again",
  );
  fakeNow = 0;
  completion = await runQuoteCheck(where, { now: tick, sleep: async () => {} });
  ok(
    completion.completion === "TIMED OUT WHILE STILL PROCESSING" && completion.pollRequests < 10,
    "checkout's own hard limit (20 s) still ends a quote that never completes",
  );
  sky.quotePolls = 1;

  /* Double submit: the page locks itself; the server spends a one-time token. */
  const { spendOnceToken, issueOnceToken } = await import("../src/server/ops/onceToken.ts");
  const once = issueOnceToken();
  eq(
    [await spendOnceToken(once), await spendOnceToken(once), await spendOnceToken("forged")],
    [true, false, false],
    "a form's token is spent once; a resend or a forged token is refused",
  );
  const { quoteFormPage, QUOTE_FORM_LOCK } = await import("../src/server/ops/quoteForm.ts");
  ok(
    quoteFormPage(once).includes(`name="once" value="${once}"`) &&
      quoteFormPage(once).includes(QUOTE_FORM_LOCK),
    "the page carries its token and its lock",
  );
  {
    const listeners = [];
    const el = (extra = {}) => ({
      disabled: false,
      textContent: "",
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      addEventListener: (type, fn) => listeners.push(fn),
      ...extra,
    });
    const nodes = { quote: el(), go: el(), state: el() };
    new Function("document", QUOTE_FORM_LOCK)({ getElementById: (id) => nodes[id] });
    const submit = () => {
      const event = {
        prevented: false,
        preventDefault() {
          this.prevented = true;
        },
      };
      listeners.forEach((fn) => fn(event));
      return event.prevented;
    };
    eq(
      [submit(), nodes.go.disabled, nodes.go.textContent, nodes.quote.attrs["aria-busy"], submit()],
      [false, true, "Cotizando…", "true", true],
      "the first click submits and locks the button; a second click is cancelled",
    );
  }

  /* The quote check's form: the page loaded, then its submit got "Forbidden". */
  const { sameOriginPost } = await import("../src/server/ops/sameOrigin.ts");
  const PAGE = "https://neogen-git-staging.example.vercel.app/ops/diagnostico/skydropx/cotizacion";
  const post = (h) => new Request(PAGE, { method: "POST", headers: h });
  ok(
    sameOriginPost(post({ origin: "null", "sec-fetch-site": "same-origin" })),
    "the console's own form is accepted — under no-referrer the browser sends Origin: null",
  );
  ok(
    sameOriginPost(post({ origin: new URL(PAGE).origin })),
    "…a matching Origin alone is accepted",
  );
  ok(
    !sameOriginPost(post({ origin: "https://evil.example", "sec-fetch-site": "cross-site" })) &&
      !sameOriginPost(post({ origin: "null", "sec-fetch-site": "cross-site" })) &&
      !sameOriginPost(post({ "sec-fetch-site": "same-site" })) &&
      !sameOriginPost(post({ origin: "null" })) &&
      !sameOriginPost(post({ origin: "https://evil.example" })) &&
      !sameOriginPost(post({})),
    "…a cross-site, same-site, unproven null or headerless post is still refused",
  );
  const { readFileSync } = await import("node:fs");
  const routeSource = readFileSync(
    new URL("../src/app/ops/diagnostico/skydropx/cotizacion/route.ts", import.meta.url),
    "utf8",
  );
  ok(
    routeSource.indexOf("sameOriginPost(request)") > 0 &&
      routeSource.indexOf("sameOriginPost(request)") < routeSource.indexOf("spendOnceToken(") &&
      routeSource.indexOf("spendOnceToken(") < routeSource.indexOf("runQuoteCheck(input"),
    "the quote check route refuses a foreign post, then a resend, before any quotation",
  );
}

/* ---- 2a. READY TO BUY A LABEL? (configuration only, no call) ------------- */
{
  const { skydropxReadiness } = await import("../src/shipping/adapters/skydropx/config.ts");
  const ready = skydropxReadiness({ ...process.env, VERCEL_ENV: "preview" });
  eq([ready.readyToBuyLabels, ready.blocking], [true, []], "a fully configured sandbox is ready");
  const missing = skydropxReadiness({
    ...process.env,
    VERCEL_ENV: "preview",
    SKYDROPX_CONSIGNMENT_NOTE: "",
    SKYDROPX_PACKAGE_TYPE: "",
  });
  eq(
    [missing.readyToBuyLabels, missing.blocking],
    [false, ["SKYDROPX_CONSIGNMENT_NOTE", "SKYDROPX_PACKAGE_TYPE"]],
    "missing Carta Porte codes are named as blocking",
  );
  const live = skydropxReadiness({
    ...process.env,
    SKYDROPX_MODE: "live",
    VERCEL_ENV: "production",
  });
  ok(
    !live.readyToBuyLabels &&
      !live.labelsAllowedHere &&
      live.blocking.some((b) => b.startsWith("labels not allowed")),
    "Production stays gated without SKYDROPX_LIVE_LABELS",
  );
  const shown = JSON.stringify([ready, missing, live]);
  ok(
    ![
      "secret-test-not-real",
      "client-test",
      SECRET,
      "Calle Origen 1",
      "Guadalajara",
      "44100",
      "3300000000",
    ].some((v) => shown.includes(v)),
    "readiness shows no credential and no origin value",
  );
  const callsBefore = sky.tokenRequests.length + sky.creates.length;
  skydropxReadiness();
  eq(sky.tokenRequests.length + sky.creates.length, callsBefore, "…and calls nothing");
}

/* ---- 2a'. CARTA PORTE CATALOGUES: read-only, nothing chosen ------------- */
{
  const { searchCarta, validCatalogQuery } =
    await import("../src/shipping/adapters/skydropx/catalog.ts");
  __resetSkydropxTokens();
  sky.catalogReads = [];
  const created = sky.creates.length;
  const quotations = sky.quotations.size;
  const found = await searchCarta(
    { products: ["frasco", "polvo"], packaging: ["bolsa"] },
    { sleep: async () => {} },
  );
  eq(
    found.products.map((p) => [p.query, p.totalCount, p.entries.length, p.truncated]),
    [
      ["frasco", 25, 25, false],
      ["polvo", 1, 1, false],
    ],
    "product searches page through the catalogue (20 a page)",
  );
  eq(
    found.products[1].entries,
    [{ code: "12000000", description: "Sustancia de ejemplo en polvo" }],
    "…returning the catalogue's own code and wording",
  );
  eq(found.packagingAll.entries.length, 2, "the whole packaging catalogue is listed");
  eq(
    found.packaging[0].entries.map((e) => e.code),
    ["5H4"],
    "…and searched by name",
  );
  ok(
    found.blocked.length === 0 &&
      sky.catalogReads.every((r) =>
        /^GET \/api\/v1\/shipments\/(consignment_notes|packagings)$/.test(r),
      ) &&
      sky.creates.length === created &&
      sky.quotations.size === quotations,
    "only the two catalogue GETs — no quotation, no shipment",
  );
  ok(
    !JSON.stringify(found).includes("tok-") && !JSON.stringify(found).includes("secret-test"),
    "no token or secret in the answer",
  );
  ok(
    validCatalogQuery("liofilizado") && !validCatalogQuery("a") && !validCatalogQuery("x&y=1"),
    "search terms are plain words",
  );
}

/* ---- 2b. WHEN A QUOTE IS DONE: completion, or a stable selectable set --- */
{
  /* The first real sandbox quotation, as a script: MX$159 at ~3 s, the cheaper
     MX$119 at ~4.8 s, nothing selectable changes after that, completion at
     ~17.7 s. Each poll costs 700 ms of wait plus 180 ms of answer. */
  const rate = (provider, service, total, extra = {}) => ({
    id: `r-${provider}-${service}`,
    success: true,
    status: "price_found_external",
    currency_code: "MXN",
    total,
    days: 2,
    provider_name: provider,
    provider_display_name: provider,
    provider_service_name: service,
    provider_service_code: service,
    ...extra,
  });
  const pending = (provider, service) => ({
    id: `r-${provider}-${service}`,
    success: false,
    status: "pending_to_zone",
    total: null,
    provider_name: provider,
    provider_service_code: service,
  });
  const at3 = [rate("paquetexpress", "sin_recoleccion", "158.72"), pending("sendex", "reg")];
  const at5 = [
    ...at3,
    rate("fedex", "standard_overnight", "118.37"),
    rate("dhl", "express", "305.71"),
  ];
  const done = [
    ...at5.filter((r) => r.success),
    { ...pending("sendex", "reg"), status: "no_coverage" },
  ];
  const realRun = [
    { at: 0, completed: false, rates: [] },
    { at: 3000, completed: false, rates: at3 },
    { at: 4844, completed: false, rates: at5 },
    { at: 17687, completed: true, rates: done },
  ];
  let t = 0;
  let polls = 0;
  sky.scriptNow = () => t;
  const timed = (deps = {}) =>
    createSkydropxProvider({
      sleep: async (ms) => {
        polls += 1;
        t += ms + 180;
      },
      now: () => t,
      ...deps,
    });
  const run = async (script, deps) => {
    [t, polls, sky.script] = [0, 0, script];
    const result = await timed(deps).quote(destination, parcel);
    sky.script = null;
    return { result, endedAt: t, polls };
  };
  const cheapest = (r) => Math.min(...r.value.options.map((o) => o.cost.amount));

  let { result, endedAt } = await run(realRun);
  ok(result.ok && cheapest(result) === 119, "the real run: checkout offers the MX$119 rate");
  ok(
    !result.value.options.some((o) => o.cost.amount === 159) || cheapest(result) === 119,
    "…never freezing the MX$159 that arrived first as the cheapest",
  );
  ok(
    endedAt >= 4844 + 4000 && endedAt < 17687,
    `…and stops once the selectable set held still 4 s, before completion (${endedAt} ms)`,
  );
  eq(result.value.options.length, 3, "…with every selectable rate");
  {
    const methods = shipping.quotedMethods(
      {
        destinationKey: "k",
        quotedAt: "",
        quote: {
          provider: "skydropx",
          quotationId: "q",
          expiresAt: "",
          options: result.value.options,
        },
        error: null,
      },
      { city: "Cuauhtémoc", state: "CMX" },
      { amount: 10000, currency: "MXN" },
    );
    eq(
      methods.map((m) => m.subsidy.amount),
      [119, 119, 119],
      "…so the free-shipping subsidy is MX$119, not MX$159",
    );
  }

  /* The first usable rate alone never ends the wait. */
  ({ result, endedAt } = await run([
    { at: 0, completed: false, rates: [] },
    { at: 1000, completed: false, rates: [rate("fedex", "standard_overnight", "118.37")] },
    { at: 30000, completed: true, rates: [rate("fedex", "standard_overnight", "118.37")] },
  ]));
  ok(result.ok && endedAt >= 1000 + 4000, "one early rate is offered only after holding still");

  /* A cheaper rate that lands inside the window restarts it. */
  ({ result } = await run([
    { at: 0, completed: false, rates: [] },
    { at: 2000, completed: false, rates: [rate("dhl", "express", "305.71")] },
    {
      at: 5500,
      completed: false,
      rates: [rate("dhl", "express", "305.71"), rate("estafeta", "terrestre", "144.13")],
    },
    { at: 40000, completed: true, rates: [] },
  ]));
  ok(result.ok && cheapest(result) === 145, "a cheaper rate 3.5 s later is still caught");

  /* A price change on the same rate also restarts it. */
  ({ result } = await run([
    { at: 0, completed: false, rates: [rate("dhl", "express", "305.71")] },
    { at: 3000, completed: false, rates: [rate("dhl", "express", "290.00")] },
    { at: 40000, completed: true, rates: [] },
  ]));
  ok(
    result.ok && cheapest(result) === 290,
    "a rate whose total changes is offered at its new total",
  );

  /* Completion ends the wait at once, even before the window. */
  ({ result, endedAt } = await run([
    { at: 0, completed: false, rates: [] },
    { at: 1500, completed: true, rates: [rate("fedex", "standard_overnight", "118.37")] },
  ]));
  ok(result.ok && endedAt < 4000, "a completed quotation is offered immediately");

  /* Still changing at the hard limit: a timeout, never a guessed subsidy. */
  const moving = Array.from({ length: 15 }, (_, i) => ({
    at: i * 2000,
    completed: false,
    rates: [rate("dhl", "express", String(300 - i))],
  }));
  ({ result, endedAt } = await run(moving));
  ok(
    !result.ok && result.error.code === "timeout" && endedAt <= 20000 + 880,
    "a selectable set still changing at 20 s is a timeout",
  );

  /* At the hard limit with a set that HAS held still: offered. */
  ({ result } = await run(
    [
      { at: 0, completed: false, rates: [] },
      { at: 2000, completed: false, rates: [rate("dhl", "express", "305.71")] },
    ],
    { stopWhenStable: false },
  ));
  ok(result.ok && cheapest(result) === 306, "a stable partial result at the hard limit is offered");

  /* Nothing selectable, ever: the graceful failures are unchanged. */
  ({ result } = await run([{ at: 0, completed: false, rates: [pending("sendex", "reg")] }]));
  eq(result.error?.code, "timeout", "no selectable rate by the hard limit is a timeout");
  ({ result } = await run([
    { at: 0, completed: false, rates: [] },
    { at: 2000, completed: true, rates: [{ ...pending("sendex", "reg"), status: "no_coverage" }] },
  ]));
  eq(result.error?.code, "no_coverage", "complete with nothing selectable is no coverage");

  /* The console's completion mode still waits for completion. */
  ({ result, endedAt } = await run(realRun, { stopWhenStable: false, quoteBudgetMs: 90000 }));
  ok(result.ok && endedAt >= 17687, "the completion check still polls until complete");
  sky.scriptNow = () => 0;
}

/* ======================================================================== */
/* 3. CHECKOUT RULES — server price, tampering, expiry, re-quote             */
/* ======================================================================== */

const NOW = Date.parse("2026-10-16T12:00:00.000Z");
const iso = (t) => new Date(t).toISOString();
function stored(at = NOW, options) {
  return {
    destinationKey: shipping.destinationKey(ADDRESS),
    quotedAt: iso(at),
    quote: {
      provider: "skydropx",
      quotationId: "quo-x",
      expiresAt: iso(at + 24 * 3600 * 1000),
      options: options ?? [
        {
          rateId: "r-fedex",
          carrier: "FedEx",
          carrierCode: "fedex",
          service: "Express Saver",
          serviceCode: "express_saver",
          cost: mxn(184),
          estimateDays: 2,
        },
        {
          rateId: "r-sendex",
          carrier: "Sendex",
          carrierCode: "sendex",
          service: "Regular",
          serviceCode: "reg",
          cost: mxn(106),
          estimateDays: null,
        },
      ],
    },
    error: null,
  };
}
{
  /* FREE-SHIPPING POLICY (owner, 2026-10-18): the cheapest eligible rate is
     the subsidy; it is free, and a faster one costs only the difference. */
  const standard = shipping.selectQuoted(stored(), "r-sendex", ADDRESS, mxn(12500), NOW);
  eq(
    [standard.price, standard.quote.cost, standard.quote.subsidy],
    [mxn(0), mxn(106), mxn(106)],
    "≥ MX$10,000: the cheapest option is free — subsidy = its cost",
  );
  const express = shipping.selectQuoted(stored(), "r-fedex", ADDRESS, mxn(12500), NOW);
  eq(
    [express.price, express.quote.cost, express.quote.subsidy],
    [mxn(78), mxn(184), mxn(106)],
    "≥ MX$10,000: a faster option costs the customer only the difference (184 − 106)",
  );
  const owner = shipping.selectQuoted(
    stored(NOW, [
      {
        rateId: "std",
        carrier: "A",
        carrierCode: "a",
        service: "Standard",
        serviceCode: "std",
        cost: mxn(160),
        estimateDays: 4,
      },
      {
        rateId: "exp",
        carrier: "B",
        carrierCode: "b",
        service: "Express",
        serviceCode: "exp",
        cost: mxn(430),
        estimateDays: 1,
      },
    ]),
    "exp",
    ADDRESS,
    mxn(10000),
    NOW,
  );
  eq(
    [owner.quote.cost, owner.quote.subsidy, owner.price],
    [mxn(430), mxn(160), mxn(270)],
    "the owner's example: Express 430, subsidy 160, customer 270",
  );
  eq(owner.quote.subsidyBase, mxn(160), "the subsidy's base is kept for audit");
  const lines = [
    {
      variantId: "v1",
      slug: "x",
      name: "X",
      presentation: "1",
      unitPrice: mxn(12500),
      quantity: 1,
      lineTotal: mxn(12500),
    },
  ];
  eq(orderTotals(lines, standard).total, mxn(12500), "free standard: total = products");
  eq(orderTotals(lines, express).total, mxn(12578), "upgraded: total = products + the difference");

  const paid = shipping.selectQuoted(stored(), "r-sendex", ADDRESS, mxn(5000), NOW);
  eq(
    [paid.price, paid.quote.subsidy],
    [mxn(106), mxn(0)],
    "< MX$10,000: the customer pays the full selected rate, no subsidy",
  );
  eq(
    shipping.selectQuoted(stored(), "r-fedex", ADDRESS, mxn(5000), NOW).price,
    mxn(184),
    "< MX$10,000: the full rate for a faster option too",
  );
  const smallLines = [{ ...lines[0], unitPrice: mxn(5000), lineTotal: mxn(5000) }];
  eq(orderTotals(smallLines, paid).total, mxn(5106), "…and it is in the total charged");

  /* Tampering cannot enlarge the subsidy: its base is the stored quote's
     cheapest rate, and nothing posted reaches it. */
  ok(
    shipping.quotedMethods(stored(), ADDRESS, mxn(12500)).every((m) => m.subsidy.amount <= 106),
    "no option carries a subsidy above the cheapest rate",
  );
  eq(express.quote.subsidy, mxn(106), "choosing an expensive rate does not raise the subsidy");
  eq(
    shipping.selectQuoted(stored(), "r-fedex&subsidy=999", ADDRESS, mxn(12500), NOW),
    null,
    "a crafted rate id selects nothing",
  );

  eq(
    shipping.selectQuoted(stored(), "r-forged", ADDRESS, mxn(5000), NOW),
    null,
    "a rate id not in the stored quote selects nothing",
  );
  eq(
    shipping.selectQuoted(
      stored(),
      "r-sendex",
      { ...ADDRESS, postalCode: "01000" },
      mxn(5000),
      NOW,
    ),
    null,
    "a quote for another address selects nothing",
  );
  eq(
    shipping.selectQuoted(stored(NOW - 2 * 3600 * 1000), "r-sendex", ADDRESS, mxn(5000), NOW),
    null,
    "a stale quote selects nothing",
  );
  eq(
    shipping.selectionCurrent(paid, ADDRESS, mxn(11000), NOW),
    "reprice",
    "crossing the threshold reprices shipping before placement",
  );
  eq(shipping.repriceSelection(paid, mxn(11000)).price, mxn(0), "…to free, from the frozen cost");
  eq(
    shipping.selectionCurrent(paid, ADDRESS, mxn(5000), NOW + 2 * 3600 * 1000),
    "stale",
    "an old selection must be re-quoted",
  );
  const requoted = shipping.requoteSelection(
    paid,
    stored(NOW + 2 * 3600 * 1000, [
      {
        rateId: "r-sendex-2",
        carrier: "Sendex",
        carrierCode: "sendex",
        service: "Regular",
        serviceCode: "reg",
        cost: mxn(120),
        estimateDays: 3,
      },
    ]),
    ADDRESS,
    mxn(5000),
    NOW + 2 * 3600 * 1000,
  );
  eq(
    [requoted?.quote.rateId, requoted?.price],
    ["r-sendex-2", mxn(120)],
    "a re-quote keeps the carrier and service, at the new price",
  );
  /* Above the threshold the old cheapest disappears in the re-quote: the
     subsidy is recomputed from the NEW eligible rates, never kept stale. */
  const upgradedOld = shipping.selectQuoted(stored(), "r-fedex", ADDRESS, mxn(12500), NOW);
  const later = NOW + 2 * 3600 * 1000;
  const reupgraded = shipping.requoteSelection(
    upgradedOld,
    stored(later, [
      {
        rateId: "r-fedex-2",
        carrier: "FedEx",
        carrierCode: "fedex",
        service: "Express Saver",
        serviceCode: "express_saver",
        cost: mxn(200),
        estimateDays: 2,
      },
      {
        rateId: "r-dhl",
        carrier: "DHL",
        carrierCode: "dhl",
        service: "Standard",
        serviceCode: "standard",
        cost: mxn(150),
        estimateDays: 4,
      },
    ]),
    ADDRESS,
    mxn(12500),
    later,
  );
  eq(
    [reupgraded.quote.subsidy, reupgraded.price, reupgraded.quote.cost],
    [mxn(150), mxn(50), mxn(200)],
    "a re-quote recomputes the subsidy from the fresh cheapest rate (Sendex gone → DHL 150)",
  );
  eq(
    shipping.repriceSelection(
      shipping.selectQuoted(stored(), "r-fedex", ADDRESS, mxn(5000), NOW),
      mxn(12500),
    ).price,
    mxn(78),
    "crossing the threshold applies the subsidy from the frozen base",
  );
  eq(
    shipping.requoteSelection(
      paid,
      stored(NOW + 2 * 3600 * 1000, []),
      ADDRESS,
      mxn(5000),
      NOW + 2 * 3600 * 1000,
    ),
    null,
    "a service that disappeared is not silently replaced",
  );
  const methods = shipping.quotedMethods(stored(), ADDRESS, mxn(5000));
  eq(
    methods.map((m) => m.id),
    ["r-sendex", "r-fedex"],
    "options are cheapest first",
  );
  ok(
    methods.every((m) => !("cost" in m)),
    "a customer-facing option carries no logistics cost",
  );
}

/* ======================================================================== */
/* 4. BOOKING — only paid orders, exactly one label                           */
/* ======================================================================== */

let orderSeq = 0;
async function order(state = "paid", { subtotal = 12500, quote = true } = {}) {
  orderSeq += 1;
  const at = "2026-10-16T10:00:00.000Z";
  const q = await provider.quote(destination, parcel);
  const rate = [...q.value.options].sort((a, b) => a.cost.amount - b.cost.amount)[0];
  const delivery = shipping.selectQuoted(
    {
      destinationKey: shipping.destinationKey(ADDRESS),
      quotedAt: q.value.quotedAt,
      quote: {
        provider: "skydropx",
        quotationId: q.value.quotationId,
        expiresAt: q.value.expiresAt,
        options: q.value.options,
      },
      error: null,
    },
    rate.rateId,
    ADDRESS,
    mxn(subtotal),
    Date.now(),
  );
  const o = upgradeOrder({
    id: `NG-SHIP${String(orderSeq).padStart(4, "0")}-A${String(orderSeq).padStart(2, "0")}`,
    createdAt: at,
    updatedAt: at,
    version: 1,
    state,
    lines: [
      {
        variantId: "v1",
        slug: "fixture",
        name: "Fixture",
        presentation: "10 mg",
        unitPrice: mxn(subtotal),
        quantity: 1,
        lineTotal: mxn(subtotal),
      },
    ],
    totals: {
      subtotal: mxn(subtotal),
      shipping: delivery.price,
      total: mxn(subtotal + delivery.price.amount),
    },
    contact: { email: "cliente@example.mx", name: "Cliente", phone: "523300000000" },
    shipping: ADDRESS,
    delivery: quote
      ? delivery
      : { methodId: "local-priority", route: "priority", estimateDays: 1, price: mxn(0) },
    route: "priority",
    acknowledged: [],
    locale: "es",
    providerRef: state === "paid" ? "ORD01PAID" + orderSeq : null,
    provider: "mercadopago",
    attempts: [],
    milestones: state === "paid" ? { paid: at } : {},
    events: [
      { seq: 1, at, kind: "created", providerEventId: null, from: null, to: "created", note: null },
    ],
  });
  const created = await memoryOrderRepository.create(o);
  return created.order;
}
const load = (id) => memoryOrderRepository.get(id);

__resetOrderStore();
__resetOutbox();
{
  for (const state of [
    "payment_failed",
    "payment_processing",
    "pending_payment",
    "created",
    "cancelled",
  ]) {
    const o = await order(state);
    const before = sky.creates.length;
    eq(await bookShipment(o.id), "skipped", `a ${state} order buys no label`);
    eq(sky.creates.length, before, `…and Skydropx is never called for it`);
    eq((await load(o.id)).shipments.length, 0, `…and no booking is recorded for it`);
  }
  const legacy = await order("paid", { quote: false });
  eq(await bookShipment(legacy.id), "skipped", "an order without a quoted rate buys no label");
}
{
  const o = await order("paid");
  const before = sky.creates.length;
  eq(
    await bookShipment(o.id, { afterChange: afterOrderChange }),
    "booked",
    "an approved payment buys the label",
  );
  eq(sky.creates.length - before, 1, "exactly one creation request");
  const booked = signals.filter((r) => r.signal === "shipping.booked");
  ok(
    booked.length === 1 &&
      booked[0].context.orderId === o.id &&
      booked[0].context.outcome === "booked" &&
      !/shp-|rate-|quo-|tok-/.test(JSON.stringify(booked)),
    "one log line says the label exists — NEOGEN's order id, no provider ids",
  );
  const after = await load(o.id);
  eq(after.shipments.length, 1, "one shipment on the order");
  const s = after.shipments[0];
  eq(
    [s.booking.status, s.provider, s.state],
    ["created", "skydropx", "pending"],
    "booked, provider-owned, awaiting pickup",
  );
  ok(
    s.providerRef?.startsWith("shp-") && s.trackingNumber?.startsWith("TRK"),
    "the shipment id and tracking are kept",
  );
  eq(s.booking.cost, mxn(185), "the logistics cost is kept on the booking");
  eq(after.totals.shipping, mxn(0), "…while the customer paid none (free shipping)");
  const sent = sky.creates.at(-1);
  eq(sent.unique_shipment, true, "Skydropx's own duplicate protection is requested");
  eq(sent.address_to.email, "ops@example.test", "the customer's email is not sent to Skydropx");
  eq(sent.address_to.phone, "3300000000", "the recipient's phone goes as ten national digits");
  eq(sent.packages[0].consignment_note, "00000000", "Carta Porte codes come from configuration");

  /* Duplicate payment webhooks, duplicate reconciles, customer refreshes. */
  const again = sky.creates.length;
  await afterOrderChange(after);
  await afterOrderChange(await load(o.id));
  eq(await bookShipment(o.id), "booked", "a second run finds the label");
  await reconcileShipments();
  eq(sky.creates.length, again, "no further creation request, whatever repeats");
  eq((await load(o.id)).shipments.length, 1, "still one shipment");

  /* The label, for operations. */
  const label = await provider.getLabel(s.providerRef);
  ok(
    label.ok && label.value.url.startsWith("https://labels.example.test/"),
    "the label is retrievable for operators",
  );
}
{
  /* Simultaneous runs for one newly paid order. */
  const o = await order("paid");
  const results = await Promise.all([bookShipment(o.id), bookShipment(o.id), bookShipment(o.id)]);
  ok(
    results.every((r) => r === "booked" || r === "skipped"),
    "concurrent runs all settle",
  );
  const after = await load(o.id);
  eq(after.shipments.length, 1, "three simultaneous runs record one shipment");
  const ids = new Set(
    sky.creates
      .filter((c) => c.rate_id === after.shipments[0].booking.rateId)
      .map((c) => c.rate_id),
  );
  eq(ids.size, 1, "…all on one rate");
  eq(
    new Set([...sky.byRate.entries()].filter(([r]) => ids.has(r)).map(([, id]) => id)).size,
    1,
    "…and Skydropx holds one shipment for it",
  );
}
{
  /* Accepted, then the answer is lost. */
  const o = await order("paid");
  sky.createMode = "lost";
  eq(await bookShipment(o.id), "retry_later", "a lost answer is a retry, not a failure");
  const lost = await load(o.id);
  eq(
    [lost.shipments[0].booking.status, lost.shipments[0].providerRef],
    ["requested", null],
    "the booking stays requested, id unknown",
  );
  ok(desiredHold(lost) === "held", "the paid order keeps its stock");
  sky.createMode = "ok";
  const shipmentsAtSky = sky.shipments.size;
  eq(await bookShipment(o.id), "booked", "the retry recovers it");
  eq(sky.shipments.size, shipmentsAtSky, "Skydropx replayed the first shipment — no second label");
  ok(
    (await load(o.id)).shipments[0].providerRef?.startsWith("shp-"),
    "the replayed id is recorded",
  );
}
{
  /* Still in progress, then a provider outage. */
  const o = await order("paid");
  sky.createMode = "in_progress";
  eq(await bookShipment(o.id), "retry_later", "409 (in progress) waits");
  sky.createMode = "down";
  eq(await bookShipment(o.id), "retry_later", "an outage waits");
  ok(
    attentionReasons(await load(o.id)).includes("shipping_failed"),
    "repeated trouble is flagged in the console",
  );
  sky.createMode = "ok";
  eq(await bookShipment(o.id), "booked", "and books once the provider is back");
  ok(!attentionReasons(await load(o.id)).includes("shipping_failed"), "the flag clears");
}
{
  /* The rate expired: one re-quote of the same carrier and service. */
  const o = await order("paid");
  sky.refuseRates.add(o.delivery.quote.rateId);
  eq(await bookShipment(o.id), "booked", "an expired rate is re-quoted and booked");
  const s = (await load(o.id)).shipments[0];
  ok(s.booking.rateId !== o.delivery.quote.rateId, "on a fresh rate of the same service");
  ok(
    (await load(o.id)).events.some((e) => e.note === "requoted"),
    "and the re-quote is on the record",
  );
}
{
  /* Refused for good after payment: an operations exception, never unpaid. */
  const o = await order("paid");
  sky.createMode = "refuse";
  eq(await bookShipment(o.id), "failed", "a refused label is a failed booking");
  const failed = await load(o.id);
  eq(failed.state, "paid", "the order stays paid");
  eq(desiredHold(failed), "held", "and keeps its stock held");
  ok(attentionReasons(failed).includes("shipping_failed"), "the console flags it");
  const before = sky.creates.length;
  eq(await bookShipment(o.id), "failed", "a failed booking is not retried by itself");
  eq(sky.creates.length, before, "…no further request until an operator says so");
  sky.createMode = "ok";
}

{
  /* Out of credit: recorded by its reason, never re-quoted. */
  const o = await order("paid");
  sky.createMode = "credits";
  const quotations = sky.quotations.size;
  eq(await bookShipment(o.id), "failed", "insufficient Skydropx credit fails the booking");
  eq(
    (await load(o.id)).shipments[0].booking.lastError,
    "insufficient_credits",
    "with the reason an operator can act on",
  );
  eq(sky.quotations.size, quotations, "and no re-quote is attempted for it");
  sky.createMode = "ok";
}
{
  const o = await order("paid");
  ok(
    o.delivery.quote.cost.amount > 0 &&
      o.delivery.quote.subsidy.amount === o.delivery.quote.cost.amount,
    "the order keeps the logistics cost and the subsidy it was quoted with",
  );
  eq(
    o.totals.shipping,
    mxn(0),
    "the cheapest option above the threshold charged the customer nothing",
  );
}

/* ======================================================================== */
/* 5. TRACKING — verified, deduplicated, order-safe                           */
/* ======================================================================== */

const hook = (payload, signature) => {
  const body = JSON.stringify(payload);
  return shippingWebhook(
    new Request("https://neogen.mx/api/shipping/webhook", {
      method: "POST",
      headers: {
        authorization: signature ?? signSkydropxBody(SECRET, body),
        "content-type": "application/json",
      },
      body,
    }),
  );
};
const packageEvent = (shipmentId, status, extra = {}) => ({
  data: {
    id: `pkg-${shipmentId}`,
    type: "packages",
    attributes: {
      status,
      tracking_number: "TRK-HOOK",
      tracking_url_provider: "https://track.example.test/x",
      returned: false,
      returned_status: null,
      ...extra,
    },
    relationships: { shipment: { data: { id: shipmentId, type: "shipments" } } },
  },
});
{
  ok(
    verifySkydropxSignature({ secret: SECRET, header: signSkydropxBody(SECRET, "{}"), body: "{}" }),
    "a correct HMAC verifies",
  );
  ok(
    !verifySkydropxSignature({
      secret: SECRET,
      header: signSkydropxBody(SECRET, "{}"),
      body: "{ }",
    }),
    "the raw body is what is signed",
  );
  ok(
    !verifySkydropxSignature({ secret: SECRET, header: "Bearer x", body: "{}" }),
    "the bearer mode is not accepted",
  );
  eq(
    trackingState("in_return", "delivered"),
    { state: "returned", exception: null },
    "a completed return is returned",
  );
  eq(
    trackingState("delivered_to_branch"),
    { state: "exception", exception: "at_branch" },
    "waiting at a branch needs the customer",
  );
  eq(trackingState("something_new"), null, "an unlisted status is never guessed");

  const o = await order("paid");
  await bookShipment(o.id, { afterChange: afterOrderChange });
  const ref = (await load(o.id)).shipments[0].providerRef;

  eq(
    (await hook(packageEvent(ref, "in_transit"), "HMAC " + "0".repeat(128))).status,
    401,
    "an invalid signature is refused",
  );
  eq(
    (await (await hook({ data: { type: "orders", id: "x" } })).json()).outcome,
    "ignored",
    "an order event is acknowledged and ignored",
  );
  eq((await hook({ nope: true })).status, 400, "a signed malformed body is refused");

  const picked = await (await hook(packageEvent(ref, "picked_up"))).json();
  eq(picked.outcome, "applied", "a pickup is applied");
  let after = await load(o.id);
  eq(
    [after.shipments[0].state, after.fulfilment.state],
    ["in_transit", "fulfilled"],
    "the pickup ships and fulfils the order",
  );
  eq(desiredHold(after), "consumed", "and its stock leaves the shelf");
  eq(
    (await (await hook(packageEvent(ref, "picked_up"))).json()).outcome,
    "duplicate",
    "a duplicate event changes nothing",
  );

  const attempt = await (await hook(packageEvent(ref, "delivery_attempt"))).json();
  eq(attempt.outcome, "applied", "a failed delivery attempt is applied");
  after = await load(o.id);
  eq(
    [after.shipments[0].state, after.shipments[0].exception],
    ["exception", "delivery_attempt"],
    "as an exception the customer can act on",
  );
  const view = customerView(after);
  eq(view.headline, "exception", "the customer sees a delivery problem");
  ok(
    es.checkout.status.exceptionDetail.delivery_attempt &&
      en.checkout.status.exceptionDetail.delivery_attempt,
    "explained in Spanish and English",
  );

  await hook(packageEvent(ref, "delivered"));
  eq((await load(o.id)).shipments[0].state, "delivered", "delivery is applied");
  eq(
    (await (await hook(packageEvent(ref, "in_transit"))).json()).outcome,
    "stale",
    "an older event after delivery changes nothing",
  );
  eq((await load(o.id)).shipments[0].state, "delivered", "the newer truth stands");

  const owed = messagesOwed(await load(o.id), () => "").map((m) => m.kind);
  eq(
    owed.filter((k) => k === "order.delivery_issue.customer").length,
    1,
    "one delivery-problem email per shipment",
  );
  ok(
    owed.includes("order.shipped.customer") && owed.includes("order.delivered.customer"),
    "shipped and delivered are owed",
  );
  const box = await memoryOutbox().forOrder(o.id);
  eq(
    new Set(box.map((e) => e.message.id)).size,
    box.length,
    "the outbox holds each message once, through duplicate events",
  );

  const unknown = await (await hook(packageEvent("shp-unknown", "in_transit"))).json();
  eq(
    unknown.outcome,
    "unknown_shipment",
    "a shipment NEOGEN has not recorded is acknowledged, not guessed",
  );
}
{
  /* "Created" and "Error" webhooks are about the booking: read and apply it. */
  const o = await order("paid");
  sky.failNext = true;
  await bookShipment(o.id);
  const ref = (await load(o.id)).shipments[0].providerRef;
  ok(ref, "the shipment id is known even when Skydropx then fails it");
  const res = await (await hook(packageEvent(ref, "error"))).json();
  eq(res.outcome, "refreshed", "an Error event reads the shipment");
  const failedBooking = (await load(o.id)).shipments[0].booking;
  eq(
    [failedBooking.status, failedBooking.lastError],
    ["failed", "provider_failed"],
    "and records the failed booking",
  );
  ok(
    attentionReasons(await load(o.id)).includes("shipping_failed"),
    "flagged in the console at once, not after 30 minutes",
  );

  const o2 = await order("paid");
  await bookShipment(o2.id);
  const ref2 = (await load(o2.id)).shipments[0].providerRef;
  await hook(packageEvent(ref2, "created"));
  const events = (await load(o2.id)).events.length;
  const again = await (await hook(packageEvent(ref2, "created"))).json();
  eq(again.outcome, "unchanged", "a repeated Created event changes nothing");
  eq((await load(o2.id)).events.length, events, "and writes nothing to the order");
  eq((await load(o2.id)).shipments.length, 1, "nor creates a shipment");
}

{
  /* Refresh: a webhook that never came. */
  const o = await order("paid");
  await bookShipment(o.id);
  const ref = (await load(o.id)).shipments[0].providerRef;
  sky.shipments.get(ref).trackingStatus = "in_transit";
  eq(await refreshOrderShipment(o.id), "refreshed", "a refresh applies what the webhook missed");
  eq((await load(o.id)).shipments[0].state, "in_transit", "the parcel is in transit");
}

/* ======================================================================== */
/* 6. CANCELLATION — the order and the label are separate acts               */
/* ======================================================================== */

{
  const o = await order("paid");
  await bookShipment(o.id);
  const booked = await load(o.id);
  const cancelled = cancelOrder(
    booked,
    "customer_request",
    { source: "operator", name: "ana" },
    "2026-10-16T11:00:00.000Z",
  );
  ok(cancelled.ok, "a paid order with a label can be cancelled");
  const c = cancelled.order;
  eq(c.shipments[0].state, "pending", "cancelling the order does not pretend to cancel the label");
  ok(c.shipments[0].cancelRequestedAt, "the label is marked for cancellation");
  ok(attentionReasons(c).includes("carrier_cancel_pending"), "and the console asks for it");
  ok(c.refunds.length === 1, "the refund is owed regardless of the carrier");
  await memoryOrderRepository.save(c);
  ok(!needsBooking(await load(o.id)), "a cancelled order never buys another label");

  sky.cancelMode = "refuse";
  eq(
    await cancelLabel(o.id, c.shipments[0].id, { source: "operator", name: "ana" }),
    "refused",
    "a carrier refusal is reported",
  );
  ok(attentionReasons(await load(o.id)).includes("carrier_cancel_pending"), "and the flag stays");
  sky.cancelMode = "ok";
  eq(
    await cancelLabel(o.id, c.shipments[0].id, { source: "operator", name: "ana" }),
    "cancelled",
    "a confirmed cancellation",
  );
  const done = await load(o.id);
  eq(done.shipments[0].state, "cancelled", "cancels the shipment");
  ok(!attentionReasons(done).includes("carrier_cancel_pending"), "and clears the flag");
}

/* ======================================================================== */
/* 7. CUSTOMER WORDS — both languages                                        */
/* ======================================================================== */

for (const reason of ["delivery_attempt", "at_branch", "returning", "carrier"]) {
  ok(es.checkout.status.exceptionDetail[reason], `ES explains ${reason}`);
  ok(en.checkout.status.exceptionDetail[reason], `EN explains ${reason}`);
}
ok(
  EMAIL_COPY.es.kinds["order.delivery_issue.customer"] &&
    EMAIL_COPY.en.kinds["order.delivery_issue.customer"],
  "the delivery-problem email exists in both languages",
);
ok(
  es.checkout.steps.delivery.options.quoted.errors.no_coverage &&
    en.checkout.steps.delivery.options.quoted.errors.no_coverage,
  "quote failures have customer copy in both languages",
);

/* The delivery step's wait: rendered at once, the options stream in. */
{
  const { readFileSync } = await import("node:fs");
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const waitCopy = (d) => d.checkout.steps.delivery.options.quoted;
  eq(
    [waitCopy(es).loading.title, waitCopy(en).loading.title],
    ["Calculando opciones de envío…", "Calculating shipping options…"],
    "the quote wait says what is happening, in both languages",
  );
  ok(
    [es, en].every(
      (d) => waitCopy(d).loading.note && waitCopy(d).shipTo && waitCopy(d).changeAddress,
    ),
    "…with its secondary line and the ship-to labels in both",
  );
  ok(
    [es, en].every(
      (d) =>
        !/skydropx|api\b|poll|sondeo|estab|stabil|segundo|second|cotizaci[oó]n|quotation/i.test(
          `${waitCopy(d).loading.title} ${waitCopy(d).loading.note}`,
        ),
    ),
    "…and names no provider, mechanism or timing",
  );
  const page = read("../src/app/[locale]/checkout/entrega/page.tsx");
  const step = page.slice(
    page.indexOf("export default async function DeliveryStep"),
    page.indexOf("async function DeliveryChoices"),
  );
  const choices = page.slice(page.indexOf("async function DeliveryChoices"));
  ok(
    !step.includes("quoteForDraft(") && choices.includes("quoteForDraft("),
    "the step's shell never waits for the quote; only the streamed part does",
  );
  ok(
    /<Suspense\s+fallback=[\s\S]*<QuoteWait[\s\S]*<DeliveryChoices[\s\S]*<\/Suspense>/.test(step) &&
      /import \{ Suspense \} from "react";/.test(page) &&
      step.indexOf("<ShipTo") < step.search(/<Suspense\s/),
    "…behind the quote wait, with the address shown outside it",
  );
  ok(
    [
      "quoted.errors[quoteError]",
      "refreshShippingQuote",
      "quoted.editAddress",
      "quoted.unavailable",
    ].every((piece) => choices.includes(piece)),
    "the failure, retry and unavailable paths are unchanged inside the streamed part",
  );
  const css = read("../src/components/checkout/QuoteWait.module.css");
  ok(
    /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/.test(css),
    "the wait's only motion stops under reduced motion",
  );
  const wait = read("../src/components/checkout/QuoteWait.tsx");
  ok(
    /role="status"/.test(wait) && /aria-live="polite"/.test(wait),
    "the wait is announced politely",
  );
}
ok(
  !signals.some((s) => JSON.stringify(s).includes("Siempre Viva")),
  "no customer address in any signal",
);

/* ---- report --------------------------------------------------------------- */

if (failures.length) {
  console.error(`\nshipping check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `shipping check passed — ${passed} assertions: Skydropx quotes, checkout rules, paid-only idempotent labels, tracking webhooks, cancellation, customer copy`,
);
