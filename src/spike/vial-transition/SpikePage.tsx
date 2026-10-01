import { ViewTransition, type ReactNode } from "react";

import { VIAL_TRANSITION } from "./flag";
import { VtDebug } from "./VtDebug";

/** The transition type a card's link carries (`<Link transitionTypes>`). */
export const SPECIMEN_NAVIGATION = "vt-specimen";

/**
 * THE REST OF THE PAGE, while the specimen travels.
 *
 * React deliberately switches the browser's whole-page cross-fade off (it sets
 * `view-transition-name: none` on <html> and collapses the root group), so a
 * page that should give way — or settle in — has to say so itself. This wraps
 * a page's content in a boundary that animates ONLY for a card-initiated
 * navigation: every other navigation on the site is untouched (`default:
 * "none"`), and so is the browser's back button, which carries no type.
 *
 * With the spike off it renders its children and nothing else.
 */
export function SpikePage({ children }: { children: ReactNode }) {
  if (!VIAL_TRANSITION) return children;
  return (
    <>
      <ViewTransition
        enter={{ [SPECIMEN_NAVIGATION]: "vt-page-in", default: "none" }}
        exit={{ [SPECIMEN_NAVIGATION]: "vt-page-out", default: "none" }}
        default="none"
      >
        {children}
      </ViewTransition>
      {/* `?vtdebug` only: an on-screen log for phones. */}
      <VtDebug />
    </>
  );
}
