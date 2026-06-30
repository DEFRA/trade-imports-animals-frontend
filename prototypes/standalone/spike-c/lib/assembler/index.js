import { evalCondition } from '../conditions.js'
import { stepContribution } from './transform.js'
import {
  reasonFor,
  loopMissingError,
  subtasksMissingError,
  requiredFieldErrors
} from './errors.js'
import { RULE_HANDLERS } from './business-rules.js'

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
  const toDomain = (answers) =>
    view.getApplicableSteps(answers).reduce(
      (quote, stepId) => ({
        ...quote,
        ...stepContribution(view.getStep(stepId), answers)
      }),
      {}
    )

  const missingRequiredErrors = (answers) =>
    view.getApplicableSteps(answers).flatMap((stepId) => {
      const step = view.getStep(stepId)
      const stepBecause = view.provenanceForStep(stepId, answers).map(reasonFor)
      if (step.kind === 'loop') {
        return loopMissingError(stepId, step, answers, stepBecause)
      }
      if (step.kind === 'subtasks') {
        return subtasksMissingError(stepId, answers)
      }
      return requiredFieldErrors(stepId, step, answers, stepBecause)
    })

  const businessRuleErrors = (answers) =>
    (view.rules ?? [])
      .filter((rule) => !rule.when || evalCondition(rule.when, answers))
      .flatMap((rule) => RULE_HANDLERS[rule.kind]?.(rule, answers) ?? [])

  return {
    toDomain,
    missingRequiredErrors,
    assembleQuote(answers) {
      const errors = [
        ...missingRequiredErrors(answers),
        ...businessRuleErrors(answers)
      ]
      return { ok: errors.length === 0, quote: toDomain(answers), errors }
    }
  }
}
