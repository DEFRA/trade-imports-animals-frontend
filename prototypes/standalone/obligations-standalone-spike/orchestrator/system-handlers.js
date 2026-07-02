import { isDeepStrictEqual } from 'node:util'
import { createIdentifierIndex } from '../engine/identifiers.js'
import { calculatePremium } from '../lib/quote/index.js'

/**
 * System-handled obligations (DEF-16, EVAL-8, OPEN1-20..25): records
 * carrying a scalar `handler` companion field are fulfilled by the
 * orchestrator, not the user. The one real handler is the quote — an
 * in-process, synchronous premium computation that fires when its
 * obligation is in scope DURING the fixed-point pass, never at submit
 * (risk-4 pin), and happily prices a half-empty journey (Rulings item 2).
 *
 * Handler results land as a unified-map write — `{ value }` into the same
 * fulfilments map user answers use, no metadata (provenance is the model's
 * `handler` field). `failurePolicy` is carried on the registry entry but
 * stored-and-ignored: an opaque slot so a real policy can land later
 * without a split (OPEN2-23/24 deferral).
 */

/** Name-keyed answers view over single-cardinality fulfilments. */
const answersByName = (identifiers, fulfilments) => {
  const answers = {}
  for (const name of identifiers.names()) {
    const record = identifiers.recordOfName(name)
    if (record.cardinality === 'single') {
      answers[name] = fulfilments[record.id]?.value
    }
  }
  return answers
}

/** The journey's handler registry, keyed by the record's `handler` name. */
export const systemHandlers = Object.freeze({
  quote: Object.freeze({
    failurePolicy: 'ignored', // Stored and ignored — deferred slot.
    handle: ({ answers }) => calculatePremium(answers)
  })
})

/**
 * One runner per request. `inFlight` is the dedupe: an obligation whose
 * handler has been invoked in this request is never re-invoked by later
 * fixed-point iterations — which is also what lets an otherwise
 * oscillating write converge.
 */
export function createSystemHandlerRun({ handlers = systemHandlers } = {}) {
  const inFlight = new Set()

  return function run(obligations, obligationState, fulfilments = {}) {
    const identifiers = createIdentifierIndex(obligations)
    const next = structuredClone(fulfilments)
    const ran = []
    let changed = false

    for (const record of obligations) {
      if (!record.handler) {
        continue
      }
      const entry = handlers[record.handler]
      if (!entry) {
        throw new Error(
          `Obligation "${record.name}" names unknown handler "${record.handler}"`
        )
      }
      if (!obligationState[record.id]?.inScope || inFlight.has(record.id)) {
        continue
      }
      inFlight.add(record.id)
      const value = entry.handle({
        answers: answersByName(identifiers, next),
        record
      })
      ran.push(record.name)
      if (!isDeepStrictEqual(next[record.id], { value })) {
        next[record.id] = { value }
        changed = true
      }
    }

    return { fulfilments: next, changed, ran }
  }
}
