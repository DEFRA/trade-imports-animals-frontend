/**
 * The requirement-graph engine. `evaluate(answers)` derives, from the data model
 * + the rules, which fields are **required** (and **why** — authored reasons,
 * the paradigm's signature) and which steps are **live**. Everything the
 * contract needs is a thin read over this snapshot. Pure + memoised per answers.
 */

export { evaluate } from './evaluation.js'
export {
  applicableSteps,
  requiredFieldsOfStep,
  missingRequired,
  missingRequiredErrors
} from './missing-required.js'
export { assertionErrors } from './assertions.js'
