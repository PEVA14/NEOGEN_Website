import { redirect } from "next/navigation";

import { requireOperator } from "@/server/ops/auth";

export const dynamic = "force-dynamic";

/** `/ops` → the order list, for a signed-in operator; a 404 when the console is off. */
export default async function OpsIndex() {
  await requireOperator();
  redirect("/ops/pedidos");
}
