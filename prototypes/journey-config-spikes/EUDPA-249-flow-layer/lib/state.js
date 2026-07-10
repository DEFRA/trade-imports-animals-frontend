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
  writeFulfilments(request, fulfilments)
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetState(request) {
  request.yar?.clear(SESSION_KEY)
  request.yar?.clear(NEXT_LINE_ID_KEY)
}
