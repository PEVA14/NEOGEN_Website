import { ViewTransition, type ReactNode } from "react";

import { RECORD_NAVIGATION } from "@/components/research/recordTransition";

import "@/components/research/recordTransition.css";

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
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ [SPECIMEN_NAVIGATION]: "vt-page-in", default: "none" }}
      /* A product page's profile can also open into its full record
         (`recordTransition.ts`): the page steps back as the record arrives. */
      exit={{
        [SPECIMEN_NAVIGATION]: "vt-page-out",
        [RECORD_NAVIGATION]: "vt-record-out",
        default: "none",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
