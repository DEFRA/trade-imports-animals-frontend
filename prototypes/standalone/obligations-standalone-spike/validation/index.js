import { saveCheck } from './save-check.js'
import { toFieldErrors } from './field-errors.js'

/**
 * Barrel for the validation folder-module. `checkSave` is the composed
 * save gate contract/mutation.js consumes: findings over the
 * payload-merged candidate plus their GDS error view-models. `blocked`
 * true means the POST must re-render with the error summary instead of
 * writing (only a hard page mandate or a filled format failure gets here).
 */
export function checkSave(slots, payload, obligationState) {
  const findings = saveCheck(slots, payload, obligationState)
  const { errors, errorSummary } = toFieldErrors(findings)
  return { blocked: findings.length > 0, findings, errors, errorSummary }
}

export { saveCheck, candidateValue, mandateMissingCode } from './save-check.js'
export {
  checkFormat,
  decodeDateParts,
  formatCodesFor,
  isBlank
} from './format-checks.js'
export { toFieldErrors } from './field-errors.js'
