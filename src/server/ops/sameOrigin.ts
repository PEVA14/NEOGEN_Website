/**
 * IS THIS FORM POST FROM THE CONSOLE ITSELF? — for the console's route
 * handlers (server actions carry Next's own check).
 *
 * `/ops` answers with `Referrer-Policy: no-referrer`, and under that policy a
 * browser sends `Origin: null` on a form POST — even from the same page. So
 * `Origin` alone refuses the console's own forms. The browser's
 * `Sec-Fetch-Site`, which a page cannot set, says where the request came
 * from: "same-origin" is accepted. Without it, a real `Origin` must match.
 * Anything else — cross-site, same-site, `null` without proof, no headers at
 * all — is refused.
 */
export function sameOriginPost(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin !== "null" && origin === new URL(request.url).origin;
}
