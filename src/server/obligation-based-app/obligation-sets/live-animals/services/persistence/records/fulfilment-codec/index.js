/**
 * Storage codec for the evaluator's fulfilments map.
 *
 * Persistence uses an array so obligation and fulfilment ids are ordinary
 * fields. The evaluator continues to receive its existing UUID-keyed map.
 * Both directions preserve input order and pass values through unchanged.
 */

export { encodeEvaluatorFulfilments } from './encode.js'
export { decodePersistedFulfilment } from './decode.js'
