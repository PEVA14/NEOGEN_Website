import { ATLAS_POLICY } from "./policy";
import { answerSummary, allQuestions, questionVisible } from "./questionnaire";

import type { AtlasAnswers, AtlasQuestionnaireView } from "./questionnaire";
import type { AtlasResultLedgerEntry } from "./result";

/**
 * THE LEDGER — every question, what the visitor answered, and what Atlas was
 * allowed to do with it.
 *
 * Built from three inputs and nothing else: the resolved questionnaire (labels
 * and options), the answers, and `ATLAS_POLICY` (role → permitted uses). So a
 * new question appears in the ledger the moment it appears in the
 * questionnaire, with no entry to register and no result-page branch to add,
 * and a question with no role shows honestly as collected but unused.
 *
 * WITHHOLDINGS are shown, never hidden: the name never reaches the model, and
 * a note carrying health detail is discarded whole (the policy's decision,
 * passed in as `noteDiscarded`).
 */
export interface AtlasLedgerCopy {
  yes: string;
  no: string;
  /** Stands in for a note's text, which is never echoed back. */
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
    /* A long note has no echo, so its own presence is the answer. */
    const answered =
      question.kind === "long-text"
        ? typeof raw === "string" && raw.trim().length > 0
        : summary !== null;
    const withheld =
      question.role === "first-name" && answered
        ? ("name-private" as const)
        : question.role === "free-note" && noteDiscarded
          ? ("health-note" as const)
          : null;

    entries.push({
      question: question.id,
      label: question.shortLabel,
      answer: answered ? (summary ?? copy.noteGiven) : null,
      answered,
      uses:
        answered && question.role && withheld !== "health-note" ? ATLAS_POLICY[question.role] : [],
      withheld,
    });
  }

  return entries;
}

/** The answers echoed as chips above the result. Questions opt in with `recap`. */
export function atlasRecap(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  copy: AtlasLedgerCopy,
): readonly { question: string; label: string; answer: string }[] {
  return allQuestions(view)
    .filter((question) => question.recap && questionVisible(question, answers))
    .map((question) => ({
      question: question.id,
      label: question.shortLabel,
      answer: answerSummary(question, answers[question.id], copy) ?? "",
    }))
    .filter((entry) => entry.answer !== "");
}
