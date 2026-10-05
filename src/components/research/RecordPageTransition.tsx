import { ViewTransition, type ReactNode } from "react";

import { RECORD_NAVIGATION } from "./recordTransition";

import "./recordTransition.css";

/**
 * THE PAGES AROUND A RECORD, while it is carried from the compendium to its
 * own page (`recordTransition.ts`): the index steps back, the record's body
 * unfolds down from its head. Only for a navigation typed `vt-record`; every
 * other navigation, and the back button, is untouched.
 */
export function RecordPageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ [RECORD_NAVIGATION]: "vt-record-in", default: "none" }}
      exit={{ [RECORD_NAVIGATION]: "vt-record-out", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
