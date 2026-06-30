import { machine } from './model.js'
import { applicableSteps, provenanceForStep } from './navigation.js'
import { getStep, fieldsFor } from './steps.js'
import { makePageValidator } from '../lib/page-validator/index.js'
import { makeAssembler } from '../lib/assembler/index.js'

/**
 * Whole-object wiring — builds the assembler and the page-slice validator once
 * (each is a singleton over the machine), then exposes the three operations the
 * contract surfaces: `validate` (page slice), `assembleQuote` and
 * `missingRequired` (whole object).
 */

const assembler = makeAssembler({
  getApplicableSteps: applicableSteps,
  getStep,
  provenanceForStep,
  rules: machine.rules
})

export const validate = makePageValidator({
  getFields: fieldsFor,
  patterns: machine.patterns
})

export const assembleQuote = assembler.assembleQuote

export function missingRequired(answers) {
  return assembler
    .missingRequiredErrors(answers)
    .map(({ stepId, fieldId, because }) => ({ stepId, fieldId, because }))
}
