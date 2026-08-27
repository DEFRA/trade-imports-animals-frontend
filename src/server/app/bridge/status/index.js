/**
 * Project the obligation implications into the 5-way task/section status.
 *
 * `statusOf(parts, answers, inScope, evaluation)` is the sole runtime source
 * of the 5-way task/section status at the row/section callers (`flow/task-rows.js`
 * `rowStatus`, `flow/section-status.js` `sectionStatus`;
 * `readyForCheckYourAnswers` rolls up through the former).
 *
 * The OUTER classification branches on NA / OPTIONAL / NOT_STARTED /
 * IN_PROGRESS / FULFILLED via `partRequired` / `partStarted` — so the
 * presentation-facing edge cases (empty optional collection -> OPTIONAL,
 * partial optional -> IN_PROGRESS, empty required collection -> NOT_STARTED)
 * hold. Row/section STRUCTURE (which parts, facet membership, the collection
 * floor, the any-of rule) is sourced from the manifest, projected into the
 * status object shape by `toStructural` below.
 *
 * `partSatisfied` — the completeness judgement — walks the collection tree and
 * sources three things from the evaluator state:
 *
 *   - per-record SCOPE   — a leaf is present for a record iff the implication
 *                          `records[]` carries that record's fulfilmentId
 *                          (post-purge membership).
 *   - per-record MANDATE  — `effectiveStatus(leaf, recId, state)` (mandatory /
 *                          optional per record).
 *   - FULFILMENT          — `!isBlankValue` for every part.
 *
 * The empty-collection floor is manifest-sourced (`requiredAtLeastOne`:
 * `requires.minEntries` or `requires.anyOfIds`) and stays a presentation
 * rule — the model emits nothing for a group with zero records, but an
 * empty required collection must still block FULFILLED. The per-record
 * any-of verdict is sourced from the model's `groupInvariantErrors`
 * (filtered by fulfilmentIndex), the same interpreter collection-complete
 * uses.
 */

import { partKey, partRequired, partStarted } from './classification/index.js'
import { partSatisfied } from './completeness/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from './vocabulary.js'

export {
  NA,
  NOT_STARTED,
  IN_PROGRESS,
  FULFILLED,
  OPTIONAL
} from './vocabulary.js'

// No required parts: OPTIONAL if untouched, else FULFILLED/IN_PROGRESS by
// whether every in-scope part is satisfied.
const optionalOrProgressStatus = (inScopeParts, started, answers, state) => {
  if (!started) {
    return OPTIONAL
  }
  const allSatisfied = inScopeParts.every((part) =>
    partSatisfied(part, answers, state)
  )
  return allSatisfied ? FULFILLED : IN_PROGRESS
}

// Required parts present: FULFILLED if every required part is satisfied,
// else IN_PROGRESS/NOT_STARTED by whether anything has been started.
const requiredPartsStatus = (required, started, answers, state) => {
  const requiredSatisfied = required.every((part) =>
    partSatisfied(part, answers, state)
  )
  if (requiredSatisfied) {
    return FULFILLED
  }
  return started ? IN_PROGRESS : NOT_STARTED
}

/**
 * The 5-way status for a list of parts.
 *
 * @param {Array<string|{collection:string, only?:string[], except?:string[]}>} parts - the row/section parts to roll up
 * @param {object} answers - the nested answer POJO.
 * @param {Set<string>} inScope - the pathKey scope Set.
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {string} NA / NOT_STARTED / IN_PROGRESS / FULFILLED / OPTIONAL.
 */
export const statusOf = (parts, answers, inScope, evaluation) => {
  const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
  if (inScopeParts.length === 0) {
    return NA
  }

  const required = inScopeParts.filter((part) => partRequired(part, evaluation))
  const started = inScopeParts.some((part) => partStarted(part, answers))

  return required.length === 0
    ? optionalOrProgressStatus(inScopeParts, started, answers, evaluation)
    : requiredPartsStatus(required, started, answers, evaluation)
}
