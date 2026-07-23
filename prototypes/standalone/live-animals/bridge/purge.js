/**
 * Project the evaluator purge into the pathKeys it destroys — the write-path
 * counterpart of `scope.js`. Where `makeScope` projects the in-scope
 * implications into the pathKey grammar, `wipeSet` projects the PURGE into the
 * same grammar: the answer paths whose stored value `convergePurge` drops when
 * the obligation (or its instance) is out of scope.
 *
 * Mechanism:
 *   request input fulfilments                                   = fIn
 *   request evaluation.fulfilments (converged post-purge view)  = fOut
 *   for each non-group leaf obligation answered in fIn but absent from fOut,
 *   emit its pathKey via the composite->positional rule.
 *
 * The result feeds `lib/path.js`'s `destroyWiped`, which `engine/write.js`
 * applies over the session/journey/save layer.
 */

import { obligations } from '../model/obligations/obligations.js'
import {
  ancestorChain,
  fulfilmentIdToPath,
  groupObligations
} from './fulfilments.js'
import { evaluateFulfilments } from './evaluation.js'
import { pathKey } from '../lib/path.js'
import { isAnswered } from '../lib/answered.js'

/**
 * Evaluate a canonical fulfilment map and return the converged post-purge
 * evaluator state. This is the durable write-path authority.
 */
export const purgeFulfilments = evaluateFulfilments

const wipedScalarKey = (obligation, inVal, fulfilmentsOut) =>
  isAnswered(inVal) && fulfilmentsOut[obligation.id] === undefined
    ? [pathKey([obligation.name])]
    : []

const wipedRecordKeys = (obligation, chain, inVal, fulfilmentsOut) => {
  const outRecords = fulfilmentsOut[obligation.id] ?? {}
  return Object.entries(inVal)
    .filter(
      ([fulfilmentId, value]) =>
        isAnswered(value) && outRecords[fulfilmentId] === undefined
    )
    .map(([fulfilmentId]) =>
      pathKey(fulfilmentIdToPath(chain, fulfilmentId, obligation.name))
    )
}

const wipedKeysFor = (obligation, fulfilmentsIn, fulfilmentsOut) => {
  if (groupObligations.has(obligation)) return []
  const inVal = fulfilmentsIn[obligation.id]
  if (inVal === undefined) return []
  const chain = ancestorChain(obligation)
  return chain.length === 0
    ? wipedScalarKey(obligation, inVal, fulfilmentsOut)
    : wipedRecordKeys(obligation, chain, inVal, fulfilmentsOut)
}

/**
 * The pathKeys the request evaluation destroys from its input fulfilments.
 *
 * @param {object} fulfilmentsIn - the assembled request input.
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {string[]} pathKeys to pass to `destroyWiped`.
 */
export const wipeSet = (fulfilmentsIn, evaluation) => {
  const fulfilmentsOut = evaluation.fulfilments
  return obligations.flatMap((obligation) =>
    wipedKeysFor(obligation, fulfilmentsIn, fulfilmentsOut)
  )
}
