/**
 * Single entry point for the field-validation toolkit. Re-exports the
 * `validatePayload` runner plus every Joi schema factory, grouped by field
 * family (date / numeric / text), so call sites keep one import path.
 */
export { validatePayload } from './run.js'
export { dobSchema, MAX_AGE, MIN_DRIVING_AGE } from './date/index.js'
export {
  integerYearsSchema,
  vehicleYearSchema,
  currencySchema
} from './numeric.js'
export {
  requiredTextSchema,
  emailSchema,
  phoneSchema,
  PHONE_ALLOWED
} from './text.js'
