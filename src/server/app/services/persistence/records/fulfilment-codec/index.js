/**
 * Storage codec for the evaluator's fulfilments map.
 *
 * Persistence uses an array so obligation and fulfilment ids are ordinary
 * fields. The evaluator continues to receive its existing UUID-keyed map.
 * Both directions preserve input order and pass values through unchanged.
 *
 * The persisted wire schema keeps `fulfilmentId` as the record property
 * name for what the runtime now calls `fulfilmentIndex` — retained for
 * backend-contract stability (EUDPA-349 renamed the runtime term only).
 */

export { encodeEvaluatorFulfilments } from './encode.js'
export { decodePersistedFulfilment } from './decode.js'
