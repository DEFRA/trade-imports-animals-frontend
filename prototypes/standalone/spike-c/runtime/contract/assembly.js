import { stepById, patterns } from '../model.js'
import {
  applicableSteps,
  missingRequiredErrors,
  assertionErrors
} from '../engine.js'
import { makePageValidator } from '../../lib/page-validator.js'
import { makeAssembler } from '../../lib/assembler.js'
import { fieldsFor } from './view.js'

/**
 * Whole-object assembly: transform the answers into a domain quote and validate
 * it (missing-required + business rules). C supplies its own authored-reason
 * errors, so the shared assembler is wired with empty provenance/rules.
 */

// Reuse the shared transform; C supplies its own authored-reason errors.
const transformer = makeAssembler({
  getApplicableSteps: applicableSteps,
  getStep: (stepId) => ({
    id: stepId,
    kind: stepById.get(stepId).kind,
    fields: fieldsFor(stepId),
    done: stepById.get(stepId).done,
    arrayKey: stepById.get(stepId).arrayKey
  }),
  provenanceForStep: () => [],
  rules: []
})

export function assembleQuote(answers) {
  const errors = [
    ...missingRequiredErrors(answers),
    ...assertionErrors(answers)
  ]
  return {
    ok: errors.length === 0,
    quote: transformer.toDomain(answers),
    errors
  }
}

export const validateStep = makePageValidator({
  getFields: fieldsFor,
  patterns
})
