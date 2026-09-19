"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Mono } from "@/components/typography";

/**
 * KEEP AN IN-FLIGHT PAYMENT'S PAGE CURRENT.
 *
 * Rendered only while an order is `payment_processing` or `pending_payment`.
 * It asks the SERVER to render the page again every few seconds; the server
 * re-reads the order and, if needed, asks the provider (`refreshPayment`). The
 * browser never decides the state — it only asks to be shown it again.
 *
 * Bounded: after a few minutes it stops and says so, rather than polling a
 * payment that is waiting on a bank transfer for hours.
 */
const EVERY_MS = 4_000;
const FOR_MS = 3 * 60_000;

export function PaymentWatcher({ watching, stopped }: { watching: string; stopped: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > FOR_MS) {
        window.clearInterval(timer);
        setDone(true);
        return;
      }
      router.refresh();
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <Mono as="p" size="2xs" role="status" aria-live="polite">
      {done ? stopped : watching}
    </Mono>
  );
}
