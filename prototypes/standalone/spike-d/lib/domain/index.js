import { toDomain } from './transform.js'
import { missingRequiredErrors } from './required-errors.js'
import { businessRuleErrors } from './business-rules.js'

/**
 * Whole-object validation + transform (validation.md moment 4), shared by the
 * derive-Joi spikes. The caller supplies a small **model view** so the same
 * assembler serves different paradigms:
 *
 *   getApplicableSteps(answers)      -> [stepId]
 *   getStep(stepId)                  -> { id, kind?, fields:[spec], done?, arrayKey? }
 *   provenanceForStep(stepId, answers) -> [{ field, eq }]  // why the step is live
 *   rules                            -> declarative business rules
 *
 * Returns `{ ok, quote, errors }`, every error carrying step provenance.
 */
export function makeAssembler(view) {
  return {
    toDomain: (answers) => toDomain(view, answers),
    missingRequiredErrors: (answers) => missingRequiredErrors(view, answers),
    assembleQuote(answers) {
      const errors = [
        ...missingRequiredErrors(view, answers),
        ...businessRuleErrors(view, answers)
      ]
      return { ok: errors.length === 0, quote: toDomain(view, answers), errors }
    }
  }
}
