/**
 * Validation barrel — the public surface that was once a single `validate.js`:
 * the `validatePayload` runner plus every per-field-family schema factory and
 * its constants. Importers point at `./validate/index.js` for the same bindings.
 */
export { validatePayload } from './run-payload.js'
export { MAX_AGE, MIN_DRIVING_AGE, dobSchema } from './date-of-birth/index.js'
export { integerYearsSchema, vehicleYearSchema } from './numeric.js'
export { currencySchema } from './currency.js'
export { PHONE_ALLOWED, phoneSchema, emailSchema } from './contact.js'
export { requiredTextSchema } from './text.js'
