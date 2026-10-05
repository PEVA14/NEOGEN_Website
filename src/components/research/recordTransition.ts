/**
 * ONE RECORD, MANY MAGNIFICATIONS — the names a record carries between its
 * levels: a line in the compendium opened in place, then its own page.
 *
 * The open row's name and frame and the record page's title and document are
 * named PAIRS (`<ViewTransition share>`), so following "Ver registro
 * completo" carries the title onto the page and opens the frame out to the
 * document: the same record, closer. Only the open row carries the names (a
 * name must be unique on a page when a transition starts), and only a
 * navigation typed `vt-record` animates the pages around them; the browser's
 * back button carries no type and simply returns, the record still open
 * (`?ficha=`).
 */
export const RECORD_NAVIGATION = "vt-record";

export function recordNames(slug: string) {
  return {
    title: `vt-record-title-${slug}`,
    frame: `vt-record-frame-${slug}`,
  };
}
