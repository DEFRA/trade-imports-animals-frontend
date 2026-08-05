/**
 * Read-side queries over evaluator output — the
 * `{ fulfilments, obligations: implicationsByObligation }` state that
 * `createObligationEvaluator({ obligations }).evaluate(fulfilments)`
 * returns.
 */

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
 * Effective mandate for an obligation at a path. Singleton implications
 * carry `status` at the top level; field / derived-leaf records live in
 * `impl.records[]`, each carrying `{ fulfilmentId, status }`. Defaults
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
    (candidate) => candidate.fulfilmentId === path
  )
  return record?.status ?? 'mandatory'
}

// Each `checkXxx` below implements one `requires` rule shape from
// `groupInvariantErrors`'s doc comment. Cardinality and per-instance rules
// return arrays; singleton rules return an error object or `null`.
// `groupInvariantErrors` composes and flattens them.

const cardinalityScopes = (group, records, state) => {
  if (!group.within) {
    return [{ records }]
  }
  const parents = state.obligations?.[group.within.id]?.records ?? []
  return parents.map(({ fulfilmentId: instanceId }) => ({
    instanceId,
    records: records.filter((record) =>
      record.fulfilmentId.startsWith(`${instanceId}/`)
    )
  }))
}

const checkMinEntries = (group, records, state) => {
  const { minEntries, errorCode } = group.requires
  if (typeof minEntries !== 'number') {
    return []
  }
  return cardinalityScopes(group, records, state)
    .filter((scope) => scope.records.length < minEntries)
    .map(({ instanceId, records: scopedRecords }) => ({
      code: 'MIN_ENTRIES',
      groupId: group.id,
      groupName: group.name,
      errorCode,
      minEntries,
      actual: scopedRecords.length,
      ...(instanceId === undefined ? {} : { instanceId })
    }))
}

const checkMaxEntries = (group, records, state) => {
  const { maxEntries, errorCode } = group.requires
  if (typeof maxEntries !== 'number') {
    return []
  }
  return cardinalityScopes(group, records, state)
    .filter((scope) => scope.records.length > maxEntries)
    .map(({ instanceId, records: scopedRecords }) => ({
      code: 'MAX_ENTRIES',
      groupId: group.id,
      groupName: group.name,
      errorCode: group.requires.maxEntriesErrorCode ?? errorCode,
      maxEntries,
      actual: scopedRecords.length,
      ...(instanceId === undefined ? {} : { instanceId })
    }))
}

const checkAnyOfIds = (group, records, state) => {
  if (!group.requires.anyOfIds) {
    return []
  }
  const errors = []
  for (const record of records) {
    const instanceId = record.fulfilmentId
    const inScopeLeafIds = group.requires.anyOfIds.filter((leafId) => {
      const impl = state.obligations?.[leafId]
      if (!impl?.inScope) {
        return false
      }
      return (impl.records ?? []).some(
        (candidate) => candidate.fulfilmentId === instanceId
      )
    })
    if (inScopeLeafIds.length === 0) {
      continue
    }
    const anyFilled = inScopeLeafIds.some((leafId) => {
      const stored = state.fulfilments?.[leafId]?.[instanceId]
      return !isBlankValue(stored)
    })
    if (!anyFilled) {
      errors.push({
        code: group.requires.errorCode,
        groupId: group.id,
        groupName: group.name,
        instanceId
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
    const parentId = parentRec.fulfilmentId
    const expected = state.fulfilments?.[fieldId]?.[parentId]
    if (isBlankValue(expected)) {
      continue
    }
    const actual = records.filter((record) =>
      record.fulfilmentId.startsWith(`${parentId}/`)
    ).length
    if (actual !== expected) {
      errors.push({
        code: countErrorCode,
        groupId: group.id,
        groupName: group.name,
        instanceId: parentId,
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
 *   - `minEntries` — collection floor. ONE `MIN_ENTRIES` error when a
 *     top-level collection is below it, or one per immediate parent
 *     instance whose nested collection is below it.
 *   - `maxEntries` — collection cap. ONE `MAX_ENTRIES` error when a
 *     top-level collection exceeds it, or one per immediate parent
 *     instance whose nested collection exceeds it.
 *   - `anyOfIds` — per-instance rule. One error per in-scope instance
 *     where NONE of the required leaves has a non-blank fulfilment;
 *     vacuously satisfied when no leaf is in scope for the instance.
 *   - `allOrNothingOfIds` — field-block rule over scalar obligations,
 *     keyed directly by obligation id in `state.fulfilments`. ONE
 *     error `{ code, groupId, groupName, missingIds }` when
 *     0 < filledCount < total; none when all-blank or all-filled.
 *   - `recordCountEquals` — `{ fieldId, errorCode }`. One error per
 *     in-scope parent (`group.within`) instance whose count of records
 *     under `parentId/` differs from the non-blank expected count in
 *     `state.fulfilments[fieldId][parentId]`; blank expected counts
 *     are skipped (the field's own mandatory rule catches those).
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
    ...checkMinEntries(group, records, state),
    ...checkMaxEntries(group, records, state),
    ...checkAnyOfIds(group, records, state),
    checkAllOrNothingOfIds(group, state),
    ...checkRecordCountEquals(group, records, state)
  ].filter(Boolean)
}
