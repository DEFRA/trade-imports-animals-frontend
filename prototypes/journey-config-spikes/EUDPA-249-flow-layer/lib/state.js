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
export const LOOKUP_SEEDED_KEY = 'prototype:eudpa-249:lookup-seeded'

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

function newLineId(existing) {
  let n = 1
  while (existing.has(`line${n}`)) n += 1
  return `line${n}`
}

export function addCommodityLine(
  request,
  commodityLineObligation,
  seedObligation
) {
  const fulfilments = { ...readFulfilments(request) }
  // Seed a placeholder record for the line so the ObligationEvaluator
  // recognises the line as existing. The obligations model tracks a
  // group instance by its descendants' composite-key prefixes; we seed
  // a placeholder on the seedObligation (commodityCode) with an empty
  // string value. Real value comes from the per-line-detail pages.
  const existing = new Set(Object.keys(fulfilments[seedObligation.id] ?? {}))
  const id = newLineId(existing)
  const seed = {
    ...(fulfilments[seedObligation.id] ?? {}),
    [id]: ''
  }
  fulfilments[seedObligation.id] = seed
  writeFulfilments(request, fulfilments)
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
// Lookup seeding — one-shot flag so the seeded-lookup handler only
// fires once per session and then serves the resolved page directly.
// ---------------------------------------------------------------------------

export function isLookupSeeded(request) {
  return Boolean(request.yar?.get(LOOKUP_SEEDED_KEY))
}

export function markLookupSeeded(request) {
  request.yar?.set(LOOKUP_SEEDED_KEY, true)
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetState(request) {
  request.yar?.clear(SESSION_KEY)
  request.yar?.clear(LOOKUP_SEEDED_KEY)
}
