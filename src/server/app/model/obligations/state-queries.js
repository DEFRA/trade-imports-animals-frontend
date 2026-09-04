/**
 * Read-side queries over evaluator output — the
 * `{ fulfilments, obligations: implicationsByObligation }` state that
 * `createObligationEvaluator(...).evaluate(fulfilments)` returns.
 */

import { INDEX_DELIMITER } from './index-delimiter.js'
import { isBlankValue } from './is-blank-value.js'

// Non-blank stored value at `state.fulfilments[obligation.id][fulfilmentIndex]`.
// Deliberately no scope or mandate check — those are separate concerns so the
// bridge's three-check pattern (in-scope → mandate → fulfilled) composes.
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

// Effective mandate. Reads `implication.status`, which either carries the
// obligation's intrinsic status or a per-branch override from an applyTo
// helper (e.g. `equalsGate` flipping `regionCode` mandatory ↔ optional).
// Falls back to `'mandatory'` when the implication carries no status;
// `undefined` when the obligation has no implication at all.
export function effectiveStatus(obligation, _path, state) {
  const implication = state.obligations?.[obligation.id]
  if (!implication) {
    return undefined
  }
  return implication.status ?? 'mandatory'
}

// Every `checkXxx` below returns `error[]` — empty when the rule doesn't
// apply or is satisfied. Collection-level checkers can only ever return 0
// or 1 error; list-typed return keeps `groupInvariantErrors`'s composition
// uniform (spread everything, no null filter).

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

const checkFulfilmentIndexCountEquals = (group, fulfilmentIndexes, state) => {
  if (!group.requires.fulfilmentIndexCountEquals || !group.within) {
    return []
  }
  const { fieldId, errorCode: countErrorCode } =
    group.requires.fulfilmentIndexCountEquals
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
 * One entry per unsatisfied invariant on the group. Output is ordered
 * collection-level first, then per-instance. A group may carry any
 * combination of the five `requires` rules:
 *
 * Collection-level (at most one error each):
 *   - `minEntries` — collection floor.
 *   - `maxEntries` — collection cap.
 *   - `allOrNothingOfIds` — field-block over unindexed obligations
 *     (keyed by obligation id in `state.fulfilments`); fires when
 *     0 < filledCount < total.
 *
 * Per-instance (one error per offending fulfilmentIndex):
 *   - `anyOfIds` — one error per in-scope instance where none of the
 *     required leaves has a non-blank fulfilment.
 *   - `fulfilmentIndexCountEquals: { fieldId, errorCode }` — one error
 *     per in-scope parent (`group.within`) instance whose count of
 *     child fulfilmentIndexes differs from the non-blank expected
 *     count at `state.fulfilments[fieldId][parentFulfilmentIndex]`.
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
    ...checkMinEntries(group, fulfilmentIndexes),
    ...checkMaxEntries(group, fulfilmentIndexes),
    ...checkAllOrNothingOfIds(group, state),
    ...checkAnyOfIds(group, fulfilmentIndexes, state),
    ...checkFulfilmentIndexCountEquals(group, fulfilmentIndexes, state)
  ]
}
