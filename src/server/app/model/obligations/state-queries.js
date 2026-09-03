/**
 * Read-side queries over evaluator output — the
 * `{ fulfilments, obligations: implicationsByObligation }` state that
 * `createObligationEvaluator({ obligations }).evaluate(fulfilments)`
 * returns.
 */

import { INDEX_DELIMITER } from './index-delimiter.js'
import { isBlankValue } from './is-blank-value.js'

export const STATUSES = {
  NOT_APPLICABLE: 'not-applicable',
  NOT_STARTED: 'not-started',
  OPTIONAL: 'optional',
  IN_PROGRESS: 'in-progress',
  FULFILLED: 'fulfilled',
  SUBMITTED: 'submitted'
}

/**
 * True iff the stored value at `state.fulfilments[obligation.id]?.[fulfilmentIndex]`
 * is non-blank. Deliberately does not check scope or mandate — those stay
 * separate concerns so the bridge's three-check pattern (in-scope → mandate →
 * fulfilled) composes cleanly. Returns false when the obligation has no
 * storage entry or when the entry itself is not a records map.
 */
export function leafSatisfied(obligation, fulfilmentIndex, state) {
  const fulfilment = state.fulfilments?.[obligation.id]
  if (
    fulfilment === undefined ||
    fulfilment === null ||
    typeof fulfilment !== 'object' ||
    Array.isArray(fulfilment)
  ) {
    return false
  }
  return !isBlankValue(fulfilment[fulfilmentIndex])
}

/**
 * Effective mandate for an obligation at a fulfilmentIndex. Status lives on
 * the implication after Phase 2.1 — constructors stamp `obligation.status`
 * onto the implication, or the applicabilityDecision propagates its own
 * (applyTo helpers such as `equalsGate` / `branchedGate` can return per-branch
 * status for a scalar obligation, e.g. `regionCode` flipping mandatory ↔
 * optional). `effectiveStatus` reads whichever the implication carries.
 * Returns `undefined` when the obligation has no implication.
 */
export function effectiveStatus(obligation, _path, state) {
  const implication = state.obligations?.[obligation.id]
  if (!implication) {
    return undefined
  }
  return implication.status ?? 'mandatory'
}

// Each `checkXxx` below implements one `requires` rule shape from
// `groupInvariantErrors`'s doc comment. Every checker returns an
// `error[]` — empty when the rule doesn't apply or is satisfied.
// Collection-level checkers can only ever return 0 or 1 error; the
// list-typed return keeps the composition in `groupInvariantErrors`
// uniform.

const checkMinEntries = (group, fulfilmentIndexes) => {
  const { minEntries, errorCode } = group.requires
  if (
    typeof minEntries !== 'number' ||
    fulfilmentIndexes.length >= minEntries
  ) {
    return []
  }
  return [
    {
      code: 'MIN_ENTRIES',
      groupId: group.id,
      groupName: group.name,
      errorCode,
      minEntries,
      actual: fulfilmentIndexes.length
    }
  ]
}

const checkMaxEntries = (group, fulfilmentIndexes) => {
  const { maxEntries, errorCode } = group.requires
  if (
    typeof maxEntries !== 'number' ||
    fulfilmentIndexes.length <= maxEntries
  ) {
    return []
  }
  return [
    {
      code: 'MAX_ENTRIES',
      groupId: group.id,
      groupName: group.name,
      errorCode: group.requires.maxEntriesErrorCode ?? errorCode,
      maxEntries,
      actual: fulfilmentIndexes.length
    }
  ]
}

const checkAllOrNothingOfIds = (group, state) => {
  if (!group.requires.allOrNothingOfIds) {
    return []
  }
  const memberIds = group.requires.allOrNothingOfIds
  const filledIds = memberIds.filter(
    (id) => !isBlankValue(state.fulfilments?.[id])
  )
  if (filledIds.length === 0 || filledIds.length >= memberIds.length) {
    return []
  }
  const missingIds = memberIds.filter((id) =>
    isBlankValue(state.fulfilments?.[id])
  )
  return [
    {
      code: group.requires.errorCode,
      groupId: group.id,
      groupName: group.name,
      missingIds
    }
  ]
}

const checkAnyOfIds = (group, fulfilmentIndexes, state) => {
  if (!group.requires.anyOfIds) {
    return []
  }
  const errors = []
  for (const fulfilmentIndex of fulfilmentIndexes) {
    const inScopeLeafIds = group.requires.anyOfIds.filter((leafId) => {
      const implication = state.obligations?.[leafId]
      if (!implication?.inScope) {
        return false
      }
      return (implication.fulfilmentIndexes ?? []).includes(fulfilmentIndex)
    })
    if (inScopeLeafIds.length === 0) {
      continue
    }
    const anyFilled = inScopeLeafIds.some((leafId) => {
      const fulfilment = state.fulfilments?.[leafId]?.[fulfilmentIndex]
      return !isBlankValue(fulfilment)
    })
    if (!anyFilled) {
      errors.push({
        code: group.requires.errorCode,
        groupId: group.id,
        groupName: group.name,
        fulfilmentIndex
      })
    }
  }
  return errors
}

const checkRecordCountEquals = (group, fulfilmentIndexes, state) => {
  if (!group.requires.recordCountEquals || !group.within) {
    return []
  }
  const { fieldId, errorCode: countErrorCode } =
    group.requires.recordCountEquals
  const parentImplication = state.obligations?.[group.within.id]
  const parentFulfilmentIndexes = parentImplication?.fulfilmentIndexes ?? []
  const errors = []
  for (const parentFulfilmentIndex of parentFulfilmentIndexes) {
    const expected = state.fulfilments?.[fieldId]?.[parentFulfilmentIndex]
    if (isBlankValue(expected)) {
      continue
    }
    const actual = fulfilmentIndexes.filter((fulfilmentIndex) =>
      fulfilmentIndex.startsWith(`${parentFulfilmentIndex}${INDEX_DELIMITER}`)
    ).length
    if (actual !== expected) {
      errors.push({
        code: countErrorCode,
        groupId: group.id,
        groupName: group.name,
        fulfilmentIndex: parentFulfilmentIndex,
        expected,
        actual
      })
    }
  }
  return errors
}

/**
 * groupInvariantErrors(group, state)
 *   → [{ code, groupId, groupName, ... }]
 *
 * One entry per unsatisfied invariant on the group. A group may carry
 * any combination of five `requires` rule shapes. The output is ordered
 * collection-level first, then per-instance:
 *
 * Collection-level (at most one error each):
 *   - `minEntries` — collection floor. ONE `MIN_ENTRIES` error when
 *     `fulfilmentIndexes.length` is below it.
 *   - `maxEntries` — collection cap. ONE `MAX_ENTRIES` error when
 *     `fulfilmentIndexes.length` exceeds it.
 *   - `allOrNothingOfIds` — field-block rule over unindexed obligations,
 *     keyed directly by obligation id in `state.fulfilments`. ONE
 *     error `{ code, groupId, groupName, missingIds }` when
 *     0 < filledCount < total; none when all-blank or all-filled.
 *
 * Per-instance (one error per offending fulfilmentIndex):
 *   - `anyOfIds` — per-instance rule. One error per in-scope instance
 *     where NONE of the required leaves has a non-blank fulfilment;
 *     vacuously satisfied when no leaf is in scope for the instance.
 *   - `recordCountEquals` — `{ fieldId, errorCode }`. One error per
 *     in-scope parent (`group.within`) instance whose count of
 *     fulfilmentIndexes under `parentFulfilmentIndex/` differs from the
 *     non-blank expected count in
 *     `state.fulfilments[fieldId][parentFulfilmentIndex]`; blank expected
 *     counts are skipped (the field's own mandatory rule catches those).
 */
export function groupInvariantErrors(group, state) {
  if (!group?.requires) {
    return []
  }
  const groupImplication = state.obligations?.[group.id]
  if (!groupImplication?.inScope) {
    return []
  }
  const fulfilmentIndexes = groupImplication.fulfilmentIndexes ?? []
  return [
    // Collection-level rules (fire once for the whole group).
    ...checkMinEntries(group, fulfilmentIndexes),
    ...checkMaxEntries(group, fulfilmentIndexes),
    ...checkAllOrNothingOfIds(group, state),
    // Per-instance rules (fire per fulfilmentIndex).
    ...checkAnyOfIds(group, fulfilmentIndexes, state),
    ...checkRecordCountEquals(group, fulfilmentIndexes, state)
  ]
}
