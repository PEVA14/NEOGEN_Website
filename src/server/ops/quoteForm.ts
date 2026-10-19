import { MX_STATES } from "@/domain/checkout/types";
import { COMPLETION_BUDGET_MS } from "@/shipping/adapters/skydropx/quoteCheck";

/**
 * THE QUOTE CHECK'S FORM (`/ops/diagnostico/skydropx/cotizacion`). Its
 * script locks the form on the first submit: the button is disabled, says
 * "Cotizando…", and any later submit is cancelled in the browser. The
 * one-time token is the server's half of the same guard.
 */
const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The lock, alone — the page inlines it, the tests run it. */
export const QUOTE_FORM_LOCK = `(function () {
  var form = document.getElementById("quote");
  var button = document.getElementById("go");
  var state = document.getElementById("state");
  var sent = false;
  form.addEventListener("submit", function (event) {
    if (sent) { event.preventDefault(); return; }
    sent = true;
    button.disabled = true;
    button.textContent = "Cotizando…";
    form.setAttribute("aria-busy", "true");
    state.textContent = "Pedida. No vuelvas a enviar; para otra cotización, abre la página de nuevo.";
  });
})();`;

export function quoteFormPage(onceToken: string): string {
  const options = MX_STATES.map(
    (s) => `<option value="${escape(s.code)}">${escape(s.name)}</option>`,
  ).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización Skydropx</title></head><body>
<h1>Cotización Skydropx (una)</h1>
<p>Pide UNA cotización con el código del checkout. No crea envíos ni guías.</p>
<form method="post" id="quote">
<input type="hidden" name="once" value="${escape(onceToken)}">
<p><label>Código postal <input name="postalCode" required pattern="[0-9]{5}" inputmode="numeric" autocomplete="off"></label></p>
<p><label>Estado <select name="state" required><option value="">—</option>${options}</select></label></p>
<p><label>Ciudad o municipio <input name="city" required maxlength="60" autocomplete="off"></label></p>
<p><label>Colonia <input name="colonia" required maxlength="60" autocomplete="off"></label></p>
<fieldset><legend>Espera</legend>
<p><label><input type="radio" name="mode" value="checkout" checked> Como el checkout (hasta completar, o 4 s sin cambios en las tarifas elegibles; máx. 20 s)</label></p>
<p><label><input type="radio" name="mode" value="complete"> Hasta completar (máx. ${COMPLETION_BUDGET_MS / 1000} s; mide cuánto tarda)</label></p>
</fieldset>
<p><button type="submit" id="go">Cotizar una vez</button> <span id="state" role="status" aria-live="polite"></span></p>
</form>
<script>
${QUOTE_FORM_LOCK}
</script></body></html>`;
}
