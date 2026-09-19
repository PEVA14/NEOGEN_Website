import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

/**
 * THE OLD DRAFT-LEVEL PAYMENT STEP — now a signpost.
 *
 * Payment belongs to an ORDER (`/checkout/pago/[id]`), created at review.
 * A bookmark or a stale link to this path goes to review, which either lets
 * the customer register the order or, if one exists, sends them on to it.
 */
export const dynamic = "force-dynamic";

export default async function PaymentStepRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(localizePath(routes.checkoutStep("review"), isLocale(locale) ? locale : "es"));
}
