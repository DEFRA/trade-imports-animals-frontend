import { projectAnswers } from '../bridge/fulfilments.js'
import { makeScopeFromEvaluation } from '../bridge/scope.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'

const evaluator = createObligationEvaluator()

/**
 * Assemble the request-local views derived from a decoded fulfilment map.
 *
 * This is deliberately separate from read.js until canonical fulfilment
 * persistence replaces the live name-keyed records port.
 */
export const assembleRequestView = (fulfilments) => {
  const evaluation = evaluator.evaluate(fulfilments)
  const answers = projectAnswers(evaluation.fulfilments)
  const scope = makeScopeFromEvaluation(evaluation, answers)
  return { evaluation, answers, scope }
}
