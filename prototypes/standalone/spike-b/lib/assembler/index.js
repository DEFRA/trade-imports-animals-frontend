import { evalCondition } from '../conditions.js'
import { getSelectedAddons } from '../addons/index.js'
import {
  STEP_KIND_LOOP,
  STEP_KIND_SUBTASKS,
  transformStepFields,
  transformLoopItems
} from './transform.js'
import {
  RULE_KIND_MIN_AGE,
  RULE_KIND_LTE,
  reasonFor,
  loopMissingErrors,
  subtasksMissingErrors,
  fieldRequiredErrors,
  minAgeError,
  lteError
} from './errors.js'

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
    view.getApplicableSteps(answers).reduce((quote, stepId) => {
      const step = view.getStep(stepId)
      const loopPatch =
        step.kind === STEP_KIND_LOOP
          ? { [step.arrayKey]: transformLoopItems(step, answers) }
          : {}
      const subtasksPatch =
        step.kind === STEP_KIND_SUBTASKS
          ? { selectedAddons: getSelectedAddons(answers) }
          : {}
      return {
        ...quote,
        ...transformStepFields(step, answers),
        ...loopPatch,
        ...subtasksPatch
      }
    }, {})

  const missingRequiredErrors = (answers) =>
    view.getApplicableSteps(answers).flatMap((stepId) => {
      const step = view.getStep(stepId)
      const stepBecause = view.provenanceForStep(stepId, answers).map(reasonFor)
      if (step.kind === STEP_KIND_LOOP) {
        return loopMissingErrors(step, stepId, stepBecause, answers)
      }
      if (step.kind === STEP_KIND_SUBTASKS) {
        return subtasksMissingErrors(answers, stepId)
      }
      return fieldRequiredErrors(step, stepId, stepBecause, answers)
    })

  const businessRuleErrors = (answers) =>
    (view.rules ?? [])
      .filter((rule) => !(rule.when && !evalCondition(rule.when, answers)))
      .flatMap((rule) => {
        if (rule.kind === RULE_KIND_MIN_AGE) {
          return minAgeError(rule, answers) ?? []
        }
        if (rule.kind === RULE_KIND_LTE) {
          return lteError(rule, answers) ?? []
        }
        return []
      })

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
