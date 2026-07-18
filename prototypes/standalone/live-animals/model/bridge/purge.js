/**
 * Bridge — B's evaluator purge -> the A pathKeys B destroys.
 *
 * The write-path counterpart of `scope.js`. Where `makeScopeFromB` projects
 * B's in-scope implications into A's pathKey grammar, `wipeSetFromB` projects
 * B's PURGE into the same grammar: the A answer paths whose stored value B's
 * `convergePurge` drops when the obligation (or its instance) is out of scope.
 *
 * Mechanism (identical to the model-equivalence oracle's wipe axis, inc-010):
 *   answers -> answersToFulfilments (A->B, vocab-normalised)     = fIn
 *   evaluate(fIn).fulfilments (the converged post-purge view)    = fOut
 *   for each non-group leaf obligation answered in fIn but absent from fOut,
 *   emit its A pathKey via the bridge's composite->positional rule.
 *
 * The result feeds `lib/path.js`'s `destroyWiped`, exactly as A's
 * `reconcile().wiped` does — so `engine/write.js` selects the wipe AUTHORITY
 * by flag (A's `reconcile` vs B's purge) while sharing A's session/journey/
 * save layer for both (B has none).
 *
 * Under `MODEL=b` this reproduces B's ACTUAL purge, unfixed ruled divergences
 * included: B retains `regionOfOriginCode` where A wipes it (c-017), so that
 * key is absent from the returned set and survives the write. That retention
 * is a KNOWN divergence, repaired in B at inc-017, not here.
 */

import { obligations } from '../obligations/obligations.js'
import { createObligationEvaluator } from '../obligations/evaluator.js'
import {
  answersToFulfilments,
  ancestorChain,
  fulfilmentIdToPath,
  groupObligations
} from './fulfilments.js'
import { pathKey } from '../../lib/path.js'
import { isAnswered } from '../../lib/answered.js'

const evaluator = createObligationEvaluator()

/**
 * The A pathKeys B's purge destroys for the given answers.
 *
 * @param {object} answers - A's nested answer POJO.
 * @returns {string[]} A pathKeys to pass to `destroyWiped`.
 */
export const wipeSetFromB = (answers) => {
  const fIn = answersToFulfilments(answers)
  const { fulfilments: fOut } = evaluator.evaluate(fIn)
  const wiped = []
  for (const o of obligations) {
    if (groupObligations.has(o)) continue
    const inVal = fIn[o.id]
    if (inVal === undefined) continue
    const chain = ancestorChain(o)
    if (chain.length === 0) {
      if (isAnswered(inVal) && fOut[o.id] === undefined) {
        wiped.push(pathKey([o.name]))
      }
      continue
    }
    const outRecords = fOut[o.id] ?? {}
    for (const [fulfilmentId, value] of Object.entries(inVal)) {
      if (isAnswered(value) && outRecords[fulfilmentId] === undefined) {
        wiped.push(pathKey(fulfilmentIdToPath(chain, fulfilmentId, o.name)))
      }
    }
  }
  return wiped
}
