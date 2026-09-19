"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Mono } from "@/components/typography";
import { payOrder } from "@/server/checkout/pay";

import styles from "./MercadoPagoCardForm.module.css";

import type { DeclineReason } from "@/payments/types";

/**
 * MERCADO PAGO'S CARD FIELDS, MOUNTED IN THE NEOGEN PAYMENT STEP.
 *
 * Mercado Pago's Card Payment Brick, the integration its documentation
 * recommends for cards with the Orders API. The Brick draws the card number,
 * expiry and security code as Mercado Pago iframes and turns them into a
 * single-use TOKEN in the browser. This component never sees a card number:
 * it receives `formData.token` plus the brand and type ids, and forwards only
 * those to the `payOrder` server action.
 *
 * WHAT IT DOES NOT SEND: the amount. The Brick displays the order total it was
 * initialised with, and its `formData.transaction_amount` is ignored — the
 * server charges the order's own total, whatever a tampered page claims.
 *
 * WHAT IT DOES NOT DECIDE: the outcome. It shows what the server reports, and
 * the server reports what the provider answered. A decline remounts a fresh
 * Brick (a token is single-use) with the reason above it; the order and the
 * bag are untouched.
 *
 * THE SDK IS LOADED HERE AND NOWHERE ELSE — only when this island mounts, on
 * the payment step of an order that can be paid. `check:output` enforces that
 * the SDK URL appears in no other client asset.
 */
const SDK_URL = "https://sdk.mercadopago.com/js/v2";
const LOAD_TIMEOUT_MS = 20_000;

interface BrickController {
  unmount: () => void;
}
interface MercadoPagoInstance {
  bricks: () => {
    create: (
      brick: "cardPayment",
      container: string,
      settings: unknown,
    ) => Promise<BrickController>;
  };
}
type MercadoPagoCtor = new (
  publicKey: string,
  options?: { locale?: string },
) => MercadoPagoInstance;

interface CardFormData {
  token?: unknown;
  payment_method_id?: unknown;
  installments?: unknown;
  payer?: { identification?: { type?: unknown; number?: unknown } };
}
interface AdditionalData {
  paymentTypeId?: unknown;
}

let sdkPromise: Promise<MercadoPagoCtor> | null = null;

function loadSdk(): Promise<MercadoPagoCtor> {
  const existing = (window as unknown as { MercadoPago?: MercadoPagoCtor }).MercadoPago;
  if (existing) return Promise.resolve(existing);
  sdkPromise ??= new Promise<MercadoPagoCtor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { MercadoPago?: MercadoPagoCtor }).MercadoPago;
      if (ctor) resolve(ctor);
      else reject(new Error("sdk_missing"));
    };
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error("sdk_load_failed"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export interface CardFormCopy {
  loading: string;
  loadError: string;
  reload: string;
  submitting: string;
  formSubmit: string;
  errors: Record<
    "unavailable" | "not_found" | "invalid_state" | "provider_error" | "invalid_request",
    string
  >;
}

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "load_error" }
  | { kind: "declined"; reason: DeclineReason }
  | { kind: "error"; code: keyof CardFormCopy["errors"] };

export function MercadoPagoCardForm({
  orderId,
  locale,
  publicKey,
  amount,
  sdkLocale,
  copy,
  declines,
  initialDecline,
}: {
  orderId: string;
  /** The site locale, for the confirmation URL. */
  locale: string;
  publicKey: string;
  /** Display only — see the component note. */
  amount: number;
  /** The Brick's own locale: `es-MX` or `en-US`. */
  sdkLocale: "es-MX" | "en-US";
  copy: CardFormCopy;
  declines: Record<DeclineReason, string>;
  /** The previous attempt's decline, when the page opens after one. */
  initialDecline: DeclineReason | null;
}) {
  const router = useRouter();
  const containerId = `neogen-card-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<Status>(
    initialDecline ? { kind: "declined", reason: initialDecline } : { kind: "loading" },
  );
  /* Readiness belongs to one mount: a remount after a decline is not ready
     until its own Brick says so. */
  const [readyGeneration, setReadyGeneration] = useState(-1);
  const brickReady = readyGeneration === generation;
  const controller = useRef<BrickController | null>(null);
  const submitLabel = copy.formSubmit;

  useEffect(() => {
    let cancelled = false;
    let timeout = 0;
    const mounted = generation;

    async function mount() {
      try {
        const MercadoPago = await loadSdk();
        if (cancelled) return;
        const mp = new MercadoPago(publicKey, { locale: sdkLocale });
        const brick = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount },
          locale: sdkLocale,
          customization: {
            /* One payment. Instalments are a business decision not yet made. */
            paymentMethods: { minInstallments: 1, maxInstallments: 1 },
            visual: {
              hideFormTitle: true,
              texts: { formSubmit: submitLabel },
              style: {
                theme: "flat",
                /* NEOGEN's tokens, as literal values: the fields render
                   inside Mercado Pago's frames, out of reach of our CSS. */
                customVariables: {
                  textPrimaryColor: "#111111",
                  textSecondaryColor: "#2a2a2a",
                  inputBackgroundColor: "#faf9f6",
                  formBackgroundColor: "#f3f0ea",
                  baseColor: "#111111",
                  baseColorFirstVariant: "#2a2a2a",
                  baseColorSecondVariant: "#4a4a4a",
                  errorColor: "#b03a2e",
                  successColor: "#2f7d4f",
                  outlinePrimaryColor: "#2a2a2a",
                  outlineSecondaryColor: "#c9c5bd",
                  buttonTextColor: "#faf9f6",
                  borderRadiusSmall: "0px",
                  borderRadiusMedium: "0px",
                  borderRadiusLarge: "0px",
                  borderRadiusFull: "0px",
                  formPadding: "0px",
                  inputVerticalPadding: "12px",
                  inputHorizontalPadding: "12px",
                  inputFocusedBoxShadow: "0 0 0 2px #111111",
                  inputErrorFocusedBoxShadow: "0 0 0 2px #b03a2e",
                  fontWeightSemiBold: "600",
                },
              },
            },
          },
          callbacks: {
            onReady: () => {
              if (cancelled) return;
              window.clearTimeout(timeout);
              setReadyGeneration(mounted);
              setStatus((s) => (s.kind === "loading" ? { kind: "ready" } : s));
            },
            onError: (error: { type?: string }) => {
              /* Field-level problems are shown by the Brick itself; only a
                 critical failure replaces the form. */
              if (!cancelled && error?.type === "critical") setStatus({ kind: "load_error" });
            },
            onSubmit: async (formData: CardFormData, additional?: AdditionalData) => {
              setStatus({ kind: "submitting" });
              const identification = formData.payer?.identification;
              let result;
              try {
                result = await payOrder({
                  orderId,
                  locale,
                  instrument: {
                    token: formData.token,
                    methodId: formData.payment_method_id,
                    typeId: additional?.paymentTypeId,
                    installments: formData.installments,
                    identification: identification
                      ? { type: identification.type, number: identification.number }
                      : null,
                  },
                });
              } catch {
                result = { kind: "error" as const, code: "provider_error" as const };
              }

              if (result.kind === "done") {
                router.push(result.href);
                router.refresh();
                return;
              }
              if (result.kind === "error" && result.href) {
                setStatus({ kind: "error", code: result.code });
                router.push(result.href);
                return;
              }
              setStatus(
                result.kind === "declined"
                  ? { kind: "declined", reason: result.reason }
                  : { kind: "error", code: result.code },
              );
              /* A token is single-use: a fresh form for the next attempt. */
              setGeneration((g) => g + 1);
            },
          },
        });
        if (cancelled) brick.unmount();
        else controller.current = brick;
      } catch {
        if (!cancelled) setStatus({ kind: "load_error" });
      }
    }

    void mount();
    /*
     * A Brick that neither becomes ready nor reports a critical error (a
     * blocked script, a rejected public key) would leave the customer looking
     * at a loading line forever. After a bounded wait it is treated as a load
     * failure, with the reload action.
     */
    timeout = window.setTimeout(() => {
      if (!cancelled) {
        setStatus((s) =>
          s.kind === "loading" || s.kind === "declined" ? { kind: "load_error" } : s,
        );
      }
    }, LOAD_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.current?.unmount();
      controller.current = null;
    };
    /* `generation` remounts after a decline. The rest are fixed for the page. */
  }, [generation, publicKey, sdkLocale, amount, containerId, orderId, locale, submitLabel, router]);

  const message =
    status.kind === "declined"
      ? declines[status.reason]
      : status.kind === "error"
        ? copy.errors[status.code]
        : status.kind === "submitting"
          ? copy.submitting
          : status.kind === "load_error"
            ? copy.loadError
            : null;

  return (
    <div className={styles.island} data-payment-island="mercadopago" data-status={status.kind}>
      <p
        className={styles.message}
        data-tone={
          status.kind === "declined" || status.kind === "error" || status.kind === "load_error"
            ? "error"
            : "info"
        }
        role={status.kind === "declined" || status.kind === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {message}
      </p>

      {status.kind === "load_error" ? (
        <button
          type="button"
          className={styles.reload}
          onClick={() => {
            setStatus({ kind: "loading" });
            setGeneration((g) => g + 1);
          }}
        >
          {copy.reload}
        </button>
      ) : null}

      {!brickReady && status.kind !== "load_error" ? (
        <Mono size="2xs" className={styles.loading}>
          {copy.loading}
        </Mono>
      ) : null}

      <div
        key={generation}
        id={containerId}
        className={styles.mount}
        aria-busy={status.kind === "submitting"}
        hidden={status.kind === "load_error"}
      />
    </div>
  );
}
