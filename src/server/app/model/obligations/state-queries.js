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
  const stored = state.fulfilments?.[obligation.id]
  if (
    stored === undefined ||
    stored === null ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return false
  }
  return !isBlankValue(stored[fulfilmentIndex])
}

/**
 * Effective mandate for an obligation at a path. Singleton implications
 * carry `status` at the top level; field / derived-leaf records live in
 * `impl.records[]`, each carrying `{ fulfilmentIndex, status }`. Defaults
 * to 'mandatory'; undefined when the obligation has no implication.
 */
export function effectiveStatus(obligation, path, state) {
  const impl = state.obligations?.[obligation.id]
  if (!impl) {
    return undefined
  }
  if (path === null) {
    return impl.status ?? 'mandatory'
  }
  const record = (impl.records ?? []).find(
    (candidate) => candidate.fulfilmentIndex === path
  )
  return record?.status ?? 'mandatory'
}

// Each `checkXxx` below implements one `requires` rule shape from
// `groupInvariantErrors`'s doc comment. Single-error rules return the
// error object or `null`; multi-error rules (one error per instance)
// return an array. `groupInvariantErrors` composes and flattens them.

const checkMinEntries = (group, records) => {
  const { minEntries, errorCode } = group.requires
  if (typeof minEntries !== 'number' || records.length >= minEntries) {
    return null
  }
  return {
    code: 'MIN_ENTRIES',
    groupId: group.id,
    groupName: group.name,
    errorCode,
    minEntries,
    actual: records.length
  }
}

const checkMaxEntries = (group, records) => {
  const { maxEntries, errorCode } = group.requires
  if (typeof maxEntries !== 'number' || records.length <= maxEntries) {
    return null
  }
  return {
    code: 'MAX_ENTRIES',
    groupId: group.id,
    groupName: group.name,
    errorCode: group.requires.maxEntriesErrorCode ?? errorCode,
    maxEntries,
    actual: records.length
  }
}

const checkAnyOfIds = (group, records, state) => {
  if (!group.requires.anyOfIds) {
    return []
  }
  const errors = []
  for (const record of records) {
    const fulfilmentIndex = record.fulfilmentIndex
    const inScopeLeafIds = group.requires.anyOfIds.filter((leafId) => {
      const impl = state.obligations?.[leafId]
      if (!impl?.inScope) {
        return false
      }
      return (impl.records ?? []).some(
        (candidate) => candidate.fulfilmentIndex === fulfilmentIndex
      )
    })
    if (inScopeLeafIds.length === 0) {
      continue
    }
    const anyFilled = inScopeLeafIds.some((leafId) => {
      const stored = state.fulfilments?.[leafId]?.[fulfilmentIndex]
      return !isBlankValue(stored)
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

const checkAllOrNothingOfIds = (group, state) => {
  if (!group.requires.allOrNothingOfIds) {
    return null
  }
  const memberIds = group.requires.allOrNothingOfIds
  const filledIds = memberIds.filter(
    (id) => !isBlankValue(state.fulfilments?.[id])
  )
  if (filledIds.length === 0 || filledIds.length >= memberIds.length) {
    return null
  }
  const missingIds = memberIds.filter((id) =>
    isBlankValue(state.fulfilments?.[id])
  )
  return {
    code: group.requires.errorCode,
    groupId: group.id,
    groupName: group.name,
    missingIds
  }
}

const checkRecordCountEquals = (group, records, state) => {
  if (!group.requires.recordCountEquals || !group.within) {
    return []
  }
  const { fieldId, errorCode: countErrorCode } =
    group.requires.recordCountEquals
  const parentImpl = state.obligations?.[group.within.id]
  const parentRecords = parentImpl?.records ?? []
  const errors = []
  for (const parentRec of parentRecords) {
    const parentFulfilmentIndex = parentRec.fulfilmentIndex
    const expected = state.fulfilments?.[fieldId]?.[parentFulfilmentIndex]
    if (isBlankValue(expected)) {
      continue
    }
    const actual = records.filter((record) =>
      record.fulfilmentIndex.startsWith(
        `${parentFulfilmentIndex}${INDEX_DELIMITER}`
      )
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
 * any combination of five `requires` rule shapes:
 *
 *   - `minEntries` — collection floor. ONE `MIN_ENTRIES` error when
 *     `records.length` is below it.
 *   - `maxEntries` — collection cap. ONE `MAX_ENTRIES` error when
 *     `records.length` exceeds it.
 *   - `anyOfIds` — per-instance rule. One error per in-scope instance
 *     where NONE of the required leaves has a non-blank fulfilment;
 *     vacuously satisfied when no leaf is in scope for the instance.
 *   - `allOrNothingOfIds` — field-block rule over scalar obligations,
 *     keyed directly by obligation id in `state.fulfilments`. ONE
 *     error `{ code, groupId, groupName, missingIds }` when
 *     0 < filledCount < total; none when all-blank or all-filled.
 *   - `recordCountEquals` — `{ fieldId, errorCode }`. One error per
 *     in-scope parent (`group.within`) instance whose count of records
 *     under `parentFulfilmentIndex/` differs from the non-blank expected
 *     count in `state.fulfilments[fieldId][parentFulfilmentIndex]`;
 *     blank expected counts are skipped (the field's own mandatory rule
 *     catches those).
 */
export function groupInvariantErrors(group, state) {
  if (!group?.requires) {
    return []
  }
  const groupImpl = state.obligations?.[group.id]
  if (!groupImpl?.inScope) {
    return []
  }
  const records = groupImpl.records ?? []
  return [
    checkMinEntries(group, records),
    checkMaxEntries(group, records),
    ...checkAnyOfIds(group, records, state),
    checkAllOrNothingOfIds(group, state),
    ...checkRecordCountEquals(group, records, state)
  ].filter(Boolean)
}
