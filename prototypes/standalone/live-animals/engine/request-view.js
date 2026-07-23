import { projectAnswers } from '../bridge/fulfilments.js'
import { makeScopeFromEvaluation } from '../bridge/scope.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'

const evaluator = createObligationEvaluator()

/**
 * Assemble the request-local views derived from a decoded fulfilment map.
 *
 * The optional evaluation lets canonical write/purge reuse the evaluator
 * result it is about to persist.
 */
export const assembleRequestView = (
  fulfilments,
  evaluation = evaluator.evaluate(fulfilments),
  answerOverlay = {}
) => {
  const answers = {
    ...projectAnswers(evaluation.fulfilments),
    ...answerOverlay
  }
  const scope = makeScopeFromEvaluation(evaluation, answers)
  return { evaluation, answers, scope }
}
