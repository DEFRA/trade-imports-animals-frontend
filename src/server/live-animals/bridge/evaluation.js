import { assembleFulfilments } from './assemble-fulfilments.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'

const evaluator = createObligationEvaluator()

export const evaluateFulfilments = (fulfilments) =>
  evaluator.evaluate(fulfilments)

export const evaluateAnswers = (answers) =>
  evaluateFulfilments(assembleFulfilments(answers))
