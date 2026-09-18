import { fieldOf, fieldSpecOf } from "./fields";
import { SERVER_PERMISSIONS, permits } from "./policy";
import { isTransmitted } from "./privacy";
import { answerSummary, allQuestions, questionVisible } from "./questionnaire";

import type { AtlasAdvisorPolicy } from "./policy";
import type { AtlasAnswers, AtlasQuestionnaireView } from "./questionnaire";
import type { AtlasResultLedgerEntry, AtlasResultRecapEntry } from "./result";

/**
 * THE LEDGER — every question, what the visitor answered, whether it left the
 * device, and what the active advisor policy did with it.
 *
 * Built IN THE BROWSER, where every answer is: the privacy policy keeps some
 * of them there. Three independent facts per row — the field's declared
 * sensitivity (`fields.ts`), transmission (`privacy.ts`) and the policy's
 * permissions (`policy.ts`) — so a reviewer can see each decision separately.
 * The server contributes one per-request fact, whether the note was discarded.
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
  policy: Pick<AtlasAdvisorPolicy, "permissions">,
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
    const field = fieldOf(question.id);
    const spec = fieldSpecOf(question.id);
    const granted = field ? (policy.permissions[field] ?? []) : [];
    const discarded = answered && noteDiscarded && field === "context-note";
    const usedOnServer =
      field !== null && SERVER_PERMISSIONS.some((p) => permits(policy, field, p));

    entries.push({
      question: question.id,
      field,
      category: spec.category,
      sensitivity: spec.sensitivity,
      label: question.shortLabel,
      answer: answered ? (summary ?? copy.noteGiven) : null,
      answered,
      transmitted: isTransmitted(question.id),
      permissions: answered && !discarded ? granted : [],
      withheld: !answered
        ? null
        : discarded
          ? "health-note"
          : field === "name"
            ? "name-private"
            : usedOnServer
              ? null
              : spec.category,
    });
  }

  return entries;
}

/**
 * The answers echoed as chips above the result: questions the content marks
 * `recap` AND whose field the active policy permits to recap. A content flag
 * cannot echo an answer the policy does not allow shown back.
 */
export function atlasRecap(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  copy: AtlasLedgerCopy,
  policy: Pick<AtlasAdvisorPolicy, "permissions">,
): readonly AtlasResultRecapEntry[] {
  return allQuestions(view)
    .filter((question) => {
      const field = fieldOf(question.id);
      return (
        question.recap &&
        field !== null &&
        permits(policy, field, "recap") &&
        questionVisible(question, answers)
      );
    })
    .map((question) => ({
      question: question.id,
      label: question.shortLabel,
      answer: answerSummary(question, answers[question.id], copy) ?? "",
    }))
    .filter((entry) => entry.answer !== "");
}
