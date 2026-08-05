import { assembleFulfilments } from './assemble-fulfilments.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'

export const evaluateFulfilments = (fulfilments) =>
  createObligationEvaluator().evaluate(fulfilments)

export const evaluateAnswers = (answers) =>
  evaluateFulfilments(assembleFulfilments(answers))
