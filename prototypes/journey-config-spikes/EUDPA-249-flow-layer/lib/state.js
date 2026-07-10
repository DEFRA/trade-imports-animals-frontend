/**
 * State — thin wrappers over @hapi/yar session storage.
 *
 * One yar key stores the whole fulfilments map for the demo:
 *   `${SESSION_KEY}` = { [obligationId]: value | { [path]: value } }
 *
 * All reads/writes go through this module; the controller never touches
 * `request.yar` directly.
 */

import { evaluateState } from '../contract.js'

export const SESSION_KEY = 'prototype:eudpa-249:fulfilments'
export const NEXT_LINE_ID_KEY = 'prototype:eudpa-249:next-line-id'
export const NEXT_UNIT_ID_BY_LINE_KEY =
  'prototype:eudpa-249:next-unit-id-by-line'

// Composite-key delimiter — matches obligations/evaluator.js PATH_DELIMITER
// so a leaf on unitRecord is keyed by `${lineId}${DELIM}${unitId}`.
const PATH_DELIMITER = '/'

// ---------------------------------------------------------------------------
// Fulfilments — the primary state
// ---------------------------------------------------------------------------

export function readFulfilments(request) {
  return request.yar?.get(SESSION_KEY) ?? {}
}

export function writeFulfilments(request, fulfilments) {
  request.yar?.set(SESSION_KEY, fulfilments)
}

/**
 * readState — the shape controllers actually want:
 *
 *   { fulfilments, obligations }
 *
 * where `obligations` is the impl map from ObligationEvaluator. Wraps
 * `evaluateState` so a controller only makes one call.
 */
export function readState(request) {
  return evaluateState(readFulfilments(request))
}

/**
 * writeAnswer — apply one page's coerced values to the fulfilments
 * map. Values come from contract.validatePagePayload's `values`.
 */
export function writeAnswer(request, values) {
  const fulfilments = { ...readFulfilments(request) }
  for (const { obligation, path, value } of Object.values(values)) {
    if (value === undefined) {
      if (path === null) {
        delete fulfilments[obligation.id]
      } else {
        const stored = fulfilments[obligation.id]
        if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
          delete stored[path]
        }
      }
      continue
    }
    if (path === null) {
      fulfilments[obligation.id] = value
    } else {
      const stored =
        typeof fulfilments[obligation.id] === 'object' &&
        !Array.isArray(fulfilments[obligation.id])
          ? { ...fulfilments[obligation.id] }
          : {}
      stored[path] = value
      fulfilments[obligation.id] = stored
    }
  }
  writeFulfilments(request, fulfilments)
  return fulfilments
}

// ---------------------------------------------------------------------------
// Commodity lines — bespoke helpers used by the line controllers.
// ---------------------------------------------------------------------------

/** Session-scoped counter for the next line id. Kept in its own yar
 *  key rather than derived from current fulfilments so a Delete
 *  cannot recycle the id — silent rehydration of any per-line state
 *  whose obligation is missing from LINE_LEAF_OBLIGATIONS would
 *  otherwise be possible. */
function readNextLineId(request) {
  return request.yar?.get(NEXT_LINE_ID_KEY) ?? 1
}

function writeNextLineId(request, n) {
  request.yar?.set(NEXT_LINE_ID_KEY, n)
}

export function addCommodityLine(
  request,
  commodityLineObligation,
  seedObligation
) {
  const fulfilments = { ...readFulfilments(request) }
  const n = readNextLineId(request)
  const id = `line${n}`
  // Seed a placeholder record for the line so the ObligationEvaluator
  // recognises the line as existing. The obligations model tracks a
  // group instance by its descendants' composite-key prefixes; we seed
  // a placeholder on the seedObligation (commodityCode) with an empty
  // string value. Real value comes from the per-line-detail pages.
  const seed = {
    ...(fulfilments[seedObligation.id] ?? {}),
    [id]: ''
  }
  fulfilments[seedObligation.id] = seed
  writeFulfilments(request, fulfilments)
  writeNextLineId(request, n + 1)
  return id
}

export function deleteCommodityLine(request, lineId, lineLeafObligations) {
  const fulfilments = { ...readFulfilments(request) }
  for (const obligation of lineLeafObligations) {
    const stored = fulfilments[obligation.id]
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      const next = { ...stored }
      delete next[lineId]
      if (Object.keys(next).length === 0) {
        delete fulfilments[obligation.id]
      } else {
        fulfilments[obligation.id] = next
      }
    }
  }
  // Cascade: purge every unit-scoped fulfilment whose composite key
  // starts with `${lineId}/`. Without this a re-add of the same lineId
  // would rehydrate stale units — belt-and-braces given the line-id
  // counter is monotonic (see readNextLineId), but the cascade matters
  // for future callers that reuse ids.
  const prefix = `${lineId}${PATH_DELIMITER}`
  for (const oblId of Object.keys(fulfilments)) {
    const stored = fulfilments[oblId]
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) continue
    const next = { ...stored }
    let changed = false
    for (const key of Object.keys(stored)) {
      if (key.startsWith(prefix)) {
        delete next[key]
        changed = true
      }
    }
    if (!changed) continue
    if (Object.keys(next).length === 0) {
      delete fulfilments[oblId]
    } else {
      fulfilments[oblId] = next
    }
  }
  // Drop the per-line unit-id counter so the next add on a fresh line
  // with the same id starts at unit1 again.
  writeNextUnitIdForLine(request, lineId, undefined)
  writeFulfilments(request, fulfilments)
}

// ---------------------------------------------------------------------------
// Unit records — depth-2 fan-out under commodityLine. Composite key
// shape: `${lineId}/${unitId}`. Same design as addCommodityLine —
// session-scoped monotonic counter per line so a Delete cannot recycle
// a unit id and rehydrate stale per-unit state via any unit-scoped
// obligation the caller forgot to pass to deleteUnitRecord.
// ---------------------------------------------------------------------------

function readNextUnitIdByLine(request) {
  return request.yar?.get(NEXT_UNIT_ID_BY_LINE_KEY) ?? {}
}

function writeNextUnitIdForLine(request, lineId, nextValue) {
  const current = { ...readNextUnitIdByLine(request) }
  if (nextValue === undefined) {
    delete current[lineId]
  } else {
    current[lineId] = nextValue
  }
  request.yar?.set(NEXT_UNIT_ID_BY_LINE_KEY, current)
}

export function addUnitRecord(request, lineId, seedObligation) {
  const fulfilments = { ...readFulfilments(request) }
  const perLine = readNextUnitIdByLine(request)
  const n = perLine[lineId] ?? 1
  const unitId = `unit${n}`
  const compositeKey = `${lineId}${PATH_DELIMITER}${unitId}`
  // Seed a placeholder record on the seedObligation so the
  // ObligationEvaluator recognises the unit as existing. The caller
  // picks a seedObligation known to be in scope for this line — see
  // features/units/controller.js for the pick-first-in-scope helper.
  const seed = {
    ...(fulfilments[seedObligation.id] ?? {}),
    [compositeKey]: ''
  }
  fulfilments[seedObligation.id] = seed
  writeFulfilments(request, fulfilments)
  writeNextUnitIdForLine(request, lineId, n + 1)
  return unitId
}

export function deleteUnitRecord(request, lineId, unitId, unitLeafObligations) {
  const compositeKey = `${lineId}${PATH_DELIMITER}${unitId}`
  const fulfilments = { ...readFulfilments(request) }
  for (const obligation of unitLeafObligations) {
    const stored = fulfilments[obligation.id]
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      const next = { ...stored }
      delete next[compositeKey]
      if (Object.keys(next).length === 0) {
        delete fulfilments[obligation.id]
      } else {
        fulfilments[obligation.id] = next
      }
    }
  }
  writeFulfilments(request, fulfilments)
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetState(request) {
  request.yar?.clear(SESSION_KEY)
  request.yar?.clear(NEXT_LINE_ID_KEY)
  request.yar?.clear(NEXT_UNIT_ID_BY_LINE_KEY)
}
