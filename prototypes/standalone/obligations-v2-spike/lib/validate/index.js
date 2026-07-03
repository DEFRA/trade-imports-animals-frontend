/**
 * The validation lib's single import surface. A controller imports the runner
 * and whichever named validators it needs, composes them into a page schema,
 * and calls `validate(schema, payload)`. Nothing here knows about obligations.
 */
export { validate } from './run.js'
export {
  compose,
  requiredText,
  optionalText,
  maxText,
  pattern,
  postcode,
  vehicleReg,
  ukPhone,
  oneOf,
  integerInRange,
  currency,
  dateParts
} from './validators.js'
