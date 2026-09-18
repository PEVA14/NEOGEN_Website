import { fieldOf, specOf } from "./fields";
import { answerSummary, allQuestions, questionVisible } from "./questionnaire";

import type { AtlasAnswers, AtlasQuestionnaireView } from "./questionnaire";
import type { AtlasResultLedgerEntry, AtlasResultRecapEntry } from "./result";

/**
 * THE LEDGER — every question, what the visitor answered, and what Atlas was
 * allowed to do with it.
 *
 * Built IN THE BROWSER, from the resolved questionnaire, the visitor's own
 * answers and the field table (`fields.ts`). It has to be: withheld answers
 * never leave the device, so only the device can show them back. The server
 * contributes one per-request fact, whether the note was discarded.
 *
 * A new question appears here the moment it appears in the questionnaire. If
 * `fields.ts` does not bind it, it shows honestly as withheld (`unbound`).
 */
export interface AtlasLedgerCopy {
  yes: string;
  no: string;
  /** Stands in for free text, which is never echoed back. */
  noteGiven: string;
}

export function buildAtlasLedger(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  copy: AtlasLedgerCopy,
  noteDiscarded: boolean,
): readonly AtlasResultLedgerEntry[] {
  const entries: AtlasResultLedgerEntry[] = [];

  for (const question of allQuestions(view)) {
    if (!questionVisible(question, answers)) continue;
    const raw = answers[question.id];
    const summary = answerSummary(question, raw, copy);
    /* Free text has no echo, so its own presence is the answer. */
    const answered =
      question.kind === "long-text"
        ? typeof raw === "string" && raw.trim().length > 0
        : summary !== null;
    const spec = specOf(question.id);
    const discarded = answered && noteDiscarded && fieldOf(question.id) === "context-note";
    const withheld = discarded ? "health-note" : spec.withheld;

    entries.push({
      question: question.id,
      field: fieldOf(question.id),
      label: question.shortLabel,
      answer: answered ? (summary ?? copy.noteGiven) : null,
      answered,
      uses: answered && !discarded ? spec.uses : [],
      withheld: answered ? withheld : null,
    });
  }

  return entries;
}

/**
 * The answers echoed as chips above the result: questions the content marks
 * `recap` AND whose field permits it. A withheld health answer is never
 * echoed, whatever the content says.
 */
export function atlasRecap(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  copy: AtlasLedgerCopy,
): readonly AtlasResultRecapEntry[] {
  return allQuestions(view)
    .filter(
      (question) =>
        question.recap &&
        specOf(question.id).uses.includes("recap") &&
        questionVisible(question, answers),
    )
    .map((question) => ({
      question: question.id,
      label: question.shortLabel,
      answer: answerSummary(question, answers[question.id], copy) ?? "",
    }))
    .filter((entry) => entry.answer !== "");
}
